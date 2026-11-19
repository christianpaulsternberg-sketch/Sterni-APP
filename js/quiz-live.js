(() => {
  const panel = document.getElementById("live-quiz");
  const screen = document.getElementById("live-quiz-screen");
  const message = document.getElementById("live-quiz-message");
  const api = window.STERNI_QUIZ_ONLINE;
  const storageKey = "sterni-live-quiz-id";
  const codePattern = /^[0-9A-F]{8}$/;
  const linkValue = new URL(location.href).searchParams.get("duell")?.toUpperCase();
  const invitation = codePattern.test(linkValue) || linkValue === "STARTEN" ? linkValue : null;
  let gameId = invitation ? null : sessionStorage.getItem(storageKey);
  let requestedId = null;
  let code = codePattern.test(invitation) ? invitation : "";
  let joining = Boolean(code);
  let loginPending = Boolean(invitation);
  let autoCreate = invitation === "STARTEN";
  let game;
  let busy = false;
  let queuedAction;
  let pendingDuelId;
  let runningAction;
  let signature = "";
  let autoJoin = Boolean(code);

  function node(tag, label, className) {
    const element = document.createElement(tag);
    if (label) element.textContent = label;
    if (className) element.className = className;
    return element;
  }

  function button(label, handler, primary = true) {
    const element = node("button", label, primary ? "btn-primary" : "btn-outline");
    element.type = "button";
    element.addEventListener("click", handler);
    return element;
  }

  function visible() {
    return location.hash === "#quiz" && !document.hidden;
  }

  function clearInvitation() {
    const url = new URL(location.href);
    if (!url.searchParams.has("duell")) return;
    url.searchParams.delete("duell");
    history.replaceState(history.state, "", url);
  }

  function reset() {
    game = null;
    gameId = null;
    requestedId = null;
    autoCreate = false;
    autoJoin = false;
    sessionStorage.removeItem(storageKey);
    clearInvitation();
    joining = false;
    loginPending = false;
    code = "";
    message.textContent = "";
    render();
  }

  function loginLink() {
    const link = node("a", "Im Anglertreff anmelden", "btn-primary");
    const url = new URL("anglertreff.html", location.href);
    url.searchParams.set("quiz", codePattern.test(code) ? code : "starten");
    link.href = url.href;
    return link;
  }

  function render() {
    const session = Boolean(api.hasSession());
    const nextSignature = JSON.stringify([game, session, joining, loginPending]);
    if (signature === nextSignature) return;
    const focusInside = screen.contains(document.activeElement);
    signature = nextSignature;
    screen.replaceChildren();

    if (!game || !session) {
      if (!session && (loginPending || game)) {
        if (codePattern.test(code)) screen.append(node("p", "Du bist zu einem Duell eingeladen."));
        screen.append(node("p", "Für das Online-Duell brauchst du dein Anglertreff-Konto."), loginLink(), button("Zurück", reset, false));
      } else if (joining) {
        const form = node("form", "", "live-quiz-join");
        const label = node("label", "Duellcode");
        const input = node("input");
        input.name = "code";
        input.value = code;
        input.maxLength = 8;
        input.required = true;
        input.autocomplete = "off";
        input.autocapitalize = "characters";
        input.spellcheck = false;
        label.append(input);
        const submit = node("button", "Duell beitreten", "btn-primary");
        form.append(label, submit, button("Zurück", reset, false));
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          code = input.value.trim().toUpperCase();
          if (!codePattern.test(code)) {
            message.textContent = "Gib den achtstelligen Duellcode ein.";
            input.focus();
            return;
          }
          if (session) void request("join", { invite_code: code });
          else {
            loginPending = true;
            render();
          }
        });
        screen.append(form);
        if (focusInside) input.focus();
        return;
      } else {
        screen.append(
          button("Duell starten", () => {
            if (session) start();
            else {
              loginPending = true;
              render();
            }
          }),
          button("Duell beitreten", () => {
            joining = true;
            render();
          }, false)
        );
      }
    } else if (game.left) {
      const title = game.endReason === "disconnected" && game.left === "opponent"
        ? "Verbindung zu " + game.opponent + " verloren. Duell beendet."
        : game.left === "self" ? "Duell beendet" : "Dein Mitspieler hat das Duell verlassen";
      screen.append(
        node("h2", title),
        button("Zur Quiz-Startseite", reset)
      );
    } else if (!game.opponent) {
      const link = new URL(location.href);
      link.searchParams.set("duell", game.code);
      link.hash = "quiz";
      const field = node("input");
      field.type = "url";
      field.readOnly = true;
      field.value = link.href;
      field.setAttribute("aria-label", "Einladungslink");
      screen.append(
        node("h2", "Mitspieler einladen"),
        node("p", "Teile den Link oder gib deinen Duellcode weiter."),
        node("strong", game.code, "live-quiz-code"),
        field,
        button("Einladungslink kopieren", async () => {
          try {
            await navigator.clipboard.writeText(link.href);
            message.textContent = "Einladungslink kopiert.";
          } catch {
            field.select();
            message.textContent = "Der Link ist markiert. Du kannst ihn jetzt kopieren.";
          }
        }),
        node("p", "Warte auf Mitspieler …")
      );
    } else {
      const score = node("div", "", "live-quiz-score");
      score.append(node("span", `${game.me} · ${game.myScore}`), node("span", `${game.opponent} · ${game.opponentScore}`));
      screen.append(score);
      if (game.offline) screen.append(node("p", `${game.opponent} ist gerade nicht verbunden. Das Duell kann fortgesetzt werden.`));
      if (game.round === 6) {
        const winner = game.myScore > game.opponentScore ? game.me : game.opponent;
        screen.append(node("h2", game.myScore === game.opponentScore ? "Unentschieden" : winner + " gewinnt!"));
        if (game.ready) screen.append(node("p", "Warte auf Mitspieler für die Revanche …"));
        else screen.append(button("Revanche", () => request("rematch")));
      } else {
        screen.append(
          node("p", `Frage ${game.round} von 5`, "quiz-counter"),
          node("h2", game.question.text)
        );
        const options = node("div", "", "live-quiz-options");
        options.setAttribute("role", "group");
        options.setAttribute("aria-label", "Antwortmöglichkeiten");
        game.question.options.forEach((option, index) => {
          const number = index + 1;
          const choice = button(option, () => request("answer", { question_number: game.round, answer: number }), false);
          choice.disabled = game.answer !== null;
          let mark = "";
          if (game.correct === number) mark = "✓ Richtige Antwort";
          else if (game.answer === number) mark = game.correct !== null ? "✗ Deine Antwort" : "Deine Antwort";
          if (mark) choice.append(node("small", mark));
          options.append(choice);
        });
        screen.append(options);
        if (game.correct !== null && !game.ready) {
          screen.append(button(game.round === 5 ? "Zum Ergebnis" : "Weiter", () => request("next", { question_number: game.round })));
        } else if (game.answer !== null) {
          screen.append(node("p", "Warte auf Mitspieler …"));
        }
      }
    }
    if (session && game && !game.left) {
      const leave = button("Duell verlassen", () => request("leave"), false);
      leave.classList.add("live-quiz-leave");
      screen.append(leave);
    }
    const heading = screen.querySelector("h2");
    heading?.setAttribute("tabindex", "-1");
    if (focusInside) (heading || screen.querySelector("button"))?.focus({ preventScroll: true });
  }

  function setGame(next) {
    game = next;
    gameId = next.id;
    sessionStorage.setItem(storageKey, gameId);
  }

  async function request(action, args = {}) {
    if (!api.hasSession()) return;
    if (busy) {
      if (runningAction === "state" && !queuedAction && action !== "state") {
        queuedAction = { action, args, id: gameId };
      }
      return;
    }
    busy = true;
    runningAction = action;
    if (action !== "state") panel.setAttribute("aria-busy", "true");
    try {
      const payload = { action, target_id: gameId, ...args };
      setGame(await api.rpc("sterni_live_quiz", payload));
      if (action === "join" || action === "create") clearInvitation();
      if (game.rematch && !game.left) {
        setGame(await api.rpc("sterni_live_quiz", { action: "state", target_id: game.rematch }));
      }
      requestedId = null;
      if (action !== "state" || message.dataset.connection) message.textContent = "";
      delete message.dataset.connection;
    } catch (error) {
      if (action === "state" && !game && error.message === "Dieses Duell ist für dich nicht verfügbar.") reset();
      const disconnected = error instanceof TypeError || error.name === "TimeoutError";
      if (disconnected) message.dataset.connection = "true";
      message.textContent = disconnected
        ? "Verbindung unterbrochen. Das Duell wird nach der Rückkehr der Verbindung fortgesetzt."
        : error.message;
    } finally {
      busy = false;
      panel.removeAttribute("aria-busy");
      render();
      if (pendingDuelId) {
        openDuel(pendingDuelId);
      } else if (queuedAction) {
        const queued = queuedAction;
        queuedAction = null;
        if (queued.id === gameId) void request(queued.action, queued.args);
      }
    }
  }

  function openDuel(id) {
    if (busy) {
      pendingDuelId = id;
      return;
    }
    pendingDuelId = null;
    queuedAction = null;
    if (gameId !== id) {
      reset();
      gameId = id;
      sessionStorage.setItem(storageKey, id);
    }
    location.hash = "#quiz";
    requestAnimationFrame(() => {
      const status = document.getElementById("quiz-duel-notice");
      const scrollTarget = status && !status.hidden ? status : panel;
      scrollTarget.scrollIntoView({ block: "start" });
      panel.focus({ preventScroll: true });
    });
    void request("state");
  }

  function start() {
    requestedId ||= crypto.randomUUID();
    void request("create", { target_id: requestedId });
  }

  function sync() {
    if (!visible()) return;
    render();
    if (busy || !api.hasSession()) return;
    if (autoCreate) {
      autoCreate = false;
      start();
      return;
    }
    if (autoJoin) {
      autoJoin = false;
      void request("join", { invite_code: code });
    } else if (gameId && !game?.left) {
      void request("state");
    }
  }

  render();
  window.addEventListener("sterni-live-duel", (event) => openDuel(event.detail));
  window.addEventListener("sterni-session-changed", sync);
  window.addEventListener("hashchange", sync);
  window.addEventListener("pageshow", sync);
  window.addEventListener("online", sync);
  window.addEventListener("storage", sync);
  document.addEventListener("visibilitychange", sync);
  window.setInterval(sync, 2000);
  sync();
})();
