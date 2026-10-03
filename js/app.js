// Launchpad UI — hash-routed views:
// #dashboard · #internships · #internship/<id> · #generate/<id> · #colleges · #college/<id>
// #skills · #coach/<skillId> · #resumes · #resume/<id> · #settings

const app = document.getElementById("app");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");

// ---------- navigation (built from the icon set) ----------
const NAV = [
  { group: "Overview" },
  { id: "dashboard", icon: "home", label: "Dashboard", short: "Home" },
  { group: "Opportunities" },
  { id: "internships", icon: "briefcase", label: "Programs", short: "Programs" },
  { id: "tracker", icon: "clipboard", label: "Tracker", short: "Tracker", more: true },
  { id: "colleges", icon: "cap", label: "Colleges", short: "Colleges", more: true },
  { group: "Prepare" },
  { id: "studio", icon: "file", label: "Resume Studio", short: "Studio" },
  { id: "skills", icon: "award", label: "Skill Bank", short: "Skills", more: true },
  { id: "study", icon: "book", label: "Study", short: "Study" },
  { id: "clients", icon: "users", label: "Client book", short: "Clients", more: true },
  { id: "markets", icon: "trend", label: "Markets", short: "Markets", more: true },
  { id: "brand", icon: "users", label: "Pitch & LinkedIn", short: "Pitch", more: true },
  { id: "settings", icon: "settings", label: "Settings", short: "Settings", more: true, bottom: true },
];
(function buildNav() {
  document.querySelector(".logo").innerHTML = icon("trend");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.getElementById("open-palette").innerHTML = `${icon("search")}<span>Search</span><kbd>${isMac ? "⌘" : "Ctrl"} K</kbd>`;
  document.getElementById("nav").innerHTML =
    `<span class="nav-indicator"></span>` +
    NAV.map((n) =>
      n.group
        ? `<div class="nav-group">${n.group}</div>`
        : `<a href="#${n.id}" data-nav="${n.id}" class="${n.more ? "more-item" : ""} ${n.bottom ? "nav-bottom" : ""}">${icon(n.icon)}<span class="lbl">${n.label}</span><span class="lbl-s">${n.short}</span></a>`
    ).join("") +
    `<button type="button" id="nav-more" class="nav-more" aria-haspopup="true" aria-expanded="false">${icon("more")}<span class="lbl-s">More</span></button>`;
})();
// ---------- theme: System / Light / Dark ----------
function applyTheme(t) {
  const root = document.documentElement;
  if (t === "dark" || t === "light") root.setAttribute("data-theme", t);
  else root.removeAttribute("data-theme");
  const dark = t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#09090b" : "#fafafa");
  document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.themeBtn === (t || "system"))));
}
function setTheme(t) {
  Store.set("settings", { ...getSettings(), theme: t });
  applyTheme(t);
}
(function buildThemeSwitch() {
  const el = document.getElementById("theme-switch");
  el.innerHTML = [
    ["system", "monitor", "System"],
    ["light", "sun", "Light"],
    ["dark", "moon", "Dark"],
  ]
    .map(([k, i, l]) => `<button type="button" role="radio" data-theme-btn="${k}" title="${l}" aria-label="${l} theme">${icon(i)}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-btn]");
    if (b) setTheme(b.dataset.themeBtn);
  });
  applyTheme(getSettings().theme || "system");
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyTheme(getSettings().theme || "system"));
})();

function moveNavIndicator() {
  const a = document.querySelector("#nav a.active");
  const ind = document.querySelector(".nav-indicator");
  if (!ind || window.innerWidth <= 860) return;
  if (!a) return (ind.style.opacity = 0);
  const props = { y: a.offsetTop, height: a.offsetHeight, opacity: 1 };
  if (window.gsap && !Motion.reduced) gsap.to(ind, { ...props, duration: ind.style.opacity === "1" ? 0.35 : 0, ease: "power3.out" });
  else Object.assign(ind.style, { transform: `translateY(${props.y}px)`, height: props.height + "px", opacity: 1 });
  ind.style.opacity = "1";
}
window.addEventListener("resize", () => moveNavIndicator());

const STATUS_LABEL ={ eligible: "Eligible", check: "Check requirements", soon: "Not yet", ineligible: "Not eligible" };
const STATUS_RANK = { eligible: 0, check: 1, soon: 2, ineligible: 3 };
const KIND_LABEL = { internship: "Internship", research: "Research", program: "Program", competition: "Competition", virtual: "Virtual", volunteer: "Volunteer" };

const state = {
  filters: { q: "", status: "open", where: "any", pay: "any", field: "all", kind: "all", sort: "foryou" },
  colFilter: { set: "all", sort: "chance" },
  skillFilter: "all",
};

function companies() {
  return [...COMPANIES, ...Store.get("aiCompanies", [])];
}
function findCompany(id) {
  return companies().find((c) => c.id === id);
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2800);
}

async function busy(btn, fn) {
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Working…`;
  try {
    await fn();
  } catch (e) {
    toast(e.message || String(e));
    console.error(e);
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.innerHTML = html;
    }
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- small UI pieces ----------
function chanceTone(p) {
  return p >= 60 ? "good" : p >= 25 ? "accent" : p >= 8 ? "warn" : "bad";
}
function ring(value, { size = 56, label, tone, suffix = "%" } = {}) {
  const t = tone || chanceTone(value);
  return `<div class="ring tone-${t}" style="--p:${Math.max(0, Math.min(100, value))};--size:${size}px"><span>${label ?? value + suffix}</span></div>`;
}
function statusBadge(s) {
  return `<span class="badge ${s}">${STATUS_LABEL[s]}</span>`;
}
function chanceCell(r, ch) {
  if (r.eligibility.status === "ineligible") return `<div class="ring tone-muted" style="--p:0;--size:52px"><span>—</span></div>`;
  return ring(ch.chance, { size: 52 });
}
function rateLine(rate) {
  return rate.src === "reported" ? `${rate.v}% <span class="muted">(reported: ${esc(rate.note)})</span>` : `~${rate.v}% <span class="muted">(estimate for a ${rate.tier} ${rate.tier === "entry" ? "sign-up" : "program"})</span>`;
}
function empty(msg) {
  return `<div class="card empty">${msg}</div>`;
}

// ---------- router ----------
const NAV_FOR = { dashboard: "dashboard", tracker: "tracker", internships: "internships", internship: "internships", generate: "internships", colleges: "colleges", college: "colleges", skills: "skills", coach: "skills", resumes: "studio", resume: "studio", studio: "studio", settings: "settings", study: "study", lesson: "study", roleplay: "study", mock: "study", practice: "study", quiz: "study", profile: "colleges", session: "study", exam: "study", cases: "study", case: "study", markets: "markets", brand: "brand", clients: "clients", client: "clients" };
function route() {
  const [view = "dashboard", ...rest] = location.hash.slice(1).split("/");
  const id = decodeURIComponent(rest.join("/"));
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === (NAV_FOR[view] || "dashboard")));
  document.getElementById("nav-more")?.classList.toggle("active", !!document.querySelector("#nav a.more-item.active"));
  moveNavIndicator();
  const views = { dashboard: renderDashboard, internships: renderInternships, internship: renderInternship, generate: renderGenerate, colleges: renderColleges, college: renderCollege, skills: renderSkills, coach: renderCoach, resumes: renderResumes, resume: renderResumeView, settings: renderSettings, pair: renderPair, tracker: renderTracker, study: (id) => (id ? renderTrack(id) : renderStudy()), lesson: renderLesson, roleplay: () => go("practice/networking"), mock: () => go("practice/interview"), practice: renderPractice, quiz: renderQuiz, profile: renderCollegeProfile, studio: renderStudio, markets: renderMarkets, brand: renderBrand, session: renderSession, exam: renderExam, cases: renderCases, case: renderCase, clients: renderClients, client: renderClient };
  // Leaving a page stops any live mic, dictation, replay or spoken question.
  if (dictate.rec) dictate.rec.stop();
  try {
    dictateInto.l?.stop();
    wireMicCheck.l?.stop();
    replayThread.on = false;
    if (view !== "exam") clearInterval(drawExam._t);
  } catch {}
  try {
    Voice.cancel();
    if (P.phase === "live" && view !== "practice") {
      P.listener?.stop();
      Mic.close();
      P.listening = false;
      P.status = "Paused — tap the mic when you are back.";
      P.orb = "tap";
      P.speaking = false;
    }
  } catch {}
  (views[view] || renderDashboard)(id);
  const animate = !route.keepScroll && !route.quiet;
  if (!route.keepScroll) window.scrollTo(0, 0);
  route.keepScroll = route.quiet = false;
  closeMoreMenu();
  if (animate) {
    Motion.page();
    if ((views[view] ? view : "dashboard") === "dashboard") Motion.hero(app.querySelector(".hero"));
  }
}
window.addEventListener("hashchange", route);
function go(hash) {
  if (location.hash === "#" + hash) route();
  else location.hash = hash;
}

// Phones: the bottom bar shows the main tabs; "More" opens the rest.
function closeMoreMenu() {
  const m = document.getElementById("more-menu");
  if (!m || m.hidden) return;
  m.hidden = true;
  document.getElementById("nav-more")?.setAttribute("aria-expanded", "false");
}
document.getElementById("nav-more")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const m = document.getElementById("more-menu");
  if (!m.hidden) return closeMoreMenu();
  m.innerHTML = [...document.querySelectorAll("#nav a.more-item")]
    .map((a) => `<a href="${a.getAttribute("href")}" class="${a.classList.contains("active") ? "active" : ""}">${a.querySelector("svg").outerHTML}<span>${a.querySelector(".lbl").textContent}</span></a>`)
    .join("") + `<button type="button" id="more-search">${icon("search")}<span>Search</span></button>`;
  document.getElementById("more-search").onclick = () => {
    closeMoreMenu();
    openPalette();
  };
  m.hidden = false;
  e.currentTarget.setAttribute("aria-expanded", "true");
  if (window.gsap && !Motion.reduced) {
    gsap.fromTo(m, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25, ease: "power2.out", clearProps: "transform,opacity,visibility" });
    Motion.ensureVisible([m], 600);
  }
});
document.addEventListener("click", (e) => !e.target.closest("#more-menu") && closeMoreMenu());
document.getElementById("open-palette").addEventListener("click", () => openPalette());

// ================= DASHBOARD =================
function readiness() {
  const bank = getBank();
  const master = scoreResume(buildResume(null, bank, getSettings()), null).total;
  const skills = allSkills(bank).map((s) => cachedSkillScore(s, bank).total);
  const skillAvg = Math.round(skills.reduce((a, b) => a + b, 0) / skills.length);
  const reps = Object.values(Store.get("practice", {})).filter((t) => t && t.trim().length > 40).length;
  // Interview readiness: your recent spoken-practice scores when you have them, otherwise written practice reps.
  const spoken = (study().sessions || []).slice(0, 5);
  const interview = spoken.length ? Math.round(spoken.reduce((n, s) => n + s.score, 0) / spoken.length) : Math.min(100, 20 + reps * 16);
  return { master, skillAvg, reps, interview, total: Math.round(0.4 * master + 0.35 * skillAvg + 0.25 * interview) };
}

function nextMoves() {
  const bank = getBank();
  const moves = [];
  const open = allRoles().filter(({ r }) => r.eligibility.status === "eligible");
  const urgent = open
    .map((x) => ({ ...x, away: monthsAway(x.r.deadline), ch: cachedChance(x.r) }))
    .filter((x) => x.away !== null && x.away <= 2)
    .sort((a, b) => goalFit(b.r) - goalFit(a.r) || a.away - b.away || b.ch.chance - a.ch.chance);
  const t = tracker();
  const dueTracked = Object.entries(t)
    .filter(([, v]) => v.date && !["applied", "interview", "accepted", "rejected"].includes(v.status) && daysUntil(v.date) >= 0 && daysUntil(v.date) <= 21)
    .sort((a, b) => daysUntil(a[1].date) - daysUntil(b[1].date))[0];
  if (dueTracked) moves.push({ tag: "Due", text: `${dueTracked[1].org}: ${dueLabel(daysUntil(dueTracked[1].date))}. Finish and submit your application.`, href: `#internship/${dueTracked[0]}` });
  if (urgent[0]) moves.push({ tag: "Apply", text: `Apply to ${urgent[0].r.org} — ${urgent[0].r.title}. Deadline: ${urgent[0].r.deadline}. Your chance ≈ ${urgent[0].ch.chance}%.`, href: `#internship/${urgent[0].r.id}` });
  const weakDemand = allSkills(bank)
    .map((s) => ({ s, sc: cachedSkillScore(s, bank) }))
    .filter((x) => x.sc.parts[2].pts >= 8)
    .sort((a, b) => a.sc.total - b.sc.total)[0];
  if (weakDemand) moves.push({ tag: "Skill", text: `Prove ${weakDemand.s.name} (${weakDemand.sc.total}/100) — roles you're targeting screen for it.`, href: `#coach/${weakDemand.s.id}` });
  const flag = thinFlags(bank)[0];
  if (flag) moves.push({ tag: "Resume", text: flag, href: "#skills" });
  const top = open
    .map((x) => ({ ...x, ch: cachedChance(x.r) }))
    .filter((x) => x.r.kind === "internship" || x.r.kind === "research")
    .sort((a, b) => forYouScore(b.r, b.ch) - forYouScore(a.r, a.ch))[0];
  if (top) moves.push({ tag: "Resume", text: `Generate a tailored resume for your top match: ${top.r.org} (${top.ch.chance}%).`, href: `#generate/${top.r.id}` });
  if (!AI.enabled()) moves.push({ tag: "Setup", text: "Add a Claude API key to unlock live role research, keyword rewording and the smart coach.", href: "#settings" });
  const reps = Object.values(Store.get("practice", {})).filter((t) => t && t.trim().length > 40).length;
  if (reps < 3) moves.push({ tag: "Interview", text: "Practice 3 interview answers — open any generated resume and scroll to Interview practice.", href: top ? `#generate/${top.r.id}` : "#internships" });
  return moves.slice(0, 5);
}

function renderDashboard() {
  const r = readiness();
  const open = allRoles().filter(({ r }) => r.eligibility.status === "eligible").map((x) => ({ ...x, ch: cachedChance(x.r) }));
  const top = open.filter((x) => x.r.kind !== "virtual" && x.r.kind !== "volunteer").sort((a, b) => forYouScore(b.r, b.ch) - forYouScore(a.r, a.ch)).slice(0, 6);
  // Tracked programs with exact dates come first, then typical deadlines for your goal.
  const tracked = Object.entries(tracker())
    .filter(([, v]) => v.date && daysUntil(v.date) >= 0 && !["accepted", "rejected"].includes(v.status))
    .map(([id, v]) => ({ found: findRole(id), v }))
    .filter((x) => x.found)
    .map(({ found, v }) => ({ r: { ...found.r, org: found.r.org || found.c.name }, ch: cachedChance(found.r), label: dueLabel(daysUntil(v.date)), days: daysUntil(v.date) }))
    .sort((a, b) => a.days - b.days);
  const trackedIds = new Set(tracked.map((x) => x.r.id));
  const typical = open
    .map((x) => ({ ...x, away: monthsAway(x.r.deadline), label: x.r.deadline }))
    .filter((x) => x.away !== null && x.away <= 3 && !trackedIds.has(x.r.id))
    .sort((a, b) => goalFit(b.r) - goalFit(a.r) || a.away - b.away);
  const soon = [...tracked, ...typical].slice(0, 5);
  const cols = ["col-uc-san-diego", "col-ucla", "col-usc"].map((id) => COLLEGES.find((c) => c.id === id)).filter(Boolean);

  const heads = remindersHTML();
  app.innerHTML = `
    <section class="hero">
      <div class="hero-text">
        <div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1>Hi Mason — here's where you stand.</h1>
        <p>10th grade · Canyon Crest Academy · Class of 2029 · 4.0 GPA</p>
        <div class="row"><a class="btn light" href="#internships">Explore programs ${icon("arrow")}</a><a class="btn glass" href="#studio">Open Resume Studio</a></div>
      </div>
      <div class="hero-score">
        ${ring(r.total, { size: 132, label: r.total, tone: "hero" })}
        <div><div class="hero-score-label">Readiness</div><div class="hero-score-sub">${r.total >= 75 ? "Strong shape" : r.total >= 55 ? "Solid — room to grow" : "Building up"}</div></div>
      </div>
      <svg class="hero-art" viewBox="0 0 400 200" aria-hidden="true"><defs><linearGradient id="ha" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient></defs><path d="M0 170 C60 160 90 120 140 125 S220 90 260 70 S340 40 400 20" stroke="url(#ha)" stroke-width="3" fill="none"/><circle cx="260" cy="70" r="5" fill="#fff" fill-opacity=".6"/><circle cx="400" cy="20" r="7" fill="#fff" fill-opacity=".8"/></svg>
    </section>

    <div class="stats">
      ${[
        ["Resume", r.master, "Master resume score", "#resumes"],
        ["Skill proof", r.skillAvg, "Average Skill Bank score", "#skills"],
        ["Interview", r.interview, (study().sessions || []).length ? `Avg of your last ${Math.min(5, study().sessions.length)} spoken sessions` : "Try a spoken practice session", "#practice"],
        ["Open to you", open.length, "Programs you can apply to now", "#internships", true],
      ]
        .map(([k, v, sub, href, raw]) => `<a class="card stat" href="${href}"><div class="k">${k}</div><div class="stat-v">${v}${raw ? "" : '<span class="muted">/100</span>'}</div><div class="small muted">${sub}</div>${raw ? "" : `<div class="bar"><i style="width:${v}%"></i></div>`}</a>`)
        .join("")}
    </div>

    ${heads}
    <div class="two-col">
      <section class="card">
        <div class="section-head"><h2>Next moves</h2><span class="small muted">The actions that raise your odds most</span></div>
        <div class="moves">${nextMoves()
          .map((m) => `<a class="move" href="${m.href}"><span class="tag">${m.tag}</span><span>${esc(m.text)}</span><span class="chev">›</span></a>`)
          .join("")}</div>
      </section>
      <section class="card">
        <div class="section-head"><h2>Deadlines coming up</h2><a class="small" href="#internships">See all</a></div>
        ${
          soon.length
            ? `<div class="list compact">${soon
                .map(({ r, ch, label, days }) => `<a class="list-row" href="#internship/${r.id}">${ring(ch.chance, { size: 40 })}<div class="grow"><div class="row-title">${esc(r.org)}</div><div class="small muted">${esc(r.title)}</div></div><span class="pill ${days !== undefined && days <= 7 ? "pill-urgent" : ""}">${esc(label)}</span></a>`)
                .join("")}</div>`
            : `<p class="muted small">No eligible deadlines in the next 3 months.</p>`
        }
      </section>
    </div>

    ${keepSharpHTML()}

    <section>
      <div class="section-head"><h2>Best matches for ${esc(GOALS[goal()].label.toLowerCase())}</h2><a class="small" href="#settings">Change goal</a></div>
      <div class="grid cards3">${top
        .map(
          ({ r, ch }) => `<a class="card match" href="#internship/${r.id}">
            <div class="spread">${ring(ch.chance, { size: 58 })}<span class="pill">${KIND_LABEL[r.kind] || "Role"}</span></div>
            <div class="row-title">${esc(r.org)}</div><div class="small muted">${esc(r.title)}</div>
            <div class="small">${esc(r.location)} · ${esc(r.pay)}</div></a>`
        )
        .join("")}</div>
    </section>

    <section>
      <div class="section-head"><h2>College outlook</h2><a class="small" href="#colleges">All colleges</a></div>
      <div class="grid cards3">${cols
        .map((c) => {
          const ch = cachedCollegeChance(c);
          return `<a class="card match" href="#college/${c.id}"><div class="spread">${ring(ch.chance, { size: 58 })}<span class="pill">${c.rate}% admit</span></div><div class="row-title">${esc(c.name)}</div><div class="small muted">${esc(c.location)} · potential ${ch.potential}%</div></a>`;
        })
        .join("")}</div>
    </section>`;
  wireReminders();
}

// Daily habits strip: market brief, paper portfolio, last spoken practice, elevator pitch.
function keepSharpHTML() {
  const m = markets();
  const brief = m.briefs[todayKey()];
  const p = m.portfolio;
  const val = p ? portValue(p, Quotes.cache) : null;
  const last = (study().sessions || [])[0];
  const run = brand().runs[0];
  const tiles = [
    ["#markets/brief", "trend", "Market brief", brief ? "Read today's 3 stories" : "Today's brief is ready to write", brief ? "Done today" : "New"],
    ["#markets/paper", "gauge", "Paper portfolio", p ? `${money(val)} · ${val >= 10000 ? "+" : ""}${(((val - 10000) / 10000) * 100).toFixed(1)}%` : "Start with $10,000", p ? `${p.trades.length} trades` : "Try it"],
    ["#practice", "mic", "Spoken practice", last ? `Last: ${last.score}/100 · ${last.label}` : "Interview, sales, planning", last ? new Date(last.at).toLocaleDateString() : "Start"],
    ["#brand/pitch", "users", "Elevator pitch", run ? `Last take ${run.score}/100` : "Build your 30-second story", run ? "Practice again" : "Build it"],
  ];
  return `<section><div class="section-head"><h2>Keep sharp</h2><span class="small muted">10 minutes a day</span></div><div class="grid cards4">${tiles
    .map(([href, ic, t, sub, tag]) => `<a class="card sharp" href="${href}"><div class="spread"><div class="track-icon">${icon(ic)}</div><span class="pill">${esc(tag)}</span></div><div class="row-title">${t}</div><div class="small muted">${esc(sub)}</div></a>`)
    .join("")}</div></section>`;
}

// ================= INTERNSHIPS =================
const FILTERS = {
  status: [["open", "Open to me"], ["eligible", "Can apply now"], ["all", "Everything"]],
  where: [["any", "Anywhere"], ["remote", "Remote / online"], ["sd", "San Diego area"], ["ca", "California"]],
  pay: [["any", "Any pay"], ["paid", "Paid only"], ["nofee", "No fees"]],
  field: [["all", "All fields"], ["tech", "Tech / CS"], ["finance", "Finance"], ["business", "Business"], ["research", "Research"], ["health", "Health"], ["arts", "Arts / media"], ["gov", "Government"], ["community", "Community"]],
  kind: [["all", "All types"], ["internship", "Internships"], ["research", "Research"], ["program", "Programs"], ["competition", "Competitions"], ["virtual", "Virtual"], ["volunteer", "Volunteer"]],
  sort: [["foryou", "For you"], ["chance", "Best chance"], ["deadline", "Deadline soonest"], ["name", "A–Z"]],
};

function roleMatches(r) {
  const f = state.filters;
  const s = r.eligibility.status;
  if (f.status === "eligible" && s !== "eligible") return false;
  if (f.status === "open" && s === "ineligible") return false;
  const loc = `${r.location || ""} ${r.mode || ""}`;
  const sd = /san diego|la jolla|escondido/i.test(loc);
  if (f.where === "remote" && !/remote|online|virtual|hybrid/i.test(loc)) return false;
  if (f.where === "sd" && !sd) return false;
  if (f.where === "ca" && !(sd || /, CA\b|california/i.test(loc))) return false;
  const pay = r.pay || "";
  if (f.pay === "paid" && (!/(^paid|stipend|\/hr|salary|scholarship|\$\d)/i.test(pay) || /^(unpaid|fee)/i.test(pay))) return false;
  if (f.pay === "nofee" && /fee/i.test(pay)) return false;
  if (f.field !== "all" && (r.field || r.category) !== f.field) return false;
  if (f.kind !== "all" && r.kind !== f.kind) return false;
  if (f.q) {
    const hay = `${r.org} ${r.title} ${r.location || ""}`.toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function renderInternships() {
  const f = state.filters;
  const all = allRoles().map(({ c, r }) => ({ c, r: { ...r, org: r.org || c.name } }));
  let shown = all.filter(({ r }) => roleMatches(r)).map((x) => ({ ...x, ch: cachedChance(x.r) }));
  const sorters = {
    foryou: (a, b) => STATUS_RANK[a.r.eligibility.status] - STATUS_RANK[b.r.eligibility.status] || forYouScore(b.r, b.ch) - forYouScore(a.r, a.ch),
    chance: (a, b) => STATUS_RANK[a.r.eligibility.status] - STATUS_RANK[b.r.eligibility.status] || b.ch.chance - a.ch.chance,
    deadline: (a, b) => (monthsAway(a.r.deadline) ?? 99) - (monthsAway(b.r.deadline) ?? 99),
    name: (a, b) => a.r.org.localeCompare(b.r.org),
  };
  shown.sort(sorters[f.sort]);
  const select = (key) => `<select data-filter="${key}" aria-label="${key}">${FILTERS[key].map(([v, l]) => `<option value="${v}" ${f[key] === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;

  app.innerHTML = `
    <div class="page-head">
      <div><h1>Internships & programs</h1><p class="muted">${all.length} real programs · every chance is an estimate built on a real rate and your profile.</p></div>
      <div class="row"><button class="btn primary" id="find-new">${icon("sparkles")} Find new programs</button><button class="btn" id="add-company">+ Add a company</button></div>
    </div>
    <div class="card filterbar">
      <input type="search" id="search" placeholder="Search programs, companies, cities…" value="${esc(f.q)}">
      <div class="filter-selects">${Object.keys(FILTERS).map(select).join("")}</div>
      <div class="small muted">Showing <strong>${shown.length}</strong> of ${all.length}</div>
    </div>
    <div class="list">${
      shown
        .map(
          ({ r, ch }) => `<a class="list-row card" href="#internship/${encodeURIComponent(r.id)}">
            ${chanceCell(r, ch)}
            <div class="grow">
              <div class="row-title">${esc(r.org)}</div>
              <div class="row-sub">${esc(r.title)}</div>
              <div class="small muted">${esc([KIND_LABEL[r.kind], r.location, r.pay, r.deadline && "Deadline: " + r.deadline].filter(Boolean).join(" · "))}</div>
            </div>
            <div class="row-end">${statusBadge(r.eligibility.status)}<span class="chev">›</span></div>
          </a>`
        )
        .join("") || empty("No programs match these filters.")
    }</div>`;

  app.querySelectorAll("[data-filter]").forEach((s) => s.addEventListener("change", () => ((f[s.dataset.filter] = s.value), rerenderKeepScroll())));
  const search = document.getElementById("search");
  search.addEventListener("input", () => {
    f.q = search.value;
    clearTimeout(renderInternships._t);
    renderInternships._t = setTimeout(() => {
      renderInternships();
      const s = document.getElementById("search");
      s.focus();
      s.setSelectionRange(s.value.length, s.value.length);
    }, 200);
  });
  document.getElementById("add-company").addEventListener("click", openOtherCompany);
  document.getElementById("find-new").addEventListener("click", openProgramFinder);
}
function rerenderKeepScroll() {
  const y = window.scrollY;
  route.quiet = true;
  route();
  window.scrollTo(0, y);
}

function renderInternship(id) {
  const found = findRole(id);
  if (!found) return (app.innerHTML = empty(`Program not found. <a href="#internships">Back to internships</a>`));
  const r = { ...found.r, org: found.r.org || found.c.name };
  const ch = cachedChance(r);
  const research = Store.get("research", {})[r.id];
  const s = r.eligibility.status;
  const about = r.about || `${r.title} is ${/^(unpaid|free)/i.test(r.pay) ? "an unpaid" : /fee/i.test(r.pay) ? "a paid-to-attend" : "a paid"} ${(KIND_LABEL[r.kind] || "program").toLowerCase()} run by ${r.org} in ${r.location}.`;

  app.innerHTML = `
    <a class="back" href="#internships">‹ All internships</a>
    <div class="detail-head card">
      <div>
        <div class="eyebrow dark">${esc(r.org)}</div>
        <h1>${esc(r.title)}</h1>
        <div class="row">${statusBadge(s)}<span class="pill">${KIND_LABEL[r.kind] || "Role"}</span><span class="pill">${esc(r.location)}</span><span class="pill">${esc(r.pay)}</span></div>
      </div>
      <div class="row">
        ${r.url ? `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Official page ↗</a>` : ""}
        ${s !== "ineligible" ? `<a class="btn primary" href="#generate/${encodeURIComponent(r.id)}">${icon("sparkles")} Generate tailored resume</a><a class="btn" href="#studio/${encodeURIComponent(r.id)}">${icon("scan")} ATS check</a><a class="btn" href="#practice/interview/${encodeURIComponent(r.id)}">${icon("mic")} Practice interview</a>` : ""}
      </div>
    </div>

    <div class="detail">
      <div class="stack">
        <section class="card"><h2>What it is</h2><p>${esc(about)}</p><p class="small muted">${esc(r.eligibility.reason)}</p></section>

        ${s !== "ineligible" ? trackerPanelHTML(r) : ""}

        <section class="card"><h2>Key dates</h2>
          <div class="kv"><span>Applications open</span><strong>${esc(research?.opens || r.opens || "Not published — check the official page")}</strong></div>
          <div class="kv"><span>Deadline</span><strong>${esc(research?.closes || r.deadline || "Varies")}</strong></div>
          <p class="small muted">Dates are typical for this program${research ? " (updated by live research)" : ""} — confirm on the official page.</p>
        </section>

        <section class="card"><h2>How your chance is calculated</h2>
          <div class="kv"><span>Starting rate</span><strong>${rateLine(ch.rate)}</strong></div>
          ${ch.factors.map((f) => `<div class="factor ${f.good ? "good" : "weak"}"><span class="dot"></span><div class="grow"><strong>${esc(f.label)}</strong> — ${esc(f.value)}<div class="small muted">${esc(f.note)}</div></div></div>`).join("")}
          <p class="small muted">Your profile multiplies your odds by about ×${ch.multiplier.toFixed(2)} compared with a typical applicant.</p>
        </section>

        <section class="card"><h2>Where to improve</h2>
          <div class="moves">${ch.improve.map((i) => `<${i.skill ? `a href="#coach/${i.skill}"` : "div"} class="move"><span class="tag">Fix</span><span>${esc(i.text)}</span>${i.skill ? '<span class="chev">›</span>' : ""}</${i.skill ? "a" : "div"}>`).join("")}</div>
        </section>

        <section class="card" id="research-card"><div class="section-head"><h2>Live research</h2>
          ${AI.enabled() ? `<button class="btn small" id="do-research">${research ? "Refresh" : "Research this program"}</button>` : `<a class="small" href="#settings">Add an API key to enable</a>`}</div>
          <div id="research-out">${research ? researchHTML(research) : `<p class="muted small">Claude searches the official page and the web for what this program actually looks for, dates, and any published acceptance numbers.</p>`}</div>
        </section>

        ${s !== "ineligible" ? writingPanelHTML(r) : ""}
        ${s !== "ineligible" ? outreachPanelHTML(r) : ""}
      </div>

      <aside class="chance-card card">
        ${
          s === "ineligible"
            ? `<div class="ring tone-muted" style="--p:0;--size:140px"><span>—</span></div><h3>Not eligible</h3><p class="small">${esc(r.eligibility.reason)}</p>`
            : `${ring(ch.chance, { size: 140 })}
               <h3>${s === "soon" ? "Chance once you're eligible" : "Your estimated chance"}</h3>
               <div class="kv"><span>Starting rate</span><strong>${ch.rate.v}%</strong></div>
               <div class="kv"><span>You, today</span><strong>${ch.chance}%</strong></div>
               <div class="kv"><span>Your potential</span><strong class="good-text">${ch.potential}%</strong></div>
               <p class="small muted">Potential = if you close the gaps in “Where to improve”.</p>
               ${s === "check" ? `<p class="small notice info">Assumes you meet the requirement flagged on the left.</p>` : ""}
               <a class="btn primary block" href="#generate/${encodeURIComponent(r.id)}">Generate tailored resume</a>`
        }
      </aside>
    </div>`;

  document.getElementById("do-research")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const cache = Store.get("research", {});
      delete cache[r.id];
      Store.set("research", cache);
      const out = await AI.researchRole(r);
      document.getElementById("research-out").innerHTML = researchHTML(out);
      toast("Research updated.");
    })
  );
  const rerender = () => {
    route.keepScroll = true;
    const y = window.scrollY;
    renderInternship(id);
    window.scrollTo(0, y);
  };
  wireTrackerPanel(r, rerender);
  wireWritingPanel(r, rerender);
  wireOutreachPanel(r, rerender);
}

function researchHTML(x) {
  const list = (a) => (a && a.length ? `<ul>${a.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "");
  return `
    ${x.summary ? `<p>${esc(x.summary)}</p>` : ""}
    ${x.lookFor?.length ? `<h4>What they look for</h4>${list(x.lookFor)}` : ""}
    ${x.acceptance ? `<div class="kv"><span>Published numbers</span><strong>${esc(x.acceptance)}</strong></div>` : ""}
    ${x.tips?.length ? `<h4>Tips</h4>${list(x.tips)}` : ""}
    ${x.sources?.length ? `<p class="small muted">Sources: ${x.sources.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`).join(" · ")}</p>` : ""}`;
}

// ================= GENERATE =================
const GEN_STEPS = ["Researching the role", "Matching your experience", "Adjusting wording for keywords", "Fact-checking every line", "Scoring against the role"];

function renderGenerate(id) {
  const found = findRole(id);
  if (!found) return (app.innerHTML = empty(`Program not found. <a href="#internships">Back</a>`));
  const role = { ...found.r, org: found.r.org || found.c.name };
  if (role.eligibility.status === "ineligible") return renderInternship(id);

  app.innerHTML = `
    <a class="back" href="#internship/${encodeURIComponent(role.id)}">‹ ${esc(role.org)}</a>
    <div class="card gen">
      <div class="eyebrow dark">Building your resume for</div>
      <h1>${esc(role.org)} — ${esc(role.title)}</h1>
      <div class="steps">${GEN_STEPS.map((s, i) => `<div class="step" data-step="${i}"><span class="step-icon"></span><div><div class="step-title">${s}</div><div class="small muted step-detail"></div></div></div>`).join("")}</div>
      ${AI.enabled() ? "" : `<p class="small muted">Tip: add a Claude API key in Settings so this step researches the role live and rewords bullets for its keywords.</p>`}
    </div>
    <div id="gen-result"></div>`;
  runGenerate(role);
}

async function runGenerate(role) {
  const step = (i, st, detail = "") => {
    const el = app.querySelector(`[data-step="${i}"]`);
    if (!el) return;
    el.className = "step " + st;
    el.querySelector(".step-detail").textContent = detail;
  };
  const token = (runGenerate.token = {});
  const alive = () => runGenerate.token === token && document.getElementById("gen-result");

  // 1. research
  step(0, "run");
  let research = Store.get("research", {})[role.id] || null;
  let note = "";
  if (!research && AI.enabled()) {
    try {
      research = await AI.researchRole(role);
    } catch (e) {
      note = "Live research failed (" + e.message + ") — using catalog data.";
    }
  } else await wait(900);
  if (!alive()) return;
  let keywords = role.keywords;
  if (research?.keywords?.length) {
    const seen = new Set(keywords.map((k) => k.term.toLowerCase()));
    keywords = [...keywords, ...research.keywords.filter((k) => !seen.has(k.term.toLowerCase()))].slice(0, 14);
  }
  const target = { ...role, keywords };
  step(0, "done", note || (research ? `Found ${research.lookFor?.length || 0} things they look for · ${keywords.length} keywords` : `Using catalog data · ${keywords.length} keywords`));

  // 2. match
  step(1, "run");
  const bank = getBank();
  const settings = getSettings();
  const before = scoreResume(buildResume(null, bank, settings), target);
  const tailored = buildResume(target, bank, settings);
  await wait(700);
  if (!alive()) return;
  step(1, "done", `Reordered to lead with ${tailored.projects[0].title.split(" (")[0]}`);

  // 3. reword
  step(2, "run");
  const bullets = [...tailored.projects, ...tailored.experience].flatMap((i) => i.bullets).filter((b) => !b.fromBank).map((b) => b.text);
  const allowed = allowedRewriteTerms(keywords);
  let proposals = [];
  if (AI.enabled()) {
    try {
      proposals = await AI.tailorBullets(target, research, bullets, allowed);
    } catch (e) {
      note = "Rewording failed (" + e.message + ")";
    }
  } else await wait(700);
  if (!alive()) return;
  step(2, "done", AI.enabled() ? note || `${proposals.length} line${proposals.length === 1 ? "" : "s"} proposed` : "Skipped — needs an API key (your original wording is used)");

  // 4. verify
  step(3, "run");
  const dataText = dataBlockText(bank);
  const map = {};
  const blocked = [];
  for (const p of proposals) {
    const orig = bullets[p.i];
    if (!orig || p.text.trim() === orig) continue;
    const why = verifyRewrite(orig, p.text.trim(), dataText, allowed);
    if (why) blocked.push({ orig, text: p.text, why });
    else map[orig] = p.text.trim().replace(/\.$/, "");
  }
  await wait(600);
  if (!alive()) return;
  step(3, "done", `${Object.keys(map).length} kept · ${blocked.length} blocked`);

  // 5. score
  step(4, "run");
  await wait(500);
  if (!alive()) return;
  const gen = { role: target, base: tailored, map, blocked, before, research };
  const after = scoreResume(applyRewrites(tailored, map), target);
  step(4, "done", `ATS score ${before.total} → ${after.total}`);
  renderGenResult(gen);
}

function renderGenResult(gen) {
  const { role } = gen;
  const resume = applyRewrites(gen.base, gen.map);
  const score = scoreResume(resume, role);
  const ch = cachedChance(role);
  const changes = Object.entries(gen.map);
  const questions = interviewQuestions(role, resume);
  const out = document.getElementById("gen-result");
  out.innerHTML = `
    <div class="headline card">
      <div><div class="k">Company</div><div class="v">${esc(role.org)}</div></div>
      <div><div class="k">Role</div><div class="v">${esc(role.title)}</div></div>
      <div><div class="k">Eligible</div><div class="v">${statusBadge(role.eligibility.status)}</div></div>
      <div><div class="k">ATS score</div><div class="bigscore">${score.total}<span class="muted">/100</span></div><div class="small">${gen.before.total} before tailoring · ${score.verdict}</div></div>
      <div><div class="k">Your chance</div><div class="bigscore">${ch.chance}%</div><div class="small">potential ${ch.potential}%</div></div>
    </div>
    <div class="result">
      <div class="stack">
        <div class="row">
          <button class="btn primary" data-act="studio">${icon("file")} Open in Resume Studio</button><button class="btn" data-act="save">Save version</button>
          <button class="btn" data-act="print">Save as PDF</button>
          <button class="btn" data-act="copy">Copy text</button>
          <button class="btn" data-act="txt">Download .txt</button>
        </div>
        ${templatePicker()}
        <div class="paper ${tplClass()}" id="resume-paper">${resumeToHTML(resume)}</div>
      </div>
      <div class="stack">
        ${
          changes.length || gen.blocked.length
            ? `<div class="card"><h3>Wording changes</h3>
              ${changes.map(([o, n]) => `<div class="change"><div class="old">${esc(o)}</div><div class="new">${esc(n)}</div><button class="btn small ghost" data-revert="${esc(o)}">Undo</button></div>`).join("")}
              ${gen.blocked.length ? `<details class="small"><summary>${gen.blocked.length} suggestion${gen.blocked.length === 1 ? "" : "s"} blocked by the fact-check</summary>${gen.blocked.map((b) => `<p><span class="muted">${esc(b.text)}</span><br>✗ ${esc(b.why)}</p>`).join("")}</details>` : ""}
            </div>`
            : ""
        }
        ${rubricCard(score)}
        ${keywordCard(score, role)}
      </div>
    </div>
    <h2 class="mt">Interview practice</h2>
    <p class="muted">Type or dictate your answer, then score it. Talking points come only from your data.</p>
    <div class="stack">${questions.map((q, i) => practiceCard(q, i, role.id)).join("")}</div>`;

  wireResumeActions(out, resume, `${role.org} - ${role.title}`, score, role);
  // Hand the tailored + reworded version to the Studio for live ATS editing.
  out.querySelector('[data-act="studio"]').addEventListener("click", () => {
    const s = studioStore();
    s.drafts[role.id] = { ...JSON.parse(JSON.stringify(resume)), summary: [resume.summary.join(" ")] };
    saveStudioStore(s);
    go("studio/" + role.id);
  });
  out.querySelectorAll("[data-revert]").forEach((b) =>
    b.addEventListener("click", () => {
      delete gen.map[b.dataset.revert];
      renderGenResult(gen);
    })
  );
  wirePractice(out, questions, role.id);
  out.scrollIntoView({ behavior: "smooth", block: "start" });
}

function wireResumeActions(root, resume, name, score, role) {
  const text = resumeToText(resume);
  root.querySelector('[data-act="copy"]').addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied — paste it into the application.");
    } catch {
      toast("Copy was blocked — use Download .txt instead.");
    }
  });
  root.querySelector('[data-act="txt"]').addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `Mason Ngo Resume - ${name}.txt`.replace(/[\\/:*?"<>|]/g, "");
    a.click();
    URL.revokeObjectURL(a.href);
  });
  root.querySelector('[data-act="print"]').addEventListener("click", () => {
    document.getElementById("print-root").innerHTML = `<div class="paper ${tplClass()}">${resumeToHTML(resume)}</div>`;
    const t = document.title;
    document.title = `Mason Ngo Resume - ${name}`;
    window.print();
    document.title = t;
  });
  root.querySelector('[data-act="save"]')?.addEventListener("click", () => {
    const list = Store.get("resumes", []);
    list.unshift({ id: uid(), name, roleId: role?.id || "", score: score.total, date: new Date().toISOString().slice(0, 10), resume });
    Store.set("resumes", list.slice(0, 50));
    toast("Saved to Resumes.");
  });
}

// ---------- resume formats (layout only — the text is identical and stays ATS-safe) ----------
const TEMPLATES = [
  ["classic", "Classic"],
  ["modern", "Modern"],
  ["minimal", "Minimal"],
];
function tplClass() {
  const t = getSettings().resumeTemplate;
  return "tpl-" + (TEMPLATES.some(([k]) => k === t) ? t : "classic");
}
function templatePicker() {
  const cur = tplClass().slice(4);
  return `<div class="segmented" role="group" aria-label="Resume format">${TEMPLATES.map(([k, l]) => `<button data-tpl="${k}" class="${cur === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tpl]");
  if (!b) return;
  Store.set("settings", { ...getSettings(), resumeTemplate: b.dataset.tpl });
  document.querySelectorAll(".paper").forEach((p) => (p.className = p.className.replace(/tpl-\w+/, tplClass())));
  document.querySelectorAll("[data-tpl]").forEach((x) => x.classList.toggle("on", x.dataset.tpl === b.dataset.tpl));
});

function rubricCard(score) {
  return `<div class="card"><h3>Scoring rubric</h3>
    ${score.rows.map((r) => `<div class="rubric-row"><div class="spread"><strong>${r.name}</strong><span>${r.score}/20</span></div><div class="bar"><i style="width:${r.score * 5}%"></i></div><div class="small muted">${esc(r.note)}</div></div>`).join("")}
    <p class="small">No hallucination ✓ — every bullet comes from your data block or your own Skill Bank answers.</p></div>`;
}

function keywordCard(score, role) {
  if (!role.keywords.length) return "";
  return `<div class="card"><h3>Keywords <span class="small muted">★ = usually required</span></h3>
    <div class="chips">
      ${score.matched.map((k) => `<span class="chip hit" title="Matched via “${esc(k.via)}”">${icon("check")}${esc(k.term)}${k.req ? " ★" : ""}</span>`).join("")}
      ${score.missing.map((k) => `<span class="chip miss">${icon("x")}${esc(k.term)}${k.req ? " ★" : ""}</span>`).join("")}
    </div>
    ${score.missing.length ? `<p class="small muted">Missing keywords aren't added unless they're true. If you really have one, prove it in the Skill Bank; if not, it's something to learn.</p>` : `<p class="small muted">Every keyword is covered.</p>`}
  </div>`;
}

// ---------- interview practice ----------
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
function practiceCard(q, i, roleId) {
  const saved = Store.get("practice", {})[`${roleId}:${i}`] || "";
  return `<div class="card" data-q="${i}">
    <span class="pill">${q.type}</span>
    <h3 class="q">${esc(q.q)}</h3>
    <details><summary class="small">Talking points from your data</summary><ul class="small">${q.points.map((p) => `<li>${esc(p)}</li>`).join("") || "<li>Nothing in your data covers this yet — build it in the Skill Bank.</li>"}</ul></details>
    <textarea placeholder="Answer the way you'd say it out loud…">${esc(saved)}</textarea>
    <div class="row"><button class="btn primary small" data-score>Score my answer</button>${Speech ? `<button class="btn small" data-mic>${icon("mic")} Dictate</button>` : ""}</div>
    <div data-out></div>
  </div>`;
}
function wirePractice(root, questions, roleId) {
  root.querySelectorAll("[data-q]").forEach((card) => {
    const i = +card.dataset.q;
    const ta = card.querySelector("textarea");
    const out = card.querySelector("[data-out]");
    ta.addEventListener("input", () => {
      const all = Store.get("practice", {});
      all[`${roleId}:${i}`] = ta.value;
      Store.set("practice", all);
    });
    card.querySelector("[data-score]").addEventListener("click", (e) =>
      busy(e.currentTarget, async () => {
        if (!ta.value.trim()) return toast("Write or dictate an answer first.");
        let html = `<ul class="checks">${starCheck(ta.value).map((c) => `<li class="${c.ok ? "ok" : ""}">${esc(c.t)}</li>`).join("")}</ul>`;
        if (AI.enabled()) html += `<div class="ai-out">${esc(await AI.scoreAnswer(questions[i].q, ta.value))}</div>`;
        else html += `<p class="small muted">Add a Claude API key in Settings for detailed feedback.</p>`;
        out.innerHTML = html;
      })
    );
    card.querySelector("[data-mic]")?.addEventListener("click", (e) => dictate(ta, e.currentTarget));
  });
}
function starCheck(ans) {
  const words = ans.trim().split(/\s+/).filter(Boolean).length;
  return [
    { ok: words >= 60 && words <= 250, t: `Length: ${words} words (aim for 60–250, about 1–2 minutes)` },
    { ok: /\b(when|while|during|last|this|in 20\d\d)\b/i.test(ans), t: "Situation: sets up when/where it happened" },
    { ok: /\bI\b/.test(ans), t: "Action: says what YOU did" },
    { ok: /\d/.test(ans), t: "Includes a concrete number" },
    { ok: /(result|so that|ended up|now|learned|improv|reduc|increas|because of)/i.test(ans), t: "Result: ends with an outcome or lesson" },
  ];
}
function dictate(textarea, btn) {
  if (dictate.rec) return dictate.rec.stop();
  const rec = new Speech();
  rec.continuous = true;
  rec.lang = "en-US";
  const base = textarea.value ? textarea.value.trim() + " " : "";
  rec.onresult = (e) => {
    textarea.value = base + Array.from(e.results).map((r) => r[0].transcript).join(" ");
    textarea.dispatchEvent(new Event("input"));
  };
  rec.onend = () => {
    dictate.rec = null;
    btn.innerHTML = `${icon("mic")} Dictate`;
  };
  rec.onerror = (e) => toast("Mic error: " + e.error);
  rec.start();
  dictate.rec = rec;
  btn.innerHTML = `${icon("stop")} Stop`;
}

// ---------- add another company ----------
function openOtherCompany() {
  modalBody.innerHTML = `
    <div class="spread"><h2>Add another company</h2><button class="btn ghost" data-close>✕</button></div>
    <div class="card">
      <h3>Find roles with AI</h3>
      <p class="small muted">Claude searches the web for real openings and checks whether a 10th grader can apply. ${AI.enabled() ? "" : "<strong>Needs an API key in Settings.</strong>"}</p>
      <div class="row"><input type="text" id="ai-company" placeholder="e.g. Intuit, Charles Schwab" style="flex:1;min-width:200px"><button class="btn primary" id="ai-find" ${AI.enabled() ? "" : "disabled"}>Find roles</button></div>
    </div>
    <div class="card mt-s">
      <h3>Paste a job posting</h3>
      <label class="field"><span>Company</span><input type="text" id="p-company"></label>
      <label class="field"><span>Role title</span><input type="text" id="p-title"></label>
      <label class="field"><span>Posting text</span><textarea id="p-text" style="min-height:150px" placeholder="Paste the full posting, including requirements"></textarea></label>
      <button class="btn primary" id="p-go">Analyze posting</button>
    </div>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector("[data-close]").onclick = () => modal.close();
  modalBody.querySelector("#ai-find").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const name = modalBody.querySelector("#ai-company").value.trim();
      if (!name) return toast("Type a company name.");
      const roles = (await AI.findRoles(name)).map((r) => ({ ...r, org: name, field: r.category, kind: "internship", location: r.type, pay: "", deadline: "" }));
      if (!roles.length) return toast(`No verifiable openings found for ${name}.`);
      saveCustomCompany({ id: "co-" + uid(), name, blurb: "Found by AI web search", roles, ai: true });
    })
  );
  modalBody.querySelector("#p-go").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const name = modalBody.querySelector("#p-company").value.trim();
      const title = modalBody.querySelector("#p-title").value.trim();
      const text = modalBody.querySelector("#p-text").value.trim();
      if (!name || !title || text.length < 80) return toast("Fill in company, title, and the full posting.");
      const analysis = analyzePosting(text);
      const keywords = (AI.enabled() && (await AI.postingKeywords(text))) || analysis.keywords;
      const field = /financ|trading|invest|bank|account/i.test(text) ? "finance" : /python|software|code|program|data|engineer/i.test(text) ? "tech" : "community";
      const role = { id: "p-" + uid(), org: name, title, type: "From pasted posting", category: field === "community" ? "community" : field, field, kind: "internship", location: "See posting", pay: "See posting", deadline: "", eligibility: analysis.eligibility, keywords };
      saveCustomCompany({ id: "co-" + uid(), name, blurb: "Added from a pasted posting", roles: [role], ai: true });
    })
  );
}
function saveCustomCompany(company) {
  Store.set("aiCompanies", [...Store.get("aiCompanies", []), company]);
  modal.close();
  go(`internship/${company.roles[0].id}`);
}

// ================= COLLEGES =================
function renderColleges() {
  const f = state.colFilter;
  let list = COLLEGES.filter((c) => f.set === "all" || (f.set === "ca" && c.ca) || (f.set === "uc" && c.uc)).map((c) => ({ c, ch: cachedCollegeChance(c) }));
  list.sort(f.sort === "name" ? (a, b) => a.c.name.localeCompare(b.c.name) : f.sort === "rate" ? (a, b) => a.c.rate - b.c.rate : (a, b) => b.ch.chance - a.ch.chance);
  const safety = (p) => (p >= 60 ? ["Likely", "good"] : p >= 30 ? ["Target", "accent"] : p >= 12 ? ["Reach", "warn"] : ["High reach", "bad"]);

  app.innerHTML = `
    <div class="page-head"><div><h1>Colleges</h1><p class="muted">Real admit rates (Class of 2029 / Fall 2025), adjusted for your profile today — and what's possible by senior year.</p></div></div>
    ${(() => {
      const p = collegeProfile();
      const n = p.courses.length + p.activities.length + p.awards.length + (p.tests.sat || p.tests.act ? 1 : 0);
      return `<a class="card practice-cta" href="#profile"><div class="track-icon">${icon("cap")}</div><div><h3>Your college profile</h3><p class="small muted">${n ? `${p.courses.length} courses · ${p.activities.length} activities · ${p.awards.length} extra awards${p.tests.sat || p.tests.act ? " · test score logged" : ""}` : "Add AP classes, activities, leadership and test scores so these chances use real numbers."}</p></div><span class="chev">›</span></a>`;
    })()}
    <div class="card filterbar">
      <div class="filter-selects">
        <select id="col-set"><option value="all">All colleges</option><option value="ca" ${f.set === "ca" ? "selected" : ""}>California</option><option value="uc" ${f.set === "uc" ? "selected" : ""}>UC campuses</option></select>
        <select id="col-sort"><option value="chance">Best chance</option><option value="rate" ${f.sort === "rate" ? "selected" : ""}>Most selective</option><option value="name" ${f.sort === "name" ? "selected" : ""}>A–Z</option></select>
      </div>
      <p class="small muted">You're in 10th grade, so these will move a lot. Test scores, rigor, leadership and essays aren't in your data yet.</p>
    </div>
    <div class="list">${list
      .map(({ c, ch }) => {
        const [lab, tone] = safety(ch.chance);
        return `<a class="list-row card" href="#college/${c.id}">${ring(ch.chance, { size: 52 })}
          <div class="grow"><div class="row-title">${esc(c.name)}</div><div class="small muted">${esc(c.location)} · ${esc(c.type)} · ${c.rate}% admit rate</div></div>
          <div class="row-end"><span class="badge tone-${tone}">${lab}</span><span class="small muted">potential ${ch.potential}%</span><span class="chev">›</span></div></a>`;
      })
      .join("")}</div>`;
  document.getElementById("col-set").addEventListener("change", (e) => ((f.set = e.target.value), renderColleges()));
  document.getElementById("col-sort").addEventListener("change", (e) => ((f.sort = e.target.value), renderColleges()));
}

function renderCollege(id) {
  const c = COLLEGES.find((x) => x.id === id);
  if (!c) return (app.innerHTML = empty(`College not found. <a href="#colleges">Back</a>`));
  const ch = cachedCollegeChance(c);
  const key = c.name.split(" ")[0].toLowerCase();
  const related = allRoles().filter(({ r }) => (r.org || "").toLowerCase().includes(key) && r.kind === "program");

  app.innerHTML = `
    <a class="back" href="#colleges">‹ All colleges</a>
    <div class="detail-head card">
      <div><div class="eyebrow dark">${esc(c.type)}</div><h1>${esc(c.name)}</h1>
        <div class="row"><span class="pill">${esc(c.location)}</span><span class="pill">${c.rate}% admit rate</span></div></div>
      <a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">Admissions site ↗</a>
    </div>
    <div class="detail">
      <div class="stack">
        <section class="card"><h2>What it is</h2><p>${esc(c.name)} is a ${esc(c.type.toLowerCase())} school in ${esc(c.location)}. ${esc(c.notes)}</p>
          <div class="kv"><span>Published admit rate</span><strong>${c.rate}% <span class="muted">(${esc(c.src)})</span></strong></div></section>
        <section class="card"><h2>How your chance is calculated</h2>
          ${ch.factors.map((f) => `<div class="factor ${f.good === null ? "" : f.good ? "good" : "weak"}"><span class="dot"></span><div class="grow"><strong>${esc(f.label)}</strong> — ${esc(f.value)}<div class="small muted">${esc(f.note)}</div></div></div>`).join("")}
          <p class="small muted">Your profile works like ×${ch.multiplier.toFixed(2)} a typical applicant's odds${ch.elite ? " (capped — at sub-10% schools, stats alone move the needle less)" : ""}.</p>
        </section>
        <section class="card"><h2>Where to improve</h2><div class="moves">${ch.improve.map((t) => `<div class="move"><span class="tag">Next</span><span>${esc(t)}</span></div>`).join("")}</div></section>
        ${related.length ? `<section class="card"><h2>Programs from ${esc(c.name.split(" (")[0])} in your list</h2><div class="list compact">${related.map(({ r }) => `<a class="list-row" href="#internship/${r.id}">${ring(cachedChance(r).chance, { size: 40 })}<div class="grow"><div class="row-title">${esc(r.title)}</div><div class="small muted">${esc(r.location)}</div></div>${statusBadge(r.eligibility.status)}</a>`).join("")}</div></section>` : ""}
      </div>
      <aside class="chance-card card">
        ${ring(ch.chance, { size: 140 })}
        <h3>Your estimated chance</h3>
        <div class="kv"><span>Admit rate</span><strong>${c.rate}%</strong></div>
        <div class="kv"><span>You, today</span><strong>${ch.chance}%</strong></div>
        <div class="kv"><span>Your potential</span><strong class="good-text">${ch.potential}%</strong></div>
        <p class="small muted">Potential = strong rigor, test scores (where used), leadership and a state/national-level achievement by senior year.</p>
      </aside>
    </div>`;
}

// ================= SKILL BANK =================
function renderSkills() {
  const bank = getBank();
  const skills = allSkills(bank)
    .filter((s) => state.skillFilter === "all" || s.type === state.skillFilter)
    .map((s) => ({ s, sc: cachedSkillScore(s, bank) }));
  const avg = Math.round(skills.reduce((n, x) => n + x.sc.total, 0) / Math.max(1, skills.length));
  const tone = (t) => (t >= 70 ? "good" : t >= 45 ? "accent" : t >= 25 ? "warn" : "bad");

  app.innerHTML = `
    <div class="page-head">
      <div><h1>Skill Bank</h1><p class="muted">How much each skill actually counts on a resume. Open the coach and it asks one question at a time, digs in with follow-ups, and adds proven bullets to your resume automatically.</p></div>
      ${ring(avg, { size: 84, label: avg, tone: tone(avg) })}
    </div>
    <div class="filters">${["all", "technical", "soft"].map((f) => `<button data-filter="${f}" class="${state.skillFilter === f ? "active" : ""}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}</div>
    <div class="grid cards3">
      ${skills
        .map(
          ({ s, sc }) => `<div class="card skill-card">
            <div class="spread"><div><h3>${esc(s.name)}</h3><span class="small muted">${s.type === "soft" ? "Soft skill" : "Technical"}${s.custom ? " · added by you" : ""}</span></div>${ring(sc.total, { size: 58, label: sc.total, tone: tone(sc.total) })}</div>
            <div class="small"><strong>${sc.label}.</strong> <span class="muted">${esc(sc.evidenceLabels.length ? "Proof: " + sc.evidenceLabels.join(" · ") : "No proof in your data yet")}</span></div>
            <div class="row mt-auto"><a class="btn primary small" href="#coach/${s.id}">Improve with coach</a>${s.custom ? `<button class="btn ghost small" data-remove-skill="${s.id}">Remove</button>` : ""}</div>
          </div>`
        )
        .join("")}
      <div class="card skill-card dashed">
        <h3>+ Add a skill</h3>
        <p class="small muted">Starts at zero proof — it only reaches your resume after the coach verifies it.</p>
        <input type="text" id="new-skill" placeholder="e.g. Flask, Public speaking">
        <div class="row"><select id="new-skill-type"><option value="technical">Technical</option><option value="soft">Soft</option></select><button class="btn small" id="add-skill">Add</button></div>
      </div>
    </div>`;
  app.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => ((state.skillFilter = b.dataset.filter), renderSkills())));
  app.querySelectorAll("[data-remove-skill]").forEach((b) =>
    b.addEventListener("click", () => {
      const bank = getBank();
      bank.customSkills = bank.customSkills.filter((s) => s.id !== b.dataset.removeSkill);
      bank.bullets = bank.bullets.filter((x) => x.skillId !== b.dataset.removeSkill);
      saveBank(bank);
      renderSkills();
    })
  );
  document.getElementById("add-skill").addEventListener("click", () => {
    const name = document.getElementById("new-skill").value.trim();
    if (!name) return;
    const bank = getBank();
    if (allSkills(bank).some((s) => s.name.toLowerCase() === name.toLowerCase())) return toast("That skill is already in your bank.");
    const skill = { id: "c-" + uid(), name, type: document.getElementById("new-skill-type").value, evidence: [], custom: true };
    bank.customSkills.push(skill);
    saveBank(bank);
    go(`coach/${skill.id}`);
  });
}

// ---------- coach (one question at a time, adaptive follow-ups, auto-adds bullets) ----------
function coachState(skillId) {
  return Object.assign({ thread: [], itemId: null, qi: -1, stage: "pick", followups: 0 }, Store.get("coach", {})[skillId]);
}
function saveCoach(skillId, st) {
  const all = Store.get("coach", {});
  all[skillId] = st;
  Store.set("coach", all);
}
function itemLabel(id) {
  return attachableItems().find((i) => i.id === id)?.label || "";
}

function analyzeAnswer(text) {
  return {
    words: text.trim().split(/\s+/).filter(Boolean).length,
    hasNum: /\d/.test(text),
    hasI: /\b(I|I'm|I've|I'd|my)\b/.test(text),
    hasResult: /(result|so that|ended|now |learned|improv|reduc|increas|grew|saved|won|placed|because of|which (led|made|let|helped)|helped)/i.test(text),
  };
}
function heuristicFollowUp(answers) {
  const a = analyzeAnswer(answers.join(" "));
  if (a.words < 12) return "Tell me a bit more — walk me through what actually happened.";
  if (!a.hasI) return "What did you personally do? Try starting with “I …”.";
  if (!a.hasNum) return "Can you put a real number on it? (how many, how long, how often, how much — only if you know it's true. Say “no number” if there isn't one.)";
  if (!a.hasResult) return "What changed because of it — what was the result, or what did you learn?";
  return null;
}

function renderCoach(skillId) {
  const bank = getBank();
  const skill = allSkills(bank).find((s) => s.id === skillId);
  if (!skill) return (app.innerHTML = empty(`Skill not found. <a href="#skills">Back</a>`));
  const sc = skillScore(skill, bank);
  const st = coachState(skillId);
  if (!st.thread.length) {
    st.thread.push({ from: "coach", text: `Let's build real proof for ${skill.name}. I'll ask one question at a time and dig in where it helps. Which experience is it from?` });
    saveCoach(skillId, st);
  }
  const bullets = bank.bullets.filter((b) => b.skillId === skillId);
  const items = attachableItems();

  app.innerHTML = `
    <a class="back" href="#skills">‹ Skill Bank</a>
    <div class="coach">
      <aside class="card coach-side">
        ${ring(sc.total, { size: 110, label: sc.total, tone: sc.total >= 70 ? "good" : sc.total >= 45 ? "accent" : sc.total >= 25 ? "warn" : "bad" })}
        <h2>${esc(skill.name)}</h2><div class="small muted">${sc.label}</div>
        ${sc.parts.map((p) => `<div class="rubric-row"><div class="spread small"><strong>${p.name}</strong><span>${p.pts}/${p.max}</span></div><div class="bar"><i style="width:${(p.pts / p.max) * 100}%"></i></div></div>`).join("")}
        ${bullets.length ? `<h4>On your resume</h4>${bullets.map((b) => `<div class="mini-bullet">${esc(b.text)} <button class="linkbtn" data-undo="${b.id}">remove</button></div>`).join("")}` : ""}
        <button class="btn ghost small" id="reset-coach">Start over</button>
      </aside>
      <section class="card chat">
        <div class="thread" id="thread">${st.thread
          .map((m) => `<div class="msg ${m.from}">${esc(m.text)}${m.bulletId ? ` <button class="linkbtn" data-undo="${m.bulletId}">Undo</button>` : ""}</div>`)
          .join("")}</div>
        <div class="composer">
          ${
            st.stage === "pick"
              ? `<div class="chips">${items.map((i) => `<button class="chip pick" data-item="${i.id}">${esc(i.label)}</button>`).join("")}<button class="chip pick" data-item="">Not on my resume — just an interview story</button></div>`
              : st.stage === "done"
                ? `<p class="small muted">That's every question for now. <button class="linkbtn" id="more-q">${AI.enabled() ? "Generate new questions" : "Start over with another experience"}</button></p>`
                : `<textarea id="answer" placeholder="${st.stage === "bullet" ? "One resume line: strong verb + what you did + the number/result" : "Type your answer…"}"></textarea>
                   <div class="row"><button class="btn primary" id="send">Send</button><button class="btn ghost small" id="skip">Skip question</button><button class="btn ghost small" id="switch">Switch experience</button>${Speech ? `<button class="btn ghost small" id="mic" aria-label="Dictate">${icon("mic")}</button>` : ""}</div>`
          }
        </div>
      </section>
    </div>`;

  const thread = document.getElementById("thread");
  thread.scrollTop = thread.scrollHeight;
  app.querySelectorAll("[data-undo]").forEach((b) =>
    b.addEventListener("click", () => {
      const bk = getBank();
      bk.bullets = bk.bullets.filter((x) => x.id !== b.dataset.undo);
      saveBank(bk);
      toast("Removed from your resume.");
      renderCoach(skillId);
    })
  );
  document.getElementById("reset-coach").addEventListener("click", () => {
    saveCoach(skillId, { thread: [], itemId: null, qi: -1, stage: "pick", followups: 0 });
    renderCoach(skillId);
  });
  app.querySelectorAll("[data-item]").forEach((b) =>
    b.addEventListener("click", () => {
      st.itemId = b.dataset.item || "";
      st.thread.push({ from: "me", text: b.textContent });
      askNext(skill, st);
      saveCoach(skillId, st);
      renderCoach(skillId);
    })
  );
  document.getElementById("more-q")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      if (AI.enabled()) {
        const more = await AI.skillQuestions(skill, skillQuestions(skill, getBank()));
        const bk = getBank();
        bk.genQuestions[skillId] = [...(bk.genQuestions[skillId] || []), ...more];
        saveBank(bk);
        st.stage = "answer";
        askNext(skill, st);
      } else Object.assign(st, { stage: "pick", qi: -1, thread: [...st.thread, { from: "coach", text: "Pick another experience and we'll go again." }] });
      saveCoach(skillId, st);
      renderCoach(skillId);
    })
  );
  document.getElementById("skip")?.addEventListener("click", () => {
    st.thread.push({ from: "coach", text: "No problem — different angle." });
    askNext(skill, st);
    saveCoach(skillId, st);
    renderCoach(skillId);
  });
  document.getElementById("switch")?.addEventListener("click", () => {
    Object.assign(st, { stage: "pick" });
    st.thread.push({ from: "coach", text: "Sure — which experience instead?" });
    saveCoach(skillId, st);
    renderCoach(skillId);
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
      await coachReply(skill, st, text);
      saveCoach(skillId, st);
      renderCoach(skillId);
      document.getElementById("answer")?.focus();
    })
  );
}

function askNext(skill, st) {
  const qs = skillQuestions(skill, getBank());
  const answered = new Set(getBank().answers.filter((a) => a.skillId === skill.id && a.itemId === (st.itemId || "")).map((a) => a.question));
  let i = st.qi + 1;
  while (i < qs.length && answered.has(qs[i])) i++;
  if (i >= qs.length) {
    st.stage = "done";
    st.thread.push({ from: "coach", text: `That covers every question for ${skill.name} with this experience. Your score updates on the left.` });
    return;
  }
  Object.assign(st, { qi: i, stage: "answer", followups: 0, currentQ: qs[i] });
  st.thread.push({ from: "coach", text: qs[i] });
}

function addBulletFromCoach(skill, st, text) {
  const bank = getBank();
  const source = bank.answers.filter((a) => a.skillId === skill.id).map((a) => a.answer).join(" ") + " " + (itemIndex()[st.itemId]?.text || "");
  const bad = numbersNotIn(text, source);
  if (bad.length) return { ok: false, msg: `I can't add that — ${bad.map((n) => `“${n}”`).join(", ")} isn't in anything you told me. Tell me the real number first, or rewrite the line without it.` };
  const b = { id: uid(), skillId: skill.id, itemId: st.itemId, text: text.replace(/^[-•]\s*/, "").replace(/\.$/, ""), ts: Date.now() };
  bank.bullets.push(b);
  saveBank(bank);
  return { ok: true, b };
}

async function coachReply(skill, st, text) {
  st.thread.push({ from: "me", text });

  if (st.stage === "bullet") {
    if (/^(i|it|my|we|this|that)\b/i.test(text) || text.split(/\s+/).length < 5)
      return st.thread.push({ from: "coach", text: "Resume lines skip “I” and start with an action verb — like “Compared…”, “Built…”, “Tested…”. Give it one more try (at least 5 words)." });
    const r = addBulletFromCoach(skill, st, text);
    if (!r.ok) return st.thread.push({ from: "coach", text: r.msg });
    st.thread.push({ from: "coach", text: `Added to your resume under ${itemLabel(st.itemId)}.`, bulletId: r.b.id });
    return askNext(skill, st);
  }

  // Save every answer automatically (the Skill Bank's verified source of truth).
  const bank = getBank();
  bank.answers.push({ id: uid(), skillId: skill.id, question: st.currentQ, answer: text, itemId: st.itemId || "", ts: Date.now() });
  saveBank(bank);
  st.followups++;
  const answersThisQ = getBank().answers.filter((a) => a.skillId === skill.id && a.question === st.currentQ).map((a) => a.answer);

  if (AI.enabled()) {
    const r = await AI.coachTurn(skill, itemLabel(st.itemId), st.thread.slice(-16));
    if (r.bullet && st.itemId) {
      const added = addBulletFromCoach(skill, st, r.bullet);
      if (added.ok) st.thread.push({ from: "coach", text: `Added to your resume: “${added.b.text}”`, bulletId: added.b.id });
    }
    if (r.done || st.followups >= 4) {
      if (r.reply && !r.bullet) st.thread.push({ from: "coach", text: r.reply });
      return askNext(skill, st);
    }
    return st.thread.push({ from: "coach", text: r.reply });
  }

  const follow = /^(no number|none|idk|i don'?t know|not sure)/i.test(text) ? null : heuristicFollowUp(answersThisQ);
  if (follow && st.followups < 4) return st.thread.push({ from: "coach", text: follow });
  if (!st.itemId) {
    st.thread.push({ from: "coach", text: "Saved as an interview story. Next question —" });
    return askNext(skill, st);
  }
  st.stage = "bullet";
  st.thread.push({ from: "coach", text: `That area's solid. Sum it up as one resume line for ${itemLabel(st.itemId)} — strong verb + what you did + the number/result. I'll check it against what you said and add it.` });
}

// ================= RESUMES =================
function renderResumes() {
  const bank = getBank();
  const master = buildResume(null, bank, getSettings());
  const ms = scoreResume(master, null);
  const saved = Store.get("resumes", []);
  app.innerHTML = `
    <a class="back" href="#studio">‹ Resume Studio</a>
    <div class="page-head"><div><h1>Saved versions</h1><p class="muted">Your master resume plus every version you have saved from the Studio.</p></div><a class="btn primary" href="#studio">${icon("file")} Open Resume Studio</a></div>
    ${getSettings().phone ? "" : `<div class="notice info">Your phone number isn't on resumes yet — add it in <a href="#settings">Settings</a> (saved only in this browser).</div>`}
    <div class="list">
      <a class="list-row card" href="#resume/master">${ring(ms.total, { size: 52, label: ms.total, tone: chanceTone(ms.total) })}<div class="grow"><div class="row-title">Master resume</div><div class="small muted">Everything verified, in one place</div></div><span class="chev">›</span></a>
      ${saved.map((s) => `<a class="list-row card" href="#resume/${s.id}">${ring(s.score, { size: 52, label: s.score, tone: chanceTone(s.score) })}<div class="grow"><div class="row-title">${esc(s.name)}</div><div class="small muted">Saved ${esc(s.date)}</div></div><span class="chev">›</span></a>`).join("")}
    </div>
    ${saved.length ? "" : `<p class="muted small mt">Tailored resumes you save from an internship page show up here.</p>`}
    <section class="card mt"><h2>Weak spots recruiters will notice</h2><div class="moves">${thinFlags(bank).map((f) => `<a class="move" href="#skills"><span class="tag">Fix</span><span>${esc(f)}</span><span class="chev">›</span></a>`).join("")}</div></section>`;
}

function renderResumeView(id) {
  const bank = getBank();
  let resume, name, score, role;
  if (id === "master") {
    resume = buildResume(null, bank, getSettings());
    name = "Master";
    score = scoreResume(resume, null);
  } else {
    const s = Store.get("resumes", []).find((x) => x.id === id);
    if (!s) return (app.innerHTML = empty(`Resume not found. <a href="#resumes">Back</a>`));
    resume = s.resume;
    name = s.name;
    role = findRole(s.roleId)?.r;
    score = scoreResume(resume, role || null);
  }
  app.innerHTML = `
    <a class="back" href="#resumes">‹ Resumes</a>
    <div class="page-head"><div><h1>${esc(name)} resume</h1></div>${id !== "master" ? `<button class="btn ghost" id="del">Delete</button>` : ""}</div>
    <div class="result">
      <div class="stack"><div class="row"><button class="btn primary" data-act="print">Save as PDF</button><button class="btn" data-act="copy">Copy text</button><button class="btn" data-act="txt">Download .txt</button></div>
        ${templatePicker()}
        <div class="paper ${tplClass()}">${resumeToHTML(resume)}</div></div>
      <div class="stack">${rubricCard(score)}</div>
    </div>`;
  wireResumeActions(app, resume, name, score, role);
  document.getElementById("del")?.addEventListener("click", () => {
    Store.set("resumes", Store.get("resumes", []).filter((x) => x.id !== id));
    go("resumes");
  });
}

// ================= SETTINGS =================
function renderSettings() {
  const s = getSettings();
  app.innerHTML = `
    <div class="page-head"><div><h1>Settings</h1><p class="muted">Everything here stays in this browser — none of it goes into the GitHub repo.</p></div></div>
    <div class="grid cards2">
      <div class="card"><h3>Appearance</h3><label class="field"><span>Theme</span><select id="theme-select">${["system", "light", "dark"].map((t) => `<option value="${t}" ${(getSettings().theme || "system") === t ? "selected" : ""}>${t[0].toUpperCase() + t.slice(1)}</option>`).join("")}</select></label><p class="small muted">System follows your device's light/dark setting.</p></div>
      <div class="card">${micCheckHTML()}</div>
      <div class="card"><h3>Contact</h3>
        <label class="field"><span>Phone (printed on resumes)</span><input type="tel" id="phone" value="${esc(s.phone)}" placeholder="(415) 000-0000"></label>
        <label class="field"><span>Your goal (ranks matches and next moves)</span><select id="goal">${Object.entries(GOALS)
          .map(([k, g]) => `<option value="${k}" ${goal() === k ? "selected" : ""}>${g.label}</option>`)
          .join("")}</select></label>
        <button class="btn primary" id="save-contact">Save</button></div>
      <div class="card"><h3>AI features</h3>
        <p class="small muted">Unlocks live role research, keyword rewording, the adaptive coach, "Find roles" and answer feedback. Get a key at console.anthropic.com — each use costs a little on your Anthropic account.</p>
        <label class="field"><span>Claude API key</span><input type="password" id="apikey" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
        <label class="field"><span>Model</span><select id="model">
          <option value="claude-opus-5-5" ${AI.model() === "claude-opus-5-5" ? "selected" : ""}>Claude Opus 5.5 (best quality)</option>
          <option value="claude-sonnet-5-5" ${AI.model() === "claude-sonnet-5-5" ? "selected" : ""}>Claude Sonnet 5.5 (faster, cheaper)</option></select></label>
        <div class="row"><button class="btn primary" id="save-ai">Save</button><button class="btn" id="test-ai">Test key</button></div>
        <p class="small muted">Only use this on your own device.</p></div>
      <div class="card"><h3>Human voice (ElevenLabs)</h3>
        <p class="small muted">Makes interviewers and clients sound like real people. Free plan: 10,000 credits a month (about 20 minutes of speech with the Flash model). Get a key at elevenlabs.io → Developers → API Keys (allow Text to Speech, Voices and User read). Without a key, the device voice is used.</p>
        <label class="field"><span>ElevenLabs API key</span><input type="password" id="elkey" value="${esc(s.elevenKey || "")}" placeholder="sk_…" autocomplete="off"></label>
        <label class="field"><span>Voice model</span><select id="elmodel">
          <option value="eleven_flash_v2_5" ${(s.elevenModel || "eleven_flash_v2_5") === "eleven_flash_v2_5" ? "selected" : ""}>Flash v2.5 — fastest, half the credits (recommended)</option>
          <option value="eleven_multilingual_v2" ${s.elevenModel === "eleven_multilingual_v2" ? "selected" : ""}>Multilingual v2 — richest, slower</option></select></label>
        <div class="row"><button class="btn primary" id="save-el">Save</button><button class="btn" id="test-el">${icon("volume")} Test voice</button>${s.elevenKey ? `<button class="btn ghost" id="clear-el">Remove</button>` : ""}</div>
        <p class="small muted" id="el-usage"></p></div>
      <div class="card"><h3>Market data (paper trading)</h3>
        <p class="small muted">Live stock quotes for the paper-trading simulator. Free key at finnhub.io (60 quotes a minute). Without it, prices come from Claude's web search (slower). Crypto prices (BTC, ETH…) work without any key.</p>
        <label class="field"><span>Finnhub API key</span><input type="password" id="fhkey" value="${esc(s.finnhubKey || "")}" placeholder="optional" autocomplete="off"></label>
        <button class="btn primary" id="save-fh">Save</button></div>
      ${syncCardHTML()}
      ${backupCardHTML()}
    </div>`;
  const $ = (id) => document.getElementById(id);
  const save = (patch) => Store.set("settings", { ...getSettings(), ...patch });
  const KEYS = ["bank", "aiCompanies", "practice", "coach", "resumes", "research", "tracker", "essays"];
  $("save-contact").onclick = () => (save({ phone: $("phone").value.trim(), goal: $("goal").value }), toast("Saved."));
  $("save-ai").onclick = () => (save({ apiKey: $("apikey").value.trim(), model: $("model").value }), toast("Saved."));
  const showUsage = () =>
    Eleven.enabled() &&
    Eleven.usage()
      .then((u) => ($("el-usage").textContent = `Used ${u.used.toLocaleString()} of ${u.limit.toLocaleString()} credits this month${u.resets ? ` · resets ${u.resets.toLocaleDateString()}` : ""}.`))
      .catch((e) => ($("el-usage").textContent = e.message));
  showUsage();
  $("save-el").onclick = () => {
    save({ elevenKey: $("elkey").value.trim(), elevenModel: $("elmodel").value });
    Eleven._voices = null;
    Eleven.broken = null;
    Voice._warned = false;
    toast("Saved.");
    renderSettings();
  };
  $("test-el").onclick = (e) =>
    busy(e.currentTarget, async () => {
      save({ elevenKey: $("elkey").value.trim(), elevenModel: $("elmodel").value });
      Voice.unlock();
      Voice._warned = false;
      Eleven.broken = null;
      Eleven._voices = null;
      await Eleven.play("Hi Mason! This is how your interviewer will sound. Pretty human, right?", { gender: "female", seed: "test", isCurrent: () => true });
      showUsage();
    });
  if ($("clear-el")) $("clear-el").onclick = () => (save({ elevenKey: "" }), renderSettings());
  $("save-fh").onclick = () => (save({ finnhubKey: $("fhkey").value.trim() }), toast("Saved."));
  $("test-ai").onclick = (e) =>
    busy(e.currentTarget, async () => {
      save({ apiKey: $("apikey").value.trim(), model: $("model").value });
      await AI.ask("Reply with exactly: OK", { maxTokens: 50 });
      toast("Key works ✓");
    });
  $("export").onclick = () => {
    Backup.download();
    toast("Full backup downloaded — keep it private (it contains your API key).");
    renderSettings();
  };
  $("import").onchange = async (e) => {
    try {
      await Backup.restoreFile(e.target.files[0]);
      toast("Backup restored.");
      route();
    } catch (err) {
      toast(err.message);
    }
  };
  app.querySelectorAll("[data-restore-snap]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Restore this restore point? Your current data is saved as a new restore point first, so you can undo this.")) return;
      try {
        Backup.restoreSnap(+b.dataset.restoreSnap);
        toast("Restored.");
        route();
      } catch (err) {
        toast(err.message);
      }
    })
  );
  wireSyncCard();
  wireMicCheck();
  $("theme-select").addEventListener("change", (e) => setTheme(e.target.value));
  $("reset").onclick = () => {
    if (!confirm("Erase all Skill Bank answers, coach chats, saved resumes, added companies and settings from this browser? (A restore point is saved first.)")) return;
    Backup.snapshot("Automatic — before erasing data");
    [...KEYS, "settings", "collegeProfile", "study", "updatedAt"].forEach((k) => localStorage.removeItem("rb." + k));
    toast("Erased. You can bring it back from the restore points below.");
    renderSettings();
  };
}

function backupCardHTML() {
  const snaps = Backup.snaps();
  const last = Backup.lastDownload();
  const syncOn = Sync.enabled();
  return `<div class="card"><h3>Backup &amp; restore</h3>
    <div class="backup-status">
      <div class="${syncOn ? "ok" : ""}"><strong>${syncOn ? "✓" : "○"} Cloud copy</strong><span class="small muted">${syncOn ? "Saved to your GitHub · " + (Sync.cfg().lastSync ? new Date(Sync.cfg().lastSync).toLocaleString() : "pending") : "Turn on sync above"}</span></div>
      <div class="${snaps.length ? "ok" : ""}"><strong>${snaps.length ? "✓" : "○"} Restore points</strong><span class="small muted">${snaps.length ? `${snaps.length} saved in this browser (made automatically on every update)` : "Made automatically on the next update"}</span></div>
      <div class="${last ? "ok" : ""}"><strong>${last ? "✓" : "○"} Backup file</strong><span class="small muted">${last ? "Last downloaded " + new Date(last).toLocaleDateString() : "Never — download one now"}</span></div>
    </div>
    <p class="small muted">A backup file has everything: Skill Bank, resumes, tracker, essays, study progress, your phone number <strong>and API key</strong> — store it somewhere private (not in the GitHub repo).</p>
    <div class="row"><button class="btn primary" id="export">Download full backup</button><label class="btn">Restore from file<input type="file" id="import" accept="application/json" hidden></label></div>
    ${
      snaps.length
        ? `<h4>Restore points</h4>${snaps.map((s, i) => `<div class="kv"><span>${new Date(s.at).toLocaleString()}<br><span class="small">${esc(s.reason)}</span></span><button class="btn small" data-restore-snap="${i}">Restore</button></div>`).join("")}`
        : ""
    }
    <hr><button class="btn danger" id="reset">Erase all saved data…</button></div>`;
}

// ================= SYNC =================
function syncCardHTML() {
  if (Sync.enabled()) {
    const last = Sync.cfg().lastSync;
    return `<div class="card" id="sync-card"><h3>Sync between devices</h3>
      <p class="small"><span class="badge eligible">Connected</span> ${last ? "Last synced " + new Date(last).toLocaleString() : "Not synced yet"}.</p>
      <p class="small muted">Changes upload automatically. Your other devices pick them up whenever you open the app.</p>
      <div class="row"><button class="btn primary" id="sync-now">Sync now</button><button class="btn" id="show-qr">Connect my phone</button><button class="btn" id="copy-code">Copy pairing code</button><button class="btn ghost" id="sync-off">Disconnect this device</button></div>
      <div id="qr-box"></div></div>`;
  }
  const pairBox = `<details class="pair-code" ${isStandalone() ? "open" : ""}><summary>Already synced on another device? Connect with a pairing code</summary>
      <p class="small muted">On the connected device: Settings → <strong>Copy pairing code</strong>, send it to yourself (Notes, Messages, AirDrop), then paste it here.</p>
      <label class="field"><span>Pairing code</span><input type="text" id="pair-code" placeholder="Paste the code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
      <button class="btn primary" id="pair-code-go">Connect with code</button></details>`;
  return `<div class="card" id="sync-card"><h3>Sync between devices</h3>
    <p class="small muted">Keeps your Skill Bank, resumes, study progress, settings, phone number and API keys the same on your PC, laptop and phone. It's saved to a secret gist on your GitHub account — no passphrase needed.</p>
    <ol class="small steps-list">
      <li><a href="https://github.com/settings/tokens/new?scopes=gist&description=Launchpad%20sync" target="_blank" rel="noopener">Create a GitHub token ↗</a> — the “gist” box is already checked. Pick an expiration, click <strong>Generate token</strong>, and copy it.</li>
      <li>Paste it here and click Connect.</li>
      <li>On your other devices: use <strong>Connect my phone</strong> (QR code) or <strong>Copy pairing code</strong> — or paste the same token there.</li>
    </ol>
    <label class="field"><span>GitHub token</span><input type="password" id="sync-token" placeholder="ghp_…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
    <button class="btn primary" id="sync-connect">Connect</button>
    ${pairBox}</div>`;
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

function chooseSide() {
  return new Promise((resolve) => {
    modalBody.innerHTML = `<h2>Which data should win?</h2>
      <p>This device and your synced copy both have data. Pick one — the other gets replaced.</p>
      <div class="row"><button class="btn primary" data-pick="cloud">Use synced data</button><button class="btn" data-pick="device">Use this device's data</button></div>`;
    if (!modal.open) modal.showModal();
    modalBody.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        modal.close();
        resolve(b.dataset.pick);
      })
    );
  });
}

async function doConnect(token) {
  const result = await Sync.connect(token, chooseSide);
  toast(result === "cloud" ? "Connected — loaded your synced data." : "Connected — your data is synced.");
}

function wireSyncCard() {
  const $ = (id) => document.getElementById(id);
  $("sync-connect")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const token = $("sync-token").value.trim();
      if (!token) return toast("Paste your GitHub token first.");
      await doConnect(token);
      renderSettings();
    })
  );
  $("pair-code-go")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const raw = $("pair-code").value.trim();
      const pair = Sync.readPairCode(raw.includes("#pair/") ? raw.split("#pair/")[1] : raw);
      if (!pair) return toast("That pairing code isn't valid — copy it again from your other device.");
      Sync.setCfg({ gistId: pair.g });
      await doConnect(pair.t);
      renderSettings();
    })
  );
  $("copy-code")?.addEventListener("click", async () => {
    const code = Sync.pairLink().split("#pair/")[1];
    try {
      await navigator.clipboard.writeText(code);
      toast("Pairing code copied — paste it on your other device. Don't share it with anyone.");
    } catch {
      $("qr-box").innerHTML = `<p class="small">Copy this code (don't share it):</p><textarea readonly class="code-box">${esc(code)}</textarea>`;
    }
  });
  $("sync-now")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const changed = await Sync.syncNow();
      toast(changed ? "Loaded newer data from your other device." : "Everything's up to date.");
      renderSettings();
    })
  );
  $("sync-off")?.addEventListener("click", () => {
    if (!confirm("Stop syncing on this device? Your data stays here and in the cloud.")) return;
    Sync.disconnect();
    renderSettings();
  });
  $("show-qr")?.addEventListener("click", async () => {
    const box = $("qr-box");
    box.innerHTML = `<p class="small">Scan this with your phone's camera and open the link — it connects automatically. <strong>Don't share this code</strong>: it gives full access to your synced data.</p><div id="qr" class="qr"></div>`;
    try {
      if (!window.QRCode)
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
          s.onload = res;
          s.onerror = () => rej(new Error("Couldn't load the QR code library — check your connection."));
          document.head.appendChild(s);
        });
      new QRCode(document.getElementById("qr"), { text: Sync.pairLink(), width: 220, height: 220, correctLevel: QRCode.CorrectLevel.L });
    } catch (err) {
      box.innerHTML = `<p class="small">${esc(err.message)}</p>`;
    }
  });
}

let pendingPair = null;
function renderPair() {
  if (!pendingPair) return (app.innerHTML = empty(`That pairing link has already been used. On your PC, open Settings → Connect my phone to get a fresh QR code. <a href="#settings">Settings</a>`));
  app.innerHTML = `<div class="card pair">
      <h1>Connect this device</h1>
      <p class="muted">Tap Connect and your synced data loads in a few seconds.</p>
      <button class="btn primary block" id="pair-go">Connect</button>
    </div>`;
  document.getElementById("pair-go").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      await doConnect(pendingPair.t);
      pendingPair = null;
      go("dashboard");
    })
  );
}

async function syncOnOpen() {
  if (!Sync.enabled()) return;
  try {
    if (await Sync.syncNow()) {
      route.keepScroll = true;
      route();
      toast("Loaded your latest data from your other device.");
    }
  } catch (e) {
    toast("Sync: " + e.message);
  }
}

// ================= boot =================
{
  // A pairing link carries a GitHub token — read it, then strip it from the address bar and history.
  const m = location.hash.match(/^#pair\/(.+)$/);
  if (m) {
    pendingPair = Sync.readPairCode(m[1]);
    if (pendingPair) Sync.setCfg({ gistId: pendingPair.g });
    history.replaceState(null, "", location.pathname + "#pair");
  }
}
route();
syncOnOpen();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && syncOnOpen());
