// Free, unlimited, on-device speech: Kokoro (text-to-speech) and Whisper (speech-to-text) running in the
// browser with WebGPU when available, WebAssembly otherwise. Models download once and are cached.
// No accounts, no credits, nothing leaves the device.

const KOKORO_URL = "https://cdn.jsdelivr.net/npm/kokoro-js@1/+esm";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm";

const LocalAI = {
  // Graphics-chip acceleration on computers; phones use the smaller WebAssembly models (~90 MB each).
  device: typeof navigator !== "undefined" && navigator.gpu && !IS_IOS && !/Android/i.test(navigator.userAgent) ? "webgpu" : "wasm",
  status: { voice: "idle", ears: "idle" }, // idle | loading | ready | failed
  progress: { voice: 0, ears: 0 },
  slow: false,
  supported() {
    return typeof WebAssembly === "object";
  },
  _emit() {
    document.dispatchEvent(new CustomEvent("localai", { detail: { status: this.status, progress: this.progress } }));
  },
  _track(kind) {
    const files = {};
    return (p) => {
      if (p.status === "progress" && p.file) {
        files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
        const all = Object.values(files);
        const total = all.reduce((n, f) => n + f.total, 0);
        this.progress[kind] = total ? Math.round((all.reduce((n, f) => n + f.loaded, 0) / total) * 100) : 0;
        this._emit();
      }
    };
  },
  // ---------- voice: Kokoro ----------
  tts() {
    if (!this._tts) {
      this.status.voice = "loading";
      this._emit();
      this._tts = (async () => {
        const { KokoroTTS } = await import(KOKORO_URL);
        const opts = { dtype: this.device === "webgpu" ? "fp32" : "q8", device: this.device, progress_callback: this._track("voice") };
        let tts;
        try {
          tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", opts);
        } catch (e) {
          if (this.device !== "webgpu") throw e;
          // WebGPU hiccup on this device: fall back to WebAssembly.
          this.device = "wasm";
          tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { ...opts, dtype: "q8", device: "wasm" });
        }
        this.status.voice = "ready";
        this._emit();
        return tts;
      })().catch((e) => {
        this.status.voice = "failed";
        this._tts = null;
        this._emit();
        throw e;
      });
    }
    return this._tts;
  },
  // Kokoro voices that suit each practice character (American English).
  // Only Kokoro's best-sounding voices (the lower-graded ones are what sound robotic).
  VOICES: { nora: "af_heart", elena: "af_bella", jade: "af_nicole", grace: "af_aoede", marcus: "am_michael", theo: "am_puck", omar: "am_fenrir", leo: "bm_george" },
  voiceFor(persona, gender) {
    if (persona?.id && this.VOICES[persona.id]) return this.VOICES[persona.id];
    return /^m/i.test(gender || persona?.gender || "") ? "am_michael" : "af_heart";
  },
  async clip(text, voice) {
    const tts = await this.tts();
    const t0 = performance.now();
    const audio = await tts.generate(text, { voice, speed: Math.min(1.3, Math.max(0.85, (getSettings().voiceRate || 1) * 1.06)) });
    const secs = audio.audio.length / audio.sampling_rate;
    // Real-time factor: if this device makes speech much slower than it plays, prefer another voice.
    this.rtf = (performance.now() - t0) / 1000 / Math.max(0.5, secs);
    return { url: URL.createObjectURL(await audio.toBlob()), secs };
  },
  // ---------- ears: Whisper ----------
  asr() {
    if (!this._asr) {
      this.status.ears = "loading";
      this._emit();
      this._asr = (async () => {
        const { pipeline } = await import(TRANSFORMERS_URL);
        const make = (device) =>
          pipeline("automatic-speech-recognition", this.asrModel(device), {
            device,
            dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
            progress_callback: this._track("ears"),
          });
        let p;
        try {
          p = await make(this.device);
        } catch (e) {
          if (this.device !== "webgpu") throw e;
          p = await make("wasm");
        }
        this.status.ears = "ready";
        this._emit();
        return p;
      })().catch((e) => {
        this.status.ears = "failed";
        this._asr = null;
        this._emit();
        throw e;
      });
    }
    return this._asr;
  },
  // Phones without graphics acceleration use the small model: about 4x faster, still good for clear speech.
  asrModel(device) {
    return device === "webgpu" || !(IS_IOS || /Android/i.test(navigator.userAgent)) ? "onnx-community/whisper-base.en" : "onnx-community/whisper-tiny.en";
  },
  // Raw 16 kHz audio straight from the mic (no file decoding) — used for live, phrase-by-phrase transcription.
  async transcribePCM(pcm) {
    const asr = await this.asr();
    const out = await asr(pcm, pcm.length > 16000 * 28 ? { chunk_length_s: 30, stride_length_s: 5 } : {});
    const t = String(out?.text || "")
      .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Whisper sometimes "hears" these in near-silence.
    return /^(you|thank you\.?|thanks for watching!?|bye\.?|\.+)$/i.test(t) ? "" : t;
  },
  // Decode a recording to 16 kHz mono (what Whisper expects).
  async toPCM16k(blob) {
    const buf = await blob.arrayBuffer();
    const ctx = Scribe.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await new Promise((res, rej) => ctx.decodeAudioData(buf.slice(0), res, rej));
    const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const out = await off.startRendering();
    return out.getChannelData(0);
  },
  async transcribe(blob) {
    const asr = await this.asr();
    const pcm = await this.toPCM16k(blob);
    const out = await asr(pcm, { chunk_length_s: 30, stride_length_s: 5 });
    return String(out?.text || "")
      .replace(/\[[^\]]*\]|\([^)]*\)/g, " ") // drop [BLANK_AUDIO], (music) etc.
      .replace(/\s+/g, " ")
      .trim();
  },
  // Start downloading both models in the background (Settings / first practice).
  warm() {
    if (!this.supported()) return;
    this.tts().catch(() => {});
    this.asr().catch(() => {});
  },
};

// Speak numbers the way people say them, so no voice engine stumbles on "$1,850" or "6.6%".
const NUM_WORDS = (() => {
  const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const under1000 = (n) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const t = r < 20 ? (r ? ones[r] : "") : tens[Math.floor(r / 10)] + (r % 10 ? "-" + ones[r % 10] : "");
    return [h ? ones[h] + " hundred" : "", t].filter(Boolean).join(" ");
  };
  const words = (n) => {
    n = Math.round(n);
    if (n === 0) return "zero";
    const parts = [];
    for (const [v, w] of [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]]) {
      if (n >= v) {
        parts.push(under1000(Math.floor(n / v)) + " " + w);
        n %= v;
      }
    }
    if (n) parts.push(under1000(n));
    return parts.join(" ");
  };
  const dec = (s) => {
    const [i, d] = s.split(".");
    return words(+i) + (d ? " point " + d.split("").map((x) => ones[+x]).join(" ") : "");
  };
  return { words, dec };
})();
function speakable(text) {
  return String(text)
    .replace(/401\s*\(?k\)?/gi, "four oh one K")
    .replace(/\b529\b/g, "five twenty-nine")
    .replace(/\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s?(k|m|million|billion|thousand)\b)?/gi, (_, n, unit) => {
      const v = +n.replace(/,/g, "");
      const mult = /^k|thousand/i.test(unit || "") ? 1e3 : /^m|million/i.test(unit || "") ? 1e6 : /billion/i.test(unit || "") ? 1e9 : 1;
      const total = v * mult;
      if (Number.isInteger(total) && total >= 1100 && total < 10000 && total % 100 === 0 && mult === 1) return NUM_WORDS.words(total / 100) + " hundred dollars";
      return (Number.isInteger(total) ? NUM_WORDS.words(total) : NUM_WORDS.dec(String(total))) + " dollars";
    })
    .replace(/(\d+(?:\.\d+)?)\s?%/g, (_, n) => NUM_WORDS.dec(n) + " percent")
    .replace(/\b(19|20)(\d\d)\b(?![,\d])/g, (m, a, b) => (+b === 0 ? NUM_WORDS.words(+m) : NUM_WORDS.words(+a) + " " + (+b < 10 ? "oh " + NUM_WORDS.words(+b) : NUM_WORDS.words(+b))))
    .replace(/\b(\d+)\s?[-–]\s?(\d+)\b/g, (_, a, b) => NUM_WORDS.words(+a) + " to " + NUM_WORDS.words(+b))
    .replace(/\b\d[\d,]*(?:\.\d+)?\b/g, (n) => (n.includes(".") ? NUM_WORDS.dec(n.replace(/,/g, "")) : NUM_WORDS.words(+n.replace(/,/g, ""))));
}
