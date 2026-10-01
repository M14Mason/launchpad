// Voice engine for spoken practice:
//  • Voice    — text-to-speech using the most natural voice the device offers (Edge "Natural", Google, iOS/macOS Premium/Enhanced)
//  • Listener — hands-free speech-to-text (sends after a ~2s pause), auto-restarts, works with any default mic
//  • Mic      — on-device audio measurement (volume, pauses, pitch variation) — audio never leaves the device

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const Voice = {
  supported: "speechSynthesis" in window,
  _ready: null,
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
  async pick() {
    const list = await this.list();
    const want = getSettings().voiceURI;
    return list.find((v) => v.voiceURI === want) || list[0] || null;
  },
  stop() {
    if (this.supported) speechSynthesis.cancel();
  },
  // Speak sentence by sentence (sounds more natural and avoids Chrome's long-utterance cutoff). Resolves when finished.
  async speak(text, { onStart } = {}) {
    if (!this.supported || !text) return;
    const voice = await this.pick();
    this.stop();
    this._cancelled = false;
    const parts = String(text)
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
      .filter((s) => s.trim());
    onStart?.();
    for (const part of parts) {
      if (this._cancelled) break;
      await new Promise((res) => {
        const u = new SpeechSynthesisUtterance(part);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.rate = getSettings().voiceRate || 1;
        u.pitch = 1;
        u.onend = u.onerror = () => res();
        speechSynthesis.speak(u);
        // Safety: never hang if the browser drops the end event.
        setTimeout(res, Math.max(4000, part.length * 110));
      });
    }
    this._cancelled = false;
  },
  cancel() {
    this._cancelled = true;
    this.stop();
  },
};

// Hands-free listener: collects a turn, sends after `silenceMs` of quiet. Keeps itself alive across browser timeouts.
class Listener {
  constructor({ onText, onTurn, onState, silenceMs = 2000 }) {
    Object.assign(this, { onText, onTurn, onState, silenceMs });
    this.active = false;
  }
  get supported() {
    return !!SR;
  }
  start() {
    if (!SR) return this.onState?.("unsupported");
    this.active = true;
    this.final = "";
    this.interim = "";
    this.heardAt = 0;
    this.firstAt = 0;
    this.rec = new SR();
    this.rec.continuous = !IS_IOS; // iOS ends sessions on its own; we restart instead
    this.rec.interimResults = true;
    this.rec.lang = "en-US";
    this.rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.final += (this.final ? " " : "") + r[0].transcript.trim();
        else interim += r[0].transcript;
      }
      this.interim = interim.trim();
      const now = performance.now();
      if (!this.firstAt) this.firstAt = now;
      this.heardAt = now;
      this.onText?.(this.text());
    };
    this.rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      this.lastError = e.error;
      this.onState?.("error", e.error);
    };
    this.rec.onend = () => {
      if (!this.active) return;
      try {
        this.rec.start(); // browser stopped on its own (timeout / iOS) — keep listening
      } catch {
        this.onState?.("needs-tap");
      }
    };
    try {
      this.rec.start();
      this.onState?.("listening");
    } catch {
      this.onState?.("needs-tap");
    }
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.active || !this.heardAt) return;
      if (performance.now() - this.heardAt > this.silenceMs && this.text().split(/\s+/).length >= 2) this.flush();
    }, 200);
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
    try {
      this.rec?.abort();
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
