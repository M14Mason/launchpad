// Financial Planning hub: Career mode / Practice mode, a shared calendar you can skip forward,
// a phone with Messages (your team), Mail (clients) and Markets (daily market + how clients are doing),
// real-firm meeting rhythm, career progression (AUM, revenue, roles), and licensing practice.

const FP = (() => {
  const ROLES = [
    { name: "Junior Associate", aum: 0 },
    { name: "Associate Planner", aum: 150000, exam: "sie" },
    { name: "Financial Planner", aum: 600000, exam: "cfp" },
    { name: "Senior Planner", aum: 2000000 },
    { name: "Partner", aum: 6000000 },
  ];
  const TEAM = { assistant: "Jordan (your assistant)", compliance: "Pat Lee (compliance)", manager: "Ms. Rivera (managing partner)", ops: "Operations", peer: "Sam Ortiz (planner)" };
  const DAY = 86400000;
  const state = () => Object.assign({ mode: null, books: {}, exams: {} }, Store.get("fp", {}));
  const save = (s) => Store.set("fp", s);
  function book(mode = state().mode || "practice") {
    const s = state();
    if (!s.books[mode]) {
      const d = new Date();
      d.setHours(9, 0, 0, 0);
      s.books[mode] = { mode, start: d.getTime(), day: 0, seq: 0, inbox: [], market: { idx: 5000, bond: 100, monthIdx: 5000, monthBond: 100, hist: [{ day: 0, v: 5000, chg: 0 }] }, aum: 0, revenue: 0, role: 0, xp: 0, nextLead: 12, nextAudit: 45 };
      save(s);
    }
    return s.books[mode];
  }
  const setBook = (b) => {
    const s = state();
    s.books[b.mode] = b;
    save(s);
  };
  const bookOf = (c) => {
    const s = state();
    return s.books[c.book || "practice"] || null;
  };
  const dateFor = (b, day = b.day) => new Date(b.start + day * DAY);
  const fmtDate = (b, day, o = { weekday: "short", month: "short", day: "numeric" }) => dateFor(b, day).toLocaleDateString(undefined, o);
  const clientsIn = (mode) => Clients.all().filter((c) => (c.book || "practice") === mode && c.stage !== "lost");
  const rngD = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---------- your day: room for about 2-3 meetings (bigger meetings take more of it) ----------
  const LOAD = { discovery: 2.5, presentation: 2.5, review: 2, followup: 1.5, call: 0.5 };
  const CAP = 6;
  const loadOf = (type) => LOAD[type] ?? 1.5;
  const isWeekday = (b, day) => {
    const w = dateFor(b, day).getDay();
    return w > 0 && w < 6;
  };
  const hashS = (str) => [...String(str)].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  // Each client has one weekday they can't do (work, kids' activities…), or none.
  const offDay = (c) => [0, 1, 5, 3, 0, 2][Math.abs(hashS(c.id)) % 6] || null;
  const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function bookedLoad(b, day, exceptId) {
    const booked = clientsIn(b.mode)
      .filter((c) => c.id !== exceptId && c.next && !c.next.missed && c.next.day === day)
      .reduce((n, c) => n + loadOf(c.next.type), 0);
    return booked + ((b.held || {})[day] || 0);
  }
  const capOf = (b) => CAP + (b.hires?.associate ? 1.5 : 0) + (b.hires?.paraplanner ? 1.5 : 0);
  const roomOn = (b, day, exceptId) => capOf(b) - bookedLoad(b, day, exceptId);
  const HIRES = {
    associate: { name: "Client service associate", role: 2, salary: 4000, perk: "Handles birthday notes and routine paperwork, and frees up 1.5 hours a day." },
    paraplanner: { name: "Paraplanner", role: 3, salary: 5500, perk: "Chases missing documents every week and frees up another 1.5 hours a day." },
  };
  function hire(kind) {
    const b = book(state().mode);
    b.hires ||= {};
    b.hires[kind] = { since: b.day };
    push(b, { app: "messages", from: TEAM.manager, body: `Welcome aboard to your new ${HIRES[kind].name.toLowerCase()}! ${HIRES[kind].perk}`, kind: "update" });
    setBook(b);
  }
  function canMeet(b, c, day) {
    return isWeekday(b, day) && !(c && dateFor(b, day).getDay() === offDay(c));
  }
  function freeDay(b, from, type, c) {
    for (let d = Math.max(from, b.day); d < from + 120; d++) if (canMeet(b, c, d) && roomOn(b, d, c?.id) >= loadOf(type)) return d;
    return Math.max(from, b.day);
  }
  function schedule(c, type, from, extra = {}) {
    const b = bookOf(c) || book(c.book || "practice");
    c.next = { type, day: freeDay(b, from, type, c), ...extra };
    return c.next;
  }
  const meetingsToday = (b) => clientsIn(b.mode).filter((c) => c.next && !c.next.missed && c.next.day === b.day);
  // Move a meeting. Notice matters: last-minute changes cost more trust.
  function reschedule(id, day) {
    let out = null;
    Clients.update(id, (c) => {
      const b = bookOf(c);
      const old = c.next || { type: Clients.meetingType(c), day: b.day };
      const notice = old.day - b.day;
      const pen = old.missed ? 0 : notice >= 2 ? -1 : -3;
      c.next = { type: old.type, day, annual: old.annual };
      if (pen) {
        c.relationship = Math.max(0, c.relationship + pen);
        c.relHistory.push({ month: c.month, delta: pen, reason: notice >= 2 ? "Rescheduled with notice" : "Rescheduled last minute" });
      }
      out = { c, pen, old, b };
      if (b.q && old.missed) b.q.missed = b.q.missed || 0;
    });
    if (!out) return null;
    const { c, b } = out;
    const nice = { brief: "Fine. See you then.", chatty: "No problem at all! Life happens. See you then!", anxious: "Okay… is everything alright? See you then.", skeptical: "Okay. Hopefully this one sticks.", detailed: "Got it — I've updated my calendar.", upbeat: "Sounds great, see you then!", guarded: "Okay." }[c.style] || "Okay, see you then.";
    push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: `Re: ${Clients.MEETING_NAME[c.next.type]} moved to ${fmtDate(b, day)}`, body: out.old.missed ? `Thanks for reaching out. ${nice}` : nice, kind: "schedule" });
    setBook(b);
    return out;
  }

  function push(b, msg) {
    b.seq = (b.seq || 0) + 1;
    b.inbox.unshift({ id: b.mode[0] + b.seq, day: b.day, read: false, ...msg });
    b.inbox = b.inbox.slice(0, 150);
  }

  // ---------- client questions & panics (Mail) ----------
  const QUESTIONS = [
    ["My coworker says crypto is the future. Should I move my savings into Bitcoin?", "tip"],
    ["Is now a good time to buy a house, or should I wait for rates to drop?", "general"],
    ["I got a $3,000 tax refund. What's the smartest thing to do with it?", "general"],
    ["Can I take money out of my 401(k) for a down payment?", "general"],
    ["My bank is offering a 5% CD. Is that better than investing?", "general"],
    ["Should I pay off my car loan early?", "general"],
    ["I keep seeing ads for a 'guaranteed 12% return' investment. Legit?", "tip"],
    ["What's the difference between a Roth IRA and a regular IRA again?", "general"],
    ["My friend made a ton on Nvidia. Should I buy some?", "tip"],
    ["Do I need a will? I keep putting it off.", "general"],
    ["Is it bad that I have three credit cards?", "general"],
    ["My employer is offering an HSA. Should I sign up?", "general"],
    ["Can we move our next meeting up? I have a lot on my mind.", "schedule"],
    ["I want to stop contributing to my 401(k) for a few months to build cash. Okay?", "general"],
    ["How much should I have in my emergency fund, again?", "general"],
  ];
  const PANIC = [
    "The market is crashing on the news!! Should I sell everything before it gets worse?",
    "I just saw my account dropped a lot today. Is my retirement ruined?",
    "Everyone at work is saying a recession is coming. Should we move to cash?",
    "I can't sleep. My investments are way down. What do I do?",
  ];
  const HEADLINES = {
    big_down: ["Stocks tumble as recession fears grow", "Markets slide after hotter-than-expected inflation report", "Tech sell-off drags indexes lower", "Selloff deepens as bond yields spike"],
    down: ["Stocks dip as investors weigh Fed comments", "Markets edge lower ahead of earnings", "Energy shares lead a quiet decline"],
    flat: ["Stocks drift in a quiet session", "Markets mixed as investors await jobs data", "Little movement ahead of the Fed meeting"],
    up: ["Stocks rise on strong retail sales", "Markets climb as inflation cools", "Banks lead a broad rally"],
    big_up: ["Stocks surge as the Fed signals rate cuts", "Best day in months as earnings beat expectations", "Rally broadens as recession fears fade"],
  };

  // Made-up (but realistic) reasons the market moved, so you can explain a day to a client.
  const DRIVERS = [
    { id: "cpi", topic: "the latest inflation report", up: ["inflation cools more than expected", "This month's inflation report (CPI) came in below forecasts. Investors now expect the Fed can cut interest rates sooner — and lower rates make companies' future profits worth more today."], down: ["inflation runs hotter than expected", "This month's inflation report (CPI) came in above forecasts. Investors now expect interest rates to stay high for longer, which weighs on both stock and bond prices."], lead: ["Real estate", "Tech"], lag: ["Energy", "Consumer staples"] },
    { id: "fed", topic: "comments from the Fed", up: ["the Fed hints at rate cuts", "The Federal Reserve chair said the economy is cooling enough that rate cuts could come this year. Cheaper borrowing helps businesses and consumers."], down: ["the Fed signals rates will stay high", "Fed officials said they're in no hurry to cut rates. Higher rates for longer mean more expensive loans and pricier mortgages, so investors trimmed risk."], lead: ["Small caps", "Homebuilders"], lag: ["Banks", "Utilities"] },
    { id: "jobs", topic: "the jobs report", up: ["hiring beats expectations", "Employers added more jobs than expected while wage growth stayed moderate — a 'just right' report that suggests the economy is healthy without overheating."], down: ["hiring slows sharply", "Hiring slowed sharply and unemployment ticked up, raising worries that a slowdown or recession is coming."], lead: ["Industrials", "Retail"], lag: ["Travel", "Small caps"] },
    { id: "earn", topic: "tech earnings", up: ["big tech earnings beat forecasts", "Several of the largest tech companies reported profits well above expectations, driven by cloud and AI demand. Because they're a big part of the index, their gains lifted the whole market."], down: ["tech earnings disappoint", "A few of the largest tech companies warned that sales will grow more slowly. Because they're a big share of the index, their drop pulled the whole market down."], lead: ["Semiconductors", "Software"], lag: ["Media", "Hardware"] },
    { id: "oil", topic: "swings in oil prices", up: ["oil prices fall", "Oil prices dropped on higher supply, which lowers costs for airlines, shippers and drivers — and eases inflation worries."], down: ["oil prices spike", "Oil jumped on supply disruptions overseas. Higher fuel costs squeeze company profits and consumers' budgets, and can push inflation up."], lead: ["Airlines", "Energy"], lag: ["Energy", "Airlines"] },
    { id: "yields", topic: "moves in bond yields", up: ["bond yields ease", "Interest rates on 10-year Treasury bonds fell, making stocks look more attractive by comparison and lowering borrowing costs."], down: ["bond yields jump", "The 10-year Treasury yield rose sharply. When safe bonds pay more, investors demand more from stocks, so stock prices fall — and existing bond prices fall too."], lead: ["Tech", "Real estate"], lag: ["Real estate", "Utilities"] },
    { id: "retail", topic: "retail sales", up: ["shoppers keep spending", "Retail sales came in strong — people are still spending, which supports company profits since consumer spending drives about two-thirds of the economy."], down: ["consumers pull back", "Retail sales fell unexpectedly, a sign households are feeling squeezed. Less spending means lower profits ahead."], lead: ["Retail", "Restaurants"], lag: ["Retail", "Autos"] },
    { id: "geo", topic: "news from overseas", up: ["tensions ease overseas", "Talks between major governments made progress, calming fears about trade disruptions and conflict."], down: ["tensions rise overseas", "Escalating conflict overseas made investors nervous about trade and supply chains. Investors moved toward safer assets like Treasury bonds and gold."], lead: ["Industrials", "Defense"], lag: ["Travel", "Chipmakers"] },
    { id: "banks", topic: "bank earnings", up: ["bank earnings impress", "Big banks reported healthy profits and fewer bad loans — a sign borrowers are doing fine."], down: ["worries about bank loans grow", "A regional bank reported bigger losses on commercial real estate loans, sparking worries about other lenders."], lead: ["Banks", "Insurers"], lag: ["Regional banks", "Real estate"] },
    { id: "ai", topic: "AI spending", up: ["excitement over AI spending builds", "A major chipmaker raised its forecast on surging demand for AI data centers, lifting the many companies that supply them."], down: ["doubts about AI spending grow", "Investors questioned whether companies' huge AI spending will pay off, and highly valued AI stocks fell the most."], lead: ["Semiconductors", "Utilities"], lag: ["Semiconductors", "Software"] },
    { id: "housing", topic: "housing data", up: ["home sales pick up", "Home sales and builder confidence rose as mortgage rates dipped."], down: ["the housing market slows", "Home sales fell to a multi-year low as high mortgage rates kept buyers away."], lead: ["Homebuilders", "Home improvement"], lag: ["Homebuilders", "Banks"] },
  ];
  const EXPLAIN = {
    big_down: "Talking point: days like this happen a few times a year. Their plan already assumes drops like this — selling now would lock in the loss and miss the rebound. Their emergency fund means they won't have to sell.",
    down: "Talking point: normal day-to-day noise. A diversified, long-term plan doesn't react to single days.",
    flat: "Talking point: nothing to do — quiet days are most days.",
    up: "Talking point: nice, but one good day doesn't change the plan. Stay diversified and keep contributing.",
    big_up: "Talking point: great day — but don't chase it. Big up days often come right after big down days, which is why staying invested matters.",
  };
  function newsFor(b, day, chg) {
    const r = rngD(b.start / 1000 + day * 977);
    const key = chg < -0.02 ? "big_down" : chg < -0.004 ? "down" : chg < 0.004 ? "flat" : chg < 0.02 ? "up" : "big_up";
    const d = DRIVERS[Math.floor(r() * DRIVERS.length)];
    const dir = chg >= 0 ? "up" : "down";
    const pct = Math.abs(chg * 100).toFixed(1) + "%";
    const verb = { big_down: pick(r, ["Stocks tumble", "Stocks sink", "Markets slide"]), down: pick(r, ["Stocks dip", "Stocks slip", "Markets edge lower"]), flat: pick(r, ["Stocks drift", "Markets end mixed", "Stocks little changed"]), up: pick(r, ["Stocks rise", "Stocks gain", "Markets climb"]), big_up: pick(r, ["Stocks surge", "Stocks rally", "Markets soar"]) }[key];
    const [why, more] = d[dir];
    return {
      key,
      topic: d.topic,
      head: key === "flat" ? `${verb} as investors weigh ${d.topic}` : `${verb} ${pct} as ${why}`,
      why: key === "flat" ? `Investors were digesting ${d.topic}, but good and bad news roughly canceled out, so the market ended about where it started.` : more,
      leaders: dir === "up" ? d.lead[0] : d.lead[1],
      laggards: dir === "up" ? d.lag[0] : d.lag[1],
      explain: EXPLAIN[key],
    };
  }

  // A handful of (made-up) headlines for any market day — read them, you can't click them.
  const OUTLETS = ["The Daily Ledger", "Market Wire", "Finance Today", "The Money Desk", "Capital Street Report", "Main Street Money"];
  const COMPANIES = ["Northwind Tech", "Bluepeak Energy", "Harbor Bank", "Cobalt Motors", "Lumen Retail", "Vertex Pharma", "Summit Cloud", "Redwood Foods", "Atlas Airlines", "Quill Software"];
  function headlinesFor(b, day, chg) {
    const r = rngD(b.start / 1000 + day * 313);
    const n = newsFor(b, day, chg);
    const co = () => pick(r, COMPANIES);
    const pct = () => (2 + r() * 9).toFixed(1);
    const pool = [
      () => `${co()} shares ${r() < 0.5 ? "jump" : "slide"} ${pct()}% after earnings ${r() < 0.5 ? "beat" : "miss"} forecasts`,
      () => `Mortgage rates ${r() < 0.5 ? "ease" : "climb"} to ${(5.9 + r() * 1.4).toFixed(2)}% for a 30-year loan`,
      () => `${co()} announces ${pick(r, ["layoffs of 1,200 workers", "a $2 billion buyback", "a new CEO", "plans to expand into Texas", "a dividend increase"])}`,
      () => `Why more workers are ${pick(r, ["missing out on their 401(k) match", "raiding retirement savings early", "skipping emergency funds", "carrying credit card balances"])}`,
      () => `${pick(r, ["Gas prices", "Egg prices", "Rents", "Used car prices", "Airfares"])} ${r() < 0.5 ? "fall" : "rise"} for the ${pick(r, ["second", "third", "fourth"])} straight month`,
      () => `Bitcoin ${r() < 0.5 ? "tops" : "drops below"} $${Math.round(60 + r() * 50)},000 as traders ${r() < 0.5 ? "pile in" : "take profits"}`,
      () => `Consumer confidence ${r() < 0.5 ? "improves" : "slips"} as shoppers watch prices`,
      () => `Ask the planner: ${pick(r, ["Should I pay off my mortgage early?", "Is a Roth IRA worth it at 25?", "How much house can I afford?", "What's a reasonable emergency fund?", "Are target-date funds enough?"])}`,
      () => `Treasury yields ${r() < 0.5 ? "edge lower" : "tick higher"}; 10-year at ${(3.6 + r() * 1.3).toFixed(2)}%`,
      () => `${pick(r, ["Europe", "Asian markets", "Emerging markets", "Japan's Nikkei"])} ${r() < 0.5 ? "gains" : "falls"} overnight`,
    ];
    const used = new Set();
    const out = [{ head: n.head, src: pick(r, OUTLETS), top: true }];
    while (out.length < 6) {
      const k = Math.floor(r() * pool.length);
      if (used.has(k)) continue;
      used.add(k);
      out.push({ head: pool[k](), src: pick(r, OUTLETS) });
    }
    return out;
  }

  // ---------- the clock ----------
  function tick(days, mode = state().mode || "practice", opts = {}) {
    const b = book(mode);
    const start = b.inbox.filter((m) => !m.read).length;
    let stopped = null;
    for (let i = 0; i < days; i++) {
      // Leaving a day: meetings you didn't hold are missed; unanswered calls become voicemails.
      for (const c of clientsIn(mode))
        if (c.next && !c.next.missed && c.next.day <= b.day) {
          Clients.update(c.id, (x) => {
            x.next.missed = true;
            x.relationship = Math.max(0, x.relationship - 6);
            x.relHistory.push({ month: x.month, delta: -6, reason: `Missed the ${Clients.MEETING_NAME[x.next.type].toLowerCase()} on ${fmtDate(b, x.next.day)}` });
          });
          b.week ||= { held: 0, missed: 0, replies: 0, calls: 0 };
          b.week.missed++;
          if (b.q) b.q.missed = (b.q.missed || 0) + 1;
          push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Did I miss something?", body: { anxious: "Hi Mason, I waited for our meeting but never heard from you. Is everything okay? Can we find a new time?", skeptical: "We had a meeting scheduled and you didn't show. Not a great sign. When can we reschedule?", brief: "We were supposed to meet. New time?", chatty: "Hey Mason! I think we were supposed to meet — did I get the date wrong? Let me know a new time!" }[c.style] || "Hi Mason — I think we had a meeting scheduled, but I didn't hear from you. Can we reschedule?", kind: "schedule", needsReply: true });
          push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `${c.first} ${c.last}'s meeting was missed. Open their file and reschedule — they're not happy.`, kind: "reminder" });
        }
      for (const call of b.calls || [])
        if (["ringing", "answered", "calling back"].includes(call.status) && call.day <= b.day) call.status = "voicemail";
      b.day++;
      const r = rngD(b.start / 1000 + b.day * 131);
      const m = b.market;
      // Daily market: small moves, with an occasional shock.
      // Markets are closed on weekends.
      const wd = new Date(b.start + b.day * 86400000).getDay();
      const open = wd !== 0 && wd !== 6;
      let rs = 0.00035 + 0.0105 * gauss(r);
      if (r() < 0.012) rs = -(0.03 + r() * 0.04);
      if (r() < 0.008) rs = 0.025 + r() * 0.03;
      const rb = 0.00015 + 0.0028 * gauss(r);
      if (!open) rs = 0;
      else {
        m.idx = Math.max(500, m.idx * (1 + rs));
        m.bond = m.bond * (1 + rb);
        m.hist.push({ day: b.day, v: Math.round(m.idx * 100) / 100, chg: rs, bchg: rb });
        m.hist = m.hist.slice(-400);
      }
      const clients = clientsIn(mode);
      // Monthly: every client's money moves forward (markets, payments, life events).
      if (b.day % 30 === 0) {
        const mret = { s: m.idx / m.monthIdx - 1, b: m.bond / m.monthBond - 1 };
        m.monthIdx = m.idx;
        m.monthBond = m.bond;
        for (const c0 of clients) {
          let news = [];
          Clients.update(c0.id, (c) => {
            const n = c.events.length;
            c.dayNow = b.day;
            Clients.advance(c, 1, mret);
            news = c.events.slice(n);
          });
          news.forEach((ev) => push(b, { app: "mail", from: `${c0.first} ${c0.last}`, clientId: c0.id, subject: ev.text.replace(c0.first + "'s ", "My ").replace(c0.first + " ", "").replace(/\.$/, "").replace(/^./, (x) => x.toUpperCase()), body: ev.say, kind: ev.scam ? "scam" : ev.decision ? "decision" : "event", needsReply: true }));
        }
      }
      // Panic emails on big down days (nervous clients first).
      b.lastPanic ||= {};
      if (rs < -0.03)
        clients
          .filter((c) => (c.truth.risk <= 3 || c.style === "anxious") && b.day - (b.lastPanic[c.id] ?? -999) > 60)
          .slice(0, 2)
          .forEach((c) => {
            if (r() < 0.55) {
              b.lastPanic[c.id] = b.day;
              push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Market drop — worried", body: pick(r, PANIC), kind: "panic", needsReply: true });
            }
          });
      // Random questions — by email, or a phone call on a weekday.
      b.calls ||= [];
      for (const c of clients) {
        const scamCall = open && r() < 0.0025;
        if (scamCall && !b.calls.some((x) => x.clientId === c.id && x.status !== "done" && x.status !== "ignored")) {
          b.calls.unshift({ id: "call" + b.day + c.id.slice(-4), clientId: c.id, day: b.day, reason: pick(r, ["I just got a call from someone saying they're from Microsoft and my computer has a virus — they want remote access to fix it. Should I let them?", "Someone called saying my grandson is in jail and needs $3,000 bail in gift cards. He begged me not to tell his parents. What do I do?", "A guy from 'Social Security' says my number was suspended and I need to verify it. Is that a thing?"]), kind: "scam", status: "ringing" });
          continue;
        }
        const panicky = rs < -0.025 && (c.truth.risk <= 3 || c.style === "anxious") && r() < 0.35;
        if (r() < 0.011 || panicky) {
          const [q, kind] = panicky ? [pick(r, PANIC), "panic"] : pick(r, QUESTIONS);
          if (open && r() < 0.45 && !b.calls.some((x) => x.clientId === c.id && x.status !== "done" && x.status !== "ignored")) b.calls.unshift({ id: "call" + b.day + c.id.slice(-4), clientId: c.id, day: b.day, reason: q, kind, status: "ringing" });
          else if (!panicky) push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Quick question", body: q, kind, needsReply: true });
        }
      }
      b.calls = b.calls.slice(0, 40);
      // Voicemails left unanswered for 3 days hurt.
      for (const call of b.calls)
        if (call.status === "voicemail" && b.day - call.day >= 3) {
          call.status = "ignored";
          Clients.update(call.clientId, (x) => {
            x.relationship = Math.max(0, x.relationship - 4);
            x.relHistory.push({ month: x.month, delta: -4, reason: "Never returned their call" });
          });
        }
      const today = dateFor(b, b.day);
      for (const c of clients) {
        // Birthdays: a quick note goes a long way.
        const bd = Math.abs(hashS(c.id + "bday"));
        if (today.getMonth() === bd % 12 && today.getDate() === 1 + (bd % 28)) push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: `🎂 It's ${c.first}'s birthday`, body: `Today is ${c.first}'s birthday. Send a quick note?`, kind: "birthday", needsReply: true, fromCalendar: true });
        // Unhappy clients: a warning first, then they leave.
        if (c.relationship < 28 && !c.warned) {
          Clients.update(c.id, (x) => (x.warned = true));
          push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `Heads up: ${c.first} ${c.last} sounded frustrated on the phone. Their relationship is at ${c.relationship}/100 — reach out before they leave.`, kind: "reminder" });
        }
        if (c.relationship < 15 && c.stage !== "lost") {
          Clients.update(c.id, (x) => {
            x.stage = "lost";
            x.aum = 0;
            x.next = null;
          });
          push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Moving on", body: "Hi Mason. I've decided to work with another advisor. Thanks for your time.", kind: "lost" });
        }
      }
      // Happy clients refer friends (about once a year each).
      if (b.day % 30 === 0)
        for (const c of clients)
          if (c.relationship >= 75 && r() < 0.2) {
            const lead = { seed: Math.floor(r() * 1e9), wealth: Math.min(4, (b.role || 0) + (r() < 0.3 ? 1 : 0)), difficulty: r() < 0.5 ? "realistic" : "easy", referredBy: c.id };
            const pv = Clients.generate(lead.difficulty, lead.seed, { book: mode, wealth: lead.wealth });
            push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Someone you should meet", body: `My ${pick(r, ["coworker", "neighbor", "cousin", "friend from the gym", "sister-in-law"])} ${pv.first} has been stressing about money (${pv.reason.replace(/^wants help with /, "")}). I told them how much you've helped me — okay if I pass along your info?`, kind: "lead", lead, needsReply: false });
          }
      // Your team texts you through the day.
      if (open && r() < 0.3) {
        const c = clients.length ? pick(r, clients) : null;
        const lines = [
          [TEAM.assistant, c && `${c.first} ${c.last} called while you were out — they said it's not urgent. Maybe drop them a note.`],
          [TEAM.assistant, "The printer on 3 is jammed again. Use the one by the kitchen if you need to print plans."],
          [TEAM.assistant, c && `I put ${c.first}'s paperwork in their file. Let me know if you need anything else before the next meeting.`],
          [TEAM.compliance, "Reminder: never put guarantees or return promises in client emails. Every email is archived."],
          [TEAM.compliance, "Quick tip: document WHY each recommendation fits the client. If it isn't written down, it didn't happen."],
          [TEAM.compliance, "Annual training is due at the end of the month. It takes about 30 minutes."],
          [TEAM.manager, "Team lunch Friday — my treat. Bring one client win to share."],
          [TEAM.manager, "Coaching tip: in your next meeting, try summarizing what the client said before giving advice. It builds trust fast."],
          [TEAM.manager, c && `How's it going with ${c.first}? Let me know if you want me to sit in on the next meeting.`],
          [TEAM.ops, c && `Account paperwork for ${c.first} ${c.last} is processed.`],
          [TEAM.ops, "Systems maintenance tonight at 9pm — the client portal will be down for an hour."],
          [TEAM.peer, "Do you have a good way to explain sequence-of-returns risk? A client asked me and I blanked 😅"],
          [TEAM.peer, "Coffee run — want anything?"],
          [TEAM.peer, c && `Saw ${c.first} in the lobby earlier. Seemed in a good mood!`],
        ].filter((x) => x[1]);
        const [from, body] = pick(r, lines);
        push(b, { app: "messages", from, clientId: /\b(called|paperwork|going with|Saw)\b/.test(body) ? c?.id : undefined, body, kind: "team" });
      }
      // Morning heads-ups.
      for (const c of clients)
        if (c.next && !c.next.missed && c.next.day === b.day && c.next.type === "presentation" && !c.plan?.submittedAt)
          push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `⚠️ ${c.first}'s plan presentation is TODAY and the plan isn't built. Build it now or reschedule with them.`, kind: "reminder" });
      // Friday: the week in review.
      if (today.getDay() === 5) {
        const w = b.week || { held: 0, missed: 0, replies: 0, calls: 0 };
        const unanswered = b.inbox.filter((m) => m.clientId && m.needsReply && !m.replied && !m.ignored).length;
        const avg = clients.length ? Math.round(clients.reduce((n, c) => n + c.relationship, 0) / clients.length) : 0;
        const focus = w.missed ? "Don't miss meetings — reschedule early if you have to." : unanswered > 2 ? "Clear your inbox — clients notice slow replies." : avg < 50 ? "Relationships are lukewarm. Remember personal details and follow up on their news." : "Keep the momentum. Try to get every plan presented within two weeks of discovery.";
        push(b, { app: "messages", from: TEAM.manager, body: `📋 Week in review: ${w.held} meeting${w.held === 1 ? "" : "s"} held, ${w.calls} call${w.calls === 1 ? "" : "s"}, ${w.replies} email${w.replies === 1 ? "" : "s"} answered, ${w.missed} missed. ${unanswered} email${unanswered === 1 ? "" : "s"} waiting. Average relationship ${avg}/100. Focus next week: ${focus}`, kind: "report" });
        b.week = { held: 0, missed: 0, replies: 0, calls: 0 };
      }
      // Team: meeting reminders, overdue follow-ups, ignored emails.
      for (const c of clients) {
        if (c.next && !c.next.missed && c.next.day === b.day + 1) push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `Reminder: ${c.first} ${c.last} — ${Clients.MEETING_NAME[c.next.type] || "meeting"} is tomorrow (${fmtDate(b, c.next.day)}).`, kind: "reminder" });
        if (c.next && !c.next.missed && c.next.day === b.day) push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `${c.first} ${c.last} is on your calendar today — ${Clients.MEETING_NAME[c.next.type] || "meeting"}. Open their file to start.`, kind: "reminder" });
      }
      for (const msg of b.inbox)
        if (msg.needsReply && !msg.replied && !msg.ignored && b.day - msg.day >= 7 && msg.clientId && msg.kind !== "birthday") {
          msg.ignored = true;
          Clients.update(msg.clientId, (x) => {
            x.relationship = Math.max(0, x.relationship - 3);
            x.relHistory.push({ month: x.month, delta: -3, reason: `Didn't answer their email for a week (“${msg.subject}”)` });
          });
        }
      if (mode === "career") careerDay(b, r, clients);
      // Your team at work.
      if (b.hires?.associate)
        for (const m of b.inbox)
          if (m.kind === "birthday" && !m.replied && m.day === b.day) {
            m.replied = true;
            m.needsReply = false;
            m.thread = [{ who: "them", text: m.body, day: b.day }, { who: "me", text: "Your associate sent a birthday card from you. 🎂", day: b.day }];
            Clients.update(m.clientId, (x) => ((x.relationship = Math.min(100, x.relationship + 2)), x.relHistory.push({ month: x.month, delta: 2, reason: "Birthday card (sent by your associate)" })));
          }
      if (b.hires?.paraplanner && today.getDay() === 1)
        for (const c of clients) if (c.meetings.length && Clients.docsOf(c).some((d) => d.status !== "received")) {
          const got = Clients.requestDocs(c.id);
          if (got.length) push(b, { app: "messages", from: "Your paraplanner", clientId: c.id, body: `Chased ${c.first}'s missing documents — ${got.length} new fact${got.length === 1 ? "" : "s"} added to their file.`, kind: "update" });
        }
      if (b.day % 30 === 0 && b.hires) for (const k of Object.keys(b.hires)) b.revenue = (b.revenue || 0) - (HIRES[k]?.salary || 0);
      // Monthly mentor review of one of your meetings.
      if (b.day % 30 === 15) {
        const recent = clients.flatMap((c) => c.meetings.filter((m) => m.day != null && b.day - m.day <= 30 && m.thread?.length > 3).map((m) => ({ c, m }))).sort((a, z) => z.m.day - a.m.day)[0];
        if (recent) {
          const tips = Clients.coachLines(recent.c, recent.m);
          const flat = Object.values(tips).flat();
          const good = flat.filter((x) => x[0] === "good").length;
          const fix = flat.filter((x) => x[0] !== "good").map((x) => x[1]);
          const mine = recent.m.thread.filter((t) => t.from === "me");
          const qs = mine.filter((t) => /\?/.test(t.text)).length;
          const talk = Math.round((mine.reduce((n, t) => n + t.text.split(" ").length, 0) / Math.max(1, recent.m.thread.reduce((n, t) => n + t.text.split(" ").length, 0))) * 100);
          push(b, { app: "messages", from: TEAM.manager, clientId: recent.c.id, body: `🎧 Mentor review — your ${Clients.MEETING_NAME[recent.m.type].toLowerCase()} with ${recent.c.first} (score ${recent.m.score}).\n• You talked ${talk}% of the time ${talk > 55 ? "(aim for under 50% — let them talk)" : "(good balance)"}\n• ${qs} questions asked\n• ${good} strong moment${good === 1 ? "" : "s"}\n${fix.length ? "• Work on: " + [...new Set(fix)].slice(0, 2).join(" ") : "• Nothing major to fix — great job."}\nOpen their Meetings tab → Replay with coaching to see the exact lines.`, kind: "review" });
        }
      }
      if (opts.stop && i < days - 1) {
        const meets = clientsIn(mode).filter((c) => c.next && !c.next.missed && c.next.day === b.day);
        const ringing = b.calls.filter((x) => x.status === "ringing" && x.day === b.day);
        if (meets.length || ringing.length) {
          stopped = { meetings: meets.length, calls: ringing.length };
          break;
        }
      }
    }
    setBook(b);
    const unread = b.inbox.filter((m) => !m.read).length - start;
    return { unread: Math.max(0, unread), day: b.day, stopped };
  }

  // ---------- career mode ----------
  function careerDay(b, r, clients) {
    b.aum = clients.reduce((n, c) => n + (c.aum || 0), 0);
    b.revenue = (b.revenue || 0) + (b.aum * 0.01) / 365;
    // Coworkers you're measured against.
    b.peers ||= [["Sam Ortiz", 0.9, 350000], ["Priya Nair", 1.4, 900000], ["Derek Holt", 0.7, 220000], ["Mia Chen", 1.1, 600000]].map(([name, pace, aum]) => ({ name, pace, aum }));
    for (const p of b.peers) {
      p.aum = Math.round(p.aum * (1 + 0.0002 + 0.0025 * gauss(r)));
      if (r() < 0.004 * p.pace) p.aum += Math.round(25000 + r() * 125000 * p.pace);
    }
    // Quarterly goals and bonus.
    b.q ||= { start: b.day, aum0: b.aum, clients0: clients.length, missed: 0 };
    if (b.day - b.q.start >= 91) {
      const goals = qGoals(b, clients);
      const met = goals.filter((g) => g.done).length;
      const bonus = met * Math.max(250, Math.round(b.aum * 0.0025));
      b.revenue += bonus;
      b.bonus = (b.bonus || 0) + bonus;
      const board = [...b.peers.map((p) => ({ name: p.name, aum: p.aum })), { name: "You", aum: b.aum }].sort((x, z) => z.aum - x.aum);
      const rank = board.findIndex((x) => x.name === "You") + 1;
      push(b, { app: "messages", from: TEAM.manager, body: `Quarter review: you hit ${met} of ${goals.length} goals (${goals.map((g) => (g.done ? "✓ " : "✗ ") + g.label).join(" · ")}). Bonus: ${Clients.usd(bonus)}. You're #${rank} of ${board.length} on the team by assets.`, kind: "report" });
      b.q = { start: b.day, aum0: b.aum, clients0: clients.length, missed: 0 };
    }
    if (b.day >= b.nextLead) {
      b.nextLead = b.day + 16 + Math.floor(r() * 12);
      const lead = { seed: Math.floor(r() * 1e9), wealth: Math.min(4, b.role + (r() < 0.3 ? 1 : 0)), difficulty: b.role < 1 ? (r() < 0.6 ? "easy" : "realistic") : b.role < 3 ? (r() < 0.7 ? "realistic" : "tough") : r() < 0.5 ? "realistic" : "tough" };
      const preview = Clients.generate(lead.difficulty, lead.seed, { book: "career", wealth: lead.wealth });
      push(b, { app: "messages", from: TEAM.manager, body: `New lead for you: ${preview.first} ${preview.last}, ${preview.age}, ${preview.job}. ${preview.reason[0].toUpperCase() + preview.reason.slice(1)}. ${lead.wealth >= 2 ? "Significant assets — handle with care." : ""} Want them?`, kind: "lead", lead });
    }
    if (b.day % 30 === 0 && b.day > 0) push(b, { app: "messages", from: TEAM.manager, body: `Monthly check-in: you manage ${Clients.usd(b.aum)} across ${clients.length} client${clients.length === 1 ? "" : "s"} and have earned ${Clients.usd(b.revenue)} in fees so far. ${clients.some((c) => c.relationship < 35) ? "Some relationships need attention." : "Keep it up."}`, kind: "update" });
    if (b.day >= b.nextAudit) {
      b.nextAudit = b.day + 50 + Math.floor(r() * 30);
      const flagged = clients.filter((c) => c.plan?.submittedAt && Clients.compliance(c, c.plan).some((f) => f.sev === "high"));
      push(b, { app: "messages", from: TEAM.compliance, body: flagged.length ? `Compliance audit: ${flagged.map((c) => c.first + " " + c.last).join(", ")} ${flagged.length === 1 ? "has" : "have"} unresolved suitability flags. Please fix the plan${flagged.length === 1 ? "" : "s"} within two weeks.` : "Routine compliance audit complete — no issues found. Nice work.", kind: flagged.length ? "audit" : "update", audit: flagged.map((c) => c.id), due: b.day + 14 });
      if (!flagged.length) b.xp += 20;
    }
    // Promotions.
    const next = ROLES[b.role + 1];
    if (next && b.aum >= next.aum && (!next.exam || state().exams[next.exam]?.passed)) {
      b.role++;
      push(b, { app: "messages", from: TEAM.manager, body: `Congratulations — you've been promoted to ${next.name}! You'll start getting bigger and more complex clients.`, kind: "promo" });
    }
  }
  function acceptLead(msgId) {
    const b = book(state().mode || "career");
    const m = b.inbox.find((x) => x.id === msgId);
    if (!m?.lead || m.accepted) return null;
    m.accepted = true;
    const c = Clients.generate(m.lead.difficulty, m.lead.seed, { book: b.mode, day: b.day, wealth: m.lead.wealth });
    if (m.lead.referredBy) {
      const ref = Clients.find(m.lead.referredBy);
      c.referral = ref ? `${ref.first} ${ref.last} (your client)` : c.referral;
      c.relationship += 10;
    }
    Clients.saveAll([c, ...Clients.all()]);
    Clients.update(c.id, (x) => schedule(x, "discovery", b.day + 3));
    const booked = Clients.find(c.id).next.day;
    push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `I booked ${c.first}'s discovery meeting for ${fmtDate(b, booked)} and sent them our intake forms.`, kind: "reminder" });
    setBook(b);
    return c;
  }
  // After a meeting: schedule the next one (real-firm rhythm), move assets, update career stats.
  function afterMeeting(c, type, score) {
    const b = bookOf(c);
    if (!b) return;
    const reviews = c.meetings.filter((m) => m.type === "review").length;
    b.held ||= {};
    b.held[b.day] = (b.held[b.day] || 0) + loadOf(type);
    if (c.meetings.length) c.meetings[c.meetings.length - 1].day = b.day;
    b.week ||= { held: 0, missed: 0, replies: 0, calls: 0 };
    if (type === "call") {
      b.week.calls++;
      const call = (b.calls || []).find((x) => x.clientId === c.id && !["done", "ignored"].includes(x.status));
      if (call) call.status = "done";
    } else b.week.held++;
    const wasPresentation = c.next?.type === "presentation" && c.next.day <= b.day && !c.next.missed;
    if (type === "call") {
      // Calls don't change the schedule.
    } else if (type === "followup" && wasPresentation && !c.plan?.submittedAt) {
      // They came for the plan and you didn't have one.
      c.relationship = Math.max(0, c.relationship - 5);
      c.relHistory.push({ month: c.month, delta: -5, reason: "Showed up to the plan presentation without a plan" });
      c.next = { type: "presentation", day: b.day, missed: true, why: "noplan" };
      push(b, { app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Our meeting today", body: "Hi Mason — I thought today we were going over the plan? When will it be ready? Please let me know a new time.", kind: "schedule", needsReply: true });
    } else if (type === "followup" && c.next?.type === "presentation" && c.next.day > b.day && !c.next.missed) {
      // Keep the presentation that's already booked.
    } else if (type === "discovery" || type === "followup") schedule(c, "presentation", b.day + 14);
    else schedule(c, "review", b.day + 91, { annual: reviews % 4 === 3 });
    if (type !== "call" && c.next && !c.next.missed) push(b, { app: "messages", from: TEAM.assistant, clientId: c.id, body: `Booked ${c.first}'s ${Clients.MEETING_NAME[c.next.type].toLowerCase()} for ${fmtDate(b, c.next.day, { weekday: "long", month: "short", day: "numeric" })}.`, kind: "reminder", read: true });
    // Manager feedback after real meetings.
    if (type !== "call" && Math.random() < 0.5) push(b, { app: "messages", from: TEAM.manager, clientId: c.id, body: score >= 75 ? `Heard the ${Clients.MEETING_NAME[type].toLowerCase()} with ${c.first} went really well. Nice work.` : score >= 55 ? `Solid ${Clients.MEETING_NAME[type].toLowerCase()} with ${c.first}. Next time, slow down and summarize what you heard before moving on.` : `Let's debrief the ${c.first} meeting. Remember: listen more, ask open questions, and tie every step back to their goals.`, kind: "update" });
    setBook(b);
    if (c.book === "career") {
      b.xp = (b.xp || 0) + Math.round(score / 10);
      if (type === "presentation" && score >= 55 && !c.aum) {
        const t = c.truth;
        c.aum = Math.round((t.brokerage || 0) + (t.roth || 0) + Math.max(0, t.cash - t.expenses * 4) * 0.5);
        if (c.aum > 0) push(b, { app: "messages", from: TEAM.ops, clientId: c.id, body: `${c.first} ${c.last} signed on. ${Clients.usd(c.aum)} in assets is transferring to you.`, kind: "update" });
      }
      setBook(b);
    }
  }

  // ---------- replying to clients ----------
  function scoreReply(msg, text, days) {
    const t = text.toLowerCase();
    const notes = [];
    let s = 0;
    const words = t.split(/\s+/).filter(Boolean).length;
    if (/\b(understand|makes sense|totally|sorry to hear|congrat|great question|i hear you|that's (stressful|exciting|hard))\b/.test(t)) (s++, notes.push("✓ Empathy"));
    else notes.push("✗ No empathy — acknowledge how they feel first");
    if (/\b(call|meet|meeting|schedule|let's (talk|go over|look)|i'll|i will|next week|tomorrow)\b/.test(t)) (s++, notes.push("✓ Clear next step"));
    else notes.push("✗ No next step — offer a call or say what you'll do");
    if (/\b(guarantee|can't lose|definitely (go|going) up|risk.?free|sure thing)\b/.test(t)) (s -= 2, notes.push("✗ Never promise returns or guarantees"));
    if (msg.kind === "tip" && /\b(yes,? (buy|go for it)|you should buy|definitely buy|put it all)\b/.test(t)) (s -= 2, notes.push("✗ Don't give hot-stock/crypto tips — tie it back to their plan"));
    if (msg.kind === "tip" && /\b(plan|diversif|goals?|risk|small (amount|portion)|speculat)\b/.test(t)) (s++, notes.push("✓ Brought it back to their plan"));
    if (msg.kind === "scam") {
      const protect = /\b(scam|fraud|don'?t (pay|send|click|share|give|move|log)|do not|never|verify|official|hang up|real (irs|bank)|call (your|the) bank|gift cards?|too good to be true|red flag)\b/.test(t);
      const fell = /\b(go ahead|pay (it|them)|send (it|them)|sounds (legit|good|great)|do it|sure,? (pay|send))\b/.test(t) && !protect;
      return { score: protect ? 4 : fell ? -4 : 0, delta: protect ? 4 : fell ? -6 : -1, fell, notes: [protect ? "✓ You spotted the scam and protected them" : fell ? "✗ That was a scam — they lost money" : "✗ Warn them clearly: this is a scam. Don't pay, click or share anything; contact the real organization directly."] };
    }
    if (msg.kind === "decision") {
      const nums = /\$|\d/.test(t);
      const tradeoff = /\b(on the other hand|but|however|trade.?off|pros?|cons?|depends|compare|versus|vs\.?)\b/.test(t);
      const goals = /\b(goals?|plan|emergency|budget|retire)\b/.test(t);
      const nextStep = /\b(call|meet|meeting|let's|run the numbers|sit down|i'll)\b/.test(t);
      const sc2 = (nums ? 1 : 0) + (tradeoff ? 1 : 0) + (goals ? 1 : 0) + (nextStep ? 1 : 0);
      return { score: sc2, delta: Math.max(-2, sc2 - 1), notes: [nums ? "✓ Used real numbers" : "✗ Run the numbers (Decision helper on their Overview tab)", tradeoff ? "✓ Weighed both sides" : "✗ Show the tradeoffs, not just yes or no", goals ? "✓ Tied it to their goals" : "✗ Connect the choice to their goals and plan", nextStep ? "✓ Clear next step" : "✗ Offer to go over it together"] };
    }
    if (msg.kind === "birthday") {
      const warm = /\b(happy|birthday|hope|wish|celebrat|enjoy)\b/.test(t);
      return { score: warm ? 3 : 0, delta: warm ? 3 : 0, notes: [warm ? "✓ A personal touch clients remember" : "✗ Say happy birthday!"] };
    }
    if (msg.kind === "panic") {
      if (/\b(long.?term|stay the course|diversif|plan|historically|recover|time horizon|don't (panic|sell))\b/.test(t)) (s += 2, notes.push("✓ Long-term perspective"));
      else notes.push("✗ Panicking clients need perspective: long-term plan, diversification, history");
      if (/\b(sell everything|go to cash|get out)\b/.test(t) && !/\bdon'?t\b/.test(t)) (s -= 2, notes.push("✗ Recommending panic selling"));
    }
    if (words >= 15 && words <= 140) (s++, notes.push("✓ Good length"));
    else notes.push(words < 15 ? "✗ Too short" : "✗ Too long for an email");
    if (days === 0) (s++, notes.push("✓ Replied the same day"));
    else if (days > 3) (s--, notes.push(`✗ Took ${days} days to reply`));
    return { score: s, delta: Math.max(-4, Math.min(4, s - 1)), notes };
  }
  function reply(msgId, text) {
    const s = state();
    const b = s.books[s.mode];
    const m = b.inbox.find((x) => x.id === msgId);
    if (!m) return null;
    const lastThem = m.thread?.length ? m.thread[m.thread.length - 1] : { day: m.day };
    const res = scoreReply(m, text, b.day - (lastThem.day ?? m.day));
    m.thread ||= [{ who: "them", text: m.body, day: m.day }];
    m.thread.push({ who: "me", text, day: b.day, score: res });
    m.replied = true;
    m.needsReply = false;
    m.waiting = !!m.clientId;
    m.reply = { text, day: b.day, ...res };
    b.week ||= { held: 0, missed: 0, replies: 0, calls: 0 };
    b.week.replies++;
    if (res.fell && m.clientId)
      Clients.update(m.clientId, (c) => {
        c.truth.cash = Math.max(0, c.truth.cash - 4000);
        c.events.push({ id: "scamhit", month: c.month, text: `${c.first} lost about $4,000 to a scam after your reply.`, say: "" });
        delete c.collected.cash;
      });
    if (m.clientId)
      Clients.update(m.clientId, (c) => {
        c.relationship = Math.max(0, Math.min(100, c.relationship + res.delta));
        c.relHistory.push({ month: c.month, delta: res.delta, reason: `Replied to “${m.subject || "email"}”` });
      });
    if (b.mode === "career") b.xp = (b.xp || 0) + Math.max(0, res.score) * 2;
    save(s);
    if (m.clientId) clientResponds(b.mode, m.id, res);
    return res;
  }
  // The client writes back — in character (Claude), or with a built-in reply that reacts to how good your answer was.
  async function clientResponds(mode, msgId, res) {
    const s0 = state();
    const m0 = s0.books[mode].inbox.find((x) => x.id === msgId);
    const c = Clients.find(m0?.clientId);
    if (!m0 || !c) return;
    let text = "";
    let asks = false;
    if (AI.enabled()) {
      try {
        const thread = m0.thread.map((t) => `${t.who === "me" ? "Mason (your planner)" : c.first}: ${t.text}`).join("\n");
        const out = await AI.ask(
          `You are a PRACTICE financial-planning client writing an email reply. Stay fully in character.
${Clients.notesFor(c)}
The email thread so far:
${thread}
Write ${c.first}'s next reply email: 1-4 short sentences, natural and specific to what Mason said. If his answer helped, say so; if it dodged your question, was vague, or promised returns, push back or ask again. If he suggested a call or meeting, respond to that. Sometimes ask one natural follow-up question. No sign-off, no subject line.
Return ONLY JSON: {"reply": "...", "asksQuestion": true/false}`,
          { effort: "low", maxTokens: 700, timeout: 30000 }
        );
        const j = AI.parseJSON(out, null);
        if (j?.reply) {
          text = j.reply.trim();
          asks = !!j.asksQuestion;
        }
      } catch {}
    }
    if (!text) {
      const good = res.score >= 3;
      const ok = res.score >= 1;
      const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
      text = good
        ? pickOne(["Thank you — that really helps. I feel a lot better.", "Okay, that makes sense. Thanks for getting back to me so fast.", "Perfect. Let's talk then — thank you!"])
        : ok
          ? pickOne(["Okay… I think I get it. So what should I actually do this week?", "Thanks. Can you explain that a little more simply?", "Got it. Is there anything I should change right now?"])
          : pickOne(["Hmm, that doesn't really answer my question.", "I'm still pretty worried. Can we talk on the phone?", "I was hoping for a clearer answer, honestly."]);
      asks = /\?$/.test(text);
    }
    const s = state();
    const b = s.books[mode];
    const m = b.inbox.find((x) => x.id === msgId);
    if (!m) return;
    m.thread.push({ who: "them", text, day: b.day });
    m.waiting = false;
    m.read = false;
    m.needsReply = asks;
    if (asks) m.replied = false;
    save(s);
    FPDock.render();
  }

  function qGoals(b, clients = clientsIn(b.mode)) {
    const q = b.q || { aum0: b.aum, clients0: clients.length, missed: 0 };
    const avg = clients.length ? clients.reduce((n, c) => n + c.relationship, 0) / clients.length : 0;
    const target = Math.max(q.aum0 * 1.1, q.aum0 + 50000);
    return [
      { label: `Grow assets to ${Clients.usd(target)}`, done: b.aum >= target, pct: Math.min(100, (b.aum / target) * 100) },
      { label: "Sign 1 new client", done: clients.length > q.clients0, pct: clients.length > q.clients0 ? 100 : 0 },
      { label: "Miss no meetings", done: !q.missed, pct: q.missed ? 0 : 100 },
      { label: "Average relationship 60+", done: avg >= 60, pct: Math.min(100, (avg / 60) * 100) },
    ];
  }
  return { HIRES, hire, capOf, qGoals, ROLES, TEAM, state, save, book, setBook, bookOf, dateFor, fmtDate, clientsIn, tick, push, acceptLead, afterMeeting, reply, scoreReply, HEADLINES, newsFor, headlinesFor, LOAD, CAP, loadOf, hashS, bookedLoad, roomOn, canMeet, freeDay, schedule, reschedule, offDay, WEEKDAY, isWeekday, meetingsToday };
})();

// =============== screens ===============
function renderFPMode() {
  const s = FP.state();
  app.innerHTML = `
    <div class="fp-mode">
      <div class="eyebrow">Financial planning</div><h1>How do you want to play?</h1>
      <div class="grid cards2 mode-cards">
        <button class="card mode-card" data-fpmode="career"><div class="track-icon big">${icon("trend")}</div><h2>Career mode</h2><p class="muted">Start as a Junior Associate with two clients. Win leads, keep clients happy, grow your assets under management, pass licensing exams and climb to Partner.</p>${s.books.career ? `<span class="pill">${FP.ROLES[s.books.career.role || 0].name} · ${Clients.usd(s.books.career.aum || 0)} AUM</span>` : `<span class="pill">New career</span>`}</button>
        <button class="card mode-card" data-fpmode="practice"><div class="track-icon big">${icon("target")}</div><h2>Practice mode</h2><p class="muted">Create any client you want, any difficulty, and practice meetings and plans at your own pace — no pressure.</p><span class="pill">${FP.clientsIn("practice").length} client${FP.clientsIn("practice").length === 1 ? "" : "s"}</span></button>
      </div>
      <p class="small muted">Both modes have the same meetings, tools, calendar and phone. Career mode adds roles, assets under management, leads, audits and promotions.</p></div>`;
  app.querySelectorAll("[data-fpmode]").forEach((b) =>
    b.addEventListener("click", () => {
      const st = FP.state();
      st.mode = b.dataset.fpmode;
      FP.save(st);
      FP.book(st.mode);
      go("fp");
    })
  );
  if (window.gsap && !Motion.reduced) {
    gsap.from(app.querySelectorAll(".mode-card"), { y: 30, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" });
    Motion.ensureVisible([...app.querySelectorAll(".mode-card")], 1600);
  }
}

// ---------- the dock: calendar + phone (on every financial-planning screen) ----------
const FPDock = {
  app: "messages",
  open: null,
  attach() {
    const s = FP.state();
    if (!s.mode) return;
    if (document.querySelector(".fp-layout")) return this.render();
    const main = document.createElement("div");
    main.className = "fp-main";
    while (app.firstChild) main.appendChild(app.firstChild);
    const layout = document.createElement("div");
    layout.className = "fp-layout";
    layout.appendChild(main);
    const dock = document.createElement("aside");
    dock.className = "fp-dock";
    dock.id = "fp-dock";
    layout.appendChild(dock);
    app.appendChild(layout);
    const fab = document.createElement("button");
    fab.className = "fp-fab";
    fab.id = "fp-fab";
    fab.setAttribute("aria-label", "Open phone");
    app.appendChild(fab);
    fab.onclick = () => {
      document.body.classList.toggle("phone-open");
      this.render();
    };
    this.render();
  },
  render() {
    const s = FP.state();
    const b = FP.book(s.mode);
    const dock = document.getElementById("fp-dock");
    if (!dock) return;
    const unread = (a) => b.inbox.filter((m) => m.app === a && !m.read).length;
    const d = FP.dateFor(b);
    const upcoming = FP.clientsIn(s.mode)
      .filter((c) => c.next && c.next.day >= b.day && c.next.day <= b.day + 21)
      .sort((a, z) => a.next.day - z.next.day)
      .slice(0, 4);
    dock.innerHTML = `
      <div class="cal card">
        <div class="cal-top"><div><div class="cal-wd">${d.toLocaleDateString(undefined, { weekday: "long" })}</div><div class="cal-date">${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</div><div class="small muted">${d.getFullYear()} · day ${b.day + 1}</div></div><div class="cal-badge">${d.getDate()}</div></div>
        <div class="cal-skip"><button data-skip="1">+1 day</button><button data-skip="7">+1 week</button><button data-skip="30">+1 month</button></div>
        ${upcoming.length ? `<div class="cal-agenda">${upcoming.map((c) => `<a href="#client/${c.id}"><span>${c.next.day === b.day ? "Today" : FP.fmtDate(b, c.next.day, { month: "short", day: "numeric" })}</span>${esc(c.first)} · ${Clients.MEETING_NAME[c.next.type].replace(" meeting", "")}</a>`).join("")}</div>` : ""}
      </div>
      <div class="phone"><div class="ph-notch"></div>
        <div class="ph-status"><span>${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span><span>${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
        <div class="ph-screen" id="ph-screen"></div>
        <div class="ph-dock">${[
          ["messages", "message", "Messages"],
          ["mail", "mail", "Mail"],
          ["markets", "trend", "Markets"],
        ]
          .map(([a, ic, l]) => `<button data-app="${a}" class="${this.app === a ? "on" : ""}"><span class="ph-ic ${a}">${icon(ic)}${a !== "markets" && unread(a) ? `<b>${unread(a)}</b>` : ""}</span><span>${l}</span></button>`)
          .join("")}</div></div>`;
    const fab = document.getElementById("fp-fab");
    if (fab) fab.innerHTML = document.body.classList.contains("phone-open") ? icon("x") : `${icon("message")}${unread("mail") + unread("messages") ? `<b>${unread("mail") + unread("messages")}</b>` : ""}`;
    dock.querySelectorAll("[data-skip]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const n = +btn.dataset.skip;
        btn.disabled = true;
        const res = FP.tick(n);
        toast(`${n === 1 ? "Next day" : n === 7 ? "One week later" : "One month later"} — ${res.unread ? res.unread + " new message" + (res.unread === 1 ? "" : "s") : "quiet"}.`);
        route.keepScroll = true;
        route();
        if (window.gsap && !Motion.reduced) gsap.fromTo(".cal-date, .cal-badge", { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" });
      })
    );
    dock.querySelectorAll("[data-app]").forEach((btn) => btn.addEventListener("click", () => ((this.app = btn.dataset.app), (this.open = null), this.render())));
    this.screen(b);
  },
  screen(b) {
    const el = document.getElementById("ph-screen");
    if (!el) return;
    if (this.app === "markets") return this.markets(b, el);
    const items = b.inbox.filter((m) => m.app === this.app);
    const m = this.open && items.find((x) => x.id === this.open);
    if (m) {
      if (!m.read) {
        m.read = true;
        FP.setBook(b);
      }
      el.innerHTML = `<button class="ph-back" id="ph-back">‹ ${this.app === "mail" ? "Mail" : "Messages"}</button>
        <div class="ph-thread"><div class="ph-from">${esc(m.from)}</div>${m.subject ? `<div class="ph-subj">${esc(m.subject)}</div>` : ""}
        ${(m.thread || [{ who: "them", text: m.body, day: m.day }])
          .map((t) => `<div class="ph-bubble ${t.who === "me" ? "me" : "them"}">${esc(t.text)}</div>${t.score ? `<div class="ph-score">${t.score.notes.map((n) => `<div class="small ${n[0] === "✓" ? "good-text" : "warn-text"}">${esc(n)}</div>`).join("")}<div class="small"><strong>Relationship ${t.score.delta >= 0 ? "+" : ""}${t.score.delta}</strong></div></div>` : ""}`)
          .join("")}
        ${m.waiting ? `<div class="ph-bubble them typing"><i></i><i></i><i></i></div>` : ""}
        <div class="small muted">${FP.fmtDate(b, m.day)}</div>
        ${m.lead && !m.accepted ? `<button class="btn primary block" id="ph-accept">Accept lead</button>` : ""}
        ${m.clientId ? `<a class="btn small block" href="#client/${m.clientId}">Open client file</a>` : ""}
        ${m.audit?.length ? m.audit.map((id) => `<a class="btn small block" href="#client/${id}/plan">Fix plan</a>`).join("") : ""}
        ${m.needsReply && !m.replied && !m.waiting ? `<textarea id="ph-reply" rows="4" placeholder="Write your reply…"></textarea><button class="btn primary block" id="ph-send">Send</button>${AI.enabled() ? `<button class="btn small block" id="ph-coach">${icon("sparkles")} Ask Claude how to reply</button>` : ""}` : ""}</div>`;
      document.getElementById("ph-back").onclick = () => ((this.open = null), this.render());
      document.getElementById("ph-accept")?.addEventListener("click", () => {
        const c = FP.acceptLead(m.id);
        if (c) toast(`${c.first} ${c.last} is now your client.`);
        route.keepScroll = true;
        route();
      });
      document.getElementById("ph-send")?.addEventListener("click", () => {
        const text = document.getElementById("ph-reply").value.trim();
        if (text.length < 5) return toast("Write a reply first.");
        FP.reply(m.id, text);
        this.render();
        if (window.gsap && !Motion.reduced) gsap.from(".ph-bubble.me", { y: 20, autoAlpha: 0, duration: 0.4, ease: "back.out(2)" });
      });
      document.getElementById("ph-coach")?.addEventListener("click", (e) =>
        busy(e.currentTarget, async () => {
          const t = await AI.ask(`A practice financial-planning client emailed Mason (a 15-year-old learning to be a planner): "${m.body}". Give him 2-3 short bullet tips on how a good planner would reply (empathy, tie back to their plan, no guarantees or hot tips, a clear next step). Don't write the reply for him. Plain text, under 90 words.`, { maxTokens: 600 });
          document.getElementById("ph-coach").insertAdjacentHTML("afterend", `<div class="ph-bubble tip">${esc(t)}</div>`);
        })
      );
      return;
    }
    el.innerHTML = items.length
      ? `<div class="ph-list">${items
          .slice(0, 40)
          .map((x) => `<button class="ph-item ${x.read ? "" : "unread"}" data-msg="${x.id}"><span class="ph-av">${esc((x.from || "?")[0])}</span><span class="grow"><span class="spread"><strong>${esc(x.from.split(" (")[0])}</strong><span class="small muted">${FP.fmtDate(b, x.day, { month: "short", day: "numeric" })}</span></span><span class="small">${esc(x.subject || "")}</span><span class="small muted ph-prev">${esc(x.body)}</span></span>${x.needsReply && !x.replied ? `<i class="ph-dot"></i>` : ""}</button>`)
          .join("")}</div>`
      : `<p class="small muted ph-empty">${this.app === "mail" ? "No client emails yet. Skip ahead in time — clients write when life happens." : "No messages from your team yet."}</p>`;
    el.querySelectorAll("[data-msg]").forEach((x) => x.addEventListener("click", () => ((this.open = x.dataset.msg), this.render())));
  },
  markets(b, el) {
    const m = b.market;
    const h = m.hist;
    if (!h.length) return (el.innerHTML = `<p class="small muted ph-empty">Markets open tomorrow — skip a day.</p>`);
    const RANGES = [["1W", 5], ["1M", 21], ["3M", 63], ["1Y", 252]];
    const range = RANGES.find((x) => x[0] === this.mkRange) || RANGES[1];
    const sel = h.find((x) => x.day === this.mkDay) || h[h.length - 1];
    const today = h[h.length - 1];
    const chg = sel.chg || 0;
    const n = FP.newsFor(b, sel.day, chg);
    // Line: the index over the chosen range (each point is one trading day's close).
    const pts = h.slice(-range[1] - 1);
    const lo = Math.min(...pts.map((x) => x.v));
    const hi = Math.max(...pts.map((x) => x.v));
    const W = 240, H = 70;
    const X = (i) => (i / Math.max(1, pts.length - 1)) * W;
    const Y = (v) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 10);
    const line = pts.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(x.v).toFixed(1)}`).join(" ");
    const up = pts[pts.length - 1].v >= pts[0].v;
    const rangeChg = pts[pts.length - 1].v / pts[0].v - 1;
    const si = pts.indexOf(sel);
    // Bars: each day's return over the last 20 days — tap one to read why it moved.
    const bars = h.slice(-20);
    const bmax = Math.max(0.01, ...bars.map((x) => Math.abs(x.chg || 0)));
    const bw = W / bars.length;
    const pctS = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(2)}%`;
    const clients = FP.clientsIn(b.mode);
    const dayOf = (d) => FP.fmtDate(b, d, { weekday: "short", month: "short", day: "numeric" });
    el.innerHTML = `<div class="mk">
      <div class="mk-top"><div><div class="small muted">Market index · ${sel === today ? "today" : dayOf(sel.day)}</div><div class="mk-v">${sel.v.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span class="${chg >= 0 ? "good-text" : "bad-text"}">${pctS(chg)}</span></div></div>
        <div class="mk-ranges">${RANGES.map(([l]) => `<button data-rg="${l}" class="${l === range[0] ? "on" : ""}">${l}</button>`).join("")}</div></div>
      <svg viewBox="0 0 ${W} ${H}" class="mk-line ${up ? "up" : "down"}" preserveAspectRatio="none"><path class="area" d="${line} L${W} ${H} L0 ${H} Z"/><path class="ln" d="${line}"/>${si >= 0 ? `<circle cx="${X(si).toFixed(1)}" cy="${Y(sel.v).toFixed(1)}" r="3.2"/>` : ""}</svg>
      <div class="small muted mk-cap">${range[0]}: <span class="${rangeChg >= 0 ? "good-text" : "bad-text"}">${pctS(rangeChg)}</span></div>
      <div class="small muted mt-s">Daily moves (tap a day)</div>
      <svg viewBox="0 0 ${W} 54" class="mk-bars" preserveAspectRatio="none">${bars.map((x, i) => { const v = x.chg || 0; const hgt = Math.max(1.5, (Math.abs(v) / bmax) * 24); return `<rect data-day="${x.day}" x="${(i * bw + 1.5).toFixed(1)}" y="${v >= 0 ? 27 - hgt : 27}" width="${(bw - 3).toFixed(1)}" height="${hgt.toFixed(1)}" class="${v >= 0 ? "up" : "down"} ${x.day === sel.day ? "sel" : ""}"/>`; }).join("")}<line x1="0" x2="${W}" y1="27" y2="27"/></svg>
      <div class="mk-news"><div class="mk-head">${esc(n.head)}</div><p class="small">${esc(n.why)}</p>
        <div class="small"><span class="good-text">▲ ${esc(n.leaders)}</span> · <span class="bad-text">▼ ${esc(n.laggards)}</span> · Bonds <span class="${(sel.bchg || 0) >= 0 ? "good-text" : "bad-text"}">${pctS(sel.bchg || 0)}</span></div>
        <p class="small muted mk-explain">${esc(n.explain)}</p></div>
      <div class="small muted mt-s">Headlines ${sel === today ? "today" : dayOf(sel.day)}</div>
      <div class="mk-feed">${FP.headlinesFor(b, sel.day, chg).map((x) => `<div class="mk-art ${x.top ? "top" : ""}"><span class="mk-src">${esc(x.src)}</span>${esc(x.head)}</div>`).join("")}</div>
      <div class="small muted mt-s">Your clients ${sel === today ? "today" : "that day"}</div>
      ${clients.length ? clients.map((c) => {
        const a = c.plan?.alloc || { stocks: 70, bonds: 25, cash: 5 };
        const base = c.portfolio[c.portfolio.length - 1]?.value || 0;
        // Value moves with the market every day since the last monthly statement.
        const grow = (a.stocks / 100) * (m.idx / (m.monthIdx || m.idx) - 1) + (a.bonds / 100) * (m.bond / (m.monthBond || m.bond) - 1);
        const v = base * (1 + grow);
        const dayRet = (a.stocks / 100) * chg + (a.bonds / 100) * (sel.bchg || 0);
        const dv = v * dayRet;
        const flags = [c.next && c.next.day <= b.day ? "meeting due" : "", b.inbox.some((x) => x.clientId === c.id && x.needsReply && !x.replied) ? "needs reply" : "", c.relationship < 35 ? "unhappy" : ""].filter(Boolean);
        return `<a class="mk-row" href="#client/${c.id}"><span class="grow">${esc(c.first)} ${esc(c.last)}<span class="small muted"> · ${Clients.usd(v)}</span>${flags.length ? `<span class="small warn-text"> · ${flags.join(", ")}</span>` : ""}</span><span class="${dv >= 0 ? "good-text" : "bad-text"}">${dv >= 0 ? "+" : "-"}${Clients.usd(Math.abs(dv))}<span class="small"> ${pctS(dayRet)}</span></span></a>`;
      }).join("") : `<p class="small muted">No clients yet.</p>`}</div>`;
    el.querySelectorAll("[data-rg]").forEach((x) => x.addEventListener("click", () => ((this.mkRange = x.dataset.rg), this.render())));
    el.querySelectorAll("[data-day]").forEach((x) => x.addEventListener("click", () => ((this.mkDay = +x.dataset.day === today.day ? null : +x.dataset.day), this.render())));
  },
};

// ---------- licensing exam practice ----------
const EXAM_BANK = {
  sie: [
    ["What does a stock represent?", ["A loan to a company", "Ownership in a company", "A government guarantee", "A fixed interest payment"], 1, "Stock = equity ownership; bonds are loans."],
    ["Bond prices generally do what when interest rates rise?", ["Rise", "Fall", "Stay the same", "Double"], 1, "Existing bonds' fixed coupons become less attractive, so prices fall."],
    ["Which regulator oversees broker-dealers' day-to-day conduct?", ["FINRA", "FDIC", "IRS", "The Fed"], 0, "FINRA is the self-regulatory organization for broker-dealers."],
    ["What does 'diversification' reduce?", ["All risk", "Market (systematic) risk", "Company-specific (unsystematic) risk", "Inflation"], 2, "Diversification reduces unsystematic risk, not overall market risk."],
    ["A mutual fund's NAV is calculated…", ["Every second", "Once per trading day", "Once per year", "Only when sold"], 1, "Mutual funds price once a day at NAV; ETFs trade intraday."],
    ["Which is a money market instrument?", ["30-year Treasury bond", "Treasury bill", "Common stock", "Real estate"], 1, "T-bills mature in a year or less — money market."],
    ["What is the main risk of a high-yield ('junk') bond?", ["Inflation risk only", "Default/credit risk", "Currency risk", "No risk"], 1, "Lower credit quality means higher default risk."],
    ["Front-running means…", ["Buying before a client's large order to profit", "Running a business", "A type of IPO", "Shorting a stock"], 0, "Trading ahead of a customer's order is prohibited."],
    ["The SIPC protects customers when…", ["Investments lose value", "A broker-dealer fails", "Banks fail", "Markets crash"], 1, "SIPC covers missing assets if a broker-dealer fails, not market losses."],
    ["A call option gives the holder the right to…", ["Sell at the strike", "Buy at the strike", "Receive dividends", "Vote shares"], 1, "Calls = right to buy; puts = right to sell."],
    ["Which account lets a parent invest for a minor?", ["UTMA/UGMA custodial account", "401(k)", "SEP IRA", "Margin account"], 0, "Custodial accounts hold assets for a minor."],
    ["'Know your customer' rules require…", ["Guaranteeing returns", "Learning the customer's essential facts", "Charging a fee", "Selling only stocks"], 1, "KYC means understanding the client before recommending."],
  ],
  cfp: [
    ["A client with $8,000 of 24% credit card debt and no match available should usually first…", ["Invest in stocks", "Pay down the card", "Buy a CD", "Buy whole life"], 1, "24% is a guaranteed 'return' — beats expected market returns."],
    ["The DIME method estimates…", ["Retirement needs", "Life insurance needs", "Tax brackets", "Debt payoff"], 1, "Debt, Income, Mortgage, Education."],
    ["A Roth contribution is usually better when…", ["Your tax rate now is lower than later", "Your tax rate now is higher than later", "You need a deduction now", "Never"], 0, "Pay tax now when your bracket is low."],
    ["Full retirement age for Social Security for people born after 1960 is…", ["62", "65", "67", "70"], 2, "FRA is 67; claiming at 70 increases benefits ~24%."],
    ["The '4% rule' refers to…", ["Emergency fund size", "A sustainable first-year retirement withdrawal rate", "Max 401(k) contribution", "Mortgage rates"], 1, "A historically sustainable starting withdrawal rate."],
    ["An emergency fund is typically…", ["1 week of expenses", "3–6 months of expenses", "2 years of income", "Invested in stocks"], 1, "3–6 months, more for unstable income."],
    ["Fiduciary duty means a planner must…", ["Sell the highest-commission product", "Act in the client's best interest", "Guarantee returns", "Avoid all risk"], 1, "Client's interest first."],
    ["Suitability for a short-term goal (2 years) suggests…", ["Aggressive stocks", "Cash or short-term bonds", "Crypto", "Options"], 1, "Short horizon → protect principal."],
    ["The avalanche method pays off…", ["Smallest balance first", "Highest interest rate first", "Newest debt first", "All debts equally"], 1, "Avalanche minimizes interest."],
    ["A 529 plan is designed for…", ["Retirement", "Education", "Health care", "Home purchase"], 1, "Tax-advantaged education savings."],
    ["Rebalancing a portfolio means…", ["Selling everything", "Returning to target allocation", "Buying only winners", "Timing the market"], 1, "Bring weights back to target."],
    ["An HSA's 'triple tax advantage' is…", ["Deductible in, tax-free growth, tax-free for medical", "Only deductible", "Tax-free gifts", "No advantage"], 0, "Pre-tax in, tax-free growth and qualified withdrawals."],
  ],
};
function clientQuestions() {
  // Questions built from YOUR client files (true data).
  const out = [];
  for (const c of Clients.all().slice(0, 6)) {
    const t = c.truth;
    const hi = t.debts.find((d) => d.apr > 15);
    if (hi) out.push([`${c.first} has a ${hi.name.toLowerCase()} at ${hi.apr}% and $300/month extra. Best use?`, ["Invest it in stocks", `Pay down the ${hi.name.toLowerCase()}`, "Keep it in checking", "Buy crypto"], 1, `${hi.apr}% is a guaranteed return — pay it down (after any employer match).`]);
    if (t.match && t.contrib < t.match) out.push([`${c.first} contributes ${t.contrib}% but the employer matches up to ${t.match}%. What should change first?`, [`Raise to at least ${t.match}%`, "Stop contributing", "Move it all to bonds", "Nothing"], 0, "Capture the full match — it's free money."]);
    const g = t.goals.find((x) => x.years <= 3 && x.id !== "retire");
    if (g) out.push([`${c.first}'s goal “${g.name}” is ${g.years} year(s) away. Where should that money live?`, ["100% stocks", "Cash / short-term savings", "Crypto", "Options"], 1, "Short timelines can't ride out a market drop."]);
  }
  return out;
}
let EXQ = null;
function renderFPExam(kind, timed = false) {
  clearInterval(renderFPExam.timer);
  if (!EXQ || EXQ.kind !== kind || EXQ.timed !== timed || EXQ.done) {
    const all = [...EXAM_BANK[kind], ...(EXAM_MORE[kind] || []), ...clientQuestions()].sort(() => Math.random() - 0.5);
    EXQ = { kind, timed, qs: all.slice(0, timed ? 25 : 12), ans: {}, start: Date.now(), done: false };
  }
  const s = FP.state();
  const limit = EXQ.qs.length * 60;
  app.innerHTML = `
    <a class="back" href="#fp">‹ Financial planning</a>
    <article class="card lesson"><div class="eyebrow">${kind === "sie" ? "SIE-style" : "CFP-style"} ${timed ? "timed mock exam" : "practice exam"}</div><h1>${kind === "sie" ? "Securities Industry Essentials" : "Financial planning fundamentals"}</h1>
      <p class="muted">${EXQ.qs.length} questions · pass at 70%${timed ? ` · ${EXQ.qs.length} minutes · answers are revealed when you submit` : ""}${s.exams[kind]?.passed ? ` · you've passed (${s.exams[kind].pct}%)` : ""}. Some questions come from your own clients. ${kind === "sie" ? "Required for Associate Planner in career mode." : "Required for Financial Planner in career mode."}</p>
      ${timed ? `<div class="exam-timer" id="ex-timer"></div>` : ""}
      ${EXQ.qs.map((q, qi) => `<div class="quiz-q"><p><strong>${qi + 1}. ${esc(q[0])}</strong></p>${q[1].map((o, oi) => `<button class="quiz-opt ${EXQ.ans[qi] === oi ? "picked" : ""}" data-qi="${qi}" data-oi="${oi}">${esc(o)}</button>`).join("")}<div class="small quiz-why"></div></div>`).join("")}
      <div class="row mt wrap-gap">${timed ? `<button class="btn primary" id="ex-submit">Submit exam</button>` : ""}<button class="btn" id="ex-new">${icon("refresh")} New questions</button></div></article>`;
  const record = (score) => {
    const pct = Math.round((score / EXQ.qs.length) * 100);
    const st = FP.state();
    st.exams[kind] = { pct: Math.max(pct, st.exams[kind]?.pct || 0), passed: st.exams[kind]?.passed || pct >= 70, at: Date.now() };
    st.examHistory = [...(st.examHistory || []), { kind, timed, pct, secs: Math.round((Date.now() - EXQ.start) / 1000), at: Date.now() }].slice(-30);
    FP.save(st);
    toast(pct >= 70 ? `Passed — ${pct}%!` : `${pct}% — you need 70%. Try again.`);
  };
  if (!timed)
    wireQuiz(
      EXQ.qs.map((q) => ({ q: q[0], options: q[1], answer: q[2], why: q[3] })),
      record
    );
  else {
    app.querySelectorAll(".quiz-opt").forEach((b) =>
      b.addEventListener("click", () => {
        if (EXQ.done) return;
        const qi = +b.dataset.qi;
        EXQ.ans[qi] = +b.dataset.oi;
        b.closest(".quiz-q").querySelectorAll(".quiz-opt").forEach((x) => x.classList.toggle("picked", x === b));
      })
    );
    const finish = () => {
      if (EXQ.done) return;
      clearInterval(renderFPExam.timer);
      EXQ.done = true;
      let score = 0;
      app.querySelectorAll(".quiz-q").forEach((box, qi) => {
        const q = EXQ.qs[qi];
        const pick = EXQ.ans[qi];
        if (pick === q[2]) score++;
        box.querySelectorAll(".quiz-opt").forEach((x) => {
          x.disabled = true;
          if (+x.dataset.oi === q[2]) x.classList.add("right");
          else if (+x.dataset.oi === pick) x.classList.add("wrong");
        });
        box.querySelector(".quiz-why").textContent = (pick === q[2] ? "Correct. " : pick == null ? "Not answered. " : "Not quite. ") + q[3];
      });
      record(score);
      document.getElementById("ex-timer").textContent = `Score: ${Math.round((score / EXQ.qs.length) * 100)}% (${score}/${EXQ.qs.length})`;
      document.getElementById("ex-submit").disabled = true;
    };
    document.getElementById("ex-submit").onclick = () => {
      const left = EXQ.qs.length - Object.keys(EXQ.ans).length;
      if (left && !confirm(`${left} question${left === 1 ? "" : "s"} unanswered. Submit anyway?`)) return;
      finish();
    };
    const tickT = () => {
      const el = document.getElementById("ex-timer");
      if (!el) return clearInterval(renderFPExam.timer);
      const rem = Math.max(0, limit - Math.round((Date.now() - EXQ.start) / 1000));
      el.textContent = `⏱ ${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, "0")} left · ${Object.keys(EXQ.ans).length}/${EXQ.qs.length} answered`;
      el.classList.toggle("low", rem < 120);
      if (!rem) finish();
    };
    tickT();
    renderFPExam.timer = setInterval(tickT, 1000);
  }
  document.getElementById("ex-new").onclick = () => ((EXQ = null), renderFPExam(kind, timed));
  FPDock.attach();
}
const EXAM_MORE = {
  sie: [
    ["Which type of risk can't be removed by diversifying?", ["Business risk", "Systematic (market) risk", "Company-specific risk", "Management risk"], 1, "Market-wide risk affects everything — diversification can't remove it."],
    ["Treasury bonds are backed by…", ["The FDIC", "The full faith and credit of the U.S. government", "SIPC", "The issuing bank"], 1, "U.S. Treasuries are backed by the federal government."],
    ["A stock's dividend yield is…", ["Price ÷ dividend", "Annual dividend ÷ price", "Earnings ÷ price", "Dividend × shares"], 1, "Yield = annual dividend divided by the current price."],
    ["Who is an 'insider' under securities law?", ["Any shareholder", "Officers, directors and 10%+ owners", "Only the CEO", "Any employee"], 1, "Officers, directors and 10%+ holders are insiders."],
    ["Churning is…", ["Rebalancing once a year", "Excessive trading to generate commissions", "Buying index funds", "Selling at a loss for taxes"], 1, "Excessive trading for commissions is prohibited."],
    ["An ETF differs from a mutual fund because it…", ["Can't hold stocks", "Trades on an exchange throughout the day", "Is always actively managed", "Has no fees"], 1, "ETFs trade intraday like stocks."],
    ["Which order executes immediately at the best available price?", ["Limit order", "Stop order", "Market order", "GTC order"], 2, "Market orders fill right away at the current price."],
    ["Regulation Best Interest applies to…", ["Broker-dealers recommending to retail customers", "Banks only", "Insurance agents only", "Hedge funds"], 0, "Reg BI requires broker-dealers to act in retail customers' best interest."],
  ],
  cfp: [
    ["The employer match should usually come…", ["After paying off all debt", "Before almost everything else", "Only after age 40", "Never — it's taxable"], 1, "Capturing the full match is an instant 50–100% return."],
    ["Which is the best home for a 1-year house down payment?", ["Growth stocks", "High-yield savings or T-bills", "Crypto", "Long-term bonds"], 1, "Short horizon → keep it safe and liquid."],
    ["Beneficiary designations on a 401(k)…", ["Are overridden by a will", "Override what a will says", "Don't matter", "Only apply to spouses"], 1, "Beneficiary forms control the account regardless of the will."],
    ["A will can name a guardian for…", ["Pets only", "Minor children", "Adult children", "Your planner"], 1, "Naming a guardian for minors is a key reason to have a will."],
    ["Disability insurance replaces…", ["Medical bills", "A portion of income if you can't work", "Your car", "Retirement savings"], 1, "It protects your paycheck — your biggest asset."],
    ["Claiming Social Security at 70 instead of 67 increases benefits by about…", ["8%", "24%", "50%", "100%"], 1, "8% per year of delay from 67 to 70 ≈ 24%."],
    ["Sequence-of-returns risk matters most…", ["In your 20s", "Right around retirement", "Never", "Only for bonds"], 1, "A crash right when withdrawals start does the most damage."],
    ["A good first step when a client's spending exceeds income is…", ["Invest more aggressively", "Build a realistic budget and find cuts", "Take a loan", "Ignore it"], 1, "Cash flow comes first — every other goal depends on it."],
  ],
};