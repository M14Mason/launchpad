// Financial planning home: "Do this now", an interactive week calendar, your team and your book —
// plus the reschedule picker, phone calls, and the dock's month calendar.

const FPCal = { off: 0, sel: null, stage: "all" };
const hrs = (n) => `${n % 1 ? n.toFixed(1) : n} hr${n === 1 ? "" : "s"}`;

function fpModal(html, onMount) {
  document.querySelector(".fp-modal")?.remove();
  const el = document.createElement("div");
  el.className = "fp-modal";
  el.innerHTML = `<div class="fp-modal-card card" role="dialog" aria-modal="true"><button class="fp-modal-x" aria-label="Close">${icon("x")}</button>${html}</div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener("click", (e) => {
    if (e.target === el) close();
  });
  el.querySelector(".fp-modal-x").onclick = close;
  onMount?.(el, close);
  return close;
}

// Pick a new day with the client: respects their schedule and how full your days are.
function pickReschedule(c, done) {
  const b = FP.bookOf(c) || FP.book(c.book || "practice");
  const type = c.next?.type || Clients.meetingType(c);
  const need = FP.loadOf(type);
  const days = [];
  for (let d = b.day; days.length < 15 && d < b.day + 45; d++) if (FP.isWeekday(b, d)) days.push(d);
  const off = FP.offDay(c);
  const cap = FP.capOf(b);
  fpModal(
    `<h2>Reschedule with ${esc(c.first)}</h2>
    <p class="small muted">${Clients.MEETING_NAME[type]} · takes about ${hrs(need)} of your ${hrs(cap)} day.${off ? ` ${esc(c.first)} can't meet on ${FP.WEEKDAY[off]}s.` : ""}${c.next && !c.next.missed && c.next.day - b.day < 2 ? " Moving it this late costs a little trust." : ""}</p>
    <div class="rs-grid">${days
      .map((d) => {
        const room = FP.roomOn(b, d, c.id);
        const free = FP.canMeet(b, c, d);
        const ok = free && room >= need;
        return `<button class="rs-day ${ok ? "" : "off"} ${c.next?.day === d && !c.next.missed ? "cur" : ""}" data-d="${d}" ${ok ? "" : "disabled"}><span class="rs-wd">${d === b.day ? "Today" : FP.fmtDate(b, d, { weekday: "short" })}</span><span class="rs-dt">${FP.fmtDate(b, d, { month: "short", day: "numeric" })}</span><span class="rs-bar"><i style="width:${Math.min(100, ((cap - room) / cap) * 100)}%"></i></span><span class="small">${!free ? "They can't" : room < need ? "You're full" : hrs(room) + " free"}</span></button>`;
      })
      .join("")}</div>`,
    (el, close) =>
      el.querySelectorAll("[data-d]").forEach(
        (btn) =>
          (btn.onclick = () => {
            const d = +btn.dataset.d;
            const r = FP.reschedule(c.id, d);
            close();
            toast(`${c.first}'s ${Clients.MEETING_NAME[type].toLowerCase()} is now ${FP.fmtDate(b, d, { weekday: "long", month: "short", day: "numeric" })}${r?.pen ? ` (relationship ${r.pen})` : ""}.`);
            if (done) done();
            else {
              route.keepScroll = true;
              route();
            }
          })
      )
  );
}

function fpStartMeeting(c, type, extra = {}) {
  P.clientMeeting = { id: c.id, type, ...extra };
  P.phase = "setup";
  P.mode = "fp";
  P.opts.fpRole = "planner";
  if (type === "call") P.opts.minutes = 5;
  go("practice/fp");
}
function fpAnswerCall(callId) {
  const b = FP.book(FP.state().mode);
  const call = (b.calls || []).find((x) => x.id === callId);
  if (!call) return;
  const c = Clients.find(call.clientId);
  if (!c) return;
  if (FP.roomOn(b, b.day) < FP.LOAD.call) return toast("Your day is full. It'll go to voicemail — call them back tomorrow.");
  call.status = call.status === "voicemail" ? "calling back" : "answered";
  FP.setBook(b);
  document.body.classList.remove("phone-open");
  fpStartMeeting(c, "call", { reason: call.reason, callId });
}
function fpBirthday(c, b, day) {
  const bd = Math.abs(FP.hashS(c.id + "bday"));
  const d = FP.dateFor(b, day);
  return d.getMonth() === bd % 12 && d.getDate() === 1 + (bd % 28);
}
const mondayOf = (b, day) => day - ((FP.dateFor(b, day).getDay() + 6) % 7);

// Everything that needs you today, each with one obvious button.
function fpTasks(b, list) {
  const tasks = [];
  const calls = b.calls || [];
  for (const x of calls.filter((x) => x.status === "ringing" && x.day === b.day)) {
    const c = list.find((y) => y.id === x.clientId);
    if (c) tasks.push({ tone: "ring", icon: "message", title: `${c.first} ${c.last} is calling`, sub: `“${x.reason}”`, actions: [{ label: "Answer", primary: true, run: () => fpAnswerCall(x.id) }, { label: "Send to voicemail", run: () => ((x.status = "voicemail"), FP.setBook(b), route()) }] });
  }
  for (const c of list.filter((c) => c.next?.missed)) tasks.push({ tone: "bad", icon: "alert", title: `Missed: ${c.first} ${c.last}`, sub: `${Clients.MEETING_NAME[c.next.type]}${c.next.why === "noplan" ? " — they expected the plan" : ""}. Find a new day with them.`, actions: [{ label: "Reschedule", primary: true, run: () => pickReschedule(c) }] });
  for (const c of list.filter((c) => c.next && !c.next.missed && c.next.day === b.day)) {
    const type = Clients.meetingType(c);
    const noPlan = c.next.type === "presentation" && !c.plan?.submittedAt;
    tasks.push({
      tone: "today",
      icon: "calendar",
      title: `Today: ${Clients.MEETING_NAME[c.next.type]} with ${c.first} ${c.last}`,
      sub: noPlan ? "The plan isn't built yet. Build it first, or move the meeting." : `${c.age} · ${c.job}${c.couple ? ` · with ${c.partner}` : ""}`,
      actions: noPlan
        ? [{ label: "Build the plan", primary: true, run: () => go(`client/${c.id}/plan`) }, { label: "Reschedule", run: () => pickReschedule(c) }, { label: "Meet anyway", run: () => confirm(`${c.first} expects to see the plan. Meeting without one costs trust. Continue as a follow-up call?`) && fpStartMeeting(c, type) }]
        : [{ label: "Start meeting", primary: true, run: () => fpStartMeeting(c, type) }, { label: "Prep: open file", run: () => go(`client/${c.id}`) }, { label: "Reschedule", run: () => pickReschedule(c) }],
    });
  }
  for (const x of calls.filter((x) => x.status === "voicemail" || x.status === "calling back")) {
    const c = list.find((y) => y.id === x.clientId);
    if (c) tasks.push({ tone: "warn", icon: "volume", title: `Voicemail from ${c.first} ${c.last}`, sub: `“${x.reason}” · ${b.day - x.day ? `${b.day - x.day} day${b.day - x.day === 1 ? "" : "s"} ago` : "today"}`, actions: [{ label: "Call back", primary: true, run: () => fpAnswerCall(x.id) }] });
  }
  for (const c of list.filter((c) => c.next && !c.next.missed && c.next.type === "presentation" && !c.plan?.submittedAt && c.next.day > b.day && c.next.day - b.day <= 7))
    tasks.push({ tone: "warn", icon: "pen", title: `Build ${c.first}'s plan`, sub: `Presentation on ${FP.fmtDate(b, c.next.day)}.`, actions: [{ label: "Build the plan", primary: true, run: () => go(`client/${c.id}/plan`) }] });
  for (const k of (b.cases || []).filter((x) => x.status === "open")) tasks.push({ tone: "bad", icon: "shield", title: k.title, sub: `Respond by ${FP.fmtDate(b, k.due)} — or it gets worse.`, actions: [{ label: "Respond", primary: true, run: () => fpCaseModal(k) }] });
  for (const m of b.inbox.filter((x) => x.kind === "poach" && !x.replied && !x.poachDone)) tasks.push({ tone: "bad", icon: "users", title: `${m.rival} is courting ${m.from}`, sub: `Reply by ${FP.fmtDate(b, m.poachDue)} or they'll leave.`, actions: [{ label: "Reply", primary: true, run: () => fpOpenPhone("mail", m.id) }] });
  for (const c of list.filter((c) => c.stage === "client" && !c.paperwork?.done)) tasks.push({ tone: "today", icon: "file", title: `Paperwork: open ${c.first}'s accounts`, sub: c.paperwork?.tries ? "It came back with errors — fix and resubmit." : "They said yes! Check the forms before submitting.", actions: [{ label: "Check forms", primary: true, run: () => fpPaperworkModal(c) }] });
  const hrAsk = b.inbox.filter((m) => m.kind === "hr" && m.needsReply && !m.replied);
  if (hrAsk.length) tasks.push({ tone: "warn", icon: "message", title: `Your ${hrAsk[0].from.toLowerCase()} needs you`, sub: hrAsk[0].body, actions: [{ label: "Reply", primary: true, run: () => fpOpenPhone("messages", hrAsk[0].id) }] });
  const mail = b.inbox.filter((m) => m.app === "mail" && m.needsReply && !m.replied && !m.waiting && !m.ignored && m.kind !== "poach");
  if (mail.length) tasks.push({ tone: "warn", icon: "mail", title: `${mail.length} client email${mail.length === 1 ? "" : "s"} waiting`, sub: mail.slice(0, 2).map((m) => `${m.from}: ${m.subject || m.body}`).join(" · "), actions: [{ label: "Open Mail", primary: true, run: () => fpOpenPhone("mail") }] });
  const leads = b.inbox.filter((m) => m.lead && !m.accepted);
  if (leads.length) tasks.push({ tone: "good", icon: "users", title: `${leads.length} new lead${leads.length === 1 ? "" : "s"}`, sub: "Someone wants to work with you.", actions: [{ label: "See leads", primary: true, run: () => fpOpenPhone(leads[0].app, leads[0].id) }] });
  return tasks;
}
function fpOpenPhone(appName, msgId = null) {
  FPDock.app = appName;
  FPDock.open = msgId;
  document.body.classList.add("phone-open");
  FPDock.render();
  document.getElementById("fp-dock")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function weekHTML(b, list) {
  const mon = mondayOf(b, b.day) + FPCal.off * 7;
  const days = [0, 1, 2, 3, 4].map((i) => mon + i);
  const cap = FP.capOf(b);
  const all = Clients.all().filter((c) => (c.book || "practice") === b.mode);
  return `<div class="wk-head"><button class="btn small" data-wk="-1" aria-label="Previous week">‹</button><strong>${FPCal.off === 0 ? "This week" : FPCal.off === 1 ? "Next week" : FPCal.off === -1 ? "Last week" : FP.fmtDate(b, mon, { month: "short", day: "numeric" }) + " week"}</strong>${FPCal.off ? `<button class="btn small" data-wk="0">Today</button>` : ""}<button class="btn small" data-wk="1" aria-label="Next week">›</button></div>
    <div class="wk">${days
      .map((d) => {
        const booked = list.filter((c) => c.next && c.next.day === d);
        const held = all.flatMap((c) => c.meetings.filter((m) => m.day === d).map((m) => ({ c, m })));
        const bdays = list.filter((c) => fpBirthday(c, b, d));
        const used = cap - FP.roomOn(b, d);
        return `<div class="wk-day ${d === b.day ? "today" : d < b.day ? "past" : ""}"><div class="wk-date"><span>${FP.fmtDate(b, d, { weekday: "short" })}</span><b>${FP.dateFor(b, d).getDate()}</b></div>
          <div class="wk-cap" title="${hrs(used)} of ${hrs(cap)} booked"><i style="width:${Math.min(100, (used / cap) * 100)}%"></i></div>
          ${held.map(({ c, m }) => `<button class="wk-chip held" data-cl="${c.id}">✓ ${esc(c.first)} · ${esc(Clients.MEETING_NAME[m.type].replace(" meeting", ""))}</button>`).join("")}
          ${booked.map((c) => `<button class="wk-chip t-${c.next.type} ${c.next.missed ? "missed" : ""} ${FPCal.sel === c.id ? "sel" : ""}" data-cl="${c.id}">${c.next.missed ? "⚠ " : ""}${esc(c.first)} · ${esc(Clients.MEETING_NAME[c.next.type].replace(" meeting", ""))}</button>`).join("")}
          ${bdays.map((c) => `<span class="wk-bday">🎂 ${esc(c.first)}</span>`).join("")}
          ${!booked.length && !held.length && d >= b.day ? `<span class="wk-free">${hrs(FP.roomOn(b, d))} free</span>` : ""}</div>`;
      })
      .join("")}</div>
    ${(() => {
      const c = FPCal.sel && list.find((x) => x.id === FPCal.sel);
      if (!c) return `<p class="small muted wk-hint">Tap a meeting to open, start or move it.</p>`;
      const today = c.next && !c.next.missed && c.next.day === b.day;
      return `<div class="wk-sel"><div class="grow"><strong>${esc(c.first)} ${esc(c.last)}</strong><div class="small muted">${c.next ? `${Clients.MEETING_NAME[c.next.type]} · ${c.next.missed ? "missed — needs a new day" : FP.fmtDate(b, c.next.day, { weekday: "long", month: "short", day: "numeric" })}` : "No meeting booked"}</div></div>
        <div class="row">${today ? `<button class="btn primary small" data-sel="start">${icon("mic")} Start</button>` : ""}<a class="btn small" href="#client/${c.id}">Open file</a>${c.next ? `<button class="btn small" data-sel="move">${icon("calendar")} Reschedule</button>` : ""}</div></div>`;
    })()}`;
}

function renderFP(arg = "") {
  const s = FP.state();
  const [sub, x] = arg.split("/");
  if (sub === "mode" || !s.mode) return renderFPMode();
  if (sub === "exam") return renderFPExam(x || "sie", s && arg.split("/")[2] === "timed");
  Clients.migrate();
  const mode = s.mode;
  const b = FP.book(mode);
  if (mode === "career" && !b.started) {
    // First day on the job: two starter clients.
    b.started = true;
    FP.setBook(b);
    const list0 = [0, 1].map((i) => Clients.generate(i ? "realistic" : "easy", Math.floor(Math.random() * 1e9), { book: "career", day: 0, wealth: 0 }));
    Clients.saveAll([...list0, ...Clients.all()]);
    list0.forEach((c, i) => Clients.update(c.id, (y) => FP.schedule(y, "discovery", b.day + 2 + i * 3)));
    const b2 = FP.book(mode);
    FP.push(b2, { app: "messages", from: FP.TEAM.manager, body: `Welcome to the firm, Mason! I've assigned you two clients to start: ${list0.map((c) => c.first + " " + c.last).join(" and ")}. Jordan booked their discovery meetings — check your calendar.`, kind: "update" });
    FP.setBook(b2);
    return renderFP(arg);
  }
  // One-time move to the new calendar: overdue meetings from older versions get rebooked, not punished.
  if (!b.cal3) {
    const moved = [];
    for (const c of FP.clientsIn(mode))
      if (c.next && !c.next.missed && c.next.day < b.day) {
        Clients.update(c.id, (x) => FP.schedule(x, x.next.type, b.day, { annual: x.next.annual }));
        moved.push(c.first);
      }
    const b3 = FP.book(mode);
    b3.cal3 = true;
    if (moved.length) FP.push(b3, { app: "messages", from: FP.TEAM.assistant, body: `I rebooked ${moved.join(", ")} on the new calendar — check "Do this now".`, kind: "reminder" });
    FP.setBook(b3);
    return renderFP(arg);
  }
  const list = FP.clientsIn(mode);
  const tasks = fpTasks(b, list);
  const role = FP.ROLES[b.role || 0];
  const next = FP.ROLES[(b.role || 0) + 1];
  const room = FP.roomOn(b, b.day);
  const cap = FP.capOf(b);
  const upcoming = list.filter((c) => c.next && !c.next.missed && c.next.day > b.day).sort((a, z) => a.next.day - z.next.day)[0];
  const stages = [["all", "All"], ...STAGES];
  const shown = list.filter((c) => FPCal.stage === "all" || c.stage === FPCal.stage);
  const hist = (s.examHistory || []).slice(-6).reverse();
  app.innerHTML = `<div class="fp-home">
    <div class="page-head"><div><div class="eyebrow">${mode === "career" ? (b.firm ? `Founder · ${esc(b.firm.name)}` : `Career mode · ${role.name}`) : "Practice mode"}</div><h1>Financial planning</h1><p class="muted">${mode === "career" ? (b.firm ? "Your own wealth management firm. Wealthy clients, staff, rent, reputation — and rivals." : "You're a planner at a firm. New clients come to you through leads, referrals and your reputation — keep them happy and get promoted.") : "Practice with as many clients as you like, on a realistic calendar."}</p></div>
      <div class="row wrap-gap"><a class="btn" href="#fp/mode">${icon("refresh")} Switch mode</a>${mode === "practice" ? `<select id="fp-diff" aria-label="Client difficulty">${Object.entries(DIFF_LABEL).map(([v, l]) => `<option value="${v}" ${v === "realistic" ? "selected" : ""}>${l} client</option>`).join("")}</select><button class="btn primary" id="fp-new">${icon("plus")} New client</button>` : ""}</div></div>

    <section class="card fp-today"><div class="section-head"><h2>Do this now</h2><span class="small muted">${FP.fmtDate(b, b.day, { weekday: "long", month: "long", day: "numeric" })}</span></div>
      <div class="day-cap"><div class="spread small"><span>Your day</span><span>${hrs(cap - room)} of ${hrs(cap)} booked${room >= 0.5 ? ` · room for ${room >= 2.5 ? "a big meeting" : room >= 1.5 ? "a follow-up" : "a quick call"}` : " · full"}</span></div><div class="bar"><i style="width:${Math.min(100, ((cap - room) / cap) * 100)}%"></i></div></div>
      ${
        tasks.length
          ? `<div class="tasks">${tasks.map((t, i) => `<div class="task tone-${t.tone}"><span class="task-ic">${icon(t.icon)}</span><div class="grow"><div class="row-title">${esc(t.title)}</div><div class="small muted">${esc(t.sub)}</div></div><div class="task-actions">${t.actions.map((a, j) => `<button class="btn ${a.primary ? "primary" : ""} small" data-task="${i}:${j}">${esc(a.label)}</button>`).join("")}</div></div>`).join("")}</div>`
          : `<div class="all-clear">${icon("check")} <div class="grow"><strong>You're all caught up.</strong><div class="small muted">${upcoming ? `Next: ${upcoming.first}'s ${Clients.MEETING_NAME[upcoming.next.type].toLowerCase()} on ${FP.fmtDate(b, upcoming.next.day)}.` : list.length ? "No meetings booked." : mode === "practice" ? "Add a client to get started." : "Watch your messages for leads."}</div></div>${upcoming ? `<button class="btn primary" id="fp-skipnext">${icon("calendar")} Skip to ${FP.fmtDate(b, upcoming.next.day, { weekday: "short" })}</button>` : mode === "practice" && !list.length ? `<button class="btn primary" id="fp-new2">${icon("plus")} New client</button>` : `<button class="btn" id="fp-skip1">Next day</button>`}</div>`
      }
    </section>

    <section class="card" id="fp-week"><div class="section-head"><h2>Calendar</h2><span class="small muted">Discovery & presentations ${hrs(FP.LOAD.discovery)} · reviews ${hrs(FP.LOAD.review)} · follow-ups ${hrs(FP.LOAD.followup)} · calls ${hrs(FP.LOAD.call)}</span></div>${weekHTML(b, list)}</section>

    ${
      mode === "career"
        ? `<div class="stats">
      <div class="card stat"><div class="k">Role</div><div class="stat-v sm">${b.firm ? "Founder" : role.name}</div>${b.firm ? `<div class="small muted">${esc(b.firm.name)}</div>` : next ? `<div class="small muted">Next: ${next.name} at ${Clients.usd(next.aum)}${next.exam ? ` + ${next.exam.toUpperCase()} exam` : ""}</div><div class="bar"><i style="width:${Math.min(100, (b.aum / next.aum) * 100)}%"></i></div>` : `<div class="small muted">Top of the firm</div>`}</div>
      <div class="card stat"><div class="k">Assets you manage</div><div class="stat-v">${Clients.usd(b.aum || 0)}</div><div class="small muted">Moves with the market</div></div>
      <div class="card stat"><div class="k">Fees earned</div><div class="stat-v">${Clients.usd(b.revenue || 0)}</div><div class="small muted">1% of assets a year${b.bonus ? ` · bonuses ${Clients.usd(b.bonus)}` : ""}</div></div>
      <div class="card stat"><div class="k">Experience</div><div class="stat-v">${b.xp || 0}<span class="muted"> XP</span></div><div class="small muted">Meetings, replies, clean audits</div></div></div>
    <div class="two-col">
      <section class="card"><div class="section-head"><h2>This quarter</h2><span class="small muted">Day ${b.day - (b.q?.start ?? b.day) + 1} of 91</span></div>${FP.qGoals(b, list).map((g) => `<div class="qg ${g.done ? "done" : ""}"><span>${g.done ? icon("check") : ""}</span><div class="grow small">${esc(g.label)}<div class="bar"><i style="width:${g.pct}%"></i></div></div></div>`).join("")}<p class="small muted">Each goal you hit pays a bonus at quarter end.</p></section>
      <section class="card"><h2>${b.firm ? "Local firms by assets" : "Team leaderboard"}</h2><div class="lb">${[...(b.peers || []).map((p, i) => (b.firm ? { name: FPBiz.RIVALS[i], aum: p.aum * 14 } : { name: p.name, aum: p.aum })), { name: b.firm ? b.firm.name + " (you)" : "You", aum: b.aum || 0, me: true }]
        .sort((x, z) => z.aum - x.aum)
        .map((p, i) => `<div class="lb-row ${p.me ? "me" : ""}"><span class="lb-rank">${i + 1}</span><span class="grow">${esc(p.name)}</span><strong>${Clients.usd(p.aum)}</strong></div>`)
        .join("")}</div></section>
    </div>
    <section class="card"><h2>Your team</h2><div class="team">${Object.entries(FP.HIRES)
      .map(([k, h]) => {
        const has = b.hires?.[k];
        const can = (b.role || 0) >= h.role;
        return `<div class="team-row"><div class="grow"><div class="row-title">${esc(h.name)}${has ? ` <span class="pill good">On your team</span>` : ""}</div><div class="small muted">${esc(h.perk)} Salary ${Clients.usd(h.salary)}/mo from your fees.</div></div>${has ? "" : can ? `<button class="btn small" data-hire="${k}">Hire</button>` : `<span class="small muted">Unlocks at ${FP.ROLES[h.role].name}</span>`}</div>`;
      })
      .join("")}</div></section>`
        : ""
    }

    ${mode === "career" || (b.cases || []).length || (b.reviews || []).length ? fpBizHTML(b, mode) : ""}

    <section class="card"><div class="section-head"><h2>Your clients</h2><div class="chips">${stages.map(([k, l]) => `<button class="chip ${FPCal.stage === k ? "on" : ""}" data-stage="${k}">${l} <span>${k === "all" ? list.length : list.filter((c) => c.stage === k).length}</span></button>`).join("")}</div></div>
      ${
        shown.length
          ? `<div class="grid cards2">${shown
              .map((c) => {
                const p = Clients.persona(c);
                const nx = c.next ? (c.next.missed ? `<span class="bad-text">Missed ${Clients.MEETING_NAME[c.next.type].toLowerCase()} — reschedule</span>` : `Next: ${Clients.MEETING_NAME[c.next.type]} · ${c.next.day === b.day ? "today" : FP.fmtDate(b, c.next.day)}`) : "No meeting booked";
                return `<a class="card client-card" href="#client/${c.id}"><div class="spread"><div class="row"><span class="ch-dot sm" style="--c1:${p.colors[0]};--c2:${p.colors[1]};--c3:${p.colors[2]}"></span><div><div class="row-title">${esc(c.first)} ${esc(c.last)}${c.couple ? ` &amp; ${esc(c.partner)}` : ""}</div><div class="small muted">${c.age} · ${esc(c.job)} · ${DIFF_LABEL[c.difficulty] || "Realistic"}</div></div></div><span class="pill stage-${c.stage}">${STAGES.find(([k]) => k === c.stage)?.[1] || c.stage}</span></div>${relBar(c)}<div class="small muted">${nx}${c.aum ? ` · AUM ${Clients.usd(c.aum)}` : ""}</div></a>`;
              })
              .join("")}</div>`
          : `<p class="small muted">${list.length ? "No clients at this stage." : mode === "practice" ? "No clients yet — tap New client." : "No clients yet. Leads arrive in Messages."}</p>`
      }</section>

    <section class="card"><div class="section-head"><h2>Licensing exams</h2></div><p class="small muted">Practice questions use your own clients. Timed mocks: 1 minute per question, like the real thing.</p>
      <div class="row wrap-gap"><a class="btn" href="#fp/exam/sie">${icon("award")} SIE practice${s.exams.sie?.passed ? " ✓" : ""}</a><a class="btn" href="#fp/exam/cfp">${icon("award")} CFP-style practice${s.exams.cfp?.passed ? " ✓" : ""}</a><a class="btn" href="#fp/exam/sie/timed">${icon("gauge")} Timed SIE mock</a><a class="btn" href="#fp/exam/cfp/timed">${icon("gauge")} Timed CFP mock</a></div>
      ${hist.length ? `<div class="exam-hist">${hist.map((h) => `<div class="small"><span class="pill ${h.pct >= 70 ? "good" : "pill-urgent"}">${h.pct}%</span> ${h.kind.toUpperCase()}${h.timed ? " timed" : ""} · ${Math.round(h.secs / 60)} min · ${new Date(h.at).toLocaleDateString()}</div>`).join("")}</div>` : ""}</section>
  </div>`;
  const newClient = () => {
    const c = Clients.generate(document.getElementById("fp-diff")?.value || "realistic", Math.floor(Math.random() * 1e9), { book: "practice", day: b.day });
    Clients.saveAll([c, ...Clients.all()]);
    Clients.update(c.id, (y) => FP.schedule(y, "discovery", b.day));
    const n = Clients.find(c.id).next;
    toast(`New client: ${c.first} ${c.last}${c.couple ? " & " + c.partner : ""} — discovery ${n.day === b.day ? "today" : "on " + FP.fmtDate(b, n.day)}.`);
    go("client/" + c.id);
  };
  document.getElementById("fp-new")?.addEventListener("click", newClient);
  document.getElementById("fp-new2")?.addEventListener("click", newClient);
  document.getElementById("fp-skipnext")?.addEventListener("click", () => fpSkip(upcoming.next.day - b.day));
  document.getElementById("fp-skip1")?.addEventListener("click", () => fpSkip(1));
  app.querySelectorAll("[data-task]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [i, j] = btn.dataset.task.split(":").map(Number);
      tasks[i].actions[j].run();
    })
  );
  app.querySelectorAll("[data-wk]").forEach((btn) => btn.addEventListener("click", () => ((FPCal.off = btn.dataset.wk === "0" ? 0 : FPCal.off + +btn.dataset.wk), (route.keepScroll = true), route())));
  app.querySelectorAll("[data-cl]").forEach((btn) => btn.addEventListener("click", () => ((FPCal.sel = FPCal.sel === btn.dataset.cl ? null : btn.dataset.cl), (route.keepScroll = true), route())));
  app.querySelector('[data-sel="start"]')?.addEventListener("click", () => {
    const c = Clients.find(FPCal.sel);
    if (c.next?.type === "presentation" && !c.plan?.submittedAt && !confirm(`${c.first} expects to see the plan, and it isn't built. Meet anyway as a follow-up call (costs trust)?`)) return;
    fpStartMeeting(c, Clients.meetingType(c));
  });
  app.querySelector('[data-sel="move"]')?.addEventListener("click", () => pickReschedule(Clients.find(FPCal.sel)));
  app.querySelectorAll("[data-stage]").forEach((btn) => btn.addEventListener("click", () => ((FPCal.stage = btn.dataset.stage), (route.keepScroll = true), route())));
  app.querySelectorAll("[data-case]").forEach((btn) => btn.addEventListener("click", () => fpCaseModal((b.cases || []).find((k) => k.id === btn.dataset.case))));
  app.querySelectorAll("[data-office]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const o = FPBiz.OFFICES[+btn.dataset.office];
      if (!confirm(`Move into a ${o.name.toLowerCase()} for ${Clients.usd(o.cost)}?`)) return;
      FPBiz.buyOffice(+btn.dataset.office);
      route.keepScroll = true;
      route();
    })
  );
  document.getElementById("fp-firm")?.addEventListener("click", () => {
    const name = prompt("Name your firm:", "Ngo Wealth Management");
    if (!name) return;
    FPBiz.openFirm(name.trim().slice(0, 40));
    toast(`${name} is open for business!`);
    route.keepScroll = true;
    route();
  });
  app.querySelectorAll("[data-hire]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const h = FP.HIRES[btn.dataset.hire];
      if (!confirm(`Hire a ${h.name.toLowerCase()} for ${Clients.usd(h.salary)}/month?`)) return;
      FP.hire(btn.dataset.hire);
      toast(`${h.name} hired.`);
      route.keepScroll = true;
      route();
    })
  );
  FPDock.attach();
}

// Moving time forward stops on days with meetings or calls, so you don't miss them by accident.
function fpSkip(n) {
  const s = FP.state();
  const b = FP.book(s.mode);
  const left = FP.meetingsToday(b);
  const ringing = (b.calls || []).filter((x) => x.status === "ringing" && x.day === b.day);
  if ((left.length || ringing.length) && !confirm(`${left.length ? `You still have ${left.length} meeting${left.length === 1 ? "" : "s"} today (${left.map((c) => c.first).join(", ")}). Skipping marks ${left.length === 1 ? "it" : "them"} missed — clients hate that.` : ""}${ringing.length ? ` ${ringing.length} call${ringing.length === 1 ? "" : "s"} will go to voicemail.` : ""} Skip anyway?`)) return;
  const res = FP.tick(n, s.mode, { stop: true });
  const nb = FP.book(s.mode);
  toast(res.stopped ? `Stopped on ${FP.fmtDate(nb, nb.day, { weekday: "long" })} — ${[res.stopped.meetings ? `${res.stopped.meetings} meeting${res.stopped.meetings === 1 ? "" : "s"}` : "", res.stopped.calls ? "your phone is ringing" : ""].filter(Boolean).join(", ")}.` : `${n === 1 ? "Next day" : `${n} days later`} — ${res.unread ? res.unread + " new message" + (res.unread === 1 ? "" : "s") : "quiet"}.`);
  FPCal.off = 0;
  route.keepScroll = true;
  route();
  if (window.gsap && !Motion.reduced) gsap.fromTo(".cal-date, .cal-badge", { y: -8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" });
}

// ---------- the dock: date, skip buttons, month calendar, phone ----------
FPDock.render = function () {
  const s = FP.state();
  const b = FP.book(s.mode);
  const dock = document.getElementById("fp-dock");
  if (!dock) return;
  const calls = b.calls || [];
  const ringing = calls.filter((x) => x.status === "ringing" && x.day === b.day);
  const unread = (a) => (a === "phone" ? ringing.length + calls.filter((x) => x.status === "voicemail").length : b.inbox.filter((m) => m.app === a && !m.read).length);
  const d = FP.dateFor(b);
  const list = FP.clientsIn(s.mode);
  // Month grid: dots on days with meetings.
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const dayNum = (dt) => Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 9).getTime() - b.start) / 86400000);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(`<span></span>`);
  for (let n = 1; n <= dim; n++) {
    const dd = dayNum(new Date(d.getFullYear(), d.getMonth(), n));
    const has = list.filter((c) => c.next && c.next.day === dd);
    const cls = [dd === b.day ? "today" : "", dd < b.day ? "past" : "", has.some((c) => c.next.missed) ? "missed" : has.length ? "has" : ""].join(" ");
    cells.push(`<button class="mc-d ${cls}" data-mday="${dd}" title="${has.map((c) => c.first + " · " + Clients.MEETING_NAME[c.next.type]).join(", ")}">${n}</button>`);
  }
  const upcoming = list.filter((c) => c.next && c.next.day >= b.day && !c.next.missed).sort((a, z) => a.next.day - z.next.day).slice(0, 4);
  dock.innerHTML = `
    <div class="cal card">
      <div class="cal-top"><div><div class="cal-wd">${d.toLocaleDateString(undefined, { weekday: "long" })}</div><div class="cal-date">${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</div><div class="small muted">${d.getFullYear()} · day ${b.day + 1}</div></div><div class="cal-badge">${d.getDate()}</div></div>
      <div class="cal-skip"><button data-skip="1">+1 day</button><button data-skip="7">+1 week</button><button data-skip="30">+1 month</button></div>
      <div class="mini-cal"><div class="mc-wd">${["S", "M", "T", "W", "T", "F", "S"].map((x) => `<span>${x}</span>`).join("")}</div><div class="mc-grid">${cells.join("")}</div></div>
      ${upcoming.length ? `<div class="cal-agenda">${upcoming.map((c) => `<a href="#client/${c.id}"><span>${c.next.day === b.day ? "Today" : FP.fmtDate(b, c.next.day, { month: "short", day: "numeric" })}</span>${esc(c.first)} · ${Clients.MEETING_NAME[c.next.type].replace(" meeting", "")}</a>`).join("")}</div>` : ""}
    </div>
    ${ringing.length ? `<button class="ring-banner" data-ans="${ringing[0].id}">${icon("message")} ${esc(Clients.find(ringing[0].clientId)?.first || "A client")} is calling — answer</button>` : ""}
    <div class="phone"><div class="ph-notch"></div>
      <div class="ph-status"><span>${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span><span>${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
      <div class="ph-screen" id="ph-screen"></div>
      <div class="ph-dock">${[
        ["phone", "volume", "Phone"],
        ["messages", "message", "Messages"],
        ["mail", "mail", "Mail"],
        ["markets", "trend", "Markets"],
      ]
        .map(([a, ic, l]) => `<button data-app="${a}" class="${this.app === a ? "on" : ""}"><span class="ph-ic ${a === "phone" ? "calls" : a}">${icon(ic)}${a !== "markets" && unread(a) ? `<b>${unread(a)}</b>` : ""}</span><span>${l}</span></button>`)
        .join("")}</div></div>`;
  const fab = document.getElementById("fp-fab");
  const total = unread("mail") + unread("messages") + unread("phone");
  if (fab) {
    fab.innerHTML = document.body.classList.contains("phone-open") ? icon("x") : `${icon("message")}${total ? `<b>${total}</b>` : ""}`;
    fab.classList.toggle("ringing", !!ringing.length && !document.body.classList.contains("phone-open"));
  }
  dock.querySelectorAll("[data-skip]").forEach((btn) => btn.addEventListener("click", () => fpSkip(+btn.dataset.skip)));
  dock.querySelectorAll("[data-mday]").forEach((btn) =>
    btn.addEventListener("click", () => {
      FPCal.off = Math.round((mondayOf(b, +btn.dataset.mday) - mondayOf(b, b.day)) / 7);
      document.body.classList.remove("phone-open");
      if (location.hash.startsWith("#fp")) {
        route.keepScroll = true;
        route();
      } else go("fp");
      setTimeout(() => document.getElementById("fp-week")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    })
  );
  dock.querySelector("[data-ans]")?.addEventListener("click", (e) => fpAnswerCall(e.currentTarget.dataset.ans));
  dock.querySelectorAll("[data-app]").forEach((btn) => btn.addEventListener("click", () => ((this.app = btn.dataset.app), (this.open = null), this.render())));
  this.screen(b);
};
const _fpScreen = FPDock.screen;
FPDock.screen = function (b) {
  const el = document.getElementById("ph-screen");
  if (el && this.app === "phone") return this.phone(b, el);
  return _fpScreen.call(this, b);
};
FPDock.phone = function (b, el) {
  const calls = b.calls || [];
  const who = (x) => Clients.find(x.clientId);
  const ringing = calls.filter((x) => x.status === "ringing" && x.day === b.day && who(x));
  const vms = calls.filter((x) => (x.status === "voicemail" || x.status === "calling back") && who(x));
  const logs = calls.filter((x) => ["done", "ignored"].includes(x.status) && who(x)).slice(0, 8);
  el.innerHTML = `${ringing
    .map((x) => {
      const c = who(x);
      return `<div class="ph-call"><div class="ph-call-av">${esc(c.first[0])}</div><div class="ph-call-name">${esc(c.first)} ${esc(c.last)}</div><div class="small muted">is calling…</div><div class="ph-call-btns"><button class="ph-decline" data-vm="${x.id}" aria-label="Send to voicemail">${icon("x")}</button><button class="ph-accept" data-call="${x.id}" aria-label="Answer">${icon("mic")}</button></div><div class="small muted">Answering uses ${hrs(FP.LOAD.call)} of your day · ${hrs(Math.max(0, FP.roomOn(b, b.day)))} left</div></div>`;
    })
    .join("")}
    ${vms.length ? `<div class="ph-sec">Voicemail</div>${vms.map((x) => { const c = who(x); return `<div class="ph-vm"><div class="spread"><strong>${esc(c.first)} ${esc(c.last)}</strong><span class="small muted">${FP.fmtDate(b, x.day, { month: "short", day: "numeric" })}</span></div><p class="small">“${esc(x.reason)}”</p><button class="btn small primary block" data-call="${x.id}">Call back</button></div>`; }).join("")}` : ""}
    ${logs.length ? `<div class="ph-sec">Recent</div>${logs.map((x) => `<div class="ph-log small"><span>${esc(who(x).first)} ${esc(who(x).last)}</span><span class="${x.status === "done" ? "muted" : "bad-text"}">${x.status === "done" ? "Talked" : "Never called back"} · ${FP.fmtDate(b, x.day, { month: "short", day: "numeric" })}</span></div>`).join("")}` : ""}
    ${!ringing.length && !vms.length && !logs.length ? `<p class="small muted ph-empty">No calls yet. Clients call when something's on their mind — answer the same day if you have room.</p>` : ""}`;
  el.querySelectorAll("[data-call]").forEach((btn) => btn.addEventListener("click", () => fpAnswerCall(btn.dataset.call)));
  el.querySelectorAll("[data-vm]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const x = calls.find((y) => y.id === btn.dataset.vm);
      x.status = "voicemail";
      FP.setBook(b);
      this.render();
      if (location.hash.startsWith("#fp")) (route.keepScroll = true), route();
    })
  );
};
