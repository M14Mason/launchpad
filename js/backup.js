// Data safety: automatic restore points on every app update, full backup files, and restore.
// All app data lives in this browser under "rb.*" keys; nothing here ever deletes it without a restore the user asked for.

const APP_VERSION = "2026.10.15";

const Backup = {
  dataKeys() {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith("rb.") && !k.startsWith("rb.__"));
    } catch {
      return [];
    }
  },
  collect({ includeSync = false } = {}) {
    const out = {};
    for (const k of this.dataKeys()) if (includeSync || k !== "rb.sync") out[k] = localStorage.getItem(k);
    return out;
  },
  snaps() {
    try {
      return JSON.parse(localStorage.getItem("rb.__snaps") || "[]");
    } catch {
      return [];
    }
  },
  // Keep the 3 most recent restore points inside the browser.
  snapshot(reason) {
    const data = this.collect({ includeSync: true });
    if (!Object.keys(data).length) return false;
    const list = [{ at: Date.now(), ver: APP_VERSION, reason, data }, ...this.snaps()].slice(0, 3);
    try {
      localStorage.setItem("rb.__snaps", JSON.stringify(list));
      return true;
    } catch {
      // Storage full: keep just the newest restore point.
      try {
        localStorage.setItem("rb.__snaps", JSON.stringify(list.slice(0, 1)));
        return true;
      } catch {
        return false;
      }
    }
  },
  // Runs before anything else on every load: a new app version gets a restore point first.
  onBoot() {
    try {
      if (localStorage.getItem("rb.__ver") !== APP_VERSION) {
        if (this.dataKeys().length) this.snapshot("Automatic — before update to " + APP_VERSION);
        localStorage.setItem("rb.__ver", APP_VERSION);
      }
    } catch {}
  },
  writeAll(data) {
    for (const [k, v] of Object.entries(data)) if (k.startsWith("rb.") && !k.startsWith("rb.__") && typeof v === "string") localStorage.setItem(k, v);
    // Mark as newest so sync uploads the restored data instead of pulling older cloud data over it.
    localStorage.setItem("rb.updatedAt", String(Date.now()));
  },
  restoreSnap(i) {
    const s = this.snaps()[i];
    if (!s) throw new Error("That restore point no longer exists.");
    this.snapshot("Automatic — before restoring an older restore point");
    for (const k of this.dataKeys()) if (!(k in s.data) && k !== "rb.sync") localStorage.removeItem(k);
    this.writeAll(s.data);
  },
  download() {
    const file = { format: "launchpad-full-backup", version: APP_VERSION, at: new Date().toISOString(), data: this.collect() };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    a.download = `launchpad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    try {
      localStorage.setItem("rb.__lastDownload", String(Date.now()));
    } catch {}
  },
  async restoreFile(file) {
    let j;
    try {
      j = JSON.parse(await file.text());
    } catch {
      throw new Error("That file isn't a Launchpad backup.");
    }
    this.snapshot("Automatic — before restoring from a file");
    if (j.format === "launchpad-full-backup" && j.data) return this.writeAll(j.data);
    // Older "Export backup" files: { bank, aiCompanies, practice, coach, resumes, research, phone }
    const legacy = {};
    for (const k of ["bank", "aiCompanies", "practice", "coach", "resumes", "research", "tracker", "essays"]) if (j[k] != null) legacy["rb." + k] = JSON.stringify(j[k]);
    if (!Object.keys(legacy).length && !j.phone) throw new Error("That file isn't a Launchpad backup.");
    if (j.phone) legacy["rb.settings"] = JSON.stringify({ ...getSettings(), phone: j.phone });
    this.writeAll(legacy);
  },
  lastDownload() {
    try {
      return +localStorage.getItem("rb.__lastDownload") || 0;
    } catch {
      return 0;
    }
  },
};

// Take the restore point immediately, before any other script can touch saved data.
Backup.onBoot();
