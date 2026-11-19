window.STERNI_QUIZ = (() => {
  const MEMBERS_KEY = "sterni_members_v1";
  const ME_KEY = "sterni_quiz_me_v1";
  const BOARD_KEY = "sterni_duel_board_v1";
  const TREFF_NAME_KEY = "sterni_treff_name_v1";

  let state = null;
  let pendingInvite = null;

  function getMe() {
    try {
      return JSON.parse(localStorage.getItem(ME_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveMe(name, email = "") {
    const clean = (name || "").trim();
    if (!clean) return null;
    const me = { name: clean, email: (email || "").trim().toLowerCase(), role: "Du" };
    localStorage.setItem(ME_KEY, JSON.stringify(me));
    localStorage.setItem(TREFF_NAME_KEY, clean);
    return me;
  }

  function getSavedFriends() {
    try {
      const list = JSON.parse(localStorage.getItem(MEMBERS_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function loadMembers() {
    const saved = getSavedFriends();
    const merged = [];
    const seen = new Set();
    const pushUnique = (m) => {
      if (!m?.name) return;
      const key = m.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(m);
    };

    const me = getMe();
    if (me) pushUnique(me);
    saved.forEach(pushUnique);

    const myName = (localStorage.getItem(TREFF_NAME_KEY) || "").trim();
    if (myName && myName !== "Petri-Freund") pushUnique({ name: myName, role: "Du", skill: 0.72 });
    return merged;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function encodeDuelCode(payload) {
    try {
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json);
      let bin = "";
      bytes.forEach((b) => { bin += String.fromCharCode(b); });
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch {
      return "";
    }
  }

  function decodeDuelCode(code) {
    try {
      const norm = code.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(norm);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }

  function buildDuelUrl(payload) {
    const code = encodeDuelCode(payload);
    const base = `${location.origin}${location.pathname}`;
    return `${base}?duell=${encodeURIComponent(code)}#quiz`;
  }

  function addMember(name, email = "") {
    const clean = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!clean) return;
    const saved = getSavedFriends();
    const idx = saved.findIndex((m) => m.name.toLowerCase() === clean.toLowerCase());
    if (idx === -1) {
      saved.push({ name: clean, email: cleanEmail, role: "Freundeskreis", skill: 0.7 });
    } else if (cleanEmail && !saved[idx].email) {
      saved[idx].email = cleanEmail;
    }
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(saved));
  }

  function renderFriendsPanel() {
    const statusEl = document.getElementById("quiz-me-status");
    const meNameInput = document.getElementById("quiz-me-name");
    const meEmailInput = document.getElementById("quiz-me-email");
    const listEl = document.getElementById("quiz-friends-list");
    const me = getMe();

    if (statusEl) {
      statusEl.textContent = me
        ? `Angemeldet als: ${me.name}${me.email ? ` (${me.email})` : ""}`
        : "Noch nicht angemeldet – einfach Namen eintragen";
    }
    if (me && meNameInput && !meNameInput.value) meNameInput.value = me.name;
    if (me && meEmailInput && !meEmailInput.value && me.email) meEmailInput.value = me.email;

    if (!listEl) return;
    const friends = getSavedFriends();
    listEl.innerHTML = "";
    if (!friends.length) {
      listEl.innerHTML = `<p class="muted small-meta" style="margin:0">Noch keine Freunde in deinem Freundeskreis. Lade oben jemanden per E-Mail oder Statusmeldung ein!</p>`;
      return;
    }

    friends.forEach((f) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-card-head" style="margin-bottom:0">
          <div>
            <strong></strong>
            <div class="small-meta muted"></div>
          </div>
          <div class="action-row" style="margin:0">
            <button type="button" class="btn-primary btn-xs challenge-friend-btn">Herausfordern →</button>
          </div>
        </div>
      `;
      card.querySelector("strong").textContent = f.name;
      card.querySelector(".muted").textContent = f.email || "Per Statusmeldung / Link eingeladen";
      card.querySelector(".challenge-friend-btn").addEventListener("click", () => {
        const p2Sel = document.getElementById("quiz-p2-select");
        if (p2Sel) p2Sel.value = f.name;
        document.getElementById("quiz-friends-panel").hidden = true;
        window.STERNI_APP?.toast(`${f.name} als Gegner ausgewählt – Duell kann starten!`);
      });
      listEl.appendChild(card);
    });
  }

  function loadBoard() {
    try {
      return JSON.parse(localStorage.getItem(BOARD_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveBoard(board) {
    localStorage.setItem(BOARD_KEY, JSON.stringify(board));
  }

  function recordDuelResult(name, pts, won, draw) {
    const board = loadBoard();
    if (!board[name]) board[name] = { games: 0, wins: 0, draws: 0, pts: 0 };
    board[name].games += 1;
    if (won) board[name].wins += 1;
    else if (draw) board[name].draws += 1;
    board[name].pts += pts;
    saveBoard(board);
  }

  function shuffle(arr, rng = Math.random) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function populateSelectors() {
    const cats = window.STERNI_QUIZ_DATA?.QUIZ_CATEGORIES || [];
    const catSel = document.getElementById("quiz-category");
    if (catSel) {
      const prev = catSel.value;
      catSel.innerHTML = `<option value="all">Alle 20 Themen (Gemischt)</option>` +
        cats.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");
      if (prev && [...catSel.options].some((o) => o.value === prev)) catSel.value = prev;
    }

    const members = loadMembers();
    const p1Sel = document.getElementById("quiz-p1-select");
    const p2Sel = document.getElementById("quiz-p2-select");
    if (p1Sel && p2Sel) {
      const prev1 = p1Sel.value;
      const prev2 = p2Sel.value;
      const opts = members.length
        ? members.map((m) => `<option value="${m.name}">${m.name} (${m.role})</option>`).join("")
        : `<option value="">Noch kein Mitglied – erst anmelden oder hinzufügen</option>`;
      p1Sel.innerHTML = opts;
      p2Sel.innerHTML = opts;
      const currentName = getMe()?.name;
      p1Sel.value = currentName && members.some((m) => m.name === currentName)
        ? currentName
        : (prev1 && members.some((m) => m.name === prev1) ? prev1 : members[0]?.name || "");
      let target2 = prev2 && members.some((m) => m.name === prev2) ? prev2 : (members[1]?.name || members[0]?.name || "");
      if (target2 === p1Sel.value && members.length > 1) {
        target2 = members.find((m) => m.name !== p1Sel.value)?.name || target2;
      }
      p2Sel.value = target2;
    }
  }

  function renderLeaderboard() {
    const el = document.getElementById("quiz-leaderboard");
    if (!el) return;
    const board = loadBoard();
    const members = loadMembers();
    const rows = members
      .map((m) => ({
        name: m.name,
        ...(board[m.name] || { games: 0, wins: 0, draws: 0, pts: 0 })
      }))
      .sort((a, b) => b.wins - a.wins || b.pts - a.pts);

    if (!rows.length) {
      el.innerHTML = `<p class="muted small-meta">Noch keine Mitglieder in der Rangliste.</p>`;
      return;
    }

    el.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Mitglied</th><th>Duelle</th><th>Siege</th><th>Punkte</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td><strong>${r.name}</strong></td><td>${r.games}</td><td>${r.wins}</td><td>${r.pts}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  function init() {
    document.getElementById("quiz-next-btn")?.addEventListener("click", nextQuestion);
    document.getElementById("quiz-retry-btn")?.addEventListener("click", () => startQuiz());
    document.getElementById("quiz-send-challenge-btn")?.addEventListener("click", sendResultChallenge);
    document.getElementById("quiz-back-setup-btn")?.addEventListener("click", showSetup);
    document.getElementById("quiz-share-btn")?.addEventListener("click", shareResult);
  }

  function showSetup() {
    document.getElementById("quiz-setup").hidden = false;
    document.getElementById("quiz-play").hidden = true;
    document.getElementById("quiz-result").hidden = true;
  }

  function startQuiz(override) {
    window.STERNI_QUIZ_ONLINE?.clearResult();
    const catId = override?.catId || "all";
    const mode = override?.mode || "online-duel";
    const p1Name = override?.p1Name || "";
    const p2Name = override?.p2Name || "";

    if (!p1Name) {
      window.STERNI_APP?.toast("Bitte zuerst im Mitgliederbereich anmelden oder ein Mitglied hinzufügen.");
      return;
    }
    if (mode !== "solo" && !p2Name) {
      window.STERNI_APP?.toast("Bitte ein zweites Mitglied als Gegner hinzufügen oder Solo spielen.");
      return;
    }
    if (mode !== "solo" && mode !== "online-duel" && p1Name === p2Name) {
      window.STERNI_APP?.toast("Bitte zwei verschiedene Mitglieder für das Duell wählen.");
      return;
    }

    const seed = typeof override?.seed === "number" ? override.seed : Math.floor(Math.random() * 1e9);
    const rng = mulberry32(seed);

    const allQ = window.STERNI_QUIZ_DATA?.QUESTIONS || [];
    const filtered = catId === "all" ? allQ : allQ.filter((q) => q.category === catId);
    let pool = shuffle(filtered, rng);
    if (pool.length < 10) {
      pool = pool.concat(shuffle(allQ.filter((q) => q.category !== catId), rng));
    }

    const questions = pool.slice(0, 5).map((q) => {
      const mixed = shuffle(q.options.map((text, idx) => ({ text, isCorrect: idx === q.correct })), rng);
      return {
        ...q,
        shuffledOptions: mixed.map((o) => o.text),
        correctIndex: mixed.findIndex((o) => o.isCorrect)
      };
    });

    const members = loadMembers();
    const opponent = members.find((m) => m.name === p2Name);

    state = {
      mode,
      catId,
      seed,
      players: [p1Name, p2Name],
      opponentSkill: opponent?.skill || 0.7,
      targetScore: typeof override?.targetScore === "number" ? override.targetScore : null,
      inviteId: override?.inviteId || null,
      onlineDuel: override?.onlineDuel || null,
      questions,
      index: 0,
      scores: [0, typeof override?.targetScore === "number" ? override.targetScore : 0],
      correctCounts: [0, typeof override?.targetScore === "number" ? Math.round(override.targetScore / 10) : 0],
      mistakes: [],
      answered: false
    };

    document.getElementById("quiz-setup").hidden = true;
    document.getElementById("quiz-result").hidden = true;
    document.getElementById("quiz-play").hidden = false;

    const boardEl = document.getElementById("quiz-duel-board");
    boardEl.hidden = mode === "solo";
    for (const [index, name] of state.players.entries()) {
      const label = document.getElementById("quiz-board-p" + (index + 1) + "-name");
      label.textContent = name;
      if (state.onlineDuel) {
        const avatar = document.createElement("span");
        avatar.className = "quiz-duel-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = name.trim().split(/\s+/).slice(0, 2)
          .map((word) => Array.from(word)[0]).join("").toLocaleUpperCase("de");
        label.prepend(avatar);
      }
    }
    for (const id of ["quiz-retry-btn", "quiz-send-challenge-btn", "quiz-share-btn"]) {
      document.getElementById(id).hidden = mode === "online-duel";
    }

    renderQuestion();
  }

  function updateScoreboard(activePlayerIdx) {
    const duel = state.onlineDuel;
    document.getElementById("quiz-board-p1-pts").textContent = duel
      ? (state.index + Number(state.answered)) + "/10 beantwortet · " + state.scores[0] + " Pkt"
      : state.scores[0] + " Pkt";
    document.getElementById("quiz-board-p2-pts").textContent = duel
      ? duel.opponent_score !== null
        ? "10/10 beantwortet · " + duel.opponent_score + " Pkt"
        : duel.incoming || duel.accepted_at ? "Ergebnis offen" : "Wartet auf Annahme"
      : state.scores[1] + " Pkt";
    const p1Box = document.getElementById("quiz-board-p1");
    const p2Box = document.getElementById("quiz-board-p2");
    if (state.mode === "local-duel") {
      p1Box.classList.toggle("is-active", activePlayerIdx === 0);
      p2Box.classList.toggle("is-active", activePlayerIdx === 1);
    } else {
      p1Box.classList.add("is-active");
      p2Box.classList.remove("is-active");
    }
  }

  function renderQuestion() {
    state.answered = false;
    const q = state.questions[state.index];
    const total = state.questions.length;
    const activeIdx = state.mode === "local-duel" ? state.index % 2 : 0;
    const cats = window.STERNI_QUIZ_DATA?.QUIZ_CATEGORIES || [];
    const catLabel = cats.find((c) => c.id === q.category)?.label || q.category;

    document.getElementById("quiz-progress-label").textContent =
      state.mode === "local-duel"
        ? `Frage ${state.index + 1} von ${total} · Zug: ${state.players[activeIdx]}`
        : `Frage ${state.index + 1} von ${total}`;
    document.getElementById("quiz-cat-badge").textContent = catLabel;
    document.getElementById("quiz-progress-bar").style.width = `${Math.round((state.index / total) * 100)}%`;

    updateScoreboard(activeIdx);
    document.getElementById("quiz-question-text").textContent = q.question;

    const optsEl = document.getElementById("quiz-options");
    optsEl.innerHTML = "";
    const keys = ["A", "B", "C", "D"];
    q.shuffledOptions.forEach((optText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-option-btn";
      btn.innerHTML = `<span class="quiz-opt-key">${keys[i]}</span><span></span>`;
      btn.querySelector("span:last-child").textContent = optText;
      btn.addEventListener("click", () => handleAnswer(i));
      optsEl.appendChild(btn);
    });

    const fb = document.getElementById("quiz-feedback");
    fb.hidden = true;
    fb.classList.remove("is-ok");
  }

  function handleAnswer(chosenIdx) {
    if (state.answered) return;
    state.answered = true;

    const q = state.questions[state.index];
    const activeIdx = state.mode === "local-duel" ? state.index % 2 : 0;
    const isCorrect = chosenIdx === q.correctIndex;

    document.querySelectorAll("#quiz-options .quiz-option-btn").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.correctIndex) btn.classList.add("is-correct");
      else if (idx === chosenIdx) btn.classList.add("is-wrong");
    });

    if (isCorrect) {
      state.scores[activeIdx] += 10;
      state.correctCounts[activeIdx] += 1;
    } else {
      state.mistakes.push({
        question: q.question,
        chosen: q.shuffledOptions[chosenIdx],
        correct: q.shuffledOptions[q.correctIndex],
        explanation: q.explanation,
        player: state.mode === "local-duel" ? state.players[activeIdx] : state.players[0]
      });
    }

    let opponentNote = "";
    if (state.mode === "member-duel") {
      const oppCorrect = Math.random() < state.opponentSkill;
      if (oppCorrect) {
        state.scores[1] += 10;
        state.correctCounts[1] += 1;
      }
      opponentNote = ` (${state.players[1]}: ${oppCorrect ? "richtig +10" : "daneben"})`;
    }

    updateScoreboard(activeIdx);

    const fb = document.getElementById("quiz-feedback");
    fb.hidden = false;
    fb.classList.toggle("is-ok", isCorrect);
    document.getElementById("quiz-feedback-title").textContent =
      (isCorrect ? "Richtig!" : `Knapp daneben – richtig ist: ${q.shuffledOptions[q.correctIndex]}`) + opponentNote;
    document.getElementById("quiz-feedback-desc").textContent = q.explanation;
    document.getElementById("quiz-next-btn").textContent =
      state.index + 1 >= state.questions.length ? "Auswertung anzeigen →" : "Nächste Frage →";
  }

  function nextQuestion() {
    state.index += 1;
    if (state.index >= state.questions.length) finishQuiz();
    else renderQuestion();
  }

  function finishQuiz() {
    document.getElementById("quiz-play").hidden = true;
    document.getElementById("quiz-result").hidden = false;
    document.getElementById("quiz-progress-bar").style.width = "100%";

    const summaryEl = document.getElementById("quiz-result-summary");
    const headlineEl = document.getElementById("quiz-result-headline");
    const rankEl = document.getElementById("quiz-result-rank");

    if (state.mode === "online-duel") {
      headlineEl.textContent = "Online-Duell";
      summaryEl.textContent = state.players[0] + " gegen " + state.players[1];
      window.STERNI_QUIZ_ONLINE.finish(state.onlineDuel, state.scores[0], rankEl);
    } else if (state.mode === "solo") {
      const correct = state.correctCounts[0];
      const total = state.questions.length;
      const pct = Math.round((correct / total) * 100);
      headlineEl.textContent = pct >= 70 ? "STARKES ERGEBNIS!" : "SOLIDE RUNDE!";
      summaryEl.innerHTML = `
        <div class="metric-box"><span class="metric-label">${state.players[0]}</span><strong class="metric-val">${correct} / ${total}</strong></div>
        <div class="metric-box"><span class="metric-label">Punkte</span><strong class="metric-val">${state.scores[0]}</strong></div>
        <div class="metric-box"><span class="metric-label">Quote</span><strong class="metric-val">${pct}%</strong></div>
      `;
      rankEl.textContent = "Tipp: Fordere ein Mitglied aus dem Anglertreff direkt zum Duell heraus!";
    } else {
      const s0 = state.scores[0];
      const s1 = state.scores[1];
      const maxQ = state.mode === "local-duel" ? 5 : 10;
      const draw = s0 === s1;
      const p0Win = s0 > s1;

      headlineEl.textContent = draw
        ? "UNENTSCHIEDEN!"
        : p0Win
          ? `${state.players[0]} GEWINNT DAS DUELL!`
          : `${state.players[1]} GEWINNT DAS DUELL!`;

      summaryEl.innerHTML = `
        <div class="metric-box"><span class="metric-label">${state.players[0]}</span><strong class="metric-val">${s0} Pkt</strong><span class="small-meta muted">${state.correctCounts[0]} / ${maxQ} richtig</span></div>
        <div class="metric-box"><span class="metric-label">${state.players[1]}</span><strong class="metric-val">${s1} Pkt</strong><span class="small-meta muted">${state.correctCounts[1]} / ${maxQ} richtig</span></div>
        <div class="metric-box"><span class="metric-label">Fehler</span><strong class="metric-val">${state.mistakes.length}</strong></div>
      `;

      recordDuelResult(state.players[0], s0, p0Win, draw);
      recordDuelResult(state.players[1], s1, !p0Win && !draw, draw);
      rankEl.textContent = "Das Ergebnis wurde in der Mitglieder-Rangliste gespeichert.";
      if (state.inviteId) {
        window.STERNI_AUTH?.updateInviteStatus?.(
          state.inviteId,
          "completed",
          `${state.players[0]} (${s0} Pkt) vs. ${state.players[1]} (${s1} Pkt)`
        );
        window.STERNI_APP?.refreshMemberUI?.();
      }
    }

    const mistakesWrap = document.getElementById("quiz-mistakes-wrap");
    const mistakesList = document.getElementById("quiz-mistakes-list");
    mistakesList.innerHTML = "";
    if (!state.mistakes.length) {
      mistakesWrap.hidden = true;
    } else {
      mistakesWrap.hidden = false;
      document.getElementById("quiz-mistakes-summary").textContent = `Fehler & Erklärungen ansehen (${state.mistakes.length})`;
      state.mistakes.forEach((m) => {
        const card = document.createElement("div");
        card.className = "entry-card";
        card.innerHTML = `
          <div class="entry-card-head"><strong></strong><span class="pill-tag"></span></div>
          <p class="small-meta muted" style="margin:0.2rem 0"></p>
          <p class="small-meta" style="margin:0.2rem 0;color:#8ce9b1"></p>
          <p class="small-meta muted" style="margin:0.25rem 0 0"></p>
        `;
        card.querySelector("strong").textContent = m.question;
        card.querySelector(".pill-tag").textContent = m.player;
        const ps = card.querySelectorAll("p");
        ps[0].textContent = `Deine Antwort: ${m.chosen}`;
        ps[1].textContent = `Richtig: ${m.correct}`;
        ps[2].textContent = m.explanation;
        mistakesList.appendChild(card);
      });
    }
  }

  async function shareResult() {
    if (!state) return;
    const text = state.mode === "solo"
      ? `Sterni-App Wissens-Quiz: ${state.players[0]} hat ${state.correctCounts[0]}/10 Fragen (${state.scores[0]} Pkt) geholt!`
      : `Sterni-App Mitglieder-Duell: ${state.players[0]} (${state.scores[0]} Pkt) vs. ${state.players[1]} (${state.scores[1]} Pkt)!`;
    try {
      await navigator.clipboard.writeText(text);
      window.STERNI_APP?.toast("Duell-Ergebnis kopiert!");
    } catch {
      window.STERNI_APP?.toast(text);
    }
  }

  async function sendSetupInvite() {
    const catId = document.getElementById("quiz-category").value;
    const p1Name = getMe()?.name || document.getElementById("quiz-p1-select").value || "Angelfreund";
    const p2Name = document.getElementById("quiz-p2-select").value || "Freund";
    const seed = Math.floor(Math.random() * 1e9);
    const payload = { from: p1Name, to: p2Name, cat: catId, seed };
    const duelUrl = buildDuelUrl(payload);
    const text = `${p1Name} fordert ${p2Name} zum Wissens-Duell in der Sterni-App heraus: ${duelUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sterni-App Duell-Einladung", text, url: duelUrl });
      } else {
        await navigator.clipboard.writeText(text);
      }
      window.STERNI_APP?.toast(`Herausforderungs-Link für ${p2Name} kopiert!`);
    } catch {
      window.STERNI_APP?.toast("Link: " + duelUrl);
    }
  }

  async function sendResultChallenge() {
    if (!state) return;
    const p1Name = getMe()?.name || state.players[0];
    const p2Name = state.players[1] && state.players[1] !== p1Name ? state.players[1] : "Freund";
    const payload = {
      from: p1Name,
      to: p2Name,
      cat: state.catId,
      seed: state.seed,
      fromScore: state.scores[0]
    };
    const duelUrl = buildDuelUrl(payload);
    const text = `${p1Name} hat ${state.scores[0]} Punkte vorgelegt – schaffst du mehr? ${duelUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sterni-App Herausforderung", text, url: duelUrl });
      } else {
        await navigator.clipboard.writeText(text);
      }
      window.STERNI_APP?.toast(`Herausforderung (${state.scores[0]} Pkt) kopiert!`);
    } catch {
      window.STERNI_APP?.toast("Link: " + duelUrl);
    }
  }

  function showInviteBanner(invite) {
    pendingInvite = invite;
    const banner = document.getElementById("quiz-invite-banner");
    const title = document.getElementById("quiz-invite-banner-title");
    const desc = document.getElementById("quiz-invite-banner-desc");
    if (!banner) return;
    const cats = window.STERNI_QUIZ_DATA?.QUIZ_CATEGORIES || [];
    const catLabel = invite.category === "all"
      ? "Alle 20 Themen (Gemischt)"
      : (cats.find((c) => c.id === invite.category)?.label || invite.category);

    title.textContent = `Duell-Einladung von ${invite.from}`;
    desc.textContent = typeof invite.fromScore === "number"
      ? `Thema: ${catLabel} · ${invite.from} hat ${invite.fromScore} Punkte vorgelegt. Spiel exakt dieselben 10 Fragen!`
      : `Thema: ${catLabel} · ${invite.message || "Nimm die Herausforderung an!"}`;
    banner.hidden = false;
  }

  function acceptPendingInvite() {
    if (!pendingInvite) return;
    const inv = pendingInvite;
    const decoded = inv.duelCode ? decodeDuelCode(inv.duelCode) : null;
    const currentName = getMe()?.name || document.getElementById("quiz-p1-select")?.value || "Du";
    const p1Name = currentName === inv.from ? `${currentName} (Du)` : currentName;
    const hasPreScore = typeof inv.fromScore === "number" || typeof decoded?.fromScore === "number";
    const targetScore = typeof inv.fromScore === "number" ? inv.fromScore : decoded?.fromScore;

    if (inv.id) window.STERNI_AUTH?.updateInviteStatus?.(inv.id, "accepted");
    document.getElementById("quiz-invite-banner").hidden = true;
    pendingInvite = null;

    startQuiz({
      catId: decoded?.cat || inv.category || "all",
      mode: hasPreScore ? "invite-duel" : "member-duel",
      p1Name,
      p2Name: inv.from,
      seed: decoded?.seed,
      targetScore: hasPreScore ? targetScore : null,
      inviteId: inv.id || null
    });
  }

  function openDuelWith(opponentName, category = "all") {
    showSetup();
    const p1Sel = document.getElementById("quiz-p1-select");
    const p2Sel = document.getElementById("quiz-p2-select");
    const catSel = document.getElementById("quiz-category");
    const currentName = getMe()?.name;
    if (p1Sel && currentName && [...p1Sel.options].some((o) => o.value === currentName)) {
      p1Sel.value = currentName;
    }
    if (p2Sel && opponentName && [...p2Sel.options].some((o) => o.value === opponentName)) {
      p2Sel.value = opponentName;
    }
    if (catSel && category) catSel.value = category;
    location.hash = "#quiz";
  }

  function startDuelFromInvite(invite) {
    showSetup();
    showInviteBanner(invite);
    location.hash = "#quiz";
  }

  function checkUrlDuelInvite() {
    const params = new URLSearchParams(location.search);
    const code = params.get("duell");
    if (!code) return false;
    const decoded = decodeDuelCode(code);
    if (!decoded?.from) return false;
    addMember(decoded.from);
    if (decoded.to && decoded.to !== "Freund" && !getMe()) {
      saveMe(decoded.to);
    }
    showSetup();
    renderFriendsPanel();
    showInviteBanner({
      from: decoded.from,
      to: decoded.to || "Dich",
      category: decoded.cat || "all",
      duelCode: code,
      fromScore: decoded.fromScore
    });
    return true;
  }

  return {
    init,
    showSetup,
    startOnlineRound(duel, me) {
      startQuiz({
        mode: "online-duel", catId: duel.category, seed: duel.seed,
        p1Name: me.name, p2Name: duel.opponent_name, onlineDuel: duel
      });
    },
    updateOnlineRound(duels) {
      if (!state?.onlineDuel) return;
      const duel = duels.find((entry) => entry.id === state.onlineDuel.id);
      if (!duel) return;
      state.onlineDuel = duel;
      if (!document.getElementById("quiz-play").hidden) updateScoreboard(0);
    },
    addMember,
    populateSelectors,
    openDuelWith,
    startDuelFromInvite,
    checkUrlDuelInvite,
    buildDuelUrl
  };
})();
