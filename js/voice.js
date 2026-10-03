// Voice engine for spoken practice:
//  • Voice    — text-to-speech using the most natural voice the device offers (Edge "Natural", Google, iOS/macOS Premium/Enhanced)
//  • Listener — hands-free speech-to-text (sends after a ~2s pause), auto-restarts, works with any default mic
//  • Mic      — on-device audio measurement (volume, pauses, pitch variation) — audio never leaves the device

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// ElevenLabs: studio-quality human voices. The key is typed into Settings and stays in this browser (like the Claude key).
// Audio plays through one <audio> element that is "unlocked" during a tap, which iPhone requires.
const ELEVEN_DEFAULTS = {
  female: ["EXAVITQu4vr4xnSDxMaL", "cgSgspJ2msm6clMCkdW9"], // Sarah, Jessica
  male: ["nPczCjzI2devNBz1zQrb", "cjVigY5qzO86Huf0OWal", "TX3LPaxmHKxFdv7VOQHJ"], // Brian, Eric, Liam
};
const Eleven = {
  audio: null,
  cache: new Map(),
  _voices: null,
  enabled() {
    return !!getSettings().elevenKey;
  },
  // Call inside a tap/click: plays a silent clip so later audio is allowed to start on its own (iOS/Safari).
  unlock() {
    try {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.playsInline = true;
        this.audio.setAttribute("playsinline", "");
      }
      if (this._unlocked) return;
      const sr = 8000;
      const n = 800;
      const buf = new ArrayBuffer(44 + n * 2);
      const v = new DataView(buf);
      const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, "RIFF");
      v.setUint32(4, 36 + n * 2, true);
      w(8, "WAVEfmt ");
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 1, true);
      v.setUint32(24, sr, true);
      v.setUint32(28, sr * 2, true);
      v.setUint16(32, 2, true);
      v.setUint16(34, 16, true);
      w(36, "data");
      v.setUint32(40, n * 2, true);
      this.audio.src = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
      this.audio.play()?.then?.(() => (this._unlocked = true)).catch?.(() => {});
    } catch {}
  },
  // Errors carry .kind: "key" (stop trying this session), "voice" (retry with a free premade voice), or "temp".
  async request(path, opts = {}) {
    let res;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20000);
    try {
      res = await fetch("https://api.elevenlabs.io" + path, { ...opts, signal: ctl.signal, headers: { "xi-api-key": (getSettings().elevenKey || "").trim(), "Content-Type": "application/json" } });
    } catch (e) {
      throw Object.assign(new Error(e.name === "AbortError" ? "ElevenLabs took too long to answer." : "Couldn't reach ElevenLabs — check your internet connection."), { kind: "temp" });
    } finally {
      clearTimeout(t);
    }
    if (res.ok) return res;
    let code = "";
    let msg = "";
    try {
      const j = await res.json();
      code = String(j.detail?.status || j.detail?.code || "");
      msg = String(j.detail?.message || (typeof j.detail === "string" ? j.detail : "") || "");
    } catch {}
    const all = (code + " " + msg).toLowerCase();
    const err = (text, kind) => Object.assign(new Error(text), { kind, code: code || res.status, status: res.status });
    if (/unusual_activity|unusual activity|abuse/.test(all)) throw err("ElevenLabs blocked free-plan use from this network (“unusual activity”). Turn off any VPN/proxy, or upgrade to a paid plan — until then the device voice is used.", "key");
    if (/quota|credits|character_limit/.test(all)) throw err("ElevenLabs: you're out of voice credits this month.", "key");
    if (/missing_permission|permission/.test(all)) throw err("ElevenLabs: this key is missing a permission. Edit the key at elevenlabs.io and allow Text to Speech (and Voices: Read).", "key");
    if (/invalid_api_key|api key|unauthorized/.test(all) || (res.status === 401 && !code)) throw err("ElevenLabs rejected the key — copy it again from elevenlabs.io → Developers → API Keys.", "key");
    if (/voice|paid_plan|payment_required|library/.test(all) || res.status === 402 || res.status === 404) throw err("That ElevenLabs voice needs a paid plan or wasn't found.", "voice");
    if (res.status === 429) throw err("ElevenLabs is busy right now.", "temp");
    throw err(`ElevenLabs error ${res.status}${code ? " (" + code + ")" : ""}${msg ? ": " + msg : ""}`, res.status === 401 ? "key" : "temp");
  },
  async voices(force) {
    if (this._voices && !force) return this._voices;
    const j = await (await this.request("/v1/voices")).json();
    this._voices = (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category || "", gender: v.labels?.gender || "", accent: v.labels?.accent || "", desc: v.labels?.description || v.labels?.descriptive || v.labels?.use_case || "" }));
    return this._voices;
  },
  async usage() {
    const j = await (await this.request("/v1/user/subscription")).json();
    return { used: j.character_count, limit: j.character_limit, resets: j.next_character_count_reset_unix ? new Date(j.next_character_count_reset_unix * 1000) : null, tier: j.tier };
  },
  // The voice chosen in Settings, or (Auto) an American voice that fits the character's gender.
  async voiceFor(gender, seed = "") {
    const want = getSettings().elevenVoice;
    if (want && want !== "auto") return want;
    const g = /^m/i.test(gender || "") ? "male" : "female";
    try {
      // Only ElevenLabs' built-in ("premade") voices work on the free plan through the API.
      const list = (await this.voices()).filter((v) => v.gender === g && (!v.category || v.category === "premade"));
      const us = list.filter((v) => /americ/i.test(v.accent));
      const pool = (us.length ? us : list).map((v) => v.id);
      if (pool.length) return pool[Math.abs(hash(seed)) % pool.length];
    } catch {}
    return ELEVEN_DEFAULTS[g][Math.abs(hash(seed)) % ELEVEN_DEFAULTS[g].length];
  },
  async audioFor(text, voiceId) {
    const k = voiceId + "|" + text;
    if (this.cache.has(k)) return this.cache.get(k);
    const s = getSettings();
    const res = await this.request(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      body: JSON.stringify({
        text,
        model_id: s.elevenModel || "eleven_flash_v2_5",
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: Math.min(1.2, Math.max(0.7, s.voiceRate || 1)) },
      }),
    });
    const url = URL.createObjectURL(await res.blob());
    this.cache.set(k, url);
    if (this.cache.size > 40) {
      const [old] = this.cache.keys();
      URL.revokeObjectURL(this.cache.get(old));
      this.cache.delete(old);
    }
    return url;
  },
  async play(text, { gender, seed, onStart, isCurrent, voiceId, onWord }) {
    if (this.broken) throw Object.assign(new Error(this.broken), { kind: "key" });
    let url;
    try {
      const chosen = getSettings().elevenVoice;
      url = await this.audioFor(text, chosen && chosen !== "auto" ? chosen : voiceId || (await this.voiceFor(gender, seed)));
    } catch (e) {
      if (e.kind === "key") this.broken = e.message; // don't keep failing (and waiting) on every line
      if (e.kind !== "voice") throw e;
      // The chosen voice isn't available on this plan: fall back to a built-in voice.
      const g = /^m/i.test(gender || "") ? "male" : "female";
      url = await this.audioFor(text, ELEVEN_DEFAULTS[g][0]);
    }
    if (!isCurrent()) return;
    if (!this.audio) this.unlock();
    const a = this.audio;
    await new Promise((res, rej) => {
      let done = false;
      const started = Date.now();
      let finish = (err) => {
        if (done) return;
        done = true;
        clearInterval(poll);
        a.onended = a.onerror = null;
        err ? rej(err) : res();
      };
      // Ends on its own, when cancelled, or if the browser never reports the end.
      const poll = setInterval(() => {
        if (!isCurrent()) {
          a.pause();
          finish();
        } else if (a.duration && isFinite(a.duration) && Date.now() - started > a.duration * 1000 + 4000) finish();
        else if (Date.now() - started > 120000) finish();
      }, 200);
      // No word timings from an mp3: pulse at a natural speaking rhythm while it plays.
      const beat = onWord && setInterval(() => !a.paused && onWord(0.6 + Math.random() * 0.4), 230);
      const done0 = finish;
      finish = (err) => (clearInterval(beat), done0(err));
      a.onended = () => finish();
      a.onerror = () => finish(new Error("Couldn't play the ElevenLabs audio."));
      a.src = url;
      onStart?.();
      a.play()?.catch?.((e) => finish(new Error(e.name === "NotAllowedError" ? "Your phone blocked the audio — tap the screen once." : "Couldn't play the ElevenLabs audio.")));
    });
  },
  stop() {
    try {
      this.audio?.pause();
    } catch {}
  },
};
function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

const Voice = {
  supported: "speechSynthesis" in window,
  _ready: null,
  _token: 0,
  ready() {
    if (!this.supported) return Promise.resolve([]);
    return (this._ready ||= new Promise((res) => {
      const got = () => speechSynthesis.getVoices();
      if (got().length) return res(got());
      const t = setTimeout(() => res(got()), 2000);
      speechSynthesis.addEventListener?.("voiceschanged", () => {
        clearTimeout(t);
        res(got());
      });
    }));
  },
  rank(v) {
    const n = v.name;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 60; // Microsoft Edge online neural voices
    if (/premium/i.test(n)) s += 55; // Apple premium voices
    if (/enhanced/i.test(n)) s += 45; // Apple enhanced voices
    if (/^Google/i.test(n)) s += 35; // Chrome's network voices
    if (/online/i.test(n)) s += 8;
    if (/(Aria|Jenny|Guy|Davis|Andrew|Emma|Brian|Ava|Samantha|Allison|Evan|Zoe|Nathan|Joelle|Noelle|Tom|Susan|Serena|Daniel|Karen|Moira|Tessa|Michelle|Christopher|Eric|Steffan|Roger)/.test(n)) s += 8;
    if (/en[-_]US/i.test(v.lang)) s += 6;
    if (!v.localService) s += 4;
    if (/(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Whisper|Zarvox|Trinoids|Organ|Junior|Ralph|Kathy|Princess|Superstar|Jester|Hysterical|Deranged|Good News|Grandma|Grandpa|Rocko|Shelley|Sandy|Flo|Eddy|Reed|Fred)/.test(n)) s -= 80; // novelty voices
    if (/espeak/i.test(n)) s -= 100;
    return s;
  },
  quality(v) {
    const r = this.rank(v);
    return r >= 45 ? "Natural" : r >= 30 ? "High quality" : "Standard";
  },
  async list() {
    const all = (await this.ready()).filter((v) => /^en/i.test(v.lang));
    return all.sort((a, b) => this.rank(b) - this.rank(a));
  },
  async pick(gender) {
    const list = await this.list();
    const want = getSettings().voiceURI;
    const mine = list.find((v) => v.voiceURI === want);
    if (!gender) return mine || list[0] || null;
    // Characters get a voice that matches them; your chosen voice is used when it fits.
    const g = /^m/i.test(gender) ? "male" : "female";
    if (mine && this.genderOf(mine) === g) return mine;
    return list.find((v) => this.genderOf(v) === g) || mine || list[0] || null;
  },
  genderOf(v) {
    const n = v.name;
    if (/female|woman|samantha|ava|zoe|allison|susan|victoria|karen|moira|tessa|aria|jenny|emma|michelle|serena|joelle|noelle|nicky|kathy|fiona|veena|ellie|libby|sonia|natasha|clara|catherine|heather|zira|hazel|linda|sara|nancy|jane|elizabeth|ana\b|google us english$/i.test(n)) return "female";
    if (/\bmale\b|man\b|daniel|alex\b|tom\b|fred|aaron|evan|nathan|guy|davis|andrew|brian|christopher|eric|roger|steffan|david|mark|george|ryan|william|liam|james|oliver|arthur|reed|rishi|gordon|lee\b|jacob|tony|richard|thomas/i.test(n)) return "male";
    return "";
  },
  // Call inside a tap: lets speech and audio start later without another tap (iOS/Safari).
  // Desktop browsers don't need this; on iPhone a silent utterance is spoken once and left to finish
  // (cancelling it right away can leave Safari's speech engine silent until reload).
  unlock() {
    Eleven.unlock();
    try {
      if (this._unlocked || !this.supported || !IS_IOS) return;
      const u = new SpeechSynthesisUtterance(".");
      u.volume = 0;
      u.rate = 2;
      speechSynthesis.speak(u);
      this._unlocked = true;
      this._unlockAt = Date.now();
    } catch {}
  },
  stop() {
    Eleven.stop();
    // Only cancel speech we started — never the iPhone unlock utterance.
    if (this.supported && this._talking && (speechSynthesis.speaking || speechSynthesis.pending)) {
      speechSynthesis.cancel();
      this._cancelAt = Date.now();
    }
    this._talking = false;
  },
  // ElevenLabs when a key is set, otherwise the best device voice. Resolves when finished or cancelled.
  // persona: { gender, eleven, pitch, rate } (a practice character). onWord(strength) fires as words are spoken.
  async speak(text, { onStart, gender, seed, persona, onWord } = {}) {
    gender = persona?.gender || gender;
    if (!text) return;
    this.stop();
    const tok = ++this._token;
    const isCurrent = () => tok === this._token;
    if (Eleven.enabled()) {
      try {
        return await Eleven.play(String(text), { gender, seed, onStart, isCurrent, voiceId: persona?.eleven, onWord });
      } catch (e) {
        if (!isCurrent()) return;
        this.lastError = e.message;
        if (!this._warned) toast(e.message + " Using the device voice instead.");
        this._warned = true;
      }
    }
    // Let the iPhone unlock utterance finish instead of cancelling it.
    if (this._unlockAt && Date.now() - this._unlockAt < 600) await new Promise((r) => setTimeout(r, 600 - (Date.now() - this._unlockAt)));
    if (!isCurrent()) return;
    // Chrome sometimes drops an utterance spoken right after cancel(), or gets stuck "speaking" with no sound.
    if (speechSynthesis.speaking && !this._unlockAt) {
      speechSynthesis.cancel();
      this._cancelAt = Date.now();
    }
    if (this._cancelAt && Date.now() - this._cancelAt < 150) await new Promise((r) => setTimeout(r, 150));
    if (!isCurrent()) return;
    this._talking = true;
    if (!this.supported) return;
    const voice = await this.pick(gender);
    // Sentence by sentence: sounds more natural and avoids Chrome's long-utterance cutoff.
    const parts = String(text)
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
      .filter((s) => s.trim());
    onStart?.();
    for (const part of parts) {
      if (!isCurrent()) break;
      await new Promise((res) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.rate = Math.min(1.6, (getSettings().voiceRate || 1) * (persona?.rate || 1));
        u.pitch = persona?.pitch || 1;
        if (onWord) u.onboundary = (e) => e.name !== "sentence" && onWord(0.7 + Math.random() * 0.3);
        let began = false;
        let quiet = 0;
        const t0 = Date.now();
        const finish = () => {
          clearInterval(poll);
          res();
        };
        u.onstart = () => (began = true);
        u.onend = u.onerror = finish;
        try {
          speechSynthesis.resume(); // iOS can leave the queue paused
        } catch {}
        speechSynthesis.speak(u);
        // iOS/Safari sometimes never fires "end": watch speechSynthesis.speaking instead of guessing a timeout.
        const poll = setInterval(() => {
          if (!isCurrent()) return finish();
          if (speechSynthesis.speaking) began = true;
          else if (began || Date.now() - t0 > 2500) quiet++;
          if (quiet >= 2 || Date.now() - t0 > 8000 + part.length * 120) finish();
        }, 150);
      });
    }
  },
  cancel() {
    this._token++;
    this.stop();
  },
};

// Speech-to-text for one turn. Sends after `silenceMs` of quiet (or only when you tap, with autoSend: false).
// Keeps listening through normal pauses on every device. If the browser ends the session early
// (iPhone does this), it restarts silently when allowed; otherwise it keeps your words and asks for a tap.
// Safari can re-send earlier results as one growing transcript, so results are merged without repeats.
function mergeTranscripts(parts) {
  let acc = "";
  for (const raw of parts) {
    const t = raw.trim();
    if (!t) continue;
    const a = acc.toLowerCase();
    const b = t.toLowerCase();
    if (!acc || b.startsWith(a)) acc = t; // growing version of the same speech
    else if (a.endsWith(b) || (b.length > 12 && a.includes(b))) continue; // already have it
    else acc += " " + t;
  }
  return acc;
}
// How long to wait after you stop talking before sending (Settings / practice setup).
function sendDelayMs() {
  const v = getSettings().sendAfter;
  return v === "tap" ? Infinity : (+v || 3) * 1000;
}
class Listener {
  constructor({ onText, onTurn, onState, silenceMs = 3000, initial = "", minWords = 1 }) {
    Object.assign(this, { onText, onTurn, onState, silenceMs, initial, minWords });
    this.active = false;
  }
  get supported() {
    return !!SR;
  }
  start() {
    if (!SR) return this.onState?.("unsupported");
    this.active = true;
    this.carried = this.initial || "";
    this.final = this.carried;
    this.interim = "";
    this.heardAt = this.firstAt = this.restarts = 0;
    this.lastText = this.carried;
    this.begin();
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.active || !this.heardAt || !isFinite(this.silenceMs)) return;
      if (performance.now() - this.heardAt > this.silenceMs && this.text().split(/\s+/).filter(Boolean).length >= this.minWords) this.flush();
    }, 200);
  }
  // One recognition session (a turn may use several if the browser stops early).
  begin() {
    const rec = new SR();
    this.rec = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      if (rec !== this.rec) return;
      const fins = [];
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fins.push(r[0].transcript);
        else interim = mergeTranscripts([interim, r[0].transcript]);
      }
      const fin = mergeTranscripts(fins);
      this.final = mergeTranscripts([this.carried, fin]);
      this.interim = interim.trim();
      const text = this.text();
      // Only real new words count as "still talking" (Safari re-sends the same results).
      if (text !== this.lastText) {
        this.lastText = text;
        const now = performance.now();
        if (!this.firstAt) this.firstAt = now;
        this.heardAt = now;
        this.onText?.(text);
      }
    };
    rec.onerror = (e) => {
      if (rec !== this.rec) return;
      if (e.error === "no-speech" || e.error === "aborted") return;
      this.lastError = e.error;
      // Mid-turn errors (iPhone "not-allowed" on restart, etc.): keep the words and wait for a tap.
      if (this.active && (IS_IOS || this.restarts > 0) && ["not-allowed", "service-not-allowed"].includes(e.error)) return this.pause(e.error);
      this.onState?.("error", e.error);
    };
    rec.onend = () => {
      if (rec !== this.rec || !this.active) return;
      // The browser stopped on its own. Keep the words so far and start a new session.
      this.carried = mergeTranscripts([this.final, this.interim]);
      this.final = this.carried;
      this.interim = "";
      if (++this.restarts > 60) return this.pause();
      try {
        this.begin();
      } catch {
        this.pause();
      }
    };
    // "listening" fires when the mic is actually recording (audiostart), so the first words aren't lost.
    if (this.restarts === 0) {
      let told = false;
      const ready = () => {
        if (told || rec !== this.rec || !this.active) return;
        told = true;
        this.readyAt = performance.now();
        this.onState?.("listening");
      };
      rec.onaudiostart = ready;
      setTimeout(ready, 1500); // some browsers never fire audiostart
    }
    try {
      rec.start();
    } catch {
      this.pause();
    }
  }
  // Stop listening but keep what was said; the next tap continues (initial = text()).
  pause(err) {
    this.active = false;
    clearInterval(this.timer);
    try {
      this.rec?.abort();
    } catch {}
    this.onState?.("needs-tap", err, this.text());
  }
  text() {
    return `${this.final} ${this.interim}`.replace(/\s+/g, " ").trim();
  }
  flush() {
    const text = this.text();
    const duration = this.firstAt ? (this.heardAt - this.firstAt) / 1000 : 0;
    this.stop();
    if (text) this.onTurn?.(text, duration);
  }
  stop() {
    this.active = false;
    clearInterval(this.timer);
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.abort();
    } catch {}
    this.onState?.("idle");
  }
}

// On-device audio measurement for tone feedback (pace comes from the transcript; this adds volume, pauses, pitch).
const Mic = {
  stream: null,
  ctx: null,
  analyser: null,
  buf: null,
  turn: null,
  level: 0,
  async devices() {
    try {
      return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
    } catch {
      return [];
    }
  },
  async open(deviceId = getSettings().micId) {
    this.close();
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
    if (deviceId) audio.deviceId = { exact: deviceId };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (e) {
      if (deviceId) return this.open(""); // chosen mic unplugged — fall back to default
      throw new Error(e.name === "NotAllowedError" ? "Microphone permission was blocked — allow it in your browser's site settings." : "No microphone found.");
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
    this.buf = new Float32Array(1024);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.sample(), 100);
    return true;
  },
  close() {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close?.().catch?.(() => {});
    this.stream = this.ctx = this.analyser = null;
    this.level = 0;
  },
  pitch(buf, sr, rms) {
    const minLag = Math.floor(sr / 400);
    const maxLag = Math.min(Math.floor(sr / 75), buf.length - 1);
    let best = 0;
    let bestC = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0;
      for (let i = 0; i < buf.length - lag; i++) c += buf[i] * buf[i + lag];
      c /= buf.length - lag;
      if (c > bestC) {
        bestC = c;
        best = lag;
      }
    }
    return best && bestC / (rms * rms) > 0.3 ? sr / best : 0;
  },
  sample() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const x of this.buf) sum += x * x;
    const rms = Math.sqrt(sum / this.buf.length);
    this.level = Math.min(1, rms * 8);
    const t = this.turn;
    if (!t) return;
    const voiced = rms > 0.012;
    if (voiced) {
      if (t.silence >= 6 && t.voicedFrames > 0) {
        t.pauses++;
        t.longestPause = Math.max(t.longestPause, t.silence / 10);
      }
      t.silence = 0;
      t.voicedFrames++;
      t.rms.push(rms);
      const f = this.pitch(this.buf, this.ctx.sampleRate, rms);
      if (f) t.pitches.push(f);
    } else if (t.voicedFrames > 0) t.silence++;
  },
  startTurn() {
    this.turn = { voicedFrames: 0, silence: 0, pauses: 0, longestPause: 0, rms: [], pitches: [] };
  },
  endTurn() {
    const t = this.turn;
    this.turn = null;
    if (!t || !t.voicedFrames) return null;
    const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    const sd = (a) => {
      const m = mean(a);
      return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
    };
    const semis = t.pitches.map((f) => 12 * Math.log2(f / 100));
    return {
      voicedSec: t.voicedFrames / 10,
      pauses: t.pauses,
      longestPause: Math.round(t.longestPause * 10) / 10,
      volumeCv: Math.round((sd(t.rms) / (mean(t.rms) || 1)) * 100) / 100,
      pitchHz: Math.round(mean(t.pitches)) || 0,
      pitchVarSemis: Math.round(sd(semis) * 10) / 10 || 0,
    };
  },
};

// Transcript-based speech metrics (work on every device, even when audio measurement isn't available).
// "like" only counts as a filler in filler position (", like," / "like,") — not "I'd like to".
const FILLERS = /\b(um+|uh+|erm|you know|basically|kind of|sort of|i mean|literally|so yeah)\b|,\s*like\b|\blike,/gi;
const HEDGES = /\b(i think maybe|i guess|probably|kind of|sort of|i'm not sure|just wanted|maybe)\b/gi;
function textMetrics(turns) {
  const mine = turns.filter((t) => t.from === "me");
  const words = mine.reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0);
  const speakSec = mine.reduce((n, t) => n + (t.duration || 0), 0);
  const all = mine.map((t) => t.text).join(" ");
  const theirs = turns.filter((t) => t.from === "them").reduce((n, t) => n + t.text.split(/\s+/).length, 0);
  const fillers = (all.match(FILLERS) || []).map((x) => x.toLowerCase());
  const topFillers = Object.entries(fillers.reduce((m, f) => ((m[f] = (m[f] || 0) + 1), m), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const audio = mine.map((t) => t.audio).filter(Boolean);
  const avg = (k) => (audio.length ? Math.round((audio.reduce((n, a) => n + a[k], 0) / audio.length) * 10) / 10 : null);
  return {
    turns: mine.length,
    words,
    wpm: speakSec > 5 ? Math.round(words / (speakSec / 60)) : null,
    fillers: fillers.length,
    fillersPer100: words ? Math.round((fillers.length / words) * 1000) / 10 : 0,
    topFillers,
    hedges: (all.match(HEDGES) || []).length,
    questionsAsked: (all.match(/\?|\b(what|how|why|when|which|could you|would you|do you|are you|can you|tell me)\b[^.?!]{3,}/gi) || []).length,
    avgTurnWords: mine.length ? Math.round(words / mine.length) : 0,
    talkShare: words + theirs ? Math.round((words / (words + theirs)) * 100) : 0,
    pitchVarSemis: avg("pitchVarSemis"),
    volumeCv: avg("volumeCv"),
    pauses: audio.reduce((n, a) => n + a.pauses, 0),
    longestPause: audio.length ? Math.max(...audio.map((a) => a.longestPause)) : null,
    audioMeasured: audio.length > 0,
  };
}
