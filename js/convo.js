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
  if (P.clientMeeting) return renderClientBrief();
  renderPracticeSetup();
}

// Practice characters: each has a voice (ElevenLabs id or a matching device voice), a vibe and orb colors.
const CHARACTERS = [
  { id: "nora", name: "Nora", gender: "female", vibe: "Warm and encouraging", colors: ["#6d5dfc", "#22d3ee", "#c4b5fd"], eleven: "EXAVITQu4vr4xnSDxMaL", pitch: 1.05, rate: 0.98 },
  { id: "elena", name: "Elena", gender: "female", vibe: "Crisp and professional", colors: ["#0284c7", "#4f46e5", "#bae6fd"], eleven: "FGY2WhTYpPnrIDTdsKH5", pitch: 1, rate: 1.03 },
  { id: "jade", name: "Jade", gender: "female", vibe: "Energetic and curious", colors: ["#f97316", "#db2777", "#fde047"], eleven: "cgSgspJ2msm6clMCkdW9", pitch: 1.1, rate: 1.05 },
  { id: "grace", name: "Grace", gender: "female", vibe: "Calm and patient", colors: ["#0d9488", "#059669", "#a7f3d0"], eleven: "Xb7hH8MSUJpSbSDYk0k2", pitch: 0.98, rate: 0.95 },
  { id: "marcus", name: "Marcus", gender: "male", vibe: "Direct and no-nonsense", colors: ["#2563eb", "#1e3a8a", "#93c5fd"], eleven: "nPczCjzI2devNBz1zQrb", pitch: 0.92, rate: 1.02 },
  { id: "theo", name: "Theo", gender: "male", vibe: "Friendly and upbeat", colors: ["#16a34a", "#65a30d", "#67e8f9"], eleven: "TX3LPaxmHKxFdv7VOQHJ", pitch: 1.03, rate: 1.04 },
  { id: "omar", name: "Omar", gender: "male", vibe: "Thoughtful and steady", colors: ["#7c3aed", "#0ea5e9", "#ddd6fe"], eleven: "cjVigY5qzO86Huf0OWal", pitch: 0.95, rate: 0.96 },
  { id: "leo", name: "Leo", gender: "male", vibe: "Sharp and fast-paced", colors: ["#dc2626", "#d97706", "#fecdd3"], eleven: "CwhRBWXzGAHq8TQ4Fs17", pitch: 1, rate: 1.08 },
];
// "Random": a rainbow orb that turns into a real character (with a matching voice) when the session starts.
const RANDOM_CH = { id: "random", name: "Random", gender: "", vibe: "A surprise partner each time", colors: ["#f43f5e", "#22c55e", "#3b82f6"], random: true };
function character(id = getSettings().character) {
  if (id === "random") return RANDOM_CH;
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}
const realCharacter = (ch) => (ch.random ? CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)] : ch);
const LENGTHS = [
  [5, "5 min", "Quick"],
  [8, "8 min", "Standard"],
  [15, "15 min", "Deep"],
];
const SLIDERS = {
  know: { label: "Money knowledge", hint: "How well the client understands finance terms", stops: ["Beginner", "Basic", "Average", "Savvy", "Expert"] },
  numbers: { label: "Knows their numbers", hint: "How organized they are about their own finances", stops: ["No idea", "Rough idea", "Mostly", "Organized", "Spreadsheet-level"] },
  worry: { label: "Worry level", hint: "How stressed they are about money", stops: ["Calm", "A little", "Some", "Stressed", "Very anxious"] },
  interest: { label: "Buyer interest", hint: "How open the buyer is at the start", stops: ["Cold", "Skeptical", "Neutral", "Curious", "Eager"] },
};
const sliderHTML = (key, val) => {
  const s = SLIDERS[key];
  return `<div class="slider-field"><div class="spread"><span class="sl-label">${s.label}</span><strong class="sl-val" id="sl-${key}">${s.stops[val - 1]}</strong></div>
    <input type="range" min="1" max="5" step="1" value="${val}" data-slider="${key}" aria-label="${s.label}" style="--fill:${((val - 1) / 4) * 100}%">
    <div class="spread small muted"><span>${s.stops[0]}</span><span>${s.stops[4]}</span></div></div>`;
};

function renderPracticeSetup() {
  const o = Object.assign({ interviewType: "behavioral", minutes: 8, fpRole: "planner", sales: "random", app: 0, product: "", persona: "fair", difficulty: "adaptive", warmup: true, roleText: "", jobAd: "", know: 2, numbers: 2, worry: 3, interest: 3 }, P.opts);
  P.opts = o;
  const ch = character();
  const roles = allRoles()
    .filter(({ r }) => r.eligibility.status !== "ineligible")
    .sort((a, b) => (tracker()[b.r.id] ? 1 : 0) - (tracker()[a.r.id] ? 1 : 0));
  const adaptive = adaptiveLevel(P.mode === "fp" && o.fpRole === "candidate" ? "interview" : P.mode === "fp" ? "fpclient" : P.mode);
  const hist = sessions().slice(0, 6);
  const opt = (name, val, cur) => `<option value="${esc(val)}" ${String(cur) === String(val) ? "selected" : ""}>${esc(name)}</option>`;
  const isInterview = P.mode === "interview" || (P.mode === "fp" && o.fpRole === "candidate");
  const seg = (attr, items, cur) => `<div class="segmented">${items.map(([v, l, sub]) => `<button data-${attr}="${v}" class="${String(cur) === String(v) ? "on" : ""}">${l}${sub ? `<span class="seg-sub">${sub}</span>` : ""}</button>`).join("")}</div>`;
  const section = (ic, title, sub, body) => `<div class="ps-row"><div class="ps-head">${icon(ic)}<div><strong>${title}</strong>${sub ? `<span class="small muted">${sub}</span>` : ""}</div></div>${body}</div>`;

  const modeRows = {
    interview: [
      section("briefcase", "Interview type", "", `<select data-o="interviewType">${INTERVIEW_TYPES.map(([v, l]) => opt(l, v, o.interviewType)).join("")}</select>`),
      o.interviewType === "program" ? section("target", "Program", "From your list", `<select data-o="roleId">${roles.map(({ r, c }) => opt(`${tracker()[r.id] ? "★ " : ""}${r.org || c.name} — ${r.title}`, r.id, o.roleId)).join("")}</select>`) : section("target", "Role or company", "Optional", `<input data-t="roleText" value="${esc(o.roleText)}" placeholder="e.g. Financial analyst intern at a fintech" maxlength="120">`),
    ],
    fp: [
      section("users", "Your role", "", seg("fprole", [["planner", "I'm the planner"], ["candidate", "I'm the candidate"]], o.fpRole)),
      o.fpRole === "planner"
        ? section("trend", "The client", "Shape who walks in", ["know", "numbers", "worry"].map((k) => sliderHTML(k, o[k])).join(""))
        : section("target", "Role or company", "Optional", `<input data-t="roleText" value="${esc(o.roleText)}" placeholder="e.g. Financial planning intern" maxlength="120">`),
    ],
    sales: [
      section("target", "What are you selling?", "", seg("sales", [["random", "Random"], ["apps", "My apps"], ["choose", "I choose"]], o.sales)),
      o.sales === "apps" ? section("layers", "App", "", `<select data-o="app">${MY_APPS.map(([, l], i) => opt(l, i, o.app)).join("")}</select>`) : "",
      section("users", "The buyer", o.sales === "choose" ? "Just start pitching — they'll figure out what it is" : "", sliderHTML("interest", o.interest)),
    ],
    networking: [section("users", "Who you're talking to", "", `<select data-o="persona">${PERSONAS.map((p) => opt(p.label, p.id, o.persona)).join("")}</select>`)],
  }[P.mode];

  app.innerHTML = `
    <a class="back" href="#study">‹ Study</a>
    <div class="mode-tabs">${MODES.map((m) => `<button data-mode="${m.id}" class="mode-tab ${P.mode === m.id ? "on" : ""}">${icon(m.icon)}<span><strong>${m.label}</strong><span class="small muted">${m.blurb}</span></span></button>`).join("")}</div>
    <section class="ps-hero">
      <div class="ps-copy"><div class="eyebrow">Spoken practice</div><h1>Rehearse it out loud,<br><span class="accent-text">then get coached.</span></h1>
        <p class="muted" id="ch-blurb">${esc(ch.name)} ${P.mode === "fp" && o.fpRole === "planner" ? "plays your client" : P.mode === "sales" ? "plays your buyer" : P.mode === "networking" ? "plays who you're meeting" : "interviews you"} — ${esc(ch.vibe.toLowerCase())}. Talk naturally; your answer sends when you pause.</p></div>
      <div class="ps-stage"><div class="orb-host" id="ps-orb"></div><button class="btn hear" id="ch-hear">${icon("play")} Hear ${esc(ch.name)}</button></div>
      <div class="ch-row" id="ch-row"><button class="ch ${ch.random ? "on" : ""}" data-ch="random" title="A surprise partner each time"><span class="ch-dot rainbow"></span><span class="ch-name">Random</span></button>${CHARACTERS.map((c) => `<button class="ch ${c.id === ch.id ? "on" : ""}" data-ch="${c.id}" title="${esc(c.vibe)}"><span class="ch-dot" style="--c1:${c.colors[0]};--c2:${c.colors[1]};--c3:${c.colors[2]}"></span><span class="ch-name">${c.name}</span></button>`).join("")}</div>
    </section>
    <div class="practice-setup">
      <section class="card ps-card">
        ${modeRows.join("")}
        ${section("gauge", "Length", "", seg("min", LENGTHS, o.minutes))}
        ${section("flame", "Style", { adaptive: "Matches your recent scores", easy: "Gives you openings", realistic: "Like a normal first round", tough: "Presses for details" }[o.difficulty], seg("diff", [["adaptive", "Adaptive", LEVEL_LABEL[adaptive]], ["easy", "Friendly"], ["realistic", "Realistic"], ["tough", "Tough"]], o.difficulty))}
        ${
          isInterview
            ? `<details class="ps-more" ${o.jobAd ? "open" : ""}><summary>More options: warm-up and job ad</summary>
            <label class="toggle-row"><span><strong>Warm-up question</strong><span class="small muted">Start with “Tell me about yourself”</span></span><input type="checkbox" data-check="warmup" ${o.warmup ? "checked" : ""}></label>
            <label class="field"><span>Paste a job ad (optional)</span><textarea data-t="jobAd" rows="4" placeholder="Paste the posting — questions will target it">${esc(o.jobAd)}</textarea></label></details>`
            : ""
        }
        ${AI.enabled() ? "" : `<p class="small muted">No Claude key on this device — the built-in partner runs it (set questions, simpler feedback). Add your key in <a href="#settings">Settings</a> for a fully adaptive partner.</p>`}
        ${SR ? "" : `<p class="small bad-text">${icon("alert")} This browser can't do speech-to-text. Use Chrome or Edge on your PC/Mac, or Safari on iPhone — or type your replies.</p>`}
      </section>
      <section class="card"><details class="ps-mic"><summary>${icon("mic")} Mic & voice settings</summary>${micCheckHTML()}</details>
        <div class="ps-points">${[["check", "Listens through pauses — sends when you finish"], ["check", AI.enabled() ? "Adapts to what you actually say" : "Works without an API key"], ["check", "Scores every answer at the end"]].map(([i, t]) => `<div>${icon(i)} ${t}</div>`).join("")}</div></section>
    </div>
    ${progressCardHTML()}
    ${hist.length ? `<section class="card"><h2>Recent sessions</h2><div class="list compact">${hist.map((s, i) => `<a class="list-row" href="${sessionHref(s, i)}">${ring(s.score, { size: 40 })}<div class="grow"><div class="row-title">${esc(s.label)}</div><div class="small muted">${new Date(s.at).toLocaleDateString()} · ${LEVEL_LABEL[s.difficulty] || ""}${s.thread ? " · replay" : ""}</div></div><span class="chev">${icon("chevron")}</span></a>`).join("")}</div></section>` : ""}
    <div class="start-bar"><button class="btn primary" id="pr-start">${ch.random ? "Start with a surprise partner" : "Start with " + esc(ch.name)} ${icon("arrow")}</button></div>`;

  // Structural changes re-render; small ones update in place (so the 3D orb keeps running).
  const set = (patch) => {
    Object.assign(P.opts, patch);
    route.quiet = true;
    rerenderKeepScroll();
  };
  const seg1 = (attr, key, cast = (v) => v) =>
    app.querySelectorAll(`[data-${attr}]`).forEach((b) =>
      b.addEventListener("click", () => {
        P.opts[key] = cast(b.dataset[attr]);
        b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        if (window.gsap && !Motion.reduced) gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
        if (key === "difficulty") b.closest(".ps-row").querySelector(".ps-head .small").textContent = { adaptive: "Matches your recent scores", easy: "Gives you openings", realistic: "Like a normal first round", tough: "Presses for details" }[P.opts.difficulty];
      })
    );
  app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => ((P.mode = b.dataset.mode), set({}))));
  app.querySelectorAll("[data-o]").forEach((s) => s.addEventListener("change", () => set({ [s.dataset.o]: s.value })));
  app.querySelectorAll("[data-t]").forEach((s) => s.addEventListener("input", () => (P.opts[s.dataset.t] = s.value)));
  app.querySelectorAll("[data-check]").forEach((s) => s.addEventListener("change", () => (P.opts[s.dataset.check] = s.checked)));
  app.querySelectorAll("[data-fprole]").forEach((b) => b.addEventListener("click", () => set({ fpRole: b.dataset.fprole })));
  app.querySelectorAll("[data-sales]").forEach((b) => b.addEventListener("click", () => set({ sales: b.dataset.sales })));
  seg1("min", "minutes", Number);
  seg1("diff", "difficulty");
  app.querySelectorAll("[data-slider]").forEach((r) =>
    r.addEventListener("input", () => {
      const k = r.dataset.slider;
      P.opts[k] = +r.value;
      r.style.setProperty("--fill", ((r.value - 1) / 4) * 100 + "%");
      const lbl = document.getElementById("sl-" + k);
      lbl.textContent = SLIDERS[k].stops[r.value - 1];
      if (window.gsap && !Motion.reduced) gsap.fromTo(lbl, { y: -4, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
    })
  );
  // Characters + their 3D orb
  const host = document.getElementById("ps-orb");
  Orb3D.mount(host, { colors: ch.colors, state: "idle", rainbow: !!ch.random });
  app.querySelectorAll("[data-ch]").forEach((b) =>
    b.addEventListener("click", () => {
      const c = character(b.dataset.ch);
      Store.set("settings", { ...getSettings(), character: c.id });
      app.querySelectorAll("[data-ch]").forEach((x) => x.classList.toggle("on", x === b));
      if (c.random) Orb3D.current?.setRainbow(true);
      else Orb3D.current?.setColors(c.colors);
      Orb3D.current?.pulse(1.2);
      document.getElementById("ch-hear").innerHTML = `${icon("play")} ${c.random ? "Hear a random voice" : "Hear " + esc(c.name)}`;
      document.getElementById("pr-start").innerHTML = `${c.random ? "Start with a surprise partner" : "Start with " + esc(c.name)} ${icon("arrow")}`;
      const bl = document.getElementById("ch-blurb");
      bl.textContent = bl.textContent.replace(/^\S+/, c.random ? "Someone new" : c.name).replace(/— [^.]+\./, `— ${c.vibe.toLowerCase()}.`);
      if (window.gsap && !Motion.reduced) gsap.fromTo(b.querySelector(".ch-dot"), { scale: 0.8 }, { scale: 1, duration: 0.5, ease: "elastic.out(1,0.45)" });
      b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    })
  );
  document.getElementById("ch-hear").addEventListener("click", async (e) => {
    Voice.unlock();
    const picked = character();
    const c = realCharacter(picked);
    const btn = e.currentTarget;
    btn.disabled = true;
    if (picked.random) Orb3D.current?.setColors(c.colors);
    Orb3D.current?.setState("speaking");
    await Voice.speak(`Hi Mason, I'm ${c.name}. ${P.mode === "fp" && P.opts.fpRole === "planner" ? "Thanks for meeting with me. I really need some help getting my money organized." : "Thanks for coming in today. So, tell me a little about yourself."}`, { persona: c, onWord: (v) => Orb3D.current?.pulse(v) });
    Orb3D.current?.setState("idle");
    if (picked.random && character().random) Orb3D.current?.setRainbow(true);
    if (btn.isConnected) btn.disabled = false;
  });
  wireMicCheck();
  document.getElementById("pr-start")?.addEventListener("click", (e) => startPractice(e.currentTarget, adaptive));
  if (window.gsap && !Motion.reduced) {
    gsap.from(app.querySelectorAll(".ps-copy > *"), { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
    gsap.from(app.querySelectorAll(".ch"), { y: 14, autoAlpha: 0, duration: 0.45, stagger: 0.04, ease: "power2.out", delay: 0.15 });
    gsap.from(app.querySelectorAll(".ps-row"), { y: 14, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: "power2.out", delay: 0.2 });
    Motion.ensureVisible([...app.querySelectorAll(".ps-copy > *, .ch, .ps-row")], 2200);
  }
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
    ${Eleven.enabled() ? `<label class="field"><span>Speech-to-text</span><div class="segmented" id="mc-stt-eng">${[["scribe", "ElevenLabs Scribe (most accurate)"], ["browser", "Browser (free)"]].map(([v, l]) => `<button data-stt="${v}" class="${(getSettings().stt || "scribe") === v ? "on" : ""}">${l}</button>`).join("")}</div></label>` : ""}
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
  document.querySelectorAll("#mc-stt-eng [data-stt]").forEach((b) =>
    b.addEventListener("click", () => {
      Store.set("settings", { ...getSettings(), stt: b.dataset.stt });
      Scribe.broken = null;
      Scribe.fails = 0;
      document.querySelectorAll("#mc-stt-eng button").forEach((x) => x.classList.toggle("on", x === b));
    })
  );
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
    if (!SR && !Scribe.enabled()) return (out.textContent = "This browser can't do speech-to-text — use Safari on iPhone, or Chrome/Edge on PC/Mac.");
    if (wireMicCheck.l?.active) return wireMicCheck.l.flush();
    Voice.cancel();
    e.currentTarget.innerHTML = `${icon("stop")} Stop`;
    const btn = e.currentTarget;
    const reset = () => (btn.innerHTML = `${icon("message")} Test speech-to-text`);
    wireMicCheck.l = new (Scribe.enabled() ? CloudListener : Listener)({
      silenceMs: 1800,
      onText: (t) => (out.textContent = t),
      onTurn: (t) => ((out.textContent = "Heard: “" + t + "” ✓"), reset()),
      onState: (st, err) => {
        if (st === "listening") out.textContent = "Listening… say a sentence" + (Scribe.enabled() ? " (ElevenLabs Scribe)." : ".");
        if (st === "transcribing") out.textContent = "Transcribing…";
        if (st === "stt-failed") (out.textContent = "Transcription failed: " + err), reset();
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
  if (P.sc?.clientId) return `Client — ${P.sc.counterpart.name}`;
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
      .from(q(".brief, .desk"), { x: 24, autoAlpha: 0, duration: 0.6 }, "<");
    Motion.ensureVisible([...q(".live-top > *, .stage, #lv-avatar, .who, .you, .controls > *, .brief, .desk")], 2000);
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
  // The 3D orb shows who's talking; the old initials avatar is only the no-WebGL fallback.
  speaking(on) {
    Orb3D.current?.setState(on ? "speaking" : "idle");
    document.getElementById("lv-avatar")?.classList.toggle("talking", on);
  },
  orb(state) {
    Orb3D.current?.setState({ speaking: "speaking", live: "listening", thinking: "thinking" }[state] || "idle");
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
    Orb3D.current?.pulse(0.45);
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
    const picked = character();
    const ch = realCharacter(picked);
    P.revealRandom = !!picked.random;
    const setupOpts = {
      interviewType: P.mode === "fp" ? "financial planning" : o.interviewType === "program" ? "program-specific" : o.interviewType,
      role: role ? `${role.r.org || role.c.name} — ${role.r.title}. ${role.r.about || ""}` : (o.roleText || "").trim(),
      minutes: o.minutes || 8,
      warmup: o.warmup !== false,
      jobAd: (o.jobAd || "").trim().slice(0, 4000),
      client: { know: o.know, numbers: o.numbers, worry: o.worry },
      interest: o.interest,
      character: ch,
      product: o.sales === "choose" ? "choose" : o.sales === "apps" ? MY_APPS[o.app][0] : RANDOM_PRODUCTS[Math.floor(Math.random() * RANDOM_PRODUCTS.length)],
      persona: PERSONAS.find((p) => p.id === o.persona)?.who,
      difficulty,
    };
    const log = [];
    let sc = null;
    // Client-book meeting: the client file supplies everything (no AI setup needed).
    const cm = P.clientMeeting && Clients.find(P.clientMeeting.id);
    if (cm) {
      sc = Clients.scenario(cm, P.clientMeeting.type);
      sc.offline = !AI.enabled();
      sc.revealed = [];
      sc.minutes = setupOpts.minutes;
      sc.maxTurns = Math.round(setupOpts.minutes * 1.4) + 2;
      setupOpts.client = { know: cm.truth.levels[0], numbers: cm.truth.levels[1], worry: cm.truth.levels[2] };
      Scribe.extraTerms = [cm.first, cm.last, cm.partner, ...cm.kids.map((k) => k.name), cm.truth.pet?.[1]].filter(Boolean);
      log.push(`client meeting: ${cm.first} ${cm.last} (${P.clientMeeting.type})`);
    } else if (AI.enabled()) {
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
    let persona = ch;
    if (cm) {
      persona = sc.persona; // the client's own voice and colors
      P.revealRandom = false;
    } else {
      // The chosen character plays the part (their name, voice and orb).
      const last = String(sc.counterpart?.name || "").split(" ").slice(1).join(" ");
      sc.counterpart = { ...(sc.counterpart || {}), name: `${ch.name}${last ? " " + last : ""}`, gender: ch.gender };
      if (sc.opening) sc.opening = sc.opening.replace(/\b(I'm|I am|my name is)\s+[A-Z][a-z]+/, `$1 ${ch.name}`);
    }
    deskRefresh.shown = null;
    deskRefresh.done = null;
    Object.assign(P, { notes: "", deskTab: null, persona, minutes: setupOpts.minutes, kind, difficulty, sc, setupOpts, thread: [], phase: "live", started: Date.now(), result: null, typing: !SR, micBlocked: false, pending: "", status: "", caption: "", orb: "tap", speaking: false, thinking: false, ending: false, log: [], seed: Math.random().toString(36).slice(2) });
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
    <div class="lv-progress"><i id="lv-prog"></i></div>
    <div class="live">
      <section class="card stage">
        <div class="orb-host live-orb" id="lv-avatar"><div class="avatar"><span>${esc(initials)}</span></div></div>
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
      ${
        sc.clientId
          ? deskHTML()
          : `<aside class="card brief"><h3>Your brief</h3><p>${esc(sc.brief)}</p><h4>What great looks like</h4><ul class="small">${(sc.objectives || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <details><summary>Transcript</summary><div class="transcript" id="lv-transcript"></div></details>
        <details class="lv-logbox"><summary>Connection details</summary><pre id="lv-log"></pre><p class="small muted">If something goes wrong, this shows exactly what happened.</p></details></aside>`
      }
    </div>`;
  if (sc.clientId) wireDesk();
  drawTranscript();
  document.getElementById("lv-caption").textContent = P.caption || "";
  document.getElementById("lv-log").textContent = (P.log || []).join("\n");
  const orbColors = (P.persona || character()).colors;
  Orb3D.mount(document.getElementById("lv-avatar"), { colors: orbColors, state: { speaking: "speaking", live: "listening", thinking: "thinking" }[P.orb] || "idle", rainbow: !!P.revealRandom }).then(() => {
    // Random partner: the rainbow orb settles into the chosen character's colors.
    if (!P.revealRandom) return;
    P.revealRandom = false;
    setTimeout(() => {
      Orb3D.current?.setColors(orbColors);
      Orb3D.current?.pulse(1);
    }, 900);
  });
  setStatus(P.status || "");
  clearInterval(renderLive._clock);
  // Clock + watchdogs: nothing can stay stuck.
  renderLive._clock = setInterval(() => {
    const el = document.getElementById("lv-clock");
    if (!el) return clearInterval(renderLive._clock);
    // Countdown to the chosen length; the partner wraps up when time is up.
    const s = Math.floor((Date.now() - P.started) / 1000);
    const total = (P.minutes || 8) * 60;
    const left = total - s;
    el.textContent = left >= 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left` : `+${Math.floor(-left / 60)}:${String(-left % 60).padStart(2, "0")} over`;
    el.classList.toggle("warn-text", left < 60);
    const prog = document.getElementById("lv-prog");
    if (prog) prog.style.width = Math.min(100, (s / total) * 100) + "%";
    if (P.phase !== "live") return;
    if (left < -90 && !P.ending) {
      plog("time is well past — the next reply wraps up");
      P.ending = "soon";
    }
    if (P.listening && P.listener?.level > 0.08) Orb3D.current?.pulse(P.listener.level * 0.6);
    if (P.speaking && Date.now() - P.speakSince > 75000) {
      plog("watchdog: speech never finished — moving on");
      Voice.cancel();
    }
    if (P.listening && P.listener?.active && !P.nudged && !P.listener.text() && !P.listener.spoke && Date.now() - (P.listenSince || 0) > 15000) {
      P.nudged = true;
      setStatus("Still listening — go ahead whenever you're ready. (Nothing heard yet: check the mic, or tap Type instead.)", "live");
    }
    if (P.listening && !P.transcribing && P.listener && !P.listener.active && Date.now() - (P.listenSince || 0) > 2500) {
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
// Can this device take spoken answers? (ElevenLabs Scribe or the browser's speech engine)
const canListen = () => Scribe.enabled() || !!SR;
function yourTurn() {
  if (P.phase !== "live" || !location.hash.startsWith("#practice")) return;
  if (!canListen() || P.typing || P.micBlocked) {
    setOrb("tap");
    return setStatus(!canListen() ? "Type your reply below." : P.micBlocked ? "Tap the mic to try again, or type below." : "Your turn — type below or tap the mic.", "warn");
  }
  // iPhone's browser speech engine needs a tap every turn; recording for Scribe usually doesn't.
  if (IS_IOS && !Scribe.enabled()) {
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
  if (P.sc?.clientId) deskRefresh();
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
    await Voice.speak(text, { persona: P.persona, gender: P.sc.counterpart.gender, seed: P.seed + P.sc.counterpart.name, onWord: (v) => Orb3D.current?.pulse(v) });
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
  if (!canListen()) return setStatus("Type your reply below.", "warn");
  P.listener?.stop();
  P.micBlocked = false;
  const youText = document.getElementById("lv-you-text");
  if (youText) youText.textContent = P.pending || "";
  P.listening = true;
  P.listenSince = Date.now();
  const initial = P.pending || "";
  P.pending = "";
  const cloud = Scribe.enabled();
  plog("mic on · " + (cloud ? "ElevenLabs Scribe" : "browser speech") + (initial ? " (continuing your answer)" : ""));
  const me = new (cloud ? CloudListener : Listener)({
    silenceMs: sendDelayMs(),
    initial,
    onText: (t) => {
      if (P.listener !== me) return;
      const el = document.getElementById("lv-you-text");
      if (el) el.textContent = t;
      LiveFX.heard();
    },
    onTurn: (text, duration, audio) => {
      if (P.listener !== me) return;
      P.transcribing = false;
      plog(`you said ${text.split(/\s+/).length} words in ${duration}s`);
      onMyTurn(text, duration, audio);
    },
    onState(s, err, kept) {
      if (P.listener !== me) return; // an old listener — ignore it
      if (s === "listening") {
        const d = getSettings().sendAfter || "3";
        setStatus(d === "tap" ? "Listening… tap the mic (or Send now) when you're done." : `Listening… take your time — it sends after a ${d}-second pause.`, "live");
        setOrb("live");
        P.netRetries = 0;
      }
      if (s === "transcribing") {
        P.transcribing = true;
        setStatus("Transcribing…");
        setOrb("thinking");
        return;
      }
      if (s === "stt-failed") {
        plog("transcription failed: " + err);
        P.listening = P.transcribing = false;
        Scribe.fails = (Scribe.fails || 0) + 1;
        if (Scribe.fails >= 2 && !Scribe.broken) Scribe.broken = err;
        toast(Scribe.broken ? err + " Switching to the browser's speech recognition." : err + " Trying again next turn.");
        setOrb("tap");
        setStatus("Sorry — I didn't catch that. Tap the mic and say it again.", "warn");
        return;
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
  setStatus("Starting the mic…");
  P.nudged = false;
  me.start();
}

async function onMyTurn(text, duration, audio = null) {
  if (P.thinking || P.phase !== "live") return;
  P.listening = false;
  P.pending = "";
  P.thread.push({ from: "me", text, duration, audio });
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
      const timing = () => ({ elapsed: (Date.now() - P.started) / 60000, minutes: P.minutes });
      r = await AI.practiceTurn(P.sc, P.thread, P.kind, P.difficulty, timing()).catch((e) => (e.status === 401 || e.status === 403 || /credit/i.test(e.message) ? Promise.reject(e) : AI.practiceTurn(P.sc, P.thread, P.kind, P.difficulty, timing())));
      plog(`Claude replied in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (e) {
      plog("Claude failed: " + e.message);
      goOffline(e.message.replace(/[.—].*$/, "").trim() || "error");
    }
  }
  if (P.phase !== "live") return void (P.thinking = false);
  if (!r) {
    await wait(500); // a natural beat before the built-in partner answers
    r = OFFLINE.turn(P.sc, P.thread, P.kind, { elapsed: (Date.now() - P.started) / 60000, minutes: P.minutes, opts: P.setupOpts });
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
    return P.clientMeeting ? renderClientBrief() : renderPracticeSetup();
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
  // Client meeting: save what you learned and update the relationship.
  P.clientReport = null;
  if (P.sc.clientId) {
    P.clientReport = Clients.recordMeeting(P.sc.clientId, P);
    P.clientMeeting = null;
  }
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
      <div class="row">${live && P.sc?.clientId ? `<a class="btn primary" href="#client/${P.sc.clientId}">${icon("arrow")} Open ${esc(P.sc.counterpart.name.split(" ")[0])}'s file</a>` : live ? `<button class="btn primary" id="pr-again">${icon("refresh")} Practice again</button><button class="btn" id="pr-new">New setup</button>` : `<a class="btn" href="#practice">‹ Practice</a>`}</div></div>
    ${
      live && P.clientReport
        ? `<section class="card client-report"><div class="metrics">${metricCard("New facts collected", P.clientReport.found, `${P.clientReport.collected} of ${P.clientReport.total} total`, P.clientReport.found ? "good-text" : "warn-text")}${metricCard("Relationship", (P.clientReport.delta >= 0 ? "+" : "") + P.clientReport.delta, P.clientReport.rem.length ? "remembered " + P.clientReport.rem.join(", ") : "from this meeting", P.clientReport.delta >= 0 ? "good-text" : "bad-text")}</div></section>`
        : ""
    }
    <div class="result-grid">
      <section class="card score-hero">${ring(r.overall, { size: 132, label: r.overall })}<div><div class="k">Overall</div><p>${esc(r.outcome || "")}</p></div></section>
      <section class="card"><h2>Scores</h2>${r.categories.map((c) => `<div class="rubric-row"><div class="spread small"><strong>${esc(c.name)}</strong><span>${c.score}</span></div><div class="bar"><i style="width:${c.score}%"></i></div><div class="small muted">${esc(c.note)}</div></div>`).join("")}</section>
    </div>
    <section class="card"><h2>Delivery</h2>
      <div class="metrics">
        ${metricCard("Pace", m.wpm ? m.wpm + " wpm" : "—", m.wpm ? "Conversational: 130–160" : "Not enough timing data this session", toneOf(m.wpm >= 125 && m.wpm <= 170, !m.wpm || m.wpm))}
        ${metricCard("Filler words", m.fillersPer100 + " / 100 words", m.topFillers.length ? m.topFillers.map(([f, n]) => `“${f}” ×${n}`).join(", ") : "None detected", toneOf(m.fillersPer100 < 2, m.fillersPer100 < 4))}
        ${m.pitchVarSemis == null ? "" : metricCard("Pitch variation", m.pitchVarSemis != null ? m.pitchVarSemis + " semitones" : "—", m.pitchVarSemis != null ? (m.pitchVarSemis < 1.5 ? "Leaning monotone" : m.pitchVarSemis > 6 ? "Very animated" : "Expressive") : IS_IOS ? "Measured on PC/Mac" : "Not measured", toneOf(m.pitchVarSemis >= 1.5 && m.pitchVarSemis <= 6, m.pitchVarSemis == null))}
        ${m.volumeCv == null ? "" : metricCard("Volume steadiness", m.volumeCv != null ? (m.volumeCv < 0.6 ? "Steady" : m.volumeCv < 0.9 ? "Some swings" : "Uneven") : "—", m.volumeCv != null ? `variation ${m.volumeCv}` : IS_IOS ? "Measured on PC/Mac" : "Not measured", toneOf(m.volumeCv != null && m.volumeCv < 0.6, m.volumeCv == null || m.volumeCv < 0.9))}
        ${metricCard("Questions you asked", m.questionsAsked, X.kind === "interview" ? "Ask the interviewer at the end" : "Discovery questions build trust", toneOf(m.questionsAsked >= 3, m.questionsAsked >= 1))}
        ${metricCard("Hedging words", m.hedges, m.hedges ? "Lower is better — words like “I guess”, “maybe”, “kind of” weaken your point" : "None — you spoke with confidence. (Hedges are “I guess”, “maybe”, “kind of”.)", toneOf(m.hedges <= 1, m.hedges <= 3))}
        ${metricCard("Talk share", m.talkShare + "%", X.kind === "fpclient" || X.kind === "sales" ? "Listen more than you talk (≈40–55%)" : "Answers should carry the conversation", "")}
        ${m.longestPause == null ? "" : metricCard("Longest pause", m.longestPause + "s", "Brief pauses read as confident", "")}
      </div>
      <p>${esc(r.tone)}</p>
    </section>
    ${
      r.answers?.length
        ? `<section class="card"><h2>Answer by answer</h2><div class="answers">${r.answers
            .map((a, i) => `<div class="answer-row"><div class="ans-num">${i + 1}</div><div class="grow"><div class="small muted">${esc(a.prompt || "")}</div><div class="quote">“${esc(a.quote || "")}”</div><div class="small">${icon("bulb")} ${esc(a.tip || "")}</div></div>${ring(Math.round(a.score || 0), { size: 46 })}</div>`)
            .join("")}</div></section>`
        : ""
    }
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
  if (!live || P.sc?.clientId) return;
  document.getElementById("pr-again").onclick = (e) => {
    P.phase = "setup";
    startPractice(e.currentTarget, adaptiveLevel(practiceKind()));
  };
  document.getElementById("pr-new").onclick = () => {
    P.phase = "setup";
    renderPracticeSetup();
  };
}
