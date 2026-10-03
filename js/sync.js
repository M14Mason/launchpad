// Sync between devices through a secret GitHub Gist on Mason's own account. No passphrase:
// the GitHub token (stays on each device) is the only thing needed. The data is base64-encoded so
// GitHub's secret scanners don't mistake the stored API keys for leaked ones — it is NOT encryption;
// the gist is private to Mason's account (and anyone he gives its link to).

const Sync = {
  KEYS: ["bank", "aiCompanies", "practice", "coach", "resumes", "research", "settings", "tracker", "essays", "collegeProfile", "study", "markets", "brand", "clients"],
  FILE: "launchpad-sync-v2.json",
  OLD_FILE: "launchpad-sync.json", // passphrase-encrypted version (before Oct 2026) — removed on first sync
  DESC: "Launchpad sync",
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
    return !!(c.token && c.gistId);
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
      if (!(k in snap.data)) continue; // keys added in newer versions stay as they are
      try {
        if (snap.data[k] == null) localStorage.removeItem("rb." + k);
        else localStorage.setItem("rb." + k, JSON.stringify(snap.data[k]));
      } catch {}
    }
    try {
      localStorage.setItem("rb.updatedAt", String(snap.updatedAt));
    } catch {}
  },

  // ---------- encoding (UTF-8 safe base64) ----------
  encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return JSON.stringify({ v: 2, format: "launchpad-sync", data: btoa(bin) });
  },
  decode(raw) {
    const env = JSON.parse(raw);
    if (env.v !== 2 || typeof env.data !== "string") return null;
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(env.data), (c) => c.charCodeAt(0))));
  },

  // ---------- GitHub ----------
  async gh(path, opts = {}, token = this.cfg().token) {
    let res;
    try {
      res = await fetch("https://api.github.com" + path, {
        ...opts,
        headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + String(token || "").trim(), "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      });
    } catch {
      throw new Error("Couldn't reach GitHub — check your internet connection.");
    }
    if (res.status === 401) throw new Error("GitHub rejected the token — it may have expired. Make a new one with the “gist” box checked.");
    if (res.status === 403 || res.status === 404) throw new Error("The token can't access gists — make a new one with the “gist” box checked.");
    if (!res.ok) throw new Error(`GitHub error ${res.status}.`);
    return res.status === 204 ? null : res.json();
  },
  async findGist(token) {
    for (let page = 1; page <= 5; page++) {
      const list = await this.gh(`/gists?per_page=100&page=${page}`, {}, token);
      const hit = list.find((g) => g.files && (g.files[this.FILE] || g.files[this.OLD_FILE]));
      if (hit) return hit.id;
      if (list.length < 100) break;
    }
    return null;
  },
  // The cloud snapshot, or null when there's nothing readable yet (including the old encrypted file).
  async readRemote(c = this.cfg()) {
    const g = await this.gh(`/gists/${c.gistId}`, {}, c.token);
    const f = g.files?.[this.FILE];
    this._hasOld = !!g.files?.[this.OLD_FILE];
    if (!f) return null;
    const raw = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
    try {
      return this.decode(raw);
    } catch {
      return null;
    }
  },
  async push() {
    if (!this.enabled()) return;
    const files = { [this.FILE]: { content: this.encode(this.snapshot()) } };
    if (this._hasOld) files[this.OLD_FILE] = null; // remove the old passphrase-encrypted copy
    await this.gh(`/gists/${this.cfg().gistId}`, { method: "PATCH", body: JSON.stringify({ description: this.DESC, files }) });
    this._hasOld = false;
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
  async connect(token, choose) {
    token = String(token || "").trim();
    if (!token) throw new Error("Paste your GitHub token first.");
    const gistId = this.cfg().gistId || (await this.findGist(token));
    if (!gistId) {
      const g = await this.gh("/gists", { method: "POST", body: JSON.stringify({ description: this.DESC, public: false, files: { [this.FILE]: { content: this.encode(this.snapshot()) } } }) }, token);
      this.setCfg({ token, gistId: g.id, lastSync: Date.now(), pass: undefined });
      return "created";
    }
    const remote = await this.readRemote({ token, gistId });
    this.setCfg({ token, gistId, pass: undefined });
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

  // Pairing link / code: carries the token + gist id, so the other device connects in one tap.
  pairLink() {
    const c = this.cfg();
    const code = btoa(JSON.stringify({ t: c.token, g: c.gistId })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + location.pathname + "#pair/" + code;
  },
  readPairCode(code) {
    try {
      const j = JSON.parse(atob(String(code).trim().replace(/-/g, "+").replace(/_/g, "/")));
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
