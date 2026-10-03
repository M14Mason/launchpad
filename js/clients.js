// Client book: persistent practice clients for financial planning.
// Every client is generated here (no AI): intake info you see up front, plus hidden finances you only
// learn by asking in meetings. You build the plan yourself with real tools (debt optimizer, Monte Carlo,
// risk profile, stress tests, compliance check); the app grades it against the client's true situation.
// Claude is optional — it can play the client and give extra feedback, but nothing here requires it.

const Clients = (() => {
  // ---------- storage ----------
  const all = () => Store.get("clients", { list: [] }).list || [];
  const saveAll = (list) => Store.set("clients", { list });
  const find = (id) => all().find((c) => c.id === id);
  const update = (id, fn) => {
    const list = all();
    const c = list.find((x) => x.id === id);
    if (c) fn(c);
    saveAll(list);
    return c;
  };

  // ---------- seeded random ----------
  const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b, step = 1) => Math.round((a + r() * (b - a)) / step) * step;
  const usd = (n) => "$" + Math.round(n).toLocaleString();
  const pctS = (n) => Math.round(n * 10) / 10 + "%";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const FIRST = { female: ["Dana", "Priya", "Maria", "Rachel", "Emily", "Tasha", "Lena", "Hannah", "Jasmine", "Claire"], male: ["James", "David", "Marcus", "Alex", "Ben", "Carlos", "Kevin", "Nate", "Omar", "Ryan"] };
  const LAST = ["Reyes", "Bennett", "Cho", "Patel", "Morgan", "Hayes", "Silva", "Brooks", "Nguyen", "Foster", "Kim", "Ortiz"];
  const KIDS = ["Mia", "Leo", "Ava", "Eli", "Zoe", "Sam", "Lily", "Noah"];
  const PETS = [["dog", "Biscuit"], ["dog", "Luna"], ["cat", "Pepper"], ["dog", "Max"], ["cat", "Mochi"]];
  const HOBBIES = ["surfing", "running half-marathons", "baking", "coaching youth soccer", "hiking Torrey Pines", "playing guitar", "photography", "woodworking"];
  const JOBS = [
    ["Nurse", 68000, 92000],
    ["Software engineer", 115000, 165000],
    ["Teacher", 52000, 72000],
    ["Electrician", 62000, 88000],
    ["Marketing manager", 78000, 110000],
    ["Dental hygienist", 70000, 90000],
    ["Small-business owner (bakery)", 55000, 95000],
    ["Police officer", 75000, 98000],
    ["Graphic designer", 54000, 76000],
    ["Pharmacist", 120000, 145000],
  ];
  const RISK_SAY = [
    "Honestly, the idea of losing money makes me sick. I'd rather earn less and sleep at night.",
    "I don't like big swings. A small drop I could handle, but not much more.",
    "I'm okay with some ups and downs if it grows over time.",
    "I can handle the market dropping — I know it comes back over the long run.",
    "I'm pretty aggressive. If stocks fell 30% I'd probably buy more.",
  ];

  // ---------- generate a client ----------
  function generate(difficulty = "realistic", seed = Math.floor(Math.random() * 1e9)) {
    const r = rng(seed);
    const gender = r() < 0.5 ? "female" : "male";
    const first = pickR(r, FIRST[gender]);
    const last = pickR(r, LAST);
    const age = between(r, 26, 56);
    const [job, lo, hi] = pickR(r, JOBS);
    const income = between(r, lo, hi, 1000);
    const married = r() < (age > 30 ? 0.62 : 0.35);
    const partner = married ? pickR(r, gender === "female" ? FIRST.male : FIRST.female) : "";
    const nKids = age < 29 ? (r() < 0.2 ? 1 : 0) : age > 50 ? between(r, 0, 2) : between(r, 0, 3);
    const kids = Array.from({ length: nKids }, (_, i) => ({ name: KIDS[(seed + i * 3) % KIDS.length], age: Math.max(1, Math.min(age - 22, between(r, 1, 17))) }));
    const gm = income / 12;
    const takeHome = Math.round((income * (income > 120000 ? 0.7 : 0.76)) / 12 / 10) * 10;
    const owns = r() < (age > 35 ? 0.55 : 0.25);
    const housing = Math.round((gm * (owns ? 0.27 : 0.3) + between(r, -150, 250)) / 10) * 10;
    const living = Math.round((gm * between(r, 22, 33) / 100 + nKids * 450) / 10) * 10;
    const debts = [];
    if (r() < 0.65) debts.push({ id: "cc", name: "Credit card", balance: between(r, 1800, 14000, 100), apr: between(r, 19, 28, 0.1), min: 0 });
    if (age < 42 && r() < 0.6) debts.push({ id: "student", name: "Student loans", balance: between(r, 9000, 52000, 500), apr: between(r, 4, 7, 0.1), min: 0 });
    if (r() < 0.5) debts.push({ id: "car", name: "Car loan", balance: between(r, 6000, 24000, 500), apr: between(r, 5, 9.5, 0.1), min: 0 });
    debts.forEach((d) => (d.apr = Math.round(d.apr * 10) / 10));
    debts.forEach((d) => (d.min = Math.round(Math.max(35, d.id === "cc" ? d.balance * 0.03 : d.id === "student" ? d.balance * 0.011 : d.balance * 0.025) / 5) * 5));
    const minPay = debts.reduce((n, d) => n + d.min, 0);
    const expenses = housing + living;
    const cash = Math.max(400, Math.round((expenses * between(r, 0.3, 4.5, 0.1)) / 100) * 100);
    const match = r() < 0.72 ? pickR(r, [3, 4, 5, 6]) : 0;
    const contrib = match ? pickR(r, [0, 2, 3, match, match + 2]) : pickR(r, [0, 0, 3, 5]);
    const k401 = Math.round((income * Math.max(0, age - 24) * between(r, 0.03, 0.14, 0.01)) / 500) * 500;
    const roth = r() < 0.3 ? between(r, 2000, 25000, 500) : 0;
    const goals = [];
    const yrsLeft = Math.max(8, between(r, 62, 67) - age);
    goals.push({ id: "retire", name: "Retire comfortably", target: Math.round((income * 0.4 * 25) / 10000) * 10000, years: yrsLeft, priority: 2 });
    if (!owns && r() < 0.75) goals.push({ id: "house", name: "Down payment on a home", target: between(r, 45000, 110000, 5000), years: between(r, 3, 7), priority: 1 });
    kids.forEach((k, i) => i < 2 && goals.push({ id: "college-" + k.name.toLowerCase(), name: `${k.name}'s college fund`, target: 90000, years: Math.max(1, 18 - k.age), priority: 3 }));
    if (r() < 0.4) goals.push(pickR(r, [{ id: "travel", name: "A big family trip", target: 8000, years: 2, priority: 4 }, { id: "business", name: "Start a side business", target: 25000, years: 4, priority: 4 }, { id: "car", name: "Replace the car", target: 18000, years: 3, priority: 4 }]));
    const risk = between(r, 1, 5);
    const pet = r() < 0.6 ? pickR(r, PETS) : null;
    const hobby = pickR(r, HOBBIES);
    const level = { easy: [4, 4, 2], realistic: [2, 3, 3], tough: [1, 2, 4] }[difficulty] || [2, 3, 3];
    const mainWorry = debts.find((d) => d.id === "cc") ? "the credit card debt" : goals.find((g) => g.id === "house") ? "never being able to afford a house" : nKids ? "paying for the kids' college" : "not saving enough for retirement";
    const employer = { Nurse: "Palomar Health", "Software engineer": "a fintech startup in Sorrento Valley", Teacher: "the local school district", Electrician: "a union electrical contractor", "Marketing manager": "a regional credit union", "Dental hygienist": "a dental group in Carlsbad", "Small-business owner (bakery)": "their own bakery (self-employed)", "Police officer": "the county sheriff's department", "Graphic designer": "a design agency", Pharmacist: "a retail pharmacy chain" }[job] || "a local employer";
    const docs = ["Recent pay stubs", "Bank statements (3 months)", "401(k) / retirement statements", "Debt statements", "Insurance policies", "Last year's tax return"].map((d) => ({ name: d, brought: r() < 0.55 }));
    const c = {
      id: "cl-" + uid(),
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: `(760) 555-0${between(r, 100, 199)}`,
      born: new Date().getFullYear() - age,
      employer,
      docs,
      intakeGoals: [],
      concern: "",
      seed,
      difficulty,
      createdAt: Date.now(),
      first,
      last,
      gender,
      age,
      job,
      income,
      married,
      partner,
      kids,
      city: pickR(r, ["Escondido", "Chula Vista", "Carlsbad", "La Mesa", "San Marcos", "Oceanside", "Santee"]),
      referral: pickR(r, ["a coworker", "a friend from church", "their sister", "an online search", "a neighbor"]),
      reason: `wants help with ${mainWorry.replace(/^the /, "their ")}`,
      truth: { takeHome, housing, owns, living, expenses, debts, cash, match, contrib, k401, roth, goals, risk, minPay, insurance: nKids ? r() < 0.4 : null, mainWorry, pet, hobby, levels: level },
      collected: {},
      meetings: [],
      events: [],
      pendingEvents: [],
      plan: null,
      stage: "prospect",
      month: 0,
      relationship: 40,
      relHistory: [{ month: 0, delta: 0, reason: "Referred by " + "someone they trust" }],
      portfolio: [{ month: 0, value: k401 + roth }],
    };
    // Pre-meeting questionnaire: goals in the client's own words (no amounts — you get those in the meeting).
    c.intakeGoals = goals.map((g) => g.name);
    c.concern = mainWorry;
    return c;
  }

  // ---------- the facts a client can share (fields you collect) ----------
  // Each: key, label, section, ask (what your question must touch), say(c, vague) → spoken answer, value(c), num (number to listen for)
  function fields(c) {
    const t = c.truth;
    const F = [
      { key: "housing", label: "Housing cost / month", sec: "Cash flow", ask: /\b(rent|mortgage|housing)\b/i, num: t.housing, say: (v) => `${t.owns ? "Our mortgage" : "Rent"} is ${v(t.housing)} a month.` },
      { key: "living", label: "Other spending / month", sec: "Cash flow", ask: /\b(spend|spending|expenses?|budget|groceries|bills|everything else|cost of living)\b/i, num: t.living, say: (v) => `Everything else — groceries, gas, bills — is probably ${v(t.living)} a month.` },
      { key: "takeHome", label: "Take-home pay / month", sec: "Cash flow", ask: /take.?home|paycheck|net pay|after (tax|taxes)|bring home/i, num: t.takeHome, say: (v) => `After taxes I take home about ${v(t.takeHome)} a month.` },
      { key: "cash", label: "Cash savings", sec: "Assets", ask: /\b(savings?|saved|emergency|cash|bank|checking)\b/i, num: t.cash, say: (v) => `I've got about ${v(t.cash)} in savings. That's it.` },
      { key: "k401", label: "401(k) balance", sec: "Retirement", ask: /401|retirement (account|savings|plan)|\bretire\b/i, num: t.k401, say: (v) => (t.k401 ? `My 401(k) has around ${v(t.k401)} in it.` : "I don't really have anything for retirement yet.") },
      { key: "contrib", label: "401(k) contribution %", sec: "Retirement", ask: /contribut|what percent|how much do you (put|save)|put in/i, num: t.contrib, pct: true, say: () => (t.contrib ? `I put in ${t.contrib}% of my pay.` : "I'm not contributing anything right now.") },
      { key: "match", label: "Employer match %", sec: "Retirement", ask: /\bmatch|employer/i, num: t.match, pct: true, say: () => (t.match ? `My employer matches up to ${t.match}%.` : "My job doesn't offer a match, as far as I know.") },
      { key: "roth", label: "Roth IRA balance", sec: "Retirement", ask: /roth|\bira\b|other (accounts?|investments?)|brokerage|invest/i, num: t.roth, say: (v) => (t.roth ? `I have a Roth IRA with about ${v(t.roth)}.` : "No, I don't have a Roth or any other investments.") },
      { key: "risk", label: "Risk tolerance", sec: "Risk", ask: /risk|comfortable|market (drop|fall|crash)|volatil|lose money|ups and downs|stock/i, text: RISK_SAY[t.risk - 1], say: () => RISK_SAY[t.risk - 1] },
      { key: "insurance", label: "Life insurance", sec: "Protection", ask: /insur|protect|if something happen/i, text: t.insurance == null ? "n/a" : t.insurance ? "has a policy" : "none", say: () => (t.insurance == null ? "Insurance? Just what comes through work, I think." : t.insurance ? "I have a life insurance policy through work." : "No, I don't have life insurance. I keep meaning to look into it.") },
      ...t.debts.flatMap((d) => [
        { key: "debt-" + d.id, label: `${d.name} balance`, sec: "Debts", ask: new RegExp(`\\b(debts?|owe|loans?|credit card|balances?|${d.id === "cc" ? "card" : d.id})\\b`, "i"), num: d.balance, say: (v) => `${d.name}: about ${v(d.balance)}.` },
        { key: "apr-" + d.id, label: `${d.name} interest rate`, sec: "Debts", ask: /interest|rate|apr/i, num: d.apr, pct: true, say: () => `The ${d.name.toLowerCase()} is at ${d.apr}% interest.` },
        { key: "min-" + d.id, label: `${d.name} minimum payment`, sec: "Debts", ask: /minimum|monthly payments?|\bpayments?\b/i, num: d.min, say: (v) => `The minimum on the ${d.name.toLowerCase()} is ${v(d.min)} a month.` },
      ]),
      ...t.goals.flatMap((g) => [
        { key: "goal-" + g.id, label: `Goal: ${g.name} (amount)`, sec: "Goals", ask: /\b(goals?|future|dreams?|plans?|saving for|want to|house|college|retire|trip|business|car)\b/i, num: g.target, say: (v) => (g.id === "retire" ? `I'd like to retire in about ${g.years} years without worrying. Someone told me I'd need around ${v(g.target)}.` : `I want ${g.name.toLowerCase()} — maybe ${v(g.target)} — in about ${g.years} years.`) },
        { key: "when-" + g.id, label: `Goal: ${g.name} (years away)`, sec: "Goals", ask: /\b(when|how (long|soon)|timeline|by when|years?)\b/i, num: g.years, years: true, say: () => `For ${g.id === "retire" ? "retirement" : g.name.toLowerCase().replace(/^a /, "the ")}, ideally within ${g.years} years.` },
      ]),
    ];
    return F;
  }
  const PERSONAL = (c) =>
    [c.partner && { key: "partner", word: c.partner, say: `My ${c.gender === "female" ? "husband" : "wife"} ${c.partner} and I talk about this a lot.` }, ...c.kids.map((k) => ({ key: "kid-" + k.name, word: k.name, say: `My ${k.age < 13 ? "kid" : "teenager"} ${k.name} is ${k.age}.` })), c.truth.pet && { key: "pet", word: c.truth.pet[1], say: `Sorry if you hear my ${c.truth.pet[0]} ${c.truth.pet[1]} later.` }, { key: "hobby", word: c.truth.hobby.split(" ")[0], say: `On weekends I'm usually ${c.truth.hobby}.` }].filter(Boolean);

  // How the client says a number, by how well they know their numbers (1-5).
  const voiceNum = (c) => (n) => {
    const lvl = c.truth.levels[1];
    if (lvl >= 4) return usd(n);
    if (lvl === 3) return usd(Math.round(n / 50) * 50);
    const round = n >= 10000 ? 1000 : n >= 1000 ? 100 : 25;
    return "around " + usd(Math.round(n / round) * round);
  };

  // ---------- what you've collected from meetings ----------
  const numsIn = (text) =>
    [...String(text).replace(/,/g, "").matchAll(/\$?\s?(\d+(?:\.\d+)?)\s*(k|thousand|grand)?/gi)].map((m) => +m[1] * (m[2] ? 1000 : 1)).filter((n) => isFinite(n));
  function extract(c, thread) {
    const F = fields(c);
    const found = {};
    for (let i = 0; i < thread.length; i++) {
      const t = thread[i];
      if (t.from !== "them") continue;
      const prevMe = [...thread.slice(0, i)].reverse().find((x) => x.from === "me")?.text || "";
      const nums = numsIn(t.text);
      for (const f of F) {
        if (found[f.key] || c.collected[f.key]) continue;
        if (f.num != null) {
          const tol = f.pct || f.years ? 0.01 : 0.2;
          const hit = nums.find((n) => Math.abs(n - f.num) <= Math.max(tol * Math.abs(f.num), f.pct || f.years ? 0.05 : 1));
          // A number only counts when your question was about that topic (or the client volunteered it clearly).
          if (hit != null && (f.ask.test(prevMe) || f.ask.test(t.text))) found[f.key] = { value: hit, quote: t.text.slice(0, 160), approx: Math.abs(hit - f.num) > 0.02 * Math.abs(f.num) };
          else if (f.num === 0 && f.ask.test(prevMe) && /\b(no|not|don't|nothing|zero)\b/i.test(t.text)) found[f.key] = { value: 0, quote: t.text.slice(0, 160) };
        } else if (f.ask.test(prevMe) && f.text && (t.text.includes(f.text.slice(0, 18)) || /risk|insur/.test(f.key))) {
          found[f.key] = { value: f.key === "risk" ? c.truth.risk : f.text, quote: t.text.slice(0, 160) };
        }
      }
    }
    return found;
  }
  // Personal details you brought back up in a later meeting (relationship bonus).
  function remembered(c, thread, before) {
    const mine = thread.filter((t) => t.from === "me").map((t) => t.text).join(" ");
    const heardBefore = before.flatMap((m) => m.thread.filter((t) => t.from === "them").map((t) => t.text)).join(" ");
    return PERSONAL(c).filter((p) => heardBefore.includes(p.word) && new RegExp("\\b" + p.word + "\\b", "i").test(mine)).map((p) => p.word);
  }

  // ---------- simulated calendar + random life events ----------
  const EVENTS = [
    { id: "raise", p: 0.18, text: (c) => `${c.first} got a ${Math.round(5 + Math.random() * 7)}% raise.`, apply: (c, e) => ((c.income = Math.round((c.income * (1 + e.n / 100)) / 1000) * 1000), (c.truth.takeHome = Math.round((c.truth.takeHome * (1 + e.n / 100)) / 10) * 10)), n: () => Math.round(5 + Math.random() * 7) },
    { id: "jobloss", p: 0.08, text: (c) => `${c.first} was laid off and is job hunting.`, apply: (c) => ((c.truth.cash = Math.max(0, c.truth.cash - c.truth.expenses * 2)), c.goalsNote = "Job search — cash is tight") },
    { id: "baby", p: 0.07, cond: (c) => c.age < 42, text: (c) => `${c.first} ${c.married ? "and " + c.partner + " are" : "is"} expecting a baby.`, apply: (c) => ((c.truth.living += 900), c.truth.goals.push({ id: "college-baby", name: "New baby's college fund", target: 120000, years: 18, priority: 3 })) },
    { id: "car", p: 0.12, text: (c) => `${c.first}'s car needed a $3,200 repair.`, apply: (c) => (c.truth.cash = Math.max(0, c.truth.cash - 3200)) },
    { id: "inherit", p: 0.05, text: (c) => `${c.first} inherited $20,000 from a relative.`, apply: (c) => (c.truth.cash += 20000) },
    { id: "medical", p: 0.08, text: (c) => `${c.first} had a $2,800 medical bill.`, apply: (c) => (c.truth.cash = Math.max(0, c.truth.cash - 2800)) },
    { id: "rent", p: 0.1, cond: (c) => !c.truth.owns, text: (c) => `${c.first}'s rent went up $175 a month.`, apply: (c) => ((c.truth.housing += 175), (c.truth.expenses = c.truth.housing + c.truth.living)) },
    { id: "goal", p: 0.12, text: (c) => `${c.first} now wants to retire 3 years earlier.`, apply: (c) => { const g = c.truth.goals.find((x) => x.id === "retire"); if (g) g.years = Math.max(5, g.years - 3); } },
  ];
  // Market: annual return assumptions (nominal) for the simulator and the calendar.
  const ASSET = { stocks: { mu: 0.095, sd: 0.16 }, bonds: { mu: 0.045, sd: 0.06 }, cash: { mu: 0.03, sd: 0.005 }, corr: 0.1, inflation: 0.025 };
  const gauss = (r) => {
    const u = 1 - r();
    const v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  function mix(alloc) {
    const s = alloc.stocks / 100;
    const b = alloc.bonds / 100;
    const k = alloc.cash / 100;
    const mu = s * ASSET.stocks.mu + b * ASSET.bonds.mu + k * ASSET.cash.mu;
    const v = (s * ASSET.stocks.sd) ** 2 + (b * ASSET.bonds.sd) ** 2 + (k * ASSET.cash.sd) ** 2 + 2 * s * b * ASSET.corr * ASSET.stocks.sd * ASSET.bonds.sd;
    return { mu, sd: Math.sqrt(v) };
  }
  // Move the client forward in time: markets, payments, savings, and maybe a random life event.
  function advance(c, months) {
    const r = rng(c.seed + c.month * 7919);
    const plan = c.plan;
    const alloc = plan?.alloc || { stocks: 70, bonds: 25, cash: 5 };
    const { mu, sd } = mix(alloc);
    let value = c.portfolio[c.portfolio.length - 1]?.value || 0;
    const t = c.truth;
    for (let m = 0; m < months; m++) {
      const ret = mu / 12 + (sd / Math.sqrt(12)) * gauss(r);
      const contrib = (c.income / 12) * ((plan?.k401Pct ?? t.contrib) + Math.min(t.match, plan?.k401Pct ?? t.contrib)) / 100;
      value = Math.max(0, value * (1 + ret) + contrib);
      // Debts: minimums (plus the plan's extra payment, highest-rate first unless snowball).
      const order = [...t.debts].sort((a, b) => (plan?.debtStrategy === "snowball" ? a.balance - b.balance : b.apr - a.apr));
      let extra = plan?.extraDebt || 0;
      for (const d of order) {
        if (d.balance <= 0) continue;
        d.balance = d.balance * (1 + d.apr / 1200);
        const pay = Math.min(d.balance, d.min + extra);
        extra = Math.max(0, extra - Math.max(0, pay - d.min));
        d.balance = Math.max(0, Math.round(d.balance - pay));
      }
      t.debts = t.debts.filter((d) => d.balance > 0);
      const saved = plan ? Object.values(plan.goalSavings || {}).reduce((n, v) => n + (+v || 0), 0) + (plan.efMonthly || 0) : 0;
      t.cash = Math.max(0, Math.round(t.cash + (plan?.efMonthly || 0) + (plan ? 0 : 50)));
      c.goalBalances ||= {};
      if (plan) for (const [g, v] of Object.entries(plan.goalSavings || {})) c.goalBalances[g] = Math.round(((c.goalBalances[g] || 0) * (1 + ret) + (+v || 0)) * 100) / 100;
      void saved;
    }
    c.month += months;
    t.k401 = Math.round(value - (t.roth || 0));
    c.portfolio.push({ month: c.month, value: Math.round(value) });
    // Random life event (one at most per jump).
    const pool = EVENTS.filter((e) => !e.cond || e.cond(c));
    const chance = Math.min(0.75, 0.25 + months * 0.06);
    if (r() < chance) {
      const e = pool[Math.floor(r() * pool.length)];
      const ev = { id: e.id, month: c.month, n: e.n?.() };
      ev.text = e.id === "raise" ? `${c.first} got a ${ev.n}% raise.` : e.text(c);
      e.apply(c, ev);
      t.expenses = t.housing + t.living;
      c.events.push(ev);
      c.pendingEvents.push(ev);
      // New facts mean old answers may be out of date.
      if (["jobloss", "car", "medical", "inherit"].includes(e.id)) delete c.collected.cash;
      if (e.id === "rent") delete c.collected.housing;
      if (e.id === "raise") delete c.collected.takeHome;
    }
  }
  const dateOf = (c, month = c.month) => {
    const d = new Date(c.createdAt);
    d.setMonth(d.getMonth() + month);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // ---------- the meeting the practice engine runs ----------
  function persona(c) {
    const pool = CHARACTERS.filter((x) => x.gender === c.gender);
    const ch = pool[Math.abs(hash(c.id)) % pool.length];
    return { ...ch, name: c.first };
  }
  function meetingType(c) {
    return !c.meetings.length ? "discovery" : c.plan?.submittedAt && !c.meetings.some((m) => m.type === "presentation") ? "presentation" : c.meetings.length < 2 && !c.plan?.submittedAt ? "discovery" : "review";
  }
  // Notes only the AI client sees (its full, true situation and history).
  function hiddenNotes(c, type) {
    const t = c.truth;
    const v = voiceNum(c);
    const past = c.meetings.slice(-3).map((m, i) => `Meeting ${c.meetings.length - (c.meetings.slice(-3).length - 1 - i)} (${m.type}): ${m.summary || ""}`).join(" | ");
    return `You are ${c.first} ${c.last}, ${c.age}, ${c.job} in ${c.city}, earning ${usd(c.income)}/yr (take-home ${usd(t.takeHome)}/mo). ${c.married ? `Married to ${c.partner}.` : "Single."} ${c.kids.length ? "Kids: " + c.kids.map((k) => `${k.name} (${k.age})`).join(", ") + "." : "No kids."} ${t.pet ? `Pet ${t.pet[0]} named ${t.pet[1]}.` : ""} Hobby: ${t.hobby}.
Money: ${t.owns ? "mortgage" : "rent"} ${usd(t.housing)}/mo; other spending ${usd(t.living)}/mo; cash savings ${usd(t.cash)}; 401(k) ${usd(t.k401)}, contributing ${t.contrib}%${t.match ? `, employer matches up to ${t.match}%` : ", no employer match"}; ${t.roth ? "Roth IRA " + usd(t.roth) : "no Roth IRA"}; debts: ${t.debts.map((d) => `${d.name} ${usd(d.balance)} at ${d.apr}% (min ${usd(d.min)}/mo)`).join("; ") || "none"}. Life insurance: ${t.insurance == null ? "only through work" : t.insurance ? "yes" : "none"}.
Goals: ${t.goals.map((g) => `${g.name} — about ${usd(g.target)} in ${g.years} years`).join("; ")}. Main worry: ${t.mainWorry}. Risk attitude (say it like this when asked): "${RISK_SAY[t.risk - 1]}"
Knowledge level ${t.levels[0]}/5 (1 = asks what basic terms mean). Knows numbers ${t.levels[1]}/5 (low = give rounded guesses like "${v(t.housing)}"). Worry ${t.levels[2]}/5.
Always say money as digits with a $ sign (like $1,850) and percentages as digits (like 6%), so they come through clearly.
${c.pendingEvents.length ? "SINCE THE LAST MEETING: " + c.pendingEvents.map((e) => e.text).join(" ") + " Bring this up early, in your own words." : ""}
${past ? "Earlier meetings: " + past : ""} Relationship with Mason so far: ${c.relationship}/100 (${c.relationship >= 70 ? "you trust him" : c.relationship >= 45 ? "warming up" : "still guarded"}).
${type === "presentation" ? "Mason is presenting his financial plan today. Ask about anything unclear, push back if it doesn't fit you, and decide whether you'll follow it." : type === "review" ? "This is a follow-up review. Share updates and ask how you're doing on your goals." : "This is your first meeting (discovery). Share details only when asked."}`;
  }
  function scenario(c, type) {
    const p = persona(c);
    const opening = {
      discovery: `Hi, I'm ${c.first}. ${{ "a coworker": "A coworker of mine", "a friend from church": "A friend from church", "their sister": "My sister", "an online search": "I found you online and", "a neighbor": "My neighbor" }[c.referral] || "A friend"} said you might be able to help. Honestly, I'm a little worried about ${c.truth.mainWorry.replace(/^the kids'/, "my kids'").replace(/^not saving/, "not saving")}.`,
      presentation: `Hi Mason, good to see you again. I'm curious what you came up with.`,
      review: c.pendingEvents.length ? `Hey Mason. A lot has happened since we last talked — ${c.pendingEvents[0].text.replace(c.first + " ", "I ").replace(/\bwas\b/, "was").replace(/^I got/, "I got")}` : `Hi Mason, good to see you. Things have been pretty steady.`,
    }[type];
    return {
      clientId: c.id,
      meetingType: type,
      title: `${c.first} ${c.last} · ${type === "discovery" ? "Discovery meeting" : type === "presentation" ? "Plan presentation" : "Review meeting"} · ${dateOf(c)}`,
      counterpart: { name: `${c.first} ${c.last}`, role: `${c.job}, ${c.age}`, gender: c.gender },
      brief: type === "discovery" ? `${c.first} ${c.reason}. Learn their full situation: cash flow, debts, savings, retirement, goals, risk tolerance and protection.` : type === "presentation" ? `Walk ${c.first} through your plan in plain English. Check it fits them and get their buy-in.` : `Catch up on what changed, review progress toward goals, and adjust the plan.`,
      opening,
      hidden: hiddenNotes(c, type),
      objectives: type === "discovery" ? ["Build rapport before numbers", "Cover cash flow, debts, savings, retirement, goals, risk", "Ask open questions and follow up", "Summarize what you heard"] : type === "presentation" ? ["Explain the plan without jargon", "Connect each step to their goals", "Check understanding and comfort", "Agree on next steps"] : ["Ask what changed", "Review goal progress", "Adjust the plan", "Remember personal details"],
      maxTurns: 30,
      persona: p,
      clientFacts: [
        ...fields(c).map((f) => [f.ask, f.say(voiceNum(c)), f.key]),
        ...PERSONAL(c).map((x) => [new RegExp(x.key.startsWith("kid") ? "kid|child|family|son|daughter" : x.key === "partner" ? "married|partner|husband|wife|family" : x.key === "pet" ? "pet|dog|cat" : "hobby|weekend|fun|free time", "i"), x.say, x.key]),
      ],
    };
  }
  // Called by the practice engine when a client meeting ends.
  function recordMeeting(clientId, P) {
    let report = null;
    update(clientId, (c) => {
      const before = c.meetings.slice();
      const found = extract(c, P.thread);
      Object.assign(c.collected, Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { ...v, month: c.month, meeting: c.meetings.length + 1 }])));
      const rem = before.length ? remembered(c, P.thread, before) : [];
      const score = P.result?.overall ?? 60;
      const delta = Math.max(-10, Math.min(12, Math.round((score - 55) / 3))) + Math.min(9, rem.length * 3);
      c.relationship = Math.max(0, Math.min(100, c.relationship + delta));
      c.relHistory.push({ month: c.month, delta, reason: `${P.sc.meetingType} meeting scored ${score}${rem.length ? ` · remembered ${rem.join(", ")}` : ""}` });
      const type = P.sc.meetingType;
      c.meetings.push({ id: uid(), type, month: c.month, at: Date.now(), score, notes: P.notes || "", thread: P.thread.map(({ from, text }) => ({ from, text })), found: Object.keys(found), remembered: rem, summary: (P.result?.verdict || "").slice(0, 160), result: P.result });
      c.pendingEvents = [];
      if (type === "discovery" && c.stage === "prospect") c.stage = "discovery";
      if (type === "presentation") c.stage = score >= 55 ? "client" : c.stage;
      if (type === "review") c.stage = "client";
      report = { found: Object.keys(found).length, delta, rem, total: fields(c).length, collected: Object.keys(c.collected).length };
    });
    return report;
  }

  // ---------- planning math (uses ONLY what you collected; grading uses the truth) ----------
  const val = (c, key, fallback = null) => (c.collected[key] ? c.collected[key].value : c.manual?.[key] ?? fallback);
  function known(c) {
    const takeHome = val(c, "takeHome", null) ?? Math.round((c.income * 0.75) / 12);
    const housing = val(c, "housing");
    const living = val(c, "living");
    const debts = collectedDebts(c);
    const minPay = debts.reduce((n, d) => n + (d.min || 0), 0);
    return { takeHome, housing, living, expenses: housing != null && living != null ? housing + living : null, cash: val(c, "cash"), k401: val(c, "k401"), contrib: val(c, "contrib"), match: val(c, "match"), roth: val(c, "roth"), risk: val(c, "risk"), debts, minPay, goals: collectedGoals(c) };
  }
  function collectedDebts(c) {
    const ids = new Set(Object.keys({ ...c.collected, ...(c.manual || {}) }).filter((k) => /^(debt|apr|min)-/.test(k)).map((k) => k.split("-")[1]));
    const names = { cc: "Credit card", student: "Student loans", car: "Car loan" };
    return [...ids].map((id) => ({ id, name: names[id] || id, balance: val(c, "debt-" + id, 0), apr: val(c, "apr-" + id, null), min: val(c, "min-" + id, 0) }));
  }
  function collectedGoals(c) {
    const ids = new Set(Object.keys({ ...c.collected, ...(c.manual || {}) }).filter((k) => /^(goal|when)-/.test(k)).map((k) => k.replace(/^(goal|when)-/, "")));
    return [...ids].map((id) => {
      const g = c.truth.goals.find((x) => x.id === id) || { name: id };
      return { id, name: g.name, target: val(c, "goal-" + id, null), years: val(c, "when-" + id, null) };
    });
  }
  // Debt payoff month by month. Returns {months, interest, series[]}.
  function payoff(debts, extra, strategy) {
    let ds = debts.filter((d) => d.balance > 0).map((d) => ({ ...d, apr: d.apr ?? 15, min: d.min || Math.max(25, d.balance * 0.02) }));
    // Fixed monthly budget: all minimums + extra. As debts are paid off, their minimums roll into the next one.
    const budget = extra + ds.reduce((n, d) => n + d.min, 0);
    let months = 0;
    let interest = 0;
    const series = [Math.round(ds.reduce((n, d) => n + d.balance, 0))];
    while (ds.length && months < 600) {
      months++;
      for (const d of ds) {
        const i = (d.balance * d.apr) / 1200;
        interest += i;
        d.balance += i;
      }
      ds.sort((a, b) => (strategy === "snowball" ? a.balance - b.balance : b.apr - a.apr));
      let pool = budget;
      for (const d of ds) {
        const pay = Math.min(d.balance, d.min, pool);
        d.balance -= pay;
        pool -= pay;
      }
      for (const d of ds) {
        const pay = Math.min(d.balance, pool);
        d.balance -= pay;
        pool -= pay;
      }
      ds = ds.filter((d) => d.balance > 0.5);
      series.push(Math.round(ds.reduce((n, d) => n + d.balance, 0)));
    }
    return { months, interest: Math.round(interest), series, never: months >= 600 };
  }
  // Monte Carlo: n simulated futures (yearly steps). Returns percentile bands and success probability.
  function monteCarlo({ start = 0, monthly = 0, years = 10, alloc, target = null, n = 1000, seed = 7 }) {
    const r = rng(seed);
    const { mu, sd } = mix(alloc);
    const paths = [];
    for (let i = 0; i < n; i++) {
      let v = start;
      const p = [v];
      for (let y = 0; y < years; y++) {
        v = v * (1 + mu + sd * gauss(r)) + monthly * 12 * (1 + mu / 2);
        p.push(Math.max(0, v));
      }
      paths.push(p);
    }
    const bands = Array.from({ length: years + 1 }, (_, y) => {
      const col = paths.map((p) => p[y]).sort((a, b) => a - b);
      return { p10: col[Math.floor(n * 0.1)], p50: col[Math.floor(n * 0.5)], p90: col[Math.floor(n * 0.9)] };
    });
    const finals = paths.map((p) => p[years]);
    return { bands, success: target ? finals.filter((v) => v >= target).length / n : null, median: bands[years].p50, mu, sd };
  }
  // Monthly savings needed to reach a target with ~90% confidence (binary search on Monte Carlo).
  function needed90({ start, years, alloc, target }) {
    let lo = 0;
    let hi = Math.max(50, target / Math.max(1, years * 12)) * 3;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      const s = monteCarlo({ start, monthly: mid, years, alloc, target, n: 400, seed: 11 }).success;
      if (s >= 0.9) hi = mid;
      else lo = mid;
    }
    return Math.round(hi / 10) * 10;
  }
  const RISK_QS = [
    ["If your investments dropped 25% in a year, the client would…", ["Sell everything", "Sell some", "Hold", "Hold and maybe buy", "Buy more"]],
    ["Their main investing goal is…", ["Never lose money", "Mostly safety", "Balance", "Mostly growth", "Maximum growth"]],
    ["How long until they need most of this money?", ["< 2 years", "2-5 years", "5-10 years", "10-20 years", "20+ years"]],
    ["How stable is their income?", ["Very unstable", "Unstable", "Average", "Stable", "Very stable"]],
    ["Investing experience?", ["None", "A little", "Some", "Experienced", "Very experienced"]],
  ];
  const MODELS = [
    { name: "Conservative", stocks: 20, bonds: 60, cash: 20 },
    { name: "Moderately conservative", stocks: 40, bonds: 50, cash: 10 },
    { name: "Balanced", stocks: 60, bonds: 35, cash: 5 },
    { name: "Growth", stocks: 80, bonds: 18, cash: 2 },
    { name: "Aggressive growth", stocks: 95, bonds: 5, cash: 0 },
  ];
  const riskScore = (ans) => (ans?.length === 5 && ans.every((a) => a != null) ? Math.max(1, Math.min(5, Math.round(ans.reduce((n, a) => n + a + 1, 0) / 5))) : null);
  const STRESS = [
    { id: "gfc", name: "2008 financial crisis", years: [[-0.37, 0.052], [0.265, 0.059], [0.151, 0.065]], note: "Stocks fell 37% in one year, then recovered over ~4 years." },
    { id: "covid", name: "2020 COVID crash", years: [[-0.34, 0.03], [0.5, 0.04]], note: "Stocks fell 34% in about a month, then rebounded fast." },
    { id: "rates", name: "2022 rate shock", years: [[-0.18, -0.13], [0.26, 0.055]], note: "Stocks AND bonds fell together as interest rates jumped." },
    { id: "stag", name: "1970s stagflation", years: Array.from({ length: 6 }, () => [0.03, 0.02]), inflation: 0.07, note: "High inflation (~7%) quietly eroded real returns for years." },
  ];
  function stress(c, plan, scen) {
    const k = known(c);
    const start = (k.k401 || 0) + (k.roth || 0);
    const a = plan.alloc;
    let v = start;
    let worst = start;
    const pts = [v];
    const infl = scen.inflation || ASSET.inflation;
    scen.years.forEach(([s, b], i) => {
      v = v * (1 + (a.stocks / 100) * s + (a.bonds / 100) * b + (a.cash / 100) * 0.02) + (c.income * ((plan.k401Pct || 0) + Math.min(k.match || 0, plan.k401Pct || 0))) / 100;
      v = v / (1 + infl - ASSET.inflation); // extra inflation shrinks real value
      worst = Math.min(worst, v);
      pts.push(Math.round(v));
    });
    return { pts, drop: start ? (worst - start) / start : 0, end: v };
  }
  function jobLossRunway(c, plan) {
    const k = known(c);
    const spend = (k.expenses || 0) + (k.minPay || 0);
    const cash = (k.cash || 0) + (plan.efMonthly || 0) * 6;
    return spend ? cash / spend : null;
  }

  // ---------- compliance + grading ----------
  function compliance(c, plan) {
    const k = known(c);
    const flags = [];
    const add = (sev, text, fix) => flags.push({ sev, text, fix });
    const missing = ["takeHome", "housing", "living", "cash", "risk"].filter((x) => k[x] == null && !c.collected[x]);
    if (missing.length) add("high", `Know-your-client gap: you never confirmed ${missing.map((m) => fieldLabel(c, m)).join(", ")}.`, "Ask about these in the next meeting before finalizing.");
    const months = k.expenses ? (k.cash || 0) / k.expenses : null;
    const investing = Object.values(plan.goalSavings || {}).reduce((n, v) => n + (+v || 0), 0);
    if (months != null && months < 3 && investing > (plan.efMonthly || 0)) add("high", `Emergency fund is only ${months.toFixed(1)} months of expenses, but the plan sends more to goals than to the emergency fund.`, "Build 3-6 months of expenses first (more if income is unstable).");
    const hi = k.debts.filter((d) => (d.apr ?? 0) > 8);
    if (hi.length && !(plan.extraDebt > 0) && investing > 0) add("high", `High-interest debt (${hi.map((d) => d.name + " " + d.apr + "%").join(", ")}) isn't getting extra payments while money goes to investing.`, "Paying off 20%+ debt is a guaranteed return — prioritize it after the employer match.");
    if (k.match && (plan.k401Pct ?? 0) < k.match) add("high", `Contribution of ${plan.k401Pct || 0}% leaves free employer match on the table (match is ${k.match}%).`, "Contribute at least enough to get the full match.");
    if (!k.risk) add("med", "No documented risk tolerance — you can't show the allocation is suitable.", "Discuss how they feel about market drops and record it.");
    const rs = riskScore(plan.riskAnswers) || k.risk;
    if (rs) {
      const model = MODELS[rs - 1];
      if (Math.abs(plan.alloc.stocks - model.stocks) > 20) add("high", `Allocation (${plan.alloc.stocks}% stocks) doesn't match their risk profile (${model.name}, ~${model.stocks}% stocks).`, `Move closer to ${model.stocks}% stocks or document why.`);
    }
    const short = k.goals.filter((g) => g.years != null && g.years <= 3 && (plan.goalSavings?.[g.id] || 0) > 0);
    if (short.length && plan.alloc.stocks > 50) add("med", `Short-term goal(s) (${short.map((g) => g.name).join(", ")}) are in a ${plan.alloc.stocks}% stock portfolio.`, "Money needed within ~3 years belongs in cash or short-term bonds.");
    const surplus = k.takeHome - (k.expenses || 0) - k.minPay;
    const outflow = investing + (plan.efMonthly || 0) + (plan.extraDebt || 0);
    if (k.expenses != null && outflow > surplus + 1) add("high", `The plan needs ${usd(outflow)}/mo but their known surplus is only ${usd(Math.max(0, surplus))}/mo.`, "Scale back savings targets or find spending cuts together.");
    if ((c.kids.length || c.married) && val(c, "insurance") !== "has a policy") add("med", "They have dependents and no confirmed life insurance.", "Recommend reviewing term life insurance.");
    return flags;
  }
  function fieldLabel(c, key) {
    return fields(c).find((f) => f.key === key)?.label || key;
  }
  // Grade against the client's TRUE situation (what an expert who knew everything would do).
  function grade(c, plan) {
    const t = c.truth;
    const F = fields(c);
    const important = F.filter((f) => !/^when-|^min-/.test(f.key));
    const got = important.filter((f) => c.collected[f.key]).length;
    const parts = [];
    const part = (name, max, score, why, expert) => parts.push({ name, max, score: Math.max(0, Math.min(max, Math.round(score))), why, expert });
    part("Discovery (data you collected)", 20, (got / important.length) * 20, `You collected ${got} of ${important.length} key facts.`, "A full discovery covers cash flow, every debt with its rate, savings, retirement accounts and match, each goal with amount and timeline, risk tolerance and insurance.");
    const efMonths = t.cash / t.expenses;
    const efGoal = plan.efTarget || 0;
    const idealEF = t.expenses * (c.job.includes("business") ? 6 : 4);
    part("Emergency fund", 15, efGoal >= t.expenses * 3 && efGoal <= t.expenses * 9 ? 15 : efGoal > 0 ? 8 : efMonths >= 3 ? 10 : 0, `Target ${usd(efGoal)} vs. real expenses of ${usd(t.expenses)}/mo (${efMonths.toFixed(1)} months saved today).`, `About ${usd(idealEF)} (3-6 months of expenses), built before investing beyond the match.`);
    const hiDebt = t.debts.filter((d) => d.apr > 8);
    const avalanche = plan.debtStrategy !== "snowball";
    part("Debt strategy", 15, !t.debts.length ? 15 : (plan.extraDebt > 0 ? 9 : 2) + (avalanche || t.levels[2] >= 4 ? 6 : 3), t.debts.length ? `${plan.debtStrategy || "avalanche"} with ${usd(plan.extraDebt || 0)}/mo extra. Real debts: ${t.debts.map((d) => `${d.name} ${d.apr}%`).join(", ")}.` : "No debt.", hiDebt.length ? `Put every spare dollar after the match toward ${hiDebt[0].name} (${hiDebt[0].apr}%); avalanche saves the most interest (snowball is fine for an anxious client who needs quick wins).` : "Pay minimums on low-rate debt and invest the rest.");
    part("Retirement & match", 15, (t.match ? ((plan.k401Pct || 0) >= t.match ? 10 : 2) : 7) + ((plan.k401Pct || 0) >= 6 && (plan.k401Pct || 0) <= 20 ? 5 : 2), `Contribution ${plan.k401Pct || 0}%${t.match ? `, employer match ${t.match}%` : ", no match"}.`, t.match ? `At least ${t.match}% to capture the full match, rising toward 10-15% once high-rate debt is gone.` : "Aim for 10-15% of pay across 401(k)/Roth once the emergency fund is set.");
    const model = MODELS[t.risk - 1];
    const diff = Math.abs(plan.alloc.stocks - model.stocks);
    part("Suitable allocation", 15, diff <= 10 ? 15 : diff <= 20 ? 10 : diff <= 35 ? 5 : 0, `${plan.alloc.stocks}/${plan.alloc.bonds}/${plan.alloc.cash} vs. their true risk profile (${model.name}).`, `About ${model.stocks}/${model.bonds}/${model.cash} (stocks/bonds/cash), adjusted for timelines.`);
    const surplus = t.takeHome - t.expenses - t.minPay;
    const outflow = Object.values(plan.goalSavings || {}).reduce((n, v) => n + (+v || 0), 0) + (plan.efMonthly || 0) + (plan.extraDebt || 0);
    part("Affordable plan", 10, outflow <= surplus + 1 ? (outflow >= surplus * 0.5 ? 10 : 6) : Math.max(0, 10 - ((outflow - surplus) / Math.max(1, surplus)) * 20), `Plan uses ${usd(outflow)}/mo of a real ${usd(Math.max(0, surplus))}/mo surplus.`, `Use most of the ${usd(Math.max(0, surplus))}/mo surplus — and no more.`);
    const flags = compliance(c, plan).filter((f) => f.sev === "high").length;
    part("Compliance", 10, 10 - flags * 3, flags ? `${flags} high-severity compliance flag${flags === 1 ? "" : "s"}.` : "No high-severity flags.", "Every recommendation should be suitable, documented and in the right order.");
    const total = parts.reduce((n, p) => n + p.score, 0);
    return { total, parts, at: Date.now() };
  }

  // ---------- real meeting agendas ----------
  const AGENDA = {
    discovery: [
      { id: "intro", label: "Introductions & rapport", me: /\b(nice to meet|thanks for coming|how are you|tell me about yourself|great to meet)\b/i },
      { id: "process", label: "Explain how you work (process & next steps)", me: /\b(how (this|I) work|process|today we|agenda|what to expect|confidential)\b/i },
      { id: "goals", label: "Goals & what matters to them", keys: /^goal-/ },
      { id: "cash", label: "Cash flow: take-home pay & spending", keys: /^(takeHome|housing|living)$/ },
      { id: "assets", label: "Savings & emergency fund", keys: /^cash$/ },
      { id: "debts", label: "Debts: balances, rates, payments", keys: /^(debt|apr|min)-/ },
      { id: "retire", label: "Retirement accounts & employer match", keys: /^(k401|contrib|match|roth)$/ },
      { id: "risk", label: "Risk tolerance", keys: /^risk$/ },
      { id: "protect", label: "Protection: insurance & beneficiaries", keys: /^insurance$/ },
      { id: "next", label: "Summarize & agree next steps", me: /\b(next step|follow up|next meeting|send you|summari[sz]e|to recap|homework|bring)\b/i },
    ],
    presentation: [
      { id: "recap", label: "Recap their goals & situation", me: /\b(recap|last time|you told me|you mentioned|your goals?)\b/i },
      { id: "ef", label: "Emergency fund recommendation", me: /\bemergency\b/i },
      { id: "debt", label: "Debt payoff plan", me: /\b(debt|pay off|avalanche|snowball|card)\b/i },
      { id: "retire", label: "Retirement & employer match", me: /\b(401|match|retire)\b/i },
      { id: "invest", label: "Investment mix & why it fits", me: /\b(stocks?|bonds?|portfolio|invest|allocation|risk)\b/i },
      { id: "goals", label: "Goal funding & probabilities", me: /\b(percent|chance|on track|goal|save .* (month|per))\b/i },
      { id: "check", label: "Check understanding & comfort", me: /\b(make sense|questions|comfortable|how do you feel|does that)\b/i },
      { id: "next", label: "Implementation steps & next review", me: /\b(next step|set up|open|start|review|follow up|in (three|3|six|6) months)\b/i },
    ],
    review: [
      { id: "changes", label: "What's changed in their life?", me: /\b(what('s| has) changed|anything new|since we|update|how have you been|how's)\b/i },
      { id: "progress", label: "Progress toward goals", me: /\b(progress|on track|goal|how much (have|did) you)\b/i },
      { id: "cash", label: "Re-check cash flow & savings", keys: /^(takeHome|housing|living|cash)$/ },
      { id: "debts", label: "Debt progress", keys: /^(debt|apr|min)-/, me: /\b(debt|card|loan)\b/i },
      { id: "invest", label: "Portfolio & rebalancing", me: /\b(portfolio|rebalanc|market|stocks?|invest)\b/i },
      { id: "personal", label: "Remember personal details", personal: true },
      { id: "adjust", label: "Adjust the plan", me: /\b(adjust|change the plan|increase|lower|update the plan|instead)\b/i },
      { id: "next", label: "Schedule the next review", me: /\b(next (review|meeting)|follow up|see you in|check in)\b/i },
    ],
  };
  // Live agenda status for a meeting in progress.
  function agendaStatus(c, type, thread) {
    const found = { ...c.collected, ...extract(c, thread) };
    const mine = thread.filter((t) => t.from === "me").map((t) => t.text).join(" ");
    const before = c.meetings;
    return (AGENDA[type] || AGENDA.discovery).map((a) => {
      let done = false;
      if (a.keys) done = Object.keys(found).some((k) => a.keys.test(k));
      if (!done && a.me) done = a.me.test(mine);
      if (a.personal) done = before.length > 0 && remembered(c, thread, before).length > 0;
      return { ...a, done };
    });
  }

  return { AGENDA, agendaStatus, all, find, update, saveAll, generate, fields, extract, advance, dateOf, persona, meetingType, scenario, recordMeeting, known, payoff, monteCarlo, needed90, mix, RISK_QS, MODELS, riskScore, STRESS, stress, jobLossRunway, compliance, grade, usd, pctS, val, fieldLabel, collectedGoals };
})();
