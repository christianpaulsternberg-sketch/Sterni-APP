window.STERNI_AUTH = (() => {
  const ACCOUNTS_KEY = "sterni_accounts_v1";
  const SESSION_KEY = "sterni_session_v1";
  const INVITES_KEY = "sterni_invites_v1";
  const TREFF_NAME_KEY = "sterni_treff_name_v1";

  // Standard-Passwort für vorinstallierte Demo-Mitglieder: "petriheil"
  const DEFAULT_PASSWORD_PLAIN = "petriheil";

  async function hashPassword(password) {
    const str = String(password || "");
    if (window.crypto?.subtle && window.TextEncoder) {
      try {
        const buf = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        // Fallback below
      }
    }
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "fnv-" + (h >>> 0).toString(16);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  let defaultHashPromise = null;
  function getDefaultHash() {
    if (!defaultHashPromise) {
      defaultHashPromise = hashPassword(DEFAULT_PASSWORD_PLAIN);
    }
    return defaultHashPromise;
  }

  async function ensureInitialized() {
    let accounts = loadJson(ACCOUNTS_KEY, []);
    if (!Array.isArray(accounts)) accounts = [];
    const cleanedAccounts = accounts.filter(
      (a) => !( /^mbr-[1-6]$/.test(String(a?.id || "")) && String(a?.email || "").endsWith("@sterni-treff.de") )
    );
    if (cleanedAccounts.length !== accounts.length) {
      accounts = cleanedAccounts;
      saveJson(ACCOUNTS_KEY, accounts);
    }

    let invites = loadJson(INVITES_KEY, []);
    if (!Array.isArray(invites)) invites = [];
    const cleanedInvites = invites.filter((i) => !String(i?.id || "").startsWith("inv-demo-"));
    if (cleanedInvites.length !== invites.length) {
      invites = cleanedInvites;
      saveJson(INVITES_KEY, invites);
    }
    return accounts;
  }

  function getAccounts() {
    return loadJson(ACCOUNTS_KEY, []);
  }

  function getCurrentUser() {
    const session = loadJson(SESSION_KEY, null);
    if (!session?.userId) return null;
    const accounts = getAccounts();
    return accounts.find((a) => a.id === session.userId) || null;
  }

  function syncLegacyMemberState(user) {
    if (user?.name) {
      localStorage.setItem(TREFF_NAME_KEY, user.name);
      window.STERNI_QUIZ?.addMember?.(user.name);
    }
  }

  async function register({ name, email, password, role }) {
    await ensureInitialized();
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPw = String(password || "");

    if (cleanName.length < 2) return { ok: false, error: "Bitte einen Namen mit mindestens 2 Zeichen eingeben." };
    if (!cleanEmail.includes("@")) return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
    if (cleanPw.length < 4) return { ok: false, error: "Das Passwort muss mindestens 4 Zeichen lang sein." };

    const accounts = getAccounts();
    if (accounts.some((a) => a.name.toLowerCase() === cleanName.toLowerCase())) {
      return { ok: false, error: `Der Mitgliedsname „${cleanName}“ ist bereits vergeben.` };
    }
    if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." };
    }

    const passwordHash = await hashPassword(cleanPw);
    const newUser = {
      id: "mbr-" + Date.now(),
      name: cleanName,
      email: cleanEmail,
      role: (role || "Mitglied").trim(),
      skill: 0.72,
      passwordHash,
      appInstalled: true,
      status: "Online · Bereit fürs Duell",
      statusMessage: "Neu im Mitgliederbereich – bereit fürs erste Duell!",
      createdAt: new Date().toISOString()
    };

    accounts.unshift(newUser);
    saveJson(ACCOUNTS_KEY, accounts);
    saveJson(SESSION_KEY, { userId: newUser.id, loggedInAt: new Date().toISOString() });
    syncLegacyMemberState(newUser);
    return { ok: true, user: newUser };
  }

  async function login(identifier, password) {
    await ensureInitialized();
    const ident = (identifier || "").trim().toLowerCase();
    const pw = String(password || "");
    if (!ident || !pw) return { ok: false, error: "Bitte Name/E-Mail und Passwort eingeben." };

    const accounts = getAccounts();
    const user = accounts.find(
      (a) => a.name.toLowerCase() === ident || a.email.toLowerCase() === ident
    );
    if (!user) return { ok: false, error: "Kein Mitglied mit diesem Namen oder dieser E-Mail gefunden." };

    const hash = await hashPassword(pw);
    if (user.passwordHash !== hash) {
      return { ok: false, error: "Passwort ist nicht korrekt." };
    }

    saveJson(SESSION_KEY, { userId: user.id, loggedInAt: new Date().toISOString() });
    syncLegacyMemberState(user);
    return { ok: true, user };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function updateProfile({ status, statusMessage, email }) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: "Nicht angemeldet." };
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx === -1) return { ok: false, error: "Konto nicht gefunden." };

    if (typeof status === "string" && status.trim()) accounts[idx].status = status.trim();
    if (typeof statusMessage === "string") accounts[idx].statusMessage = statusMessage.trim();
    if (typeof email === "string" && email.includes("@")) accounts[idx].email = email.trim().toLowerCase();

    saveJson(ACCOUNTS_KEY, accounts);
    return { ok: true, user: accounts[idx] };
  }

  async function changePassword(oldPw, newPw) {
    const user = getCurrentUser();
    if (!user) return { ok: false, error: "Nicht angemeldet." };
    if (String(newPw || "").length < 4) {
      return { ok: false, error: "Neues Passwort muss mindestens 4 Zeichen lang sein." };
    }
    const oldHash = await hashPassword(oldPw);
    if (oldHash !== user.passwordHash) {
      return { ok: false, error: "Aktuelles Passwort stimmt nicht." };
    }
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === user.id);
    if (idx === -1) return { ok: false, error: "Konto nicht gefunden." };
    accounts[idx].passwordHash = await hashPassword(newPw);
    saveJson(ACCOUNTS_KEY, accounts);
    return { ok: true };
  }

  async function addInvitedMember({ name, email }) {
    await ensureInitialized();
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanName) return { ok: false, error: "Bitte einen Namen angeben." };

    const accounts = getAccounts();
    const existing = accounts.find(
      (a) => a.name.toLowerCase() === cleanName.toLowerCase() || (cleanEmail && a.email.toLowerCase() === cleanEmail)
    );
    if (existing) return { ok: true, user: existing, existed: true };

    const defaultHash = await getDefaultHash();
    const created = {
      id: "mbr-" + Date.now(),
      name: cleanName,
      email: cleanEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@sterni-treff.de`,
      role: "Eingeladenes Mitglied",
      skill: 0.7,
      passwordHash: defaultHash,
      appInstalled: false,
      status: "Per E-Mail eingeladen",
      statusMessage: "Einladung gesendet – wartet auf ersten Login.",
      createdAt: new Date().toISOString()
    };
    accounts.push(created);
    saveJson(ACCOUNTS_KEY, accounts);
    window.STERNI_QUIZ?.addMember?.(created.name);
    return { ok: true, user: created, existed: false };
  }

  function getInvites() {
    return loadJson(INVITES_KEY, []);
  }

  function sendInvite({ from, to, category, message, via, duelCode, fromScore }) {
    const invites = getInvites();
    const invite = {
      id: "inv-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      from: from || getCurrentUser()?.name || "Petri-Freund",
      to: to || "Alle Mitglieder",
      category: category || "all",
      via: via || "status",
      message: (message || "").trim() || "Komm ins Wissens-Duell!",
      status: "open",
      duelCode: duelCode || null,
      fromScore: typeof fromScore === "number" ? fromScore : null,
      createdAt: new Date().toISOString()
    };
    invites.unshift(invite);
    saveJson(INVITES_KEY, invites);
    return invite;
  }

  function updateInviteStatus(id, status, resultNote) {
    const invites = getInvites();
    const idx = invites.findIndex((i) => i.id === id);
    if (idx === -1) return;
    invites[idx].status = status;
    if (resultNote) invites[idx].resultNote = resultNote;
    saveJson(INVITES_KEY, invites);
  }

  function getOpenInviteCount(userName) {
    const invites = getInvites();
    return invites.filter(
      (i) => i.status === "open" && (!userName || i.to === userName || i.to === "Alle Mitglieder")
    ).length;
  }

  function buildMailtoUrl({ toEmail, subject, body }) {
    const target = toEmail ? encodeURIComponent(toEmail) : "";
    return `mailto:${target}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return {
    ensureInitialized,
    getAccounts,
    getCurrentUser,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    addInvitedMember,
    getInvites,
    sendInvite,
    updateInviteStatus,
    getOpenInviteCount,
    buildMailtoUrl,
    DEFAULT_PASSWORD_PLAIN
  };
})();
