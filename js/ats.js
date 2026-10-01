// ATS + recruiter scoring. Deterministic and instant, so scores move live as the resume is edited.
// Evidence the weights lean on (shown in the app):
//  - Jobscan: aim for a ~75%+ keyword match; resumes with the posting's exact job title saw ~3.5× the interview rate.
//  - Ladders eye-tracking (2018): recruiters' first scan averages ~7.4s and favors clear sections + simple layouts.
//  - Standard ATS parsing guidance: conventional section headings, contact info as text, dates on every entry, single column.

const ATS_SOURCES = [
  { label: "Jobscan — match-rate guidance & job-title finding", url: "https://www.jobscan.co/jobscan-tutorial" },
  { label: "Ladders eye-tracking study (2018)", url: "https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html" },
];

const VERBS = new Set(
  (
    "achieve analyze architect automate backtest build calculate capture coach collaborate compare compile compute conduct configure coordinate create cut debug deliver deploy design detail develop direct document drive edit engineer establish evaluate execute expand forecast found generate grow guide identify implement improve increase integrate investigate launch lead maintain manage measure mentor model monitor negotiate optimize organize own pitch plan present produce program prototype publish raise rank reduce refactor research resolve restructure retest review reword run save scale schedule scrape ship simulate solve spearhead streamline structure support teach test track train transform troubleshoot tune validate visualize win write adjust wash place host sell"
  )
    .split(" ")
    // Every plausible past-tense spelling (edit→edited, plan→planned, deploy→deployed, apply→applied).
    .flatMap((v) => [v, v + "s", v.endsWith("e") ? v + "d" : v + "ed", v + v.at(-1) + "ed", v.endsWith("y") ? v.slice(0, -1) + "ied" : v])
    .concat("built ran led grew wrote made won taught drove began sold took spoke set kept found shipped owned placed self-hosted".split(" "))
);
const WEAK = /^(responsible for|helped|assisted|worked on|duties|tasked|participated|involved in|includes?|core|various|utilized)\b/i;
const RESULT_WORDS = /\b(increas|reduc|grew|grow|improv|sav|cut|won|rank|plac|achiev|doubl|tripl|faster|boost|rais|prevent|select)/i;
const STOP_TITLE = new Set("the of and for in at a an to with high school student students summer program programs intern interns internship internships scholars scholar academy institute experience research-based".split(" "));

function resumeBullets(r) {
  return [...r.projects, ...r.experience].flatMap((it, ii) => it.bullets.map((b, bi) => ({ ...b, item: it, ii, bi })));
}

function analyzeBullet(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const first = (words[0] || "").toLowerCase().replace(/[^a-z-]/g, "");
  const issues = [];
  const verb = VERBS.has(first);
  const metric = /\d/.test(text);
  if (WEAK.test(text)) issues.push({ k: "weak", msg: `Weak opening (“${words.slice(0, 2).join(" ")}”) — lead with what you did` });
  else if (!verb) issues.push({ k: "verb", msg: "Start with a strong action verb (Built, Designed, Tested…)" });
  if (/^(i|my|me|we)\b/i.test(text)) issues.push({ k: "pronoun", msg: "Drop first-person words (I, my) — resumes are implied first person" });
  if (!metric) issues.push({ k: "metric", msg: "No number — add a real count, time, %, rank or result if you have one" });
  if (words.length > 30) issues.push({ k: "long", msg: `${words.length} words — keep bullets under ~2 lines (≈25 words)` });
  if (words.length < 5) issues.push({ k: "short", msg: "Too short to show impact" });
  return { words: words.length, verb, metric, result: RESULT_WORDS.test(text), issues };
}

function keywordContext(k, r) {
  const work = resumeBullets(r).map((b) => b.text).join(" ") + " " + [...r.projects, ...r.experience].map((i) => i.title).join(" ");
  const skillsText = [...r.skills.technical, ...r.skills.soft].join(", ") + " " + r.summary.join(" ");
  const inWork = hits(k, work);
  const inSkills = hits(k, skillsText) || hits(k, r.education.join(" ") + " " + r.certifications.join(" "));
  return { via: inWork || inSkills, inWork: !!inWork };
}

// How an ATS would read the plain-text version of this resume.
function atsParse(r, settings = getSettings()) {
  const text = resumeToText(r);
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0];
  const phone = (text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/) || [])[0];
  const linkedin = (text.match(/linkedin\.com\/in\/[\w-]+/i) || [])[0];
  const gpa = (r.education.join(" ").match(/GPA:?\s*([\d.]+)/i) || [])[1];
  const sections = ["Summary", "Projects", "Certifications", "Awards", "Skills", "Education", "Experience"].filter((h) => new RegExp("^" + h.toUpperCase() + "$", "m").test(text));
  return {
    fields: [
      ["Name", r.header.name],
      ["Email", email],
      ["Phone", phone || (settings.phone ? settings.phone : "")],
      ["Location", r.header.line1[0]],
      ["LinkedIn", linkedin],
      ["Education", r.education[0]?.split("|")[0].trim()],
      ["GPA", gpa],
      ["Skills found", `${r.skills.technical.length + r.skills.soft.length}`],
      ["Entries with dates", `${[...r.projects, ...r.experience].filter((i) => /\d{4}/.test(i.dates || "")).length}/${r.projects.length + r.experience.length}`],
    ],
    sections,
  };
}

function scoreAll(r, target) {
  const keywords = target?.keywords?.length ? target.keywords : TYPICAL_KEYWORDS[{ finance: "finance", tech: "tech" }[goal()] || "finance"];
  const bullets = resumeBullets(r).map((b) => ({ ...b, a: analyzeBullet(b.text) }));
  const nB = Math.max(1, bullets.length);
  const metricPct = bullets.filter((b) => b.a.metric).length / nB;
  const verbPct = bullets.filter((b) => b.a.verb && !WEAK.test(b.text)).length / nB;
  const problemPct = bullets.filter((b) => b.a.issues.some((i) => ["long", "short", "pronoun", "weak"].includes(i.k))).length / nB;
  const text = resumeToText(r);
  const words = text.split(/\s+/).filter(Boolean).length;
  const summaryWords = r.summary.join(" ").split(/\s+/).filter(Boolean).length;
  const parse = atsParse(r);
  const field = (n) => parse.fields.find((f) => f[0] === n)?.[1];

  // keywords
  const kw = keywords.map((k) => ({ ...k, ...keywordContext(k, r) }));
  const w = (k) => (k.req ? 2 : 1);
  const totalW = kw.reduce((n, k) => n + w(k), 0) || 1;
  const kwScore = kw.reduce((n, k) => n + (k.via ? w(k) * (k.inWork ? 1 : 0.7) : 0), 0) / totalW;
  const matchRate = Math.round((kw.filter((k) => k.via).reduce((n, k) => n + w(k), 0) / totalW) * 100);
  const req = kw.filter((k) => k.req);
  const reqInWork = req.length ? req.filter((k) => k.inWork).length / req.length : 1;

  // job title alignment
  const titleTokens = (target?.title || "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_TITLE.has(t));
  const titleHits = titleTokens.filter((t) => new RegExp("\\b" + t, "i").test(text));
  const titleScore = titleTokens.length ? titleHits.length / titleTokens.length : 1;

  const dated = [...r.projects, ...r.experience].filter((i) => /\d{4}/.test(i.dates || "")).length / Math.max(1, r.projects.length + r.experience.length);
  const headings = ["Summary", "Education", "Skills"].filter((h) => parse.sections.includes(h)).length + (parse.sections.includes("Experience") || parse.sections.includes("Projects") ? 1 : 0);

  const ats = [
    { key: "kw", label: "Keyword match", max: 40, score: 40 * kwScore, detail: `${matchRate}% match (aim for 75%+). Keywords inside your bullets count more than a skills list.` },
    { key: "title", label: "Job title alignment", max: 10, score: 10 * titleScore, detail: titleTokens.length ? `${titleHits.length}/${titleTokens.length} title words (${titleTokens.join(", ")}) appear` : "No target title selected" },
    { key: "parse", label: "Parseability", max: 20, score: headings * 2 + (field("Email") ? 2 : 0) + (field("Phone") ? 2 : 0) + (field("Location") ? 1 : 0) + (field("LinkedIn") ? 1 : 0) + 3 * dated + 3, detail: `${headings}/4 standard headings · contact ${["Email", "Phone", "Location", "LinkedIn"].filter((f) => field(f)).length}/4 · single column` },
    { key: "content", label: "Action verbs & metrics", max: 15, score: 8 * Math.min(1, metricPct / 0.5) + 7 * verbPct, detail: `${Math.round(metricPct * 100)}% of bullets have a number · ${Math.round(verbPct * 100)}% start with a strong verb` },
    { key: "length", label: "Length & formatting", max: 15, score: (words >= 300 && words <= 800 ? 8 : words < 300 ? 8 * (words / 300) : 6) + 7 * (1 - problemPct), detail: `${words} words · ${bullets.filter((b) => b.a.issues.some((i) => ["long", "short", "pronoun", "weak"].includes(i.k))).length} bullets with format issues` },
  ];

  const first = [...r.projects, ...r.experience][0];
  const firstRelevant = first ? kw.some((k) => k.req && hits(k, first.title + " " + first.bullets.map((b) => b.text).join(" "))) : false;
  const avgWords = bullets.reduce((n, b) => n + b.a.words, 0) / nB;
  const resultBullets = bullets.filter((b) => b.a.result && b.a.metric).length;
  const recruiter = [
    { key: "scan", label: "7-second scan", max: 25, score: (r.summary.join("").trim() ? 6 : 0) + (summaryWords && summaryWords <= 60 ? 6 : 0) + (firstRelevant ? 8 : 0) + (field("Email") && field("Phone") ? 5 : field("Email") ? 3 : 0), detail: `Summary ${summaryWords} words · top entry ${firstRelevant ? "matches" : "doesn't match"} the role` },
    { key: "impact", label: "Impact & evidence", max: 25, score: 15 * Math.min(1, metricPct / 0.5) + 10 * Math.min(1, resultBullets / 3), detail: `${resultBullets} bullet${resultBullets === 1 ? "" : "s"} show a measurable result` },
    { key: "relevance", label: "Relevance to role", max: 20, score: 20 * (0.5 * reqInWork + 0.5 * kwScore), detail: `${req.filter((k) => k.inWork).length}/${req.length} core keywords appear in your experience` },
    { key: "clarity", label: "Clarity", max: 15, score: (avgWords >= 9 && avgWords <= 24 ? 8 : 4) + ([...r.projects, ...r.experience].every((i) => i.bullets.length <= 6) ? 4 : 1) + (bullets.some((b) => WEAK.test(b.text)) ? 0 : 3), detail: `Average bullet ${Math.round(avgWords)} words` },
    { key: "complete", label: "Completeness", max: 15, score: (field("GPA") ? 4 : 0) + (r.skills.technical.length + r.skills.soft.length >= 6 ? 3 : 1) + (field("LinkedIn") ? 3 : 0) + (r.awards.length + r.certifications.length ? 3 : 0) + (r.projects.length + r.experience.length >= 3 ? 2 : 0), detail: "Education + GPA, skills, links, awards/certifications" },
  ];
  const sum = (arr) => Math.round(arr.reduce((n, p) => n + Math.min(p.max, Math.max(0, p.score)), 0));
  ats.forEach((p) => (p.score = Math.round(Math.min(p.max, p.score))));
  recruiter.forEach((p) => (p.score = Math.round(Math.min(p.max, p.score))));

  // Prioritized fixes (estimated points recoverable)
  const fixes = [];
  const missingReq = kw.filter((k) => k.req && !k.via);
  const skillsOnly = kw.filter((k) => k.via && !k.inWork);
  missingReq.forEach((k) => fixes.push({ pts: Math.round((40 * w(k)) / totalW), text: `Missing core keyword “${k.term}”. Only add it if it's true — prove it in the Skill Bank, or learn it.` }));
  skillsOnly.slice(0, 3).forEach((k) => fixes.push({ pts: Math.max(1, Math.round((40 * w(k) * 0.3) / totalW)), text: `“${k.term}” only appears in your skills list — show it inside a bullet where you actually used it.` }));
  if (titleTokens.length && titleScore < 1) fixes.push({ pts: Math.round(10 * (1 - titleScore)), text: `Mention the role you're targeting (“${target.title}”) in your summary — exact titles help ATS ranking (Jobscan).` });
  if (!field("Phone")) fixes.push({ pts: 2, text: "No phone number — add it in Settings so recruiters and ATS can reach you." });
  if (!field("LinkedIn")) fixes.push({ pts: 3, text: "Add your LinkedIn URL to the header." });
  const noMetric = bullets.filter((b) => !b.a.metric).length;
  if (metricPct < 0.5) fixes.push({ pts: Math.round(8 * (1 - metricPct / 0.5)) + 3, text: `${noMetric} bullets have no number. Add real counts/results (users, hours, %, rank) where you have them.` });
  const weakVerb = bullets.filter((b) => !b.a.verb || WEAK.test(b.text)).length;
  if (weakVerb) fixes.push({ pts: Math.round(7 * (weakVerb / nB)) + 1, text: `${weakVerb} bullet${weakVerb === 1 ? "" : "s"} don't start with a strong action verb.` });
  if (!firstRelevant && first) fixes.push({ pts: 8, text: "Your top entry doesn't match the role — move your most relevant project first (recruiters scan the top third most)." });
  if (summaryWords > 60) fixes.push({ pts: 6, text: `Summary is ${summaryWords} words — trim to under 60 for a 7-second scan.` });
  fixes.sort((a, b) => b.pts - a.pts);

  return {
    ats: { score: sum(ats), parts: ats },
    recruiter: { score: sum(recruiter), parts: recruiter },
    matchRate,
    keywords: kw,
    bullets,
    fixes: fixes.slice(0, 8),
    parse,
    stats: { words, bullets: bullets.length, metricPct, verbPct },
  };
}
