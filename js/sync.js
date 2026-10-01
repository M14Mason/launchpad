// Sync between devices through a secret GitHub Gist on Mason's own account.
// Everything is encrypted in the browser (AES-GCM, key from a passphrase via PBKDF2) before upload,
// so the gist only ever holds ciphertext. The GitHub token and passphrase stay on each device.

const Sync = {
  KEYS: ["bank", "aiCompanies", "practice", "coach", "resumes", "research", "settings", "tracker", "essays", "collegeProfile", "study"],
  FILE: "launchpad-sync.json",
  DESC: "Launchpad sync (encrypted)",
  _timer: null,
  _busy: false,

  cfg() {
    return Store.get("sync", {});
  },
  setCfg(patch) {
    try {
      localStorage.setItem("rb.sync", JSON.stringify({ ...this.cfg(), ...patch }));
    } catch {}
  },
  enabled() {
    const c = this.cfg();
    return !!(c.token && c.pass && c.gistId);
  },
  updatedAt() {
    try {
      return +localStorage.getItem("rb.updatedAt") || 0;
    } catch {
      return 0;
    }
  },

  // Called by Store.set for every save.
  changed(key) {
    if (!this.KEYS.includes(key)) return;
    try {
      localStorage.setItem("rb.updatedAt", String(Date.now()));
    } catch {}
    if (!this.enabled()) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.push().catch((e) => this.status("error", e.message)), 2500);
  },

  snapshot() {
    return { updatedAt: this.updatedAt(), data: Object.fromEntries(this.KEYS.map((k) => [k, Store.get(k, null)])) };
  },
  apply(snap) {
    for (const k of this.KEYS) {
      try {
        if (snap.data[k] == null) localStorage.removeItem("rb." + k);
        else localStorage.setItem("rb." + k, JSON.stringify(snap.data[k]));
      } catch {}
    }
    try {
      localStorage.setItem("rb.updatedAt", String(snap.updatedAt));
    } catch {}
  },

  // ---------- crypto ----------
  b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  unb64(s) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  },
  async key(pass, salt) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  },
  async encrypt(obj, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await this.key(pass, salt), new TextEncoder().encode(JSON.stringify(obj)));
    return { v: 1, salt: this.b64(salt), iv: this.b64(iv), ct: this.b64(ct) };
  },
  async decrypt(env, pass) {
    try {
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: this.unb64(env.iv) }, await this.key(pass, this.unb64(env.salt)), this.unb64(env.ct));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch {
      throw new Error("Wrong sync passphrase — it must match the one on your other device.");
    }
  },

  // ---------- GitHub ----------
  async gh(path, opts = {}, token = this.cfg().token) {
    const res = await fetch("https://api.github.com" + path, {
      ...opts,
      headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (res.status === 401) throw new Error("GitHub rejected the token — check it, or make a new one with the “gist” scope.");
    if (res.status === 403 || res.status === 404) throw new Error("The token can't access gists — it needs the “gist” scope.");
    if (!res.ok) throw new Error(`GitHub error ${res.status}.`);
    return res.status === 204 ? null : res.json();
  },
  async findGist(token) {
    for (let page = 1; page <= 5; page++) {
      const list = await this.gh(`/gists?per_page=100&page=${page}`, {}, token);
      const hit = list.find((g) => g.files && g.files[this.FILE]);
      if (hit) return hit.id;
      if (list.length < 100) break;
    }
    return null;
  },
  async readRemote(c = this.cfg()) {
    const g = await this.gh(`/gists/${c.gistId}`, {}, c.token);
    const f = g.files?.[this.FILE];
    if (!f) return null;
    const raw = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
    return this.decrypt(JSON.parse(raw), c.pass);
  },
  async push() {
    if (!this.enabled()) return;
    const env = await this.encrypt(this.snapshot(), this.cfg().pass);
    await this.gh(`/gists/${this.cfg().gistId}`, { method: "PATCH", body: JSON.stringify({ files: { [this.FILE]: { content: JSON.stringify(env) } } }) });
    this.setCfg({ lastSync: Date.now() });
    this.status("ok");
  },

  // Pull if the cloud copy is newer, otherwise push. Returns true if local data changed.
  async syncNow() {
    if (!this.enabled() || this._busy) return false;
    this._busy = true;
    try {
      const remote = await this.readRemote();
      const local = this.snapshot();
      if (remote && remote.updatedAt > local.updatedAt) {
        this.apply(remote);
        this.setCfg({ lastSync: Date.now() });
        this.status("ok");
        return true;
      }
      if (!remote || local.updatedAt > remote.updatedAt) await this.push();
      else this.setCfg({ lastSync: Date.now() }), this.status("ok");
      return false;
    } finally {
      this._busy = false;
    }
  },

  // First-time connect on this device. `choose` resolves "cloud" | "device" when both sides have data.
  async connect(token, pass, choose) {
    if (pass.length < 8) throw new Error("Use a passphrase of at least 8 characters.");
    let gistId = this.cfg().gistId || (await this.findGist(token));
    let remote = null;
    if (gistId) {
      // Decrypt first — nothing is saved (and nothing can be uploaded) until the passphrase is proven right.
      remote = await this.readRemote({ token, pass, gistId });
      this.setCfg({ token, pass, gistId });
    } else {
      const env = await this.encrypt(this.snapshot(), pass);
      const g = await this.gh("/gists", { method: "POST", body: JSON.stringify({ description: this.DESC, public: false, files: { [this.FILE]: { content: JSON.stringify(env) } } }) }, token);
      gistId = g.id;
      this.setCfg({ token, pass, gistId, lastSync: Date.now() });
      return "created";
    }
    const localHasData = !!(Store.get("bank", null) || Store.get("resumes", null) || getSettings().apiKey);
    if (remote && localHasData) {
      const pick = await choose();
      if (pick === "cloud") this.apply(remote);
      else await this.push();
      this.setCfg({ lastSync: Date.now() });
      return pick;
    }
    if (remote) {
      this.apply(remote);
      this.setCfg({ lastSync: Date.now() });
      return "cloud";
    }
    await this.push();
    return "device";
  },
  disconnect() {
    try {
      localStorage.removeItem("rb.sync");
    } catch {}
  },

  // Pairing link for the QR code: carries the token + gist id (never the passphrase).
  pairLink() {
    const c = this.cfg();
    const code = btoa(JSON.stringify({ t: c.token, g: c.gistId })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + location.pathname + "#pair/" + code;
  },
  readPairCode(code) {
    try {
      const j = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")));
      return j.t && j.g ? j : null;
    } catch {
      return null;
    }
  },

  status(state, msg = "") {
    this.lastStatus = { state, msg, at: Date.now() };
    document.dispatchEvent(new CustomEvent("sync-status", { detail: this.lastStatus }));
  },
};
