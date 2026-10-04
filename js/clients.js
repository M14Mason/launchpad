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
  const usd = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString();
  const pctS = (n) => Math.round(n * 10) / 10 + "%";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const FIRST = {
    female: ["Dana", "Priya", "Maria", "Rachel", "Emily", "Tasha", "Lena", "Hannah", "Jasmine", "Claire", "Aisha", "Mei", "Sofia", "Grace", "Keisha", "Yuki", "Brianna", "Olivia", "Fatima", "Rosa"],
    male: ["James", "David", "Marcus", "Alex", "Ben", "Carlos", "Kevin", "Nate", "Omar", "Ryan", "Andre", "Hiro", "Luis", "Tyler", "Darnell", "Raj", "Ethan", "Mateo", "Samuel", "Victor"],
  };
  const LAST = ["Reyes", "Bennett", "Cho", "Patel", "Morgan", "Hayes", "Silva", "Brooks", "Nguyen", "Foster", "Kim", "Ortiz", "Washington", "Tanaka", "Okafor", "Russo", "Delgado", "Murphy", "Khan", "Larsen", "Mendoza", "Sullivan", "Park", "Greene", "Alvarez", "Cohen", "Ibrahim", "Fischer", "Ramirez", "Bailey"];
  const KIDS = ["Mia", "Leo", "Ava", "Eli", "Zoe", "Sam", "Lily", "Noah", "Isla", "Mason", "Aria", "Jayden", "Chloe", "Diego", "Nora", "Kai"];
  const PETS = [["dog", "Biscuit"], ["dog", "Luna"], ["cat", "Pepper"], ["dog", "Max"], ["cat", "Mochi"], ["dog", "Bear"], ["cat", "Ziggy"], ["parrot", "Kiwi"]];
  const HOBBIES = ["surfing", "running half-marathons", "baking", "coaching youth soccer", "hiking Torrey Pines", "playing guitar", "photography", "woodworking", "rock climbing", "volunteering at the animal shelter", "restoring old cars", "playing pickleball", "gardening", "salsa dancing"];
  // [title, low, high, pay type, income stability 1-5, employer]
  const JOBS = [
    ["Nurse", 68000, 98000, "salary", 5, "Palomar Health"],
    ["Software engineer", 115000, 175000, "salary", 4, "a fintech startup in Sorrento Valley"],
    ["Teacher", 52000, 74000, "salary", 5, "the local school district"],
    ["Electrician", 62000, 92000, "hourly", 4, "a union electrical contractor"],
    ["Marketing manager", 78000, 115000, "salary", 4, "a regional credit union"],
    ["Dental hygienist", 70000, 92000, "hourly", 4, "a dental group in Carlsbad"],
    ["Bakery owner", 45000, 110000, "self-employed", 2, "their own bakery"],
    ["Police officer", 75000, 105000, "salary", 5, "the county sheriff's department"],
    ["Graphic designer", 48000, 76000, "freelance", 2, "freelance clients"],
    ["Pharmacist", 120000, 150000, "salary", 5, "a retail pharmacy chain"],
    ["Real estate agent", 40000, 140000, "commission", 1, "a local brokerage"],
    ["Restaurant manager", 52000, 70000, "salary", 3, "a restaurant group"],
    ["Truck driver", 58000, 85000, "hourly", 3, "a regional freight company"],
    ["Accountant", 70000, 105000, "salary", 5, "a mid-size CPA firm"],
    ["Hair stylist (salon owner)", 38000, 80000, "self-employed", 2, "their own salon"],
    ["Firefighter", 80000, 115000, "salary", 5, "the city fire department"],
    ["Sales rep (medical devices)", 70000, 160000, "commission", 2, "a medical device company"],
    ["Physical therapist", 85000, 110000, "salary", 4, "a sports clinic"],
    ["Navy officer", 70000, 110000, "salary", 5, "the U.S. Navy"],
    ["Rideshare driver + student", 28000, 42000, "gig", 1, "rideshare apps"],
    ["Plumber (own business)", 60000, 130000, "self-employed", 3, "their own plumbing company"],
    ["Retail store manager", 48000, 65000, "salary", 3, "a big-box retailer"],
    ["Data analyst", 72000, 98000, "salary", 4, "a biotech company"],
    ["Chef", 45000, 68000, "hourly", 2, "a hotel restaurant"],
    ["Dentist", 150000, 230000, "self-employed", 4, "their own dental practice"],
    ["Social worker", 50000, 68000, "salary", 4, "the county"],
  ];
  const STYLES = {
    brief: "Brief and to the point — short answers, rarely volunteers extra.",
    chatty: "Chatty — goes on tangents about family and hobbies; needs gentle steering.",
    anxious: "Anxious — worries out loud and needs reassurance.",
    skeptical: "Skeptical — has been burned by a salesperson before; questions your advice.",
    detailed: "Detail-oriented — wants the numbers and the reasoning.",
    upbeat: "Upbeat and trusting — easy to talk to, maybe too optimistic.",
    guarded: "Guarded — slow to share private numbers until they trust you.",
  };
  const RISK_SAY = [
    "Honestly, the idea of losing money makes me sick. I'd rather earn less and sleep at night.",
    "I don't like big swings. A small drop I could handle, but not much more.",
    "I'm okay with some ups and downs if it grows over time.",
    "I can handle the market dropping — I know it comes back over the long run.",
    "I'm pretty aggressive. If stocks fell 30% I'd probably buy more.",
  ];
  // Specific life goals. `say` is how the client describes it; {amt} and {yrs} are filled in.
  const GOAL_POOL = [
    { id: "house", name: "Down payment on a first home", t: [40000, 120000], y: [2, 7], when: (c) => !c.owns, say: "We really want to buy our first place — I think we'd need about {amt} for the down payment, hopefully in {yrs} years." },
    { id: "wedding", name: "Pay for their wedding", t: [20000, 45000], y: [1, 3], when: (c) => !c.married && c.age < 42, say: "We're getting engaged soon, I think — the wedding will probably be around {amt}, in about {yrs} years." },
    { id: "kidwedding", name: "Help pay for a child's wedding", t: [15000, 40000], y: [1, 4], when: (c) => c.kids > 0 && c.age > 48, say: "Our oldest is getting married — we promised to chip in about {amt}, probably in {yrs} years." },
    { id: "sabbatical", name: "A year-long sabbatical to travel", t: [30000, 65000], y: [3, 6], when: (c) => c.age < 50, say: "I've always wanted to take a full year off to travel — maybe {amt} — in {yrs} years or so." },
    { id: "japan", name: "Family trip to Japan", t: [12000, 22000], y: [1, 3], when: (c) => c.kids > 0, say: "The kids are obsessed with Japan. A family trip there would be around {amt}, in {yrs} years." },
    { id: "parents", name: "Help support aging parents", t: [15000, 40000], y: [2, 6], when: (c) => c.age > 38, say: "My mom's health isn't great. I want to have about {amt} set aside to help her, within {yrs} years." },
    { id: "payoffhome", name: "Pay off the mortgage before retiring", t: [80000, 220000], y: [8, 15], when: (c) => c.owns, say: "I'd love to have the house paid off — there's about {amt} left — in {yrs} years." },
    { id: "rental", name: "Buy a rental property", t: [60000, 130000], y: [4, 8], when: (c) => c.income > 80000, say: "I want to buy a rental property as an investment — I'd need about {amt} — in {yrs} years." },
    { id: "private", name: "Private school tuition", t: [25000, 60000], y: [1, 4], when: (c) => c.kids > 0, say: "We're thinking about private school for the kids — roughly {amt} over the next {yrs} years." },
    { id: "car", name: "Replace the car with cash", t: [15000, 35000], y: [1, 3], when: () => true, say: "My car's on its last legs. I want to buy the next one with cash, maybe {amt}, in {yrs} years." },
    { id: "kitchen", name: "Kitchen remodel", t: [25000, 70000], y: [1, 4], when: (c) => c.owns, say: "We want to redo the kitchen — contractors quoted about {amt}. Maybe in {yrs} years." },
    { id: "cabin", name: "Vacation cabin in the mountains", t: [60000, 150000], y: [5, 10], when: (c) => c.income > 95000, say: "Our dream is a little cabin up in Big Bear — we'd need about {amt} in {yrs} years." },
    { id: "business", name: "Start their own business", t: [15000, 60000], y: [2, 5], when: () => true, say: "I've been dreaming about starting my own business. I'd need around {amt} to get going, in {yrs} years." },
    { id: "adopt", name: "Adopt a child", t: [30000, 50000], y: [2, 4], when: (c) => c.married && c.age < 45, say: "We've started looking into adoption. It costs about {amt}, and we'd like to start within {yrs} years." },
    { id: "boat", name: "Buy a boat", t: [20000, 60000], y: [3, 6], when: (c) => c.income > 100000, say: "Okay, this is a little silly, but I want a boat. About {amt}, in {yrs} years." },
    { id: "rv", name: "Buy an RV to travel the country", t: [40000, 90000], y: [3, 8], when: (c) => c.age > 45, say: "I want to buy an RV and see every national park — about {amt}, in {yrs} years." },
    { id: "kidhome", name: "Help a child buy their first home", t: [20000, 60000], y: [3, 8], when: (c) => c.kids > 0 && c.age > 45, say: "I'd love to help my kid with a down payment someday — maybe {amt} in {yrs} years." },
    { id: "masters", name: "Go back to school for a master's", t: [25000, 60000], y: [1, 3], when: (c) => c.age < 45, say: "I'm thinking about going back for my master's. It'd cost about {amt}, starting in {yrs} years." },
    { id: "ivf", name: "Fertility treatment", t: [20000, 40000], y: [1, 2], when: (c) => (c.married || c.partner) && c.age > 30 && c.age < 43, say: "This is personal, but we're planning to do IVF — about {amt}, probably within {yrs} years." },
  ];
  // Retirement is a dream, not a number: each adds yearly spending on top of basic living costs.
  const RETIRE_DREAMS = [
    { name: "Retire at {age} and spend summers traveling Europe", extra: 15000, say: "When I retire, I want to spend summers in Europe — Italy, Portugal, all of it." },
    { name: "Retire at {age} to a beach house in Baja", extra: 8000, say: "Retirement for me is a little place on the beach in Baja." },
    { name: "Semi-retire at {age} and open a coffee shop", extra: 5000, say: "I don't want to fully stop — I want to semi-retire and run a little coffee shop." },
    { name: "Retire at {age} near the grandkids", extra: 6000, say: "I just want to retire close to the grandkids and be able to spoil them." },
    { name: "Retire at {age} and golf every day", extra: 7000, say: "Honestly? Retire and golf every single day." },
    { name: "Retire at {age} and travel the world by cruise", extra: 18000, say: "My dream is to retire and do a couple of big cruises a year." },
    { name: "Retire at {age} and volunteer full-time", extra: 2000, say: "I want to retire and volunteer — give back full-time." },
    { name: "Retire early at {age} and never worry about money", extra: 4000, say: "I want to retire early and just never think about money again." },
  ];


  // ---------- generate a client ----------
  // opts: { book: "practice"|"career", day: calendar day created, wealth: 0-4, couple: bool }
  function generate(difficulty = "realistic", seed = Math.floor(Math.random() * 1e9), opts = {}) {
    const r = rng(seed);
    const gender = r() < 0.5 ? "female" : "male";
    const first = pickR(r, FIRST[gender]);
    const last = pickR(r, LAST);
    const age = Math.round(23 + Math.pow(r(), 1.15) * 41); // 23-64, a few near retirement
    const [job, lo, hi, payType, stability, employer] = pickR(r, JOBS);
    const income = between(r, lo, hi, 1000);
    // Household
    const hh = r();
    const household = age < 27 ? (hh < 0.75 ? "single" : "partner") : hh < 0.45 ? "married" : hh < 0.6 ? "single" : hh < 0.72 ? "divorced" : hh < 0.84 ? "single parent" : hh < 0.92 ? "partner" : age > 55 ? "widowed" : "married";
    const married = household === "married";
    const partner = ["married", "partner"].includes(household) ? pickR(r, gender === "female" ? FIRST.male : FIRST.female) : "";
    const canKids = ["married", "divorced", "single parent", "widowed"].includes(household) || (household === "partner" && r() < 0.3);
    const nKids = household === "single parent" ? between(r, 1, 3) : canKids && age > 27 ? (age > 58 ? between(r, 0, 1) : between(r, 0, 3)) : 0;
    const kids = Array.from({ length: nKids }, (_, i) => ({ name: KIDS[(seed + i * 5) % KIDS.length], age: Math.max(1, Math.min(age - 21, between(r, 1, age > 50 ? 24 : 17))) }));
    const caregiver = age > 40 && r() < 0.18;
    const gm = income / 12;
    const takeHome = Math.round((income * (income > 150000 ? 0.66 : income > 100000 ? 0.71 : 0.77)) / 12 / 10) * 10;
    const homeRoll = r();
    const owns = age > 30 && homeRoll < (age > 40 ? 0.6 : 0.35);
    const withFamily = !owns && age < 32 && homeRoll > 0.85;
    const housing = withFamily ? between(r, 300, 700, 50) : Math.round((gm * (owns ? 0.25 : 0.31) + between(r, -200, 300)) / 10) * 10;
    let living = Math.round((gm * between(r, 20, 36) / 100 + nKids * 420 + (caregiver ? 600 : 0)) / 10) * 10;
    const debts = [];
    if (r() < 0.62) debts.push({ id: "cc", name: "Credit card", balance: between(r, 1200, 19000, 100), apr: between(r, 19, 29, 0.1) });
    if (age < 45 && r() < 0.55) debts.push({ id: "student", name: "Student loans", balance: between(r, 8000, 85000, 500), apr: between(r, 3.5, 7.5, 0.1) });
    if (r() < 0.48) debts.push({ id: "car", name: "Car loan", balance: between(r, 5000, 32000, 500), apr: between(r, 4, 11, 0.1) });
    if (r() < 0.14) debts.push({ id: "medical", name: "Medical bills", balance: between(r, 1500, 9000, 100), apr: 0 });
    if (r() < 0.14) debts.push({ id: "personal", name: "Personal loan", balance: between(r, 3000, 15000, 500), apr: between(r, 9, 17, 0.1) });
    debts.forEach((d) => (d.apr = Math.round(d.apr * 10) / 10));
    debts.forEach((d) => (d.min = Math.round(Math.max(35, d.id === "cc" ? d.balance * 0.03 : d.id === "student" ? d.balance * 0.011 : d.id === "medical" ? d.balance * 0.04 : d.balance * 0.025) / 5) * 5));
    let minPay = debts.reduce((n, d) => n + d.min, 0);
    // Realistic household: after housing, spending and minimum payments, 8–25% of take-home is left over.
    {
      const want = Math.round(takeHome * between(r, 8, 25) / 100);
      const surplus = takeHome - housing - living - minPay;
      if (surplus < want) living = Math.max(Math.round(takeHome * 0.12 / 10) * 10, Math.round((living - (want - surplus)) / 10) * 10);
      // Debt payments so big that nothing is left: shrink the biggest debt instead.
      while (takeHome - housing - living - minPay < takeHome * 0.06 && debts.length) {
        const d = debts.sort((a, b) => b.min - a.min)[0];
        d.balance = Math.round(d.balance * 0.6 / 100) * 100;
        d.min = Math.max(35, Math.round(d.min * 0.6 / 5) * 5);
        minPay = debts.reduce((n, x) => n + x.min, 0);
      }
    }
    const expenses = housing + living;
    const cash = Math.max(300, Math.round((expenses * Math.pow(r(), 1.6) * 7) / 100) * 100);
    const hasPlan = ["salary", "hourly"].includes(payType) || job.includes("Navy");
    const match = hasPlan && r() < 0.78 ? pickR(r, [3, 4, 5, 6]) : 0;
    const contrib = hasPlan ? (match ? pickR(r, [0, 2, 3, match, match, match + 3, 10]) : pickR(r, [0, 0, 3, 6])) : 0;
    const k401 = hasPlan ? Math.round((income * Math.max(0, age - 24) * between(r, 0.02, 0.16, 0.01)) / 500) * 500 : 0;
    const roth = r() < (hasPlan ? 0.28 : 0.45) ? between(r, 1500, 60000, 500) : 0;
    const goals = [];
    const dream = pickR(r, RETIRE_DREAMS);
    const early = /early/.test(dream.name) && income > 85000;
    const retireAt = Math.max(age + 3, early ? between(r, 52, 57) : between(r, 60, 68));
    goals.push({ id: "retire", name: dream.name.replace("{age}", retireAt), target: Math.round(((income * (early ? 0.55 : 0.4) + dream.extra) * (age < 62 ? 25 : 22)) / 10000) * 10000, years: Math.max(1, retireAt - age), priority: age > 55 ? 1 : 2, say: `${dream.say} I'm hoping to retire at ${retireAt}, so about {yrs} years. Someone told me I'd need around {amt}.` });
    kids.filter((k) => k.age < 17).slice(0, 2).forEach((k) => goals.push({ id: "college-" + k.name.toLowerCase(), name: `${k.name}'s college fund`, target: between(r, 60000, 140000, 10000), years: Math.max(1, 18 - k.age), priority: 3 }));
    const ctx = { owns, age, income, married, kids: nKids };
    const pool = GOAL_POOL.filter((g) => g.when(ctx)).sort(() => r() - 0.5);
    const nExtra = between(r, 1, difficulty === "tough" ? 3 : 2);
    pool.slice(0, nExtra).forEach((g) => goals.push({ id: g.id, name: g.name, target: between(r, g.t[0], g.t[1], 1000), years: between(r, g.y[0], g.y[1]), priority: 4, say: g.say }));
    // Surprise goals: not on the intake form — the client brings them up mid-meeting, so you have to listen.
    const nHidden = difficulty === "easy" ? (r() < 0.4 ? 1 : 0) : difficulty === "tough" ? between(r, 1, 2) : 1;
    pool.slice(nExtra, nExtra + nHidden).forEach((g) => goals.push({ id: g.id, name: g.name, target: between(r, g.t[0], g.t[1], 1000), years: between(r, g.y[0], g.y[1]), priority: 4, say: g.say, hidden: true }));
    // Feasibility: goals must be reachable with smart tradeoffs (challenging, never impossible).
    {
      const pmt = (target, start, years, rate) => {
        const n = Math.max(1, years * 12);
        const i = rate / 12;
        const need = Math.max(0, target - start * Math.pow(1 + i, n));
        return (need * i) / (Math.pow(1 + i, n) - 1);
      };
      const surplus = takeHome - housing - living - minPay;
      // Retirement: funded by 401(k)/IRA saving — keep the needed amount within ~18% of gross pay.
      const ret = goals.find((g) => g.id === "retire");
      const cap = (income / 12) * 0.18;
      let guard = 0;
      while (ret && pmt(ret.target, k401 + roth, ret.years, 0.06) > cap && guard++ < 40) {
        if (ret.years < Math.max(5, 67 - age)) {
          ret.years++;
          ret.name = ret.name.replace(/\d{2}/, String(age + ret.years));
        } else ret.target = Math.round((ret.target * 0.92) / 10000) * 10000;
      }
      // Everything else comes out of the monthly surplus — together, no more than ~110% of it,
      // so you'll have to prioritize, but a sensible plan can hit the important goals.
      const others = goals.filter((g) => g.id !== "retire");
      const total = () => others.reduce((n, g) => n + pmt(g.target, 0, g.years, g.years <= 3 ? 0.03 : 0.05), 0);
      guard = 0;
      const cost = (g) => pmt(g.target, 0, g.years, g.years <= 3 ? 0.03 : 0.05);
      while (others.length && total() > surplus * 1.1 && guard++ < 600) {
        // Trim the most expensive goal first: give it more time, then a smaller target.
        const g = [...others].sort((a, b) => cost(b) - cost(a))[0];
        if (!g.id.startsWith("college") && g.years < 12) g.years++;
        else if (g.target > 3000) g.target = Math.max(3000, Math.floor((g.target * 0.9) / 1000) * 1000);
        else {
          // Still too much: drop the least important wish entirely.
          const drop = [...others].sort((a, b) => b.priority - a.priority || cost(b) - cost(a))[0];
          others.splice(others.indexOf(drop), 1);
          goals.splice(goals.indexOf(drop), 1);
        }
      }
    }
    // Risk questionnaire answers (0-4 each), consistent with who they are.
    const base = between(r, 0, 4);
    const horizon = goals.find((g) => g.priority <= 2)?.years || 10;
    const riskAnswers = [
      Math.max(0, Math.min(4, base + between(r, -1, 1))),
      Math.max(0, Math.min(4, base + between(r, -1, 1))),
      horizon < 2 ? 0 : horizon < 5 ? 1 : horizon < 10 ? 2 : horizon < 20 ? 3 : 4,
      Math.max(0, Math.min(4, stability - 1)),
      Math.max(0, Math.min(4, (k401 > 50000 ? 2 : k401 > 0 ? 1 : 0) + (roth ? 1 : 0) + (base >= 3 ? 1 : 0))),
    ];
    const risk = Math.max(1, Math.min(5, Math.round(riskAnswers.reduce((n, a) => n + a + 1, 0) / 5)));
    const pet = r() < 0.55 ? pickR(r, PETS) : null;
    const hobby = pickR(r, HOBBIES);
    const side = r() < 0.2 ? pickR(r, ["sells photos online", "tutors on weekends", "flips furniture", "does freelance bookkeeping", "drives for DoorDash"]) : "";
    const level = { easy: [4, 4, 2], realistic: [2 + (r() < 0.4 ? 1 : 0), 2 + (r() < 0.5 ? 1 : 0), 2 + between(r, 0, 2)], tough: [1 + (r() < 0.3 ? 1 : 0), 1 + (r() < 0.3 ? 1 : 0), 3 + between(r, 0, 1)] }[difficulty] || [2, 3, 3];
    const style = difficulty === "easy" ? pickR(r, ["upbeat", "chatty", "detailed"]) : difficulty === "tough" ? pickR(r, ["guarded", "skeptical", "anxious", "brief"]) : pickR(r, Object.keys(STYLES));
    const worries = [
      debts.find((d) => d.id === "cc") && "the credit card debt",
      debts.find((d) => d.id === "student") && "student loans that never seem to shrink",
      goals.find((g) => g.id === "house") && "never being able to afford a house",
      kids.length && "paying for the kids' college",
      ["commission", "self-employed", "freelance", "gig"].includes(payType) && "income that's different every month",
      caregiver && "taking care of an aging parent",
      household === "divorced" && "starting over financially after the divorce",
      age > 55 && "whether their savings will last",
      cash < expenses && "having almost no emergency savings",
      "not saving enough for retirement",
    ].filter(Boolean);
    const mainWorry = worries[0];
    const docs = ["Recent pay stubs", "Bank statements (3 months)", "Retirement account statements", "Debt statements", "Insurance policies", "Last year's tax return", "Risk tolerance questionnaire"].map((d) => ({ name: d, status: r() < (difficulty === "easy" ? 0.6 : difficulty === "tough" ? 0.25 : 0.45) ? "brought" : "requested" }));
    const referral = pickR(r, ["a coworker", "a friend from church", "their sister", "their brother", "an online search", "a neighbor", "their CPA", "a friend from the gym"]);
    const c = {
      id: "cl-" + uid(),
      seed,
      difficulty,
      createdAt: Date.now(),
      first,
      last,
      gender,
      age,
      born: new Date().getFullYear() - age,
      email: `${first}.${last}@example.com`.toLowerCase(),
      phone: `(${pickR(r, ["619", "760", "858"])}) 555-0${between(r, 100, 199)}`,
      job,
      employer,
      payType,
      income,
      household,
      married,
      partner,
      kids,
      caregiver,
      side,
      style,
      city: pickR(r, ["Escondido", "Chula Vista", "Carlsbad", "La Mesa", "San Marcos", "Oceanside", "Santee", "El Cajon", "Encinitas", "Poway", "National City", "Vista"]),
      referral,
      reason: `wants help with ${mainWorry.replace(/^the /, "their ")}`,
      intakeGoals: goals.filter((g) => !g.hidden).map((g) => g.name),
      concern: mainWorry,
      worries: worries.slice(0, 3),
      docs,
      truth: { takeHome, housing, owns, withFamily, living, expenses, debts, cash, match, contrib, k401, roth, goals, risk, riskAnswers, minPay, insurance: nKids || married ? r() < 0.45 : null, mainWorry, pet, hobby, levels: level },
      collected: {},
      meetings: [],
      events: [],
      pendingEvents: [],
      plan: null,
      stage: "prospect",
      month: 0,
      relationship: { brief: 40, chatty: 45, anxious: 38, skeptical: 30, detailed: 40, upbeat: 50, guarded: 28 }[style],
      relHistory: [{ month: 0, delta: 0, reason: `Referred by ${referral.replace(/^their /, "their ")}` }],
      portfolio: [{ month: 0, value: k401 + roth }],
    };
    c.book = opts.book || "practice";
    c.startDay = opts.day || 0;
    // Wealthier clients (career mode, higher roles): bigger income and a taxable brokerage account.
    const w = opts.wealth || 0;
    if (w > 0) {
      const mult = [1, 1.3, 1.7, 2.4, 3.5][w];
      c.income = Math.round((c.income * mult) / 1000) * 1000;
      c.truth.takeHome = Math.round((c.truth.takeHome * mult * 0.93) / 10) * 10;
      // Bigger paychecks come with a bigger lifestyle.
      c.truth.housing = Math.round((c.truth.housing * (1 + (mult - 1) * 0.75)) / 10) * 10;
      c.truth.living = Math.round((c.truth.living * (1 + (mult - 1) * 0.7)) / 10) * 10;
      c.truth.expenses = c.truth.housing + c.truth.living;
      c.truth.brokerage = Math.round(([0, 30000, 120000, 450000, 1400000][w] * (0.7 + r() * 0.8)) / 1000) * 1000;
      c.truth.k401 = Math.round((c.truth.k401 * mult) / 500) * 500;
      c.portfolio = [{ month: 0, value: c.truth.k401 + c.truth.roth }];
    }
    // Couples meetings: both partners join, with their own personality and opinions.
    if (c.partner && (opts.couple || (opts.couple == null && r() < 0.3))) {
      c.couple = true;
      c.partnerGender = c.gender === "female" ? "male" : "female";
      c.partnerStyle = pickR(r, Object.keys(STYLES).filter((x) => x !== c.style));
      c.partnerView = pickR(r, ["wants to spend more on travel now", "wants to pay off debt before anything else", "is much more nervous about investing", "wants to retire earlier", "thinks the kids' college should come first", "wants a bigger house"]);
    }
    makeFeasible(c);
    return c;
  }

  // Keep every client's situation workable: a real (small) monthly surplus, a retirement goal that
  // 401(k)/IRA saving can reach, and other goals a sensible plan can fund with tradeoffs.
  // sync: also update what the client already told you (used once to repair older clients).
  // forget: drop the facts that changed so you have to ask again (used after life events).
  const pmtNeed = (target, start, years, rate) => {
    const n = Math.max(1, years * 12);
    const i = rate / 12;
    const need = Math.max(0, target - start * Math.pow(1 + i, n));
    return (need * i) / (Math.pow(1 + i, n) - 1);
  };
  function makeFeasible(c, opts = {}) {
    const t = c.truth;
    const changed = new Set();
    const minPay = () => t.debts.reduce((n, d) => n + (d.min || 0), 0);
    const surplus = () => t.takeHome - t.housing - t.living - minPay();
    if (!c.laidOff) {
      const want = Math.round(t.takeHome * 0.08);
      if (surplus() < want) {
        const nl = Math.max(Math.round((t.takeHome * 0.12) / 10) * 10, Math.round((t.living - (want - surplus())) / 10) * 10);
        if (nl !== t.living) (t.living = nl), changed.add("living");
      }
      let guard = 0;
      while (surplus() < t.takeHome * 0.05 && t.debts.length && guard++ < 20) {
        const d = [...t.debts].sort((a, b) => b.min - a.min)[0];
        d.min = Math.max(35, Math.round((d.min * 0.75) / 5) * 5); // refinanced / lower payment plan
        changed.add("min-" + d.id);
      }
    }
    t.expenses = t.housing + t.living;
    t.minPay = minPay();
    const ret = t.goals.find((g) => g.id === "retire");
    const cap = (c.income / 12) * 0.18;
    let guard = 0;
    while (!opts.cashOnly && !opts.only && ret && pmtNeed(ret.target, (t.k401 || 0) + (t.roth || 0), ret.years, 0.06) > cap && guard++ < 40) {
      if (ret.years < Math.max(5, 67 - c.age)) {
        ret.years++;
        ret.name = ret.name.replace(/\d{2}/, String(c.age + ret.years));
        changed.add("when-retire");
      } else (ret.target = Math.round((ret.target * 0.92) / 10000) * 10000), changed.add("goal-retire");
    }
    const others = t.goals.filter((g) => g.id !== "retire");
    const cost = (g) => pmtNeed(g.target, (c.goalBalances || {})[g.id] || 0, g.years, g.years <= 3 ? 0.03 : 0.05);
    const room = Math.max(0, surplus()) * 1.1;
    guard = 0;
    const movable = opts.only ? others.filter((g) => g.id === opts.only) : others;
    while (!opts.cashOnly && movable.length && others.reduce((n, g) => n + cost(g), 0) > room && guard++ < 600) {
      const g = [...movable].sort((a, b) => cost(b) - cost(a))[0];
      if (!g.id.startsWith("college") && g.years < 12) (g.years++, changed.add("when-" + g.id));
      else if (g.target > 3000) (g.target = Math.max(3000, Math.floor((g.target * 0.9) / 1000) * 1000)), changed.add("goal-" + g.id);
      else if (opts.only) break;
      else {
        const drop = [...others].sort((a, b) => b.priority - a.priority || cost(b) - cost(a))[0];
        others.splice(others.indexOf(drop), 1);
        if (movable !== others && movable.includes(drop)) movable.splice(movable.indexOf(drop), 1);
        t.goals.splice(t.goals.indexOf(drop), 1);
        changed.add("goal-" + drop.id);
      }
    }
    if (c.collected) {
      for (const k of changed) {
        if (!c.collected[k]) continue;
        if (opts.forget) delete c.collected[k];
        else if (opts.sync) {
          const g = t.goals.find((x) => "goal-" + x.id === k || "when-" + x.id === k);
          const v = k === "living" ? t.living : k.startsWith("min-") ? t.debts.find((d) => "min-" + d.id === k)?.min : g ? (k.startsWith("goal-") ? g.target : g.years) : null;
          if (v == null) delete c.collected[k];
          else c.collected[k] = { ...c.collected[k], value: v, quote: "Updated: they went back through their statements and corrected this", approx: false };
        }
      }
    }
    return [...changed];
  }
  // Facts about debts and goals that no longer exist (paid off / dropped) are removed from your notes.
  function prune(c) {
    const debtIds = new Set(c.truth.debts.map((d) => d.id));
    const goalIds = new Set(c.truth.goals.map((g) => g.id));
    for (const k of Object.keys(c.collected)) {
      const m = k.match(/^(debt|apr|min)-(.+)$/);
      if (m && !debtIds.has(m[2])) delete c.collected[k];
      const g = k.match(/^(goal|when)-(.+)$/);
      if (g && !goalIds.has(g[2])) delete c.collected[k];
    }
  }
  // What still worries them — based on their situation today (a paid-off card stops being a worry).
  function worriesNow(c) {
    const t = c.truth;
    const ok = (w) =>
      /credit card/.test(w) ? t.debts.some((d) => d.id === "cc" && d.balance > 0) : /student loans/.test(w) ? t.debts.some((d) => d.id === "student" && d.balance > 0) : /emergency savings/.test(w) ? t.cash < t.expenses : /afford a house/.test(w) ? !t.owns : true;
    const list = (c.worries || [t.mainWorry]).filter(ok);
    return list.length ? list : ["not saving enough for retirement"];
  }
  // One-time repair for clients created by older versions.
  function migrate() {
    const list = all();
    let dirty = false;
    for (const c of list) {
      if ((c.v || 0) >= 2) continue;
      c.docs = docsOf(c);
      receiveDocs(c, c.docs.filter((d) => d.status === "received").map((d) => d.name), "backfill");
      makeFeasible(c, { sync: true });
      prune(c);
      c.v = 2;
      dirty = true;
    }
    if (dirty) saveAll(list);
  }

  // ---------- the facts a client can share (fields you collect) ----------
  // Each: key, label, section, ask (what your question must touch), say(c, vague) → spoken answer, value(c), num (number to listen for)
  function fields(c) {
    const t = c.truth;
    const F = [
      { key: "housing", label: "Housing cost / month", sec: "Cash flow", ask: /\b(rent|mortgage|housing)\b/i, num: t.housing, say: (v) => `${t.owns ? "Our mortgage" : "Rent"} is ${v(t.housing)} a month.` },
      { key: "living", label: "Other spending / month", sec: "Cash flow", ask: /\b(spend|spending|expenses?|budget|groceries|bills|everything else|cost of living)\b/i, num: t.living, say: (v) => `Everything else — groceries, gas, bills — is probably ${v(t.living)} a month.` },
      { key: "takeHome", label: "Take-home pay / month", sec: "Cash flow", ask: /take.?home|paycheck|net pay|after (tax|taxes)|bring home|\b(make|earn|income|salary|paid)\b|deposit/i, num: t.takeHome, say: (v) => `After taxes I take home about ${v(t.takeHome)} a month.` },
      { key: "cash", label: "Cash savings", sec: "Assets", ask: /\b(savings?|saved|emergency|cash|bank|checking)\b/i, num: t.cash, say: (v) => `I've got about ${v(t.cash)} in savings. That's it.` },
      { key: "k401", label: "401(k) balance", sec: "Retirement", ask: /401|retirement (account|savings|plan)|\bretire\b/i, num: t.k401, say: (v) => (t.k401 ? `My 401(k) has around ${v(t.k401)} in it.` : "I don't really have anything for retirement yet.") },
      { key: "contrib", label: "401(k) contribution %", sec: "Retirement", ask: /contribut|what percent|how much do you (put|save)|put in/i, num: t.contrib, pct: true, say: () => (t.contrib ? `I put in ${t.contrib}% of my pay.` : "I'm not contributing anything right now.") },
      { key: "match", label: "Employer match %", sec: "Retirement", ask: /\bmatch|employer/i, num: t.match, pct: true, say: () => (t.match ? `My employer matches up to ${t.match}%.` : "My job doesn't offer a match, as far as I know.") },
      { key: "roth", label: "Roth IRA balance", sec: "Retirement", ask: /roth|\bira\b|other (accounts?|investments?)|brokerage|invest/i, num: t.roth, say: (v) => (t.roth ? `I have a Roth IRA with about ${v(t.roth)}.` : "No, I don't have a Roth or any other investments.") },
      ...(t.brokerage ? [{ key: "brokerage", label: "Brokerage / taxable investments", sec: "Assets", ask: /brokerage|taxable|investment account|other (accounts?|investments?)|stocks/i, num: t.brokerage, say: (v) => `We also have a brokerage account — about ${v(t.brokerage)} in index funds and some individual stocks.` }] : []),
      { key: "riskq", label: "Risk questionnaire (client's own answers)", sec: "Risk", ask: /(?!)/, text: "completed", say: () => "" },
      { key: "risk", label: "Risk tolerance (in their words)", sec: "Risk", ask: /risk|comfortable|market (drop|fall|crash)|volatil|lose money|ups and downs|stock/i, text: RISK_SAY[t.risk - 1], say: () => RISK_SAY[t.risk - 1] },
      { key: "estate-will", label: "Has a will", sec: "Estate", ask: /\b(a will|your will|the will|wills|estate plan(ning)?|if something (happened|happens) to you|pass away)\b/i, text: estateOf(c).will ? "yes" : "no", say: () => (estateOf(c).will ? "Yes, we did a will a few years ago." : "A will? No… I know, I keep putting it off.") },
      { key: "estate-benef", label: "Beneficiaries up to date", sec: "Estate", ask: /\bbeneficiar/i, text: estateOf(c).benef ? "yes" : "no", say: () => (estateOf(c).benef ? "Yes, I updated those recently." : "Honestly, I don't remember who's listed. Probably whoever I put when I started the job.") },
      ...(c.kids.some((k) => k.age < 18) ? [{ key: "estate-guardian", label: "Guardian named for kids", sec: "Estate", ask: /\b(guardian|who would (take|raise|care)|if something happen)\b/i, text: estateOf(c).guardian ? "yes" : "no", say: () => (estateOf(c).guardian ? "Yes — my sister would take the kids. It's in our will." : "We've talked about who'd take the kids, but nothing's official.") }] : []),
      { key: "insurance", label: "Life insurance", sec: "Protection", ask: /insur|protect|if something happen/i, text: t.insurance == null ? "n/a" : t.insurance ? "has a policy" : "none", say: () => (t.insurance == null ? "Insurance? Just what comes through work, I think." : t.insurance ? "I have a life insurance policy through work." : "No, I don't have life insurance. I keep meaning to look into it.") },
      ...t.debts.flatMap((d) => [
        { key: "debt-" + d.id, label: `${d.name} balance`, sec: "Debts", ask: new RegExp(`\\b(debts?|owe|loans?|credit card|balances?|${d.id === "cc" ? "card" : d.id})\\b`, "i"), num: d.balance, say: (v) => `${d.name}: about ${v(d.balance)}.` },
        { key: "apr-" + d.id, label: `${d.name} interest rate`, sec: "Debts", ask: /interest|rate|apr/i, num: d.apr, pct: true, say: () => `The ${d.name.toLowerCase()} is at ${d.apr}% interest.` },
        { key: "min-" + d.id, label: `${d.name} minimum payment`, sec: "Debts", ask: /minimum|monthly payments?|\bpayments?\b/i, num: d.min, say: (v) => `The minimum on the ${d.name.toLowerCase()} is ${v(d.min)} a month.` },
      ]),
      ...t.goals.flatMap((g) => [
        { key: "goal-" + g.id, label: `Goal: ${g.name} (amount)`, sec: "Goals", hidden: g.hidden, ask: /\b(goals?|future|dreams?|plans?|saving for|want to|hoping|house|college|retire|retirement|trip|travel|business|car|anything else)\b/i, num: g.target, say: (v) => (g.say ? g.say.replace("{amt}", v(g.target)).replace("{yrs}", g.years) : `I want ${g.name.toLowerCase()} — maybe ${v(g.target)} — in about ${g.years} years.`) },
        { key: "when-" + g.id, label: `Goal: ${g.name} (years away)`, sec: "Goals", hidden: g.hidden, ask: /\b(when|how (long|soon)|timeline|by when|years?)\b/i, num: g.years, years: true, say: () => `For ${g.id === "retire" ? "retirement" : g.name.toLowerCase().replace(/^a /, "the ")}, ideally within ${g.years} years.` },
      ]),
    ];
    return F;
  }
  // Estate basics (from the client's seed so it's stable for older clients too).
  const estateOf = (c) => {
    const r = rng((c.seed || 1) + 99);
    const older = c.age > 45 || c.married;
    return { will: r() < (older ? 0.45 : 0.15), benef: r() < 0.5, guardian: r() < 0.3, poa: r() < 0.2 };
  };
  const PERSONAL = (c) =>
    [c.partner && { key: "partner", word: c.partner, say: `My ${c.household === "partner" ? "partner" : c.gender === "female" ? "husband" : "wife"} ${c.partner} and I talk about this a lot.` }, ...c.kids.map((k) => ({ key: "kid-" + k.name, word: k.name, say: `My ${k.age < 13 ? "kid" : "teenager"} ${k.name} is ${k.age}.` })), c.truth.pet && { key: "pet", word: c.truth.pet[1], say: `Sorry if you hear my ${c.truth.pet[0]} ${c.truth.pet[1]} later.` }, { key: "hobby", word: c.truth.hobby.split(" ")[0], say: `On weekends I'm usually ${c.truth.hobby}.` }].filter(Boolean);

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
      // Fields the client's own words point to come first, then what you asked about — so one number
      // isn't credited to two different facts.
      const used = new Set();
      const order = [...F].sort((a, b) => (b.ask.test(t.text) ? 2 : b.ask.test(prevMe) ? 1 : 0) - (a.ask.test(t.text) ? 2 : a.ask.test(prevMe) ? 1 : 0));
      for (const f of order) {
        if (found[f.key] || c.collected[f.key]) continue;
        if (f.num != null) {
          const tol = f.pct || f.years ? 0.01 : 0.2;
          const hit = nums.find((n, ni) => !used.has(ni) && Math.abs(n - f.num) <= Math.max(tol * Math.abs(f.num), f.pct || f.years ? 0.05 : 1));
          // A number only counts when your question was about that topic (or the client volunteered it clearly).
          if (hit != null && (f.ask.test(prevMe) || f.ask.test(t.text))) {
            used.add(nums.indexOf(hit));
            found[f.key] = { value: hit, quote: t.text.slice(0, 160), approx: Math.abs(hit - f.num) > 0.02 * Math.abs(f.num) };
          }
          else if (f.num === 0 && f.ask.test(prevMe) && /\b(no|not|don't|nothing|zero)\b/i.test(t.text)) found[f.key] = { value: 0, quote: t.text.slice(0, 160) };
        } else if (f.ask.test(prevMe) && f.text && (t.text.includes(f.text.slice(0, 18)) || /risk|insur/.test(f.key) || (/estate/.test(f.key) && /\b(wills?|beneficiar\w*|guardian|estate|listed|official|updated|put(ting)? (it )?off|the kids)\b/i.test(t.text)))) {
          found[f.key] = { value: f.key === "risk" ? c.truth.risk : f.text, quote: t.text.slice(0, 160) };
        }
      }
    }
    return found;
  }
  // Personal details you brought back up in a later meeting (relationship bonus).
  function remembered(c, thread, before) {
    const mine = thread.filter((t) => t.from === "me").map((t) => t.text).join(" ");
    const emails = typeof FP !== "undefined" ? (FP.bookOf(c)?.inbox || []).filter((m) => m.clientId === c.id).flatMap((m) => [m.body, ...(m.thread || []).map((x) => x.text)]) : [];
    const heardBefore = [...before.flatMap((m) => (m.thread || []).filter((t) => t.from === "them").map((t) => t.text)), ...emails, ...(c.events || []).map((e) => e.say + " " + e.text), c.partner || "", ...c.kids.map((k) => k.name)].join(" ").toLowerCase();
    const items = [
      ...PERSONAL(c).map((p) => p.word),
      ...(c.truth.pet ? [c.truth.pet[0]] : []),
      ...c.truth.hobby.split(/\s+/).filter((w) => w.length > 4),
      ...(c.events || []).flatMap((e) => words(e.text).filter((w) => w !== c.first.toLowerCase()).slice(0, 3)),
    ].filter(Boolean);
    return [...new Set(items)].filter((w) => heardBefore.includes(w.toLowerCase()) && new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "") + "\\b", "i").test(mine)).slice(0, 4);
  }

  // ---------- life events (random, like real life) ----------
  // w: how common · cond: who it can happen to · text: your note · say: how the client tells you · apply: what changes
  const pct = (c, p) => Math.round(c.income * p / 1000) * 1000;
  const addGoal = (c, id, name, target, years, say) => { if (!c.truth.goals.some((g) => g.id === id)) c.truth.goals.push({ id, name, target, years, priority: 3, say }); };
  const spend = (c, amt) => {
    const t = c.truth;
    const fromCash = Math.min(t.cash, amt);
    t.cash -= fromCash;
    if (amt > fromCash) {
      const cc = t.debts.find((d) => d.id === "cc") || (t.debts.push({ id: "cc", name: "Credit card", balance: 0, apr: 24.9, min: 35 }), t.debts[t.debts.length - 1]);
      cc.balance += amt - fromCash;
      cc.min = Math.max(35, Math.round(cc.balance * 0.03 / 5) * 5);
    }
  };
  const EVENTS = [
    // Career & income
    { id: "raise", w: 10, text: (c, e) => `${c.first} got a ${e.n}% raise.`, say: (c, e) => `Good news — I got a ${e.n}% raise!`, n: (r) => Math.round(3 + r() * 9), apply: (c, e) => { c.income = Math.round(c.income * (1 + e.n / 100) / 1000) * 1000; c.truth.takeHome = Math.round(c.truth.takeHome * (1 + e.n / 100) / 10) * 10; } },
    { id: "promotion", w: 5, text: (c) => `${c.first} was promoted.`, say: () => `I got promoted! More responsibility, but a nice bump in pay.`, apply: (c) => { c.income = Math.round(c.income * 1.15 / 1000) * 1000; c.truth.takeHome = Math.round(c.truth.takeHome * 1.13 / 10) * 10; } },
    { id: "bonus", w: 6, text: (c, e) => `${c.first} received a $${e.n.toLocaleString()} bonus.`, say: (c, e) => `I just got a $${e.n.toLocaleString()} bonus. What should I do with it?`, n: (r, c) => Math.round(c.income * (0.03 + r() * 0.1) / 500) * 500, apply: (c, e) => (c.truth.cash += e.n) },
    { id: "jobloss", w: 4, text: (c) => `${c.first} was laid off.`, say: () => `I got laid off yesterday. I'm honestly freaking out. What do I do?`, apply: (c) => { c.truth.cash = Math.max(0, c.truth.cash - c.truth.expenses); c.laidOff = true; } },
    { id: "newjob", w: 5, text: (c) => `${c.first} started a new job.`, say: () => `I accepted a new job! Different benefits though — they have a 401(k) with a match. What do I do with my old 401(k)?`, apply: (c) => { c.income = Math.round(c.income * 1.1 / 1000) * 1000; c.truth.match = Math.max(c.truth.match, 4); c.truth.contrib = 0; c.laidOff = false; } },
    { id: "hours", w: 3, cond: (c) => ["hourly", "gig"].includes(c.payType), text: (c) => `${c.first}'s hours were cut.`, say: () => `They cut my hours at work. Money's going to be tight for a while.`, apply: (c) => (c.truth.takeHome = Math.round(c.truth.takeHome * 0.8 / 10) * 10) },
    { id: "commission", w: 4, cond: (c) => ["commission", "self-employed", "freelance"].includes(c.payType), text: (c) => `${c.first} had a slow quarter.`, say: () => `Slowest quarter I've had in years. I had to dip into savings.`, apply: (c) => spend(c, Math.round(c.truth.expenses * 1.5)) },
    { id: "bigclient", w: 3, cond: (c) => ["commission", "self-employed", "freelance"].includes(c.payType), text: (c) => `${c.first} landed a huge client.`, say: () => `I just landed my biggest client ever! This quarter is going to be great.`, apply: (c) => (c.truth.cash += Math.round(c.income * 0.15)) },
    { id: "sidebiz", w: 3, text: (c) => `${c.first} started a side business.`, say: () => `I started selling stuff online on the side — it's actually making a few hundred a month!`, apply: (c) => (c.truth.takeHome += 400) },
    { id: "backschool", w: 2, cond: (c) => c.age < 45, text: (c) => `${c.first} enrolled in a degree program.`, say: () => `I decided to go back to school part-time. Tuition is about $8,000 a year.`, apply: (c) => (c.truth.living += 650) },
    { id: "retireoffer", w: 2, cond: (c) => c.age > 55, text: (c) => `${c.first} was offered early retirement.`, say: () => `My company offered me an early retirement package. Should I take it?`, apply: (c) => (c.truth.cash += pct(c, 0.5)) },
    { id: "stockcomp", w: 2, cond: (c) => c.income > 100000, text: (c) => `${c.first} received company stock (RSUs).`, say: () => `My company gave me $20,000 in stock that vests over four years. I have no idea how that works.`, apply: (c) => (c.truth.roth += 5000) },
    // Family
    { id: "baby", w: 4, cond: (c) => c.age < 43 && (c.married || c.partner), text: (c) => `${c.first} is expecting a baby.`, say: () => `We're having a baby!! Due in about seven months. What do we need to change?`, apply: (c) => { c.truth.living += 950; c.kids.push({ name: "Baby", age: 0 }); addGoal(c, "college-baby", "New baby's college fund", 150000, 18); } },
    { id: "engaged", w: 3, cond: (c) => !c.married && c.age < 45, text: (c) => `${c.first} got engaged.`, say: () => `I got engaged! We're thinking about a wedding next year — maybe $30,000?`, apply: (c) => addGoal(c, "wedding", "Pay for their wedding", 30000, 1, "We're planning the wedding — about {amt} — next year.") },
    { id: "married", w: 2, cond: (c) => c.household === "partner", text: (c) => `${c.first} and ${c.partner} got married.`, say: (c) => `${c.partner} and I got married! Do we combine finances now?`, apply: (c) => { c.married = true; c.household = "married"; } },
    { id: "divorce", w: 2, cond: (c) => c.married, text: (c) => `${c.first} is going through a divorce.`, say: () => `This is hard to write. We're getting divorced. I don't know what this means for money.`, apply: (c) => { c.hardTopic = "divorce"; c.married = false; c.household = "divorced"; c.truth.cash = Math.round(c.truth.cash / 2); c.truth.k401 = Math.round(c.truth.k401 * 0.6); c.truth.housing = Math.round(c.truth.housing * 0.8); } },
    { id: "parentcare", w: 3, cond: (c) => c.age > 38, text: (c) => `${c.first}'s parent needs care.`, say: () => `My dad fell and needs help at home now. We're paying for an aide a few days a week.`, apply: (c) => (c.truth.living += 900) },
    { id: "parentmove", w: 2, cond: (c) => c.age > 40, text: (c) => `${c.first}'s mother is moving in.`, say: () => `My mom is moving in with us. It'll help her, but our grocery bill is about to go up.`, apply: (c) => (c.truth.living += 400) },
    { id: "inherit", w: 2, text: (c, e) => `${c.first} inherited $${e.n.toLocaleString()}.`, say: (c, e) => `My aunt passed away and left me $${e.n.toLocaleString()}. I don't want to waste it.`, n: (r) => Math.round((10000 + r() * 90000) / 1000) * 1000, apply: (c, e) => (c.truth.cash += e.n) },
    { id: "kidcollege", w: 3, cond: (c) => c.kids.some((k) => k.age >= 16), text: (c) => `${c.first}'s child got into college.`, say: () => `My kid got into college! It's $28,000 a year after aid. Are we ready?`, apply: (c) => (c.truth.living += 600) },
    { id: "kidbraces", w: 3, cond: (c) => c.kids.some((k) => k.age >= 9 && k.age <= 15), text: (c) => `${c.first}'s kid needs braces ($6,000).`, say: () => `Orthodontist says my kid needs braces. $6,000. Ugh.`, apply: (c) => spend(c, 6000) },
    { id: "kidsport", w: 2, cond: (c) => c.kids.some((k) => k.age >= 8 && k.age <= 17), text: (c) => `${c.first}'s kid joined a travel sports team.`, say: () => `My kid made the travel team! Which is great… and expensive.`, apply: (c) => (c.truth.living += 300) },
    { id: "adoptpet", w: 3, text: (c) => `${c.first} adopted a dog.`, say: () => `We adopted a dog! His name is Waffles. Totally unrelated to finance, but I had to tell you.`, apply: (c) => { c.truth.living += 120; c.truth.pet = ["dog", "Waffles"]; } },
    { id: "familyloan", w: 2, text: (c) => `${c.first}'s brother asked to borrow $5,000.`, say: () => `My brother asked to borrow $5,000. I want to help, but… should I?`, apply: () => {} },
    // Health
    { id: "medical", w: 5, text: (c, e) => `${c.first} had a $${e.n.toLocaleString()} medical bill.`, say: (c, e) => `I ended up in the ER — the bill came to $${e.n.toLocaleString()} after insurance.`, n: (r) => Math.round((1500 + r() * 8000) / 100) * 100, apply: (c, e) => spend(c, e.n) },
    { id: "surgery", w: 2, text: (c) => `${c.first} needs surgery and will miss 6 weeks of work.`, say: () => `I need knee surgery. I'll be out of work for about six weeks.`, apply: (c) => { spend(c, 4000); c.truth.cash = Math.max(0, c.truth.cash - Math.round(c.truth.takeHome * 0.5)); } },
    { id: "diagnosis", w: 1, cond: (c) => c.age > 45, text: (c) => `${c.first} received a serious diagnosis.`, say: () => `I got some hard news from my doctor. It's treatable, but it has me rethinking everything — including when I retire.`, apply: (c) => { const g = c.truth.goals.find((x) => x.id === "retire"); if (g) g.years = Math.max(2, g.years - 4); } },
    { id: "therapy", w: 2, text: (c) => `${c.first} started therapy ($200/month).`, say: () => `I started seeing a therapist. It's $200 a month but honestly worth it.`, apply: (c) => (c.truth.living += 200) },
    // Home & car
    { id: "rent", w: 6, cond: (c) => !c.truth.owns, text: (c, e) => `${c.first}'s rent went up $${e.n}.`, say: (c, e) => `My landlord is raising the rent by $${e.n} a month. Should I move?`, n: (r) => Math.round((100 + r() * 300) / 25) * 25, apply: (c, e) => (c.truth.housing += e.n) },
    { id: "evicted", w: 1, cond: (c) => !c.truth.owns, text: (c) => `${c.first}'s landlord is selling the building.`, say: () => `My landlord is selling the building — I have 60 days to move out. Moving costs are going to hurt.`, apply: (c) => { spend(c, 3500); c.truth.housing += 250; } },
    { id: "boughthome", w: 2, cond: (c) => !c.truth.owns && c.truth.cash > 30000, text: (c) => `${c.first} bought a home.`, say: () => `We did it — we bought a house! The mortgage is a little higher than rent was.`, apply: (c) => { c.truth.owns = true; c.truth.cash = Math.round(c.truth.cash * 0.25); c.truth.housing = Math.round(c.truth.housing * 1.2); c.truth.goals = c.truth.goals.filter((g) => g.id !== "house"); } },
    { id: "roof", w: 3, cond: (c) => c.truth.owns, text: (c) => `${c.first}'s roof needs replacing ($14,000).`, say: () => `The roof is leaking and needs to be replaced. $14,000. I didn't plan for this.`, apply: (c) => spend(c, 14000) },
    { id: "hvac", w: 3, cond: (c) => c.truth.owns, text: (c) => `${c.first}'s AC died ($7,500).`, say: () => `Our AC died in a heat wave. New system is $7,500.`, apply: (c) => spend(c, 7500) },
    { id: "refi", w: 2, cond: (c) => c.truth.owns, text: (c) => `${c.first} refinanced the mortgage.`, say: () => `I refinanced the mortgage — saved about $250 a month!`, apply: (c) => (c.truth.housing -= 250) },
    { id: "car", w: 6, text: (c) => `${c.first}'s car needed a $3,200 repair.`, say: () => `Transmission went out. $3,200 repair.`, apply: (c) => spend(c, 3200) },
    { id: "accident", w: 3, text: (c) => `${c.first} was in a car accident (deductible + rate increase).`, say: () => `I got in a fender bender — I'm fine, but I owe the $1,000 deductible and my insurance is going up.`, apply: (c) => { spend(c, 1000); c.truth.living += 60; } },
    { id: "newcar", w: 3, text: (c) => `${c.first} bought a new car with a loan.`, say: () => `I bought a new car. Took a loan — 7.9% for six years. Was that dumb?`, apply: (c) => { const d = c.truth.debts.find((x) => x.id === "car"); if (d) { d.balance += 22000; d.min += 300; } else c.truth.debts.push({ id: "car", name: "Car loan", balance: 32000, apr: 7.9, min: 560 }); } },
    { id: "theft", w: 1, text: (c) => `${c.first}'s identity was stolen.`, say: () => `Someone stole my identity and opened a credit card in my name. Is my money safe?`, apply: () => {} },
    { id: "move", w: 2, text: (c) => `${c.first} is moving to a cheaper city.`, say: () => `We decided to move somewhere cheaper. Our costs are going to drop a lot.`, apply: (c) => { c.truth.housing = Math.round(c.truth.housing * 0.75); spend(c, 4000); } },
    // Money moves & mistakes
    { id: "crypto", w: 3, text: (c) => `${c.first} put $5,000 into crypto.`, say: () => `So… I put $5,000 into crypto because my coworker kept talking about it. It's down 30% already.`, apply: (c) => spend(c, 3500) },
    { id: "memestock", w: 2, text: (c) => `${c.first} lost money on a meme stock.`, say: () => `I bought a stock everyone on Reddit was hyping. Lost about $2,000. Lesson learned?`, apply: (c) => spend(c, 2000) },
    { id: "scam", w: 1, text: (c) => `${c.first} lost $1,800 to a phone scam.`, say: () => `I'm embarrassed — someone pretending to be my bank got me to send $1,800.`, apply: (c) => spend(c, 1800) },
    { id: "taxbill", w: 3, text: (c) => `${c.first} owes $4,200 in taxes.`, say: () => `I did my taxes and I OWE $4,200. I usually get a refund!`, apply: (c) => spend(c, 4200) },
    { id: "refund", w: 4, text: (c) => `${c.first} got a $2,600 tax refund.`, say: () => `Got a $2,600 tax refund. Fun money, right?`, apply: (c) => (c.truth.cash += 2600) },
    { id: "lottery", w: 1, text: (c) => `${c.first} won $10,000 in a raffle.`, say: () => `You're not going to believe this. I won $10,000 in a charity raffle!`, apply: (c) => (c.truth.cash += 10000) },
    { id: "ccspike", w: 4, text: (c) => `${c.first} ran up the credit card.`, say: () => `I'll be honest, I went a little crazy with holiday shopping. The card is way higher than I'd like.`, apply: (c) => spend(c, 2500 + Math.round(c.truth.cash)) },
    { id: "paidcard", w: 3, cond: (c) => c.truth.debts.some((d) => d.id === "cc"), text: (c) => `${c.first} paid off the credit card!`, say: () => `I PAID OFF MY CREDIT CARD. First time in years!`, apply: (c) => (c.truth.debts = c.truth.debts.filter((d) => d.id !== "cc")) },
    { id: "studentforgive", w: 1, cond: (c) => c.truth.debts.some((d) => d.id === "student"), text: (c) => `Part of ${c.first}'s student loans were forgiven.`, say: () => `Part of my student loans got forgiven — about $10,000!`, apply: (c) => { const d = c.truth.debts.find((x) => x.id === "student"); if (d) d.balance = Math.max(0, d.balance - 10000); } },
    { id: "lent", w: 2, text: (c) => `${c.first} co-signed a loan for a friend.`, say: () => `I co-signed a car loan for my cousin. That's fine, right?`, apply: () => {} },
    // Goals & mindset
    { id: "retireearly", w: 3, text: (c) => `${c.first} now wants to retire 3 years earlier.`, say: () => `I've been thinking — I want to retire three years earlier than we planned. Is that possible?`, apply: (c) => { const g = c.truth.goals.find((x) => x.id === "retire"); if (g) g.years = Math.max(3, g.years - 3); delete c.collected["when-retire"]; } },
    { id: "retirelater", w: 2, text: (c) => `${c.first} decided to work a few more years.`, say: () => `Honestly, I like my job. I think I'll work a few extra years before retiring.`, apply: (c) => { const g = c.truth.goals.find((x) => x.id === "retire"); if (g) g.years += 3; delete c.collected["when-retire"]; } },
    { id: "values", w: 2, text: (c) => `${c.first} wants investments that match their values.`, say: () => `I've been reading about ESG investing. I don't want my money in oil companies. Can we do that?`, apply: () => {} },
    { id: "charity", w: 2, text: (c) => `${c.first} wants to give more to charity.`, say: () => `I want to start giving more to charity — maybe $200 a month. Is there a smart way to do that?`, apply: (c) => (c.truth.living += 200) },
    { id: "riskup", w: 2, text: (c) => `${c.first} feels more comfortable with risk now.`, say: () => `After watching the market recover last time, I think I can handle more risk now.`, apply: (c) => { c.truth.risk = Math.min(5, c.truth.risk + 1); c.truth.riskAnswers = c.truth.riskAnswers.map((a) => Math.min(4, a + 1)); } },
    { id: "riskdown", w: 2, text: (c) => `${c.first} got nervous about market risk.`, say: () => `Every news headline is making me nervous. Can we make things safer?`, apply: (c) => { c.truth.risk = Math.max(1, c.truth.risk - 1); c.truth.riskAnswers = c.truth.riskAnswers.map((a) => Math.max(0, a - 1)); } },
    { id: "newgoal", w: 9, text: () => "", say: () => "", apply: (c, e) => {
        const have = new Set(c.truth.goals.map((g) => g.id));
        const opts = GOAL_POOL.filter((g) => !have.has(g.id) && g.when({ owns: c.truth.owns, age: c.age, income: c.income, married: c.married, kids: c.kids.length }));
        if (!opts.length) return;
        const g = opts[Math.floor(Math.random() * opts.length)];
        const goal = { id: g.id, name: g.name, target: Math.round((g.t[0] + Math.random() * (g.t[1] - g.t[0])) / 1000) * 1000, years: g.y[0] + Math.floor(Math.random() * (g.y[1] - g.y[0] + 1)), priority: 4, say: g.say };
        c.truth.goals.push(goal);
        e.goal = g.id;
        e.gsay = g.say;
        e.text = `${c.first} has a new goal: ${g.name.toLowerCase()}.`;
        e.say = `I've been thinking about something new — ${g.say.replace("{amt}", "$" + goal.target.toLocaleString()).replace("{yrs}", goal.years).replace(/^./, (x) => x.toLowerCase())}`;
      } },
    { id: "parentpassed", w: 1, cond: (c) => c.age < 60, text: (c) => `${c.first}'s parent passed away.`, say: () => `I wanted to let you know my mom passed away last week. I'm okay… mostly. There's an estate to deal with and I don't know where to start.`, apply: (c) => { c.hardTopic = "loss"; } },
    { id: "dec-buyrent", w: 3, decision: "buyrent", cond: (c) => !c.truth.owns, text: (c) => `${c.first} is deciding whether to buy a home or keep renting.`, say: (c, e) => `We found a place we love — about $${(e.n * 1000).toLocaleString()}. Should we buy it or keep renting? I need your honest take.`, n: (r, c) => Math.round((c.income * (3.2 + r() * 1.6)) / 10000) * 10, apply: () => {} },
    { id: "dec-job", w: 3, decision: "job", text: (c) => `${c.first} got a job offer and wants help deciding.`, say: (c, e) => `I got an offer for $${(e.n * 1000).toLocaleString()} a year — more than I make now — but there's no 401(k) match and the health plan is worse. Should I take it?`, n: (r, c) => Math.round((c.income * (1.06 + r() * 0.12)) / 1000), apply: () => {} },
    { id: "dec-lend", w: 3, decision: "lend", text: (c) => `${c.first} was asked to lend family money.`, say: (c, e) => `My brother asked to borrow $${(e.n * 1000).toLocaleString()} to cover some bills. I want to help, but I'm torn. What would you do?`, n: (r) => 3 + Math.floor(r() * 10), apply: () => {} },
    { id: "dec-car", w: 3, decision: "car", text: (c) => `${c.first} is choosing between leasing and buying a car.`, say: (c, e) => `My car's done. A dealer offered a lease at $${e.n}/month, or I could buy a used one for about $18,000. Which makes more sense?`, n: (r) => 320 + Math.floor(r() * 220), apply: () => {} },
    { id: "dec-school", w: 2, decision: "school", cond: (c) => c.age < 45, text: (c) => `${c.first} is thinking about going back to school.`, say: () => `I'm thinking about going back for a certificate — about $14,000 — that could bump my pay. Is it worth it?`, apply: () => {} },
    { id: "scam-irs", w: 2, scam: true, text: (c) => `${c.first} got a suspicious "IRS" call.`, say: () => `Someone from the IRS called and said I owe $4,800 in back taxes and I'll be arrested unless I pay today with gift cards. Should I just pay it?? I'm freaking out.`, apply: () => {} },
    { id: "scam-crypto", w: 2, scam: true, text: (c) => `${c.first} is being pitched a crypto "opportunity" by an online friend.`, say: () => `I met someone online who's been making 30% a month on a crypto platform. They're helping me sign up — I was going to move $10,000 from savings. Thoughts?`, apply: () => {} },
    { id: "scam-bank", w: 2, scam: true, text: (c) => `${c.first} got a text that looks like it's from their bank.`, say: () => `I got a text from "my bank" saying my account is locked and I need to log in through their link and confirm my password. Is this real?`, apply: () => {} },
    { id: "dropgoal", w: 2, cond: (c) => c.truth.goals.length > 2, text: (c) => `${c.first} dropped a goal.`, say: (c, e) => `We decided we don't need ${e.goal?.toLowerCase() || "one of our goals"} anymore.`, apply: (c, e) => { const g = c.truth.goals.filter((x) => x.priority >= 4)[0]; if (g) { e.goal = g.name; c.truth.goals = c.truth.goals.filter((x) => x !== g); } } },
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
  // Move the client forward one month at a time: markets, payments, savings, and maybe a life event.
  // mret: this month's market returns {s: stocks, b: bonds} from the shared market (otherwise drawn here).
  function advance(c, months, mret = null) {
    const r = rng(c.seed + c.month * 7919 + 13);
    const plan = c.plan;
    const alloc = plan?.alloc || { stocks: 70, bonds: 25, cash: 5 };
    const { mu, sd } = mix(alloc);
    let value = c.portfolio[c.portfolio.length - 1]?.value || 0;
    const t = c.truth;
    for (let m = 0; m < months; m++) {
      const ret = mret ? (alloc.stocks / 100) * mret.s + (alloc.bonds / 100) * mret.b + (alloc.cash / 100) * 0.0025 : mu / 12 + (sd / Math.sqrt(12)) * gauss(r);
      const contrib = c.laidOff ? 0 : ((c.income / 12) * ((plan?.k401Pct ?? t.contrib) + Math.min(t.match, plan?.k401Pct ?? t.contrib))) / 100;
      value = Math.max(0, value * (1 + ret) + contrib);
      if (c.aum) c.aum = Math.max(0, Math.round(c.aum * (1 + ret)));
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
      if (t.debts.some((d) => d.balance <= 0)) {
        t.debts = t.debts.filter((d) => d.balance > 0);
        prune(c);
      }
      t.cash = Math.max(0, Math.round(t.cash + (c.laidOff ? -t.expenses * 0.5 : (plan?.efMonthly || 0) + (plan ? 0 : 50))));
      c.goalBalances ||= {};
      if (plan) for (const [g, v] of Object.entries(plan.goalSavings || {})) c.goalBalances[g] = Math.round(((c.goalBalances[g] || 0) * (1 + ret) + (+v || 0)) * 100) / 100;
      c.month++;
      // About one or two life events a year, weighted toward the common ones.
      if (r() < 0.17) lifeEvent(c, r);
    }
    t.k401 = Math.round(value - (t.roth || 0));
    c.portfolio.push({ month: c.month, value: Math.round(value) });
    c.portfolio = c.portfolio.slice(-120);
  }
  function lifeEvent(c, r = Math.random, forceId = null) {
    const t = c.truth;
    const pool = EVENTS.filter((e) => (!e.cond || e.cond(c)) && !(c.events || []).slice(-6).some((x) => x.id === e.id));
    let e = forceId ? EVENTS.find((x) => x.id === forceId) : null;
    if (!e) {
      const total = pool.reduce((n, x) => n + x.w, 0);
      let pick = r() * total;
      e = pool.find((x) => (pick -= x.w) < 0) || pool[0];
    }
    if (!e) return null;
    const ev = { id: e.id, month: c.month, day: c.dayNow ?? null, n: e.n ? e.n(r, c) : undefined, decision: e.decision, scam: e.scam || undefined };
    const debtsBefore = Object.fromEntries(t.debts.map((d) => [d.id, d.balance]));
    e.apply(c, ev);
    // Card balances that jumped or vanished: your old numbers are out of date.
    for (const d of t.debts) if (debtsBefore[d.id] == null || Math.abs(d.balance - debtsBefore[d.id]) > 0.1 * Math.max(500, debtsBefore[d.id])) ["debt-", "min-"].forEach((k) => delete c.collected[k + d.id]);
    prune(c);
    makeFeasible(c, { forget: true, cashOnly: !ev.gsay, only: ev.gsay ? ev.goal : null });
    if (ev.goal && ev.gsay) {
      const g = t.goals.find((x) => x.id === ev.goal);
      if (g) ev.say = `I've been thinking about something new — ${ev.gsay.replace("{amt}", "$" + g.target.toLocaleString()).replace("{yrs}", g.years).replace(/^./, (x) => x.toLowerCase())}`;
      delete ev.gsay;
      ev.goal = g?.name || ev.goal;
    }
    ev.text ||= e.text(c, ev);
    ev.say ||= e.say(c, ev);
    t.expenses = t.housing + t.living;
    if (!ev.text) return null;
    c.events.push(ev);
    c.pendingEvents.push(ev);
    // New facts mean old answers may be out of date.
    if (["jobloss", "car", "medical", "inherit", "bonus", "roof", "hvac", "surgery", "lottery", "crypto", "scam", "taxbill", "refund", "ccspike", "boughthome", "accident", "evicted", "kidbraces", "memestock", "commission", "bigclient", "retireoffer"].includes(e.id)) delete c.collected.cash;
    if (["rent", "boughthome", "refi", "evicted", "move", "divorce"].includes(e.id)) delete c.collected.housing;
    if (["raise", "promotion", "newjob", "hours", "sidebiz"].includes(e.id)) delete c.collected.takeHome;
    if (["baby", "parentcare", "parentmove", "kidcollege", "kidsport", "therapy", "charity", "backschool", "adoptpet"].includes(e.id)) delete c.collected.living;
    return ev;
  }
  // Dates come from the planner's calendar (the book's clock) when there is one.
  const dateOf = (c, month = c.month, opts = {}) => {
    const b = typeof FP !== "undefined" ? FP.bookOf(c) : null;
    const d = b ? new Date(b.start + ((c.startDay || 0) + month * 30.44) * 86400000) : new Date(c.createdAt);
    if (!b) d.setMonth(d.getMonth() + month);
    return opts.day ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  // ---------- the meeting the practice engine runs ----------
  function persona(c) {
    const pool = CHARACTERS.filter((x) => x.gender === c.gender);
    const ch = pool[Math.abs(hash(c.id)) % pool.length];
    return { ...ch, name: c.first };
  }
  // Discovery → (optional follow-up calls to fill gaps) → plan presentation → reviews.
  function meetingType(c) {
    if (!c.meetings.length) return "discovery";
    if (!c.plan?.submittedAt) return "followup";
    if (!c.meetings.some((m) => m.type === "presentation")) return "presentation";
    return "review";
  }
  const MEETING_NAME = { discovery: "Discovery meeting", followup: "Follow-up call", presentation: "Plan presentation", review: "Review meeting", call: "Phone call", hard: "Difficult conversation" };
  const HARD = {
    afford: { label: "Their goal isn't affordable", when: () => true, open: (c) => `Hi Mason. You said you wanted to talk about something? You sounded serious.`, notes: (c) => `Mason has to tell you that one of your goals isn't affordable as planned. You REALLY want it. React honestly: disappointment, maybe denial ("there must be a way"). If he explains with real numbers and offers real options (more time, a smaller target, saving more, cutting something), you slowly accept and pick one.`, brief: (c) => `Tell ${c.first} that one of their goals doesn't fit their budget. Be kind, use real numbers, and offer options.` },
    overspend: { label: "Their spending is the problem", when: () => true, open: (c) => `Hey Mason. So… what did you want to talk about?`, notes: (c) => `Mason needs to tell you your spending is the main problem. You get a little defensive at first ("I don't spend THAT much"). If he's non-judgmental, shows the numbers and suggests specific, realistic cuts, you open up and agree to try.`, brief: (c) => `${c.first} spends more than their plan can handle. Raise it without judging, show the numbers, and agree on 2-3 realistic changes.` },
    loss: { label: "A death in the family", when: (c) => true, open: (c) => `Hi Mason. Thanks for making time. It's… been a hard few weeks. My ${c.age > 55 ? "husband" : "mom"} passed away.`, notes: (c) => `Someone close to you (${c.age > 55 ? "your spouse" : "your mother"}) died recently. You're grieving, foggy and overwhelmed by paperwork. You might be tempted to make big money decisions (sell the house, pay everything off). A good planner slows you down: compassion first, no big decisions for 6-12 months, handle beneficiary claims and urgent paperwork, update your own beneficiaries.`, brief: (c) => `${c.first} just lost someone close. Lead with compassion, keep decisions small, and help with the urgent paperwork.` },
    divorce: { label: "Splitting assets in a divorce", when: (c) => c.married || c.household === "divorced", open: (c) => `Hi. I guess you heard. The divorce is moving forward and I have no idea what happens to our money.`, notes: (c) => `You're going through a divorce: angry, scared and worried about money. You need help understanding how retirement accounts get split (a QDRO), building a new single-income budget, updating beneficiaries, and not making rushed decisions. You may vent about your ex — a good planner stays neutral.`, brief: (c) => `${c.first} is divorcing. Stay neutral, explain how assets get split, build a new budget, and update beneficiaries.` },
    losses: { label: "Big market losses", when: () => true, open: (c) => `Mason, I'm going to be honest. I'm scared. I've lost a lot this year and I want to sell everything.`, notes: (c) => `Your investments dropped a lot and you want to sell everything and go to cash. You're emotional. If Mason listens first, explains with history and your timeline, and maybe offers a small comfort step (like rebalancing or building cash), you calm down and stay invested. If he dismisses you, you get more upset.`, brief: (c) => `${c.first} wants to sell everything after losses. Listen first, then use their timeline and history to keep them on track.` },
  };

  // ---------- meeting extras: moods, family guests, market news ----------
  const MOODS = [
    { id: "stressed", label: "stressed", say: "stressed — work has been brutal this week, and it shows in short answers", tell: /\b(stress|rough|hard week|long (day|week)|overwhelm|you okay|everything okay|a lot going on)\b/i },
    { id: "rushed", label: "short on time", say: "rushed — you have to leave early and keep mentioning the time", tell: /\b(short on time|rushed|in a hurry|keep (this|it) (short|quick)|respect your time|tight (schedule|on time)|busy (day|today)|we can be quick)\b/i },
    { id: "excited", label: "excited about good news", say: "excited — you just got great news at work and you're bubbly", tell: /\b(excit|great news|congrat|good mood|you seem happy|sounds great|love to hear)\b/i },
    { id: "tired", label: "exhausted", say: "tired — you barely slept (a sick kid or a late night)", tell: /\b(tired|sleep|exhaust|long night|take it easy|coffee)\b/i },
    { id: "distracted", label: "distracted by a family issue", say: "distracted — a family issue is on your mind and you drift off", tell: /\b(on your mind|distract|everything (okay|alright)|is something (wrong|up)|you seem)\b/i },
    { id: "skeptical", label: "skeptical today", say: "skeptical today — a friend told you advisors are a waste of money", tell: /\b(fair (question|point)|understand (the|your) (concern|skeptic|hesita)|how I('m| am) paid|my fees?|transparent)\b/i },
  ];
  function pickGuest(c, type, r) {
    if (c.couple || type === "call" || type === "discovery" || r() > 0.2) return null;
    const g = (gender) => FIRST[gender][Math.floor(r() * FIRST[gender].length)];
    const opts = [];
    if (c.age >= 50) {
      const gender = r() < 0.5 ? "female" : "male";
      opts.push({ rel: gender === "female" ? "adult daughter" : "adult son", gender, view: "is worried there won't be enough for retirement and asks pointed questions about fees" });
    }
    if (c.age < 55) {
      const gender = r() < 0.6 ? "female" : "male";
      opts.push({ rel: gender === "female" ? "mother" : "father", gender, view: "thinks paying off the house matters more than investing and distrusts the stock market" });
    }
    const sg = r() < 0.5 ? "female" : "male";
    opts.push({ rel: sg === "female" ? "sister" : "brother", gender: sg, view: "is suspicious of investing after losing money in a bad deal" });
    const fg = r() < 0.5 ? "female" : "male";
    opts.push({ rel: "best friend", gender: fg, view: "thinks they should stop renting and just buy a house already" });
    const o = opts[Math.floor(r() * opts.length)];
    return { ...o, name: g(o.gender) };
  }
  function marketNews(c) {
    if (typeof FP === "undefined") return null;
    const b = FP.bookOf(c);
    const hist = b?.market?.hist || [];
    const recent = hist.slice(-6).filter((h) => Math.abs(h.chg || 0) > 0.012);
    if (!recent.length) return null;
    const h = recent.sort((a, z) => Math.abs(z.chg) - Math.abs(a.chg))[0];
    return { ...FP.newsFor(b, h.day, h.chg), chg: h.chg };
  }
  // Ideas to look up after a meeting, when they came up.
  const CONCEPTS = [
    { re: /\broth\b/i, title: "Roth IRA", text: "You pay tax now, then growth and retirement withdrawals are tax-free. Best when your tax rate is lower now than later. 2025 limit: $7,000 ($8,000 at 50+), with income limits." },
    { re: /\b(traditional ira|pre-?tax)\b/i, title: "Traditional (pre-tax) accounts", text: "Contributions lower your taxable income today; you pay tax when you withdraw in retirement. Best when your tax rate is higher now than later." },
    { re: /\bbackdoor\b/i, title: "Backdoor Roth", text: "High earners above the Roth income limit contribute to a traditional IRA (no deduction) and convert it to Roth. Watch the pro-rata rule if they have other pre-tax IRA money." },
    { re: /\b(rmds?|required minimum)\b/i, title: "Required minimum distributions", text: "Starting at age 73, pre-tax retirement accounts must pay out a minimum each year (balance ÷ an IRS life-expectancy factor). Missing one triggers a penalty." },
    { re: /\bhsa\b/i, title: "HSA", text: "With a high-deductible health plan: deductible contributions, tax-free growth and tax-free withdrawals for medical costs. After 65 it works like a traditional IRA for other spending." },
    { re: /\b529\b/i, title: "529 plan", text: "Education savings: growth is tax-free for qualified school costs. Many states give a deduction. Up to $35,000 of leftover money can roll to the student's Roth over time." },
    { re: /\b(match|matching)\b/i, title: "Employer match", text: "Free money: e.g. a 100% match up to 4% means contributing 4% of pay gets another 4% from the employer. Almost always the first priority." },
    { re: /\b(index fund|etf)\b/i, title: "Index funds & ETFs", text: "Own a whole market (like the S&P 500) cheaply. Low fees and broad diversification are why most planners use them as the core of a portfolio." },
    { re: /\bexpense ratio|fees?\b/i, title: "Fees & expense ratios", text: "A 1% yearly fee on $100,000 is $1,000 a year — and it compounds. Over 30 years fees can cost a quarter of the final balance." },
    { re: /\bsequence\b/i, title: "Sequence-of-returns risk", text: "A crash right when withdrawals start does more damage than one later. Retirees protect against it with a cash/bond bucket for the first few years of spending." },
    { re: /\b(dollar.cost|every paycheck|automatic(ally)? invest)\b/i, title: "Dollar-cost averaging", text: "Investing a fixed amount on a schedule buys more shares when prices are low and removes the temptation to time the market." },
    { re: /\brebalanc/i, title: "Rebalancing", text: "Selling a bit of what grew and buying what lagged to get back to the target mix (like 70/30). Usually once a year or when off by 5%+." },
    { re: /\bemergency (fund|savings)\b/i, title: "Emergency fund", text: "3–6 months of essential expenses in a high-yield savings account; 6–12 for variable income or single-earner households." },
    { re: /\b(avalanche|snowball)\b/i, title: "Avalanche vs. snowball", text: "Avalanche pays the highest-rate debt first (least interest). Snowball pays the smallest balance first (quick wins). Both put all extra money on one debt at a time." },
    { re: /\b(term life|life insurance)\b/i, title: "Term life insurance", text: "Cheap coverage for a set period (like 20 years) while people depend on your income. A rough need: 10–12× income, or use DIME (debt, income, mortgage, education)." },
    { re: /\b(a will|your will|the will|beneficiar\w*|guardian|estate plan\w*)\b/i, title: "Estate basics", text: "A will (and guardians for minor kids), up-to-date beneficiaries on every account (they override the will), and powers of attorney for money and health decisions." },
    { re: /\bsocial security\b/i, title: "Social Security timing", text: "Claiming at 62 cuts benefits about 30%; waiting from 67 to 70 adds 8% a year. Longevity and a spouse's benefit matter most." },
    { re: /\b(4%|four percent|withdrawal rate)\b/i, title: "The 4% guideline", text: "Withdrawing about 4% of savings in year one, then adjusting for inflation, has historically lasted 30 years. A starting point, not a guarantee." },
    { re: /\b(diversif)/i, title: "Diversification", text: "Spreading money across many companies, sectors and asset types so one bad bet can't sink the plan. It reduces company-specific risk, not market risk." },
    { re: /\binflation\b/i, title: "Inflation", text: "At 3% inflation, prices double in about 24 years. Cash loses buying power over time, which is why long-term money is invested." },
  ];
  // Coaching notes on your own lines (rule-based — always available).
  function coachLines(c, m) {
    const tips = {};
    const thread = m.thread || [];
    thread.forEach((t, i) => {
      if (t.from !== "me") return;
      const x = t.text;
      const prevThem = [...thread.slice(0, i)].reverse().find((y) => y.from === "them")?.text || "";
      const notes = [];
      if (/\b(guarantee|can't lose|risk.?free|definitely (go|going) up)\b/i.test(x)) notes.push(["bad", "Never promise returns or guarantees — that's a compliance problem."]);
      if (/^(do|did|are|is|have|has|can|will|would)\b[^?]*\?$/i.test(x.trim()) && x.split(" ").length < 14) notes.push(["tip", "Closed (yes/no) question. Try an open one: “Tell me about…” or “How do you feel about…?”"]);
      if (x.split(" ").length > 90) notes.push(["tip", "Long monologue. Break it up and check in: “Does that make sense so far?”"]);
      if (/\b(asset allocation|sequence of returns|expense ratio|standard deviation|amortiz|liquidity|tax.?loss harvest)\b/i.test(x) && c.truth.levels[0] <= 3) notes.push(["tip", "Jargon for a client with basic knowledge — explain it in everyday words."]);
      if (/\b(worried|scared|nervous|stress|anxious|embarrass|lost my|divorce|passed away|laid off)\b/i.test(prevThem) && !/\b(understand|sorry|that's (hard|tough|stressful)|hear you|makes sense|normal)\b/i.test(x)) notes.push(["tip", "They shared a feeling — acknowledge it before moving to numbers."]);
      if (/\b(you should|you need to|you have to)\b/i.test(x) && i < 6) notes.push(["tip", "Early “you should” before you've heard their story can feel pushy. Ask first."]);
      if (/\b(so what I'm hearing|it sounds like|to recap|if I understand)\b/i.test(x)) notes.push(["good", "Great reflective listening."]);
      if (/\b(congrat|sorry to hear|how's|how is) \w+/i.test(x) && PERSONAL(c).some((p) => new RegExp("\\b" + p.word + "\\b", "i").test(x))) notes.push(["good", "Personal touch — clients remember this."]);
      if (notes.length) tips[i] = notes;
    });
    return tips;
  }


  // ---------- documents (what real clients hand over) ----------
  const DOC_FIELDS = {
    "Recent pay stubs": (k) => ["takeHome", "contrib"].includes(k),
    "Bank statements (3 months)": (k) => ["cash", "living", "housing"].includes(k),
    "Retirement account statements": (k) => ["k401", "match", "roth"].includes(k),
    "Debt statements": (k) => /^(debt|apr|min)-/.test(k),
    "Insurance policies": (k) => k === "insurance",
    "Last year's tax return": () => false,
    "Risk tolerance questionnaire": (k) => k === "riskq",
  };
  const docsOf = (c) => (c.docs || []).map((d) => ({ ...d, status: d.status || (d.brought ? "brought" : "requested") }));
  // Asking for documents in a meeting: what they brought is reviewed now; the rest they promise to send.
  const ASK_DOCS = /\b(documents?|statements?|pay ?stubs?|paperwork|tax return|questionnaire|send (me|over)|email me|bring (in|me)|copies)\b/i;
  function receiveDocs(c, names, source) {
    const F = fields(c);
    const got = [];
    for (const d of c.docs) {
      if (!names.includes(d.name)) continue;
      d.status = "received";
      for (const f of F) {
        if (!DOC_FIELDS[d.name]?.(f.key) || c.collected[f.key]) continue;
        const value = f.key === "riskq" ? c.truth.riskAnswers.slice() : f.num != null ? f.num : f.text;
        c.collected[f.key] = { value, quote: `From their ${d.name.toLowerCase()}`, doc: d.name, month: c.month, meeting: c.meetings.length + (source === "meeting" ? 1 : 0) };
        got.push(f.key);
      }
    }
    return got;
  }

  // Notes only the AI client sees (its full, true situation and history).
  function hiddenNotes(c, type, opts = {}) {
    const t = c.truth;
    const v = voiceNum(c);
    const past = c.meetings.slice(-3).map((m, i) => `Meeting ${c.meetings.length - (c.meetings.slice(-3).length - 1 - i)} (${m.type}): ${m.summary || ""}`).join(" | ");
    const docs = docsOf(c);
    const surprise = t.goals.filter((g) => g.hidden && !c.collected["goal-" + g.id]);
    const hh = { married: `Married to ${c.partner}.`, partner: `Living with your partner ${c.partner} (not married).`, single: "Single.", divorced: "Divorced.", "single parent": "Single parent.", widowed: "Widowed." }[c.household] || (c.married ? `Married to ${c.partner}.` : "Single.");
    return `You are ${c.first} ${c.last}, ${c.age}, ${c.job} (${c.employer}; pay is ${c.payType || "salary"}) in ${c.city}, earning about ${usd(c.income)}/yr (take-home ${usd(t.takeHome)}/mo). ${hh} ${c.kids.length ? "Kids: " + c.kids.map((k) => `${k.name} (${k.age})`).join(", ") + "." : "No kids."} ${c.caregiver ? "You also help care for an aging parent." : ""} ${c.side ? "On the side you " + c.side + "." : ""} ${t.pet ? `Pet ${t.pet[0]} named ${t.pet[1]}.` : ""} Hobby: ${t.hobby}.
PERSONALITY: ${STYLES[c.style] || "Friendly."} Stay consistent with it.
${c.couple ? `COUPLES MEETING: your ${c.married ? "spouse" : "partner"} ${c.partner} is also here. You play BOTH people. ${c.partner}'s personality: ${STYLES[c.partnerStyle] || "friendly"}; ${c.partner} ${c.partnerView}, which ${c.first} doesn't fully agree with. Start each person's line with their name in brackets, like [${c.first}] ... [${c.partner}] ... Let ${c.partner} speak in most turns; sometimes they disagree and Mason has to balance both.` : ""}
Money: ${t.owns ? "mortgage" : t.withFamily ? "you live with family and pay" : "rent"} ${usd(t.housing)}/mo; other spending ${usd(t.living)}/mo; cash savings ${usd(t.cash)}; ${t.k401 || t.contrib ? `401(k) ${usd(t.k401)}, contributing ${t.contrib}%${t.match ? `, employer matches up to ${t.match}%` : ", no employer match"}` : "no workplace retirement plan"}; ${t.roth ? "Roth IRA " + usd(t.roth) : "no Roth IRA"}; debts: ${t.debts.map((d) => `${d.name} ${usd(d.balance)} at ${d.apr}% (min ${usd(d.min)}/mo)`).join("; ") || "none"}. Life insurance: ${t.insurance == null ? "only through work" : t.insurance ? "yes" : "none"}.
Goals you told them about on the intake form: ${t.goals.filter((g) => !g.hidden).map((g) => `${g.name} — about ${usd(g.target)} in ${g.years} years${g.say ? ` (in your words: "${g.say.replace("{amt}", usd(g.target)).replace("{yrs}", g.years)}")` : ""}`).join("; ")}.
${surprise.length ? `SURPRISE GOAL(S) you didn't put on the form: ${surprise.map((g) => `${g.name} — about ${usd(g.target)} in ${g.years} years`).join("; ")}. Partway through the conversation (not in your first two replies), bring it up casually on your own, like "Oh — before I forget…". Only mention it once.` : ""}
Worries right now: ${worriesNow(c).join("; ")}. Risk attitude (say it like this when asked): "${RISK_SAY[t.risk - 1]}"
Knowledge level ${t.levels[0]}/5 (1 = asks what basic terms mean). Knows numbers ${t.levels[1]}/5 (low = give rounded guesses like "${v(t.housing)}"). Worry ${t.levels[2]}/5.
Documents: you brought ${docs.filter((d) => d.status === "brought").map((d) => d.name).join(", ") || "nothing"}; ${docs.filter((d) => d.status === "requested").length ? "you can email the rest (" + docs.filter((d) => d.status === "requested").map((d) => d.name).join(", ") + ") after the meeting if asked" : ""}. If Mason asks for documents, tell him what you brought and promise to send the rest.
Always say money as digits with a $ sign (like $1,850) and percentages as digits (like 6%), so they come through clearly.
${c.pendingEvents.length ? "SINCE THE LAST MEETING: " + c.pendingEvents.map((e) => e.text).join(" ") + " Bring this up early, in your own words." : ""}
${c.events.length ? `YOUR LIFE SINCE YOU STARTED WITH MASON (all true — never contradict it): ${c.events.map((e) => `${dateOf(c, e.month)}: ${e.text}`).join(" ")}` : ""}
${Object.keys(c.collected).length ? `WHAT YOU'VE ALREADY TOLD MASON (stay consistent; if something changed since, say it changed): ${Object.entries(c.collected).filter(([k]) => k !== "riskq").slice(0, 24).map(([k, v]) => `${fieldLabel(c, k)}: ${Array.isArray(v.value) ? "questionnaire" : typeof v.value === "number" && !/contrib|match|apr|when/.test(k) ? usd(v.value) : v.value}`).join("; ")}.` : ""}
Your money above is your situation TODAY. Debts not listed are paid off — never say you still have them.
${past ? "Earlier meetings: " + past : ""} Relationship with Mason so far: ${c.relationship}/100 (${c.relationship >= 70 ? "you trust him" : c.relationship >= 45 ? "warming up" : "still guarded"}).
${opts.mood ? `TODAY'S MOOD: you're ${opts.mood.say}. Let it show naturally in how you talk (don't announce it in your first line). If Mason notices and acknowledges it kindly, warm up a bit.` : ""}
${opts.guest ? `GUEST: your ${opts.guest.rel} ${opts.guest.name} came along today. You play BOTH people. ${opts.guest.name} ${opts.guest.view}. Start each person's line with their name in brackets, like [${c.first}] ... [${opts.guest.name}] ... ${opts.guest.name} speaks in some turns with their own questions and opinions; if Mason ignores them, they get annoyed.` : ""}
${opts.news ? `MARKET NEWS: you saw the headline "${opts.news.head}". Once, partway through (not in your first reply), ask Mason what it means for you and whether you should do anything.` : ""}
${type === "hard" && HARD[opts.topic] ? `DIFFICULT CONVERSATION: ${HARD[opts.topic].notes(c)}` : ""}
${opts.interrupt ? `INTERRUPTION: once, around the middle of the meeting, ${opts.interrupt}. Then see whether Mason handles it gracefully and steers back.` : ""}
${type === "call" ? `This is a PHONE CALL you made to Mason because: "${opts.reason || "you had a quick question"}". Start with that. Keep it short (a few minutes). Once you have a clear answer and a next step, thank him and say goodbye.` : ""}
${type === "email" ? "You're emailing your planner between meetings. Only mention money details if they're relevant to the email." : type === "presentation" ? "Mason is presenting his financial plan today. Ask about anything unclear, push back if it doesn't fit you, and decide whether you'll follow it." : type === "review" ? "This is a follow-up review. Share updates and ask how you're doing on your goals." : type === "followup" ? "This is a short follow-up call. You already met once; Mason needs a few more details for your plan. Answer what he asks." : "This is your first meeting (discovery). Share details only when asked."}`;
  }
  function scenario(c, type, opts = {}) {
    const p = persona(c);
    const mr = Math.random;
    const mood = opts.mood !== undefined ? opts.mood : type === "call" || mr() < 0.35 ? null : MOODS[Math.floor(mr() * MOODS.length)];
    const guest = opts.guest !== undefined ? opts.guest : pickGuest(c, type, mr);
    const news = type === "discovery" ? null : marketNews(c);
    const INTERRUPTS = [
      ["your phone rings — it's your boss, you take it for a moment and come back flustered", "Sorry — that's my boss, one second… Okay. Sorry. Where were we?"],
      [c.kids.length ? `your kid ${c.kids[0].name} bursts in needing something` : "a delivery driver calls about a package", c.kids.length ? `${c.kids[0].name}, not now honey — sorry, Mason. Kids. What were you saying?` : "Sorry, that was a delivery. Go ahead."],
      ["you go off on a long tangent about your neighbor's new boat and how unfair it is", "Speaking of money — my neighbor just bought a boat. A BOAT. How do people afford that? Anyway…"],
      ["you get a text and read it out loud, worried, about a family thing", "Sorry, my sister just texted — my dad's car broke down again. Ugh. Okay, I'm listening."],
    ];
    const intr = type === "call" || type === "hard" || mr() > 0.35 ? null : INTERRUPTS[Math.floor(mr() * INTERRUPTS.length)];
    const xo = { mood, guest, news, reason: opts.reason, topic: opts.topic, interrupt: intr?.[0] };
    const refSay = { "a coworker": "A coworker of mine", "a friend from church": "A friend from church", "their sister": "My sister", "their brother": "My brother", "an online search": "I found you online and", "a neighbor": "My neighbor", "their CPA": "My accountant", "a friend from the gym": "A friend from the gym" }[c.referral] || "A friend";
    const worry = worriesNow(c)[0].replace(/^the kids'/, "my kids'").replace(/^taking care of an aging parent/, "taking care of my mom").replace(/^starting over financially after the divorce/, "starting over after my divorce").replace(/^whether their savings/, "whether my savings").replace(/^income that's different/, "my income being different");
    const greet = { brief: `Hi. ${c.first}.`, chatty: `Hi! I'm ${c.first} — sorry, traffic was crazy.`, anxious: `Hi, I'm ${c.first}. Sorry, I'm a little nervous about this.`, skeptical: `Hi, I'm ${c.first}. I'll be honest, I've had a bad experience with a "financial advisor" before.`, detailed: `Hi, I'm ${c.first}. I brought some notes.`, upbeat: `Hey! I'm ${c.first}, great to meet you!`, guarded: `Hi. I'm ${c.first}.` }[c.style] || `Hi, I'm ${c.first}.`;
    const opening = {
      discovery: `${greet} ${refSay} said you might be able to help. Honestly, I'm a little worried about ${worry}.`,
      followup: `Hi Mason, it's ${c.first}. You said you needed a few more details?`,
      presentation: `Hi Mason, good to see you again. I'm curious what you came up with.`,
      call: `Hi Mason, it's ${c.first}. Do you have a minute? ${opts.reason || "I had a quick question."}`,
      hard: HARD[opts.topic]?.open(c) || `Hi Mason. You wanted to talk?`,
      review: c.pendingEvents.length ? `Hey Mason. A lot has happened since we last talked — ${c.pendingEvents[0].text.replace(c.first + " has", "I have").replace(c.first + " ", "I ")}` : `Hi Mason, good to see you. Things have been pretty steady.`,
    }[type];
    const moodSay = mood ? { stressed: "Sorry, it's been a really rough week at work.", rushed: "Just so you know, I have to leave a little early today.", excited: "Sorry, I'm a little giddy — I got some great news at work this morning!", tired: "Forgive me, I barely slept last night.", distracted: "Sorry if I seem a little off — family stuff.", skeptical: "I'll be honest, a friend told me advisors are a waste of money." }[mood.id] : "";
    const openingFull = [opening, moodSay, guest ? `I brought my ${guest.rel}, ${guest.name} — I hope that's okay.` : ""].filter(Boolean).join(" ");
    // Built-in partner: answers by topic, plus a surprise goal it volunteers partway through.
    const v = voiceNum(c);
    const surprise = c.truth.goals.filter((g) => g.hidden && !c.collected["goal-" + g.id]).map((g) => `Oh — before I forget, ${(g.say || `I also want ${g.name.toLowerCase()}, about {amt}, in {yrs} years.`).replace("{amt}", v(g.target)).replace("{yrs}", g.years).replace(/^(?!I\b|I')./, (x) => x.toLowerCase())}`);
    return {
      clientId: c.id,
      meetingType: type,
      title: `${c.first} ${c.last} · ${MEETING_NAME[type]} · ${dateOf(c)}`,
      counterpart: { name: `${c.first} ${c.last}`, role: `${c.job}, ${c.age}`, gender: c.gender },
      brief: { hard: HARD[opts.topic]?.brief(c) || "A difficult conversation.", call: `${c.first} is calling you: “${opts.reason || "a quick question"}”. Listen, answer clearly and agree on a next step.`, discovery: `${c.first} ${c.reason}. Learn their full situation: cash flow, debts, savings, retirement, goals, risk tolerance and protection — and ask for their documents.`, followup: `A short call to fill the gaps in what you know before you build the plan.`, presentation: `Walk ${c.first} through your plan in plain English. Check it fits them and get their buy-in.`, review: `Catch up on what changed, review progress toward goals, and adjust the plan.` }[type],
      opening: openingFull,
      hidden: hiddenNotes(c, type, xo),
      opening2: null,
      mood,
      guest,
      news,
      reason: opts.reason || "",
      objectives: { hard: ["Lead with empathy", "Be honest and use real numbers", "Offer options, not orders", "Agree on a small next step"], call: ["Find out what's behind the question", "Answer simply, tied to their plan", "No guarantees or hot tips", "Agree on a next step"], discovery: ["Build rapport before numbers", "Cover cash flow, debts, savings, retirement, goals, risk", "Ask open questions and listen for new goals", "Ask for documents and agree next steps"], followup: ["Ask only what's missing", "Confirm anything that changed", "Collect outstanding documents", "Set the plan presentation"], presentation: ["Explain the plan without jargon", "Connect each step to their goals", "Check understanding and comfort", "Agree on next steps"], review: ["Ask what changed", "Review goal progress", "Adjust the plan", "Remember personal details"] }[type],
      maxTurns: type === "call" ? 12 : 30,
      persona: p,
      style: c.style,
      partner: c.couple ? { name: c.partner, gender: c.partnerGender, view: c.partnerView } : guest ? { name: guest.name, gender: guest.gender, view: guest.view, rel: guest.rel } : null,
      smallTalk: { brief: ["Okay. Go ahead.", "Sure."], chatty: ["Oh, nice to meet you too! Sorry, I'm a talker — stop me if I ramble.", "Love that. Okay, where do we start?"], anxious: ["Thanks. Honestly I'm a little nervous, I've never done this before.", "Okay… I just hope it's not too bad."], skeptical: ["Okay. And how do you get paid, exactly?", "Fine. Let's see what you've got."], detailed: ["Great. I brought some notes. Go ahead.", "Sounds good — I like having a process."], upbeat: ["Awesome, I'm excited about this!", "Perfect, let's do it!"], guarded: ["Okay.", "Alright. We'll see."] }[c.style],
      topic: opts.topic || "",
      interrupt: intr,
      surprise: [...surprise, ...(intr ? [intr[1]] : []), ...(news ? [`By the way — I saw "${news.head.toLowerCase()}". Should I be worried about that?`] : [])],
      moodLine: mood ? { stressed: "Sorry, it's been a really rough week at work.", rushed: "Just so you know, I have to leave a little early today.", excited: "Sorry, I'm a little giddy — I got some great news at work this morning!", tired: "Forgive me, I barely slept last night.", distracted: "Sorry, I've got a lot on my mind with family stuff.", skeptical: "I'll be honest, a friend told me advisors are a waste of money." }[mood.id] : "",
      guestIntro: guest ? `I brought my ${guest.rel}, ${guest.name} — I hope that's okay.` : "",
      clientFacts: [
        ...fields(c)
          .filter((f) => !f.hidden && f.key !== "riskq")
          .map((f) => [f.ask, f.say(v).replace(/\b(about|is probably) around\b/g, "$1").replace(/\babout around\b/g, "around"), f.key]),
        [ASK_DOCS, (() => {
          const docs = docsOf(c);
          const b = docs.filter((d) => d.status === "brought").map((d) => d.name.toLowerCase());
          const rest = docs.filter((d) => d.status === "requested").map((d) => d.name.toLowerCase());
          return `${b.length ? `I brought my ${b.join(", ")}.` : "I didn't bring anything, sorry."}${rest.length ? ` I can email you the ${rest.slice(0, 3).join(", ")}${rest.length > 3 ? " and the rest" : ""} after this.` : ""}`;
        })(), "docs"],
        ...PERSONAL(c).map((x) => [new RegExp(x.key.startsWith("kid") ? "kid|child|family|son|daughter" : x.key === "partner" ? "married|partner|husband|wife|family" : x.key === "pet" ? "pet|dog|cat" : "hobby|weekend|fun|free time", "i"), x.say, x.key]),
      ],
    };
  }
  // Called by the practice engine when a client meeting ends.
  function recordMeeting(clientId, P) {
    let report = null;
    update(clientId, (c) => {
      c.docs = docsOf(c);
      const before = c.meetings.slice();
      const found = extract(c, P.thread);
      Object.assign(c.collected, Object.fromEntries(Object.entries(found).map(([k, v]) => [k, { ...v, month: c.month, meeting: c.meetings.length + 1 }])));
      // Documents: if you asked, what they brought is reviewed now and the rest arrives after the meeting.
      const mine = P.thread.filter((t) => t.from === "me").map((t) => t.text).join(" ");
      let docFacts = [];
      const missingDocs = [];
      if (ASK_DOCS.test(mine)) {
        const brought = c.docs.filter((d) => d.status === "brought").map((d) => d.name);
        const promised = c.docs.filter((d) => d.status === "requested").map((d) => d.name);
        // Tough clients sometimes forget a document — you'll have to follow up.
        const r = rng(c.seed + c.meetings.length * 31);
        const arrive = promised.filter(() => c.difficulty !== "tough" || r() < 0.65);
        promised.filter((n) => !arrive.includes(n)).forEach((n) => missingDocs.push(n));
        docFacts = receiveDocs(c, [...brought, ...arrive], "meeting");
      }
      const rem = before.length ? remembered(c, P.thread, before) : [];
      const score = P.result?.overall ?? 60;
      const moodRead = P.sc.mood ? P.sc.mood.tell.test(mine) : null;
      const allText = P.thread.map((t) => t.text).join(" ");
      const concepts = CONCEPTS.filter((k) => k.re.test(allText)).slice(0, 5).map((k) => ({ title: k.title, text: k.text }));
      const delta = Math.max(-10, Math.min(12, Math.round((score - 55) / 3))) + Math.min(9, rem.length * 3) + (moodRead ? 2 : 0);
      c.relationship = Math.max(0, Math.min(100, c.relationship + delta));
      const type = P.sc.meetingType;
      c.relHistory.push({ month: c.month, delta, reason: `${MEETING_NAME[type]} scored ${score}${rem.length ? ` · remembered ${rem.join(", ")}` : ""}` });
      c.meetings.push({ id: uid(), type, month: c.month, at: Date.now(), score, notes: P.notes || "", thread: P.thread.map(({ from, text }) => ({ from, text })), found: [...Object.keys(found), ...docFacts], docFacts, remembered: rem, summary: (P.result?.verdict || "").slice(0, 160), result: P.result, topic: P.sc.topic || "", mood: P.sc.mood?.label || null, moodRead, guest: P.sc.guest ? `${P.sc.guest.name} (${P.sc.guest.rel})` : null, reason: P.sc.reason || "", concepts });
      c.pendingEvents = [];
      if (typeof FP !== "undefined") FP.afterMeeting(c, type, score);
      if (["discovery", "followup"].includes(type) && c.stage === "prospect") c.stage = "discovery";
      if (type === "presentation") c.stage = score >= 55 ? "client" : c.stage;
      if (type === "review") c.stage = "client";
      report = { found: Object.keys(found).length, docFacts: docFacts.length, missingDocs, delta, rem, total: fields(c).length, collected: Object.keys(c.collected).length, mood: P.sc.mood?.label || null, moodRead, concepts };
    });
    if (AI.enabled() && P.thread.length > 2) aiFacts(clientId, P.thread);
    return report;
  }
  // Claude double-checks the transcript for facts the quick listener missed. A fact only counts if the
  // number really appears in what the client said.
  async function aiFacts(clientId, thread) {
    const c = find(clientId);
    if (!c) return;
    const F = fields(c).filter((f) => !c.collected[f.key] && f.num != null);
    if (!F.length) return;
    try {
      const out = await AI.ask(
        `From this financial-planning meeting transcript, list ONLY facts the CLIENT clearly stated (not the planner). Keys you may use:\n${F.map((f) => `${f.key}: ${f.label}`).join("\n")}\n\nTranscript:\n${thread.map((t) => `${t.from === "me" ? "Planner" : "Client"}: ${t.text}`).join("\n")}\n\nReturn ONLY JSON: {"facts": [{"key": "...", "value": number, "quote": "the client's exact words"}]}`,
        { effort: "low", maxTokens: 900, timeout: 40000 }
      );
      const j = AI.parseJSON(out, null);
      const theirs = thread.filter((t) => t.from === "them").map((t) => t.text).join(" ");
      const nums = numsIn(theirs);
      let added = 0;
      update(clientId, (x) => {
        for (const f of j?.facts || []) {
          const fd = F.find((y) => y.key === f.key);
          const v = +f.value;
          if (!fd || x.collected[f.key] || !isFinite(v) || !nums.some((n) => Math.abs(n - v) <= Math.max(0.01 * Math.abs(v), 0.5))) continue;
          x.collected[f.key] = { value: v, quote: String(f.quote || "").slice(0, 160), month: x.month, meeting: x.meetings.length, approx: Math.abs(v - fd.num) > 0.02 * Math.abs(fd.num) };
          added++;
        }
      });
      if (added) toast(`Claude caught ${added} more fact${added === 1 ? "" : "s"} from that meeting — added to “What you know”.`);
    } catch {}
  }
  // Email a document request from the client file: arrives before your next meeting.
  function requestDocs(id) {
    let out = [];
    update(id, (c) => {
      c.docs = docsOf(c);
      const want = c.docs.filter((d) => d.status !== "received").map((d) => d.name);
      const r = rng(c.seed + Date.now());
      const arrive = want.filter(() => c.difficulty !== "tough" || r() < 0.7);
      out = receiveDocs(c, arrive, "email");
      c.relHistory.push({ month: c.month, delta: 0, reason: `Requested documents by email · received ${arrive.length} of ${want.length}` });
    });
    return out;
  }

  // ---------- planning math (uses ONLY what you collected; grading uses the truth) ----------
  const val = (c, key, fallback = null) => (c.collected[key] ? c.collected[key].value : c.manual?.[key] ?? fallback);
  function known(c) {
    const takeHome = val(c, "takeHome", null) ?? Math.round((c.income * 0.75) / 12);
    const housing = val(c, "housing");
    const living = val(c, "living");
    const debts = collectedDebts(c);
    const minPay = debts.reduce((n, d) => n + (d.min || 0), 0);
    return { takeHome, housing, living, expenses: housing != null && living != null ? housing + living : null, cash: val(c, "cash"), k401: val(c, "k401"), contrib: val(c, "contrib"), match: val(c, "match"), roth: val(c, "roth"), risk: val(c, "risk"), riskq: val(c, "riskq"), brokerage: val(c, "brokerage"), debts, minPay, goals: collectedGoals(c) };
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
      return { p10: col[Math.floor(n * 0.1)], p25: col[Math.floor(n * 0.25)], p50: col[Math.floor(n * 0.5)], p75: col[Math.floor(n * 0.75)], p90: col[Math.floor(n * 0.9)] };
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
    if (!k.risk && !k.riskq) add("med", "No documented risk tolerance — you can't show the allocation is suitable.", "Get their risk questionnaire or discuss how they feel about market drops.");
    const unsupported = (plan.riskAnswers || []).map((a, i) => (a != null && !riskHasEvidence(c, i) ? i + 1 : null)).filter(Boolean);
    if (unsupported.length) add("high", `Risk answer${unsupported.length > 1 ? "s" : ""} ${unsupported.join(", ")} aren't supported by anything the client told you.`, "Only record what the client said or wrote — collect the evidence first.");
    const rs = riskScore(plan.riskAnswers) || k.risk;
    if (rs) {
      const model = MODELS[rs - 1];
      if (Math.abs(plan.alloc.stocks - model.stocks) > 20) add("high", `Allocation (${plan.alloc.stocks}% stocks) doesn't match their risk profile (${model.name}, ~${model.stocks}% stocks).`, `Move closer to ${model.stocks}% stocks or document why.`);
    }
    const short = k.goals.filter((g) => g.years != null && g.years <= 3 && (plan.goalSavings?.[g.id] || 0) > 0);
    if (short.length && plan.alloc.stocks > 50) add("med", `Short-term goal(s) (${short.map((g) => g.name).join(", ")}) are in a ${plan.alloc.stocks}% stock portfolio.`, "Money needed within ~3 years belongs in cash or short-term bonds.");
    const surplus = k.takeHome - (k.expenses || 0) - k.minPay;
    const outflow = investing + (plan.efMonthly || 0) + (plan.extraDebt || 0);
    if (k.expenses != null && surplus < 0)
      add("high", `Their known spending and minimum payments are ${usd(-surplus)}/mo more than their take-home pay${c.collected.takeHome ? "" : " (take-home is only estimated from the intake form — confirm it)"}.`, "Start with the budget: confirm their real take-home and find spending cuts before funding goals.");
    else if (k.expenses != null && outflow > 0 && outflow > surplus + 1) add("high", `The plan needs ${usd(outflow)}/mo but their known surplus is only ${usd(surplus)}/mo.`, "Scale back savings targets, stretch timelines, or find spending cuts together.");
    const ep = c.estatePlan || {};
    if (c.kids.some((x) => x.age < 18) && val(c, "estate-guardian") !== "yes" && !ep.guardian) add("med", "Minor children and no guardian on record.", "Recommend a will that names a guardian (Estate tab).");
    if (val(c, "estate-benef") === "no" && !ep.benef) add("med", "Beneficiaries may be out of date — they override the will.", "Recommend reviewing beneficiaries on every account (Estate tab).");
    if ((c.kids.length || c.married) && val(c, "insurance") !== "has a policy") add("med", "They have dependents and no confirmed life insurance.", "Recommend reviewing term life insurance.");
    return flags;
  }
  function riskHasEvidence(c, qi) {
    if (Array.isArray(val(c, "riskq"))) return true;
    if (qi <= 1) return !!c.collected.risk;
    if (qi === 2) return collectedGoals(c).some((g) => g.years != null);
    if (qi === 3) return true; // job info is on the intake form
    return val(c, "k401") != null || val(c, "roth") != null;
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
    const ra = plan.riskAnswers || [];
    const off = (t.riskAnswers || []).filter((a, i) => ra[i] == null || Math.abs(ra[i] - a) > 1).length;
    part("Risk profile & allocation", 15, (diff <= 10 ? 10 : diff <= 20 ? 7 : diff <= 35 ? 3 : 0) + Math.max(0, 5 - off * 1.5), `Your risk answers matched the client on ${5 - off} of 5 questions. Allocation ${plan.alloc.stocks}/${plan.alloc.bonds}/${plan.alloc.cash} vs. their real profile (${model.name}).`, `Their own answers: ${(t.riskAnswers || []).map((a, i) => RISK_QS[i][1][a]).join(" · ")} → about ${model.stocks}/${model.bonds}/${model.cash}.`);
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
      { id: "docs", label: "Ask for their documents", me: /\b(documents?|statements?|pay ?stubs?|paperwork|tax return|questionnaire)\b/i },
      { id: "next", label: "Summarize & agree next steps", me: /\b(next step|follow up|next meeting|send you|summari[sz]e|to recap|homework|bring)\b/i },
    ],
    followup: [
      { id: "reconnect", label: "Reconnect briefly", me: /\b(thanks|good to (hear|talk|see)|how are you|how have you been)\b/i },
      { id: "gaps", label: "Fill the missing information", gaps: true },
      { id: "docs", label: "Collect outstanding documents", me: /\b(documents?|statements?|pay ?stubs?|paperwork|tax return|questionnaire)\b/i },
      { id: "anything", label: "Ask if anything else changed or matters", me: /\b(anything else|any other|changed|forgot|missing)\b/i },
      { id: "next", label: "Set up the plan presentation", me: /\b(next (step|meeting|time)|present|plan together|go over the plan|follow up)\b/i },
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
  // The agenda for THIS client's next meeting: the facts you're missing, the documents still out,
  // the news they emailed about, and (for presentations) each of their goals.
  const SEC_ASK = { "Cash flow": "Cash flow", Assets: "Savings", Retirement: "Retirement accounts", Risk: "Risk tolerance", Protection: "Insurance", Debts: "Debts", Goals: "Goals" };
  const words = (name) => String(name).toLowerCase().replace(/[’']s\b/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/^(with|from|their|before|about|years?|fund|goal|plan|save|amount|away)$/.test(w));
  function agendaFor(c, type, sc = null) {
    const F = fields(c).filter((f) => !c.collected[f.key] && !(c.difficulty === "tough" && f.hidden));
    const missing = F.filter((f) => !f.hidden && f.key !== "riskq");
    const docsOut = docsOf(c).filter((d) => d.status !== "received").map((d) => d.name);
    const news = [...(c.pendingEvents || [])];
    const gapItems = [...new Set(missing.map((f) => f.sec))].map((sec) => {
      const keys = missing.filter((f) => f.sec === sec).map((f) => f.key);
      const labels = missing.filter((f) => f.sec === sec).map((f) => f.label.replace(/^Goal: /, "").replace(/ \/ month$/, "").replace(/ \((amount|years away)\)$/, ""));
      const head = SEC_ASK[sec] || sec;
      const body = `${[...new Set(labels)].slice(0, 4).join(", ")}${new Set(labels).size > 4 ? "…" : ""}`;
      return { id: "gap-" + sec, label: body.toLowerCase().startsWith(head.toLowerCase()) ? body : `${head}: ${body}`, need: keys };
    });
    const docItem = docsOut.length ? [{ id: "docs", label: `Collect: ${docsOut.slice(0, 3).join(", ").toLowerCase()}${docsOut.length > 3 ? ` +${docsOut.length - 3} more` : ""}`, me: /\b(documents?|statements?|pay ?stubs?|paperwork|tax return|questionnaire|policy|policies|send (me|over)|email me)\b/i }] : [];
    const newsItems = news.map((e, i) => ({ id: "news-" + i, label: `Follow up on their news: ${e.text.replace(c.first + "'s ", "their ").replace(c.first + " ", "")}`, me: new RegExp(`\\b(${[...words(e.text), "congrat", "sorry to hear", "how are you holding", "what happened", "tell me (more|about)"].join("|")})`, "i") }));
    const extra = [
      ...(sc?.guest ? [{ id: "guest", label: `Include ${sc.guest.name} (their ${sc.guest.rel}) — ask what they think`, me: new RegExp(`\\b${sc.guest.name}\\b`, "i") }] : []),
      ...(sc?.news ? [{ id: "news-mkt", label: `If they ask: explain “${sc.news.head}”`, me: new RegExp(`\\b(${[...words(sc.news.topic || ""), "long.term", "diversif", "normal", "volatil", "headline", "the news"].join("|")})`, "i") }] : []),
    ];
    const intrItem = sc?.interrupt ? [{ id: "steer", label: "If you get interrupted: be gracious, then steer back", me: /\b(no (problem|worries)|take your time|everything (okay|alright)|anyway|back to|where were we|as I was saying|let's get back|no rush)\b/i }] : [];
    if (type === "hard")
      return [
        { id: "empathy", label: "Lead with empathy before numbers", me: /\b(sorry|understand|that's (hard|tough|a lot)|i hear you|take your time|how are you (holding|doing))\b/i },
        { id: "honest", label: "Be honest, with real numbers", me: /\$|\d|\b(numbers|budget|math|the plan shows)\b/i },
        { id: "options", label: "Offer options, not orders", me: /\b(option|choice|could|we can|either|or we|what if|one way)\b/i },
        { id: "nopressure", label: "No pressure or rushed big decisions", not: /\b(you have to|you must|right now|immediately|today or)\b/i },
        { id: "next", label: "Agree on a small next step", me: /\b(next step|this week|let's|follow up|check in|i'll send|schedule)\b/i },
      ];
    if (type === "call")
      return [
        { id: "greet", label: "Answer warmly", me: /\b(hi|hello|hey|good to hear|how can I help|what's going on|of course)\b/i },
        { id: "listen", label: "Ask what's behind the question", me: /\b(what (made|happened|prompted)|tell me (more|about)|why do you ask|what's (making|got) you|how (are|do) you feel)\b/i },
        { id: "answer", label: "Answer simply, tied to their plan", me: /\b(plan|goals?|long.term|diversif|budget|emergency|on track)\b/i },
        { id: "safe", label: "No guarantees or hot tips", not: /\b(guarantee|can't lose|risk.?free|you should buy|definitely buy)\b/i },
        ...extra.filter((a) => a.id !== "guest"),
        ...intrItem,
        { id: "next", label: "Agree on a next step", me: /\b(next|follow up|send you|I'll|email you|our meeting|let's (talk|meet)|schedule)\b/i },
      ];
    if (type === "followup")
      return [
        ...extra,
        { id: "reconnect", label: "Reconnect briefly", me: /\b(thanks|good to (hear|talk|see)|how are you|how have you been)\b/i },
        ...newsItems,
        ...intrItem,
        ...(gapItems.length ? gapItems : [{ id: "confirm", label: "Confirm nothing has changed", me: /\b(anything (else|new)|changed|still the same|confirm)\b/i }]),
        ...docItem,
        { id: "anything", label: "Ask if there's anything else on their mind", me: /\b(anything else|any other|forgot|missing|on your mind)\b/i },
        { id: "next", label: c.plan?.submittedAt ? "Set up the plan presentation" : "Tell them you'll build the plan and present it", me: /\b(next (step|meeting|time)|present|plan together|go over the plan|follow up|put together|build)\b/i },
      ];
    if (type === "review") {
      const recheck = gapItems.filter((g) => !/^gap-Goals$/.test(g.id));
      return [
        { id: "changes", label: news.length ? "Open: ask how things are going" : "What's changed in their life?", me: /\b(what('s| has) changed|anything new|since we|update|how have you been|how's|how are)\b/i },
        ...extra,
        ...newsItems,
        ...intrItem,
        ...recheck.map((g) => ({ ...g, label: "Re-check " + g.label })),
        ...c.truth.goals.filter((g) => !g.hidden && c.collected["goal-" + g.id]).slice(0, 4).map((g) => ({ id: "prog-" + g.id, label: `Progress: ${g.name}`, me: new RegExp(`\\b(${words(g.name).join("|") || "goal"})`, "i") })),
        ...(c.truth.debts.length && c.collected[`debt-${c.truth.debts[0].id}`] ? [{ id: "debts", label: "Debt progress", me: /\b(debt|card|loan|balance)\b/i }] : []),
        { id: "invest", label: "Portfolio & rebalancing", me: /\b(portfolio|rebalanc|market|stocks?|invest)\b/i },
        { id: "personal", label: "Remember personal details", personal: true },
        ...docItem,
        { id: "adjust", label: "Adjust the plan", me: /\b(adjust|change the plan|increase|lower|update the plan|instead)\b/i },
        { id: "next", label: "Schedule the next review", me: /\b(next (review|meeting)|follow up|see you in|check in)\b/i },
      ];
    }
    if (type === "presentation") {
      const p = c.plan || {};
      const goals = collectedGoals(c).filter((g) => g.target != null);
      return [
        { id: "recap", label: "Recap their goals & situation", me: /\b(recap|last time|you told me|you mentioned|your goals?)\b/i },
        ...newsItems,
        ...extra,
        ...intrItem,
        ...(p.efMonthly ? [{ id: "ef", label: `Emergency fund: ${usd(p.efMonthly)}/mo`, me: /\bemergency|rainy day|cushion\b/i }] : []),
        ...(p.extraDebt ? [{ id: "debt", label: `Debt payoff: extra ${usd(p.extraDebt)}/mo (${p.debtStrategy === "snowball" ? "snowball" : "highest rate first"})`, me: /\b(debt|pay off|avalanche|snowball|card|loan)\b/i }] : []),
        { id: "retire", label: p.k401Pct != null ? `Retirement: ${p.k401Pct}% to the 401(k)` : "Retirement & employer match", me: /\b(401|match|retire)\b/i },
        { id: "invest", label: p.alloc ? `Investment mix: ${p.alloc.stocks}% stocks / ${p.alloc.bonds}% bonds — why it fits` : "Investment mix & why it fits", me: /\b(stocks?|bonds?|portfolio|invest|allocation|mix|risk)\b/i },
        ...goals.filter((g) => g.id !== "retire").slice(0, 5).map((g) => ({ id: "g-" + g.id, label: `Goal: ${g.name}${p.goalSavings?.[g.id] ? ` — ${usd(+p.goalSavings[g.id])}/mo` : ""}`, me: new RegExp(`\\b(${words(g.name).join("|") || "goal"})`, "i") })),
        { id: "check", label: "Check understanding & comfort", me: /\b(make sense|questions|comfortable|how do you feel|does that|sound good|thoughts)\b/i },
        { id: "next", label: "Implementation steps & next review", me: /\b(next step|set up|open|start|review|follow up|in (three|3|six|6) months)\b/i },
      ];
    }
    return AGENDA.discovery.filter((a) => a.id !== "docs" || docsOut.length);
  }
  // Live agenda status for a meeting in progress.
  function agendaStatus(c, type, thread, sc = null) {
    const now = extract(c, thread);
    const found = { ...c.collected, ...now };
    const mine = thread.filter((t) => t.from === "me").map((t) => t.text).join(" ");
    const before = c.meetings;
    return agendaFor(c, type, sc).map((a) => {
      if (a.not) return { ...a, done: mine.length > 0 && !a.not.test(mine) };
      let done = false;
      if (a.need) {
        const got = a.need.filter((k) => now[k]).length;
        done = got >= Math.min(a.need.length, Math.max(1, Math.ceil(a.need.length * 0.6)));
        return { ...a, done, progress: `${got}/${a.need.length}` };
      }
      if (a.keys) done = Object.keys(found).some((k) => a.keys.test(k));
      if (!done && a.me) done = a.me.test(mine);
      if (a.personal) done = before.length > 0 && remembered(c, thread, before).length > 0;
      return { ...a, done };
    });
  }

  return { HARD, CONCEPTS, coachLines, estateOf, MOODS, marketNews, aiFacts, migrate, makeFeasible, worriesNow, agendaFor, notesFor: (c) => hiddenNotes(c, "email"), EVENTS, lifeEvent, MEETING_NAME, requestDocs, docsOf, STYLES, AGENDA, agendaStatus, all, find, update, saveAll, generate, fields, extract, advance, dateOf, persona, meetingType, scenario, recordMeeting, known, payoff, monteCarlo, needed90, mix, RISK_QS, MODELS, riskScore, STRESS, stress, jobLossRunway, compliance, grade, usd, pctS, val, fieldLabel, collectedGoals };
})();
