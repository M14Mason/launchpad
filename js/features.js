// Study (lessons, quizzes, networking role-play, voice mock interviews), college profile builder,
// outreach email drafts, and the AI new-program finder. Loaded before app.js; runs only after boot.

// =============== STUDY ===============
const TRACKS = [
  {
    id: "networking",
    name: "Networking",
    icon: "🤝",
    blurb: "Introduce yourself, write cold emails that get answers, and turn conversations into opportunities.",
    lessons: [
      "Why networking beats cold applying",
      "Your 30-second introduction",
      "Cold emails that actually get answered",
      "Talking to people at events and career fairs",
      "Ask for advice, not a job",
      "Following up without being annoying",
      "LinkedIn for a high schooler",
    ],
    practice: "roleplay",
  },
  {
    id: "python",
    name: "Python & coding",
    icon: "🐍",
    blurb: "Level up the skills behind your trading bot: clean code, data, APIs, testing and Git.",
    lessons: ["Writing clean functions", "Working with data in pandas", "APIs and JSON (like Alpaca)", "Testing your code with pytest", "Git and GitHub basics", "Building a backtest from scratch", "Debugging like a pro"],
  },
  {
    id: "ta",
    name: "Technical analysis",
    icon: "📈",
    blurb: "Go deeper on the indicators your bot uses — and the traps that fool backtests.",
    lessons: ["Trend, support and resistance", "Moving averages and EMA crossovers", "RSI and mean reversion", "ATR, volatility and stop placement", "Position sizing and risk/reward", "Backtesting traps: overfitting and look-ahead bias", "Reading a chart end to end"],
  },
  {
    id: "interview",
    name: "Interviewing",
    icon: "🎤",
    blurb: "Tell your story clearly with STAR, then practice out loud in a voice mock interview.",
    lessons: ["The STAR method", "Telling your trading-bot story", "Answering “Tell me about yourself”", "Questions to ask the interviewer"],
    practice: "mock",
  },
];
const PERSONAS = [
  { id: "fair", who: "an analyst at a mid-size investment firm staffing a booth", setting: "A college & career fair. Mason walks up to the booth.", label: "Analyst at a career-fair booth" },
  { id: "coord", who: "the coordinator of a competitive high-school finance summer program", setting: "A 10-minute phone call Mason scheduled after emailing about the program.", label: "Program coordinator (phone call)" },
  { id: "alum", who: "a Canyon Crest Academy graduate now in their first job at a fintech startup", setting: "A video chat Mason set up after messaging them on LinkedIn.", label: "Alum working in fintech (video chat)" },
  { id: "family", who: "a friend of Mason's family who works in wealth management", setting: "A family barbecue; Mason gets a few minutes to talk.", label: "Family friend in wealth management" },
];

function study() {
  return Object.assign({ lessons: {}, done: {}, roleplays: [], mocks: [] }, Store.get("study", {}));
}
function saveStudy(s) {
  Store.set("study", s);
}
const lessonKey = (t, i) => `${t}:${i}`;
function trackProgress(t) {
  const d = study().done;
  const n = t.lessons.filter((_, i) => d[lessonKey(t.id, i)]).length;
  return Math.round((n / t.lessons.length) * 100);
}

// Tiny, safe formatter for lesson text: ``` code fences, `inline code`, **bold**, paragraphs.
function richText(s) {
  const parts = String(s || "").split(/```(?:\w+)?\n?([\s\S]*?)```/g);
  return parts
    .map((p, i) =>
      i % 2
        ? `<pre class="code"><code>${esc(p.replace(/\n$/, ""))}</code></pre>`
        : p
            .split(/\n{2,}/)
            .filter((x) => x.trim())
            .map((para) => `<p>${esc(para).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")}</p>`)
            .join("")
    )
    .join("");
}

function renderStudy() {
  const s = study();
  const lastRp = s.roleplays[0];
  const lastMock = s.mocks[0];
  app.innerHTML = `
    <div class="page-head"><div><h1>Study</h1><p class="muted">Short lessons, quick quizzes and live practice — built around your projects and goals.</p></div></div>
    <div class="grid cards2">${TRACKS.map((t) => {
      const p = trackProgress(t);
      return `<a class="card track" href="#study/${t.id}">
        <div class="spread"><div class="track-icon">${t.icon}</div>${ring(p, { size: 54, tone: p >= 70 ? "good" : "accent" })}</div>
        <h2>${t.name}</h2><p class="small muted">${t.blurb}</p>
        <div class="small">${t.lessons.length} lessons${t.practice === "roleplay" ? " · live conversation practice" : t.practice === "mock" ? " · voice mock interview" : ""}</div></a>`;
    }).join("")}</div>
    <div class="grid cards2">
      <a class="card practice-cta" href="#roleplay"><div class="track-icon">💬</div><div><h3>Practice a networking conversation</h3><p class="small muted">${lastRp ? `Last score ${lastRp.score}/10 — ${esc(lastRp.label)}` : "Claude plays a real person; you get a coaching tip after every message."}</p></div><span class="chev">›</span></a>
      <a class="card practice-cta" href="#mock"><div class="track-icon">🎙️</div><div><h3>Voice mock interview</h3><p class="small muted">${lastMock ? `Last average ${lastMock.avg}/10` : "Answer out loud; get timed, transcribed and scored."}</p></div><span class="chev">›</span></a>
    </div>`;
}

function renderTrack(id) {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) return (app.innerHTML = empty(`Track not found. <a href="#study">Back</a>`));
  const s = study();
  app.innerHTML = `
    <a class="back" href="#study">‹ Study</a>
    <div class="page-head"><div><div class="eyebrow dark">${t.icon} Track</div><h1>${t.name}</h1><p class="muted">${t.blurb}</p></div>${ring(trackProgress(t), { size: 84, tone: "accent" })}</div>
    <div class="list">${t.lessons
      .map((title, i) => {
        const d = s.done[lessonKey(t.id, i)];
        return `<a class="list-row card" href="#lesson/${t.id}/${i}"><div class="lesson-num ${d ? "done" : ""}">${d ? "✓" : i + 1}</div><div class="grow"><div class="row-title">${esc(title)}</div><div class="small muted">${d ? `Quiz ${d.score}/3` : s.lessons[lessonKey(t.id, i)] ? "Ready to read" : "~5 min"}</div></div><span class="chev">›</span></a>`;
      })
      .join("")}</div>
    ${t.practice === "roleplay" ? `<a class="btn primary" href="#roleplay">💬 Practice a networking conversation</a>` : t.practice === "mock" ? `<a class="btn primary" href="#mock">🎙️ Start a voice mock interview</a>` : ""}`;
}

function renderLesson(arg) {
  const [tid, idxStr] = arg.split("/");
  const t = TRACKS.find((x) => x.id === tid);
  const i = +idxStr;
  if (!t || !t.lessons[i]) return (app.innerHTML = empty(`Lesson not found. <a href="#study">Back</a>`));
  const key = lessonKey(t.id, i);
  const s = study();
  const L = s.lessons[key];
  const next = i + 1 < t.lessons.length ? `#lesson/${t.id}/${i + 1}` : `#study/${t.id}`;
  app.innerHTML = `
    <a class="back" href="#study/${t.id}">‹ ${t.name}</a>
    <article class="card lesson">
      <div class="eyebrow dark">${t.icon} Lesson ${i + 1} of ${t.lessons.length}</div>
      <h1>${esc(t.lessons[i])}</h1>
      <div id="lesson-body">${
        L
          ? lessonHTML(L, key)
          : AI.enabled()
            ? `<div class="skeleton"><span class="spinner"></span> Writing your lesson…</div>`
            : `<p class="muted">Lessons are written by Claude — add your API key in <a href="#settings">Settings</a>.</p>`
      }</div>
    </article>
    <div class="row lesson-nav"><a class="btn" href="#study/${t.id}">All lessons</a><a class="btn primary" href="${next}">${i + 1 < t.lessons.length ? "Next lesson ›" : "Finish track"}</a></div>`;
  if (L) return wireLesson(L, key);
  if (!AI.enabled()) return;
  AI.lesson(t, t.lessons[i])
    .then((lesson) => {
      const st = study();
      st.lessons[key] = lesson;
      saveStudy(st);
      const body = document.getElementById("lesson-body");
      if (!body || location.hash !== `#lesson/${t.id}/${i}`) return;
      body.innerHTML = lessonHTML(lesson, key);
      wireLesson(lesson, key);
      Motion.reveal(body);
    })
    .catch((e) => {
      const body = document.getElementById("lesson-body");
      if (body) body.innerHTML = `<p class="bad-text">${esc(e.message)}</p><button class="btn" onclick="route()">Try again</button>`;
    });
}

function lessonHTML(L, key) {
  const done = study().done[key];
  return `
    <p class="lead">${esc(L.intro)}</p>
    ${L.sections.map((x) => `<h2>${esc(x.heading)}</h2>${richText(x.body)}`).join("")}
    ${L.example ? `<div class="callout"><strong>Example</strong>${richText(L.example)}</div>` : ""}
    ${L.keyPoints?.length ? `<h2>Key points</h2><ul class="keypoints">${L.keyPoints.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : ""}
    <h2>Quick quiz</h2>
    <div id="quiz">${L.quiz
      .map(
        (q, qi) => `<div class="quiz-q" data-q="${qi}"><p><strong>${qi + 1}. ${esc(q.q)}</strong></p>
          ${q.options.map((o, oi) => `<button class="quiz-opt" data-qi="${qi}" data-oi="${oi}">${esc(o)}</button>`).join("")}
          <div class="small quiz-why"></div></div>`
      )
      .join("")}</div>
    ${L.practice ? `<div class="callout practice"><strong>Practice this week</strong><p>${esc(L.practice)}</p></div>` : ""}
    ${done ? `<p class="good-text small">✓ Completed — quiz ${done.score}/3</p>` : ""}`;
}

function wireLesson(L, key) {
  const answers = {};
  document.querySelectorAll(".quiz-opt").forEach((b) =>
    b.addEventListener("click", () => {
      const qi = +b.dataset.qi;
      if (qi in answers) return;
      const oi = +b.dataset.oi;
      const q = L.quiz[qi];
      answers[qi] = oi === q.answer;
      const box = b.closest(".quiz-q");
      box.querySelectorAll(".quiz-opt").forEach((x) => {
        x.disabled = true;
        if (+x.dataset.oi === q.answer) x.classList.add("right");
      });
      if (oi !== q.answer) b.classList.add("wrong");
      box.querySelector(".quiz-why").textContent = (oi === q.answer ? "✓ Correct. " : "✗ Not quite. ") + (q.why || "");
      if (Object.keys(answers).length === L.quiz.length) {
        const score = Object.values(answers).filter(Boolean).length;
        const s = study();
        s.done[key] = { score, at: Date.now() };
        saveStudy(s);
        toast(`Lesson complete — ${score}/${L.quiz.length} on the quiz.`);
      }
    })
  );
}

// ---------- networking role-play ----------
let rp = null;
function renderRoleplay() {
  const s = study();
  if (!rp)
    return (app.innerHTML = `
      <a class="back" href="#study/networking">‹ Networking</a>
      <div class="page-head"><div><h1>Practice a conversation</h1><p class="muted">Claude plays a real person. Introduce yourself and keep the conversation going — you'll get a tip after every message and a score at the end.</p></div></div>
      ${AI.enabled() ? "" : `<div class="notice info">Needs your Claude API key — add it in <a href="#settings">Settings</a>.</div>`}
      <div class="grid cards2">${PERSONAS.map((p) => `<button class="card clickable persona" data-persona="${p.id}"><h3>${p.label}</h3><p class="small muted">${esc(p.setting)}</p></button>`).join("")}</div>
      ${s.roleplays.length ? `<section class="card"><h2>Recent practice</h2>${s.roleplays.slice(0, 5).map((r) => `<div class="kv"><span>${esc(r.label)} · ${new Date(r.at).toLocaleDateString()}</span><strong>${r.score}/10</strong></div>`).join("")}</section>` : ""}`,
    app.querySelectorAll("[data-persona]").forEach((b) =>
      b.addEventListener("click", () => {
        if (!AI.enabled()) return toast("Add your API key in Settings first.");
        rp = { persona: PERSONAS.find((p) => p.id === b.dataset.persona), thread: [], tips: {}, feedback: null };
        renderRoleplay();
      })
    ));

  const { persona, thread, tips, feedback } = rp;
  app.innerHTML = `
    <a class="back" href="#roleplay" id="rp-exit">‹ Choose someone else</a>
    <div class="coach">
      <aside class="card coach-side">
        <div class="track-icon big">💬</div><h2>${esc(persona.label)}</h2>
        <p class="small muted">${esc(persona.setting)}</p>
        <div class="callout small"><strong>Goal</strong><p>Introduce yourself, show genuine curiosity, and end with one small, specific ask (a tip, a follow-up, an email).</p></div>
        ${thread.length >= 4 && !feedback ? `<button class="btn primary block" id="rp-finish">Finish & get feedback</button>` : ""}
        ${
          feedback
            ? `<div class="rp-score">${ring(feedback.score * 10, { size: 96, label: feedback.score + "/10", tone: feedback.score >= 7 ? "good" : "accent" })}</div>
               <p><strong>${esc(feedback.verdict)}</strong></p>
               <h4>What worked</h4><ul class="small">${feedback.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
               <h4>Try next time</h4><ul class="small">${feedback.fixes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
               ${feedback.betterLine ? `<div class="callout small"><strong>Stronger line</strong><p>${esc(feedback.betterLine)}</p></div>` : ""}
               <button class="btn block" id="rp-again">Practice again</button>`
            : ""
        }
      </aside>
      <section class="card chat">
        <div class="thread" id="thread">
          <div class="msg system">${esc(persona.setting)} You start.</div>
          ${thread.map((m, i) => `<div class="msg ${m.from === "me" ? "me" : "coach"}">${esc(m.text)}</div>${tips[i] ? `<div class="tip">💡 ${esc(tips[i])}</div>` : ""}`).join("")}
        </div>
        ${feedback ? "" : `<div class="composer"><textarea id="answer" placeholder="${thread.length ? "Your reply…" : "Hi! I'm Mason, a sophomore at Canyon Crest…"}"></textarea><div class="row"><button class="btn primary" id="send">Send</button>${Speech ? `<button class="btn ghost small" id="mic">🎤</button>` : ""}</div></div>`}
      </section>
    </div>`;
  const th = document.getElementById("thread");
  th.scrollTop = th.scrollHeight;
  document.getElementById("rp-exit").addEventListener("click", () => (rp = null));
  document.getElementById("rp-again")?.addEventListener("click", () => {
    rp = { persona, thread: [], tips: {}, feedback: null };
    renderRoleplay();
  });
  const ta = document.getElementById("answer");
  document.getElementById("mic")?.addEventListener("click", (e) => dictate(ta, e.currentTarget));
  ta?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("send").click();
    }
  });
  document.getElementById("send")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const text = ta.value.trim();
      if (!text) return;
      thread.push({ from: "me", text });
      renderRoleplay();
      const r = await AI.roleplayTurn(persona, thread);
      tips[thread.length - 1] = r.tip;
      thread.push({ from: "them", text: r.reply });
      renderRoleplay();
      document.getElementById("answer")?.focus();
    })
  );
  document.getElementById("rp-finish")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      rp.feedback = await AI.roleplayFeedback(persona, thread);
      const s = study();
      s.roleplays.unshift({ label: persona.label, score: rp.feedback.score, at: Date.now() });
      s.roleplays = s.roleplays.slice(0, 20);
      saveStudy(s);
      renderRoleplay();
    })
  );
}

// ---------- voice mock interview ----------
let mock = null;
function mockQuestions(roleId) {
  const found = roleId && findRole(roleId);
  const role = found ? { ...found.r, org: found.r.org || found.c.name } : { category: "finance", keywords: TYPICAL_KEYWORDS.finance, title: "Finance internship", org: "General" };
  const resume = buildResume(role, getBank(), getSettings());
  return { role, qs: [{ type: "Opener", q: "Tell me about yourself.", points: PROFILE.summary }, ...interviewQuestions(role, resume)] };
}
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    speechSynthesis.speak(u);
  } catch {}
}

function renderMock() {
  if (!mock) {
    const tracked = Object.entries(tracker())
      .map(([id]) => findRole(id))
      .filter(Boolean);
    app.innerHTML = `
      <a class="back" href="#study/interview">‹ Interviewing</a>
      <div class="page-head"><div><h1>Voice mock interview</h1><p class="muted">4 questions. Each one is read aloud; answer out loud (or type), then get scored. Aim for 1–2 minutes per answer.</p></div></div>
      ${Speech ? "" : `<div class="notice info">Voice input isn't supported in this browser — you can type your answers instead. (Chrome, Edge and Safari support voice.)</div>`}
      ${AI.enabled() ? "" : `<div class="notice info">Scoring needs your Claude API key — add it in <a href="#settings">Settings</a>.</div>`}
      <div class="card"><label class="field"><span>Interview for</span><select id="mock-role">
        <option value="">General finance internship</option>
        ${tracked.map(({ r, c }) => `<option value="${r.id}">${esc((r.org || c.name) + " — " + r.title)}</option>`).join("")}
      </select></label>
      <button class="btn primary" id="mock-start">Start interview</button></div>
      ${study().mocks.length ? `<section class="card"><h2>Past interviews</h2>${study().mocks.slice(0, 5).map((m) => `<div class="kv"><span>${esc(m.label)} · ${new Date(m.at).toLocaleDateString()}</span><strong>${m.avg}/10</strong></div>`).join("")}</section>` : ""}`;
    document.getElementById("mock-start").addEventListener("click", () => {
      const { role, qs } = mockQuestions(document.getElementById("mock-role").value);
      mock = { role, qs, i: 0, results: [], phase: "ask", transcript: "", started: 0 };
      renderMock();
    });
    return;
  }

  const { qs, i, results } = mock;
  if (i >= qs.length) {
    const scored = results.filter((r) => r.score);
    const avg = scored.length ? Math.round((scored.reduce((n, r) => n + r.score, 0) / scored.length) * 10) / 10 : 0;
    if (!mock.saved && scored.length) {
      const s = study();
      s.mocks.unshift({ label: mock.role.org === "General" ? "General finance" : mock.role.org, avg, at: Date.now() });
      s.mocks = s.mocks.slice(0, 20);
      saveStudy(s);
      mock.saved = true;
    }
    app.innerHTML = `
      <div class="card mock-done">
        ${ring(avg * 10, { size: 120, label: avg + "/10", tone: avg >= 7 ? "good" : "accent" })}
        <h1>Interview complete</h1><p class="muted">${esc(mock.role.org === "General" ? "General finance internship" : mock.role.org + " — " + mock.role.title)}</p>
      </div>
      ${results.map((r, k) => `<section class="card"><div class="spread"><h3>${esc(qs[k].q)}</h3><strong>${r.score ? r.score + "/10" : "—"}</strong></div><p class="small muted">${r.seconds}s · ${r.words} words</p><details><summary>Your answer & feedback</summary><p class="small">${esc(r.answer)}</p><div class="ai-out">${esc(r.feedback || "")}</div></details></section>`).join("")}
      <div class="row"><button class="btn primary" id="mock-again">New interview</button><a class="btn" href="#study">Back to Study</a></div>`;
    document.getElementById("mock-again").addEventListener("click", () => {
      mock = null;
      renderMock();
    });
    return;
  }

  const q = qs[i];
  app.innerHTML = `
    <div class="mock-top"><span class="pill">Question ${i + 1} of ${qs.length}</span><button class="linkbtn small" id="mock-quit">End interview</button></div>
    <div class="card mock-card">
      <span class="pill">${esc(q.type)}</span>
      <h1 class="mock-q">${esc(q.q)}</h1>
      <div class="mock-timer" id="mock-timer">0:00</div>
      <textarea id="mock-text" placeholder="${Speech ? "Tap the mic and answer out loud — your words appear here. You can also type." : "Type your answer…"}">${esc(mock.transcript)}</textarea>
      <div class="row center">
        ${Speech ? `<button class="btn mic-btn" id="mock-mic">🎤 Start answering</button>` : ""}
        <button class="btn primary" id="mock-submit">Submit answer</button>
        <button class="btn ghost small" id="mock-repeat">🔊 Repeat question</button>
      </div>
      <details><summary class="small">Talking points from your data</summary><ul class="small">${q.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></details>
      <div id="mock-out"></div>
    </div>`;
  speak(q.q);
  const ta = document.getElementById("mock-text");
  const timerEl = document.getElementById("mock-timer");
  mock.started = Date.now();
  clearInterval(renderMock._t);
  renderMock._t = setInterval(() => {
    if (!document.getElementById("mock-timer")) return clearInterval(renderMock._t);
    const s = Math.floor((Date.now() - mock.started) / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    timerEl.classList.toggle("long", s > 150);
  }, 500);
  document.getElementById("mock-repeat").addEventListener("click", () => speak(q.q));
  document.getElementById("mock-quit").addEventListener("click", () => {
    if (dictate.rec) dictate.rec.stop();
    mock.i = qs.length;
    renderMock();
  });
  document.getElementById("mock-mic")?.addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("live", !dictate.rec);
    dictate(ta, e.currentTarget);
  });
  document.getElementById("mock-submit").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      if (dictate.rec) dictate.rec.stop();
      const answer = ta.value.trim();
      if (!answer) return toast("Answer out loud or type something first.");
      const seconds = Math.round((Date.now() - mock.started) / 1000);
      const words = answer.split(/\s+/).length;
      let feedback = "";
      let score = 0;
      if (AI.enabled()) {
        feedback = await AI.scoreAnswer(q.q, answer);
        score = +((feedback.match(/(\d+(?:\.\d)?)\s*\/\s*10/) || [])[1] || 0);
      }
      results.push({ answer, seconds, words, feedback, score });
      document.getElementById("mock-out").innerHTML = `<div class="ai-out">${esc(feedback || "Add an API key in Settings for scored feedback.")}</div><button class="btn primary block" id="mock-next">${mock.i + 1 < qs.length ? "Next question ›" : "See results"}</button>`;
      document.getElementById("mock-submit").disabled = true;
      document.getElementById("mock-next").addEventListener("click", () => {
        mock.i++;
        mock.transcript = "";
        renderMock();
      });
    })
  );
}

// =============== COLLEGE PROFILE ===============
function renderCollegeProfile() {
  const p = collegeProfile();
  const save = () => Store.set("collegeProfile", p);
  const sel = (path, val, opts) => `<select data-path="${path}">${opts.map(([v, l]) => `<option value="${v}" ${val === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const preview = ["col-uc-san-diego", "col-ucla", "col-usc"].map((id) => COLLEGES.find((c) => c.id === id)).filter(Boolean);
  app.innerHTML = `
    <a class="back" href="#colleges">‹ Colleges</a>
    <div class="page-head"><div><h1>College profile</h1><p class="muted">Log what isn't in your resume data yet. Your college chances update instantly. These entries are only used for college estimates — never added to resumes.</p></div></div>
    <div class="preview-strip">${preview.map((c) => { const ch = collegeChance(c); return `<div class="card mini"><div class="small muted">${esc(c.name)}</div><strong>${ch.chance}%</strong><span class="small muted"> · potential ${ch.potential}%</span></div>`; }).join("")}</div>

    <section class="card"><div class="section-head"><h2>Honors / AP / IB courses</h2><button class="btn small" data-add="courses">+ Add course</button></div>
      <p class="small muted">Math 1 Honors (from your data) is already counted.</p>
      ${p.courses.map((c, i) => `<div class="prow"><input type="text" data-path="courses.${i}.name" value="${esc(c.name)}" placeholder="e.g. AP Calculus BC">${sel(`courses.${i}.type`, c.type, [["AP", "AP"], ["Honors", "Honors"], ["IB", "IB"], ["Dual", "Dual enrollment"]])}${sel(`courses.${i}.status`, c.status, [["done", "Done"], ["taking", "Taking now"], ["planned", "Planned"]])}<button class="btn ghost small" data-del="courses.${i}">✕</button></div>`).join("") || `<p class="small muted">None yet.</p>`}
    </section>

    <section class="card"><h2>Test scores</h2>
      <div class="grid cards3">
        <label class="field"><span>SAT (400–1600)</span><input type="text" inputmode="numeric" data-path="tests.sat" value="${esc(p.tests.sat)}" placeholder="—"></label>
        <label class="field"><span>ACT (1–36)</span><input type="text" inputmode="numeric" data-path="tests.act" value="${esc(p.tests.act)}" placeholder="—"></label>
        <label class="field"><span>PSAT (practice)</span><input type="text" inputmode="numeric" data-path="tests.psat" value="${esc(p.tests.psat)}" placeholder="—"></label>
      </div>
      <p class="small muted">UCs are test-blind. Leave blank until you have a real score.</p>
    </section>

    <section class="card"><div class="section-head"><h2>Activities</h2><button class="btn small" data-add="activities">+ Add activity</button></div>
      <p class="small muted">Clubs, sports (boxing, soccer), jobs, volunteering, your own projects. Hours make commitment visible.</p>
      ${p.activities.map((a, i) => `<div class="activity">
          <div class="prow"><input type="text" data-path="activities.${i}.name" value="${esc(a.name)}" placeholder="Activity (e.g. Investing Club)"><input type="text" data-path="activities.${i}.role" value="${esc(a.role)}" placeholder="Your role"><button class="btn ghost small" data-del="activities.${i}">✕</button></div>
          <div class="prow"><label class="mini-field">Hrs/week<input type="text" inputmode="decimal" data-path="activities.${i}.hrsWeek" value="${esc(a.hrsWeek)}"></label><label class="mini-field">Weeks/yr<input type="text" inputmode="numeric" data-path="activities.${i}.weeksYear" value="${esc(a.weeksYear)}"></label><label class="mini-field">Years<input type="text" inputmode="numeric" data-path="activities.${i}.years" value="${esc(a.years)}"></label><label class="check"><input type="checkbox" data-path="activities.${i}.leader" ${a.leader ? "checked" : ""}> Leadership role</label></div>
        </div>`).join("") || `<p class="small muted">None yet.</p>`}
    </section>

    <section class="card"><div class="section-head"><h2>Other awards</h2><button class="btn small" data-add="awards">+ Add award</button></div>
      <p class="small muted">Your two photography awards are already counted.</p>
      ${p.awards.map((a, i) => `<div class="prow"><input type="text" data-path="awards.${i}.name" value="${esc(a.name)}" placeholder="Award name">${sel(`awards.${i}.level`, a.level, [["school", "School"], ["regional", "Regional"], ["state", "State"], ["national", "National"]])}<button class="btn ghost small" data-del="awards.${i}">✕</button></div>`).join("") || `<p class="small muted">None yet.</p>`}
    </section>`;

  const blank = { courses: { name: "", type: "AP", status: "taking" }, activities: { name: "", role: "", hrsWeek: "", weeksYear: "", years: "", leader: false }, awards: { name: "", level: "regional" } };
  const setPath = (path, val) => {
    const keys = path.split(".");
    let o = p;
    keys.slice(0, -1).forEach((k) => (o = o[k]));
    o[keys.at(-1)] = val;
  };
  const refreshPreview = () => {
    const strip = app.querySelector(".preview-strip");
    if (strip) strip.innerHTML = preview.map((c) => { const ch = collegeChance(c); return `<div class="card mini"><div class="small muted">${esc(c.name)}</div><strong>${ch.chance}%</strong><span class="small muted"> · potential ${ch.potential}%</span></div>`; }).join("");
  };
  app.querySelectorAll("[data-path]").forEach((el) =>
    el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
      setPath(el.dataset.path, el.type === "checkbox" ? el.checked : el.value.trim());
      save();
      refreshPreview();
    })
  );
  app.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", () => {
      p[b.dataset.add].push({ ...blank[b.dataset.add] });
      save();
      rerenderKeepScroll();
    })
  );
  app.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => {
      const [list, i] = b.dataset.del.split(".");
      p[list].splice(+i, 1);
      save();
      rerenderKeepScroll();
    })
  );
}

// =============== OUTREACH ===============
const OUTREACH_TO = ["The program coordinator", "Someone who works there", "An alum from my school", "A past participant"];
const OUTREACH_WHY = ["Ask a specific question about the program", "Ask for a 15-minute advice chat", "Follow up after applying", "Say thank you after an interview"];

function outreachPanelHTML(r) {
  return `<section class="card" id="outreach-card">
    <div class="section-head"><h2>Reach out</h2><a class="small" href="#study/networking">Learn networking ›</a></div>
    <p class="small muted">A short, genuine email can turn an application into a conversation. Claude drafts it from your real data — you review and send it yourself.</p>
    <div class="grid cards2">
      <label class="field"><span>Who</span><select id="o-to">${OUTREACH_TO.map((x) => `<option>${x}</option>`).join("")}</select></label>
      <label class="field"><span>Why</span><select id="o-why">${OUTREACH_WHY.map((x) => `<option>${x}</option>`).join("")}</select></label>
      <label class="field"><span>Their name (optional)</span><input type="text" id="o-name" placeholder="e.g. Ms. Lee"></label>
      <label class="field"><span>Their email (optional)</span><input type="email" id="o-email" placeholder="name@company.com" autocomplete="off"></label>
    </div>
    <label class="field"><span>Context (optional)</span><input type="text" id="o-ctx" placeholder="e.g. found them on LinkedIn; met at the career fair"></label>
    ${AI.enabled() ? `<button class="btn primary" id="o-go">✨ Draft email</button>` : `<p class="small muted">Add your API key in <a href="#settings">Settings</a> to draft emails.</p>`}
    <div id="o-out"></div>
  </section>`;
}

function wireOutreachPanel(r, rerender) {
  const $ = (id) => document.getElementById(id);
  $("o-go")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const d = await AI.draftOutreach(r, $("o-to").value, $("o-name").value.trim(), $("o-ctx").value.trim(), $("o-why").value);
      const chk = writingCheck(d.body);
      $("o-out").innerHTML = `
        <label class="field mt-s"><span>Subject</span><input type="text" id="o-subj" value="${esc(d.subject || "")}"></label>
        <label class="field"><span>Email — edit until it sounds like you</span><textarea id="o-body" class="essay-box">${esc(d.body)}</textarea></label>
        ${chk.bad.length ? `<p class="small bad-text">⚠ Fact-check: ${chk.bad.map((n) => `“${esc(n)}”`).join(", ")} isn't in your data.</p>` : `<p class="small good-text">✓ Fact-check passed.</p>`}
        ${chk.placeholders ? `<p class="small">✎ Fill in the [bracketed] parts before sending.</p>` : ""}
        <div class="row"><button class="btn primary" id="o-mail">Open in email app</button><button class="btn" id="o-copy">Copy</button><button class="btn" id="o-save">Save draft</button></div>`;
      $("o-mail").onclick = () => {
        if (/\[[^\]]+\]/.test($("o-body").value) && !confirm("There are still [bracketed] parts to fill in. Open anyway?")) return;
        location.href = `mailto:${encodeURIComponent($("o-email").value.trim())}?subject=${encodeURIComponent($("o-subj").value)}&body=${encodeURIComponent($("o-body").value)}`;
      };
      $("o-copy").onclick = () => navigator.clipboard.writeText(`Subject: ${$("o-subj").value}\n\n${$("o-body").value}`).then(() => toast("Copied."), () => toast("Copy blocked — select the text and copy it."));
      $("o-save").onclick = () => {
        saveEssay(r.id, { id: uid(), kind: "outreach", prompt: `${$("o-to").value} — ${$("o-why").value}`, text: `Subject: ${$("o-subj").value}\n\n${$("o-body").value}`, ts: Date.now() });
        toast("Saved with your application drafts.");
        rerender();
      };
    })
  );
}

// =============== NEW-PROGRAM FINDER ===============
function openProgramFinder() {
  modalBody.innerHTML = `
    <div class="spread"><h2>Find new programs</h2><button class="btn ghost" data-close>✕</button></div>
    <p class="muted">Claude searches the web for real ${esc(GOALS[goal()].label.toLowerCase())} programs you could apply to that aren't in your list yet. Takes about a minute.</p>
    ${AI.enabled() ? `<button class="btn primary" id="pf-go">✨ Search now</button>` : `<p>Add your API key in <a href="#settings">Settings</a> first.</p>`}
    <div id="pf-out"></div>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector("[data-close]").onclick = () => modal.close();
  document.getElementById("pf-go")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const existing = [...new Set(allRoles().map(({ r, c }) => `${r.org || c.name} ${r.title}`))];
      const have = new Set(existing.map((x) => x.toLowerCase()));
      const found = (await AI.findNewPrograms(GOALS[goal()].label, existing)).filter((x) => !have.has(`${x.org} ${x.title}`.toLowerCase()));
      const out = document.getElementById("pf-out");
      if (!found.length) return (out.innerHTML = `<p class="muted mt-s">No new verifiable programs found this time — try again later.</p>`);
      out.innerHTML = `<p class="small muted mt-s">Found ${found.length}. Check the ones to add — each links to its official page so you can verify it.</p>
        ${found.map((x, i) => `<label class="pf-item card"><input type="checkbox" data-pf="${i}" ${x.status !== "ineligible" ? "checked" : ""}><div><strong>${esc(x.org)}</strong> — ${esc(x.title)}<div class="small muted">${esc([x.kind, x.location, x.pay, x.deadline && "Deadline: " + x.deadline].filter(Boolean).join(" · "))}</div><div class="small">${statusBadge(["eligible", "soon", "ineligible", "check"].includes(x.status) ? x.status : "check")} ${esc(x.reason || "")}</div><a class="small" href="${esc(x.url)}" target="_blank" rel="noopener">Official page ↗</a></div></label>`).join("")}
        <button class="btn primary" id="pf-add">Add selected</button>`;
      document.getElementById("pf-add").onclick = () => {
        const picked = found.filter((_, i) => document.querySelector(`[data-pf="${i}"]`).checked);
        if (!picked.length) return toast("Pick at least one.");
        const list = Store.get("aiCompanies", []);
        for (const x of picked) {
          const field = ["finance", "business", "tech", "research"].includes(x.field) ? x.field : "finance";
          const tier = RATE_TIERS[x.selectivity] ? x.selectivity : "selective";
          const role = {
            id: "ai-" + uid(),
            org: x.org,
            title: x.title,
            kind: ["internship", "research", "program", "competition"].includes(x.kind) ? x.kind : "program",
            field,
            category: { finance: "finance", business: "finance", tech: "tech", research: "tech" }[field],
            location: x.location || "",
            mode: x.mode || "",
            pay: x.pay || "",
            deadline: x.deadline || "",
            url: x.url,
            about: x.about || "",
            rate: { v: RATE_TIERS[tier], src: "estimate", tier },
            eligibility: { status: ["eligible", "soon", "ineligible", "check"].includes(x.status) ? x.status : "check", reason: `${x.reason || ""} Found by AI web search — verify on the official page.${x.acceptance ? " Published: " + x.acceptance : ""}`.trim() },
            keywords: TYPICAL_KEYWORDS[field],
          };
          const co = list.find((c) => c.name.toLowerCase() === x.org.toLowerCase());
          if (co) co.roles.push(role);
          else list.push({ id: "co-" + uid(), name: x.org, blurb: "Found by AI web search", roles: [role], ai: true });
        }
        Store.set("aiCompanies", list);
        modal.close();
        toast(`Added ${picked.length} program${picked.length === 1 ? "" : "s"}.`);
        route();
      };
    })
  );
}
