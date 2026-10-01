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
        ${AI.enabled() ? `<button class="btn primary block" id="pr-start">${icon("mic")} Start conversation</button>` : `<div class="notice info">Needs your Claude API key — add it in <a href="#settings">Settings</a>.</div>`}
        ${SR ? "" : `<p class="small bad-text">${icon("alert")} This browser can't do speech-to-text. Use Chrome or Edge on your PC/Mac, or Safari on iPhone — or type your replies.</p>`}
      </section>
      <section class="card">${micCheckHTML()}</section>
    </div>
    ${hist.length ? `<section class="card"><h2>Recent sessions</h2><div class="list compact">${hist.map((s) => `<div class="list-row">${ring(s.score, { size: 40 })}<div class="grow"><div class="row-title">${esc(s.label)}</div><div class="small muted">${new Date(s.at).toLocaleDateString()} · ${LEVEL_LABEL[s.difficulty] || ""}</div></div></div>`).join("")}</div></section>` : ""}`;

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
    <label class="field"><span>Voice</span><div class="row"><select id="mc-voice" style="flex:1"><option>Loading voices…</option></select><button class="btn small" id="mc-say">${icon("volume")} Test</button></div></label>
    <p class="small muted">${IS_IOS ? "For the most human voice: iPhone Settings → Accessibility → Spoken Content → Voices → English → download a “Premium” or “Enhanced” voice (e.g. Ava or Zoe), then pick it here." : "Most human voices: Microsoft Edge's “Natural” voices or Chrome's “Google” voices. On a Mac, download a Premium voice in System Settings → Accessibility → Spoken Content."}</p>`;
}
function wireMicCheck() {
  const sel = document.getElementById("mc-voice");
  if (!sel) return;
  Voice.list().then((list) => {
    const cur = getSettings().voiceURI;
    const best = list[0];
    sel.innerHTML = list.length
      ? list.slice(0, 30).map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === (cur || best?.voiceURI) ? "selected" : ""}>${esc(v.name)} — ${Voice.quality(v)}</option>`).join("")
      : `<option value="">No voices available</option>`;
  });
  sel.addEventListener("change", () => Store.set("settings", { ...getSettings(), voiceURI: sel.value }));
  document.getElementById("mc-say").addEventListener("click", () => Voice.speak("Hi Mason, thanks for coming in today. Tell me a little about yourself and what got you interested in finance."));
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

async function startPractice(btn, adaptive) {
  // Unlock speech on iOS/Safari inside the tap.
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {}
  const kind = practiceKind();
  const o = P.opts;
  const difficulty = o.difficulty === "adaptive" ? adaptive : o.difficulty;
  // Audio measurement runs alongside speech recognition on PC/Mac. iPhone allows only one mic user, so it's skipped there.
  if (!IS_IOS) Mic.open(o.micId || getSettings().micId).catch(() => {});
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
    const sc = await AI.practiceSetup(kind, setupOpts);
    if (o.sales === "choose" && P.mode === "sales") sc.opening = "";
    Object.assign(P, { kind, difficulty, sc, thread: [], phase: "live", started: Date.now(), result: null, typing: !SR, status: "" });
    renderLive();
    if (sc.opening) say(sc.opening);
    else listen();
  });
}

function renderLive() {
  const { sc } = P;
  const initials = sc.counterpart.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  app.innerHTML = `
    <div class="live-top"><div><div class="eyebrow">${esc(practiceLabel())} · ${LEVEL_LABEL[P.difficulty]}</div><h1 class="live-title">${esc(sc.title)}</h1></div>
      <div class="row"><span class="pill mono" id="lv-clock">0:00</span><button class="btn" id="lv-end">${icon("stop")} End & analyze</button></div></div>
    <div class="live">
      <section class="card stage">
        <div class="avatar" id="lv-avatar"><span>${esc(initials)}</span></div>
        <div class="who"><strong>${esc(sc.counterpart.name)}</strong><span class="muted small">${esc(sc.counterpart.role)}</span></div>
        <div class="caption" id="lv-caption"></div>
        <div class="status" id="lv-status"></div>
        <div class="you"><div class="you-orb" id="lv-you">${icon("mic")}</div><div class="you-text" id="lv-you-text"></div></div>
        <div class="row center controls">
          <button class="btn primary" id="lv-send">${icon("arrow")} Send now</button>
          <button class="btn" id="lv-pause">${(P.status || "").startsWith("Paused") ? "Resume" : "Pause"}</button>
          <button class="btn ghost" id="lv-type">Type instead</button>
        </div>
        <div class="type-box" id="lv-typebox" ${P.typing ? "" : "hidden"}><textarea id="lv-text" placeholder="Type your reply…"></textarea><button class="btn primary" id="lv-typesend">Send</button></div>
      </section>
      <aside class="card brief"><h3>Your brief</h3><p>${esc(sc.brief)}</p><h4>What great looks like</h4><ul class="small">${(sc.objectives || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <details><summary>Transcript</summary><div class="transcript" id="lv-transcript"></div></details></aside>
    </div>`;
  drawTranscript();
  setStatus(P.status || "");
  clearInterval(renderLive._clock);
  renderLive._clock = setInterval(() => {
    const el = document.getElementById("lv-clock");
    if (!el) return clearInterval(renderLive._clock);
    const s = Math.floor((Date.now() - P.started) / 1000);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const you = document.getElementById("lv-you");
    if (you) you.style.setProperty("--lvl", P.listening ? Math.max(0.15, Mic.level) : 0);
  }, 80);
  document.getElementById("lv-end").onclick = () => endPractice();
  document.getElementById("lv-send").onclick = () => P.listener?.flush();
  document.getElementById("lv-pause").onclick = (e) => {
    if (P.listening) {
      P.listener?.stop();
      P.listening = false;
      e.currentTarget.textContent = "Resume";
      setStatus("Paused — tap Resume when you're ready.");
    } else {
      e.currentTarget.textContent = "Pause";
      listen();
    }
  };
  document.getElementById("lv-type").onclick = () => {
    P.typing = !P.typing;
    document.getElementById("lv-typebox").hidden = !P.typing;
    if (P.typing) document.getElementById("lv-text").focus();
  };
  const sendTyped = () => {
    const t = document.getElementById("lv-text");
    if (!t.value.trim()) return;
    P.listener?.stop();
    const text = t.value.trim();
    t.value = "";
    onMyTurn(text, Math.max(3, text.split(/\s+/).length / 2.4));
  };
  document.getElementById("lv-typesend").onclick = sendTyped;
  document.getElementById("lv-text").addEventListener("keydown", (e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendTyped()));
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
  const cap = document.getElementById("lv-caption");
  if (cap) cap.textContent = text;
  document.getElementById("lv-avatar")?.classList.add("talking");
  setStatus("Speaking…");
  await Voice.speak(text);
  document.getElementById("lv-avatar")?.classList.remove("talking");
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return; // left the page — stay paused
  if (P.ending) return endPractice();
  listen();
}

function listen() {
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return;
  if (!SR) return setStatus("Type your reply below.", "warn");
  const youText = document.getElementById("lv-you-text");
  if (youText) youText.textContent = "";
  Mic.startTurn();
  P.listening = true;
  P.listener = new Listener({
    silenceMs: 2000,
    onText: (t) => {
      const el = document.getElementById("lv-you-text");
      if (el) el.textContent = t;
    },
    onTurn: (text, duration) => onMyTurn(text, duration),
    onState: (s, err) => {
      if (s === "listening") setStatus("Listening… pause for a moment to send.", "live");
      if (s === "needs-tap") setStatus("Tap Resume to keep talking (your browser paused the mic).", "warn");
      if (s === "error") {
        P.listening = false;
        if (err === "not-allowed" || err === "service-not-allowed") {
          P.typing = true;
          document.getElementById("lv-typebox")?.removeAttribute("hidden");
          setStatus("Microphone or speech recognition is blocked — allow it in your browser settings, or type below.", "warn");
        } else if (err === "audio-capture" && Mic.stream) {
          Mic.close(); // another app/stream has the mic — free it and retry
          setTimeout(listen, 300);
        } else setStatus("The mic stopped (" + err + "). Tap Resume to continue.", "warn");
      }
    },
  });
  P.listener.start();
}

async function onMyTurn(text, duration) {
  P.listening = false;
  const audio = Mic.endTurn();
  P.thread.push({ from: "me", text, duration, audio });
  drawTranscript();
  setStatus("Thinking…");
  try {
    const r = await AI.practiceTurn(P.sc, P.thread, P.kind, P.difficulty);
    if (P.phase !== "live") return;
    if (r.end) P.ending = true;
    say(r.reply);
  } catch (e) {
    setStatus(e.message + " — tap Resume to try again.", "warn");
  }
}

async function endPractice() {
  if (P.phase !== "live") return;
  P.listener?.stop();
  Voice.cancel();
  P.listening = false;
  clearInterval(renderLive._clock);
  if (P.thread.filter((t) => t.from === "me").length < 2) {
    Mic.close();
    Object.assign(P, { phase: "setup", ending: false });
    toast("Too short to analyze — say a bit more next time.");
    return renderPracticeSetup();
  }
  P.phase = "analyzing";
  Mic.close();
  setStatus("Analyzing your conversation…");
  app.querySelector(".controls")?.remove();
  const metrics = textMetrics(P.thread);
  P.metrics = metrics;
  try {
    P.result = await AI.practiceAnalyze(P.sc, P.thread, metrics, P.kind);
  } catch (e) {
    P.phase = "live";
    return setStatus(e.message, "warn");
  }
  const s = study();
  s.sessions = [{ mode: P.kind, label: practiceLabel(), score: P.result.overall, difficulty: P.difficulty, at: Date.now(), metrics, result: P.result, title: P.sc.title }, ...(s.sessions || [])].slice(0, 30);
  saveStudy(s);
  Object.assign(P, { phase: "done", ending: false });
  route.quiet = true;
  renderPracticeResult();
  Motion.page();
}

function metricCard(label, value, note, tone) {
  return `<div class="metric"><div class="k">${label}</div><div class="metric-v ${tone || ""}">${value}</div><div class="small muted">${note}</div></div>`;
}

function renderPracticeResult() {
  const r = P.result;
  const m = P.metrics;
  const toneOf = (good, ok) => (good ? "good-text" : ok ? "" : "warn-text");
  const fillerHi = (t) => esc(t).replace(FILLERS, (f) => `<mark>${f}</mark>`);
  app.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">${esc(practiceLabel())} · ${LEVEL_LABEL[P.difficulty]}</div><h1>${esc(P.sc.title)}</h1><p class="muted">${esc(r.verdict)}</p></div>
      <div class="row"><button class="btn primary" id="pr-again">${icon("refresh")} Practice again</button><button class="btn" id="pr-new">New setup</button></div></div>
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
        ${metricCard("Questions you asked", m.questionsAsked, P.kind === "interview" ? "Ask the interviewer at the end" : "Discovery questions build trust", toneOf(m.questionsAsked >= 3, m.questionsAsked >= 1))}
        ${metricCard("Hedging", m.hedges, "“I guess”, “maybe”, “kind of”", toneOf(m.hedges <= 1, m.hedges <= 3))}
        ${metricCard("Talk share", m.talkShare + "%", P.kind === "fpclient" || P.kind === "sales" ? "Listen more than you talk (≈40–55%)" : "Answers should carry the conversation", "")}
        ${metricCard("Longest pause", m.longestPause != null ? m.longestPause + "s" : "—", "Brief pauses read as confident", "")}
      </div>
      <p>${esc(r.tone)}</p>
    </section>
    <div class="two-col">
      <section class="card"><h2>What worked</h2><ul>${r.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="callout practice"><strong>Next drill</strong><p>${esc(r.nextDrill)}</p></div></section>
      <section class="card"><h2>How to get better</h2>${r.improvements.map((x) => `<div class="improve"><strong>${esc(x.issue)}</strong><div class="quote">“${esc(x.quote)}”</div><div class="better">${icon("arrow")} ${esc(x.better)}</div></div>`).join("")}</section>
    </div>
    <section class="card"><h2>Transcript</h2><div class="transcript full">${P.thread.map((t) => `<p><strong>${t.from === "me" ? "You" : esc(P.sc.counterpart.name.split(" ")[0])}:</strong> ${t.from === "me" ? fillerHi(t.text) : esc(t.text)}</p>`).join("")}</div><p class="small muted">Filler words are highlighted.</p></section>`;
  document.getElementById("pr-again").onclick = (e) => {
    P.phase = "setup";
    startPractice(e.currentTarget, adaptiveLevel(practiceKind()));
  };
  document.getElementById("pr-new").onclick = () => {
    P.phase = "setup";
    renderPracticeSetup();
  };
}
