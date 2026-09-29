// Resume engine: builds resumes ONLY from PROFILE + Mason's own Skill Bank answers, then scores them.

const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("rb." + key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("rb." + key, JSON.stringify(value));
    } catch {}
  },
};

function getBank() {
  return Object.assign({ answers: [], bullets: [], customSkills: [], genQuestions: {} }, Store.get("bank", {}));
}
function saveBank(bank) {
  Store.set("bank", bank);
}
function getSettings() {
  return Object.assign({ phone: "", apiKey: "", model: "claude-opus-5" }, Store.get("settings", {}));
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- keyword matching ----------
// An alias ending in * is a prefix ("collaborat*"); otherwise it must match a whole word/phrase.
const _aliasCache = new Map();
function aliasRegex(alias) {
  if (_aliasCache.has(alias)) return _aliasCache.get(alias);
  const re = makeAliasRegex(alias);
  _aliasCache.set(alias, re);
  return re;
}
function makeAliasRegex(alias) {
  const prefix = alias.endsWith("*");
  const word = (prefix ? alias.slice(0, -1) : alias).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![a-z0-9])" + word + (prefix ? "" : "(?![a-z0-9])"), "i");
}
function hits(keyword, text) {
  for (const a of keyword.any) if (aliasRegex(a).test(text)) return a.replace("*", "");
  return null;
}

// ---------- data access ----------
function allSkills(bank) {
  return [...BASE_SKILLS, ...bank.customSkills];
}

function itemIndex() {
  const idx = {};
  for (const p of PROFILE.projects) idx[p.id] = { label: p.title, short: p.title.split(" (")[0].split(" — ")[0], text: p.title + " " + p.bullets.join(" ") };
  for (const e of [...PROFILE.experience, ...PROFILE.internships])
    idx[e.id] = { label: `${e.title}${e.org ? ", " + e.org : ""}`, short: e.title, text: e.title + " " + e.bullets.join(" ") };
  for (const c of PROFILE.certifications) idx[c.id] = { label: c.text, short: "edX: " + c.text.split(" — ")[0], text: c.text };
  for (const a of PROFILE.awards) idx[a.id] = { label: a.text, short: a.text.split(" — ")[0], text: a.text };
  return idx;
}

// Items that can hold resume bullets (Skill Bank bullets attach to one of these).
function attachableItems() {
  return [
    ...PROFILE.projects.map((p) => ({ id: p.id, label: p.title })),
    ...PROFILE.internships.map((i) => ({ id: i.id, label: `${i.title}, ${i.org} (no details yet)` })),
    ...PROFILE.experience.map((e) => ({ id: e.id, label: e.title })),
  ];
}

function withBankBullets(item, bank) {
  return {
    ...item,
    bullets: [
      ...item.bullets.map((t) => ({ text: t, src: "data:" + item.id })),
      ...bank.bullets.filter((b) => b.itemId === item.id).map((b) => ({ text: b.text, src: "bank:" + b.id, fromBank: true })),
    ],
  };
}

// ---------- resume ----------
function buildResume(role, bank, settings) {
  const kws = role ? role.keywords : [];
  const relevance = (t) => kws.reduce((n, k) => n + (hits(k, t) ? (k.req ? 2 : 1) : 0), 0);
  const stableSort = (arr, f) =>
    arr.map((x, i) => ({ x, i, s: f(x) })).sort((a, b) => b.s - a.s || a.i - b.i).map((o) => o.x);
  const itemText = (it) => it.title + " " + it.bullets.map((b) => b.text).join(" ");
  const tailor = (items) =>
    role ? stableSort(items, (it) => relevance(itemText(it))).map((it) => ({ ...it, bullets: stableSort(it.bullets, (b) => relevance(b.text)) })) : items;

  const projects = tailor(PROFILE.projects.map((p) => withBankBullets(p, bank)));
  const experience = tailor([
    ...PROFILE.internships.map((i) => withBankBullets(i, bank)).filter((i) => i.bullets.length),
    ...PROFILE.experience.map((e) => withBankBullets(e, bank)),
  ]);

  const skills = allSkills(bank);
  const skillNames = (type) => {
    const names = skills.filter((s) => s.type === type).map((s) => s.name);
    return role ? stableSort(names, relevance) : names;
  };

  const e = PROFILE.education;
  return {
    header: {
      name: PROFILE.name,
      line1: [PROFILE.location, settings.phone, PROFILE.email].filter(Boolean),
      line2: [PROFILE.linkedin, PROFILE.portfolio],
    },
    summary: role ? stableSort(PROFILE.summary, relevance) : PROFILE.summary,
    projects,
    certifications: PROFILE.certifications.map((c) => c.text),
    awards: PROFILE.awards.map((a) => a.text),
    skills: { technical: skillNames("technical"), soft: skillNames("soft"), languages: PROFILE.languages },
    education: [
      `${e.school}, ${e.city} | Class of ${e.gradYear}`,
      `GPA: ${e.gpa} | ${e.concentration} concentration`,
      `Relevant coursework: ${e.coursework.join(", ")}`,
      ...e.notes,
    ],
    experience,
  };
}

function itemHeading(it) {
  const org = it.org ? `, ${it.org}` : "";
  const place = it.place ? ` | ${it.place}` : "";
  return `${it.title}${org}${place} | ${it.dates}`;
}

function resumeToText(r) {
  const out = [];
  const sec = (t) => out.push("", t.toUpperCase());
  out.push(r.header.name.toUpperCase(), r.header.line1.join(" | "), r.header.line2.join(" | "));
  sec("Summary");
  out.push(r.summary.join(" "));
  sec("Projects");
  for (const p of r.projects) out.push(itemHeading(p), ...p.bullets.map((b) => "- " + b.text));
  sec("Certifications");
  out.push(...r.certifications.map((c) => "- " + c));
  sec("Awards");
  out.push(...r.awards.map((a) => "- " + a));
  sec("Skills");
  out.push("Technical: " + r.skills.technical.join(", "), "Soft skills: " + r.skills.soft.join(", "), "Languages: " + r.skills.languages.join(", "));
  sec("Education");
  out.push(...r.education);
  sec("Experience");
  for (const x of r.experience) out.push(itemHeading(x), ...x.bullets.map((b) => "- " + b.text));
  return out.join("\n");
}

function resumeToHTML(r) {
  const list = (items) => `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  const items = (arr) =>
    arr
      .map(
        (it) => `<div class="r-item"><div class="r-item-head"><strong>${esc(it.title)}${it.org ? ", " + esc(it.org) : ""}</strong>
        <span>${esc([it.place, it.dates].filter(Boolean).join(" | "))}</span></div>
        <ul>${it.bullets.map((b) => `<li${b.fromBank ? ' class="from-bank" title="From your Skill Bank"' : ""}>${esc(b.text)}</li>`).join("")}</ul></div>`
      )
      .join("");
  return `
    <h1>${esc(r.header.name)}</h1>
    <p class="r-contact">${r.header.line1.map(esc).join(" | ")}<br>${r.header.line2.map(esc).join(" | ")}</p>
    <h2>Summary</h2><p>${esc(r.summary.join(" "))}</p>
    <h2>Projects</h2>${items(r.projects)}
    <h2>Certifications</h2>${list(r.certifications)}
    <h2>Awards</h2>${list(r.awards)}
    <h2>Skills</h2>
    <p><strong>Technical:</strong> ${esc(r.skills.technical.join(", "))}<br>
       <strong>Soft skills:</strong> ${esc(r.skills.soft.join(", "))}<br>
       <strong>Languages:</strong> ${esc(r.skills.languages.join(", "))}</p>
    <h2>Education</h2><p>${r.education.map(esc).join("<br>")}</p>
    <h2>Experience</h2>${items(r.experience)}`;
}

// ---------- scoring (rubric: 5 x 20 = 100) ----------
function scoreResume(r, role) {
  const text = resumeToText(r);
  const bullets = [...r.projects, ...r.experience].flatMap((i) => i.bullets);
  const sourced = bullets.filter((b) => b.src).length;
  const metric = bullets.filter((b) => /\d/.test(b.text)).length;
  const metricRatio = metric / bullets.length;

  const matched = [];
  const missing = [];
  if (role)
    for (const k of role.keywords) {
      const via = hits(k, text);
      (via ? matched : missing).push({ ...k, via });
    }
  const weight = (arr) => arr.reduce((n, k) => n + (k.req ? 2 : 1), 0);
  const coverage = role && role.keywords.length ? weight(matched) / weight(role.keywords) : 0;

  const topItems = [...r.projects, ...r.experience].slice(0, 3);
  const topRelevant = role ? topItems.filter((it) => role.keywords.some((k) => hits(k, it.title + " " + it.bullets.map((b) => b.text).join(" ")))).length / topItems.length : 0;

  const accuracy = Math.round((20 * sourced) / bullets.length);
  const impact = Math.round(8 + 12 * Math.min(1, metricRatio / 0.5));
  const ats = role ? Math.round(6 + 14 * coverage) : 16;
  const relevanceScore = role ? Math.round(20 * (0.5 * coverage + 0.5 * topRelevant)) : 15;
  const noInflation = 20;
  const total = accuracy + impact + ats + relevanceScore + noInflation;

  const bankCount = bullets.filter((b) => b.fromBank).length;
  return {
    total,
    verdict: total >= 80 ? "Ready to submit" : total >= 60 ? "Needs targeted edits" : "Likely to miss ATS screening",
    rows: [
      { name: "Accuracy", score: accuracy, note: `${sourced}/${bullets.length} bullets cite your data block${bankCount ? ` or your own Skill Bank answers (${bankCount})` : ""}.` },
      { name: "Impact", score: impact, note: `${metric}/${bullets.length} bullets contain a concrete number. More verified numbers = higher impact.` },
      { name: "ATS Compat", score: ats, note: role ? `Plain single-column format; ${matched.length}/${role.keywords.length} keywords matched (required keywords count double).` : "Plain single-column format with standard headings. Pick a role to score keyword match." },
      { name: "Relevance", score: relevanceScore, note: role ? `${Math.round(topRelevant * topItems.length)}/${topItems.length} top items match the role's keywords.` : "General master resume — not aimed at a specific role." },
      { name: "No Inflation", score: noInflation, note: "Built only from verified lines. Nothing reworded into bigger claims." },
    ],
    matched,
    missing,
  };
}

// Weak spots in the data block that a recruiter will notice.
function thinFlags(bank) {
  const flags = [];
  for (const it of [...PROFILE.projects, ...PROFILE.experience]) {
    const b = withBankBullets(it, bank).bullets;
    if (!b.some((x) => /\d/.test(x.text))) flags.push(`${it.title}: no numbers anywhere (users, hours, customers, uptime, results…).`);
  }
  if (!bank.bullets.some((b) => b.itemId === "photo"))
    flags.push("Freelance Photographer: “100+ followers” is a small number to headline — paid clients, shoots, or photos delivered would be stronger if you have them.");
  if (!bank.bullets.some((b) => b.itemId === "bakerave")) flags.push("Baker Ave internship: hidden from resumes until you add a real bullet about your work (Skill Bank → any skill → link it to Baker Ave).");
  const soft = BASE_SKILLS.filter((s) => s.type === "soft" && !s.evidence.length && !bank.bullets.some((b) => b.skillId === s.id));
  if (soft.length) flags.push(`Soft skills with no proof yet: ${soft.map((s) => s.name).join(", ")}. Recruiters skip unproven soft skills.`);
  if (!bank.bullets.some((b) => b.skillId === "ai-dev")) flags.push("AI-Assisted Development is listed as a skill but nothing in your data shows it yet.");
  return flags;
}

// ---------- skill meaningfulness (0–100) ----------
function skillScore(skill, bank) {
  const idx = itemIndex();
  const ev = (skill.evidence || []).filter((id) => idx[id]);
  const bankBullets = bank.bullets.filter((b) => b.skillId === skill.id);
  const answers = bank.answers.filter((a) => a.skillId === skill.id && a.answer.trim());

  const proofCount = ev.length + bankBullets.length;
  const evidencePts = proofCount ? Math.min(45, 30 + (proofCount - 1) * 10) : 0;
  const metricCount = ev.filter((id) => /\d/.test(idx[id].text)).length + bankBullets.filter((b) => /\d/.test(b.text)).length;
  const metricPts = metricCount ? Math.min(20, 15 + (metricCount - 1) * 5) : 0;

  const openRoles = COMPANIES.flatMap((c) => c.roles).filter((r) => r.eligibility.status !== "ineligible");
  const wanted = openRoles.filter((r) => r.keywords.some((k) => k.term.toLowerCase() === skill.name.toLowerCase() || hits(k, skill.name))).length;
  const demandPts = Math.round(Math.min(20, (20 * wanted) / Math.max(1, openRoles.length * 0.4)));
  const depthPts = Math.min(9, answers.length * 3) + (bankBullets.length ? 6 : 0);

  const total = evidencePts + metricPts + demandPts + depthPts;
  const tips = [];
  if (!proofCount) tips.push("Nothing in your data proves this yet. Answer the questions, then add one real bullet.");
  if (!metricCount) tips.push("Add a number you can verify (count, time, result, rank).");
  if (demandPts < 10) tips.push("Few high-school roles in your list screen for this — lead with other skills on applications.");
  if (answers.length < 3) tips.push("Answer at least 3 questions to build an interview story.");
  return {
    total,
    label: !proofCount ? "Unsupported" : total >= 70 ? "Strong" : total >= 45 ? "Solid" : "Needs proof",
    parts: [
      { name: "Evidence", pts: evidencePts, max: 45, note: `${ev.length} data-block item(s) + ${bankBullets.length} Skill Bank bullet(s)` },
      { name: "Proof (numbers)", pts: metricPts, max: 20, note: `${metricCount} item(s) with a concrete number` },
      { name: "Demand", pts: demandPts, max: 20, note: `${wanted}/${openRoles.length} open-to-you roles screen for it` },
      { name: "Depth", pts: depthPts, max: 15, note: `${answers.length} answered question(s)` },
    ],
    evidenceLabels: ev.map((id) => idx[id].short),
    tips,
  };
}

// Question templates for "Improve skill". Answers are Mason's own words and become verified data.
const BASE_QUESTIONS = [
  "Describe one specific time you used {skill}. What was the situation?",
  "What exactly did YOU do? List the steps or decisions you personally made.",
  "What was the result? Include any number you can verify (count, time saved, score, rank, users).",
  "What tools, methods, or resources did you use?",
  "What was hard about it, and how did you get past it?",
];
const EXTRA_QUESTIONS = {
  python: ["Which Python libraries or frameworks have you used, and in which project?"],
  backtesting: ["What historical data range did you backtest on, and what metric did you use to compare strategies?"],
  "trading-systems": ["How long has the bot been running, and is it paper trading or live? How do you catch failures?"],
  "technical-analysis": ["Pick one indicator you use (EMA, RSI, or ATR). Explain what it measures and why you use it."],
  lightroom: ["Walk through your editing workflow for one shoot. About how many photos do you edit per shoot?"],
  retouching: ["Describe a photo you retouched heavily. What did you fix and why?"],
  composition: ["What compositional choice made your County Fair winning photo work?"],
  "portfolio-dev": ["How do you decide which photos go into your portfolio?"],
  "social-media": ["Which platform(s) do you post on? What content got the most engagement (numbers you can verify)?"],
  "ai-dev": ["Which AI tools do you use while building apps, and for which parts of the work?"],
  "time-management": ["Describe a specific week where you balanced school, your projects, and work. How did you plan it?"],
  "problem-solving": ["Describe a bug or problem you couldn't solve at first. How did you eventually figure it out?"],
  "self-motivated": ["What have you built or learned without anyone asking you to? What got you started?"],
  "attention-to-detail": ["Describe a time catching a small mistake mattered."],
  teamwork: ["Describe a time you worked with others toward a shared goal (job, class, team, sport). What was your role?"],
};
function skillQuestions(skill, bank) {
  return [
    ...BASE_QUESTIONS.map((q) => q.replace("{skill}", skill.name)),
    ...(EXTRA_QUESTIONS[skill.id] || []),
    ...(bank.genQuestions[skill.id] || []),
  ];
}

// ---------- interview practice ----------
function interviewQuestions(role, resume) {
  const top = resume.projects[0];
  const facts = (id) => {
    const item = [...resume.projects, ...resume.experience].find((i) => i.id === id);
    return item ? item.bullets.map((b) => b.text) : [];
  };
  const byCategory = {
    tech: [
      { type: "Behavioral", q: `Tell me about a time you solved a technical problem while building ${top.title.split(" (")[0]}.`, points: facts(top.id) },
      { type: "Behavioral", q: "Describe how you approached learning Python on your own.", points: [...facts("bot").slice(0, 1), ...facts("titan").slice(1, 2)] },
      { type: "Technical", q: "Walk me through how you backtested your trading bot's strategies.", points: facts("bot").filter((t) => /backtest|risk|dashboard/i.test(t)) },
    ],
    finance: [
      { type: "Behavioral", q: "Tell me about a time you solved a technical problem while building your trading bot.", points: facts("bot") },
      { type: "Behavioral", q: "Describe how you approached learning technical analysis.", points: [...PROFILE.certifications.map((c) => c.text), ...facts("bot").filter((t) => /EMA|RSI|ATR/.test(t))] },
      { type: "Technical", q: "Explain the risk controls in your bot to someone unfamiliar with trading.", points: facts("bot").filter((t) => /risk|stop/i.test(t)) },
    ],
    community: [
      { type: "Behavioral", q: "Tell me about a time you changed how you worked based on someone's feedback.", points: facts("carwash") },
      { type: "Behavioral", q: "Describe how you approached learning photography and building your portfolio.", points: [...facts("photo"), ...PROFILE.awards.map((a) => a.text)] },
      { type: "Technical", q: "Explain how your Keen study app helps students learn, as if to someone who has never used a study app.", points: facts("keen") },
    ],
  };
  return byCategory[role?.category] || byCategory.community;
}

// ---------- pasted postings ----------
function analyzePosting(text) {
  const keywords = SKILL_VOCAB.filter((k) => hits(k, text)).map((k) => ({ ...k, req: true }));
  const collegeOnly = /(undergraduate|college student|university student|pursuing a (bachelor|degree)|rising (junior|senior) in college|enrolled in (a )?(college|university))/i.test(text) && !/high school/i.test(text);
  const adultOnly = /(must be|at least) 18/i.test(text);
  const juniorsOnly = /(high school )?(juniors? (and|or) seniors?)/i.test(text);
  let status = "eligible";
  let reason = "No college-only or age-18 requirement detected. Double-check the posting's eligibility section.";
  if (collegeOnly) (status = "ineligible"), (reason = "The posting asks for college/university students.");
  else if (adultOnly) (status = "ineligible"), (reason = "The posting requires applicants to be 18+.");
  else if (juniorsOnly) (status = "soon"), (reason = "The posting is for high school juniors/seniors — you can apply as a junior (2027–28).");
  return { keywords, eligibility: { status, reason } };
}

// ---------- rewrite fact-check ----------
// A reworded bullet is accepted only if it keeps the same numbers and adds no new tool/skill/proper noun
// that isn't already somewhere in Mason's verified data.
function dataBlockText(bank) {
  return resumeToText(buildResume(null, bank, { phone: "" })) + " " + bank.answers.map((a) => a.answer).join(" ");
}
function verifyRewrite(original, rewritten, dataText, allowed = []) {
  const ok = (a) => allowed.some((x) => x.toLowerCase() === a.replace("*", "").toLowerCase());
  const nums = (s) => (s.replace(/,/g, "").match(/\d+(\.\d+)?/g) || []).sort().join("|");
  if (nums(original) !== nums(rewritten)) return "changed or added a number";
  if (rewritten.length > original.length * 1.8 + 40) return "grew too much (possible inflation)";
  const lowerData = dataText.toLowerCase();
  for (const k of SKILL_VOCAB)
    for (const a of k.any)
      if (!ok(a) && aliasRegex(a).test(rewritten) && !aliasRegex(a).test(original) && !aliasRegex(a).test(lowerData)) return `added “${k.term}”, which isn't in your data`;
  const caps = rewritten.match(/(?<=\s)[A-Z][A-Za-z0-9+#.-]{2,}/g) || [];
  for (const w of caps) if (!ok(w) && !lowerData.includes(w.toLowerCase())) return `added “${w}”, which isn't in your data`;
  return null;
}
function applyRewrites(resume, map) {
  const swap = (items) =>
    items.map((it) => ({
      ...it,
      bullets: it.bullets.map((b) => (map[b.text] ? { ...b, text: map[b.text], original: b.text, reworded: true } : b)),
    }));
  return { ...resume, projects: swap(resume.projects), experience: swap(resume.experience) };
}

// Numbers in `text` that don't appear anywhere in `source`.
function numbersNotIn(text, source) {
  const norm = (s) => s.replace(/,/g, "");
  const src = norm(source);
  return [...new Set(norm(text).match(/\d+(\.\d+)?/g) || [])].filter((n) => !new RegExp("(?<![\d.])" + n.replace(".", "\.") + "(?![\d])").test(src));
}

// Descriptive terms a rewrite may add when the role asks for them (they describe work already in the data).
// Tools (Excel, SQL, Java…) are never allowed unless they're already in Mason's data.
const FRAMING_TERMS = ["data analysis", "analytics", "programming", "coding", "finance", "financial", "investing", "trading", "automation", "automated", "problem solving", "software development"];
function allowedRewriteTerms(keywords) {
  return keywords.flatMap((k) => k.any.map((a) => a.replace("*", ""))).filter((a) => FRAMING_TERMS.includes(a.toLowerCase()));
}
