window.STERNI_QUIZ_ONLINE = (() => {
  const config = window.ANGLERTREFF_CONFIG;
  const sessionKey = "petri-treff-session-v1";
  const element = (id) => document.getElementById(id);
  let currentMember = null;
  let selected = null;
  let pendingResult = null;
  let snapshotPending = false;
  let lastSnapshot = "";
  let onAnglertreff = false;

  function storedSession() {
    try {
      const storage = localStorage.getItem(sessionKey) ? localStorage : sessionStorage;
      const session = JSON.parse(storage.getItem(sessionKey));
      return session?.access_token ? { storage, session } : null;
    } catch {
      return null;
    }
  }

  async function refreshSession(previous) {
    const refresh = async () => {
      const current = storedSession();
      if (!current) return null;
      if (current.session.access_token !== previous.session.access_token) return current;
      const response = await fetch(config.url + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: current.session.refresh_token }),
        signal: AbortSignal.timeout(12000)
      });
      const latest = storedSession();
      if (latest?.session.access_token !== current.session.access_token) return latest;
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status)) {
          current.storage.removeItem(sessionKey);
          return null;
        }
        throw Error("Die Anmeldung konnte gerade nicht geprüft werden.");
      }
      const { access_token, refresh_token, expires_at } = await response.json();
      if (storedSession()?.session.access_token !== current.session.access_token) return storedSession();
      const session = { access_token, refresh_token, expires_at };
      current.storage.setItem(sessionKey, JSON.stringify(session));
      return { storage: current.storage, session };
    };
    return navigator.locks ? navigator.locks.request(sessionKey, refresh) : refresh();
  }

  async function rpc(name, args = {}) {
    let saved = storedSession();
    if (!saved) throw Error("Bitte im Anglertreff anmelden.");
    const send = (token) => fetch(config.url + "/rest/v1/rpc/" + name, {
      method: "POST", cache: "no-store",
      headers: { apikey: config.publishableKey, Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(12000)
    });
    let response = await send(saved.session.access_token);
    if (response.status === 401 && saved.session.refresh_token) {
      saved = await refreshSession(saved);
      if (!saved) throw Error("Bitte erneut im Anglertreff anmelden.");
      response = await send(saved.session.access_token);
    }
    const value = await response.json();
    if (!response.ok) {
      const message = ["P0001", "42501"].includes(value.code) ? value.message : null;
      throw Error(message || "Der Online-Dienst ist gerade nicht erreichbar.");
    }
    return value;
  }

  function text(id, value) {
    const target = element(id);
    if (target.textContent !== value) target.textContent = value;
  }

  function button(label, handler, className = "btn-outline btn-sm") {
    const target = document.createElement("button");
    target.type = "button";
    target.className = className;
    target.textContent = label;
    target.addEventListener("click", handler);
    return target;
  }

  function clearSelection() {
    selected = null;
  }

  function challengeMember(member, action) {
    selected = { member };
    void start("all", action);
  }

  function playRound(duel) {
    if (!currentMember || duel.my_score !== null) return;
    clearSelection();
    location.hash = "#quiz";
    window.STERNI_QUIZ.startOnlineRound(duel, currentMember);
    requestAnimationFrame(() => {
      element("quiz-play").closest("details").open = true;
      const question = element("quiz-question-text");
      question.tabIndex = -1;
      question.focus();
    });
  }

  function resultText(duel) {
    const own = "Deine Punkte: " + duel.my_score + " · ";
    if (duel.opponent_score === null) return own + duel.opponent_name + ": Ergebnis offen";
    const outcome = duel.my_score === duel.opponent_score ? "Unentschieden"
      : duel.my_score > duel.opponent_score ? "Gewonnen" : "Verloren";
    return own + duel.opponent_name + ": " + duel.opponent_score + " Punkte · " + outcome;
  }

  function renderLeaderboard(entries) {
    const target = element("quiz-online-leaderboard");
    const heading = document.createElement("h3");
    heading.textContent = "Rangliste der Online-Duelle";
    const list = document.createElement("ol");
    for (const entry of entries) {
      const row = document.createElement("li");
      row.textContent = entry.name + " · " + entry.played + " Duelle · " + entry.wins + " Siege · "
        + entry.losses + " Niederlagen · " + entry.draws + " Unentschieden · " + entry.points + " Punkte";
      list.append(row);
    }
    target.hidden = false;
    target.replaceChildren(heading, list);
  }

  function renderOnlineMembers(members) {
    const list = element("quiz-online-members");
    const count = element("quiz-online-count");
    list.hidden = count.hidden = members.length === 0;
    text("quiz-online-count", members.length ? String(members.length) : "");
    list.replaceChildren();
    for (const member of members) {
      const row = document.createElement("li");
      row.className = "quiz-online-row";
      const name = document.createElement("span");
      const dot = document.createElement("span");
      dot.className = "quiz-online-dot";
      dot.setAttribute("aria-hidden", "true");
      name.append(dot, member.name);
      row.append(name);
      list.append(row);
    }
  }

  function renderSnapshot(snapshot) {
    if (onAnglertreff) {
      const invitations = snapshot.duels.filter((duel) => duel.incoming && duel.my_score === null);
      const link = element("treff-quiz-notice");
      link.hidden = !invitations.length;
      link.textContent = invitations.length === 1
        ? "Offenes Quiz-Duell von " + invitations[0].opponent_name
        : invitations.length + " offene Quiz-Duelle";
      return;
    }
    if (currentMember?.id !== snapshot.me.id) clearSelection();
    currentMember = snapshot.me;
    const opponents = snapshot.online.filter((member) => member.id !== currentMember.id);
    element("quiz-online-setup").hidden = false;
    element("quiz-online-empty").hidden = opponents.length > 0;
    window.STERNI_QUIZ.updateOnlineRound(snapshot.duels);
    if (pendingResult?.memberId === currentMember.id) {
      const duel = snapshot.duels.find((entry) => entry.id === pendingResult.id);
      if (duel?.my_score != null && !element("quiz-result").hidden) {
        pendingResult.target.textContent = resultText(duel);
      }
    }
    const signature = JSON.stringify(snapshot);
    if (signature === lastSnapshot) return;
    lastSnapshot = signature;
    renderOnlineMembers(opponents);
    const members = element("quiz-online-opponents");
    const leaderboard = element("quiz-online-leaderboard");
    members.hidden = opponents.length === 0;
    members.replaceChildren();
    leaderboard.hidden = true;
    leaderboard.replaceChildren();
    for (const member of opponents) {
      const row = document.createElement("li");
      row.className = "quiz-online-row";
      const name = document.createElement("span");
      const dot = document.createElement("span");
      dot.className = "quiz-online-dot";
      dot.setAttribute("aria-hidden", "true");
      name.append(dot, member.name);
      const challenge = button("Herausfordern", () => challengeMember(member, challenge), "btn-primary");
      challenge.dataset.quizMember = member.id;
      challenge.setAttribute("aria-label", member.name + " herausfordern");
      row.append(name, challenge);
      members.append(row);
    }
  }

  function hideSnapshot() {
    if (onAnglertreff) {
      element("treff-quiz-notice").hidden = true;
      return;
    }
    currentMember = null;
    lastSnapshot = "";
    clearSelection();
    renderOnlineMembers([]);
    element("quiz-online-setup").hidden = true;
    element("quiz-online-empty").hidden = true;
    for (const id of ["quiz-online-opponents", "quiz-online-leaderboard"]) element(id).replaceChildren();
  }

  async function sync() {
    if (snapshotPending || document.hidden) return;
    if (!storedSession()) {
      hideSnapshot();
      return;
    }
    snapshotPending = true;
    try {
      const value = await rpc("sterni_quiz_snapshot");
      if (storedSession()) renderSnapshot(value);
    } catch {
      hideSnapshot();
    } finally {
      snapshotPending = false;
    }
  }

  async function start(category, submit) {
    const choice = selected;
    const owner = currentMember;
    if (!choice || !owner) return;
    if (submit.disabled) return;
    submit.disabled = true;
    if (choice.request?.category !== category) {
      choice.request = { id: crypto.randomUUID(), category, seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647 };
    }
    const request = choice.request;
    try {
      const id = await rpc("sterni_quiz_create", {
        duel_id: request.id, target: choice.member.id, topic: request.category, question_seed: request.seed
      });
      if (currentMember?.id === owner.id && selected === choice) {
        playRound({ ...request, id, my_score: null, opponent_name: choice.member.name, opponent_score: null });
      }
      void sync();
    } catch (error) {
      window.STERNI_APP?.toast(error.message);
    } finally {
      submit.disabled = false;
    }
  }

  async function finish(duel, score, target) {
    const id = duel.id;
    pendingResult = { id, target, memberId: currentMember?.id };
    target.textContent = "Ergebnis wird gespeichert …";
    try {
      const value = await rpc("sterni_quiz_submit", { duel_id: id, points: score });
      if (pendingResult?.id === id && !element("quiz-result").hidden) target.textContent = resultText({ ...duel, ...value });
      void sync();
    } catch (error) {
      if (pendingResult?.id !== id || element("quiz-result").hidden) return;
      target.textContent = error.message + " ";
      target.append(button("Ergebnis erneut speichern", () => finish(duel, score, target)));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    onAnglertreff = Boolean(element("treff-quiz-notice"));
    if (!config?.url || !config?.publishableKey) {
      hideSnapshot();
      return;
    }
    window.addEventListener("pageshow", sync);
    window.addEventListener("sterni-session-changed", sync);
    window.addEventListener("storage", (event) => {
      if (event.key === sessionKey) void sync();
    });
    document.addEventListener("visibilitychange", sync);
    window.setInterval(sync, 30000);
    void sync();
  });

  return { rpc, hasSession: storedSession, finish, clearResult() { pendingResult = null; } };
})();
