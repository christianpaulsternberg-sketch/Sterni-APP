window.STERNI_QUIZ_ONLINE = (() => {
  const config = window.ANGLERTREFF_CONFIG;
  const sessionKey = "petri-treff-session-v1";
  const element = (id) => document.getElementById(id);
  let currentMember = null;
  let challengePending = false;
  let decisionPending = false;
  let invitationId = null;
  let dialog;
  let pendingResult = null;
  let snapshotPending = false;
  let lastSnapshot = "";
  let onAnglertreff = false;
  let presenceId = null;
  let presenceToken = null;
  let noticeMessage = null;
  const openedDuels = new Set();

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

  async function authenticatedFetch(path, options = {}) {
    let saved = storedSession();
    if (!saved) throw Error("Bitte im Anglertreff anmelden.");
    const send = (token) => fetch(config.url + "/rest/v1/" + path, {
      ...options, cache: "no-store",
      headers: { ...options.headers, apikey: config.publishableKey, Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(12000)
    });
    let response = await send(saved.session.access_token);
    if (response.status === 401 && saved.session.refresh_token) {
      saved = await refreshSession(saved);
      if (!saved) throw Error("Bitte erneut im Anglertreff anmelden.");
      response = await send(saved.session.access_token);
    }
    return response;
  }

  async function rpc(name, args = {}) {
    const response = await authenticatedFetch("rpc/" + name, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });
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

  function notice(message) {
    if (noticeMessage === message) return;
    noticeMessage = message;
    const target = element("quiz-duel-notice");
    target.replaceChildren();
    if (!message) {
      target.hidden = true;
      return;
    }
    const text = document.createElement("p");
    text.textContent = message;
    target.append(text);
    target.hidden = false;
  }

  function openLiveDuel(id) {
    if (openedDuels.has(id)) return;
    openedDuels.add(id);
    if (onAnglertreff) {
      sessionStorage.setItem("sterni-live-quiz-id", id);
      location.assign("./#quiz");
      return;
    }
    window.dispatchEvent(new CustomEvent("sterni-live-duel", { detail: id }));
  }

  function trackedDuels() {
    const key = "sterni-pending-duels:" + currentMember.id;
    const ids = new Set(JSON.parse(sessionStorage.getItem(key) || "[]"));
    return { ids, save() { sessionStorage.setItem(key, JSON.stringify([...ids])); } };
  }

  function endMessage(duel) {
    if (duel.declined_at) return duel.incoming ? "Du hast die Herausforderung abgelehnt."
      : duel.opponent_name + " hat die Herausforderung abgelehnt.";
    if (duel.end_reason === "expired") return "Die Einladung ist abgelaufen.";
    if (duel.end_reason === "left_duel") {
      return duel.ended_by_me ? "Du hast das Duell beendet." : duel.opponent_name + " hat das Duell verlassen.";
    }
    if (!duel.ended_at) return "";
    const reason = duel.ended_by_me ? "Deine Quiz-Sitzung ist offline gegangen."
      : duel.end_reason === "left" ? duel.opponent_name + " hat die App verlassen."
      : "Verbindung zu " + duel.opponent_name + " verloren.";
    return reason + (duel.accepted_at ? " Das Duell wurde beendet." : " Die Einladung wurde beendet.");
  }

  function showInvitation(invitation, declined = false) {
    const id = invitation ? (declined ? "declined:" : "incoming:") + invitation.id : null;
    if (decisionPending || invitationId === id) return;
    invitationId = id;
    if (!invitation) {
      if (dialog.open) dialog.close();
      return;
    }
    const title = document.createElement("h2");
    title.id = "quiz-invitation-title";
    title.textContent = invitation.opponent_name + (declined
      ? " hat das Duell abgelehnt."
      : " fordert dich zum Duell heraus.");
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    const controls = document.createElement("div");
    controls.className = "action-row";
    if (declined) {
      controls.append(button("Runde beenden", () => {
        const tracked = trackedDuels();
        tracked.ids.delete(invitation.id);
        tracked.save();
        showInvitation();
        void sync();
      }, "btn-primary"));
      dialog.replaceChildren(title, controls);
      if (!dialog.open) dialog.showModal();
      return;
    }
    const accept = button("Duell annehmen", () => decide(true), "btn-primary");
    const decline = button("Ablehnen", () => decide(false));
    controls.append(accept, decline);
    dialog.replaceChildren(title, status, controls);
    if (!dialog.open) dialog.showModal();

    async function decide(accepted) {
      if (decisionPending) return;
      decisionPending = accept.disabled = decline.disabled = true;
      status.textContent = "";
      try {
        await rpc(accepted ? "sterni_quiz_accept" : "sterni_quiz_decline", { duel_id: invitation.id });
        dialog.close();
        invitationId = null;
        if (accepted) openLiveDuel(invitation.id);
        else if (!onAnglertreff) notice("Du hast die Herausforderung abgelehnt.");
      } catch (error) {
        status.textContent = error.message;
      } finally {
        decisionPending = accept.disabled = decline.disabled = false;
        void sync();
      }
    }
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
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "muted small-meta";
      empty.textContent = "Noch keine abgeschlossenen Online-Duelle.";
      target.hidden = false;
      target.replaceChildren(heading, empty);
      return;
    }
    entries.forEach((entry, index) => {
      const row = document.createElement("li");
      row.textContent = (index + 1) + ". " + entry.name + " · " + entry.played + " Duelle · "
        + entry.wins + " Siege · " + entry.losses + " Niederlagen · " + entry.draws
        + " Unentschieden · " + entry.points + " Punkte";
      list.append(row);
    });
    target.hidden = false;
    target.replaceChildren(heading, list);
  }

  function renderHistory(duels) {
    const target = element("quiz-duel-history");
    const heading = document.createElement("h3");
    heading.textContent = "Duellhistorie";
    if (!duels.length) {
      const empty = document.createElement("p");
      empty.className = "muted small-meta";
      empty.textContent = "Noch keine Duelle vorhanden.";
      target.replaceChildren(heading, empty);
      return;
    }
    const list = document.createElement("ul");
    list.className = "stack-list";
    for (const duel of duels) {
      const row = document.createElement("li");
      const when = new Date(duel.created_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
      const score = duel.my_score === null ? "Punkte offen" : duel.my_score + " : "
        + (duel.opponent_score === null ? "offen" : duel.opponent_score);
      const outcome = duel.status === "abgeschlossen"
        ? (duel.my_score === duel.opponent_score ? "Unentschieden" : duel.my_score > duel.opponent_score ? "Gewonnen" : "Verloren")
        : duel.status === "abgebrochen" ? "Abgebrochen" : duel.status === "laufend" ? "Laufend" : "Einladung offen";
      row.textContent = (duel.challenger_name || "Spieler 1") + " gegen "
        + (duel.challenged_name || duel.opponent_name) + " · " + when + " · " + score
        + " · " + outcome + " (" + duel.status + ")";
      list.append(row);
    }
    target.replaceChildren(heading, list);
  }

  function renderOnlineMembers(members) {
    const list = element("quiz-online-members");
    const count = element("quiz-online-count");
    const quizCount = element("quiz-opponents-count");
    list.hidden = count.hidden = members.length === 0;
    text("quiz-online-count", members.length ? String(members.length) : "");
    quizCount.hidden = count.hidden;
    quizCount.textContent = count.textContent;
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
    if (currentMember?.id !== snapshot.me.id) openedDuels.clear();
    currentMember = snapshot.me;
    const pending = snapshot.duels.filter((duel) => !duel.accepted_at && !duel.declined_at && !duel.ended_at);
    const incoming = pending.find((duel) => duel.incoming);
    const outgoing = pending.find((duel) => !duel.incoming);
    const active = snapshot.duels.find((duel) => duel.live && !duel.live_finished && !duel.ended_at);
    const tracked = trackedDuels();
    for (const duel of snapshot.duels) {
      if (duel.incoming) continue;
      if (duel.accepted_at || duel.ended_at) tracked.ids.delete(duel.id);
      else if (!duel.declined_at) tracked.ids.add(duel.id);
    }
    tracked.save();
    const declined = snapshot.duels.find((duel) => !duel.incoming && duel.declined_at && tracked.ids.has(duel.id));
    showInvitation(incoming || declined, !incoming && Boolean(declined));
    if (onAnglertreff) return;

    const opponents = snapshot.online.filter((member) => member.id !== currentMember.id);
    element("quiz-online-setup").hidden = false;
    element("quiz-online-empty").hidden = opponents.length > 0;
    window.STERNI_QUIZ.updateOnlineRound(snapshot.duels);
    if (active && !incoming) openLiveDuel(active.id);
    if (outgoing) notice("Einladung an " + outgoing.opponent_name + " gesendet. Warte auf Antwort …");
    else if (incoming) notice(incoming.opponent_name + " fordert dich zum Duell heraus.");
    else if (active) notice(active.incoming ? "Duell mit " + active.opponent_name + " läuft."
      : active.opponent_name + " hat die Herausforderung angenommen.");
    else {
      const latest = snapshot.duels[0];
      notice(latest ? endMessage(latest) : "");
    }
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
    renderLeaderboard(snapshot.leaderboard || []);
    renderHistory(snapshot.duels || []);
    for (const member of opponents) {
      const row = document.createElement("li");
      row.className = "quiz-online-row";
      const name = document.createElement("span");
      const dot = document.createElement("span");
      dot.className = "quiz-online-dot";
      dot.setAttribute("aria-hidden", "true");
      name.append(dot, member.name);
      const challenge = button("Herausfordern", () => start(member, challenge), "btn-primary");
      challenge.disabled = Boolean(incoming || outgoing || active);
      challenge.dataset.quizMember = member.id;
      challenge.setAttribute("aria-label", member.name + " herausfordern");
      row.append(name, challenge);
      members.append(row);
    }
  }

  function hideSnapshot() {
    showInvitation();
    currentMember = null;
    openedDuels.clear();
    lastSnapshot = "";
    if (onAnglertreff) return;
    renderOnlineMembers([]);
    element("quiz-online-setup").hidden = true;
    element("quiz-online-empty").hidden = true;
    for (const id of ["quiz-online-opponents", "quiz-online-leaderboard", "quiz-duel-history"]) element(id).replaceChildren();
    notice();
  }

  async function sync() {
    const saved = storedSession();
    if (!saved) {
      leavePresence();
      hideSnapshot();
      return;
    }
    if (snapshotPending || document.hidden) return;
    const sessionId = presenceId ??= crypto.randomUUID();
    presenceToken = saved.session.access_token;
    snapshotPending = true;
    try {
      const value = await rpc("sterni_quiz_snapshot", { session_id: sessionId });
      const current = storedSession();
      if (current && presenceId === sessionId) {
        presenceToken = current.session.access_token;
        renderSnapshot(value);
      }
    } catch {
      if (!storedSession()) hideSnapshot();
      else if (!onAnglertreff && presenceId === sessionId) {
        notice("Quiz-Verbindung unterbrochen. Verbindung wird erneut geprüft …");
      }
    } finally {
      snapshotPending = false;
    }
  }

  function leavePresence() {
    const sessionId = presenceId;
    const token = presenceToken;
    presenceId = presenceToken = null;
    if (!sessionId || !token) return;
    void fetch(config.url + "/rest/v1/rpc/sterni_quiz_leave", {
      method: "POST", keepalive: true,
      headers: { apikey: config.publishableKey, Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    }).catch(() => {});
  }

  async function start(member, submit) {
    if (!currentMember || challengePending) return;
    const memberId = currentMember.id;
    challengePending = submit.disabled = true;
    try {
      const id = await rpc("sterni_quiz_create", {
        duel_id: crypto.randomUUID(), target: member.id, topic: "all",
        question_seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2147483647
      });
      if (currentMember?.id !== memberId) return;
      const tracked = trackedDuels();
      tracked.ids.add(id);
      tracked.save();
      notice("Einladung an " + member.name + " gesendet. Warte auf Antwort …");
    } catch (error) {
      window.STERNI_APP?.toast(error.message);
    } finally {
      challengePending = submit.disabled = false;
      void sync();
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
    onAnglertreff = !element("quiz-online-setup");
    dialog = document.createElement("dialog");
    dialog.className = "quiz-invitation";
    dialog.setAttribute("aria-labelledby", "quiz-invitation-title");
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(dialog);
    if (!config?.url || !config?.publishableKey) {
      hideSnapshot();
      return;
    }
    window.addEventListener("pageshow", sync);
    window.addEventListener("pagehide", leavePresence);
    window.addEventListener("online", sync);
    window.addEventListener("sterni-session-changed", sync);
    window.addEventListener("storage", (event) => {
      if (event.key === sessionKey) void sync();
    });
    document.addEventListener("visibilitychange", sync);
    window.setInterval(sync, 2000);
    void sync();
  });

  return { rpc, authenticatedFetch, hasSession: storedSession, finish, clearResult() { pendingResult = null; } };
})();
