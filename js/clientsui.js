// Client book screens: #clients (roster + pipeline) and #client/<id>/<tab> (the client file).
// You do the planning — the tools here do the math, check suitability and grade your work.

const STAGES = [
  ["prospect", "Prospect"],
  ["discovery", "Discovery"],
  ["plan", "Plan built"],
  ["client", "Client"],
];
const DIFF_LABEL = { easy: "Friendly", realistic: "Realistic", tough: "Tough" };

// ---------- small charts ----------
function fanChart(bands, { target = null, h = 200, label = (v) => Clients.usd(v) } = {}) {
  const w = 600;
  const max = Math.max(target || 0, ...bands.map((b) => b.p90)) * 1.08 || 1;
  const X = (i) => 36 + (i / Math.max(1, bands.length - 1)) * (w - 46);
  const Y = (v) => h - 22 - (v / max) * (h - 34);
  const area = bands.map((b, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(b.p90).toFixed(1)}`).join(" ") + " " + [...bands].reverse().map((b, j) => `L${X(bands.length - 1 - j).toFixed(1)} ${Y(b.p10).toFixed(1)}`).join(" ") + " Z";
  const mid = bands.map((b, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(b.p50).toFixed(1)}`).join(" ");
  return `<svg class="chart fan" viewBox="0 0 ${w} ${h}" role="img" aria-label="Range of outcomes">
    ${[0, 0.5, 1].map((f) => `<line x1="36" x2="${w - 10}" y1="${Y(max * f / 1.08)}" y2="${Y(max * f / 1.08)}" class="grid"/><text x="2" y="${Y(max * f / 1.08) + 4}" class="axis">${label(max * f / 1.08).replace("$", "$").replace(/,\d{3}$/, "k")}</text>`).join("")}
    <path d="${area}" class="band"/><path d="${mid}" class="chart-line" vector-effect="non-scaling-stroke"/>
    ${target ? `<line x1="36" x2="${w - 10}" y1="${Y(target)}" y2="${Y(target)}" class="target"/><text x="${w - 12}" y="${Y(target) - 5}" text-anchor="end" class="axis">goal ${label(target)}</text>` : ""}
    <text x="36" y="${h - 4}" class="axis">now</text><text x="${w - 10}" y="${h - 4}" text-anchor="end" class="axis">${bands.length - 1} yrs</text></svg>
    <div class="legend small muted"><span><i class="lg band"></i>10th–90th percentile</span><span><i class="lg line"></i>median</span>${target ? `<span><i class="lg target"></i>goal</span>` : ""}</div>`;
}
function linesChart(series, { h = 180, xLabel = "", fmt = (v) => Clients.usd(v) } = {}) {
  const w = 600;
  const len = Math.max(...series.map((s) => s.pts.length));
  const max = Math.max(1, ...series.flatMap((s) => s.pts)) * 1.08;
  const X = (i) => 36 + (i / Math.max(1, len - 1)) * (w - 46);
  const Y = (v) => h - 22 - (v / max) * (h - 34);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${[0, 0.5, 1].map((f) => `<line x1="36" x2="${w - 10}" y1="${Y(max * f / 1.08)}" y2="${Y(max * f / 1.08)}" class="grid"/><text x="2" y="${Y(max * f / 1.08) + 4}" class="axis">${fmt(max * f / 1.08).replace(/,\d{3}$/, "k")}</text>`).join("")}
    ${series.map((s) => `<path d="${s.pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ")}" class="chart-line ${s.cls || ""}" vector-effect="non-scaling-stroke"/>`).join("")}
    <text x="${w - 10}" y="${h - 4}" text-anchor="end" class="axis">${xLabel}</text></svg>
    <div class="legend small muted">${series.map((s) => `<span><i class="lg ${s.cls || "line"}"></i>${esc(s.name)}</span>`).join("")}</div>`;
}
function frontierChart(pick, suggested) {
  const w = 600;
  const h = 200;
  const pts = Array.from({ length: 11 }, (_, i) => {
    const s = i * 10;
    const m = Clients.mix({ stocks: s, bonds: Math.max(0, 95 - s), cash: Math.min(5, 100 - s) });
    return { s, mu: m.mu, sd: m.sd };
  });
  const X = (sd) => 40 + (sd / 0.17) * (w - 60);
  const Y = (mu) => h - 24 - ((mu - 0.025) / 0.075) * (h - 40);
  const dot = (alloc, cls, lbl) => {
    const m = Clients.mix(alloc);
    return `<circle cx="${X(m.sd)}" cy="${Y(m.mu)}" r="7" class="${cls}"/><text x="${X(m.sd) + 10}" y="${Y(m.mu) - 8}" class="axis strong">${lbl}</text>`;
  };
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Risk versus return">
    <path d="${pts.map((p, i) => `${i ? "L" : "M"}${X(p.sd)} ${Y(p.mu)}`).join(" ")}" class="chart-line" vector-effect="non-scaling-stroke"/>
    ${pts.filter((p) => p.s % 20 === 0).map((p) => `<circle cx="${X(p.sd)}" cy="${Y(p.mu)}" r="3" class="chart-dot"/><text x="${X(p.sd)}" y="${Y(p.mu) + 16}" text-anchor="middle" class="axis">${p.s}%</text>`).join("")}
    ${suggested ? dot(suggested, "dot-suggest", "profile") : ""}${dot(pick, "dot-pick", "your plan")}
    <text x="40" y="${h - 4}" class="axis">lower risk (volatility) →</text><text x="4" y="14" class="axis">↑ expected return</text></svg>`;
}

// ---------- roster ----------
function renderClients() {
  const list = Clients.all();
  app.innerHTML = `
    <div class="page-head"><div><div class="eyebrow">Financial planning</div><h1>Client book</h1><p class="muted">Practice clients with real-feeling lives. Meet them, collect their information, build a plan yourself, then follow up as their life changes. The app does the math and grades your plan — you do the planning.</p></div>
      <div class="row"><select id="cl-diff" aria-label="Difficulty">${Object.entries(DIFF_LABEL).map(([v, l]) => `<option value="${v}" ${v === "realistic" ? "selected" : ""}>${l} client</option>`).join("")}</select><button class="btn primary" id="cl-new">${icon("plus")} New client</button></div></div>
    <div class="pipeline">${STAGES.map(([k, l]) => `<div class="pipe-col"><div class="spread"><strong>${l}</strong><span class="pill">${list.filter((c) => c.stage === k).length}</span></div></div>`).join("")}</div>
    ${
      list.length
        ? `<div class="grid cards2">${list
            .map((c) => {
              const missing = Clients.fields(c).filter((f) => !c.collected[f.key] && !/^when-|^min-/.test(f.key)).length;
              return `<a class="card client-card" href="#client/${c.id}">
              <div class="spread"><div class="row"><span class="ch-dot sm" style="--c1:${Clients.persona(c).colors[0]};--c2:${Clients.persona(c).colors[1]};--c3:${Clients.persona(c).colors[2]}"></span><div><div class="row-title">${esc(c.first)} ${esc(c.last)}</div><div class="small muted">${c.age} · ${esc(c.job)} · ${DIFF_LABEL[c.difficulty]}</div></div></div><span class="pill stage-${c.stage}">${(STAGES.find(([k]) => k === c.stage)?.[1] || (c.stage === "lost" ? "Left" : c.stage))}</span></div>
              ${relBar(c)}
              <div class="small muted">${Clients.dateOf(c)} · ${c.meetings.length} meeting${c.meetings.length === 1 ? "" : "s"} · ${missing ? missing + " facts still unknown" : "discovery complete"}${c.plan?.grade ? ` · plan ${c.plan.grade.total}/100` : ""}</div></a>`;
            })
            .join("")}</div>`
        : empty(`No clients yet. Tap <strong>New client</strong> — you'll get their intake form (name, age, family, income) before your first meeting.`)
    }`;
  document.getElementById("cl-new").onclick = () => {
    const c = Clients.generate(document.getElementById("cl-diff").value);
    Clients.saveAll([c, ...Clients.all()]);
    toast(`New client: ${c.first} ${c.last}.`);
    go("client/" + c.id);
  };
}
function relBar(c) {
  const v = c.relationship;
  const lbl = v >= 80 ? "Loyal" : v >= 65 ? "Trusts you" : v >= 45 ? "Warming up" : v >= 25 ? "Guarded" : "At risk";
  return `<div class="rel"><div class="spread small"><span>Relationship</span><strong>${v} · ${lbl}</strong></div><div class="rel-bar"><i style="width:${v}%"></i></div></div>`;
}

// ---------- client file ----------
const CL_TABS = [
  ["overview", "Overview", "home"],
  ["data", "What you know", "clipboard"],
  ["plan", "Plan builder", "pen"],
  ["sims", "Simulations", "trend"],
  ["stress", "Stress tests", "alert"],
  ["meetings", "Meetings", "message"],
  ["tax", "Taxes", "layers"],
  ["income", "Retirement income", "sun"],
  ["estate", "Estate", "shield"],
  ["doc", "Plan document", "file"],
];
// The client journey: each step links to where you do it.
function journey(c) {
  const F = Clients.fields(c);
  const known = F.filter((f) => c.collected[f.key]).length;
  const docs = Clients.docsOf(c);
  const docsIn = docs.filter((d) => d.status === "received").length;
  const has = (t) => c.meetings.some((m) => m.type === t);
  return [
    { id: "meet", label: "Discovery", sub: has("discovery") ? `${known}/${F.length} facts` : "First meeting", done: has("discovery"), href: null, action: "meet" },
    { id: "docs", label: "Documents", sub: `${docsIn}/${docs.length} received`, done: docsIn === docs.length, href: `#client/${c.id}/data` },
    { id: "plan", label: "Build plan", sub: c.plan?.grade ? `Grade ${c.plan.grade.total}` : "Your turn", done: !!c.plan?.submittedAt, href: `#client/${c.id}/plan` },
    { id: "present", label: "Present", sub: has("presentation") ? "Done" : "Meeting", done: has("presentation"), href: null, action: "meet" },
    { id: "review", label: "Reviews", sub: `${c.meetings.filter((m) => m.type === "review").length} so far`, done: false, href: null, action: "meet" },
  ];
}
function renderClient(arg) {
  const [id, tab = "overview"] = arg.split("/");
  Clients.migrate();
  const c = Clients.find(id);
  if (!c) return (app.innerHTML = empty(`Client not found. <a href="#clients">Client book</a>`));
  c.docs = Clients.docsOf(c);
  const type = Clients.meetingType(c);
  const steps = journey(c);
  const cur = steps.findIndex((s) => !s.done);
  const others = Clients.all().filter((x) => x.id !== c.id);
  app.innerHTML = `
    <div class="cl-topbar"><a class="back" href="#fp">‹ Financial planning</a>${others.length ? `<select id="cl-switch" aria-label="Switch client"><option value="">Switch client…</option>${others.map((x) => `<option value="${x.id}">${esc(x.first + " " + x.last)} · ${(STAGES.find(([k]) => k === x.stage)?.[1] || (x.stage === "lost" ? "Left" : x.stage))}</option>`).join("")}</select>` : ""}</div>
    <div class="client-head card">
      <div class="orb-host client-orb" id="cl-orb"></div>
      <div class="grow"><div class="eyebrow">${esc(c.job)} · ${esc(c.city)} · ${DIFF_LABEL[c.difficulty]}${c.style ? " · " + esc(c.style) + " personality" : ""}</div><h1>${esc(c.first)} ${esc(c.last)}</h1>
        ${relBar(c)}</div>
      <div class="client-next"><div class="k">${Clients.dateOf(c)}</div>${nextStepHTML(c, type)}</div>
    </div>
    <div class="journey">${steps
      .map((s, i) => `<${s.href ? `a href="${s.href}"` : `button type="button" data-step="${s.action}"`} class="jstep ${s.done ? "done" : i === cur ? "cur" : ""}"><span class="jnum">${s.done ? icon("check") : i + 1}</span><span><strong>${s.label}</strong><span class="small muted">${s.sub}</span></span></${s.href ? "a" : "button"}>`)
      .join("")}</div>
    <nav class="client-tabs-wrap"><div class="tabs-inline client-tabs">${CL_TABS.map(([k, l, ic]) => `<a href="#client/${c.id}/${k}" class="${tab === k ? "on" : ""}">${icon(ic)}<span>${l}</span></a>`).join("")}</div></nav>
    <div id="cl-body"></div>`;
  Orb3D.mount(document.getElementById("cl-orb"), { colors: Clients.persona(c).colors });
  wireNextStep(c, type);
  document.getElementById("cl-switch")?.addEventListener("change", (e) => e.target.value && go("client/" + e.target.value + "/" + tab));
  app.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => document.getElementById("cl-meet")?.click()));
  if (window.gsap && !Motion.reduced) {
    gsap.from(app.querySelectorAll(".jstep"), { y: 10, autoAlpha: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" });
    Motion.ensureVisible([...app.querySelectorAll(".jstep")], 1500);
  }
  const body = document.getElementById("cl-body");
  ({ overview: clOverview, data: clData, plan: clPlan, sims: clSims, stress: clStress, meetings: clMeetings, doc: clDoc, tax: clTax, income: clIncome, estate: clEstate }[tab] || clOverview)(c, body);
  FPDock.attach();
}

function nextStepHTML(c, type) {
  // Meetings happen on the calendar. Today → start; later → skip ahead or move it; missed → reschedule.
  const b = FP.bookOf(c) || FP.book(c.book || "practice");
  const docsLeft = Clients.docsOf(c).filter((d) => d.status !== "received").length;
  const docsBtn = docsLeft && c.meetings.length ? `<button class="btn block" id="cl-docs">${icon("mail")} Email document request (${docsLeft})</button>` : "";
  if (c.stage === "lost") return `<div class="small bad-text">${esc(c.first)} left for another advisor.</div>`;
  const n = c.next;
  if (!n) return `<div class="small">No meeting booked.</div><button class="btn primary block" id="cl-book">${icon("calendar")} Book a ${Clients.MEETING_NAME[type].toLowerCase()}</button>${docsBtn}`;
  if (n.missed)
    return `<div class="small bad-text">Missed ${Clients.MEETING_NAME[n.type].toLowerCase()} (${FP.fmtDate(b, n.day)})${n.why === "noplan" ? " — they expected the plan" : ""}</div>
      <button class="btn primary block" id="cl-move">${icon("calendar")} Reschedule with ${esc(c.first)}</button>
      ${n.type === "presentation" && !c.plan?.submittedAt ? `<a class="btn block" href="#client/${c.id}/plan">${icon("pen")} Build the plan</a>` : ""}${docsBtn}`;
  const today = n.day === b.day;
  const noPlan = n.type === "presentation" && !c.plan?.submittedAt;
  const label = { discovery: "discovery meeting", followup: "follow-up call", presentation: "plan presentation", review: n.annual ? "annual review" : "review meeting" }[type] || "meeting";
  return `<div class="small">${today ? `<span class="good-text">Today</span> · ${Clients.MEETING_NAME[n.type]}` : `${Clients.MEETING_NAME[n.type]} · ${FP.fmtDate(b, n.day, { weekday: "short", month: "short", day: "numeric" })}`}</div>
    ${noPlan ? `<div class="small warn-text">Build and submit the plan before the presentation.</div><a class="btn ${today ? "primary" : ""} block" href="#client/${c.id}/plan">${icon("pen")} Build the plan</a>` : ""}
    ${today ? (noPlan ? `<button class="btn block" id="cl-meet" data-warn="1">${icon("mic")} Meet anyway (as a follow-up)</button>` : `<button class="btn primary block" id="cl-meet">${icon("mic")} Start ${label}</button>`) : `<button class="btn ${noPlan ? "" : "primary"} block" id="cl-skip">${icon("calendar")} Skip to ${FP.fmtDate(b, n.day, { weekday: "short", month: "short", day: "numeric" })}</button>`}
    <button class="btn block" id="cl-move">${icon("calendar")} Reschedule</button>
    ${type === "followup" && !today && FP.roomOn(b, b.day) >= FP.LOAD.followup ? `<button class="btn block" id="cl-quick">${icon("message")} Quick follow-up call today</button>` : ""}
    ${c.meetings.length ? `<button class="btn block ${c.hardTopic ? "warn-btn" : ""}" id="cl-hard">${icon("alert")} ${c.hardTopic ? "They need a difficult conversation" : "Difficult conversation…"}</button>` : ""}
    ${docsBtn}`;
}

function nextStepHTML_old(c, type) {
  const docsLeft = Clients.docsOf(c).filter((d) => d.status !== "received").length;
  const gaps = [
    [0, "Later this month"],
    [1, "In 1 month"],
    [3, "In 3 months"],
    [6, "In 6 months"],
    [12, "In 1 year"],
  ].filter(([m]) => !(type === "review" && m === 0));
  const gapSel = c.meetings.length ? `<label class="field"><span>When</span><select id="cl-gap">${gaps.map(([m, l]) => `<option value="${m}" ${m === (type === "review" ? 3 : 0) ? "selected" : ""}>${l}</option>`).join("")}</select></label>` : "";
  if (type === "followup")
    return `<a class="btn primary block" href="#client/${c.id}/plan">${icon("pen")} Build the plan</a>
      ${docsLeft ? `<button class="btn block" id="cl-docs">${icon("mail")} Email document request (${docsLeft})</button>` : ""}
      ${gapSel}<button class="btn block" id="cl-meet">${icon("mic")} Follow-up call to fill gaps</button>`;
  const label = { discovery: "Start discovery meeting", presentation: "Present your plan", review: "Review meeting" }[type];
  return `${gapSel}<button class="btn primary block" id="cl-meet">${icon("mic")} ${label}</button>${docsLeft && c.meetings.length ? `<button class="btn block" id="cl-docs">${icon("mail")} Email document request (${docsLeft})</button>` : ""}`;
}
function wireNextStep(c, type) {
  const b = FP.bookOf(c) || FP.book(c.book || "practice");
  const toMode = () => {
    const st = FP.state();
    if ((c.book || "practice") !== st.mode) {
      st.mode = c.book || "practice";
      FP.save(st);
    }
  };
  document.getElementById("cl-skip")?.addEventListener("click", () => {
    toMode();
    fpSkip(Math.max(1, (c.next?.day ?? b.day) - b.day));
  });
  document.getElementById("cl-move")?.addEventListener("click", () => pickReschedule(Clients.find(c.id)));
  document.getElementById("cl-book")?.addEventListener("click", () => {
    Clients.update(c.id, (x) => FP.schedule(x, type, b.day));
    toast(`Booked for ${FP.fmtDate(b, Clients.find(c.id).next.day)}.`);
    route.keepScroll = true;
    route();
  });
  document.getElementById("cl-docs")?.addEventListener("click", () => {
    const got = Clients.requestDocs(c.id);
    const left = Clients.docsOf(Clients.find(c.id)).filter((d) => d.status !== "received").length;
    toast(got.length ? `Documents arrived — ${got.length} new fact${got.length === 1 ? "" : "s"} added.${left ? ` ${left} still missing; follow up.` : ""}` : left ? "They haven't sent them yet — follow up in your next meeting." : "Everything's already in.");
    route.keepScroll = true;
    route();
  });
  const meetBtn = document.getElementById("cl-meet");
  if (meetBtn)
    meetBtn.onclick = () => {
      if (meetBtn.dataset.warn && !confirm(`${c.first} expects to see the plan. Meeting without one costs trust, and you'll still need to reschedule the presentation. Continue?`)) return;
      toMode();
      fpStartMeeting(Clients.find(c.id), Clients.meetingType(Clients.find(c.id)));
    };
  document.getElementById("cl-hard")?.addEventListener("click", () => {
    const H = Clients.HARD;
    const room = FP.roomOn(b, b.day);
    fpModal(
      `<h2>Difficult conversation with ${esc(c.first)}</h2><p class="small muted">Real planners have these: honest, kind, and with real numbers. Takes ${FP.LOAD.hard} hours of today (${room >= FP.LOAD.hard ? `${room} free` : "you don't have room today — skip to tomorrow first"}).</p>
      <div class="hard-list">${Object.entries(H)
        .filter(([, h]) => h.when(c))
        .map(([k, h]) => `<button class="btn block ${c.hardTopic === k ? "primary" : ""}" data-hard="${k}" ${room >= FP.LOAD.hard ? "" : "disabled"}>${esc(h.label)}${c.hardTopic === k ? " — recommended" : ""}</button>`)
        .join("")}</div>`,
      (el, close) =>
        el.querySelectorAll("[data-hard]").forEach(
          (btn) =>
            (btn.onclick = () => {
              close();
              toMode();
              Clients.update(c.id, (x) => delete x.hardTopic);
              fpStartMeeting(Clients.find(c.id), "hard", { topic: btn.dataset.hard });
            })
        )
    );
  });
  document.getElementById("cl-quick")?.addEventListener("click", () => {
    toMode();
    fpStartMeeting(Clients.find(c.id), "followup");
  });
}

// Everything a planner has on file before the first meeting: intake form, pre-meeting questionnaire, documents.
function intakeHTML(c, { compact = false } = {}) {
  const rows = [
    ["Name", `${c.first} ${c.last}`],
    ["Born", `${c.born || new Date().getFullYear() - c.age} (age ${c.age})`],
    ["Contact", `${c.email || "—"} · ${c.phone || "—"}`],
    ["Occupation", `${c.job}${c.employer ? " · " + c.employer : ""}`],
    ["Gross income (intake)", Clients.usd(c.income) + " / year"],
    ["Household", `${c.married ? "Married to " + c.partner : "Single"}`],
    ["Dependents", c.kids.length ? c.kids.map((k) => `${k.name} (${k.age})`).join(", ") : "None"],
    ["Home", `${c.city}, CA`],
    ["Referred by", c.referral],
    ["Why they called", c.reason],
  ];
  const docs = Clients.docsOf(c);
  const DOC_LBL = { brought: "bringing to the meeting", requested: "requested", received: "received" };
  return `<div class="intake ${compact ? "compact" : ""}">${rows.map(([a, b]) => `<div class="kv"><span>${a}</span><strong>${esc(String(b))}</strong></div>`).join("")}
    ${c.intakeGoals?.length ? `<div class="iq"><div class="k">Pre-meeting questionnaire — goals (their words)</div><ul class="small">${c.intakeGoals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>${c.concern ? `<div class="small">Biggest worry: <strong>${esc(c.concern)}</strong></div>` : ""}</div>` : ""}
    ${docs.length ? `<div class="iq"><div class="k">Documents</div><div class="docs">${docs.map((d) => `<span class="doc ${d.status === "received" ? "in" : d.status === "brought" ? "brought" : ""}" title="${DOC_LBL[d.status]}">${icon(d.status === "received" ? "check" : d.status === "brought" ? "clipboard" : "mail")} ${esc(d.name)}</span>`).join("")}</div><div class="small muted">Ask for documents in a meeting: what they brought gets reviewed, the rest arrives after. Received documents fill in your data automatically.</div></div>` : ""}</div>`;
}

function clOverview(c, el) {
  const k = Clients.known(c);
  el.innerHTML = `${decisionCards(c)}
    <div class="two-col">
      <section class="card"><h2>Client file</h2><p class="small muted">What a planner has before the first meeting. Everything else you learn by asking.</p>${intakeHTML(c)}</section>
      <section class="card"><h2>Timeline</h2><div class="timeline">${[
        ...c.meetings.map((m) => ({ month: m.month, at: m.at, html: `<strong>${Clients.MEETING_NAME[m.type] || m.type}</strong> · scored ${m.score} · learned ${(m.found || []).length} new fact${(m.found || []).length === 1 ? "" : "s"}${m.remembered?.length ? ` · remembered ${m.remembered.join(", ")}` : ""}` })),
        ...c.events.map((e) => ({ month: e.month, at: 0, html: `${icon("alert")} ${esc(e.text)}` })),
        ...(c.plan?.submittedAt ? [{ month: c.plan.month ?? c.month, at: c.plan.submittedAt, html: `${icon("check")} Plan submitted · grade ${c.plan.grade.total}/100` }] : []),
      ]
        .sort((a, b) => a.month - b.month || a.at - b.at)
        .map((x) => `<div class="tl-row"><span class="tl-date">${Clients.dateOf(c, x.month)}</span><span>${x.html}</span></div>`)
        .join("") || `<p class="small muted">Nothing yet — start with a discovery meeting.</p>`}</div></section>
    </div>
    <section class="card"><h2>Relationship history</h2><div class="list compact">${c.relHistory
      .slice()
      .reverse()
      .map((h) => `<div class="list-row"><span class="pill ${h.delta > 0 ? "good" : h.delta < 0 ? "pill-urgent" : ""}">${h.delta > 0 ? "+" : ""}${h.delta}</span><div class="grow small">${esc(h.reason)}</div><span class="small muted">${Clients.dateOf(c, h.month)}</span></div>`)
      .join("")}</div>
      <p class="small muted">Moves with how each meeting goes, how their plan performs, and whether you remember personal details from earlier meetings.</p></section>
    ${k.cash != null || c.portfolio.length > 1 ? `<section class="card"><h2>Investments over time</h2>${linesChart([{ name: "Retirement accounts", pts: c.portfolio.map((p) => p.value) }], { xLabel: Clients.dateOf(c) })}</section>` : ""}
    <div class="row"><button class="btn ghost" id="cl-del">${icon("trash")} Remove client</button></div>`;
  wireDecisions(c, el);
  document.getElementById("cl-del").onclick = () => {
    if (!confirm(`Remove ${c.first} ${c.last} and all their meetings? (A restore point is kept in Settings.)`)) return;
    Backup.snapshot("Automatic — before removing a client");
    Clients.saveAll(Clients.all().filter((x) => x.id !== c.id));
    go("clients");
  };
}

// What you've learned — and what's still missing.
function clData(c, el) {
  const F = Clients.fields(c);
  const tough = c.difficulty === "tough";
  const show = tough ? !!clData.show : true;
  const secs = [...new Set(F.map((f) => f.sec))];
  const missing = F.filter((f) => !c.collected[f.key]);
  const fmt = (f, v) => (v == null ? "—" : Array.isArray(v) ? "5 answers on file" : f.pct ? v + "%" : f.years ? v + " yrs" : typeof v === "number" ? (f.key === "risk" ? "noted" : Clients.usd(v)) : v);
  el.innerHTML = `
    <div class="stats"><div class="card stat"><div class="k">Facts collected</div><div class="stat-v">${F.length - missing.length}<span class="muted">/${F.length}</span></div></div>
      <div class="card stat"><div class="k">Meetings</div><div class="stat-v">${c.meetings.length}</div></div>
      <div class="card stat"><div class="k">Data rule</div><div class="small">${tough ? "Tough client: missing facts are hidden. You may fill gaps yourself — but the grade checks the truth." : "Missing facts become the agenda for your next meeting. If a client told you something the app missed, type it in the box."}</div></div></div>
    ${tough ? `<button class="btn" id="cl-show">${icon("search")} ${show ? "Hide missing" : "Show missing"}</button>` : ""}
    ${secs
      .map((sec) => {
        const rows = F.filter((f) => f.sec === sec && (show || c.collected[f.key] || c.manual?.[f.key] != null));
        if (!rows.length) return "";
        return `<section class="card"><h2>${sec}</h2>${rows
          .map((f) => {
            const got = c.collected[f.key];
            const man = c.manual?.[f.key];
            return `<div class="data-row ${got ? "got" : "miss"}"><div class="grow"><strong>${esc(f.label)}</strong>${got ? `<div class="small muted">${got.doc ? `${icon("file")} ${esc(got.doc)}` : `“${esc(got.quote)}” — meeting ${got.meeting}`}${got.approx ? " · approximate" : ""}</div>` : f.key === "riskq" ? `<div class="small warn-text">It's a document: ask them to send it (Email document request, or ask for it in a meeting)</div>` : tough ? `<div class="small muted">Not collected — fill it in if you can justify it.</div>` : `<div class="small warn-text">Ask next meeting</div>`}</div>
              <div class="data-val">${got ? fmt(f, got.value) : f.num != null ? `<input class="mini-field" type="number" step="any" data-man="${f.key}" value="${man ?? ""}" placeholder="${tough ? "?" : "heard it?"}" title="They told you but the app missed it? Type it here.">` : "—"}</div></div>`;
          })
          .join("")}</section>`;
      })
      .join("")}
    ${!tough && c.meetings.length ? `<section class="card"><h2>Next meeting agenda</h2><p class="small muted">${Clients.MEETING_NAME[Clients.meetingType(c)]}</p><ul>${Clients.agendaFor(c, Clients.meetingType(c)).map((a) => `<li>${esc(a.label)}</li>`).join("")}</ul></section>` : ""}`;
  document.getElementById("cl-show")?.addEventListener("click", () => ((clData.show = !show), clData(c, el)));
  el.querySelectorAll("[data-man]").forEach((inp) =>
    inp.addEventListener("change", () =>
      Clients.update(c.id, (x) => {
        x.manual ||= {};
        if (inp.value === "") delete x.manual[inp.dataset.man];
        else x.manual[inp.dataset.man] = +inp.value;
      })
    )
  );
}

// ---------- plan builder ----------
// What the client has actually told you (or put in writing) for each risk question.
function riskEvidence(c, qi) {
  const q = Clients.val(c, "riskq");
  if (Array.isArray(q)) return { has: true, text: `Their questionnaire: “${Clients.RISK_QS[qi][1][q[qi]]}”` };
  const said = c.collected.risk;
  const k = Clients.known(c);
  if (qi <= 1) return said ? { has: true, text: `They said: “${said.quote}”` } : { has: false, text: "No data yet — ask how they'd feel if their investments dropped, or get their risk questionnaire." };
  if (qi === 2) {
    const g = k.goals.filter((x) => x.years != null);
    return g.length ? { has: true, text: "Goal timelines: " + g.map((x) => `${x.name.toLowerCase()} in ${x.years} yrs`).join(", ") } : { has: false, text: "No timelines yet — ask when they need the money." };
  }
  if (qi === 3) return { has: true, text: `Intake: ${c.job}${c.payType ? ` (${c.payType} pay)` : ""}${c.events.some((e) => e.id === "jobloss") ? " · was laid off recently" : ""}` };
  const acct = [k.k401 != null && `401(k) ${Clients.usd(k.k401)}`, k.roth != null && (k.roth ? `Roth IRA ${Clients.usd(k.roth)}` : "no Roth IRA")].filter(Boolean);
  return acct.length ? { has: true, text: "Accounts: " + acct.join(", ") } : { has: false, text: "No data yet — ask about their retirement and investment accounts." };
}
function defaultPlan(c) {
  const k = Clients.known(c);
  return { riskAnswers: [null, null, null, null, null], efMonths: 4, efMonthly: 0, debtStrategy: "avalanche", extraDebt: 0, k401Pct: k.contrib ?? 0, alloc: { stocks: 60, bonds: 35, cash: 5 }, goalSavings: {}, notes: "" };
}
function clPlan(c, el) {
  const plan = Object.assign(defaultPlan(c), c.plan || {});
  const k = Clients.known(c);
  const goals = Clients.collectedGoals(c);
  const save = () => Clients.update(c.id, (x) => (x.plan = { ...(x.plan || {}), ...plan, efTarget: (k.expenses || 0) * plan.efMonths }));
  const hint = (txt) => `<details class="hint"><summary>${icon("bulb")} Hint</summary><p class="small">${txt}</p></details>`;
  const num = (id, v, step = 25) => `<input type="number" min="0" step="${step}" id="${id}" value="${v ?? ""}" inputmode="decimal">`;
  el.innerHTML = `
    <div class="plan-grid">
      <div class="plan-main">
        <section class="card"><h2>1 · Risk profile</h2><p class="small muted">Fill in each answer from the client's own data — the evidence you've collected is shown under each question. Answers with no evidence get flagged.</p>
          ${Clients.RISK_QS.map(([q, opts], qi) => {
            const ev = riskEvidence(c, qi);
            return `<div class="rq"><div class="small"><strong>${q}</strong></div><div class="evidence ${ev.has ? "" : "none"}">${icon(ev.has ? "file" : "alert")} ${esc(ev.text)}</div><div class="segmented wrap">${opts.map((o, oi) => `<button data-rq="${qi}" data-ro="${oi}" class="${plan.riskAnswers[qi] === oi ? "on" : ""}">${o}</button>`).join("")}</div></div>`;
          }).join("")}
          <div id="pl-risk" class="callout"></div>${hint("Real planners never guess risk tolerance — it comes from the client's questionnaire and what they said. If evidence is missing, ask for the risk questionnaire (it's one of their documents) or ask how they'd feel if their investments fell 25%.")}</section>
        <section class="card"><h2>2 · Cash flow</h2><div id="pl-cash"></div>${hint("Surplus = take-home pay − housing − other spending − minimum debt payments. Your plan can't spend more than this each month.")}</section>
        <section class="card"><h2>3 · Emergency fund</h2>
          <label class="field"><span>Target</span><div class="segmented">${[3, 4, 6, 9, 12].map((m) => `<button data-ef="${m}" class="${plan.efMonths === m ? "on" : ""}">${m} mo</button>`).join("")}</div></label>
          <label class="field"><span>Monthly contribution to emergency fund</span>${num("pl-efm", plan.efMonthly)}</label><div id="pl-ef" class="small"></div>${hint("3 months is the floor for stable jobs, 6+ for single-income households, commission or business owners. Build it before investing beyond the employer match.")}</section>
        <section class="card"><h2>4 · Debt payoff</h2>${k.debts.length ? `<label class="field"><span>Strategy</span><div class="segmented"><button data-ds="avalanche" class="${plan.debtStrategy !== "snowball" ? "on" : ""}">Avalanche (highest rate first)</button><button data-ds="snowball" class="${plan.debtStrategy === "snowball" ? "on" : ""}">Snowball (smallest balance first)</button></div></label>
          <label class="field"><span>Extra payment per month</span>${num("pl-extra", plan.extraDebt)}</label><div id="pl-debt"></div>` : `<p class="small muted">No debts collected yet. ${c.difficulty === "tough" ? "" : "Ask about debts next meeting."}</p>`}${hint("Avalanche minimizes interest. Snowball pays off small balances first for quick wins — reasonable for an anxious client who needs momentum. Anything above ~8% interest beats expected market returns.")}</section>
        <section class="card"><h2>5 · Retirement</h2><label class="field"><span>401(k) contribution: <strong id="pl-kv">${plan.k401Pct}%</strong>${k.match ? ` · employer matches up to ${k.match}%` : k.match === 0 ? " · no match" : " · match unknown"}</span><input type="range" min="0" max="20" step="1" id="pl-k401" value="${plan.k401Pct}"></label><div id="pl-ret"></div>${hint("Always capture the full match first — it's an instant 50-100% return. Then aim for 10-15% of pay once high-interest debt is handled.")}</section>
        <section class="card"><h2>6 · Portfolio</h2>
          <div class="row wrap">${Clients.MODELS.map((m, i) => `<button class="chip pick" data-model="${i}">${m.name}</button>`).join("")}</div>
          <label class="field"><span>Stocks <strong id="pl-sv">${plan.alloc.stocks}%</strong></span><input type="range" min="0" max="100" step="5" id="pl-stocks" value="${plan.alloc.stocks}"></label>
          <label class="field"><span>Bonds <strong id="pl-bv">${plan.alloc.bonds}%</strong> · Cash <strong id="pl-cv">${plan.alloc.cash}%</strong></span><input type="range" min="0" max="100" step="5" id="pl-bonds" value="${plan.alloc.bonds}"></label>
          <div id="pl-front"></div>${hint("More stocks = higher expected return and bigger swings. The dot should sit near the client's risk profile; money needed within ~3 years shouldn't ride the stock market.")}</section>
        <section class="card"><h2>7 · Goals</h2>${goals.length ? goals.map((g) => `<div class="goal-row"><div class="grow"><strong>${esc(g.name)}</strong><div class="small muted">${g.target ? Clients.usd(g.target) : "amount unknown"} · ${g.years ? g.years + " yrs" : "timeline unknown"}</div></div><label class="field"><span>$/month</span>${num("pl-g-" + g.id, plan.goalSavings[g.id] ?? "")}</label><button class="btn small" data-need="${g.id}">90% amount</button><div class="goal-prob" id="pl-gp-${g.id}"></div></div>`).join("") : `<p class="small muted">No goals collected yet.</p>`}${hint("Short goals → save in cash. Long goals → invest. The '90% amount' button finds the monthly savings that hits the goal in 9 of 10 simulated futures.")}</section>
        <section class="card"><h2>8 · Recommendations</h2><textarea id="pl-notes" rows="5" placeholder="Write your recommendations in plain English, in priority order.">${esc(plan.notes)}</textarea>
          <div class="row"><button class="btn primary" id="pl-submit">${icon("check")} Submit plan for grading</button>${AI.enabled() ? `<button class="btn" id="pl-ai">${icon("sparkles")} Ask Claude for feedback</button>` : ""}</div><div id="pl-grade"></div></section>
      </div>
      <aside class="plan-side card"><h3>Compliance check</h3><div id="pl-comp"></div><p class="small muted">Updates live, like a firm's suitability review.</p></aside>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const refresh = () => {
    const rs = Clients.riskScore(plan.riskAnswers);
    const model = rs ? Clients.MODELS[rs - 1] : null;
    $("pl-risk").innerHTML = model ? `Risk score <strong>${rs}/5 — ${model.name}</strong>. Suggested: ${model.stocks}% stocks / ${model.bonds}% bonds / ${model.cash}% cash.` : "Answer all five to get a risk score.";
    const surplus = k.takeHome - (k.expenses || 0) - k.minPay;
    const outflow = Object.values(plan.goalSavings).reduce((n, v) => n + (+v || 0), 0) + (+plan.efMonthly || 0) + (+plan.extraDebt || 0);
    $("pl-cash").innerHTML = `${[
      ["Take-home pay", c.collected.takeHome ? Clients.usd(k.takeHome) : `${Clients.usd(k.takeHome)} <span class="muted small">(estimated from intake income)</span>`],
      ["Housing", k.housing != null ? Clients.usd(k.housing) : "unknown"],
      ["Other spending", k.living != null ? Clients.usd(k.living) : "unknown"],
      ["Minimum debt payments", Clients.usd(k.minPay)],
      ["Monthly surplus", k.expenses != null ? `<strong>${Clients.usd(surplus)}</strong>` : "unknown — ask about spending"],
      ["Your plan uses", `<strong class="${k.expenses != null && outflow > surplus ? "bad-text" : ""}">${Clients.usd(outflow)}</strong>`],
    ]
      .map(([a, b]) => `<div class="kv"><span>${a}</span><span>${b}</span></div>`)
      .join("")}`;
    const efT = (k.expenses || 0) * plan.efMonths;
    const efNeed = Math.max(0, efT - (k.cash || 0));
    $("pl-ef").innerHTML = k.expenses ? `Target ${Clients.usd(efT)} · they have ${k.cash != null ? Clients.usd(k.cash) : "unknown"} · ${efNeed && plan.efMonthly > 0 ? `fully funded in ${Math.ceil(efNeed / plan.efMonthly)} months` : efNeed ? "set a monthly amount" : "already funded"}` : "Need their spending to size the emergency fund.";
    if ($("pl-debt")) {
      const a = Clients.payoff(k.debts, +plan.extraDebt || 0, "avalanche");
      const s = Clients.payoff(k.debts, +plan.extraDebt || 0, "snowball");
      $("pl-debt").innerHTML = `<div class="metrics two">${[
        ["Avalanche", a],
        ["Snowball", s],
      ]
        .map(([n, r]) => metricCard(n, r.never ? "Never" : `${Math.floor(r.months / 12)}y ${r.months % 12}m`, r.never ? "payments don't cover interest" : `${Clients.usd(r.interest)} interest`, (plan.debtStrategy === "snowball") === (n === "Snowball") ? "good-text" : ""))
        .join("")}</div>${k.debts.some((d) => d.apr == null) ? `<p class="small warn-text">Some interest rates are unknown (assumed 15%).</p>` : ""}${linesChart(
        [
          { name: "Avalanche", pts: a.series },
          { name: "Snowball", pts: s.series, cls: "alt" },
        ],
        { xLabel: `${Math.max(a.months, s.months)} months` }
      )}`;
    }
    const retireG = goals.find((g) => g.id === "retire") || { years: Math.max(10, 65 - c.age), target: c.income * 10 };
    const mcR = Clients.monteCarlo({ start: (k.k401 || 0) + (k.roth || 0), monthly: (c.income / 12) * ((+plan.k401Pct || 0) + Math.min(k.match || 0, +plan.k401Pct || 0)) / 100, years: retireG.years || 20, alloc: plan.alloc, target: retireG.target || c.income * 10, n: 600 });
    $("pl-ret").innerHTML = `<div class="small">Retirement: <strong>${Math.round(mcR.success * 100)}%</strong> chance of reaching ${Clients.usd(retireG.target || c.income * 10)} in ${retireG.years} years · median ${Clients.usd(mcR.median)}${k.k401 == null ? " <span class='warn-text'>(current balance unknown — assumed $0)</span>" : ""}</div>`;
    $("pl-front").innerHTML = frontierChart(plan.alloc, model);
    for (const g of goals) {
      const box = $("pl-gp-" + g.id);
      if (!box) continue;
      if (!g.target || !g.years) {
        box.innerHTML = `<span class="small muted">Need amount and timeline</span>`;
        continue;
      }
      const alloc = g.years <= 3 ? { stocks: 0, bonds: 20, cash: 80 } : plan.alloc;
      const r = Clients.monteCarlo({ start: c.goalBalances?.[g.id] || 0, monthly: +plan.goalSavings[g.id] || 0, years: g.years, alloc, target: g.target, n: 500 });
      box.innerHTML = ring(Math.round(r.success * 100), { size: 46 });
    }
    const flags = Clients.compliance(c, plan);
    $("pl-comp").innerHTML = flags.length ? flags.map((f) => `<div class="flag-row ${f.sev}"><strong>${f.sev === "high" ? "Fix" : "Review"}</strong><p class="small">${esc(f.text)}</p><p class="small muted">${esc(f.fix)}</p></div>`).join("") : `<p class="good-text small">${icon("check")} No issues found.</p>`;
    $("pl-sv").textContent = plan.alloc.stocks + "%";
    $("pl-bv").textContent = plan.alloc.bonds + "%";
    $("pl-cv").textContent = plan.alloc.cash + "%";
    $("pl-kv").textContent = plan.k401Pct + "%";
  };
  const changed = () => (refresh(), clearTimeout(clPlan._t), (clPlan._t = setTimeout(save, 400)));
  el.querySelectorAll("[data-rq]").forEach((b) => b.addEventListener("click", () => ((plan.riskAnswers[+b.dataset.rq] = +b.dataset.ro), b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)), changed())));
  el.querySelectorAll("[data-ef]").forEach((b) => b.addEventListener("click", () => ((plan.efMonths = +b.dataset.ef), b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)), changed())));
  el.querySelectorAll("[data-ds]").forEach((b) => b.addEventListener("click", () => ((plan.debtStrategy = b.dataset.ds), b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)), changed())));
  $("pl-efm").addEventListener("input", (e) => ((plan.efMonthly = +e.target.value || 0), changed()));
  $("pl-extra")?.addEventListener("input", (e) => ((plan.extraDebt = +e.target.value || 0), changed()));
  $("pl-k401").addEventListener("input", (e) => ((plan.k401Pct = +e.target.value), changed()));
  const setAlloc = (s, b) => {
    s = Math.max(0, Math.min(100, s));
    b = Math.max(0, Math.min(100 - s, b));
    plan.alloc = { stocks: s, bonds: b, cash: 100 - s - b };
    $("pl-stocks").value = s;
    $("pl-bonds").value = b;
    changed();
  };
  $("pl-stocks").addEventListener("input", (e) => setAlloc(+e.target.value, Math.min(plan.alloc.bonds, 100 - +e.target.value)));
  $("pl-bonds").addEventListener("input", (e) => setAlloc(plan.alloc.stocks, +e.target.value));
  el.querySelectorAll("[data-model]").forEach((b) => b.addEventListener("click", () => {
    const m = Clients.MODELS[+b.dataset.model];
    setAlloc(m.stocks, m.bonds);
  }));
  goals.forEach((g) => $("pl-g-" + g.id)?.addEventListener("input", (e) => ((plan.goalSavings[g.id] = +e.target.value || 0), changed())));
  el.querySelectorAll("[data-need]").forEach((b) =>
    b.addEventListener("click", () => {
      const g = goals.find((x) => x.id === b.dataset.need);
      if (!g?.target || !g.years) return toast("Need the goal's amount and timeline first.");
      const amt = Clients.needed90({ start: c.goalBalances?.[g.id] || 0, years: g.years, alloc: g.years <= 3 ? { stocks: 0, bonds: 20, cash: 80 } : plan.alloc, target: g.target });
      $("pl-g-" + g.id).value = amt;
      plan.goalSavings[g.id] = amt;
      changed();
      toast(`${Clients.usd(amt)}/month reaches ${g.name.toLowerCase()} in about 9 of 10 simulated futures.`);
    })
  );
  $("pl-notes").addEventListener("input", (e) => ((plan.notes = e.target.value), clearTimeout(clPlan._t), (clPlan._t = setTimeout(save, 600))));
  const showGrade = (g) => {
    $("pl-grade").innerHTML = `<div class="grade-card"><div class="spread"><h3>Plan grade</h3>${ring(g.total, { size: 72, tone: g.total >= 80 ? "good" : g.total >= 60 ? "accent" : "warn" })}</div>${g.parts
      .map((p) => `<div class="rubric-row"><div class="spread small"><strong>${esc(p.name)}</strong><span>${p.score}/${p.max}</span></div><div class="bar"><i style="width:${(p.score / p.max) * 100}%"></i></div><div class="small">${esc(p.why)}</div><details class="small muted"><summary>What an expert would do</summary>${esc(p.expert)}</details></div>`)
      .join("")}<p class="small muted">Graded against ${esc(c.first)}'s real situation — including anything you didn't collect.</p></div>`;
    Motion.reveal($("pl-grade"));
  };
  $("pl-submit").onclick = () => {
    plan.efTarget = (k.expenses || 0) * plan.efMonths;
    const g = Clients.grade(c, plan);
    Clients.update(c.id, (x) => {
      x.plan = { ...plan, efTarget: (k.expenses || 0) * plan.efMonths, submittedAt: Date.now(), month: x.month, grade: g };
      if (x.stage === "discovery" || x.stage === "prospect") x.stage = "plan";
      const flags = Clients.compliance(x, plan).filter((f) => f.sev === "high").length;
      if (flags) {
        x.relationship = Math.max(0, x.relationship - flags * 2);
        x.relHistory.push({ month: x.month, delta: -flags * 2, reason: `${flags} unsuitable recommendation${flags === 1 ? "" : "s"} in the plan` });
      }
    });
    showGrade(g);
    toast(`Plan graded: ${g.total}/100. Next: present it to ${c.first}.`);
  };
  $("pl-ai")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const text = await AI.ask(
        `Mason (15, learning financial planning) built a plan for a PRACTICE client. Review it like a senior planner coaching a trainee: what's strong, what's risky or unsuitable, and the 3 most important fixes. Use only the information Mason collected (below) — if something important is missing, say he should ask for it. Plain text, under 220 words.
Client: ${c.first}, ${c.age}, ${c.job}, income ${Clients.usd(c.income)}, ${c.married ? "married" : "single"}, ${c.kids.length} kids.
What Mason collected: ${JSON.stringify(Clients.known(c))}
His plan: ${JSON.stringify(plan)}
Compliance flags: ${JSON.stringify(Clients.compliance(c, plan).map((f) => f.text))}`,
        { effort: "medium", maxTokens: 1500 }
      );
      $("pl-grade").insertAdjacentHTML("beforeend", `<div class="callout mt-s"><strong>Claude's feedback</strong>${richText(text)}</div>`);
    })
  );
  refresh();
  if (c.plan?.grade) showGrade(c.plan.grade);
}

function clSims(c, el) {
  const plan = Object.assign(defaultPlan(c), c.plan || {});
  const k = Clients.known(c);
  const goals = Clients.collectedGoals(c).filter((g) => g.target && g.years);
  const retire = { id: "retire", name: "Retirement accounts", years: Math.max(10, (goals.find((g) => g.id === "retire")?.years) || 65 - c.age), target: goals.find((g) => g.id === "retire")?.target || null };
  const ret = Clients.monteCarlo({ start: (k.k401 || 0) + (k.roth || 0), monthly: (c.income / 12) * ((+plan.k401Pct || 0) + Math.min(k.match || 0, +plan.k401Pct || 0)) / 100, years: retire.years, alloc: plan.alloc, target: retire.target, n: 1000 });
  const { mu, sd } = Clients.mix(plan.alloc);
  el.innerHTML = `
    <section class="card"><div class="section-head"><h2>Monte Carlo: retirement</h2><span class="small muted">1,000 simulated futures · ${plan.alloc.stocks}/${plan.alloc.bonds}/${plan.alloc.cash} · expected ${(mu * 100).toFixed(1)}% ± ${(sd * 100).toFixed(1)}% a year</span></div>
      ${fanChart(ret.bands, { target: retire.target })}
      <div class="metrics">${metricCard("Chance of success", retire.target ? Math.round(ret.success * 100) + "%" : "—", retire.target ? "reaching the goal" : "collect the retirement goal", ret.success >= 0.8 ? "good-text" : ret.success >= 0.6 ? "" : "warn-text")}${metricCard("Median outcome", Clients.usd(ret.median), "in " + retire.years + " years", "")}${metricCard("Bad case (10th pct)", Clients.usd(ret.bands[retire.years].p10), "1 in 10 futures are worse", "")}${metricCard("Good case (90th pct)", Clients.usd(ret.bands[retire.years].p90), "1 in 10 are better", "")}</div>
      <p class="small muted">Assumptions: stocks ${ASSUMP.stocks}, bonds ${ASSUMP.bonds}, cash ${ASSUMP.cash}; yearly returns drawn at random around those averages. Not a prediction — a range.</p></section>
    ${goals
      .filter((g) => g.id !== "retire")
      .map((g) => {
        const alloc = g.years <= 3 ? { stocks: 0, bonds: 20, cash: 80 } : plan.alloc;
        const r = Clients.monteCarlo({ start: c.goalBalances?.[g.id] || 0, monthly: +plan.goalSavings?.[g.id] || 0, years: g.years, alloc, target: g.target, n: 1000 });
        return `<section class="card"><div class="section-head"><h2>${esc(g.name)}</h2><span class="small muted">${Clients.usd(+plan.goalSavings?.[g.id] || 0)}/mo · ${g.years <= 3 ? "kept in cash (short goal)" : "invested"}</span></div>${fanChart(r.bands, { target: g.target })}<p><strong>${Math.round(r.success * 100)}%</strong> chance of reaching ${Clients.usd(g.target)} in ${g.years} years.</p></section>`;
      })
      .join("")}
    ${!goals.length ? empty("Collect goals (amount + timeline) in a meeting to simulate them.") : ""}`;
}
const ASSUMP = { stocks: "9.5% ± 16%", bonds: "4.5% ± 6%", cash: "3%" };

function clStress(c, el) {
  const plan = Object.assign(defaultPlan(c), c.plan || {});
  const runway = Clients.jobLossRunway(c, plan);
  el.innerHTML = `
    <p class="muted">How ${esc(c.first)}'s plan holds up in real historical scenarios (using their ${plan.alloc.stocks}/${plan.alloc.bonds}/${plan.alloc.cash} allocation and the retirement balance you collected).</p>
    <div class="grid cards2">${Clients.STRESS.map((s) => {
      const r = Clients.stress(c, plan, s);
      return `<section class="card"><h3>${esc(s.name)}</h3><p class="small muted">${esc(s.note)}</p>${linesChart([{ name: "Portfolio (real $)", pts: r.pts }], { h: 140, xLabel: r.pts.length - 1 + " yrs" })}<div class="kv"><span>Worst drop</span><strong class="${r.drop < -0.25 ? "bad-text" : ""}">${Math.round(r.drop * 100)}%</strong></div><div class="kv"><span>Ends at</span><strong>${Clients.usd(r.end)}</strong></div></section>`;
    }).join("")}
      <section class="card"><h3>Job loss (6 months)</h3><p class="small muted">If income stopped today, how long could they cover expenses and minimum payments?</p><div class="bigscore ${runway != null && runway < 3 ? "bad-text" : "good-text"}">${runway == null ? "—" : runway.toFixed(1) + " months"}</div><p class="small">${runway == null ? "Collect their spending and savings to test this." : runway >= 6 ? "They'd make it through a typical job search." : "They'd run out before a typical 4-6 month job search — strengthen the emergency fund."}</p></section>
    </div>`;
}

function clMeetings(c, el) {
  if (!c.meetings.length) return (el.innerHTML = empty("No meetings yet."));
  el.innerHTML = c.meetings
    .map((m, idx) => ({ m, idx }))
    .reverse()
    .map(({ m, idx }) => {
      const tips = Clients.coachLines(c, m);
      const nTips = Object.values(tips).flat().filter((t) => t[0] !== "good").length;
      return `<section class="card"><div class="section-head"><div><h2>${esc(Clients.MEETING_NAME[m.type] || m.type)} · ${Clients.dateOf(c, m.month)}</h2>
        <div class="small muted">${[m.reason ? `“${esc(m.reason)}”` : "", m.guest ? `with ${esc(m.guest)}` : "", m.mood ? `they were ${esc(m.mood)} — ${m.moodRead ? "you noticed" : "you missed it"}` : ""].filter(Boolean).join(" · ")}</div></div>${ring(m.score, { size: 46 })}</div>
        <p class="small">${esc(m.summary || "")}</p>${m.notes ? `<div class="callout small"><strong>Your notes</strong><p class="pre">${esc(m.notes)}</p></div>` : ""}
        <p class="small muted">Learned: ${(m.found || []).map((k) => esc(Clients.fieldLabel(c, k))).join(", ") || "nothing new"}${m.remembered?.length ? " · remembered " + m.remembered.join(", ") : ""}</p>
        ${m.concepts?.length ? `<details><summary>Concepts that came up (${m.concepts.length})</summary><div class="concept-cards">${m.concepts.map((k) => `<div class="concept"><strong>${esc(k.title)}</strong><p class="small">${esc(k.text)}</p></div>`).join("")}</div></details>` : ""}
        <details ${location.hash.endsWith("/meetings") && idx === c.meetings.length - 1 ? "" : ""}><summary>Replay with coaching${nTips ? ` (${nTips} tip${nTips === 1 ? "" : "s"})` : ""}</summary><div class="transcript full replay">${(m.thread || [])
          .map((t, i) => `<div class="rp-line ${t.from === "me" ? "me" : "them"}"><p><strong>${t.from === "me" ? "You" : esc(c.first)}:</strong> ${esc(t.text)}</p>${(tips[i] || []).map((x) => `<div class="rp-tip ${x[0]}">${x[0] === "good" ? icon("check") : icon("bulb")} ${esc(x[1])}</div>`).join("")}</div>`)
          .join("")}</div>
          ${AI.enabled() ? `<button class="btn small" data-deep="${idx}">${icon("sparkles")} Deeper coaching from Claude</button><div class="small" id="deep-${idx}"></div>` : ""}</details></section>`;
    })
    .join("");
  el.querySelectorAll("[data-deep]").forEach((btn) =>
    btn.addEventListener("click", (e) =>
      busy(e.currentTarget, async () => {
        const m = c.meetings[+btn.dataset.deep];
        const out = await AI.ask(
          `You're a senior financial planner coaching Mason (15, learning). Here's his practice ${m.type} meeting with ${c.first}. Pick the 3 moments that mattered most. For each, quote his line, say what it did to the client, and give a better line he could have used. Plain text, under 220 words.\n\n${m.thread.map((t) => `${t.from === "me" ? "Mason" : c.first}: ${t.text}`).join("\n")}`,
          { maxTokens: 900 }
        );
        document.getElementById("deep-" + btn.dataset.deep).innerHTML = `<div class="callout"><p class="pre">${esc(out)}</p></div>`;
      })
    )
  );
}

// ---------- estate basics ----------
function clEstate(c, el) {
  const ep = c.estatePlan || {};
  const minors = c.kids.some((k) => k.age < 18);
  const items = [
    { key: "will", fact: "estate-will", title: "Will", why: "Says who gets what, and (with kids) who raises them. Without one, state law decides.", rec: "Draft a will" },
    { key: "benef", fact: "estate-benef", title: "Beneficiaries", why: "Retirement accounts and life insurance go to whoever is on the beneficiary form — even if the will says otherwise. Check them after any marriage, divorce or new baby.", rec: "Review beneficiaries on every account" },
    ...(minors ? [{ key: "guardian", fact: "estate-guardian", title: "Guardian for the kids", why: `If something happened to ${c.married || c.partner ? "both parents" : esc(c.first)}, who raises ${c.kids.filter((k) => k.age < 18).map((k) => esc(k.name)).join(" and ")}? It's named in the will.`, rec: "Name a guardian in the will" }] : []),
    { key: "poa", fact: null, title: "Powers of attorney & health directive", why: "Lets someone they trust handle money and medical decisions if they can't. Often overlooked by younger clients.", rec: "Set up financial and healthcare powers of attorney" },
  ];
  el.innerHTML = `<section class="card"><h2>Estate basics</h2><p class="small muted">Not legal advice — planners spot the gaps and refer to an estate attorney. Ask about these in a meeting (try “Do you have a will?” or “Who's listed as your beneficiary?”), then check what you'd recommend.</p>
    ${items
      .map((it) => {
        const v = it.fact ? Clients.val(c, it.fact) : null;
        return `<div class="estate-row"><div class="grow"><div class="row-title">${it.title} ${it.fact ? (v == null ? `<span class="pill">Ask them</span>` : v === "yes" ? `<span class="pill good">In place</span>` : `<span class="pill pill-urgent">Missing</span>`) : `<span class="pill">Ask them</span>`}</div><p class="small muted">${it.why}</p></div>
          <label class="check"><input type="checkbox" data-est="${it.key}" ${ep[it.key] ? "checked" : ""}> ${esc(it.rec)}</label></div>`;
      })
      .join("")}
    <p class="small muted">Your recommendations appear in the compliance check and the plan document.</p></section>`;
  el.querySelectorAll("[data-est]").forEach((cb) =>
    cb.addEventListener("change", () => {
      Clients.update(c.id, (x) => {
        x.estatePlan ||= {};
        x.estatePlan[cb.dataset.est] = cb.checked;
      });
      toast(cb.checked ? "Added to your recommendations." : "Removed.");
    })
  );
}

// ---------- big decisions: run the numbers with them ----------
const DECISION_UI = {
  buyrent: { title: "Buy or keep renting?", inputs: [["price", "Home price", (c, e) => e.n * 1000], ["rate", "Mortgage rate %", () => 6.5], ["down", "Down payment %", () => 10], ["rent", "Their rent now /mo", (c) => Clients.val(c, "housing") ?? c.truth.housing]], calc: (v, c) => { const loan = v.price * (1 - v.down / 100); const i = v.rate / 1200; const pi = (loan * i) / (1 - Math.pow(1 + i, -360)); const own = pi + (v.price * 0.012) / 12 + (v.price * 0.01) / 12 + (v.down < 20 ? (loan * 0.007) / 12 : 0); const cash = v.price * (v.down / 100 + 0.03); const k = Clients.known(c); return [`Owning: about ${Clients.usd(own)}/mo (mortgage ${Clients.usd(pi)} + taxes, insurance, upkeep${v.down < 20 ? " + PMI" : ""}) vs. rent ${Clients.usd(v.rent)}/mo.`, `Cash needed up front: about ${Clients.usd(cash)} (down payment + ~3% closing).${k.cash != null ? ` They have ${Clients.usd(k.cash)} saved.` : ""}`, own > k.takeHome * 0.33 ? `⚠ That's ${Math.round((own / k.takeHome) * 100)}% of take-home pay — above the ~30% comfort zone.` : `Housing would be ${Math.round((own / k.takeHome) * 100)}% of take-home pay.`]; } },
  job: { title: "Take the job offer?", inputs: [["newPay", "New salary", (c, e) => e.n * 1000], ["oldPay", "Current salary", (c) => c.income], ["oldMatch", "Current match %", (c) => Clients.val(c, "match") ?? c.truth.match], ["newMatch", "New match %", () => 0], ["health", "Extra health cost /yr", () => 2400]], calc: (v) => { const a = v.oldPay * (1 + v.oldMatch / 100); const b = v.newPay * (1 + v.newMatch / 100) - v.health; return [`Current total: ${Clients.usd(a)}/yr (salary + match).`, `New total: ${Clients.usd(b)}/yr (salary + match − extra health costs).`, b > a ? `The offer is worth about ${Clients.usd(b - a)} more a year — then weigh growth, stability and commute.` : `The offer is actually worth ${Clients.usd(a - b)} LESS a year once the match and benefits are counted.`]; } },
  lend: { title: "Lend family money?", inputs: [["amt", "Loan amount", (c, e) => e.n * 1000], ["cash", "Their savings", (c) => Clients.val(c, "cash") ?? 0], ["spend", "Monthly expenses", (c) => Clients.known(c).expenses ?? c.truth.expenses]], calc: (v) => { const before = v.cash / Math.max(1, v.spend); const after = Math.max(0, v.cash - v.amt) / Math.max(1, v.spend); return [`Emergency fund goes from ${before.toFixed(1)} to ${after.toFixed(1)} months of expenses.`, after < 3 ? "⚠ That drops below 3 months — risky if they lose income." : "They'd still have a solid cushion.", "Rule of thumb: only lend what they could afford to never get back, and put the terms in writing."]; } },
  car: { title: "Lease or buy used?", inputs: [["lease", "Lease /mo", (c, e) => e.n], ["price", "Used car price", () => 18000], ["rate", "Auto loan rate %", () => 7.5], ["years", "Years they'll keep it", () => 6]], calc: (v) => { const i = v.rate / 1200; const pay = (v.price * i) / (1 - Math.pow(1 + i, -60)); const leaseCost = v.lease * 12 * v.years + 2500 * Math.ceil(v.years / 3); const buyCost = pay * 60 + v.years * 900 - v.price * Math.max(0.15, 0.6 - v.years * 0.07); return [`Leasing for ${v.years} years: about ${Clients.usd(leaseCost)} (new lease every 3 years).`, `Buying used: loan payment ${Clients.usd(pay)}/mo for 5 years; total net cost about ${Clients.usd(buyCost)} after resale.`, leaseCost > buyCost ? `Buying saves about ${Clients.usd(leaseCost - buyCost)}.` : `Leasing is cheaper by ${Clients.usd(buyCost - leaseCost)} here.`]; } },
  school: { title: "Go back to school?", inputs: [["cost", "Program cost", () => 14000], ["raise", "Expected raise /yr", (c) => Math.round(c.income * 0.12)], ["years", "Years to recover", () => 0]], calc: (v) => { const after = v.raise * 0.72; const payback = v.cost / Math.max(1, after); return [`After taxes the raise is worth about ${Clients.usd(after)}/yr.`, `The program pays for itself in about ${payback.toFixed(1)} years.`, "Ask: is the raise realistic? Does the employer offer tuition help? Can they cash-flow it without debt?"]; } },
};
function decisionCards(c) {
  const open = (c.events || []).filter((e) => e.decision && !e.resolved && DECISION_UI[e.decision]).slice(-2);
  return open
    .map((e) => {
      const d = DECISION_UI[e.decision];
      const idx = c.events.indexOf(e);
      return `<section class="card decision" data-dec="${idx}"><div class="section-head"><h2>${icon("scan")} Decision helper: ${d.title}</h2><button class="btn small" data-resolve="${idx}">Mark discussed</button></div><p class="small muted">${esc(e.say || e.text)}</p>
        <div class="dec-inputs">${d.inputs.map(([k, l, f]) => `<label class="field"><span>${l}</span><input type="number" step="any" data-k="${k}" value="${Math.round((f(c, e) ?? 0) * 100) / 100}"></label>`).join("")}</div><ul class="dec-out small"></ul><p class="small muted">Use these numbers in your reply or your next meeting.</p></section>`;
    })
    .join("");
}
function wireDecisions(c, el) {
  el.querySelectorAll("[data-dec]").forEach((card) => {
    const e = c.events[+card.dataset.dec];
    const d = DECISION_UI[e.decision];
    const calc = () => {
      const v = Object.fromEntries([...card.querySelectorAll("[data-k]")].map((i) => [i.dataset.k, +i.value || 0]));
      card.querySelector(".dec-out").innerHTML = d.calc(v, c).map((x) => `<li>${esc(x)}</li>`).join("");
    };
    card.querySelectorAll("[data-k]").forEach((i) => i.addEventListener("input", calc));
    calc();
  });
  el.querySelectorAll("[data-resolve]").forEach((btn) =>
    btn.addEventListener("click", () => {
      Clients.update(c.id, (x) => (x.events[+btn.dataset.resolve].resolved = true));
      route.keepScroll = true;
      route();
    })
  );
}

function clDocHTML(c) {
  const plan = Object.assign(defaultPlan(c), c.plan || {});
  const k = Clients.known(c);
  const model = Clients.riskScore(plan.riskAnswers) ? Clients.MODELS[Clients.riskScore(plan.riskAnswers) - 1] : null;
  const goals = Clients.collectedGoals(c).filter((g) => g.target && g.years);
  return `<div class="plan-doc">
    <div class="pd-head"><div><div class="pd-eyebrow">Financial plan · prepared ${Clients.dateOf(c)}</div><h1>${esc(c.first)} ${esc(c.last)}</h1><div>Prepared by Mason Ngo (practice plan)</div></div></div>
    <h2>Where you are today</h2><table class="table"><tbody>${[
      ["Take-home pay", Clients.usd(k.takeHome) + "/mo"],
      ["Housing + spending", k.expenses != null ? Clients.usd(k.expenses) + "/mo" : "—"],
      ["Cash savings", k.cash != null ? Clients.usd(k.cash) : "—"],
      ["Retirement savings", k.k401 != null ? Clients.usd((k.k401 || 0) + (k.roth || 0)) : "—"],
      ["Debts", k.debts.map((d) => `${d.name} ${Clients.usd(d.balance)}${d.apr != null ? " @ " + d.apr + "%" : ""}`).join("; ") || "None reported"],
    ]
      .map(([a, b]) => `<tr><th>${a}</th><td>${esc(b)}</td></tr>`)
      .join("")}</tbody></table>
    ${Object.values(c.estatePlan || {}).some(Boolean) ? `<h2>Estate basics</h2><ul>${[["will", "Draft a will (see an estate attorney)"], ["benef", "Review the beneficiaries on every account"], ["guardian", "Name a guardian for your children"], ["poa", "Set up financial and healthcare powers of attorney"]].filter(([k2]) => c.estatePlan[k2]).map(([, t]) => `<li>${t}</li>`).join("")}</ul>` : ""}
    <h2>Your plan</h2><ol>
      <li><strong>Emergency fund:</strong> build to ${Clients.usd((k.expenses || 0) * plan.efMonths)} (${plan.efMonths} months of expenses), saving ${Clients.usd(plan.efMonthly)}/month.</li>
      ${k.debts.length ? `<li><strong>Debt:</strong> ${plan.debtStrategy === "snowball" ? "snowball (smallest balance first)" : "avalanche (highest interest first)"} with ${Clients.usd(plan.extraDebt)}/month extra.</li>` : ""}
      <li><strong>Retirement:</strong> contribute ${plan.k401Pct}% to your 401(k)${k.match ? ` (employer matches up to ${k.match}%)` : ""}.</li>
      <li><strong>Investments:</strong> ${plan.alloc.stocks}% stocks, ${plan.alloc.bonds}% bonds, ${plan.alloc.cash}% cash${model ? ` — matches your ${model.name.toLowerCase()} risk profile` : ""}.</li>
      ${goals.map((g) => `<li><strong>${esc(g.name)}:</strong> ${Clients.usd(+plan.goalSavings?.[g.id] || 0)}/month toward ${Clients.usd(g.target)} in ${g.years} years.</li>`).join("")}
    </ol>
    ${plan.notes ? `<h2>Recommendations</h2>${richText(plan.notes)}` : ""}
    <p class="pd-note">This is a practice plan created for learning. It is not investment advice.</p></div>`;
}
function clDoc(c, el) {
  el.innerHTML = `${c.plan ? "" : `<div class="notice info">Build the plan first — this document fills in from your plan builder.</div>`}<div class="row"><button class="btn primary" id="pd-print">${icon("download")} Print / save as PDF</button></div><div class="card doc-preview">${clDocHTML(c)}</div>`;
  document.getElementById("pd-print").onclick = () => {
    document.getElementById("print-root").innerHTML = clDocHTML(c);
    setTimeout(() => window.print(), 50);
  };
}

// Pre-meeting brief (shown on the practice screen when you start a client meeting).
function renderClientBrief() {
  const m = P.clientMeeting;
  const c = Clients.find(m.id);
  if (!c) {
    P.clientMeeting = null;
    return renderPracticeSetup();
  }
  const F = Clients.fields(c);
  const missing = F.filter((f) => !c.collected[f.key] && !/^when-|^min-/.test(f.key));
  app.innerHTML = `
    <a class="back" href="#client/${c.id}" id="cb-back">‹ ${esc(c.first)}'s file</a>
    <section class="ps-hero"><div class="ps-copy"><div class="eyebrow">${Clients.MEETING_NAME[m.type] || "Meeting"} · ${Clients.dateOf(c)}</div><h1>Meeting with<br><span class="accent-text">${esc(c.first)} ${esc(c.last)}</span></h1>
      <p class="muted">${esc(c.age + " · " + c.job + " · " + (c.married ? "married" : "single") + (c.kids.length ? " · " + c.kids.length + " kid(s)" : ""))}</p>${relBar(c)}</div>
      <div class="ps-stage"><div class="orb-host" id="ps-orb"></div></div></section>
    <div class="practice-setup"><section class="card"><h2>Your agenda</h2>
      ${m.reason ? `<div class="notice">${icon("message")} ${esc(c.first)} called: “${esc(m.reason)}”</div>` : ""}
      ${c.pendingEvents.length ? `<div class="notice warn">${icon("alert")} Something changed since your last meeting — let ${esc(c.first)} tell you about it.</div>` : ""}
      ${m.type === "presentation" ? `<p class="small">Present your plan (grade ${c.plan?.grade?.total ?? "—"}/100) in plain English and connect each step to their goals.</p>` : ""}
      ${c.difficulty === "tough" && m.type !== "presentation" ? `<p class="small muted">Tough client — no checklist. Cover cash flow, debts, savings, retirement, goals, risk and protection, and anything new.</p>` : `<ul class="small agenda-list">${Clients.agendaFor(c, m.type).map((a) => `<li>${esc(a.label)}</li>`).join("")}</ul>`}
      <label class="field"><span>Length</span><div class="segmented">${LENGTHS.map(([v, l]) => `<button data-min="${v}" class="${(P.opts.minutes || 8) === v ? "on" : ""}">${l}</button>`).join("")}</div></label>
      ${AI.enabled() ? "" : `<p class="small muted">No Claude key: ${esc(c.first)} is played by the built-in partner (answers from their file).</p>`}
      </section><section class="card"><details class="ps-mic"><summary>${icon("mic")} Mic & voice settings</summary>${micCheckHTML()}</details></section></div>
    <div class="start-bar"><button class="btn primary" id="pr-start">Start meeting with ${esc(c.first)} ${icon("arrow")}</button></div>`;
  Orb3D.mount(document.getElementById("ps-orb"), { colors: Clients.persona(c).colors });
  app.querySelectorAll("[data-min]").forEach((b) => b.addEventListener("click", () => ((P.opts.minutes = +b.dataset.min), app.querySelectorAll("[data-min]").forEach((x) => x.classList.toggle("on", x === b)))));
  document.getElementById("cb-back").onclick = () => (P.clientMeeting = null);
  wireMicCheck();
  document.getElementById("pr-start").onclick = (e) => startPractice(e.currentTarget, c.difficulty === "easy" ? "easy" : c.difficulty);
}

// ---------- the planner's desk: side panel during a client meeting ----------
const DESK_TABS = [
  ["file", "Client file"],
  ["agenda", "Agenda"],
  ["notes", "Notes"],
  ["plan", "Plan"],
  ["transcript", "Transcript"],
  ["log", "Details"],
];
function deskHTML() {
  const c = Clients.find(P.sc.clientId);
  if (!c) return "";
  const type = P.sc.meetingType;
  P.deskTab ||= type === "presentation" ? "plan" : type === "review" ? "agenda" : "file";
  const plan = c.plan;
  const k = Clients.known(c);
  const planHTML = plan?.submittedAt
    ? `<div class="kv"><span>Emergency fund</span><strong>${Clients.usd(plan.efTarget || 0)} (${plan.efMonths} mo) · ${Clients.usd(plan.efMonthly)}/mo</strong></div>
       ${k.debts.length ? `<div class="kv"><span>Debt</span><strong>${plan.debtStrategy} + ${Clients.usd(plan.extraDebt)}/mo</strong></div>` : ""}
       <div class="kv"><span>401(k)</span><strong>${plan.k401Pct}%${k.match ? ` (match ${k.match}%)` : ""}</strong></div>
       <div class="kv"><span>Portfolio</span><strong>${plan.alloc.stocks}/${plan.alloc.bonds}/${plan.alloc.cash}</strong></div>
       ${Clients.collectedGoals(c).map((g) => `<div class="kv"><span>${esc(g.name)}</span><strong>${Clients.usd(+plan.goalSavings?.[g.id] || 0)}/mo</strong></div>`).join("")}
       ${plan.notes ? `<div class="small pre mt-s">${esc(plan.notes)}</div>` : ""}<div class="small muted mt-s">Plan grade ${plan.grade?.total ?? "—"}/100</div>`
    : `<p class="small muted">No plan yet — this meeting is for gathering information.</p>`;
  return `<aside class="card desk">
    <div class="desk-tabs">${DESK_TABS.map(([id, l]) => `<button data-desk="${id}" class="${P.deskTab === id ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="desk-pane" data-pane="file" ${P.deskTab === "file" ? "" : "hidden"}>${intakeHTML(c, { compact: true })}<h4>Collected so far</h4><div id="desk-facts"></div></div>
    <div class="desk-pane" data-pane="agenda" ${P.deskTab === "agenda" ? "" : "hidden"}><div id="desk-agenda"></div>${c.pendingEvents?.length && type === "review" ? `<p class="small warn-text">${icon("alert")} Something changed in their life — ask about it.</p>` : ""}</div>
    <div class="desk-pane" data-pane="notes" ${P.deskTab === "notes" ? "" : "hidden"}><textarea id="desk-notes" rows="10" placeholder="Your meeting notes (saved with the meeting)">${esc(P.notes || "")}</textarea></div>
    <div class="desk-pane" data-pane="plan" ${P.deskTab === "plan" ? "" : "hidden"}>${planHTML}</div>
    <div class="desk-pane" data-pane="transcript" ${P.deskTab === "transcript" ? "" : "hidden"}><div class="transcript" id="lv-transcript"></div></div>
    <div class="desk-pane" data-pane="log" ${P.deskTab === "log" ? "" : "hidden"}><pre id="lv-log"></pre><p class="small muted">If something goes wrong, this shows exactly what happened.</p></div>
  </aside>`;
}
function wireDesk() {
  document.querySelectorAll("[data-desk]").forEach((b) =>
    b.addEventListener("click", () => {
      P.deskTab = b.dataset.desk;
      document.querySelectorAll("[data-desk]").forEach((x) => x.classList.toggle("on", x === b));
      document.querySelectorAll(".desk-pane").forEach((p) => (p.hidden = p.dataset.pane !== P.deskTab));
      const pane = document.querySelector(`.desk-pane[data-pane="${P.deskTab}"]`);
      if (window.gsap && !Motion.reduced && pane) gsap.fromTo(pane, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.25 });
    })
  );
  document.getElementById("desk-notes")?.addEventListener("input", (e) => (P.notes = e.target.value));
  deskRefresh();
}
// Live: facts appear as the client says them; agenda items check off as you cover them.
function deskRefresh() {
  const c = Clients.find(P.sc?.clientId);
  const facts = document.getElementById("desk-facts");
  if (!c || !facts) return;
  const now = Clients.extract(c, P.thread);
  const F = Clients.fields(c);
  const fmt = (f, v) => (f.pct ? v + "%" : f.years ? v + " yrs" : f.key === "risk" ? Clients.MODELS[v - 1]?.name : typeof v === "number" ? Clients.usd(v) : v);
  const got = F.filter((f) => c.collected[f.key] || now[f.key]);
  const before = new Set(deskRefresh.shown || []);
  facts.innerHTML = got.length
    ? got.map((f) => `<div class="kv fact ${now[f.key] ? "new" : ""}" data-fk="${f.key}"><span>${esc(f.label)}</span><strong>${fmt(f, (now[f.key] || c.collected[f.key]).value)}</strong></div>`).join("") + `<div class="small muted mt-s">${got.length} of ${F.length} facts known</div>`
    : `<p class="small muted">Nothing confirmed yet. Facts appear here as ${esc(c.first)} tells you.</p>`;
  const fresh = got.filter((f) => !before.has(f.key));
  deskRefresh.shown = got.map((f) => f.key);
  if (window.gsap && !Motion.reduced) fresh.forEach((f) => gsap.fromTo(facts.querySelector(`[data-fk="${f.key}"]`), { backgroundColor: "rgba(34,197,94,.25)" }, { backgroundColor: "rgba(34,197,94,0)", duration: 1.6 }));
  const ag = Clients.agendaStatus(c, P.sc.meetingType, P.thread, P.sc);
  const prev = deskRefresh.done || {};
  document.getElementById("desk-agenda").innerHTML = `<div class="agenda">${ag.map((a) => `<div class="ag-row ${a.done ? "done" : ""}" data-ag="${a.id}"><span class="ag-check">${a.done ? icon("check") : ""}</span>${esc(a.label)}${a.progress && !a.done ? ` <span class="muted">${a.progress}</span>` : ""}</div>`).join("")}</div><div class="small muted mt-s">${ag.filter((a) => a.done).length}/${ag.length} covered</div>`;
  if (window.gsap && !Motion.reduced) ag.filter((a) => a.done && !prev[a.id]).forEach((a) => gsap.fromTo(document.querySelector(`[data-ag="${a.id}"] .ag-check`), { scale: 0.3 }, { scale: 1, duration: 0.5, ease: "back.out(3)" }));
  deskRefresh.done = Object.fromEntries(ag.map((a) => [a.id, a.done]));
}
