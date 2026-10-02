// Markets (daily brief + paper trading), Pitch & LinkedIn, practice replays and progress,
// deadline reminders, and the deeper Study tools: mock exams + certificates, case studies, custom AI tracks.
// Loaded after features.js / convo.js; everything here runs only after boot.

// =============== small shared pieces ===============
function markets() {
  return Object.assign({ briefs: {}, portfolio: null }, Store.get("markets", {}));
}
function saveMarkets(m) {
  Store.set("markets", m);
}
function brand() {
  return Object.assign({ linkedin: null, checks: {}, pitches: {}, runs: [] }, Store.get("brand", {}));
}
function saveBrand(b) {
  Store.set("brand", b);
}
const money = (n, d = 2) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const signedPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const todayKey = () => new Date().toISOString().slice(0, 10);
function copyBtn(text, label = "Copy") {
  return `<button class="btn small" data-copy="${esc(text)}">${icon("copy")} ${label}</button>`;
}
function wireCopy(root = app) {
  root.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Copied."), () => toast("Copy blocked — select the text and copy it."))));
}
function tabs(base, items, cur) {
  return `<div class="tabs-inline">${items.map(([id, label]) => `<a href="#${base}/${id}" class="${cur === id ? "on" : ""}">${label}</a>`).join("")}</div>`;
}
// Simple responsive line chart (values 0-100 or any range). points: [{x: label, y: number}]
function lineChart(points, { h = 140, min, max, fmt = (v) => Math.round(v) } = {}) {
  if (points.length < 2) return `<p class="small muted">Do this a couple more times to see your trend.</p>`;
  const w = 600;
  const ys = points.map((p) => p.y);
  const lo = min ?? Math.min(...ys);
  const hi = max ?? Math.max(...ys);
  const span = hi - lo || 1;
  const X = (i) => 8 + (i / (points.length - 1)) * (w - 16);
  const Y = (v) => h - 10 - ((v - lo) / span) * (h - 24);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Trend chart">
    <path d="${d} L${X(points.length - 1)} ${h} L8 ${h} Z" class="chart-fill"/><path d="${d}" class="chart-line" vector-effect="non-scaling-stroke"/>
    ${points.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.y)}" r="3.5" class="chart-dot"><title>${esc(p.x)}: ${fmt(p.y)}</title></circle>`).join("")}</svg>
    <div class="spread small muted"><span>${esc(points[0].x)}</span><span>${esc(points[points.length - 1].x)}</span></div>`;
}
// Fact check for generated text about Mason: any number not in his data gets flagged.
function unverifiedNumbers(text) {
  return numbersNotIn(String(text), AI.dataBlock() + " " + PROFILE.summary.join(" ")).filter((n) => !/^(1|2|3|30|60|90|100|2026|2027|2028|2029)$/.test(n));
}

// =============== AI additions ===============
Object.assign(AI, {
  // Practice quiz with a chosen length and level (replaces the fixed 6-question version).
  async quiz(track, lessons, n = 6, level = "mixed") {
    const mix = { easier: "mostly concept checks with clear wording", mixed: "about a third concept checks, half applied scenarios, the rest harder stretch questions", harder: "mostly applied scenarios and multi-step reasoning, a few tough stretch questions" }[level] || "a mix";
    const text = await this.ask(
      `Write a fresh ${n}-question multiple-choice practice quiz for Mason on "${track.name}", covering: ${lessons.join("; ")}.
Difficulty: ${level} — ${mix}. Where it genuinely fits, tie 1-2 questions to his real projects (trading bot, Keen, Titan, photography). Accurate, unambiguous, exactly one correct answer, plausible distractors. Vary wording and topics each time (seed ${Math.random().toString(36).slice(2, 7)}).
Return ONLY JSON: [{"q": str, "options": [4 strings], "answer": 0-3, "why": "one-sentence explanation"}]`,
      { effort: "low", maxTokens: 1200 + n * 450 }
    );
    const qs = this.parseJSON(text, null);
    if (!Array.isArray(qs) || !qs.length || !qs.every((q) => q.q && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer))) throw new Error("The quiz came back in an unexpected format — try again.");
    return qs;
  },
  async marketBrief() {
    const text = await this.ask(
      `Today is ${new Date().toDateString()}. Use web search to find the 3 most important stock-market or economy stories from the last 1-2 days. Teach them to Mason, a 10th grader aiming for finance internships.
Only state facts you found in sources, with real URLs. Explain like a sharp mentor — plain English, no hype. This is education, not investment advice.
Return ONLY JSON:
{"snapshot": "one line on how the major US indexes moved, if found, else empty",
 "stories": [{"headline": str, "source": {"name": str, "url": str}, "what": "2 sentences", "why": "why it matters for markets or companies (2 sentences)",
   "concept": {"name": "the finance concept it illustrates", "explain": "2-3 plain sentences"}, "talkingPoint": "one sentence Mason could say in a finance interview to show he follows markets (analysis, not a tip)"}] (exactly 3),
 "quiz": [{"q": str, "options": [4 strings], "answer": 0-3, "why": str}] (4 questions on the stories and concepts)}`,
      { webSearch: true, effort: "medium", maxTokens: 9000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !Array.isArray(j.stories) || !j.stories.length) throw new Error("The brief came back in an unexpected format — try again.");
    return j;
  },
  async webQuotes(symbols) {
    const text = await this.ask(
      `Use web search to find the latest trading price in USD for each of these tickers: ${symbols.join(", ")}.
Return ONLY JSON like {"AAPL": {"price": 123.45, "asOf": "short date/time text"}}. Use null for a ticker you can't find. Numbers only, no $ signs.`,
      { webSearch: true, effort: "low", maxTokens: 2000 }
    );
    return this.parseJSON(text, {}) || {};
  },
  async reviewTrades(p, valueNow) {
    const text = await this.ask(
      `Review Mason's PAPER-TRADING journal (simulated money, for learning). He's 15 and studies technical analysis and risk. Be an encouraging but honest mentor; this is education, not investment advice — never tell him what to buy.
Start: $10,000 on ${new Date(p.start).toDateString()}. Value now: ${money(valueNow)}. Cash: ${money(p.cash)}.
Positions: ${JSON.stringify(p.pos)}
Trades (newest first, with his reasons): ${JSON.stringify(p.trades.slice(0, 40))}
Judge process over luck: were reasons specific and testable? position sizing and diversification? did he follow his own rules? any overtrading or chasing?
Return ONLY JSON: {"grade": "A-F", "summary": "2 sentences", "good": [2-3 str], "improve": [3 str], "rule": "one trading rule to adopt next week"}`,
      { effort: "medium", maxTokens: 3000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !j.grade) throw new Error("The review came back in an unexpected format — try again.");
    return j;
  },
  async linkedin() {
    const text = await this.ask(
      `Write Mason's LinkedIn profile content using ONLY his verified data and Skill Bank answers. No invented numbers, titles or results. He's a high school sophomore targeting finance/fintech internships; voice: confident, specific, humble, first person.
Return ONLY JSON:
{"headlines": [3 options, each under 220 characters],
 "about": "About section, 120-220 words, first person, ends with what he's looking for",
 "experience": [{"title": str, "org": str, "text": "2-4 short lines for the LinkedIn description"}] (his real jobs/projects only),
 "skills": [up to 10 skill names that are clearly supported by his data],
 "featured": [{"title": str, "why": str}] (2-3 items to pin: real projects/portfolio),
 "posts": [{"hook": "first line", "outline": "2-3 sentences on what to write"}] (4 post ideas from his real projects and learning),
 "connect": "a connection-request note template under 300 characters with [Name] placeholder",
 "recruiter": "a short message template to a recruiter/program coordinator under 600 characters with [Name] and [Program] placeholders"}`,
      { effort: "medium", maxTokens: 6000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !Array.isArray(j.headlines)) throw new Error("The profile came back in an unexpected format — try again.");
    return j;
  },
  async pitch(audience, seconds) {
    const words = Math.round(seconds * 2.4);
    const text = await this.ask(
      `Write Mason's spoken "tell me about yourself" elevator pitch for: ${audience}. Length: about ${seconds} seconds spoken (~${words} words).
Use ONLY his verified data. Structure: who he is → the most relevant proof (real project/experience, real numbers only) → why this audience → a light closing or ask. Natural spoken English with contractions; no buzzwords; no lists.
Return ONLY JSON: {"pitch": str, "keyPoints": [3-5 short phrases that must come across], "tips": [3 delivery tips specific to this pitch]}`,
      { effort: "medium", maxTokens: 2500 }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.pitch !== "string") throw new Error("The pitch came back in an unexpected format — try again.");
    return j;
  },
  async pitchFeedback(pitch, said, m) {
    const text = await this.ask(
      `Mason practiced his elevator pitch out loud. Compare what he said to the script and coach him (he's 15 — be specific and kind).
Script: """${pitch.pitch}"""
Must-hit points: ${pitch.keyPoints.join("; ")}
What he said (speech-to-text): """${said}"""
Measured: ${JSON.stringify(m)}
Return ONLY JSON: {"score": 0-100, "verdict": "one sentence", "missed": [points he skipped], "tips": [3 specific tips], "betterLine": "one line from what he said, rewritten stronger using only his facts"}`,
      { effort: "low", maxTokens: 1800 }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.score !== "number") throw new Error("Couldn't score that take — try again.");
    return j;
  },
  // Exam questions in batches (run in parallel so a 20-question exam is fast).
  async examQuestions(track, lessons, n, seed) {
    const text = await this.ask(
      `Write ${n} multiple-choice exam questions for a certificate exam on "${track.name}", covering: ${lessons.join("; ")}.
Exam quality: accurate, unambiguous, exactly one correct answer, plausible distractors, mix of recall (30%), application/scenario (50%) and harder analysis (20%). No trick wording. Vary topics (seed ${seed}).
Return ONLY JSON: [{"q": str, "options": [4 strings], "answer": 0-3, "why": "one-sentence explanation", "topic": "which lesson it covers"}]`,
      { effort: "medium", maxTokens: 9000 }
    );
    const qs = this.parseJSON(text, null);
    if (!Array.isArray(qs)) throw new Error("The exam came back in an unexpected format — try again.");
    return qs.filter((q) => q.q && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  },
  async caseStudy(cat, difficulty) {
    const text = await this.ask(
      `Create a realistic, self-contained case study for Mason (high school sophomore, finance/fintech goals). Category: ${cat.name} — ${cat.prompt}
Difficulty: ${difficulty}. Use a fictional company/client with realistic numbers (clearly fictional, no real tickers). Include the data he needs.
Return ONLY JSON:
{"title": str, "role": "who Mason plays", "context": "the situation in 120-200 words",
 "exhibits": [{"title": str, "rows": [[header cells], [row cells], ...]}] (1-2 small tables),
 "questions": [{"q": str, "hint": "a nudge, not the answer"}] (3 questions that build: understand → analyze → recommend),
 "rubric": "what a strong answer includes (private, for grading)"}`,
      { effort: "medium", maxTokens: 5000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || !Array.isArray(j.questions) || !j.context) throw new Error("The case came back in an unexpected format — try again.");
    return j;
  },
  async gradeCase(c, answers) {
    const text = await this.ask(
      `Grade Mason's case-study answers like a fair interviewer at a finance internship (he's 15: be honest and specific, reward clear reasoning and correct math).
Case: ${c.title}. ${c.context}
Exhibits: ${JSON.stringify(c.exhibits)}
Rubric: ${c.rubric}
${c.questions.map((q, i) => `Q${i + 1}: ${q.q}\nMason: ${answers[i] || "(blank)"}`).join("\n\n")}
Return ONLY JSON: {"overall": 0-100, "summary": "2 sentences", "perQuestion": [{"score": 0-100, "feedback": "what was good and what was missing", "model": "a strong model answer in 2-4 sentences"}], "skills": ["2-3 skills this case showed or needs"]}`,
      { effort: "medium", maxTokens: 5000 }
    );
    const j = this.parseJSON(text, null);
    if (!j || typeof j.overall !== "number" || !Array.isArray(j.perQuestion)) throw new Error("Grading came back in an unexpected format — try again.");
    return j;
  },
  async buildTrack(topic) {
    const text = await this.ask(
      `Design a study track for Mason (10th grade; into finance, trading, Python, apps, photography) on: "${topic}".
If the topic is unsafe or not a real learnable subject, return {"error": "short reason"}.
Return ONLY JSON: {"name": "short track name", "blurb": "one sentence", "lessons": [8 lesson titles that build from basics to applied, each under 60 characters]}`,
      { effort: "low", maxTokens: 1500 }
    );
    const j = this.parseJSON(text, null);
    if (j?.error) throw new Error(j.error);
    if (!j || !Array.isArray(j.lessons) || j.lessons.length < 3) throw new Error("Couldn't build that track — try a different topic.");
    return j;
  },
});

// =============== MARKETS ===============
function renderMarkets(tab = "brief") {
  if (!["brief", "paper"].includes(tab)) tab = "brief";
  app.innerHTML = `
    <div class="page-head"><div><h1>Markets</h1><p class="muted">A daily brief you can talk about in interviews, and a $10,000 paper portfolio to practice with real prices. Education only — not investment advice.</p></div></div>
    ${tabs("markets", [["brief", "Daily brief"], ["paper", "Paper trading"]], tab)}
    <div id="mk-body"></div>`;
  (tab === "paper" ? renderPaper : renderBrief)(document.getElementById("mk-body"));
}

function renderBrief(root) {
  const m = markets();
  const key = todayKey();
  const b = m.briefs[key];
  const past = Object.keys(m.briefs).sort().reverse().filter((k) => k !== key).slice(0, 6);
  if (!b) {
    root.innerHTML = AI.enabled()
      ? `<section class="card empty"><h2>Today's market brief</h2><p class="muted">Claude reads today's news and explains the 3 stories that matter — what happened, why, the finance concept behind it, and a line you could use in an interview. Takes about a minute.</p><button class="btn primary" id="br-go">${icon("sparkles")} Get today's brief</button></section>
         ${past.length ? `<section class="card"><h2>Past briefs</h2>${past.map((k) => `<button class="linkbtn" data-past="${k}">${new Date(k + "T12:00").toDateString()}</button>`).join(" · ")}</section>` : ""}`
      : empty(`The brief is written by Claude with live web search — add your API key in <a href="#settings">Settings</a>.`);
    document.getElementById("br-go")?.addEventListener("click", (e) =>
      busy(e.currentTarget, async () => {
        const brief = await AI.marketBrief();
        const mm = markets();
        mm.briefs[key] = { ...brief, at: Date.now() };
        // Keep the last 14 days.
        mm.briefs = Object.fromEntries(Object.entries(mm.briefs).sort().slice(-14));
        saveMarkets(mm);
        renderBrief(root);
        Motion.reveal(root);
      })
    );
    root.querySelectorAll("[data-past]").forEach((x) => (x.onclick = () => drawBrief(root, markets().briefs[x.dataset.past], x.dataset.past)));
    return;
  }
  drawBrief(root, b, key);
}
function drawBrief(root, b, key) {
  root.innerHTML = `
    <div class="spread"><div><div class="eyebrow">${new Date(key + "T12:00").toDateString()}</div>${b.snapshot ? `<p class="muted">${esc(b.snapshot)}</p>` : ""}</div>${key === todayKey() ? `<button class="btn small" id="br-redo">${icon("refresh")} Refresh</button>` : `<a class="btn small" href="#markets/brief" id="br-today">Today</a>`}</div>
    <div class="stack">${b.stories
      .map(
        (s, i) => `<article class="card story"><div class="eyebrow">Story ${i + 1}</div><h2>${esc(s.headline)}</h2>
        <p>${esc(s.what)}</p><p><strong>Why it matters.</strong> ${esc(s.why)}</p>
        <div class="callout"><strong>${esc(s.concept?.name || "Concept")}</strong><p>${esc(s.concept?.explain || "")}</p></div>
        <div class="talking"><span class="k">Say it in an interview</span><p>“${esc(s.talkingPoint)}”</p>${copyBtn(s.talkingPoint)}</div>
        ${s.source?.url && /^https?:\/\//.test(s.source.url) ? `<a class="small" href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.name || "Source")} ↗</a>` : ""}</article>`
      )
      .join("")}</div>
    ${b.quiz?.length ? `<section class="card"><h2>Check yourself</h2>${b.quiz.map((q, qi) => `<div class="quiz-q"><p><strong>${qi + 1}. ${esc(q.q)}</strong></p>${q.options.map((o, oi) => `<button class="quiz-opt" data-qi="${qi}" data-oi="${oi}">${esc(o)}</button>`).join("")}<div class="small quiz-why"></div></div>`).join("")}</section>` : ""}
    <p class="small muted">Written by Claude from live web sources — open the links to verify. Education only, not investment advice.</p>`;
  wireCopy(root);
  if (b.quiz?.length)
    wireQuiz(b.quiz, (score) => {
      const s = study();
      s.quizzes = [{ track: "markets", score, of: b.quiz.length, at: Date.now() }, ...(s.quizzes || [])].slice(0, 100);
      saveStudy(s);
      toast(`Brief quiz: ${score}/${b.quiz.length}.`);
    });
  document.getElementById("br-redo")?.addEventListener("click", () => {
    const m = markets();
    delete m.briefs[key];
    saveMarkets(m);
    renderBrief(root);
  });
  document.getElementById("br-today")?.addEventListener("click", (e) => (e.preventDefault(), renderBrief(root)));
}

// ---------- quotes ----------
const CRYPTO = /^(BTC|ETH|SOL|DOGE|ADA|XRP|LTC|AVAX|DOT|LINK|MATIC|SHIB|BCH|XLM|UNI)(-USD)?$/i;
const Quotes = {
  cache: {},
  async get(symbols, { fresh = false } = {}) {
    const out = {};
    const need = [];
    for (const s of symbols) {
      const c = this.cache[s];
      if (c && !fresh && Date.now() - c.at < 60000) out[s] = c;
      else need.push(s);
    }
    const key = getSettings().finnhubKey;
    const webNeeded = [];
    await Promise.all(
      need.map(async (s) => {
        try {
          if (CRYPTO.test(s)) {
            const j = await (await fetch(`https://api.coinbase.com/v2/prices/${s.replace(/-USD$/i, "")}-USD/spot`)).json();
            const price = +j.data?.amount;
            if (price) out[s] = this.cache[s] = { price, at: Date.now(), src: "Coinbase" };
          } else if (key) {
            const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${encodeURIComponent(key)}`);
            if (r.status === 401 || r.status === 403) throw new Error("Finnhub rejected the key — check it in Settings.");
            const j = await r.json();
            if (j.c) out[s] = this.cache[s] = { price: j.c, change: j.dp, prev: j.pc, at: Date.now(), src: "Finnhub" };
          } else webNeeded.push(s);
        } catch (e) {
          if (/Finnhub/.test(e.message)) toast(e.message);
        }
      })
    );
    if (webNeeded.length) {
      if (!AI.enabled()) throw new Error("Add a free Finnhub key (or your Claude key) in Settings to get stock prices.");
      const j = await AI.webQuotes(webNeeded);
      for (const s of webNeeded) {
        const v = j[s] || j[s.toUpperCase()];
        if (v && +v.price > 0) out[s] = this.cache[s] = { price: +v.price, at: Date.now(), src: "web search" + (v.asOf ? " · " + v.asOf : "") };
      }
    }
    return out;
  },
};

function portfolio() {
  return markets().portfolio || { start: Date.now(), cash: 10000, pos: {}, trades: [], history: [] };
}
function savePortfolio(p) {
  const m = markets();
  m.portfolio = p;
  saveMarkets(m);
}
function portValue(p, q) {
  return p.cash + Object.entries(p.pos).reduce((n, [s, x]) => n + x.qty * (q[s]?.price ?? x.last ?? x.cost), 0);
}

function renderPaper(root) {
  const p = portfolio();
  const syms = Object.keys(p.pos);
  const q = Object.fromEntries(syms.map((s) => [s, Quotes.cache[s]]).filter(([, v]) => v));
  const value = portValue(p, q);
  const gain = value - 10000;
  root.innerHTML = `
    <div class="stats">
      <div class="card stat"><div class="k">Portfolio value</div><div class="stat-v">${money(value)}</div><div class="small ${gain >= 0 ? "good-text" : "bad-text"}">${gain >= 0 ? "+" : ""}${money(gain)} (${signedPct((gain / 10000) * 100)}) since ${new Date(p.start).toLocaleDateString()}</div></div>
      <div class="card stat"><div class="k">Cash</div><div class="stat-v">${money(p.cash)}</div><div class="small muted">${syms.length} position${syms.length === 1 ? "" : "s"}</div></div>
      <div class="card stat"><div class="k">Trades</div><div class="stat-v">${p.trades.length}</div><div class="small muted">every trade has a written reason</div></div>
    </div>
    <div class="two-col">
      <section class="card"><div class="section-head"><h2>Trade</h2><span class="small muted">Simulated money · real prices</span></div>
        <div class="trade-form">
          <label class="field"><span>Ticker</span><input id="tr-sym" placeholder="AAPL, SPY, BTC…" autocapitalize="characters" autocomplete="off" maxlength="10"></label>
          <label class="field"><span>Side</span><div class="segmented" id="tr-side"><button data-side="buy" class="on">Buy</button><button data-side="sell">Sell</button></div></label>
          <label class="field"><span>Amount</span><div class="row"><input id="tr-amt" type="number" min="0" step="any" inputmode="decimal" placeholder="500" style="flex:1"><select id="tr-unit"><option value="usd">dollars</option><option value="qty">shares</option></select></div></label>
          <label class="field"><span>Why? (your trading journal)</span><textarea id="tr-why" rows="2" placeholder="e.g. 20 EMA crossed above 50 EMA, RSI 55, stop at last swing low"></textarea></label>
          <div class="row"><button class="btn" id="tr-quote">Get quote</button><button class="btn primary" id="tr-go">Place trade</button></div>
          <p class="small muted" id="tr-msg">${getSettings().finnhubKey ? "Live quotes from Finnhub (US stocks/ETFs) and Coinbase (crypto)." : "Tip: add a free Finnhub key in Settings for instant stock quotes. Crypto works now."}</p>
        </div></section>
      <section class="card"><div class="section-head"><h2>Holdings</h2><button class="btn small" id="pf-refresh">${icon("refresh")} Refresh prices</button></div>
        ${
          syms.length
            ? `<div class="table-wrap"><table class="table"><thead><tr><th>Ticker</th><th>Shares</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th></tr></thead><tbody>${syms
                .map((s) => {
                  const x = p.pos[s];
                  const px = q[s]?.price ?? x.last ?? x.cost;
                  const pl = (px - x.cost) * x.qty;
                  return `<tr><td><strong>${esc(s)}</strong></td><td>${+x.qty.toFixed(6)}</td><td>${money(x.cost)}</td><td>${money(px)}${q[s]?.change != null ? `<div class="small ${q[s].change >= 0 ? "good-text" : "bad-text"}">${signedPct(q[s].change)} today</div>` : ""}</td><td>${money(px * x.qty)}</td><td class="${pl >= 0 ? "good-text" : "bad-text"}">${money(pl)}<div class="small">${signedPct(((px - x.cost) / x.cost) * 100)}</div></td></tr>`;
                })
                .join("")}</tbody></table></div>`
            : `<p class="muted small">No positions yet. Start small — the goal is a good process, not a big win.</p>`
        }
        ${p.history.length > 1 ? `<h3 class="mt">Value over time</h3>${lineChart(p.history.map((h) => ({ x: new Date(h.at).toLocaleDateString(), y: h.value })), { fmt: (v) => money(v, 0) })}` : ""}
      </section>
    </div>
    <section class="card"><div class="section-head"><h2>Journal</h2><div class="row">${AI.enabled() && p.trades.length ? `<button class="btn small primary" id="pf-review">${icon("sparkles")} Review my trading</button>` : ""}<button class="btn small ghost" id="pf-reset">Reset portfolio</button></div></div>
      <div id="pf-review-out">${p.review ? reviewHTML(p.review) : ""}</div>
      ${p.trades.length ? `<div class="list compact">${p.trades.slice(0, 30).map((t) => `<div class="list-row"><span class="pill ${t.side === "buy" ? "" : "pill-urgent"}">${t.side.toUpperCase()}</span><div class="grow"><div class="row-title">${esc(t.sym)} · ${+t.qty.toFixed(6)} @ ${money(t.price)}</div><div class="small muted">${new Date(t.at).toLocaleString()} — ${esc(t.reason)}</div></div></div>`).join("")}</div>` : `<p class="small muted">Your trades and reasons show up here.</p>`}
    </section>
    <p class="small muted">Paper trading only — no real money, no orders sent anywhere. Prices can be delayed. Education, not investment advice.</p>`;

  let side = "buy";
  const $ = (id) => document.getElementById(id);
  root.querySelectorAll("#tr-side [data-side]").forEach((b) => (b.onclick = () => ((side = b.dataset.side), root.querySelectorAll("#tr-side button").forEach((x) => x.classList.toggle("on", x === b)))));
  const sym = () => $("tr-sym").value.trim().toUpperCase().replace(/^\$/, "");
  const quote = async () => {
    const s = sym();
    if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)) throw new Error("Type a ticker like AAPL or BTC.");
    const got = (await Quotes.get([s], { fresh: true }))[s];
    if (!got) throw new Error(`Couldn't find a price for ${s}.`);
    $("tr-msg").innerHTML = `<strong>${esc(s)}</strong> ${money(got.price)} ${got.change != null ? `<span class="${got.change >= 0 ? "good-text" : "bad-text"}">${signedPct(got.change)}</span>` : ""} <span class="muted">· ${esc(got.src)}</span>`;
    return [s, got.price];
  };
  $("tr-quote").onclick = (e) => busy(e.currentTarget, quote);
  $("tr-go").onclick = (e) =>
    busy(e.currentTarget, async () => {
      const amt = +$("tr-amt").value;
      const why = $("tr-why").value.trim();
      if (!(amt > 0)) throw new Error("Enter an amount.");
      if (why.length < 10) throw new Error("Write a real reason first — the journal is how you learn.");
      const [s, price] = await quote();
      const pp = portfolio();
      let qty = $("tr-unit").value === "usd" ? amt / price : amt;
      qty = Math.floor(qty * 1e6) / 1e6;
      if (qty <= 0) throw new Error("That amount is too small.");
      const x = pp.pos[s] || { qty: 0, cost: 0 };
      if (side === "buy") {
        if (qty * price > pp.cash + 0.005) throw new Error(`Not enough cash — you have ${money(pp.cash)}.`);
        x.cost = (x.cost * x.qty + price * qty) / (x.qty + qty);
        x.qty = Math.round((x.qty + qty) * 1e8) / 1e8;
        pp.cash -= qty * price;
      } else {
        if (qty > x.qty + 1e-6) throw new Error(`You only own ${+x.qty.toFixed(6)} ${s}.`);
        qty = Math.min(qty, x.qty);
        x.qty = Math.round((x.qty - qty) * 1e8) / 1e8;
        pp.cash += qty * price;
      }
      x.last = price;
      if (x.qty < 1e-6) delete pp.pos[s];
      else pp.pos[s] = x;
      pp.trades.unshift({ id: uid(), at: Date.now(), sym: s, side, qty, price, reason: why });
      pp.history.push({ at: Date.now(), value: portValue(pp, { ...Quotes.cache }) });
      savePortfolio(pp);
      toast(`${side === "buy" ? "Bought" : "Sold"} ${+qty.toFixed(6)} ${s} at ${money(price)}.`);
      renderPaper(root);
    });
  $("pf-refresh").onclick = (e) =>
    busy(e.currentTarget, async () => {
      const pp = portfolio();
      const got = await Quotes.get(Object.keys(pp.pos), { fresh: true });
      for (const [s, v] of Object.entries(got)) if (pp.pos[s]) pp.pos[s].last = v.price;
      const v = portValue(pp, got);
      const last = pp.history[pp.history.length - 1];
      if (!last || Date.now() - last.at > 3600000) pp.history.push({ at: Date.now(), value: v });
      else last.value = v;
      pp.history = pp.history.slice(-200);
      savePortfolio(pp);
      renderPaper(root);
    });
  $("pf-review")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const pp = portfolio();
      pp.review = await AI.reviewTrades(pp, portValue(pp, Quotes.cache));
      savePortfolio(pp);
      $("pf-review-out").innerHTML = reviewHTML(pp.review);
    })
  );
  $("pf-reset").onclick = () => {
    if (!confirm("Start over with $10,000? Your trades and journal will be cleared (a restore point is kept in Settings).")) return;
    Backup.snapshot("Automatic — before resetting the paper portfolio");
    savePortfolio(null);
    renderPaper(root);
  };
}
function reviewHTML(r) {
  return `<div class="review"><div class="grade">${esc(r.grade)}</div><div class="grow"><p><strong>${esc(r.summary)}</strong></p>
    <div class="two-col tight"><div><h4>Good habits</h4><ul class="small">${(r.good || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h4>Improve</h4><ul class="small">${(r.improve || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
    ${r.rule ? `<div class="callout practice"><strong>Rule for next week</strong><p>${esc(r.rule)}</p></div>` : ""}</div></div>`;
}

// =============== PITCH & LINKEDIN ===============
const PITCH_AUDIENCES = [
  ["finance", "A finance internship interview"],
  ["fintech", "A tech / fintech internship interview"],
  ["fair", "A recruiter at a career fair"],
  ["college", "A college admissions interview"],
  ["network", "Someone I just met at a networking event"],
];
function renderBrand(tab = "pitch") {
  if (!["pitch", "linkedin"].includes(tab)) tab = "pitch";
  app.innerHTML = `
    <div class="page-head"><div><h1>Pitch & LinkedIn</h1><p class="muted">Your 30-second story and your profile — written only from your verified data, then practiced out loud.</p></div></div>
    ${tabs("brand", [["pitch", "Elevator pitch"], ["linkedin", "LinkedIn"]], tab)}
    <div id="br-body"></div>`;
  (tab === "linkedin" ? renderLinkedIn : renderPitch)(document.getElementById("br-body"));
}

let PT = { aud: "finance", secs: 30 };
function renderPitch(root) {
  const b = brand();
  const key = `${PT.aud}-${PT.secs}`;
  const pitch = b.pitches[key];
  const runs = b.runs.filter((r) => r.key === key);
  const warn = pitch ? unverifiedNumbers(pitch.pitch) : [];
  root.innerHTML = `
    <div class="two-col">
      <section class="card">
        <h2>Build it</h2>
        <label class="field"><span>Who's listening?</span><select id="pt-aud">${PITCH_AUDIENCES.map(([v, l]) => `<option value="${v}" ${PT.aud === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="field"><span>Length</span><div class="segmented">${[30, 60].map((s) => `<button data-secs="${s}" class="${PT.secs === s ? "on" : ""}">${s} seconds</button>`).join("")}</div></label>
        ${AI.enabled() ? `<button class="btn ${pitch ? "" : "primary"}" id="pt-gen">${icon("sparkles")} ${pitch ? "Write a new version" : "Write my pitch"}</button>` : `<p class="small muted">Needs your Claude API key — add it in <a href="#settings">Settings</a>.</p>`}
        ${
          pitch
            ? `<div class="pitch-script"><p id="pt-text" contenteditable="true" spellcheck="true">${esc(pitch.pitch)}</p></div>
               <div class="small muted">${pitch.pitch.split(/\s+/).length} words · about ${Math.round(pitch.pitch.split(/\s+/).length / 2.4)} seconds · you can edit it</div>
               ${warn.length ? `<div class="notice warn mt-s">${icon("alert")} Check these numbers — they aren't in your data: ${warn.map(esc).join(", ")}</div>` : `<div class="small good-text mt-s">${icon("check")} Every number matches your data</div>`}
               <h4>Must come across</h4><div class="chips">${pitch.keyPoints.map((k) => `<span class="chip">${esc(k)}</span>`).join("")}</div>
               <h4>Delivery tips</h4><ul class="small">${pitch.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
               <div class="row">${copyBtn(pitch.pitch)}<button class="btn small" id="pt-listen">${icon("volume")} Hear it</button></div>`
            : ""
        }
      </section>
      <section class="card pitch-practice">
        <h2>Say it out loud</h2>
        ${
          pitch
            ? `<p class="small muted">Tap the mic and give your pitch without reading. ${IS_IOS ? "On iPhone a long pause ends the take — keep it flowing." : "Pause for 3 seconds when you're done."}</p>
               <div class="pitch-clock"><span id="pt-clock">0:00</span><span class="muted"> / 0:${String(PT.secs).padStart(2, "0")}</span></div>
               <div class="bar"><i id="pt-bar" style="width:0%"></i></div>
               <button type="button" class="you-orb" id="pt-orb" data-state="tap" aria-label="Start your pitch">${icon("mic")}</button>
               <div class="you-hint" id="pt-hint">Tap to start</div>
               <div class="you-text" id="pt-said"></div>
               <div id="pt-result"></div>
               ${runs.length ? `<h3 class="mt">Your takes</h3>${lineChart(runs.slice(0, 12).reverse().map((r) => ({ x: new Date(r.at).toLocaleDateString(), y: r.score })), { min: 0, max: 100 })}` : ""}`
            : `<p class="muted">Write your pitch first, then practice it here with a timer, pace and filler-word check.</p>`
        }
      </section>
    </div>`;
  wireCopy(root);
  const $ = (id) => document.getElementById(id);
  $("pt-aud").onchange = (e) => ((PT.aud = e.target.value), renderPitch(root));
  root.querySelectorAll("[data-secs]").forEach((b) => (b.onclick = () => ((PT.secs = +b.dataset.secs), renderPitch(root))));
  $("pt-gen")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const aud = PITCH_AUDIENCES.find(([v]) => v === PT.aud)[1];
      const out = await AI.pitch(aud, PT.secs);
      const bb = brand();
      bb.pitches[key] = { ...out, at: Date.now() };
      saveBrand(bb);
      renderPitch(root);
    })
  );
  $("pt-text")?.addEventListener("blur", (e) => {
    const bb = brand();
    const t = e.target.innerText.trim();
    if (bb.pitches[key] && t && t !== bb.pitches[key].pitch) {
      bb.pitches[key].pitch = t;
      saveBrand(bb);
      renderPitch(root);
    }
  });
  $("pt-listen")?.addEventListener("click", () => {
    Voice.unlock();
    Voice.speak(brand().pitches[key].pitch, { gender: "male", seed: "mason" });
  });
  const orb = $("pt-orb");
  if (!orb) return;
  let L = null;
  let t0 = 0;
  let clock = null;
  const stopClock = () => clearInterval(clock);
  orb.onclick = () => {
    Voice.unlock();
    Voice.cancel();
    if (!SR) return toast("This browser can't do speech-to-text — use Safari on iPhone or Chrome/Edge on PC.");
    if (L?.active) return L.flush();
    $("pt-result").innerHTML = "";
    $("pt-said").textContent = "";
    L = new Listener({
      silenceMs: 3000,
      onText: (t) => ($("pt-said").textContent = t),
      onTurn: (text, dur) => {
        stopClock();
        scoreTake(text, Math.max(dur, (Date.now() - t0) / 1000 - 3));
      },
      onState: (st, err, kept) => {
        // The mic stopped early (iPhone): score what was said instead of losing the take.
        if (st === "needs-tap" && kept && kept.split(/\s+/).length >= 5) {
          stopClock();
          orb.dataset.state = "tap";
          $("pt-hint").textContent = "Tap to start";
          return scoreTake(kept, (Date.now() - t0) / 1000);
        }
        if (st === "listening") {
          orb.dataset.state = "live";
          $("pt-hint").textContent = "Go — tap when you're done";
          t0 = Date.now();
          clock = setInterval(() => {
            const s = (Date.now() - t0) / 1000;
            if (!$("pt-clock")) return stopClock();
            $("pt-clock").textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
            $("pt-bar").style.width = Math.min(100, (s / PT.secs) * 100) + "%";
            $("pt-bar").classList.toggle("over", s > PT.secs * 1.15);
          }, 200);
        }
        if (st === "needs-tap" || st === "error") {
          stopClock();
          orb.dataset.state = "tap";
          $("pt-hint").textContent = st === "error" ? "Mic error (" + err + ") — tap to try again" : "Tap to start";
        }
        if (st === "idle" && orb.isConnected) orb.dataset.state = "tap";
      },
    });
    L.start();
  };
  async function scoreTake(text, secs) {
    const p = brand().pitches[key];
    const words = text.split(/\s+/).filter(Boolean).length;
    const wpm = secs > 3 ? Math.round(words / (secs / 60)) : 0;
    const fillers = (text.match(FILLERS) || []).length;
    const lower = text.toLowerCase();
    const hit = p.keyPoints.filter((k) => {
      const ws = k.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
      return ws.length && ws.filter((w) => lower.includes(w.slice(0, 5))).length / ws.length >= 0.5;
    });
    const timeScore = Math.max(0, 100 - Math.abs(secs - PT.secs) / PT.secs * 200);
    const paceScore = wpm >= 125 && wpm <= 170 ? 100 : Math.max(0, 100 - Math.abs(wpm - 148) * 2);
    const fillerScore = Math.max(0, 100 - (fillers / Math.max(1, words)) * 100 * 25);
    const cover = (hit.length / p.keyPoints.length) * 100;
    const score = Math.round(0.35 * cover + 0.25 * timeScore + 0.2 * paceScore + 0.2 * fillerScore);
    const m = { secs: Math.round(secs), target: PT.secs, wpm, fillers, keyPointsHit: hit.length + "/" + p.keyPoints.length };
    const bb = brand();
    bb.runs = [{ key, at: Date.now(), score, ...m }, ...bb.runs].slice(0, 60);
    saveBrand(bb);
    const res = $("pt-result");
    if (!res) return;
    res.innerHTML = `<div class="metrics">
        ${metricCard("Score", score, "out of 100", score >= 75 ? "good-text" : score >= 55 ? "" : "warn-text")}
        ${metricCard("Time", m.secs + "s", `target ${PT.secs}s`, Math.abs(m.secs - PT.secs) <= PT.secs * 0.15 ? "good-text" : "warn-text")}
        ${metricCard("Pace", wpm ? wpm + " wpm" : "—", "aim 130–160", wpm >= 125 && wpm <= 170 ? "good-text" : "warn-text")}
        ${metricCard("Fillers", fillers, "um, uh, like…", fillers <= 1 ? "good-text" : "warn-text")}
        ${metricCard("Key points", m.keyPointsHit, hit.length < p.keyPoints.length ? "missed: " + p.keyPoints.filter((k) => !hit.includes(k)).join("; ") : "all covered", hit.length === p.keyPoints.length ? "good-text" : "")}
      </div>
      ${AI.enabled() ? `<button class="btn small" id="pt-coach">${icon("sparkles")} Coach me on this take</button><div id="pt-coach-out"></div>` : ""}`;
    document.getElementById("pt-coach")?.addEventListener("click", (e) =>
      busy(e.currentTarget, async () => {
        const f = await AI.pitchFeedback(p, text, m);
        document.getElementById("pt-coach-out").innerHTML = `<div class="callout mt-s"><strong>${f.score}/100 — ${esc(f.verdict)}</strong>${f.missed?.length ? `<p class="small">Missed: ${f.missed.map(esc).join("; ")}</p>` : ""}<ul class="small">${f.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${f.betterLine ? `<p class="small"><strong>Stronger:</strong> ${esc(f.betterLine)}</p>` : ""}</div>`;
      })
    );
  }
}

const LI_CHECKS = [
  ["photo", "Professional photo (plain background, face fills the frame)"],
  ["banner", "Banner image (something about finance/tech or your photography)"],
  ["url", "Custom profile URL (linkedin.com/in/your-name)"],
  ["headline", "Headline from below"],
  ["about", "About section"],
  ["experience", "Experience + projects filled in"],
  ["skills", "5+ skills added"],
  ["featured", "Featured: portfolio / project links"],
  ["school", "Education: Canyon Crest Academy"],
  ["connections", "50+ connections (teachers, family friends, alumni)"],
];
function renderLinkedIn(root) {
  const b = brand();
  const li = b.linkedin;
  const done = LI_CHECKS.filter(([k]) => b.checks[k]).length;
  const score = Math.round((done / LI_CHECKS.length) * 100);
  const flagged = li ? unverifiedNumbers(JSON.stringify(li)) : [];
  root.innerHTML = `
    <div class="two-col">
      <section class="card"><div class="spread"><h2>Profile strength</h2>${ring(score, { size: 64, tone: score >= 80 ? "good" : "accent" })}</div>
        <div class="checks">${LI_CHECKS.map(([k, l]) => `<label class="check"><input type="checkbox" data-li="${k}" ${b.checks[k] ? "checked" : ""}> <span>${l}</span></label>`).join("")}</div>
        <p class="small muted">Tick items as you finish them on LinkedIn (you must be 16 to make an account — you turn 16 in ${esc(PROFILE.turns16 || "Dec 2026")}).</p></section>
      <section class="card"><h2>Generate</h2><p class="small muted">Writes your headline, About, experience text, skills, post ideas and message templates — only from your verified data. Every number is checked against your data.</p>
        ${AI.enabled() ? `<button class="btn primary" id="li-gen">${icon("sparkles")} ${li ? "Write it again" : "Write my profile"}</button>` : `<p class="small">Add your Claude API key in <a href="#settings">Settings</a>.</p>`}
        ${li ? (flagged.length ? `<div class="notice warn mt-s">${icon("alert")} Remove or verify these numbers before posting: ${flagged.map(esc).join(", ")}</div>` : `<p class="small good-text mt-s">${icon("check")} Every number matches your data</p>`) : ""}</section>
    </div>
    ${
      li
        ? `<section class="card"><h2>Headline</h2>${li.headlines.map((h) => `<div class="li-block"><p>${esc(h)}</p><div class="spread"><span class="small muted">${h.length}/220</span>${copyBtn(h)}</div></div>`).join("")}</section>
      <section class="card"><div class="spread"><h2>About</h2>${copyBtn(li.about)}</div><p class="pre">${esc(li.about)}</p></section>
      <section class="card"><h2>Experience & projects</h2>${(li.experience || []).map((x) => `<div class="li-block"><div class="spread"><strong>${esc(x.title)} · ${esc(x.org)}</strong>${copyBtn(x.text)}</div><p class="pre small">${esc(x.text)}</p></div>`).join("")}</section>
      <div class="two-col">
        <section class="card"><h2>Skills to add</h2><div class="chips">${(li.skills || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>
          <h3 class="mt">Feature these</h3><ul class="small">${(li.featured || []).map((f) => `<li><strong>${esc(f.title)}</strong> — ${esc(f.why)}</li>`).join("")}</ul></section>
        <section class="card"><h2>Post ideas</h2><ul class="small">${(li.posts || []).map((p) => `<li><strong>${esc(p.hook)}</strong><br>${esc(p.outline)}</li>`).join("")}</ul></section>
      </div>
      <div class="two-col">
        <section class="card"><div class="spread"><h2>Connection note</h2>${copyBtn(li.connect)}</div><p class="pre small">${esc(li.connect)}</p><div class="small muted">${li.connect.length}/300</div></section>
        <section class="card"><div class="spread"><h2>Message to a recruiter</h2>${copyBtn(li.recruiter)}</div><p class="pre small">${esc(li.recruiter)}</p></section>
      </div>`
        : ""
    }`;
  wireCopy(root);
  root.querySelectorAll("[data-li]").forEach((c) =>
    c.addEventListener("change", () => {
      const bb = brand();
      bb.checks[c.dataset.li] = c.checked;
      saveBrand(bb);
      renderLinkedIn(root);
    })
  );
  document.getElementById("li-gen")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const out = await AI.linkedin();
      const bb = brand();
      bb.linkedin = { ...out, at: Date.now() };
      saveBrand(bb);
      renderLinkedIn(root);
      Motion.reveal(root);
    })
  );
}

// =============== PRACTICE REPLAY & PROGRESS ===============
function findSession(id) {
  const all = sessions();
  return all.find((s) => s.id === id) || all[+String(id).replace(/^i/, "")] || null;
}
function sessionHref(s, i) {
  return `#session/${s.id || "i" + i}`;
}
function progressCardHTML(mode) {
  const all = sessions().filter((s) => !mode || s.mode === mode);
  if (!all.length) return "";
  const pts = all.slice(0, 15).reverse().map((s) => ({ x: new Date(s.at).toLocaleDateString(), y: s.score }));
  const best = Math.max(...all.map((s) => s.score));
  const recent = all.slice(0, 3).reduce((n, s) => n + s.score, 0) / Math.min(3, all.length);
  return `<section class="card"><div class="section-head"><h2>Your progress</h2><span class="small muted">best ${best} · recent avg ${Math.round(recent)}</span></div>${lineChart(pts, { min: 0, max: 100 })}</section>`;
}
function renderSession(id) {
  const s = findSession(id);
  if (!s) return (app.innerHTML = empty(`Session not found. <a href="#practice">Back to practice</a>`));
  if (!s.result) return (app.innerHTML = empty(`This session has no saved analysis. <a href="#practice">Back</a>`));
  // Reuse the full results page with this saved session.
  renderPracticeResult(s);
}
// Replays a saved conversation out loud, highlighting each line.
async function replayThread(thread, counterpart, btn) {
  if (replayThread.on) {
    replayThread.on = false;
    Voice.cancel();
    return;
  }
  Voice.unlock();
  replayThread.on = true;
  btn.innerHTML = `${icon("stop")} Stop replay`;
  const lines = [...document.querySelectorAll(".transcript.full p")];
  for (let i = 0; i < thread.length && replayThread.on; i++) {
    lines.forEach((l, j) => l.classList.toggle("now", j === i));
    lines[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const t = thread[i];
    await Voice.speak(t.text, t.from === "me" ? { gender: "male", seed: "mason-replay" } : { gender: counterpart?.gender, seed: counterpart?.name || "them" });
    if (replayThread.on) await wait(350);
  }
  replayThread.on = false;
  lines.forEach((l) => l.classList.remove("now"));
  if (btn.isConnected) btn.innerHTML = `${icon("play")} Replay conversation`;
}

// =============== DEADLINE REMINDERS ===============
function reminders() {
  const out = [];
  const month = new Date().getMonth();
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const [id, v] of Object.entries(tracker())) {
    if (["applied", "interview", "accepted", "rejected"].includes(v.status)) continue;
    const f = findRole(id);
    if (!f) continue;
    const org = f.r.org || f.c.name;
    if (v.date) {
      const d = daysUntil(v.date);
      if (d >= 0 && d <= 14) out.push({ days: d, urgent: d <= 7, text: `${org} — ${dueLabel(d).toLowerCase()}`, href: `#internship/${encodeURIComponent(id)}`, date: v.date, r: { ...f.r, org } });
      continue;
    }
    if (monthsAway(f.r.deadline) === 0) out.push({ days: 20, text: `${org} — deadline is usually in ${MONTHS[month]}. Set the exact date.`, href: `#internship/${encodeURIComponent(id)}` });
    const om = deadlineMonth(f.r.opens);
    if (om !== null && (om === month || om === (month + 1) % 12)) out.push({ days: 25, text: `${org} — applications usually open in ${MONTHS[om]}.`, href: `#internship/${encodeURIComponent(id)}` });
  }
  out.sort((a, b) => a.days - b.days);
  // Home-screen app icon badge (iPhone 16.4+, Chrome/Edge installed apps).
  try {
    const n = out.filter((x) => x.urgent).length;
    if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge?.();
  } catch {}
  return out;
}
function remindersHTML() {
  const list = reminders();
  if (!list.length) return "";
  const dated = list.filter((x) => x.date);
  return `<section class="card reminders"><div class="section-head"><h2>${icon("calendar")} Heads up</h2>${dated.length ? `<button class="btn small" id="rem-ics">${icon("download")} Add all to calendar</button>` : ""}</div>
    <div class="list compact">${list.slice(0, 5).map((x) => `<a class="list-row" href="${x.href}"><span class="dot ${x.urgent ? "urgent" : ""}"></span><span class="grow">${esc(x.text)}</span><span class="chev">›</span></a>`).join("")}</div></section>`;
}
function wireReminders() {
  document.getElementById("rem-ics")?.addEventListener("click", () => {
    const items = reminders().filter((x) => x.date);
    const clean = (s) => String(s).replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const ev = items.flatMap(({ r, date }) => {
      const d = date.replace(/-/g, "");
      const n = new Date(date + "T12:00:00");
      n.setDate(n.getDate() + 1);
      return ["BEGIN:VEVENT", `UID:${r.id}-${d}@launchpad`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${n.toISOString().slice(0, 10).replace(/-/g, "")}`, `SUMMARY:${clean(`Deadline: ${r.org} — ${r.title}`)}`, `DESCRIPTION:${clean(`Apply at ${r.url || "the official page"}.`)}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${clean("1 week left: " + r.org)}`, "END:VALARM", "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${clean("Due tomorrow: " + r.org)}`, "END:VALARM", "END:VEVENT"];
    });
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Launchpad//EN", ...ev, "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "Launchpad deadlines.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Calendar file with ${items.length} deadline${items.length === 1 ? "" : "s"} downloaded.`);
  });
}

// =============== STUDY: custom tracks, mock exams + certificates, case studies ===============
function allTracks() {
  return [...TRACKS, ...(study().custom || [])];
}
function findTrack(id) {
  return allTracks().find((t) => t.id === id) || (id === "mix" ? mixTrack() : null);
}
// A review quiz across every lesson you've finished.
function mixTrack() {
  const d = study().done;
  const lessons = allTracks().flatMap((t) => t.lessons.filter((_, i) => d[lessonKey(t.id, i)]).map((l) => `${t.name}: ${l}`));
  return { id: "mix", name: "Mixed review", icon: "layers", blurb: "Questions from every lesson you've finished.", lessons: lessons.length ? lessons : TRACKS.slice(0, 4).flatMap((t) => t.lessons.slice(0, 3).map((l) => `${t.name}: ${l}`)), virtual: true };
}
async function createTrack(topic) {
  const j = await AI.buildTrack(topic);
  const s = study();
  const t = { id: "c-" + uid(), name: j.name, icon: "sparkles", blurb: j.blurb, lessons: j.lessons.slice(0, 10), custom: true, at: Date.now() };
  s.custom = [...(s.custom || []), t];
  saveStudy(s);
  return t;
}
function deleteTrack(id) {
  const s = study();
  s.custom = (s.custom || []).filter((t) => t.id !== id);
  saveStudy(s);
}

const EXAM = { n: 20, pass: 80, minutes: 30 };
let EX = null;
function certFor(trackId) {
  return (study().certs || {})[trackId];
}
function renderExam(id) {
  const t = findTrack(id);
  if (!t || t.virtual) return (app.innerHTML = empty(`Exam not found. <a href="#study">Back</a>`));
  const cert = certFor(t.id);
  if (!EX || EX.track !== t.id || EX.state === "intro") {
    EX = { track: t.id, state: "intro" };
    const past = (study().exams || []).filter((e) => e.track === t.id);
    app.innerHTML = `
      <a class="back" href="#study/${t.id}">‹ ${esc(t.name)}</a>
      <section class="card lesson exam-intro">
        <div class="eyebrow">Mock exam</div><h1>${esc(t.name)} certificate exam</h1>
        <p class="muted">${EXAM.n} questions written fresh by Claude across all ${t.lessons.length} lessons · ${EXAM.minutes}-minute timer · pass with ${EXAM.pass}% to earn your certificate. You see explanations at the end.</p>
        ${cert ? `<div class="notice good">${icon("award")} You earned this certificate on ${new Date(cert.at).toLocaleDateString()} with ${cert.score}%. <button class="linkbtn" id="ex-cert">View certificate</button></div>` : ""}
        ${past.length ? `<p class="small muted">Past attempts: ${past.slice(0, 5).map((e) => `${e.pct}%`).join(" · ")}</p>` : ""}
        ${AI.enabled() ? `<button class="btn primary" id="ex-start">${icon("play")} Start exam</button>` : `<p>Add your Claude API key in <a href="#settings">Settings</a>.</p>`}
      </section>`;
    document.getElementById("ex-cert")?.addEventListener("click", () => showCert(t, cert));
    document.getElementById("ex-start")?.addEventListener("click", (e) =>
      busy(e.currentTarget, async () => {
        const seed = Math.random().toString(36).slice(2, 7);
        const half = Math.ceil(t.lessons.length / 2);
        const [a, b] = await Promise.all([AI.examQuestions(t, t.lessons.slice(0, half), 10, seed + "a"), AI.examQuestions(t, t.lessons.slice(half).length ? t.lessons.slice(half) : t.lessons, 10, seed + "b")]);
        const qs = [...a, ...b].slice(0, EXAM.n);
        if (qs.length < 10) throw new Error("Couldn't write enough questions — try again.");
        EX = { track: t.id, state: "live", qs, ans: {}, i: 0, start: Date.now() };
        drawExam(t);
      })
    );
    return;
  }
  drawExam(t);
}
function drawExam(t) {
  if (EX.state === "done") return drawExamResult(t);
  const q = EX.qs[EX.i];
  const answered = Object.keys(EX.ans).length;
  app.innerHTML = `
    <div class="exam-top"><div><div class="eyebrow">${esc(t.name)} · mock exam</div><strong>Question ${EX.i + 1} of ${EX.qs.length}</strong></div><span class="pill mono" id="ex-clock"></span></div>
    <div class="bar"><i style="width:${(answered / EX.qs.length) * 100}%"></i></div>
    <section class="card lesson"><p class="exam-q">${esc(q.q)}</p>${q.options.map((o, oi) => `<button class="quiz-opt ${EX.ans[EX.i] === oi ? "picked" : ""}" data-pick="${oi}">${esc(o)}</button>`).join("")}</section>
    <div class="exam-dots">${EX.qs.map((_, i) => `<button class="${i === EX.i ? "cur" : ""} ${i in EX.ans ? "done" : ""}" data-go="${i}">${i + 1}</button>`).join("")}</div>
    <div class="row lesson-nav"><button class="btn" id="ex-prev" ${EX.i ? "" : "disabled"}>‹ Back</button><button class="btn" id="ex-next">${EX.i + 1 < EX.qs.length ? "Next ›" : "Review"}</button><button class="btn primary" id="ex-submit">Submit (${answered}/${EX.qs.length})</button></div>`;
  const tick = () => {
    const el = document.getElementById("ex-clock");
    if (!el || EX.state !== "live") return clearInterval(drawExam._t);
    const left = EXAM.minutes * 60 - Math.floor((Date.now() - EX.start) / 1000);
    if (left <= 0) {
      toast("Time's up — submitting.");
      return submitExam(t);
    }
    el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    el.classList.toggle("bad-text", left < 120);
  };
  clearInterval(drawExam._t);
  drawExam._t = setInterval(tick, 1000);
  tick();
  app.querySelectorAll("[data-pick]").forEach((b) =>
    b.addEventListener("click", () => {
      EX.ans[EX.i] = +b.dataset.pick;
      if (EX.i + 1 < EX.qs.length) EX.i++;
      drawExam(t);
    })
  );
  app.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => ((EX.i = +b.dataset.go), drawExam(t))));
  document.getElementById("ex-prev").onclick = () => ((EX.i = Math.max(0, EX.i - 1)), drawExam(t));
  document.getElementById("ex-next").onclick = () => ((EX.i = Math.min(EX.qs.length - 1, EX.i + 1)), drawExam(t));
  document.getElementById("ex-submit").onclick = () => {
    const left = EX.qs.length - Object.keys(EX.ans).length;
    if (left && !confirm(`${left} question${left === 1 ? " is" : "s are"} unanswered. Submit anyway?`)) return;
    submitExam(t);
  };
}
function submitExam(t) {
  clearInterval(drawExam._t);
  const right = EX.qs.filter((q, i) => EX.ans[i] === q.answer).length;
  const p = Math.round((right / EX.qs.length) * 100);
  Object.assign(EX, { state: "done", right, pct: p, secs: Math.round((Date.now() - EX.start) / 1000) });
  const s = study();
  s.exams = [{ track: t.id, pct: p, right, of: EX.qs.length, at: Date.now() }, ...(s.exams || [])].slice(0, 60);
  if (p >= EXAM.pass && (!s.certs?.[t.id] || s.certs[t.id].score < p)) s.certs = { ...(s.certs || {}), [t.id]: { at: Date.now(), score: p, name: t.name, code: uid().slice(0, 8).toUpperCase() } };
  saveStudy(s);
  drawExamResult(t);
  Motion.page();
}
function drawExamResult(t) {
  const passed = EX.pct >= EXAM.pass;
  const byTopic = {};
  EX.qs.forEach((q, i) => {
    const k = q.topic || "General";
    byTopic[k] ||= { right: 0, of: 0 };
    byTopic[k].of++;
    if (EX.ans[i] === q.answer) byTopic[k].right++;
  });
  const weak = Object.entries(byTopic).filter(([, v]) => v.right / v.of < 0.7);
  app.innerHTML = `
    <a class="back" href="#study/${t.id}">‹ ${esc(t.name)}</a>
    <section class="card score-hero">${ring(EX.pct, { size: 132, label: EX.pct + "%", tone: passed ? "good" : "warn" })}<div><div class="eyebrow">Mock exam</div><h1>${passed ? "Passed — certificate earned" : "Not yet — keep going"}</h1><p class="muted">${EX.right}/${EX.qs.length} correct in ${Math.floor(EX.secs / 60)}m ${EX.secs % 60}s. ${passed ? "" : `You need ${EXAM.pass}% to pass.`}</p>
      <div class="row">${passed ? `<button class="btn primary" id="ex-cert">${icon("award")} View certificate</button>` : ""}<button class="btn" id="ex-again">${icon("refresh")} New exam</button></div></div></section>
    ${weak.length ? `<section class="card"><h2>Review these topics</h2><ul>${weak.map(([k, v]) => `<li>${esc(k)} — ${v.right}/${v.of}</li>`).join("")}</ul></section>` : ""}
    <section class="card"><h2>Answers & explanations</h2>${EX.qs
      .map((q, i) => {
        const ok = EX.ans[i] === q.answer;
        return `<div class="quiz-q"><p><strong>${i + 1}. ${esc(q.q)}</strong></p><p class="small ${ok ? "good-text" : "bad-text"}">${ok ? icon("check") + " Correct" : `${icon("x")} You chose: ${EX.ans[i] != null ? esc(q.options[EX.ans[i]]) : "(blank)"}`}</p>${ok ? "" : `<p class="small">Answer: <strong>${esc(q.options[q.answer])}</strong></p>`}<p class="small muted">${esc(q.why || "")}</p></div>`;
      })
      .join("")}</section>`;
  document.getElementById("ex-cert")?.addEventListener("click", () => showCert(t, certFor(t.id)));
  document.getElementById("ex-again").onclick = () => {
    EX = null;
    renderExam(t.id);
  };
}
function certHTML(t, c) {
  return `<div class="cert"><div class="cert-mark">${icon("trend")}</div><div class="cert-eyebrow">Launchpad · Certificate of completion</div>
    <div class="cert-name">${esc(PROFILE.name)}</div><div class="cert-line">passed the practice exam for</div><div class="cert-track">${esc(t.name)}</div>
    <div class="cert-meta"><span>Score ${c.score}%</span><span>${new Date(c.at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span><span>ID ${esc(c.code || "")}</span></div>
    <div class="cert-note">Self-study practice certificate · ${t.lessons.length} lessons · ${EXAM.n}-question exam, ${EXAM.pass}% to pass. Not an accredited credential.</div></div>`;
}
function showCert(t, c) {
  if (!c) return;
  modalBody.innerHTML = `<div class="spread"><h2>Certificate</h2><button class="btn ghost" data-close>✕</button></div>${certHTML(t, c)}
    <div class="row mt"><button class="btn primary" id="cert-print">${icon("download")} Print / save as PDF</button></div>
    <p class="small muted">For your own motivation and portfolio. Don't list it under “Certifications” on a resume — it isn't an accredited credential.</p>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector("[data-close]").onclick = () => modal.close();
  document.getElementById("cert-print").onclick = () => {
    document.getElementById("print-root").innerHTML = certHTML(t, c);
    modal.close();
    setTimeout(() => window.print(), 50);
  };
}

const CASE_CATS = [
  { id: "stock", name: "Stock pitch", icon: "trend", prompt: "Decide buy/hold/sell on a fictional public company using its financial summary and news." },
  { id: "valuation", name: "Valuation", icon: "gauge", prompt: "Value a fictional small business or startup with comparables and simple cash-flow math." },
  { id: "planning", name: "Financial planning client", icon: "target", prompt: "Build a plan for a fictional client: budget, emergency fund, debt, retirement accounts, risk." },
  { id: "trading", name: "Trading strategy review", icon: "code", prompt: "Evaluate a fictional backtest (returns, drawdown, win rate, costs) and decide if it's ready for paper trading." },
  { id: "business", name: "Business strategy", icon: "briefcase", prompt: "A fictional company faces a growth or profitability problem; size the market and recommend a move." },
  { id: "product", name: "App / product launch", icon: "sparkles", prompt: "A fictional consumer app must pick pricing and a growth plan from user and cost data." },
];
let CS = null;
function renderCases() {
  const past = study().cases || [];
  const diff = renderCases.diff || "realistic";
  app.innerHTML = `
    <a class="back" href="#study">‹ Study</a>
    <div class="page-head"><div><div class="eyebrow">Study</div><h1>Case studies</h1><p class="muted">Real-world scenarios like the ones finance and consulting interviews use. Read the situation and the data, answer 3 questions, and Claude grades you with model answers.</p></div></div>
    <label class="field"><span>Difficulty</span><div class="segmented" id="cs-diff">${["easy", "realistic", "tough"].map((d) => `<button data-d="${d}" class="${diff === d ? "on" : ""}">${LEVEL_LABEL[d]}</button>`).join("")}</div></label>
    <div class="grid cards3">${CASE_CATS.map((c) => {
      const mine = past.filter((x) => x.cat === c.id);
      return `<button class="card clickable case-cat" data-cat="${c.id}"><div class="track-icon">${icon(c.icon)}</div><h3>${c.name}</h3><p class="small muted">${c.prompt}</p><div class="small">${mine.length ? `${mine.length} done · best ${Math.max(...mine.map((x) => x.grade?.overall || 0))}` : "New"}</div></button>`;
    }).join("")}</div>
    ${past.length ? `<section class="card"><h2>Your cases</h2><div class="list compact">${past.slice(0, 12).map((x) => `<a class="list-row" href="#case/${x.id}">${x.grade ? ring(x.grade.overall, { size: 40 }) : `<span class="pill">Open</span>`}<div class="grow"><div class="row-title">${esc(x.title)}</div><div class="small muted">${esc(CASE_CATS.find((c) => c.id === x.cat)?.name || "")} · ${new Date(x.at).toLocaleDateString()}</div></div><span class="chev">›</span></a>`).join("")}</div></section>` : ""}`;
  app.querySelectorAll("#cs-diff [data-d]").forEach((b) => (b.onclick = () => ((renderCases.diff = b.dataset.d), renderCases())));
  app.querySelectorAll("[data-cat]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!AI.enabled()) return toast("Add your Claude API key in Settings first.");
      busy(b, async () => {
        const cat = CASE_CATS.find((c) => c.id === b.dataset.cat);
        const c = await AI.caseStudy(cat, diff);
        const s = study();
        const entry = { id: uid(), cat: cat.id, at: Date.now(), difficulty: diff, ...c, answers: [] };
        s.cases = [entry, ...(s.cases || [])].slice(0, 40);
        saveStudy(s);
        go("case/" + entry.id);
      });
    })
  );
}
function renderCase(id) {
  const s = study();
  const c = (s.cases || []).find((x) => x.id === id);
  if (!c) return (app.innerHTML = empty(`Case not found. <a href="#cases">Back</a>`));
  const g = c.grade;
  const table = (ex) => `<div class="table-wrap"><table class="table"><caption>${esc(ex.title)}</caption>${(ex.rows || []).map((r, i) => `<tr>${r.map((cell) => (i ? `<td>${esc(cell)}</td>` : `<th>${esc(cell)}</th>`)).join("")}</tr>`).join("")}</table></div>`;
  app.innerHTML = `
    <a class="back" href="#cases">‹ Case studies</a>
    <article class="card lesson">
      <div class="eyebrow">${esc(CASE_CATS.find((x) => x.id === c.cat)?.name || "Case")} · ${LEVEL_LABEL[c.difficulty] || ""}</div>
      <h1>${esc(c.title)}</h1>
      ${c.role ? `<p class="small muted">You are: ${esc(c.role)}</p>` : ""}
      ${richText(c.context)}
      ${(c.exhibits || []).map(table).join("")}
      ${g ? `<div class="score-hero mt">${ring(g.overall, { size: 96 })}<p><strong>${esc(g.summary)}</strong></p></div>` : ""}
      ${c.questions
        .map(
          (q, i) => `<div class="case-q"><h2>${i + 1}. ${esc(q.q)}</h2>
          ${g ? `<div class="quote">${esc(c.answers[i] || "(blank)")}</div><div class="rubric-row"><div class="spread small"><strong>Score</strong><span>${g.perQuestion[i]?.score ?? "—"}</span></div><div class="bar"><i style="width:${g.perQuestion[i]?.score || 0}%"></i></div></div><p class="small">${esc(g.perQuestion[i]?.feedback || "")}</p><div class="callout"><strong>Model answer</strong><p>${esc(g.perQuestion[i]?.model || "")}</p></div>` : `<details class="small muted"><summary>Hint</summary>${esc(q.hint || "")}</details><textarea data-a="${i}" rows="5" placeholder="Your answer — show your reasoning and any math.">${esc(c.answers[i] || "")}</textarea>${SR ? `<button class="btn small ghost" data-dict="${i}">${icon("mic")} Dictate</button>` : ""}`}
        </div>`
        )
        .join("")}
      ${g ? `${g.skills?.length ? `<p class="small muted">Skills: ${g.skills.map(esc).join(" · ")}</p>` : ""}<div class="row"><a class="btn primary" href="#cases">Another case</a></div>` : `<div class="row"><button class="btn primary" id="cs-grade">${icon("sparkles")} Submit for grading</button><span class="small muted">Answers save as you type.</span></div>`}
    </article>`;
  const saveAns = () => {
    const st = study();
    const x = st.cases.find((y) => y.id === id);
    x.answers = [...app.querySelectorAll("[data-a]")].map((t) => t.value);
    saveStudy(st);
  };
  app.querySelectorAll("[data-a]").forEach((t) => t.addEventListener("input", () => (clearTimeout(renderCase._t), (renderCase._t = setTimeout(saveAns, 500)))));
  app.querySelectorAll("[data-dict]").forEach((b) => b.addEventListener("click", () => dictateInto(app.querySelector(`[data-a="${b.dataset.dict}"]`), b)));
  document.getElementById("cs-grade")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      saveAns();
      const st = study();
      const x = st.cases.find((y) => y.id === id);
      if (x.answers.filter((a) => a.trim().length > 15).length < 2) throw new Error("Answer at least two questions first.");
      x.grade = await AI.gradeCase(x, x.answers);
      saveStudy(st);
      renderCase(id);
      Motion.page();
    })
  );
}
// Dictation into any textarea using the shared Listener (works on iPhone because it starts from this tap).
function dictateInto(ta, btn) {
  if (dictateInto.l?.active) return dictateInto.l.flush();
  Voice.cancel();
  const before = ta.value ? ta.value.replace(/\s*$/, " ") : "";
  const label = btn.innerHTML;
  dictateInto.l = new Listener({
    silenceMs: 4000,
    onText: (t) => (ta.value = before + t),
    onTurn: (t) => {
      ta.value = before + t;
      ta.dispatchEvent(new Event("input"));
    },
    onState: (st) => {
      btn.innerHTML = st === "listening" ? `${icon("stop")} Stop` : label;
      btn.classList.toggle("on", st === "listening");
    },
  });
  dictateInto.l.start();
}
