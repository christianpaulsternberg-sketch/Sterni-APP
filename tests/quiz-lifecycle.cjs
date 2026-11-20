// Run with: node tests/quiz-lifecycle.cjs /path/to/pglite/dist/index.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PGlite } = require(path.resolve(process.argv[2]));

async function test() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create schema treff_private;
      create table public.treff_members (id uuid primary key, display_name text, active boolean);
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `);
    for (const migration of ["online-quiz", "live-quiz", "quiz-duel-requests", "live-quiz-challenges",
      "quiz-duel-lifecycle"]) {
      await db.exec(fs.readFileSync(path.join(__dirname, "..", "db", migration + ".sql"), "utf8"));
    }

    function player(name) {
      const id = randomUUID();
      let session = randomUUID();
      return {
        id,
        async call(sql, params = []) {
          return db.transaction(async (tx) => {
            await tx.exec("set local role authenticated");
            await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
            return (await tx.query("select " + sql + " as value", params)).rows[0].value;
          });
        },
        add: () => db.query("insert into public.treff_members values ($1, $2, true)", [id, name]),
        snapshot() { return this.call("public.sterni_quiz_snapshot($1::uuid)", [session]); },
        create(other, duel) {
          return this.call("public.sterni_quiz_create($1, $2, 'all', 1)", [duel, other.id]);
        },
        accept(duel) { return this.call("public.sterni_quiz_accept($1)", [duel]); },
        decline(duel) { return this.call("public.sterni_quiz_decline($1)", [duel]); },
        leave() { return this.call("public.sterni_quiz_leave($1)", [session]); },
        reopen() { session = randomUUID(); },
        advanceLease(interval) {
          return db.query(`update treff_private.quiz_sessions
            set available_until = clock_timestamp() + $2::interval, seen_at = clock_timestamp() - interval '20 seconds'
            where member_id = $1 and id = $3`, [id, interval, session]);
        },
        game(action, duel, question = null, answer = null) {
          return this.call("public.sterni_live_quiz($1, $2, null, $3, $4)", [action, duel, question, answer]);
        }
      };
    }
    const a = player("Christian");
    const b = player("Cordula");
    const state = async (player, id) => (await player.snapshot()).duels.find((duel) => duel.id === id);
    const ageInvitation = (id, interval) =>
      db.query("update treff_private.quiz_duels set created_at = clock_timestamp() - $2::interval where id = $1",
        [id, interval]);
    await a.add();
    await b.add();
    await a.snapshot();
    await b.snapshot();

    const completed = randomUUID();
    await a.create(b, completed);
    assert.equal((await state(b, completed)).incoming, true);
    await b.accept(completed);
    assert.equal((await state(a, completed)).live, true);
    for (let question = 1; question <= 5; question++) {
      const expected = (await a.game("state", completed)).question;
      assert.deepEqual((await b.game("state", completed)).question, expected);
      assert.equal((await a.game("answer", completed, question, 1)).correct, null);
      assert.equal(typeof (await b.game("answer", completed, question, 1)).correct, "number");
      await a.game("next", completed, question);
      assert.equal((await b.game("next", completed, question)).round, question + 1);
    }
    const score = await a.game("state", completed);
    assert.equal(score.myScore, (await b.game("state", completed)).opponentScore);
    assert.equal((await state(a, completed)).live_finished, true);
    const completedSnapshot = await a.snapshot();
    const completedHistory = completedSnapshot.duels.find((duel) => duel.id === completed);
    assert.equal(completedHistory.status, "abgeschlossen");
    assert.equal(completedHistory.challenger_name, "Christian");
    assert.equal(completedHistory.challenged_name, "Cordula");
    assert.equal(completedSnapshot.leaderboard.length, 2);
    assert.equal(completedSnapshot.leaderboard.reduce((sum, entry) => sum + entry.played, 0), 2);

    const firstQuestions = (await db.query("select questions from treff_private.live_quiz where id = $1", [completed])).rows[0].questions;
    const categories = new Set(firstQuestions.map((question) => question.category));
    assert.equal(firstQuestions.length, 5);
    assert.equal(new Set(firstQuestions.map((question) => question.text)).size, 5);
    assert.equal(categories.size, 5);
    await a.game("rematch", completed);
    const rematchStart = await b.game("rematch", completed);
    assert.ok(rematchStart.rematch);
    const rematchQuestions = (await db.query("select questions from treff_private.live_quiz where id = $1", [rematchStart.rematch])).rows[0].questions;
    assert.equal(rematchQuestions.length, 5);
    assert.equal(rematchQuestions.filter((question) => firstQuestions.some((old) => old.text === question.text)).length, 0);
    assert.ok((await state(a, rematchStart.rematch)).accepted_at);
    await a.game("leave", rematchStart.rematch);
    // Die folgenden Lebenszyklusfälle sollen nicht am absichtlichen
    // Einladungs-Limit des Produktivcodes hängen.
    await db.query("update treff_private.quiz_duels set created_at = clock_timestamp() - interval '2 minutes'");

    const declined = randomUUID();
    await a.create(b, declined);
    await b.decline(declined);
    assert.ok((await state(a, declined)).declined_at);
    assert.equal((await state(a, declined)).ended_at, null);
    await assert.rejects(b.accept(declined), /nicht verfügbar/);

    const closed = randomUUID();
    await a.create(b, closed);
    await b.leave();
    assert.equal((await state(a, closed)).ended_at, null);
    await b.advanceLease("-1 second");
    assert.equal((await state(a, closed)).end_reason, "left");
    await b.reopen();
    await b.snapshot();
    await assert.rejects(b.accept(closed), /nicht verfügbar/);

    const disconnected = randomUUID();
    await b.create(a, disconnected);
    await a.advanceLease("10 seconds");
    assert.equal((await state(b, disconnected)).ended_at, null);
    await a.snapshot();
    assert.equal((await state(b, disconnected)).ended_at, null);
    await a.advanceLease("-1 second");
    await a.snapshot(); // The reconnect itself must not revive an expired duel.
    assert.equal((await state(b, disconnected)).end_reason, "disconnected");

    const running = randomUUID();
    await b.create(a, running);
    await a.accept(running);
    await a.game("answer", running, 1, 1);
    await a.leave();
    await a.advanceLease("-1 second");
    assert.equal((await b.game("answer", running, 1, 1)).left, "opponent");
    assert.equal((await state(b, running)).end_reason, "left");
    assert.equal((await state(a, completed)).ended_at, null);
    await a.reopen();
    await a.snapshot();

    const replay = randomUUID();
    await b.create(a, replay);
    await a.accept(replay);
    await a.game("leave", replay);
    assert.equal((await state(b, replay)).end_reason, "left_duel");

    await ageInvitation(completed, "2 minutes");
    const expired = randomUUID();
    await a.create(b, expired);
    await ageInvitation(expired, "3 minutes");
    assert.equal((await state(a, expired)).end_reason, "expired");
    console.log("Bestanden: zwei getrennte Spieleridentitäten, fünf gemeinsame Fragen und alle Lebenszyklusfälle.");
  } finally {
    await db.close();
  }
}

test().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
