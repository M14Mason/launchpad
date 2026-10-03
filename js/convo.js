// Spoken practice: Interview · Financial planning · Sales · Networking.
// Hands-free: the counterpart speaks, then listens; a ~2s pause sends your turn. Typing is a fallback, never required.

const MODES = [
  { id: "interview", label: "Interview", icon: "briefcase", blurb: "Behavioral, coding, markets, financial planning, a specific program, or college admissions." },
  { id: "fp", label: "Financial planning", icon: "trend", blurb: "Run a client meeting as the planner, or interview for a financial-planning role." },
  { id: "sales", label: "Sales", icon: "target", blurb: "Sell anything — a random product, your own apps, or whatever you choose." },
  { id: "networking", label: "Networking", icon: "users", blurb: "Introduce yourself and turn a conversation into an opportunity." },
];
const INTERVIEW_TYPES = [
  ["behavioral", "Behavioral (STAR stories)"],
  ["python", "Technical — Python & coding"],
  ["markets", "Technical — markets & trading"],
  ["financial planning", "Financial planning"],
  ["program", "A specific program"],
  ["college", "College admissions"],
  ["mixed", "Mixed"],
];
const MY_APPS = [
  ["Keen — a study app with 30,000 questions across 144 courses and automatic spaced-repetition retesting", "Keen (study app)"],
  ["Titan — a fitness web app that builds programs, syncs Apple Health data and logs food with AI", "Titan (fitness app)"],
  ["a real-time trading performance dashboard (Flask) that tracks positions, orders and trade decisions", "Trading dashboard"],
];
const RANDOM_PRODUCTS = [
  "a project-management app for a small construction company",
  "a reusable water bottle for a high school sports team",
  "a website redesign to a family-owned restaurant",
  "a used car to a first-time buyer",
  "solar panels to a homeowner",
  "a gym membership to someone who has never worked out",
  "an AI scheduling assistant to a busy dentist's office",
  "a pen — the classic interview challenge",
];

const P = { mode: "interview", opts: {}, phase: "setup" };

function sessions() {
  return study().sessions || [];
}
function adaptiveLevel(mode) {
  const recent = sessions().filter((s) => s.mode === mode).slice(0, 3);
  if (!recent.length) return "easy";
  const avg = recent.reduce((n, s) => n + s.score, 0) / recent.length;
  return avg >= 80 ? "tough" : avg >= 60 ? "realistic" : "easy";
}
const LEVEL_LABEL = { easy: "Easy", realistic: "Realistic", tough: "Tough" };

function renderPractice(arg = "") {
  const [mode, roleId] = arg.split("/");
  if (mode && MODES.some((m) => m.id === mode)) P.mode = mode;
  if (roleId) Object.assign(P.opts, { interviewType: "program", roleId });
  if (P.phase === "live" || P.phase === "analyzing") return renderLive();
  if (P.phase === "done") return renderPracticeResult();
  renderPracticeSetup();
}

function renderPracticeSetup() {
  const o = Object.assign({ interviewType: "behavioral", count: 5, fpRole: "planner", sales: "random", app: 0, product: "", persona: "fair", difficulty: "adaptive" }, P.opts);
  P.opts = o;
  const roles = allRoles()
    .filter(({ r }) => r.eligibility.status !== "ineligible")
    .sort((a, b) => (tracker()[b.r.id] ? 1 : 0) - (tracker()[a.r.id] ? 1 : 0));
  const adaptive = adaptiveLevel(P.mode === "fp" && o.fpRole === "candidate" ? "interview" : P.mode === "fp" ? "fpclient" : P.mode);
  const hist = sessions().slice(0, 6);
  const opt = (name, val, cur) => `<option value="${esc(val)}" ${String(cur) === String(val) ? "selected" : ""}>${esc(name)}</option>`;

  const modeOptions = {
    interview: `
      <label class="field"><span>Interview type</span><select data-o="interviewType">${INTERVIEW_TYPES.map(([v, l]) => opt(l, v, o.interviewType)).join("")}</select></label>
      ${o.interviewType === "program" ? `<label class="field"><span>Program</span><select data-o="roleId">${roles.map(({ r, c }) => opt(`${tracker()[r.id] ? "★ " : ""}${r.org || c.name} — ${r.title}`, r.id, o.roleId)).join("")}</select></label>` : ""}
      <label class="field"><span>Questions</span><div class="segmented">${[3, 5, 8].map((n) => `<button data-count="${n}" class="${o.count === n ? "on" : ""}">${n}</button>`).join("")}</div></label>`,
    fp: `
      <label class="field"><span>Your role</span><div class="segmented"><button data-fprole="planner" class="${o.fpRole === "planner" ? "on" : ""}">I'm the planner</button><button data-fprole="candidate" class="${o.fpRole === "candidate" ? "on" : ""}">I'm the candidate</button></div></label>
      <p class="small muted">${o.fpRole === "planner" ? "Meet a new client. They won't volunteer everything — ask good questions, then give clear, suitable advice." : "A conversational interview for a financial-planning internship, with technical and behavioral questions."}</p>`,
    sales: `
      <label class="field"><span>What are you selling?</span><div class="segmented"><button data-sales="random" class="${o.sales === "random" ? "on" : ""}">Random</button><button data-sales="apps" class="${o.sales === "apps" ? "on" : ""}">My apps</button><button data-sales="choose" class="${o.sales === "choose" ? "on" : ""}">I choose</button></div></label>
      ${o.sales === "apps" ? `<label class="field"><span>App</span><select data-o="app">${MY_APPS.map(([, l], i) => opt(l, i, o.app)).join("")}</select></label>` : ""}
      ${o.sales === "choose" ? `<p class="small muted">Just start talking and pitch anything — the buyer figures out what it is from you.</p>` : o.sales === "random" ? `<p class="small muted">The buyer and product are revealed when you start.</p>` : ""}`,
    networking: `<label class="field"><span>Who you're talking to</span><select data-o="persona">${PERSONAS.map((p) => opt(p.label, p.id, o.persona)).join("")}</select></label>`,
  }[P.mode];

  app.innerHTML = `
    <a class="back" href="#study">‹ Study</a>
    <div class="page-head"><div><div class="eyebrow">Practice</div><h1>Talk it through</h1><p class="muted">Spoken, hands-free practice. Pause for about two seconds and your turn sends automatically. At the end you get a full analysis of your wording, tone and delivery.</p></div></div>
    <div class="mode-tabs">${MODES.map((m) => `<button data-mode="${m.id}" class="mode-tab ${P.mode === m.id ? "on" : ""}">${icon(m.icon)}<span><strong>${m.label}</strong><span class="small muted">${m.blurb}</span></span></button>`).join("")}</div>
    <div class="practice-setup">
      <section class="card">
        <h2>Scenario</h2>${modeOptions}
        <label class="field"><span>Difficulty</span><div class="segmented">${["adaptive", "easy", "realistic", "tough"].map((d) => `<button data-diff="${d}" class="${o.difficulty === d ? "on" : ""}">${d === "adaptive" ? `Adaptive · ${LEVEL_LABEL[adaptive]}` : LEVEL_LABEL[d]}</button>`).join("")}</div></label>
        <button class="btn primary block" id="pr-start">${icon("mic")} Start conversation</button>
        ${AI.enabled() ? "" : `<p class="small muted">No Claude key on this device, so the built-in practice partner runs the conversation (fixed questions, simpler feedback). Add your key in <a href="#settings">Settings</a> for a fully adaptive partner.</p>`}
        ${SR ? "" : `<p class="small bad-text">${icon("alert")} This browser can't do speech-to-text. Use Chrome or Edge on your PC/Mac, or Safari on iPhone — or type your replies.</p>`}
      </section>
      <section class="card">${micCheckHTML()}</section>
    </div>
    ${progressCardHTML()}
    ${hist.length ? `<section class="card"><h2>Recent sessions</h2><div class="list compact">${hist.map((s, i) => `<a class="list-row" href="${sessionHref(s, i)}">${ring(s.score, { size: 40 })}<div class="grow"><div class="row-title">${esc(s.label)}</div><div class="small muted">${new Date(s.at).toLocaleDateString()} · ${LEVEL_LABEL[s.difficulty] || ""}${s.thread ? " · replay" : ""}</div></div><span class="chev">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}`;

  const set = (patch) => {
    Object.assign(P.opts, patch);
    route.quiet = true;
    rerenderKeepScroll();
  };
  app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => ((P.mode = b.dataset.mode), set({}))));
  app.querySelectorAll("[data-o]").forEach((s) => s.addEventListener("change", () => set({ [s.dataset.o]: s.value })));
  app.querySelectorAll("[data-count]").forEach((b) => b.addEventListener("click", () => set({ count: +b.dataset.count })));
  app.querySelectorAll("[data-fprole]").forEach((b) => b.addEventListener("click", () => set({ fpRole: b.dataset.fprole })));
  app.querySelectorAll("[data-sales]").forEach((b) => b.addEventListener("click", () => set({ sales: b.dataset.sales })));
  app.querySelectorAll("[data-diff]").forEach((b) => b.addEventListener("click", () => set({ difficulty: b.dataset.diff })));
  wireMicCheck();
  document.getElementById("pr-start")?.addEventListener("click", (e) => startPractice(e.currentTarget, adaptive));
}

// ---------- mic + voice check (also used in Settings) ----------
function micCheckHTML() {
  return `<h2>Mic & voice</h2>
    <label class="field"><span>Microphone</span><div class="row"><select id="mc-mic" style="flex:1"><option value="">Default microphone</option></select><button class="btn small" id="mc-test">${icon("mic")} Check mic</button></div></label>
    <div class="meter"><i id="mc-level"></i></div>
    <p class="small muted" id="mc-note">${IS_IOS ? "iPhone: uses the built-in mic (or AirPods). Allow microphone access when asked." : "Blue Snowball: set it as your default input (Windows: Settings → System → Sound → Input; Mac: System Settings → Sound → Input) and pick it here. Speech recognition uses your browser's selected mic."}</p>
    <div class="row"><button class="btn small" id="mc-stt">${icon("message")} Test speech-to-text</button><span class="small muted grow" id="mc-stt-out">Say a sentence — your words should appear here.</span></div>
    <label class="field"><span>Voice ${Eleven.enabled() ? `<span class="pill">ElevenLabs</span>` : ""}</span><div class="row"><select id="mc-voice" style="flex:1"><option>Loading voices…</option></select><button class="btn small" id="mc-say">${icon("volume")} Sound check</button></div></label>
    <div class="sound-check" id="mc-sound" hidden></div>
    <label class="field"><span>Send my answer</span><div class="segmented" id="mc-send">${[["2", "After 2s pause"], ["3", "After 3s"], ["5", "After 5s"], ["tap", "When I tap"]].map(([v, l]) => `<button data-send="${v}" class="${String(getSettings().sendAfter || "3") === v ? "on" : ""}">${l}</button>`).join("")}</div></label>
    <label class="field"><span>Speaking speed</span><div class="segmented" id="mc-rate">${[0.9, 1, 1.1, 1.2].map((r) => `<button data-rate="${r}" class="${(getSettings().voiceRate || 1) === r ? "on" : ""}">${r === 1 ? "Normal" : r + "×"}</button>`).join("")}</div></label>
    <p class="small muted">${
      Eleven.enabled()
        ? "Using ElevenLabs human voices. “Auto” gives each character a voice that fits them."
        : `For a truly human voice, add a free ElevenLabs key in <a href="#settings">Settings</a>. ${IS_IOS ? "Or download a “Premium” voice: iPhone Settings → Accessibility → Spoken Content → Voices → English." : "Otherwise Edge “Natural” and Chrome “Google” voices sound best."}`
    }</p>`;
}
function wireMicCheck() {
  const sel = document.getElementById("mc-voice");
  if (!sel) return;
  const eleven = Eleven.enabled();
  const deviceVoices = () =>
    Voice.list().then((list) => {
      sel.dataset.kind = "device";
      const cur = getSettings().voiceURI;
      sel.innerHTML = list.length
        ? list.slice(0, 30).map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === (cur || list[0]?.voiceURI) ? "selected" : ""}>${esc(v.name)} — ${Voice.quality(v)}</option>`).join("")
        : `<option value="">No voices available</option>`;
    });
  if (eleven)
    Eleven.voices()
      .then((list) => {
        sel.dataset.kind = "eleven";
        const cur = getSettings().elevenVoice || "auto";
        sel.innerHTML = `<option value="auto">Auto — fits each character</option>` + list.map((v) => `<option value="${esc(v.id)}" ${v.id === cur ? "selected" : ""}>${esc(v.name)}${v.gender || v.accent ? ` — ${esc([v.gender, v.accent].filter(Boolean).join(", "))}` : ""}</option>`).join("");
      })
      .catch((e) => {
        toast(e.message);
        deviceVoices();
      });
  else deviceVoices();
  sel.addEventListener("change", () => Store.set("settings", { ...getSettings(), [sel.dataset.kind === "eleven" ? "elevenVoice" : "voiceURI"]: sel.value }));
  document.getElementById("mc-say").addEventListener("click", (e) => soundCheck(e.currentTarget));
  document.querySelectorAll("#mc-send [data-send]").forEach((b) =>
    b.addEventListener("click", () => {
      Store.set("settings", { ...getSettings(), sendAfter: b.dataset.send });
      document.querySelectorAll("#mc-send button").forEach((x) => x.classList.toggle("on", x === b));
    })
  );
  document.querySelectorAll("#mc-rate [data-rate]").forEach((b) =>
    b.addEventListener("click", () => {
      Store.set("settings", { ...getSettings(), voiceRate: +b.dataset.rate });
      document.querySelectorAll("#mc-rate button").forEach((x) => x.classList.toggle("on", x === b));
    })
  );
  // One-turn speech-to-text test: shows exactly what the browser hears (useful on iPhone).
  document.getElementById("mc-stt").addEventListener("click", (e) => {
    const out = document.getElementById("mc-stt-out");
    if (!SR) return (out.textContent = "This browser can't do speech-to-text — use Safari on iPhone, or Chrome/Edge on PC/Mac.");
    if (wireMicCheck.l?.active) return wireMicCheck.l.flush();
    Voice.cancel();
    e.currentTarget.innerHTML = `${icon("stop")} Stop`;
    const btn = e.currentTarget;
    const reset = () => (btn.innerHTML = `${icon("message")} Test speech-to-text`);
    wireMicCheck.l = new Listener({
      silenceMs: 1800,
      onText: (t) => (out.textContent = t),
      onTurn: (t) => ((out.textContent = "Heard: “" + t + "” ✓"), reset()),
      onState: (st, err) => {
        if (st === "listening") out.textContent = "Listening… say a sentence.";
        if (st === "needs-tap") (out.textContent = out.textContent.startsWith("Heard") ? out.textContent : "Didn't catch anything — tap and try again."), reset();
        if (st === "error") (out.textContent = err === "not-allowed" || err === "service-not-allowed" ? "Blocked — allow the microphone and speech recognition for this site in your browser/phone settings." : "Mic error: " + err), reset();
      },
    });
    wireMicCheck.l.start();
  });
  const micSel = document.getElementById("mc-mic");
  const fill = async () => {
    const ds = await Mic.devices();
    const cur = getSettings().micId || "";
    micSel.innerHTML = `<option value="">Default microphone</option>` + ds.filter((d) => d.deviceId && d.deviceId !== "default").map((d, i) => `<option value="${esc(d.deviceId)}" ${d.deviceId === cur ? "selected" : ""}>${esc(d.label || "Microphone " + (i + 1))}</option>`).join("");
  };
  fill();
  micSel.addEventListener("change", () => Store.set("settings", { ...getSettings(), micId: micSel.value }));
  document.getElementById("mc-test").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      await Mic.open(micSel.value);
      await fill();
      const bar = document.getElementById("mc-level");
      const end = Date.now() + 8000;
      const tick = () => {
        if (!bar.isConnected || Date.now() > end) {
          if (P.phase !== "live") Mic.close();
          if (bar.isConnected) bar.style.width = "0%";
          return;
        }
        bar.style.width = Math.round(Mic.level * 100) + "%";
        setTimeout(tick, 60);
      };
      tick();
      document.getElementById("mc-note").textContent = "Say something — the bar should move. (Checking for 8 seconds.)";
    })
  );
}

// Step-by-step sound check that shows exactly what works and what fails, on any device.
async function soundCheck(btn) {
  const out = document.getElementById("mc-sound");
  Voice.unlock();
  Voice.cancel();
  out.hidden = false;
  const steps = [];
  const draw = () =>
    (out.innerHTML = steps.map((s) => `<div class="sc-step ${s.ok === true ? "ok" : s.ok === false ? "bad" : ""}">${s.ok === true ? icon("check") : s.ok === false ? icon("x") : `<span class="spinner"></span>`}<div><strong>${esc(s.name)}</strong>${s.note ? `<div class="small">${esc(s.note)}</div>` : ""}</div></div>`).join(""));
  const step = (name) => {
    const s = { name, ok: null, note: "" };
    steps.push(s);
    draw();
    return s;
  };
  btn.disabled = true;
  try {
    if (Eleven.enabled()) {
      const s = step("ElevenLabs voice");
      Eleven.broken = null;
      try {
        const t0 = Date.now();
        await Eleven.play("Hi Mason! This is your ElevenLabs voice.", { gender: "female", seed: "test", isCurrent: () => true });
        s.ok = true;
        s.note = `Played (${((Date.now() - t0) / 1000).toFixed(1)}s). Didn't hear it? Check the volume and output device.`;
      } catch (e) {
        s.ok = false;
        s.note = e.message + " The app will use the device voice instead.";
      }
      draw();
    }
    const d = step("Device voice");
    if (!Voice.supported) {
      d.ok = false;
      d.note = "This browser has no built-in speech.";
    } else {
      const voice = await Voice.pick();
      const res = await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance("This is the device voice. If you can hear me, sound works.");
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        let started = false;
        u.onstart = () => (started = true);
        u.onend = () => resolve({ ok: true });
        u.onerror = (ev) => resolve({ ok: false, err: ev.error });
        try {
          speechSynthesis.resume();
        } catch {}
        speechSynthesis.speak(u);
        setTimeout(() => resolve(started || speechSynthesis.speaking ? { ok: true, slow: true } : { ok: false, err: "never-started" }), 9000);
      });
      d.ok = res.ok;
      d.note = res.ok
        ? `Played with “${voice?.name || "default voice"}”.${IS_IOS ? " Heard nothing? Flip the iPhone's ring/silent switch off — silent mode mutes web speech." : " Heard nothing? Check volume and which speaker/headphones are selected."}`
        : res.err === "not-allowed"
          ? "The browser blocked speech — tap the button again (it must start from a tap)."
          : res.err === "never-started"
            ? IS_IOS
              ? "Speech never started. Turn off silent mode, close other apps using audio, then reload the page."
              : "Speech never started. Reload the page; on Windows check Settings → Time & language → Speech has a voice installed."
            : "Speech error: " + res.err;
    }
    draw();
  } finally {
    btn.disabled = false;
  }
}

// ---------- session ----------
function practiceKind() {
  if (P.mode === "fp") return P.opts.fpRole === "candidate" ? "interview" : "fpclient";
  return P.mode;
}
function practiceLabel() {
  const o = P.opts;
  if (P.mode === "interview") return o.interviewType === "program" ? `Interview — ${findRole(o.roleId)?.r.org || "program"}` : `Interview — ${INTERVIEW_TYPES.find(([v]) => v === o.interviewType)?.[1]}`;
  if (P.mode === "fp") return o.fpRole === "planner" ? "Financial planning — client meeting" : "Financial planning — interview";
  if (P.mode === "sales") return o.sales === "choose" ? "Sales — your product" : o.sales === "apps" ? `Sales — ${MY_APPS[o.app][1]}` : "Sales — random product";
  return `Networking — ${PERSONAS.find((p) => p.id === o.persona)?.label}`;
}

// ---------- session log (shown under "Connection details" so problems are visible, not mysterious) ----------
function plog(msg) {
  const t = P.started ? ((Date.now() - P.started) / 1000).toFixed(1) + "s" : "";
  (P.log ||= []).push(`${t.padStart(6)}  ${msg}`);
  if (P.log.length > 120) P.log.shift();
  const el = document.getElementById("lv-log");
  if (el) {
    el.textContent = P.log.join("\n");
    el.scrollTop = el.scrollHeight;
  }
}
// Use Claude when it's available; otherwise (or if it fails) the built-in partner keeps the session going.
function goOffline(reason) {
  if (P.sc.offline) return;
  const o = OFFLINE.setup(P.kind, P.setupOpts || {}, P.difficulty);
  Object.assign(P.sc, { offline: true, questions: o.questions, step: Math.max(0, P.thread.filter((t) => t.from === "me").length - 1), followed: {}, revealed: [], product: P.sc.product || o.product });
  plog("switched to built-in partner: " + reason);
  toast("Claude isn't responding (" + reason + ") — continuing with the built-in practice partner.");
  document.getElementById("lv-mode")?.removeAttribute("hidden");
}

// ---------- GSAP motion for the live session (all optional: works the same without GSAP) ----------
const LiveFX = {
  g() {
    return !Motion.reduced && window.gsap;
  },
  enter() {
    const g = this.g();
    if (!g) return;
    const q = (s) => app.querySelectorAll(s);
    const tl = g.timeline({ defaults: { ease: "power3.out" } });
    tl.from(q(".live-top > *"), { y: -14, autoAlpha: 0, duration: 0.5, stagger: 0.08 })
      .from(q(".stage"), { y: 24, autoAlpha: 0, duration: 0.6 }, "<0.1")
      .from(q("#lv-avatar"), { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: "back.out(2.2)" }, "<0.15")
      .from(q(".who, .you, .controls > *"), { y: 12, autoAlpha: 0, duration: 0.45, stagger: 0.06 }, "<0.2")
      .from(q(".brief"), { x: 24, autoAlpha: 0, duration: 0.6 }, "<");
    Motion.ensureVisible([...q(".live-top > *, .stage, #lv-avatar, .who, .you, .controls > *, .brief")], 2000);
  },
  // Words appear in time with the voice.
  caption(text) {
    const el = document.getElementById("lv-caption");
    if (!el) return;
    const g = this.g();
    if (!g) return void (el.textContent = text);
    const ws = String(text).split(/\s+/);
    el.innerHTML = ws.map((w) => `<span class="w">${esc(w)} </span>`).join("");
    g.killTweensOf(el.children);
    // Words start faint (never invisible), so the caption stays readable even if animation frames stall.
    g.fromTo(el.children, { opacity: 0.18, y: 4 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: Math.min(0.32, 9 / Math.max(ws.length, 1)) });
    Motion.ensureVisible([...el.children], Math.min(9000, ws.length * 330 + 1500));
  },
  speaking(on) {
    const g = this.g();
    const av = document.getElementById("lv-avatar");
    av?.classList.toggle("talking", on);
    if (!g || !av) return;
    g.killTweensOf(av, "scale"); // only the pulse — never the entrance fade
    g.set(av, { autoAlpha: 1 });
    if (on) g.to(av, { scale: 1.05, duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: -1 });
    else g.to(av, { scale: 1, duration: 0.3, ease: "power2.out" });
  },
  orb(state) {
    const g = this.g();
    const orb = document.getElementById("lv-you");
    const wave = document.getElementById("lv-wave");
    const dots = document.getElementById("lv-dots");
    if (wave) wave.hidden = state !== "live";
    if (dots) dots.hidden = state !== "thinking";
    if (!g || !orb) return;
    g.fromTo(orb, { scale: 0.86 }, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.5)" });
    if (wave) {
      g.killTweensOf(wave.children);
      if (state === "live")
        [...wave.children].forEach((b, i) => g.fromTo(b, { scaleY: 0.25 }, { scaleY: () => 0.35 + Math.random() * 0.65, duration: 0.28 + i * 0.04, ease: "sine.inOut", yoyo: true, repeat: -1, repeatRefresh: true }));
    }
    if (dots) {
      g.killTweensOf(dots.children);
      if (state === "thinking") g.fromTo(dots.children, { y: 0 }, { y: -6, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.12 });
    }
  },
  results() {
    const g = this.g();
    if (!g) return;
    const bars = [...app.querySelectorAll(".rubric-row .bar i")];
    g.from(bars, { scaleX: 0, transformOrigin: "left center", duration: 1.1, ease: "power3.out", delay: 0.2, stagger: 0.06 });
    Motion.ensureVisible(bars, 2500);
    g.from(app.querySelectorAll(".metric"), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: "power2.out", delay: 0.3 });
    g.from(app.querySelectorAll(".improve"), { x: 16, autoAlpha: 0, duration: 0.5, stagger: 0.08, ease: "power2.out", delay: 0.5 });
    Motion.ensureVisible([...app.querySelectorAll(".metric, .improve")], 2500);
  },
  heard() {
    const g = this.g();
    const el = document.getElementById("lv-you-text");
    if (g && el) g.fromTo(el, { autoAlpha: 0.55 }, { autoAlpha: 1, duration: 0.25, overwrite: true });
  },
  line() {
    const g = this.g();
    const last = document.querySelector("#lv-transcript p:last-child");
    if (g && last) g.from(last, { x: -10, autoAlpha: 0, duration: 0.35, ease: "power2.out" });
  },
};

async function startPractice(btn, adaptive) {
  // Unlock speech + audio on iOS/Safari inside the tap.
  Voice.unlock();
  const kind = practiceKind();
  const o = P.opts;
  const difficulty = o.difficulty === "adaptive" ? adaptive : o.difficulty;
  await busy(btn, async () => {
    const role = o.interviewType === "program" && findRole(o.roleId);
    const setupOpts = {
      interviewType: P.mode === "fp" ? "financial planning" : o.interviewType === "program" ? "program-specific" : o.interviewType,
      role: role ? `${role.r.org || role.c.name} — ${role.r.title}. ${role.r.about || ""}` : "",
      count: P.mode === "fp" ? 5 : o.count,
      product: o.sales === "choose" ? "choose" : o.sales === "apps" ? MY_APPS[o.app][0] : RANDOM_PRODUCTS[Math.floor(Math.random() * RANDOM_PRODUCTS.length)],
      persona: PERSONAS.find((p) => p.id === o.persona)?.who,
      difficulty,
    };
    const log = [];
    let sc = null;
    if (AI.enabled()) {
      try {
        sc = await AI.practiceSetup(kind, setupOpts);
        log.push("scenario written by Claude (" + AI.model() + ")");
      } catch (e) {
        log.push("Claude setup failed: " + e.message);
        toast(e.message + " Using the built-in practice partner.");
      }
    } else log.push("no Claude key — using the built-in practice partner");
    sc ||= OFFLINE.setup(kind, setupOpts, difficulty);
    if (o.sales === "choose" && P.mode === "sales") sc.opening = "";
    Object.assign(P, { kind, difficulty, sc, setupOpts, thread: [], phase: "live", started: Date.now(), result: null, typing: !SR, micBlocked: false, pending: "", status: "", caption: "", orb: "tap", speaking: false, thinking: false, ending: false, log: [], seed: Math.random().toString(36).slice(2) });
    log.forEach(plog);
    plog(`device: ${IS_IOS ? "iPhone/iPad" : "computer"} · speech-to-text ${SR ? "available" : "NOT available"} · voice ${Eleven.enabled() ? "ElevenLabs" : "device"}`);
    renderLive();
    LiveFX.enter();
    if (sc.opening) say(sc.opening);
    else yourTurn();
  });
}

function renderLive() {
  const { sc } = P;
  const initials = sc.counterpart.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  app.innerHTML = `
    <div class="live-top"><div><div class="eyebrow">${esc(practiceLabel())} · ${LEVEL_LABEL[P.difficulty]} <span class="pill" id="lv-mode" ${sc.offline ? "" : "hidden"}>Built-in partner</span></div><h1 class="live-title">${esc(sc.title)}</h1></div>
      <div class="row"><span class="pill mono" id="lv-clock">0:00</span><button class="btn" id="lv-end">${icon("stop")} End & analyze</button></div></div>
    <div class="live">
      <section class="card stage">
        <div class="avatar" id="lv-avatar"><span>${esc(initials)}</span></div>
        <div class="who"><strong>${esc(sc.counterpart.name)}</strong><span class="muted small">${esc(sc.counterpart.role)}</span></div>
        <div class="caption" id="lv-caption"></div>
        <div class="status-row"><div class="lv-dots" id="lv-dots" hidden><i></i><i></i><i></i></div><div class="status" id="lv-status"></div></div>
        <div class="you"><button type="button" class="you-orb" id="lv-you" aria-label="Tap to talk">${icon("mic")}</button>
          <div class="lv-wave" id="lv-wave" hidden><i></i><i></i><i></i><i></i><i></i></div>
          <div class="you-hint" id="lv-hint"></div><div class="you-text" id="lv-you-text"></div></div>
        <div class="row center controls">
          <button class="btn primary" id="lv-send">${icon("arrow")} Send now</button>
          <button class="btn" id="lv-pause">Pause</button>
          <button class="btn ghost" id="lv-type">Type instead</button>
        </div>
        <div class="type-box" id="lv-typebox" ${P.typing ? "" : "hidden"}><textarea id="lv-text" placeholder="Type your reply…"></textarea><button class="btn primary" id="lv-typesend">Send</button></div>
      </section>
      <aside class="card brief"><h3>Your brief</h3><p>${esc(sc.brief)}</p><h4>What great looks like</h4><ul class="small">${(sc.objectives || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <details><summary>Transcript</summary><div class="transcript" id="lv-transcript"></div></details>
        <details class="lv-logbox"><summary>Connection details</summary><pre id="lv-log"></pre><p class="small muted">If something goes wrong, this shows exactly what happened.</p></details></aside>
    </div>`;
  drawTranscript();
  document.getElementById("lv-caption").textContent = P.caption || "";
  document.getElementById("lv-log").textContent = (P.log || []).join("\n");
  setStatus(P.status || "");
  clearInterval(renderLive._clock);
  // Clock + watchdogs: nothing can stay stuck.
  renderLive._clock = setInterval(() => {
    const el = document.getElementById("lv-clock");
    if (!el) return clearInterval(renderLive._clock);
    const s = Math.floor((Date.now() - P.started) / 1000);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    if (P.phase !== "live") return;
    if (P.speaking && Date.now() - P.speakSince > 75000) {
      plog("watchdog: speech never finished — moving on");
      Voice.cancel();
    }
    if (P.listening && P.listener && !P.listener.active && Date.now() - (P.listenSince || 0) > 2500) {
      plog("watchdog: mic stopped without telling us");
      P.listening = false;
      setOrb("tap");
      setStatus("Tap the mic to keep talking.", "warn");
    }
  }, 250);
  document.getElementById("lv-end").onclick = () => endPractice();
  document.getElementById("lv-send").onclick = () => {
    if (P.listening) return P.listener?.flush();
    if (P.pending && !P.speaking && !P.thinking) {
      const t = P.pending;
      P.pending = "";
      onMyTurn(t, Math.max(3, t.split(/\s+/).length / 2.4));
    }
  };
  // The big orb: tap to talk, tap again to send. On iPhone every turn starts here (Apple requires a tap).
  document.getElementById("lv-you").onclick = () => {
    Voice.unlock();
    if (P.speaking) {
      plog("you interrupted");
      Voice.cancel();
      P.speaking = false;
      LiveFX.speaking(false);
      return listen();
    }
    if (P.thinking) return;
    if (P.listening) return P.listener?.flush();
    listen();
  };
  document.getElementById("lv-pause").onclick = () => {
    Voice.unlock();
    if (P.listening) {
      P.listener?.stop();
      P.listening = false;
      setStatus("Paused — tap the mic when you're ready.");
      setOrb("tap");
    } else if (!P.speaking && !P.thinking) listen();
  };
  setOrb(P.orb || "tap");
  document.getElementById("lv-type").onclick = () => {
    P.typing = !P.typing;
    document.getElementById("lv-typebox").hidden = !P.typing;
    if (P.typing) document.getElementById("lv-text").focus();
  };
  const sendTyped = () => {
    const t = document.getElementById("lv-text");
    if (!t.value.trim() || P.thinking) return;
    P.listener?.stop();
    Voice.cancel();
    const text = t.value.trim();
    t.value = "";
    onMyTurn(text, Math.max(3, text.split(/\s+/).length / 2.4));
  };
  document.getElementById("lv-typesend").onclick = sendTyped;
  document.getElementById("lv-text").addEventListener("keydown", (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendTyped()));
}

// Orb states: tap (waiting for you), live (listening), speaking, thinking.
function setOrb(state) {
  const changed = P.orb !== state;
  P.orb = state;
  const orb = document.getElementById("lv-you");
  const hint = document.getElementById("lv-hint");
  const pause = document.getElementById("lv-pause");
  if (orb) orb.dataset.state = state;
  if (pause) pause.textContent = state === "tap" ? "Resume" : "Pause";
  if (hint)
    hint.textContent =
      {
        tap: "Tap to answer",
        live: getSettings().sendAfter === "tap" ? "Listening — tap when you're done" : "Listening — tap to send now",
        speaking: "Tap to interrupt",
        thinking: "Thinking…",
      }[state] || "";
  if (changed || state === "live") LiveFX.orb(state);
}
// Your turn: PC/Mac start listening right away (hands-free); iPhone waits for one tap (Apple's rule).
function yourTurn() {
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return;
  if (!SR || P.typing || P.micBlocked) {
    setOrb("tap");
    return setStatus(!SR ? "Type your reply below." : P.micBlocked ? "Tap the mic to try again, or type below." : "Your turn — type below or tap the mic.", "warn");
  }
  if (IS_IOS) {
    setOrb("tap");
    return setStatus("Your turn — tap the mic and answer.", "live");
  }
  listen();
}

function setStatus(text, kind = "") {
  P.status = text;
  const el = document.getElementById("lv-status");
  if (el) {
    el.textContent = text;
    el.className = "status " + kind;
  }
}
function drawTranscript() {
  const el = document.getElementById("lv-transcript");
  if (el) el.innerHTML = P.thread.map((t) => `<p><strong>${t.from === "me" ? "You" : esc(P.sc.counterpart.name.split(" ")[0])}:</strong> ${esc(t.text)}</p>`).join("") || `<p class="muted small">Nothing yet.</p>`;
}

async function say(text) {
  P.listening = false;
  P.listener?.stop();
  P.thread.push({ from: "them", text });
  drawTranscript();
  LiveFX.line();
  P.caption = text;
  LiveFX.caption(text);
  setStatus("Speaking…");
  P.speaking = true;
  P.speakSince = Date.now();
  setOrb("speaking");
  LiveFX.speaking(true);
  plog(`${P.sc.counterpart.name.split(" ")[0]} speaks (${text.split(/\s+/).length} words)`);
  try {
    await Voice.speak(text, { gender: P.sc.counterpart.gender, seed: P.seed + P.sc.counterpart.name });
  } catch (e) {
    plog("voice error: " + e.message);
  }
  P.speaking = false;
  LiveFX.speaking(false);
  plog("voice finished" + (Voice.lastError ? " (ElevenLabs: " + Voice.lastError + ")" : ""));
  if (P.listening) return; // you interrupted and are already talking
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return; // left the page — stay paused
  if (P.ending) return endPractice();
  await wait(350); // let the speaker fully finish so the mic doesn't hear the end of it
  if (P.listening || P.phase !== "live") return;
  yourTurn();
}

function listen() {
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return;
  if (!SR) return setStatus("Type your reply below.", "warn");
  P.listener?.stop();
  P.micBlocked = false;
  const youText = document.getElementById("lv-you-text");
  if (youText) youText.textContent = P.pending || "";
  P.listening = true;
  P.listenSince = Date.now();
  const initial = P.pending || "";
  P.pending = "";
  plog("mic on" + (initial ? " (continuing your answer)" : ""));
  const me = new Listener({
    silenceMs: sendDelayMs(),
    initial,
    onText: (t) => {
      if (P.listener !== me) return;
      const el = document.getElementById("lv-you-text");
      if (el) el.textContent = t;
      LiveFX.heard();
    },
    onTurn: (text, duration) => {
      if (P.listener !== me) return;
      plog(`you said ${text.split(/\s+/).length} words`);
      onMyTurn(text, duration);
    },
    onState(s, err, kept) {
      if (P.listener !== me) return; // an old listener — ignore it
      if (s === "listening") {
        const d = getSettings().sendAfter || "3";
        setStatus(d === "tap" ? "Listening… tap the mic (or Send now) when you're done." : `Listening… take your time — it sends after a ${d}-second pause.`, "live");
        setOrb("live");
        P.netRetries = 0;
      }
      if (s === "needs-tap") {
        plog("mic paused by the browser" + (err ? " (" + err + ")" : "") + (kept ? " — kept your words" : ""));
        P.listening = false;
        P.pending = (kept || "").trim();
        setOrb("tap");
        setStatus(
          P.pending
            ? "The mic paused. Tap the mic to keep talking, or tap Send now if you're done."
            : err === "not-allowed"
              ? "Tap the mic to talk. If nothing happens, allow Microphone and Speech Recognition for Safari in iPhone Settings → Privacy & Security."
              : "Tap the mic to keep talking.",
          "warn"
        );
      }
      if (s === "error") {
        plog("mic error: " + err);
        me.onState = null;
        me.stop();
        P.listening = false;
        setOrb("tap");
        if (err === "not-allowed" || err === "service-not-allowed") {
          P.micBlocked = true;
          document.getElementById("lv-typebox")?.removeAttribute("hidden");
          setStatus("The browser blocked the mic or speech recognition. Allow the microphone for this site, then tap the mic — or type below.", "warn");
        } else if ((err === "network" || err === "audio-capture") && (P.netRetries = (P.netRetries || 0) + 1) <= 2) {
          setStatus("Reconnecting the mic…", "warn");
          setTimeout(() => P.phase === "live" && !P.speaking && !P.thinking && !P.listening && listen(), 700);
        } else setStatus((err === "network" ? "Speech recognition lost its connection" : "The mic stopped (" + err + ")") + ". Tap the mic to continue.", "warn");
      }
    },
  });
  P.listener = me;
  me.start();
}

async function onMyTurn(text, duration) {
  if (P.thinking || P.phase !== "live") return;
  P.listening = false;
  P.pending = "";
  P.thread.push({ from: "me", text, duration });
  drawTranscript();
  LiveFX.line();
  const yt = document.getElementById("lv-you-text");
  if (yt) yt.textContent = "";
  setStatus("Thinking…");
  setOrb("thinking");
  P.thinking = true;
  let r = null;
  if (!P.sc.offline) {
    const t0 = Date.now();
    try {
      // One quick retry for a hiccup, then fall back so the conversation never stops.
      r = await AI.practiceTurn(P.sc, P.thread, P.kind, P.difficulty).catch((e) => (e.status === 401 || e.status === 403 || /credit/i.test(e.message) ? Promise.reject(e) : AI.practiceTurn(P.sc, P.thread, P.kind, P.difficulty)));
      plog(`Claude replied in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      plog("Claude failed: " + e.message);
      goOffline(e.message.replace(/[.—].*$/, "").trim() || "error");
    }
  }
  if (P.phase !== "live") return void (P.thinking = false);
  if (!r) {
    await wait(500); // a natural beat before the built-in partner answers
    r = OFFLINE.turn(P.sc, P.thread, P.kind);
  }
  P.thinking = false;
  if (r.end) P.ending = true;
  say(r.reply);
}

async function endPractice() {
  if (P.phase !== "live") return;
  P.listener?.stop();
  Voice.cancel();
  Object.assign(P, { listening: false, speaking: false, thinking: false });
  clearInterval(renderLive._clock);
  if (P.thread.filter((t) => t.from === "me").length < 2) {
    Object.assign(P, { phase: "setup", ending: false });
    toast("Too short to analyze — answer at least two questions next time.");
    return renderPracticeSetup();
  }
  P.phase = "analyzing";
  setStatus("Analyzing your conversation…");
  setOrb("thinking");
  app.querySelector(".controls")?.remove();
  const metrics = textMetrics(P.thread);
  P.metrics = metrics;
  P.result = null;
  if (!P.sc.offline && AI.enabled()) {
    try {
      P.result = await AI.practiceAnalyze(P.sc, P.thread, metrics, P.kind);
    } catch (e) {
      plog("Claude analysis failed: " + e.message);
      toast(e.message + " Showing the built-in analysis instead.");
    }
  }
  P.result ||= OFFLINE.analyze(P.sc, P.thread, metrics, P.kind);
  const s = study();
  s.sessions = [{ id: uid(), mode: P.kind, label: practiceLabel(), score: P.result.overall, difficulty: P.difficulty, at: Date.now(), metrics, result: P.result, title: P.sc.title, counterpart: P.sc.counterpart, thread: P.thread.map(({ from, text }) => ({ from, text })), secs: Math.round((Date.now() - P.started) / 1000) }, ...(s.sessions || [])].slice(0, 40);
  saveStudy(s);
  Object.assign(P, { phase: "done", ending: false });
  route.quiet = true;
  renderPracticeResult();
  Motion.page();
  LiveFX.results();
}

function metricCard(label, value, note, tone) {
  return `<div class="metric"><div class="k">${label}</div><div class="metric-v ${tone || ""}">${value}</div><div class="small muted">${note}</div></div>`;
}

// Results page for the session just finished, or for a saved one (`saved`, opened from history as #session/<id>).
function renderPracticeResult(saved) {
  const live = !saved;
  const X = saved
    ? { r: saved.result, m: saved.metrics, label: saved.label, diff: saved.difficulty, title: saved.title || saved.label, thread: saved.thread || [], cp: saved.counterpart || { name: "Them" }, kind: saved.mode, at: saved.at }
    : { r: P.result, m: P.metrics, label: practiceLabel(), diff: P.difficulty, title: P.sc.title, thread: P.thread, cp: P.sc.counterpart, kind: P.kind };
  const { r, m } = X;
  const toneOf = (good, ok) => (good ? "good-text" : ok ? "" : "warn-text");
  const fillerHi = (t) => esc(t).replace(FILLERS, (f) => `<mark>${f}</mark>`);
  app.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${esc(X.label)} · ${LEVEL_LABEL[X.diff] || ""}${X.at ? " · " + new Date(X.at).toLocaleDateString() : ""}</div><h1>${esc(X.title)}</h1><p class="muted">${esc(r.verdict)}</p></div>
      <div class="row">${live ? `<button class="btn primary" id="pr-again">${icon("refresh")} Practice again</button><button class="btn" id="pr-new">New setup</button>` : `<a class="btn" href="#practice">‹ Practice</a>`}</div></div>
    <div class="result-grid">
      <section class="card score-hero">${ring(r.overall, { size: 132, label: r.overall })}<div><div class="k">Overall</div><p>${esc(r.outcome || "")}</p></div></section>
      <section class="card"><h2>Scores</h2>${r.categories.map((c) => `<div class="rubric-row"><div class="spread small"><strong>${esc(c.name)}</strong><span>${c.score}</span></div><div class="bar"><i style="width:${c.score}%"></i></div><div class="small muted">${esc(c.note)}</div></div>`).join("")}</section>
    </div>
    <section class="card"><h2>Delivery</h2>
      <div class="metrics">
        ${metricCard("Pace", m.wpm ? m.wpm + " wpm" : "—", "Conversational: 130–160", toneOf(m.wpm >= 125 && m.wpm <= 170, m.wpm))}
        ${metricCard("Filler words", m.fillersPer100 + " / 100 words", m.topFillers.length ? m.topFillers.map(([f, n]) => `“${f}” ×${n}`).join(", ") : "None detected", toneOf(m.fillersPer100 < 2, m.fillersPer100 < 4))}
        ${metricCard("Pitch variation", m.pitchVarSemis != null ? m.pitchVarSemis + " semitones" : "—", m.pitchVarSemis != null ? (m.pitchVarSemis < 1.5 ? "Leaning monotone" : m.pitchVarSemis > 6 ? "Very animated" : "Expressive") : IS_IOS ? "Measured on PC/Mac" : "Not measured", toneOf(m.pitchVarSemis >= 1.5 && m.pitchVarSemis <= 6, m.pitchVarSemis == null))}
        ${metricCard("Volume steadiness", m.volumeCv != null ? (m.volumeCv < 0.6 ? "Steady" : m.volumeCv < 0.9 ? "Some swings" : "Uneven") : "—", m.volumeCv != null ? `variation ${m.volumeCv}` : IS_IOS ? "Measured on PC/Mac" : "Not measured", toneOf(m.volumeCv != null && m.volumeCv < 0.6, m.volumeCv == null || m.volumeCv < 0.9))}
        ${metricCard("Questions you asked", m.questionsAsked, X.kind === "interview" ? "Ask the interviewer at the end" : "Discovery questions build trust", toneOf(m.questionsAsked >= 3, m.questionsAsked >= 1))}
        ${metricCard("Hedging", m.hedges, "“I guess”, “maybe”, “kind of”", toneOf(m.hedges <= 1, m.hedges <= 3))}
        ${metricCard("Talk share", m.talkShare + "%", X.kind === "fpclient" || X.kind === "sales" ? "Listen more than you talk (≈40–55%)" : "Answers should carry the conversation", "")}
        ${metricCard("Longest pause", m.longestPause != null ? m.longestPause + "s" : "—", "Brief pauses read as confident", "")}
      </div>
      <p>${esc(r.tone)}</p>
    </section>
    <div class="two-col">
      <section class="card"><h2>What worked</h2><ul>${r.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="callout practice"><strong>Next drill</strong><p>${esc(r.nextDrill)}</p></div></section>
      <section class="card"><h2>How to get better</h2>${r.improvements.map((x) => `<div class="improve"><strong>${esc(x.issue)}</strong><div class="quote">“${esc(x.quote)}”</div><div class="better">${icon("arrow")} ${esc(x.better)}</div></div>`).join("")}</section>
    </div>
    ${
      X.thread.length
        ? `<section class="card"><div class="section-head"><h2>Transcript</h2><button class="btn small" id="pr-replay">${icon("play")} Replay conversation</button></div><div class="transcript full">${X.thread.map((t) => `<p><strong>${t.from === "me" ? "You" : esc(X.cp.name.split(" ")[0])}:</strong> ${t.from === "me" ? fillerHi(t.text) : esc(t.text)}</p>`).join("")}</div><p class="small muted">Filler words are highlighted. Replay reads both sides aloud${Eleven.enabled() ? " (uses ElevenLabs credits)" : ""}.</p></section>`
        : ""
    }
    ${progressCardHTML(X.kind)}`;
  document.getElementById("pr-replay")?.addEventListener("click", (e) => replayThread(X.thread, X.cp, e.currentTarget));
  if (!live) return;
  document.getElementById("pr-again").onclick = (e) => {
    P.phase = "setup";
    startPractice(e.currentTarget, adaptiveLevel(practiceKind()));
  };
  document.getElementById("pr-new").onclick = () => {
    P.phase = "setup";
    renderPracticeSetup();
  };
}
