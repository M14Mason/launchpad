// Personal chance estimates. Every estimate starts from a real published acceptance rate (or a clearly
// labeled type-based estimate) and is adjusted for Mason's verified profile. These are estimates, not
// admissions statistics — the app always shows the base rate and each adjustment.

const pct = (x) => Math.max(1, Math.min(97, Math.round(x * 100)));
// Treat the profile multiplier like "extra tries": 1 - (1 - base)^m keeps small rates small.
const adjust = (base, m) => 1 - Math.pow(1 - base / 100, m);

function allRoles() {
  return companies().flatMap((c) => c.roles.map((r) => ({ c, r })));
}
function findRole(id) {
  return allRoles().find((x) => x.r.id === id);
}
function roleRate(r) {
  return r.rate || { v: RATE_TIERS.selective, src: "estimate", tier: "selective" };
}

// Skills that a role's keywords point at, with their Skill Bank scores.
function relatedSkills(role, bank) {
  return allSkills(bank)
    .filter((s) => role.keywords.some((k) => k.term.toLowerCase() === s.name.toLowerCase() || hits(k, s.name)))
    .map((s) => ({ s, sc: cachedSkillScore(s, bank) }));
}

const FIELD_EXPERIENCE = {
  tech: { v: 1, why: "Three self-built apps (trading bot, Keen, Titan) in Python" },
  finance: { v: 1, why: "Live trading bot, 100+ backtested strategies, 3 edX trading certificates, Business Finance concentration" },
  business: { v: 0.7, why: "Built and ran your own products; Marketing and Intro to Business coursework" },
  research: { v: 0.6, why: "Backtesting 100+ strategies is data-driven experimentation" },
  arts: { v: 0.9, why: "Two photography awards and 10,000+ edited photos" },
  health: { v: 0.2, why: "No health or science experience in your data yet" },
  gov: { v: 0.3, why: "No government or policy experience in your data yet" },
  community: { v: 0.4, why: "Customer-facing car-washing job; no volunteering in your data yet" },
};

function internshipChance(role, bank = getBank()) {
  const rate = roleRate(role);
  const status = role.eligibility.status;
  const resume = buildResume(role, bank, getSettings());
  const score = scoreResume(resume, role);
  const weight = (arr) => arr.reduce((n, k) => n + (k.req ? 2 : 1), 0);
  const coverage = role.keywords.length ? weight(score.matched) / weight(role.keywords) : 0.5;
  const related = relatedSkills(role, bank);
  const skillStrength = related.length ? related.reduce((n, x) => n + x.sc.total, 0) / related.length / 100 : 0.35;
  const exp = FIELD_EXPERIENCE[role.field || role.category] || FIELD_EXPERIENCE.community;
  const gpa = 1; // 4.0

  const fit = 0.4 * coverage + 0.25 * skillStrength + 0.15 * gpa + 0.2 * exp.v;
  const m = 0.6 + 1.4 * fit;
  const potentialFit = 0.4 * 1 + 0.25 * Math.max(skillStrength, 0.85) + 0.15 * gpa + 0.2 * Math.max(exp.v, 0.7);
  const mPot = 0.6 + 1.4 * potentialFit;

  const factors = [
    { label: "Resume keyword match", value: `${Math.round(coverage * 100)}%`, good: coverage >= 0.6, note: `${score.matched.length}/${role.keywords.length} keywords this kind of role screens for` },
    { label: "Related skill strength", value: `${Math.round(skillStrength * 100)}/100`, good: skillStrength >= 0.55, note: related.length ? related.map((x) => `${x.s.name} ${x.sc.total}`).join(" · ") : "No skill in your bank matches this role directly" },
    { label: "Relevant experience", value: exp.v >= 0.8 ? "Strong" : exp.v >= 0.5 ? "Some" : "Thin", good: exp.v >= 0.6, note: exp.why },
    { label: "Academics", value: "4.0 GPA", good: true, note: "Top of the range for any GPA cutoff" },
  ];

  const improve = [];
  for (const k of score.missing.filter((k) => k.req))
    improve.push({ text: `Show ${k.term} — it's a core keyword and nothing in your resume says it.`, skill: allSkills(bank).find((s) => s.name.toLowerCase() === k.term.toLowerCase())?.id });
  for (const { s, sc } of related.filter((x) => x.sc.total < 55))
    improve.push({ text: `Raise ${s.name} (${sc.total}/100) — answer the coach's questions to add a proven bullet.`, skill: s.id });
  const thin = thinFlags(bank).filter((f) => !f.startsWith("Soft skills") && !f.startsWith("AI-Assisted"));
  if (thin.length) improve.push({ text: thin[0] });
  for (const k of score.missing.filter((k) => !k.req).slice(0, 2)) improve.push({ text: `Nice-to-have: ${k.term}.` });
  if (status === "check") improve.unshift({ text: "First confirm you meet the requirement flagged above — the estimate assumes you do." });
  if (!improve.length) improve.push({ text: "Your profile already covers what this role screens for — focus on a strong application and interview." });

  const base = rate.v;
  return {
    status,
    base,
    rate,
    chance: status === "ineligible" ? 0 : pct(adjust(base, m)),
    potential: status === "ineligible" ? 0 : pct(adjust(base, mPot)),
    multiplier: m,
    factors,
    improve: improve.slice(0, 6),
    score,
  };
}

function collegeChance(col, bank = getBank()) {
  const skills = allSkills(bank).map((s) => cachedSkillScore(s, bank).total);
  const skillAvg = skills.reduce((a, b) => a + b, 0) / skills.length;
  const provenBullets = bank.bullets.length;
  const factors = [
    { label: "GPA", value: "4.0", effect: 0.35, good: true, note: "Maxed — keep it through junior year, when grades count most." },
    { label: "Course rigor", value: "1 honors class so far", effect: 0.05, good: false, note: "Selective schools expect the hardest courses available (AP/honors) in 11th–12th." },
    { label: "Standout projects", value: "Trading bot · Keen (30,000 questions) · Titan", effect: 0.25, good: true, note: "Self-built software with real scale is a genuine 'spike'." },
    { label: "Awards", value: "County / regional", effect: 0.05, good: false, note: "Two photography awards; no state or national-level recognition yet." },
    { label: "Proven skills (Skill Bank)", value: `${Math.round(skillAvg)}/100`, effect: (skillAvg / 100) * 0.15 + Math.min(0.1, provenBullets * 0.02), good: skillAvg >= 55, note: "How well your skills are backed by real, specific evidence." },
    { label: "Test scores", value: "Not in your data", effect: 0, good: null, note: col.uc ? "UCs are test-blind, so this doesn't matter here." : "Many schools weigh SAT/ACT again — a strong score helps." },
    { label: "Leadership / impact", value: "Not in your data", effect: 0, good: false, note: "No leadership role, club, or community impact recorded yet." },
  ];
  let m = 1 + factors.reduce((n, f) => n + f.effect, 0);
  const elite = col.rate < 10;
  if (elite) m = Math.min(m, 1.7); // holistic admissions: even great stats move the needle less
  const mPot = elite ? 2.3 : 2.8;

  const improve = [
    "Take the most rigorous courses you can in 11th–12th (AP/honors math, CS, economics).",
    "Turn a project into measurable impact: real users for Keen, a documented track record for the bot.",
    "Earn state or national recognition — e.g. the Wharton Investment Competition or a national economics challenge.",
    "Take on a leadership role (start or lead a club — an investing or coding club fits your story).",
    col.uc ? "Plan your UC Personal Insight Questions around your projects — UCs are test-blind." : "Prepare for the SAT/ACT; a high score helps at test-optional schools.",
    "Keep building your Skill Bank so essays and interviews have specific, true stories.",
  ];
  return {
    base: col.rate,
    chance: pct(adjust(col.rate, m)),
    potential: pct(adjust(col.rate, mPot)),
    multiplier: m,
    factors,
    improve,
    elite,
  };
}

// Month number (0–11) of the first month named in a deadline string, or null.
function deadlineMonth(text) {
  const m = String(text || "").match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
  return m ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].toLowerCase()) : null;
}
function monthsAway(text) {
  const m = deadlineMonth(text);
  if (m === null) return null;
  const now = new Date().getMonth();
  return (m - now + 12) % 12;
}

// Scores only change when the Skill Bank changes, so cache them against its saved contents.
const _memo = { key: null, skill: {}, role: {}, college: {} };
function memoFresh() {
  let k = "";
  try {
    k = localStorage.getItem("rb.bank") || "";
  } catch {}
  if (k !== _memo.key) Object.assign(_memo, { key: k, skill: {}, role: {}, college: {} });
}
function cachedSkillScore(s, bank) {
  memoFresh();
  return (_memo.skill[s.id] ||= skillScore(s, bank));
}
function cachedChance(role) {
  memoFresh();
  return (_memo.role[role.id] ||= internshipChance(role));
}
function cachedCollegeChance(col) {
  memoFresh();
  return (_memo.college[col.id] ||= collegeChance(col));
}
