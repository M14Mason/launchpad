// Study (lessons, quizzes, networking role-play, voice mock interviews), college profile builder,
// outreach email drafts, and the AI new-program finder. Loaded before app.js; runs only after boot.

// =============== STUDY ===============
const TRACKS = [
  {
    id: "networking",
    name: "Networking",
    icon: "users",
    blurb: "Introduce yourself, write cold emails that get answers, and turn conversations into opportunities.",
    // New lessons are appended so saved progress (keyed by position) stays valid.
    lessons: ["Why networking beats cold applying", "Your 30-second introduction", "Cold emails that actually get answered", "Talking to people at events and career fairs", "Ask for advice, not a job", "Following up without being annoying", "LinkedIn for a high schooler", "Your elevator pitch for finance roles", "Informational interviews: questions that impress", "Asking a teacher or mentor for a recommendation", "Keeping relationships warm over months and years"],
    practice: "networking",
  },
  {
    id: "finance",
    name: "Finance fundamentals",
    icon: "briefcase",
    blurb: "The core ideas every finance interviewer expects: markets, statements, valuation, rates and risk.",
    lessons: ["How the stock market actually works", "Reading an income statement", "Balance sheets and cash flow", "Valuation basics: P/E, EV/EBITDA and DCF", "Interest rates, inflation and the Fed", "Diversification and portfolio risk", "Options basics: calls, puts and risk", "How banks, hedge funds and asset managers make money", "Bonds and the yield curve", "What moves a stock on earnings day", "Market structure: exchanges, market makers and order types", "Behavioral finance: the biases that cost investors money"],
  },
  {
    id: "planning",
    name: "Financial planning",
    icon: "target",
    blurb: "Budgeting, saving, investing and retirement — and how to talk to a real client about money.",
    lessons: ["Budgeting and the 50/30/20 rule", "Emergency funds and short-term savings", "Compound interest and starting early", "Risk tolerance and time horizon", "Roth IRA, 401(k) and tax-advantaged accounts", "Index funds vs. picking stocks", "Running a first client meeting: discovery questions", "Explaining money without jargon", "Insurance basics: what a planner checks", "Taxes 101 for a planner", "Saving for college: 529 plans", "Building a simple financial plan, start to finish"],
    practice: "fp",
  },
  {
    id: "quant",
    name: "Algorithmic trading",
    icon: "code",
    blurb: "Take your bot further: rigorous backtests, realistic costs, risk metrics and live vs. paper trading.",
    lessons: ["From trading idea to testable rule", "Walk-forward and out-of-sample testing", "Transaction costs, slippage and fills", "Risk metrics: Sharpe, drawdown and win rate", "Paper trading vs. live trading with Alpaca", "Avoiding overfitting with simpler strategies", "Logging and monitoring a bot that runs all day", "Mean reversion vs. momentum strategies", "Portfolio-level risk across many positions", "Market regimes and when strategies stop working"],
  },
  {
    id: "python",
    name: "Python & coding",
    icon: "code",
    blurb: "Level up the skills behind your trading bot: clean code, data, APIs, testing and Git.",
    lessons: ["Writing clean functions", "Working with data in pandas", "APIs and JSON (like Alpaca)", "Testing your code with pytest", "Git and GitHub basics", "Building a backtest from scratch", "Debugging like a pro", "Classes and structure for a bigger bot", "Scheduling and async: running code all day", "Charts with matplotlib", "Building a small API with Flask"],
  },
  {
    id: "ta",
    name: "Technical analysis",
    icon: "trend",
    blurb: "Go deeper on the indicators your bot uses — and the traps that fool backtests.",
    lessons: ["Trend, support and resistance", "Moving averages and EMA crossovers", "RSI and mean reversion", "ATR, volatility and stop placement", "Position sizing and risk/reward", "Backtesting traps: overfitting and look-ahead bias", "Reading a chart end to end", "Volume and VWAP", "Multi-timeframe analysis", "Keeping a trading journal"],
  },
  {
    id: "ai",
    name: "AI & data",
    icon: "sparkles",
    blurb: "How the AI in your apps works, and the learning science behind Keen.",
    lessons: ["How large language models work", "Using AI APIs safely in your apps", "Machine learning basics with scikit-learn", "Spaced repetition: the science behind Keen", "Measuring whether an app actually helps users"],
  },
  {
    id: "interview",
    name: "Interviewing",
    icon: "mic",
    blurb: "Tell your story clearly with STAR, then practice out loud with a voice interviewer.",
    lessons: ["The STAR method", "Telling your trading-bot story", "Answering “Tell me about yourself”", "Questions to ask the interviewer", "Answering technical questions out loud", "Talking about weaknesses honestly", "Interviewing for finance programs", "Video interview setup and etiquette", "Pitching a stock in an interview", "Brain teasers and market-sizing questions", "Group interviews and case interviews", "The thank-you note and follow-up"],
    practice: "interview",
  },
  {
    id: "sales",
    name: "Sales & persuasion",
    icon: "target",
    blurb: "Discovery, pitching value, handling objections and closing — then sell out loud.",
    lessons: ["Discovery: find the real problem first", "Pitching value, not features", "Handling objections calmly", "Closing and asking for the next step", "Selling your own product (Keen or Titan)", "Cold outreach that books meetings", "Storytelling in a pitch", "Pricing and how buyers decide"],
    practice: "sales",
  },
  {
    id: "photo",
    name: "Photography business",
    icon: "award",
    blurb: "Turn your photography into paid work: pricing, clients, portfolio and a faster Lightroom workflow.",
    lessons: ["Pricing your photography", "Finding and keeping clients", "Building a portfolio that sells", "A faster Lightroom workflow", "Contracts, usage rights and getting paid"],
  },
];
// Added in 2026.10: deeper finance tracks and career-skills tracks.
TRACKS.push(
  {
    id: "accounting",
    name: "Accounting basics",
    icon: "clipboard",
    blurb: "The language of business: how the three statements connect — the #1 topic in finance interviews.",
    lessons: ["Assets, liabilities and equity", "Debits, credits and the accounting equation", "Accrual vs. cash accounting", "Revenue recognition and expenses", "How the three statements link together", "Depreciation and the classic $10 question", "Working capital and why it matters", "Key ratios: margins, ROE and liquidity"],
  },
  {
    id: "valuation",
    name: "Valuation & DCF",
    icon: "gauge",
    blurb: "What is a company worth? Comparables, cash flows, WACC and building a real DCF.",
    lessons: ["Why valuation matters and the main methods", "Trading comparables (comps)", "Precedent transactions", "Unlevered free cash flow", "Discount rates and WACC", "Terminal value: growth vs. exit multiple", "Building a simple DCF step by step", "Sensitivity tables and what drives value", "Pitching a stock with a valuation"],
  },
  {
    id: "options",
    name: "Options & derivatives",
    icon: "layers",
    blurb: "Calls, puts, payoffs, the Greeks and volatility — and the risks that wipe out beginners.",
    lessons: ["Calls and puts: payoffs at expiration", "Intrinsic value and time value", "Implied volatility", "The Greeks: delta, gamma, theta, vega", "Covered calls and protective puts", "Spreads: limiting risk", "Futures and forwards basics", "Why most beginners lose money with options"],
  },
  {
    id: "personal",
    name: "Personal finance",
    icon: "shield",
    blurb: "Your own money: paychecks, credit, accounts for teens, investing basics and avoiding traps.",
    lessons: ["Reading your first paycheck", "Bank accounts and custodial accounts for teens", "Credit scores and how credit works", "A Roth IRA with your own earned income", "Investing your first $1,000: index funds and risk", "Debt traps: credit cards, BNPL and loans", "Taxes on a teen job and side income", "Money goals: budgets that actually stick"],
  },
  {
    id: "econ",
    name: "Economics & markets",
    icon: "trend",
    blurb: "Supply and demand to the Fed: the big forces behind every market headline.",
    lessons: ["Supply, demand and prices", "GDP, growth and recessions", "Inflation and the CPI report", "The Fed and monetary policy", "Fiscal policy: taxes and government spending", "Jobs reports and unemployment", "Trade, tariffs and currencies", "Reading the economic calendar like a trader"],
  },
  {
    id: "filings",
    name: "10-Ks & earnings",
    icon: "file",
    blurb: "Read company filings and earnings like an analyst: what to look at and what's a red flag.",
    lessons: ["What's in a 10-K and a 10-Q", "The business section and risk factors", "MD&A: management's story", "Earnings releases and calls", "Guidance, consensus and surprises", "Red flags in financial statements", "Comparing two companies side by side"],
  },
  {
    id: "excel",
    name: "Excel & spreadsheets",
    icon: "layers",
    blurb: "The tool every finance intern uses daily: formulas, lookups, pivots and clean models.",
    lessons: ["Cells, references and clean formulas", "SUMIFS, COUNTIFS and IF logic", "XLOOKUP and INDEX/MATCH", "Pivot tables", "Charts that make a point", "Financial functions: NPV, IRR, PMT", "Building a clean three-tab model", "Keyboard shortcuts that save hours", "Google Sheets with Python and APIs"],
  },
  {
    id: "speaking",
    name: "Public speaking",
    icon: "volume",
    blurb: "Sound confident: structure, voice, pace, nerves and handling questions — then practice out loud.",
    lessons: ["Structuring any talk in three parts", "Handling nerves", "Voice, pace and pauses", "Body language and eye contact (on video too)", "Storytelling that sticks", "Presenting numbers and charts", "Handling tough questions", "A practice routine that works"],
    practice: "interview",
  },
  {
    id: "writing",
    name: "Professional email & writing",
    icon: "mail",
    blurb: "Emails people answer: subject lines, tone, follow-ups, thank-you notes and asking for things.",
    lessons: ["Subject lines and the first sentence", "Short, clear structure", "Tone: professional but human", "Following up the right way", "Thank-you notes that get remembered", "Asking for a recommendation", "LinkedIn messages and connection notes", "Proofreading and common mistakes"],
  },
  {
    id: "negotiation",
    name: "Negotiation",
    icon: "users",
    blurb: "Get to yes: interests, anchors, alternatives and negotiating for yourself as a teen.",
    lessons: ["Positions vs. interests", "Your BATNA (walk-away option)", "Anchoring and first offers", "Asking questions to create value", "Negotiating pay or hours at a first job", "Handling no and staying calm", "Negotiating for photography clients"],
    practice: "sales",
  },
  {
    id: "brand",
    name: "LinkedIn & personal brand",
    icon: "award",
    blurb: "Build a profile, portfolio and online presence that make recruiters want to talk to you.",
    lessons: ["What recruiters look for online", "A headline and About that work", "Showing projects: portfolio and Featured", "Posting about what you learn", "Connection requests that get accepted", "Messaging recruiters and alumni", "Cleaning up your online presence"],
  }
);

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

// Consecutive days (ending today or yesterday) with any study activity: lesson, quiz, or spoken practice.
function studyStreak() {
  const s = study();
  const days = new Set(
    [...Object.values(s.done).map((d) => d.at), ...(s.quizzes || []).map((q) => q.at), ...(s.sessions || []).map((x) => x.at), ...s.roleplays.map((r) => r.at), ...s.mocks.map((m) => m.at)]
      .filter(Boolean)
      .map((t) => new Date(t).toDateString())
  );
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function studyStats() {
  const s = study();
  const scores = [...Object.values(s.done).map((d) => (d.score / (d.of || 3)) * 100), ...(s.quizzes || []).map((q) => (q.score / q.of) * 100)];
  return {
    streak: studyStreak(),
    lessons: Object.keys(s.done).length,
    total: allTracks().reduce((n, t) => n + t.lessons.length, 0),
    certs: Object.keys(s.certs || {}).length,
    cases: (s.cases || []).filter((c) => c.grade).length,
    quizAvg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    sessions: (s.sessions || []).length,
  };
}
const PRACTICE_LINK = { networking: "networking", fp: "fp", interview: "interview", sales: "sales" };

const TRACK_GROUPS = [
  ["Finance & markets", ["finance", "accounting", "valuation", "filings", "econ", "options", "planning", "personal"]],
  ["Trading & code", ["quant", "ta", "python", "excel", "ai"]],
  ["Career skills", ["interview", "networking", "speaking", "writing", "sales", "negotiation", "brand", "photo"]],
];
function trackCard(t) {
  const p = trackProgress(t);
  const cert = (study().certs || {})[t.id];
  return `<a class="card track" href="#study/${t.id}">
    <div class="spread"><div class="track-icon">${icon(t.icon)}</div>${cert ? `<span class="pill good" title="Certificate earned">${icon("award")} ${cert.score}%</span>` : ring(p, { size: 46, tone: p >= 70 ? "good" : "accent" })}</div>
    <h3>${esc(t.name)}</h3><p class="small muted">${esc(t.blurb)}</p>
    <div class="small">${t.lessons.length} lessons${t.practice ? " · spoken practice" : ""}${t.custom ? " · made by you" : ""}</div></a>`;
}

function renderStudy() {
  const st = studyStats();
  const s = study();
  const last = (mode) => (s.sessions || []).find((x) => x.mode === mode);
  const grouped = new Set(TRACK_GROUPS.flatMap(([, ids]) => ids));
  const custom = s.custom || [];
  const extra = TRACKS.filter((t) => !grouped.has(t.id));
  app.innerHTML = `
    <div class="page-head"><div><h1>Study</h1><p class="muted">Lessons, quizzes, mock exams, case studies and spoken practice — built around your projects and goals.</p></div>
      <div class="row"><a class="btn primary" href="#quiz/mix">${icon("sparkles")} Mixed review quiz</a></div></div>
    <div class="stats">
      <div class="card stat"><div class="k">${icon("flame")} Study streak</div><div class="stat-v">${st.streak}<span class="muted"> day${st.streak === 1 ? "" : "s"}</span></div></div>
      <div class="card stat"><div class="k">Lessons done</div><div class="stat-v">${st.lessons}<span class="muted">/${st.total}</span></div></div>
      <div class="card stat"><div class="k">Quiz average</div><div class="stat-v">${st.quizAvg ?? "—"}${st.quizAvg != null ? '<span class="muted">%</span>' : ""}</div></div>
      <div class="card stat"><div class="k">Certificates</div><div class="stat-v">${st.certs}</div><div class="small muted">${st.cases} case stud${st.cases === 1 ? "y" : "ies"} graded</div></div>
    </div>
    <section><div class="section-head"><h2>Speak it out loud</h2><a class="small" href="#practice">All practice options</a></div>
      <div class="grid cards2">${MODES.map((m) => {
        const l = last(m.id === "fp" ? "fpclient" : m.id);
        return `<a class="card practice-cta" href="#practice/${m.id}"><div class="track-icon">${icon(m.icon)}</div><div class="grow"><h3>${m.label}</h3><p class="small muted">${l ? `Last score ${l.score}/100` : esc(m.blurb)}</p></div><span class="chev">${icon("chevron")}</span></a>`;
      }).join("")}
      <a class="card practice-cta" href="#brand/pitch"><div class="track-icon">${icon("mic")}</div><div class="grow"><h3>Elevator pitch</h3><p class="small muted">Your 30-second “tell me about yourself”, timed and scored.</p></div><span class="chev">${icon("chevron")}</span></a>
      <a class="card practice-cta" href="#clients"><div class="track-icon">${icon("users")}</div><div class="grow"><h3>Client book</h3><p class="small muted">Ongoing clients: meetings, a plan you build, simulations, life changes and a relationship bar.</p></div><span class="chev">${icon("chevron")}</span></a>
      <a class="card practice-cta" href="#cases"><div class="track-icon">${icon("briefcase")}</div><div class="grow"><h3>Case studies</h3><p class="small muted">Stock pitches, valuations, client plans and strategy cases — graded with model answers.</p></div><span class="chev">${icon("chevron")}</span></a></div></section>
    ${TRACK_GROUPS.map(([name, ids]) => {
      const list = ids.map((id) => TRACKS.find((t) => t.id === id)).filter(Boolean);
      return `<section><div class="section-head"><h2>${name}</h2><span class="small muted">${list.length} tracks · ${list.reduce((n, t) => n + t.lessons.length, 0)} lessons</span></div><div class="grid cards3 tracks">${list.map(trackCard).join("")}</div></section>`;
    }).join("")}
    ${extra.length ? `<section><div class="grid cards3 tracks">${extra.map(trackCard).join("")}</div></section>` : ""}
    <section><div class="section-head"><h2>Your tracks</h2><span class="small muted">Claude builds a full track on anything you want to learn</span></div>
      <div class="card new-track"><div class="row"><input id="nt-topic" placeholder="e.g. Real estate investing, SAT math, crypto basics, Swift for iOS…" maxlength="80" style="flex:1"><button class="btn primary" id="nt-go">${icon("plus")} Create track</button></div></div>
      ${custom.length ? `<div class="grid cards3 tracks mt-s">${custom.map(trackCard).join("")}</div>` : ""}</section>`;
  document.getElementById("nt-go").onclick = (e) =>
    busy(e.currentTarget, async () => {
      const topic = document.getElementById("nt-topic").value.trim();
      if (topic.length < 3) throw new Error("Type a topic first.");
      if (!AI.enabled()) throw new Error("Add your Claude API key in Settings first.");
      const t = await createTrack(topic);
      toast(`Created “${t.name}” — ${t.lessons.length} lessons.`);
      go("study/" + t.id);
    });
  document.getElementById("nt-topic").addEventListener("keydown", (e) => e.key === "Enter" && document.getElementById("nt-go").click());
}

function renderTrack(id) {
  const t = findTrack(id);
  if (!t || t.virtual) return (app.innerHTML = empty(`Track not found. <a href="#study">Back</a>`));
  const s = study();
  const qz = (s.quizzes || []).filter((q) => q.track === t.id);
  const cert = (s.certs || {})[t.id];
  const exams = (s.exams || []).filter((e) => e.track === t.id);
  app.innerHTML = `
    <a class="back" href="#study">‹ Study</a>
    <div class="page-head"><div><div class="eyebrow">${t.custom ? "Your track" : "Track"}</div><h1>${esc(t.name)}</h1><p class="muted">${esc(t.blurb)}</p></div>${ring(trackProgress(t), { size: 84, tone: "accent" })}</div>
    <div class="row">
      <a class="btn primary" href="#quiz/${t.id}">${icon("sparkles")} Practice quiz</a>
      <a class="btn" href="#exam/${t.id}">${icon("award")} ${cert ? "Certificate · " + cert.score + "%" : "Mock exam & certificate"}</a>
      ${t.practice ? `<a class="btn" href="#practice/${PRACTICE_LINK[t.practice]}">${icon("mic")} Practice out loud</a>` : ""}
      ${t.custom ? `<button class="btn ghost" id="tr-del">${icon("trash")} Delete track</button>` : ""}
    </div>
    ${qz.length || exams.length ? `<p class="small muted">${qz.length ? `Best quiz ${Math.max(...qz.map((q) => Math.round((q.score / q.of) * 100)))}% · ${qz.length} taken` : ""}${qz.length && exams.length ? " · " : ""}${exams.length ? `Best exam ${Math.max(...exams.map((e) => e.pct))}% · ${exams.length} attempt${exams.length === 1 ? "" : "s"}` : ""}</p>` : ""}
    <div class="list">${t.lessons
      .map((title, i) => {
        const d = s.done[lessonKey(t.id, i)];
        return `<a class="list-row card" href="#lesson/${t.id}/${i}"><div class="lesson-num ${d ? "done" : ""}">${d ? icon("check") : i + 1}</div><div class="grow"><div class="row-title">${esc(title)}</div><div class="small muted">${d ? `Quiz ${d.score}/${d.of || 3}` : s.lessons[lessonKey(t.id, i)] ? "Ready to read" : "~5 min"}</div></div><span class="chev">${icon("chevron")}</span></a>`;
      })
      .join("")}</div>`;
  document.getElementById("tr-del")?.addEventListener("click", () => {
    if (!confirm(`Delete the “${t.name}” track? Finished-lesson progress for it is removed too.`)) return;
    deleteTrack(t.id);
    toast("Track deleted.");
    go("study");
  });
}

// Unlimited practice quizzes: fresh AI questions each time, weighted toward lessons you've finished.
let QZ = null;
function renderQuiz(id) {
  const t = findTrack(id);
  if (!t) return (app.innerHTML = empty(`Track not found. <a href="#study">Back</a>`));
  if (!QZ || QZ.track !== id) QZ = { track: id, qs: null, n: QZ?.n || 6, level: QZ?.level || "mixed" };
  const backHref = t.virtual ? "#study" : `#study/${t.id}`;
  app.innerHTML = `
    <a class="back" href="${backHref}">‹ ${t.virtual ? "Study" : esc(t.name)}</a>
    <article class="card lesson">
      <div class="eyebrow">Practice quiz · ${esc(t.name)}</div><h1>Test yourself</h1>
      <div class="quiz-opts row">
        <div class="segmented" id="qz-n">${[6, 10, 15].map((n) => `<button data-n="${n}" class="${QZ.n === n ? "on" : ""}">${n} questions</button>`).join("")}</div>
        <div class="segmented" id="qz-l">${[["easier", "Easier"], ["mixed", "Mixed"], ["harder", "Harder"]].map(([v, l]) => `<button data-l="${v}" class="${QZ.level === v ? "on" : ""}">${l}</button>`).join("")}</div>
      </div>
      <div id="quiz-body">${AI.enabled() ? `<div class="skeleton"><span class="spinner"></span> Writing fresh questions…</div>` : `<p class="muted">Quizzes are written by Claude — add your API key in <a href="#settings">Settings</a>.</p>`}</div>
    </article>`;
  if (!AI.enabled()) return;
  const draw = () => {
    const body = document.getElementById("quiz-body");
    if (!body) return;
    body.innerHTML = `${QZ.qs
      .map((q, qi) => `<div class="quiz-q"><p><strong>${qi + 1}. ${esc(q.q)}</strong></p>${q.options.map((o, oi) => `<button class="quiz-opt" data-qi="${qi}" data-oi="${oi}">${esc(o)}</button>`).join("")}<div class="small quiz-why"></div></div>`)
      .join("")}<div class="row mt"><button class="btn primary" id="quiz-new">${icon("refresh")} New questions</button><a class="btn" href="${backHref}">Back</a></div>`;
    wireQuiz(QZ.qs, (score) => {
      const s = study();
      s.quizzes = [{ track: t.id, score, of: QZ.qs.length, at: Date.now() }, ...(s.quizzes || [])].slice(0, 100);
      saveStudy(s);
      toast(`Quiz done — ${score}/${QZ.qs.length}.`);
    });
    document.getElementById("quiz-new").onclick = () => {
      QZ.qs = null;
      route();
    };
    Motion.reveal(body);
  };
  const reset = (patch) => {
    Object.assign(QZ, patch, { qs: null });
    route.quiet = true;
    route();
  };
  app.querySelectorAll("#qz-n [data-n]").forEach((b) => (b.onclick = () => reset({ n: +b.dataset.n })));
  app.querySelectorAll("#qz-l [data-l]").forEach((b) => (b.onclick = () => reset({ level: b.dataset.l })));
  if (QZ.qs) return draw();
  const done = t.virtual ? t.lessons : t.lessons.filter((_, i) => study().done[lessonKey(t.id, i)]);
  const pool = done.length ? done : t.lessons;
  // Mixed review samples up to 12 finished lessons so the prompt stays focused.
  const pick = pool.length > 12 ? [...pool].sort(() => Math.random() - 0.5).slice(0, 12) : pool;
  const want = { ...QZ };
  AI.quiz(t, pick, want.n, want.level)
    .then((qs) => {
      if (QZ.track !== want.track || QZ.n !== want.n || QZ.level !== want.level) return; // settings changed meanwhile
      QZ.qs = qs;
      if (location.hash === `#quiz/${t.id}`) draw();
    })
    .catch((e) => {
      const body = document.getElementById("quiz-body");
      if (!body) return;
      body.innerHTML = `<p class="bad-text">${esc(e.message)}</p><button class="btn" id="quiz-retry">Try again</button>`;
      document.getElementById("quiz-retry").onclick = () => {
        QZ.qs = null;
        route();
      };
    });
}

// Shared quiz behavior for lessons and practice quizzes.
function wireQuiz(quiz, onDone) {
  const answers = {};
  document.querySelectorAll(".quiz-opt").forEach((b) =>
    b.addEventListener("click", () => {
      const qi = +b.dataset.qi;
      if (qi in answers) return;
      const oi = +b.dataset.oi;
      const q = quiz[qi];
      answers[qi] = oi === q.answer;
      const box = b.closest(".quiz-q");
      box.querySelectorAll(".quiz-opt").forEach((x) => {
        x.disabled = true;
        if (+x.dataset.oi === q.answer) x.classList.add("right");
      });
      if (oi !== q.answer) b.classList.add("wrong");
      box.querySelector(".quiz-why").textContent = (oi === q.answer ? "Correct. " : "Not quite. ") + (q.why || "");
      if (Object.keys(answers).length === quiz.length) onDone(Object.values(answers).filter(Boolean).length);
    })
  );
}
function renderLesson(arg) {
  const [tid, idxStr] = arg.split("/");
  const t = findTrack(tid);
  const i = +idxStr;
  if (!t || t.virtual || !t.lessons[i]) return (app.innerHTML = empty(`Lesson not found. <a href="#study">Back</a>`));
  const key = lessonKey(t.id, i);
  const s = study();
  const L = s.lessons[key];
  const next = i + 1 < t.lessons.length ? `#lesson/${t.id}/${i + 1}` : `#study/${t.id}`;
  app.innerHTML = `
    <a class="back" href="#study/${t.id}">‹ ${t.name}</a>
    <article class="card lesson">
      <div class="eyebrow dark">Lesson ${i + 1} of ${t.lessons.length}</div>
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
      if (body) body.innerHTML = `<p class="bad-text">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button>`;
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
    ${done ? `<p class="good-text small">${icon("check")} Completed — quiz ${done.score}/${done.of || 3}</p>` : ""}`;
}

function wireLesson(L, key) {
  wireQuiz(L.quiz, (score) => {
    const s = study();
    s.done[key] = { score, of: L.quiz.length, at: Date.now() };
    saveStudy(s);
    toast(`Lesson complete — ${score}/${L.quiz.length} on the quiz.`);
  });
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
    ${AI.enabled() ? `<button class="btn primary" id="o-go">${icon("sparkles")} Draft email</button>` : `<p class="small muted">Add your API key in <a href="#settings">Settings</a> to draft emails.</p>`}
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
        ${chk.bad.length ? `<p class="small bad-text">${icon("alert")} Fact-check: ${chk.bad.map((n) => `“${esc(n)}”`).join(", ")} isn't in your data.</p>` : `<p class="small good-text">${icon("check")} Fact-check passed.</p>`}
        ${chk.placeholders ? `<p class="small">${icon("pen")} Fill in the [bracketed] parts before sending.</p>` : ""}
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
    ${AI.enabled() ? `<button class="btn primary" id="pf-go">${icon("sparkles")} Search now</button>` : `<p>Add your API key in <a href="#settings">Settings</a> first.</p>`}
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
