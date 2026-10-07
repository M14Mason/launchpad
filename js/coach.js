// Coaching extras: live delivery alerts while you talk, a Hint button in meetings,
// "Watch an expert" (an example meeting played out loud in two voices) and your Portfolio page.

// ---------- live delivery alerts ----------
const LiveCoach = {
  timer: null,
  shown: {},
  lastAt: 0,
  enabled() {
    return getSettings().liveAlerts !== false;
  },
  watch() {
    clearInterval(this.timer);
    this.shown = {};
    this.turnStart = null;
    if (!this.enabled()) return;
    this.timer = setInterval(() => this.check(), 500);
  },
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  },
  alert(id, text, tone = "warn") {
    if (this.shown[id] || Date.now() - this.lastAt < 4000) return;
    this.shown[id] = true;
    this.lastAt = Date.now();
    let el = document.getElementById("lv-coach");
    if (!el) {
      const you = document.querySelector(".live .you");
      if (!you) return;
      el = document.createElement("div");
      el.id = "lv-coach";
      el.className = "lv-coach";
      you.after(el);
    }
    el.className = `lv-coach show ${tone}`;
    el.textContent = text;
    clearTimeout(this._hide);
    this._hide = setTimeout(() => el && (el.className = "lv-coach"), 3800);
    if (window.gsap && !Motion.reduced) gsap.fromTo(el, { y: 8, scale: 0.9 }, { y: 0, scale: 1, duration: 0.35, ease: "back.out(2.5)" });
  },
  check() {
    if (P.phase !== "live" || !P.listening) return;
    const L = P.listener;
    const text = (document.getElementById("lv-you-text")?.textContent || "").replace(/…/g, " ").trim();
    const words = text ? text.split(/\s+/).filter((w) => /\w/.test(w)).length : 0;
    const m = L?.metrics;
    if (!this.turnStart && (words > 0 || m?.first)) this.turnStart = m?.first ? performance.timeOrigin + m.first : Date.now();
    if (!this.turnStart) return;
    const secs = (Date.now() - this.turnStart) / 1000;
    // Pace: more than ~170 words a minute for a few seconds.
    if (secs >= 5 && words >= 12 && (words / secs) * 60 > 172) this.alert("pace", "Slow down! 🐢");
    // Fillers: words you said plus "um/uh" heard in the audio.
    const fillers = (text.match(/\b(um+|uh+|erm|you know|kind of|sort of|like,)\b/gi) || []).length + (m?.fillers || 0);
    if (fillers >= 3) this.alert("fill", "Watch the ums — pause instead");
    // Energy: very flat pitch for a while.
    if (m?.pitches?.length >= 40) {
      const semis = m.pitches.slice(-80).map((f) => 12 * Math.log2(f / 100));
      const mean = semis.reduce((a, b) => a + b, 0) / semis.length;
      const sd = Math.sqrt(semis.reduce((a, b) => a + (b - mean) ** 2, 0) / semis.length);
      if (sd < 1.1) this.alert("flat", "Add some energy — vary your tone");
    }
    // Volume: trailing off compared with how you started.
    if (m?.rms?.length >= 40) {
      const sorted = [...m.rms].sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      const recent = m.rms.slice(-15).reduce((a, b) => a + b, 0) / 15;
      if (recent < med * 0.45) this.alert("vol", "Speak up a little");
    }
    // Monologue: long turns without letting them talk.
    if (secs > (P.kind === "interview" ? 100 : 45) && words > 90) this.alert("long", P.kind === "interview" ? "Wrap it up — land your point" : "You've been talking a while — ask them a question", "info");
  },
};
// Turn the coach on whenever the mic starts listening.
{
  const _listen = listen;
  listen = function () {
    _listen.apply(this, arguments);
    if (P.phase === "live") LiveCoach.watch();
  };
}

// ---------- Hint button ----------
const HINT_FOR = {
  intro: "Warm up first: “Thanks for coming in — how's your week been?”",
  process: "Set the agenda: “Today I'll learn about your situation, then I'll build a plan and walk you through it.”",
  goals: "Ask about what matters: “If money weren't a worry, what would you love to do in the next 5–10 years?”",
  cash: "Ask about cash flow: “What do you take home each month after taxes, and what does rent cost?”",
  assets: "Ask about savings: “How much do you have set aside for emergencies right now?”",
  debts: "Ask about debts: “Walk me through any debts — the balance, the interest rate and the monthly payment.”",
  retire: "Ask about retirement: “Do you have a 401(k) at work? Does your employer match?”",
  risk: "Ask about risk: “If your investments dropped 20% in a year, what would you do?”",
  protect: "Ask about protection: “If something happened to you, who depends on your income? Any life insurance or a will?”",
  docs: "Ask for documents: “Could you send me your pay stubs and bank statements? They help me get the numbers right.”",
  next: "Close with next steps: “Here's what happens next — I'll build your plan and we'll meet in two weeks to go over it.”",
  recap: "Start with a recap: “Last time you told me ___ matters most. Here's the plan built around that.”",
  check: "Check in: “How does that sound? Anything that doesn't feel right?”",
  reconnect: "Reconnect: “Good to talk again — how have things been?”",
  anything: "Open the door: “Is there anything else on your mind before we wrap up?”",
  changes: "Ask what's new: “What's changed since we last met — job, family, spending?”",
  invest: "Talk portfolio: “Your mix is ___% stocks — here's why it fits how you feel about risk.”",
  adjust: "Adjust the plan: “Based on what's changed, I'd suggest we ___.”",
  personal: "Remember them: bring up something personal they told you before (a kid, a pet, a trip).",
  empathy: "Lead with empathy: “That sounds really hard. Take your time.”",
  honest: "Be honest with numbers: “Here's what the math shows…”",
  options: "Offer choices: “We have a couple of options — we could ___ or ___.”",
  nopressure: "Slow it down: “There's no rush to decide today.”",
  listen: "Get to the why: “What made you start thinking about this?”",
  answer: "Tie it to their plan: “Here's how that fits your plan…”",
  greet: "Answer warmly: “Hi! Of course — what's going on?”",
};
async function giveHint() {
  if (P.phase !== "live") return;
  P.hints = (P.hints || 0) + 1;
  let tip = "";
  const c = P.sc.clientId ? Clients.find(P.sc.clientId) : null;
  if (c) {
    const ag = Clients.agendaStatus(c, P.sc.meetingType, P.thread, P.sc);
    const next = ag.find((a) => !a.done && !/^(news-mkt|steer)/.test(a.id));
    if (next) tip = HINT_FOR[next.id] || (next.id.startsWith("gap-") || next.need ? `Still missing: ${next.label}. Ask about it directly.` : next.id.startsWith("news-") ? `They had news — ask: “How are you doing with ${next.label.replace(/^Follow up on their news: /, "")}?”` : `Next on your agenda: ${next.label}.`);
  }
  if (!tip) tip = { interview: "Use STAR: the situation, your task, what YOU did, and the result — with a number.", networking: "Ask about them: “What do you enjoy most about your work?” — then make one small ask.", sales: "Find their pain first: “What's the most frustrating part of how you do this today?”" }[P.kind] || "Ask an open question, then listen.";
  if (AI.enabled() && !P.sc.offline) {
    try {
      const out = await Promise.race([
        AI.ask(`You are coaching Mason (15) live during a practice ${P.kind === "fpclient" ? "financial-planning client meeting" : P.kind}. In ONE short sentence, tell him the single best thing to say or ask next, as a quote he could say. Transcript:\n${P.thread.slice(-8).map((t) => `${t.from === "me" ? "Mason" : P.sc.counterpart.name}: ${t.text}`).join("\n")}`, { effort: "low", maxTokens: 200, timeout: 8000 }),
        new Promise((r) => setTimeout(() => r(""), 8000)),
      ]);
      if (out && out.length < 260) tip = out.trim();
    } catch {}
  }
  let box = document.getElementById("lv-hintbox");
  if (!box) {
    box = document.createElement("div");
    box.id = "lv-hintbox";
    box.className = "lv-hintbox";
    document.querySelector(".live .controls")?.after(box);
  }
  box.innerHTML = `${icon("bulb")} <span>${esc(tip)}</span>`;
  box.hidden = false;
  toast(`Hint used — costs 3 points (${P.hints} so far).`);
}
{
  const _renderLive = renderLive;
  renderLive = function () {
    _renderLive.apply(this, arguments);
    if ((P.thread || []).length <= 1) P.hints = 0;
    const controls = document.querySelector(".live .controls");
    if (controls && !document.getElementById("lv-hint-btn")) {
      const b = document.createElement("button");
      b.className = "btn ghost";
      b.id = "lv-hint-btn";
      b.innerHTML = `${icon("bulb")} Hint`;
      b.onclick = giveHint;
      controls.appendChild(b);
    }
  };
}

// ---------- Watch an expert ----------
// An example of this meeting done well with this client: the expert and the client in two voices.
const EXPERT_CACHE = {};
function expertScript(c, type) {
  const v = (n) => Clients.usd(n);
  const F = Clients.fields(c);
  const fsay = (key) => {
    const f = F.find((x) => x.key === key);
    return f ? f.say((n) => (c.truth.levels[1] >= 4 ? v(n) : "around " + v(Math.round(n / 100) * 100))) : "";
  };
  const t = c.truth;
  const goal = t.goals.find((g) => g.id !== "retire" && !g.hidden) || t.goals[0];
  const debt = [...t.debts].sort((a, b) => b.apr - a.apr)[0];
  const L = [];
  const P_ = (text, why) => L.push({ who: "planner", text, why });
  const C_ = (text) => text && L.push({ who: "client", text });
  if (type === "discovery") {
    P_(`Hi ${c.first}, thanks for coming in. How's your week been so far?`, "Rapport first — people share more with someone they like.");
    C_("Busy, but good. Honestly, a little nervous about this.");
    P_("That's really normal. Here's how today works: I'll ask about your situation and what matters to you, then I'll build a plan and walk you through it. Nothing you say leaves this room.", "Explaining the process lowers anxiety and builds trust.");
    C_("Okay, that helps.");
    P_("So what made you decide to reach out now?", "An open question — let them tell their story.");
    C_(`Mostly ${Clients.worriesNow(c)[0].replace(/^the /, "my ").replace(/^their /, "my ")}. I just want a plan.`);
    P_("Thanks for telling me that. Let's start with the basics — what do you take home each month after taxes?", "Acknowledge, then move to cash flow — the foundation of every plan.");
    C_(fsay("takeHome"));
    P_("And what goes to rent or the mortgage, and roughly everything else in a month?", "Two numbers in one natural question.");
    C_([fsay("housing"), fsay("living")].join(" "));
    if (debt) {
      P_("Walk me through any debts — balances, interest rates, and the monthly payments.", "Every debt with its rate — the rate decides what to pay first.");
      C_([fsay("debt-" + debt.id), fsay("apr-" + debt.id)].join(" "));
    }
    P_("How much do you have set aside for emergencies?", "Savings tells you how fragile things are today.");
    C_(fsay("cash"));
    P_("Does your job offer a 401(k), and does your employer match?", "The match is free money — never miss it.");
    C_([fsay("k401"), fsay("match")].join(" "));
    P_("If money weren't a worry, what would you love it to do for you?", "Big-picture goals in their own words.");
    C_(goal ? Clients.fields(c).find((f) => f.key === "goal-" + goal.id)?.say((n) => v(n)) : "Honestly, just feel less stressed.");
    P_("I love that. If your investments dropped 20% in a year, what would you do?", "Risk tolerance from how they'd actually behave.");
    C_(fsay("risk"));
    P_(`So what I'm hearing is: ${Clients.worriesNow(c)[0].replace(/^the /, "your ").replace(/^their /, "your ")} is the big stress, and you want ${goal ? goal.name.toLowerCase() : "more security"}. Did I get that right?`, "Summarize — it proves you listened.");
    C_("Yeah, that's exactly it.");
    P_("Great. Could you send me your recent pay stubs and statements? I'll build your plan and we'll meet in two weeks to go over it.", "Documents plus a clear next step.");
    C_("Sounds good. Thank you — I feel better already.");
  } else if (type === "presentation" || type === "review") {
    const p = c.plan || {};
    P_(`Good to see you, ${c.first}! ${type === "review" ? "How have things been since we last met?" : "Before I share the plan — anything new since we talked?"}`, "Check in before the numbers.");
    C_(c.pendingEvents?.[0]?.say || "Pretty steady, actually.");
    P_(`Last time you told me ${Clients.worriesNow(c)[0].replace(/^the /, "the ")} keeps you up at night. Everything in this plan starts there.`, "Connect the plan to what they said.");
    C_("Okay, I like that.");
    if (p.efMonthly) (P_(`Step one: ${v(p.efMonthly)} a month into an emergency fund, so a surprise bill never goes on a credit card.`, "Explain the why, not just the what."), C_("That makes sense."));
    if (p.extraDebt && debt) (P_(`Step two: an extra ${v(p.extraDebt)} a month to the ${debt.name.toLowerCase()} — at ${debt.apr}% it's costing you the most.`, "Avalanche, explained in plain words."), C_("So the expensive one goes first. Got it."));
    P_(`You'll put ${p.k401Pct ?? t.match ?? 5}% into your 401(k) so you get every dollar of the match.`, "Never leave the match on the table.");
    C_("I didn't realize I was missing that.");
    P_(`Your investments will be about ${p.alloc?.stocks ?? 60}% stocks, because you told me big drops make you nervous — this keeps the swings smaller.`, "Tie the allocation to their own risk answers.");
    C_("Okay. That feels right.");
    P_("How does all of that feel? Anything that doesn't sit right?", "Check understanding and comfort.");
    C_("No, it actually feels doable.");
    P_("Great. This week: set up the automatic transfers. I'll send a summary, and we'll check in in three months.", "Specific next steps and a follow-up date.");
    C_("Perfect. Thank you!");
  } else {
    P_(`Hi ${c.first}, good to hear from you. What's going on?`, "Warm and open.");
    C_("I just had a quick question.");
    P_("Of course. Tell me what made you think about it.", "Find the worry behind the question.");
    C_("I saw some news and got nervous.");
    P_("That's completely understandable. Your plan already expects bumps like this — let's look at it together at our next meeting.", "Empathy, perspective, next step.");
    C_("Okay. That helps, thanks.");
  }
  return L.filter((l) => l.text && l.text.trim());
}
async function expertScriptAI(c, type) {
  const out = await AI.ask(
    `Write an EXAMPLE of an expert financial planner running a ${Clients.MEETING_NAME[type] || type} with this practice client, for a 15-year-old learning the job. 12-16 short spoken lines alternating planner and client, natural and warm, plain English, with real numbers from the client's situation. For each planner line add a short "why" (one sentence on the technique).
Client notes:
${Clients.notesFor(c)}
${c.plan ? `Mason's plan: ${JSON.stringify({ efMonthly: c.plan.efMonthly, extraDebt: c.plan.extraDebt, k401Pct: c.plan.k401Pct, alloc: c.plan.alloc, goalSavings: c.plan.goalSavings })}` : ""}
Return ONLY JSON: {"lines":[{"who":"planner"|"client","text":"...","why":"..."}]}`,
    { maxTokens: 2500, timeout: 45000 }
  );
  const j = AI.parseJSON(out, null);
  if (!j?.lines?.length) throw new Error("No script");
  return j.lines.filter((l) => l.text);
}
function renderExpert(arg = "") {
  const [id, type = "discovery"] = arg.split("/");
  const c = Clients.find(id);
  if (!c) return (app.innerHTML = empty(`Client not found. <a href="#fp">Financial planning</a>`));
  const key = id + type;
  const lines = EXPERT_CACHE[key] || expertScript(c, type);
  const expertCh = CHARACTERS.find((x) => x.gender !== c.gender) || CHARACTERS[0];
  app.innerHTML = `
    <a class="back" href="#client/${c.id}/meetings">‹ ${esc(c.first)}'s file</a>
    <div class="page-head"><div><div class="eyebrow">Watch an expert</div><h1>${esc(Clients.MEETING_NAME[type] || type)} with ${esc(c.first)}</h1><p class="muted">Listen to how a seasoned planner would run this meeting with the same client. The notes explain each move.</p></div>
      <div class="row wrap-gap">${["discovery", "presentation", "review"].map((t) => `<a class="btn small ${t === type ? "primary" : ""}" href="#expert/${c.id}/${t}">${Clients.MEETING_NAME[t]}</a>`).join("")}</div></div>
    <section class="card"><div class="row wrap-gap"><button class="btn primary" id="ex-play">${icon("play")} Play out loud</button><button class="btn" id="ex-stop">${icon("stop")} Stop</button>${AI.enabled() ? `<button class="btn ghost" id="ex-ai">${icon("sparkles")} Fresh example from Claude</button>` : ""}<span class="small muted">Expert: ${esc(expertCh.name)} · Client: ${esc(c.first)}</span></div>
      <div class="ex-lines" id="ex-lines">${lines.map((l, i) => `<div class="ex-line ${l.who}" data-i="${i}"><div class="ex-who">${l.who === "planner" ? "Expert" : esc(c.first)}</div><div class="ex-text">${esc(l.text)}</div>${l.why ? `<div class="ex-why">${icon("bulb")} ${esc(l.why)}</div>` : ""}</div>`).join("")}</div></section>`;
  let playing = false;
  const stop = () => {
    playing = false;
    Voice.cancel();
    app.querySelectorAll(".ex-line").forEach((x) => x.classList.remove("now"));
  };
  document.getElementById("ex-stop").onclick = stop;
  document.getElementById("ex-play").onclick = async () => {
    if (playing) return;
    playing = true;
    Voice.unlock?.();
    const persona = Clients.persona(c);
    for (let i = 0; i < lines.length && playing && location.hash.startsWith("#expert"); i++) {
      const row = app.querySelector(`.ex-line[data-i="${i}"]`);
      app.querySelectorAll(".ex-line").forEach((x) => x.classList.toggle("now", x === row));
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      const l = lines[i];
      await Voice.speak(l.text, l.who === "planner" ? { persona: expertCh, gender: expertCh.gender, seed: "expert" } : { persona, gender: c.gender, seed: c.id });
      await new Promise((r) => setTimeout(r, 250));
    }
    stop();
  };
  document.getElementById("ex-ai")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      try {
        EXPERT_CACHE[key] = await expertScriptAI(c, type);
        stop();
        renderExpert(arg);
      } catch (err) {
        toast("Couldn't write a new example right now — showing the built-in one.");
      }
    })
  );
}

// ---------- Portfolio ----------
function portfolioHTML() {
  const all = Clients.all();
  const anon = (c, i) => `Client ${String.fromCharCode(65 + i)} — ${c.age}, ${c.job.toLowerCase()}`;
  const plans = all.filter((c) => c.plan?.grade).sort((a, b) => b.plan.grade.total - a.plan.grade.total).slice(0, 3);
  const meets = all.flatMap((c) => c.meetings.map((m) => ({ c, m }))).filter((x) => x.m.score).sort((a, b) => b.m.score - a.m.score).slice(0, 5);
  const s = FP.state();
  const exams = Object.entries(s.exams || {}).filter(([, e]) => e?.pct != null);
  const car = s.books?.career;
  const sessions = (study().sessions || []).filter((x) => x.score);
  const best = (kind) => Math.max(0, ...sessions.filter((x) => x.mode === kind).map((x) => x.score));
  return `<div class="portfolio">
    <div class="pf-head"><div class="eyebrow">Practice portfolio</div><h1>Mason Ngo</h1><p class="muted">Financial planning practice — client meetings, written plans and licensing prep.</p></div>
    <div class="stats">
      <div class="card stat"><div class="k">Client meetings</div><div class="stat-v">${all.reduce((n, c) => n + c.meetings.length, 0)}</div></div>
      <div class="card stat"><div class="k">Plans written</div><div class="stat-v">${all.filter((c) => c.plan?.grade).length}</div></div>
      <div class="card stat"><div class="k">Best interview</div><div class="stat-v">${best("interview") || "—"}</div></div>
      <div class="card stat"><div class="k">Best client meeting</div><div class="stat-v">${meets[0]?.m.score ?? "—"}</div></div></div>
    <section class="card"><h2>Best plans</h2>${
      plans.length
        ? plans
            .map((c, i) => {
              const p = c.plan;
              return `<div class="pf-plan"><div class="spread"><strong>${esc(anon(c, i))}</strong><span class="pill good">${p.grade.total}/100</span></div><ul class="small">${[
                p.efMonthly ? `Emergency fund: ${Clients.usd(p.efMonthly)}/mo toward ${p.efMonths || 3} months of expenses` : "",
                p.extraDebt ? `Debt payoff: extra ${Clients.usd(p.extraDebt)}/mo, ${p.debtStrategy === "snowball" ? "smallest balance first" : "highest rate first"}` : "",
                p.k401Pct != null ? `Retirement: ${p.k401Pct}% to the 401(k)` : "",
                p.alloc ? `Investments: ${p.alloc.stocks}% stocks / ${p.alloc.bonds}% bonds / ${p.alloc.cash}% cash, matched to their risk profile` : "",
              ]
                .filter(Boolean)
                .map((x) => `<li>${esc(x)}</li>`)
                .join("")}</ul></div>`;
            })
            .join("")
        : `<p class="small muted">Submit a plan for a practice client to feature it here.</p>`
    }</section>
    <section class="card"><h2>Meeting highlights</h2>${
      meets.length
        ? meets
            .map(({ c, m }) => {
              const tips = Clients.coachLines(c, m);
              const goodIdx = Object.entries(tips).find(([, t]) => t.some((x) => x[0] === "good"))?.[0];
              const line = goodIdx != null ? m.thread[goodIdx]?.text : m.thread.find((t) => t.from === "me" && t.text.length > 40)?.text;
              return `<div class="pf-meet"><div class="spread"><strong>${esc(Clients.MEETING_NAME[m.type] || m.type)}</strong><span class="pill">${m.score}/100</span></div>${line ? `<p class="small">“${esc(line.slice(0, 180))}”</p>` : ""}</div>`;
            })
            .join("")
        : `<p class="small muted">Run a client meeting to add highlights.</p>`
    }</section>
    <div class="two-col">
      <section class="card"><h2>Licensing exam practice</h2>${exams.length ? exams.map(([k, e]) => `<div class="spread small pf-row"><span>${k.toUpperCase()} practice exam</span><strong class="${e.passed ? "good-text" : ""}">${e.pct}%${e.passed ? " · passed" : ""}</strong></div>`).join("") : `<p class="small muted">Take a practice exam to show results here.</p>`}</section>
      <section class="card"><h2>Career simulation</h2>${car ? `<div class="spread small pf-row"><span>Role</span><strong>${car.firm ? "Founder, " + esc(car.firm.name) : FP.ROLES[car.role || 0].name}</strong></div><div class="spread small pf-row"><span>Assets managed</span><strong>${Clients.usd(car.aum || 0)}</strong></div><div class="spread small pf-row"><span>Reputation</span><strong>${car.rep ?? "—"}/100</strong></div>` : `<p class="small muted">Start career mode to show your progress here.</p>`}</section>
    </div>
    <p class="small muted">All clients are simulated for practice; names and details are anonymized.</p></div>`;
}
function renderPortfolio() {
  app.innerHTML = `<div class="row wrap-gap pf-actions"><button class="btn primary" id="pf-print">${icon("download")} Save as PDF</button><a class="btn" href="#fp">Financial planning</a></div>${portfolioHTML()}`;
  document.getElementById("pf-print").onclick = () => {
    document.getElementById("print-root").innerHTML = portfolioHTML();
    setTimeout(() => window.print(), 50);
  };
}
