// The business side of being a planner: complaints & lawsuits, reputation & online reviews, your office,
// rival firms, your employees' morale, account paperwork, difficult conversations, and your own firm.

const FPBiz = (() => {
  const RIVALS = ["Summit Wealth Partners", "BrightPath Advisors", "Harborline Financial", "Crestview Private Wealth", "NorthStar Robo-Advisor"];
  const OFFICES = [
    { name: "Shared desk", cost: 0, rep: 0, perk: "Where everyone starts." },
    { name: "Private office", cost: 15000, rep: 5, perk: "Clients take you more seriously: +5 reputation." },
    { name: "Corner office", cost: 40000, rep: 10, role: 3, perk: "Impresses wealthier clients: +10 reputation, bigger leads." },
    { name: "Your own suite", cost: 120000, rep: 15, firm: true, perk: "A real wealth-management office: +15 reputation." },
  ];
  const HR_ASKS = [
    { ask: "Hey — can I take Friday off? My kid has a recital.", kind: "timeoff" },
    { ask: "I've been here a while now. Could we talk about a raise?", kind: "raise" },
    { ask: "A client yelled at me on the phone today. Honestly it shook me up.", kind: "support" },
    { ask: "The workload has been a lot lately. I stayed until 8 three nights this week.", kind: "overtime" },
    { ask: "Could I get some training on the new CRM? I keep making mistakes in it.", kind: "training" },
  ];
  const REVIEWS = {
    5: ["Mason actually listens. For the first time I feel in control of my money.", "Clear, patient, never pushy. Highly recommend.", "He remembered my daughter's name and my goals. Felt like a real partner."],
    4: ["Very helpful and knowledgeable. Sometimes slow to email back.", "Good advice and a solid plan. Would recommend.", "Made a scary topic feel manageable."],
    3: ["Fine, but I expected more follow-up.", "Okay experience. Some jargon went over my head.", "Decent plan, communication could be better."],
    2: ["Missed a meeting and didn't apologize much.", "I felt rushed and not really heard.", "Hard to reach when markets dropped."],
    1: ["Never returned my calls. Moving on.", "Unprofessional. Missed meetings, vague answers.", "Would not recommend."],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const officeOf = (b) => OFFICES[b.office || 0];

  // ---------- reputation ----------
  function repOf(b) {
    const rv = (b.reviews || []).slice(0, 12);
    const stars = rv.length ? rv.reduce((n, x) => n + x.stars, 0) / rv.length : 3.5;
    const open = (b.cases || []).filter((x) => x.status === "open").length;
    const lost = (b.cases || []).filter((x) => x.outcome === "lost").length;
    return Math.max(0, Math.min(100, Math.round(stars * 18 + officeOf(b).rep + (b.firm ? 5 : 0) - open * 6 - lost * 4)));
  }

  // ---------- the daily business ----------
  function day(b, r, clients, today, open) {
    const push = (m) => FP.push(b, m);
    b.cases ||= [];
    b.reviews ||= [];
    // Online reviews (monthly).
    if (b.day % 30 === 10)
      for (const c of clients)
        if (c.meetings.length && r() < 0.3) {
          const rel = c.relationship;
          const stars = rel >= 80 ? 5 : rel >= 65 ? 4 : rel >= 45 ? 3 : rel >= 30 ? 2 : 1;
          b.reviews.unshift({ day: b.day, name: `${c.first} ${c.last[0]}.`, clientId: c.id, stars, text: pick(REVIEWS[stars]) });
          b.reviews = b.reviews.slice(0, 30);
          if (stars <= 2) push({ app: "messages", from: FP.TEAM.assistant, clientId: c.id, body: `Heads up: ${c.first} left a ${stars}-star review online. It'll hurt new leads — maybe reach out?`, kind: "reminder" });
        }
    // Complaints: unhappy clients after something went wrong.
    for (const c of clients) {
      const recentBad = (c.relHistory || []).slice(-4).some((h) => /Missed|Never returned|scam|Didn't answer|without a plan/i.test(h.reason));
      if (c.relationship < 24 && recentBad && !c.complained && r() < 0.03) {
        Clients.update(c.id, (x) => (x.complained = b.day));
        const why = (c.relHistory || []).slice(-4).find((h) => /Missed|Never returned|scam|Didn't answer|without a plan/i.test(h.reason))?.reason || "poor service";
        b.cases.unshift({ id: "case" + b.day + c.id.slice(-4), kind: "complaint", clientId: c.id, day: b.day, due: b.day + 10, status: "open", title: `Complaint from ${c.first} ${c.last}`, text: `${c.first} filed a written complaint with the firm: “${why}. I don't feel my planner takes me seriously.” Compliance needs your written response within 10 days.` });
        push({ app: "messages", from: FP.TEAM.compliance, clientId: c.id, body: `${c.first} ${c.last} filed a complaint. Respond in your Cases (Financial planning home) within 10 days.`, kind: "audit" });
      }
      // Lost money after your reply to a scam → they may sue.
      const hit = (c.events || []).find((e) => e.id === "scamhit" && !e.sued);
      if (hit && r() < 0.1) {
        Clients.update(c.id, (x) => (x.events.find((e) => e.id === "scamhit" && !e.sued).sued = true));
        b.cases.unshift({ id: "suit" + b.day + c.id.slice(-4), kind: "lawsuit", clientId: c.id, day: b.day, due: b.day + 14, status: "open", title: `Arbitration claim: ${c.first} ${c.last}`, text: `${c.first} filed a FINRA arbitration claim saying your advice led them to lose about $4,000 to a scam. Submit your statement and documentation within 14 days.` });
        push({ app: "messages", from: FP.TEAM.compliance, clientId: c.id, body: `Serious: ${c.first} ${c.last} filed an arbitration claim against you. Respond in Cases within 14 days.`, kind: "audit" });
      }
    }
    // Unanswered cases escalate.
    for (const k of b.cases)
      if (k.status === "open" && b.day > k.due) {
        if (k.kind === "complaint") {
          k.status = "closed";
          k.outcome = "escalated";
          b.cases.unshift({ id: k.id + "x", kind: "lawsuit", clientId: k.clientId, day: b.day, due: b.day + 14, status: "open", title: k.title.replace("Complaint", "Arbitration claim"), text: `You never answered the complaint, so it escalated: the client filed an arbitration claim. Submit your statement and documentation within 14 days.` });
        } else settle(b, k, { score: 0, notes: ["✗ You never responded — default judgment"] });
      }
    // Rival firms try to poach clients who aren't thrilled.
    if (b.day % 30 === 20)
      for (const c of clients)
        if (c.stage === "client" && c.relationship < 62 && r() < 0.25) {
          const rival = pick(RIVALS);
          push({ app: "mail", from: `${c.first} ${c.last}`, clientId: c.id, subject: "Honest question", body: `${rival} reached out to me. They say they'd charge ${rival.includes("Robo") ? "0.25%" : "less"} and do everything you do. Why should I stay?`, kind: "poach", needsReply: true, rival, poachDue: b.day + 10 });
        }
    for (const m of b.inbox)
      if (m.kind === "poach" && !m.poachDone && b.day > m.poachDue) {
        m.poachDone = true;
        const keep = m.reply && m.reply.score >= 3;
        if (!keep)
          Clients.update(m.clientId, (x) => {
            x.stage = "lost";
            x.aum = 0;
            x.next = null;
          });
        if (!keep) push({ app: "mail", from: m.from, clientId: m.clientId, subject: "Decision", body: `I've decided to move to ${m.rival}. Thanks for everything.`, kind: "lost" });
      }
    // Your employees: requests, morale, quitting, HR claims.
    for (const [k, h] of Object.entries(b.hires || {})) {
      h.morale ??= 70;
      if (open && r() < 0.05) {
        const a = pick(HR_ASKS);
        push({ app: "messages", from: `${FP.HIRES[k]?.name || "Your employee"}`, body: a.ask, kind: "hr", hr: k, hrKind: a.kind, needsReply: true });
      }
    }
    for (const m of b.inbox)
      if (m.kind === "hr" && m.needsReply && !m.replied && !m.hrIgnored && b.day - m.day >= 3) {
        m.hrIgnored = true;
        const h = b.hires?.[m.hr];
        if (h) h.morale = Math.max(0, h.morale - 12);
      }
    for (const [k, h] of Object.entries(b.hires || {})) {
      if (h.morale < 15 && b.inbox.some((m) => m.hr === k && m.hrIgnored && /raise|overtime/.test(m.hrKind)) && !b.cases.some((x) => x.hr === k)) {
        b.cases.unshift({ id: "hr" + b.day + k, kind: "hr", hr: k, day: b.day, due: b.day + 14, status: "open", title: `Employment claim: your ${FP.HIRES[k].name.toLowerCase()}`, text: `Your ${FP.HIRES[k].name.toLowerCase()} filed a wage-and-hour claim saying they worked unpaid overtime and were ignored when they raised it. HR needs your response within 14 days.` });
      }
      if (h.morale < 25 && !b.cases.some((x) => x.hr === k && x.status === "open")) {
        delete b.hires[k];
        push({ app: "messages", from: FP.TEAM.manager, body: `Your ${FP.HIRES[k].name.toLowerCase()} resigned — they said they felt unappreciated. You lose the extra capacity.`, kind: "update" });
      }
    }
    // Your own firm: rent and staff each month.
    if (b.firm && b.day % 30 === 0) {
      const rent = 6000 + (b.office || 0) * 2500;
      b.revenue = (b.revenue || 0) - rent;
      b.firm.expenses = (b.firm.expenses || 0) + rent;
    }
    b.rep = repOf(b);
  }

  // ---------- replies that matter to the business ----------
  function score(msg, t) {
    if (msg.kind === "poach") {
      const value = /\b(plan|goals?|we've|together|helped|progress|on track|service|relationship|personal|tax|behavior|kept you|coaching)\b/.test(t);
      const fees = /\b(fee|cost|charge|worth|value|transparent)\b/.test(t);
      const respect = /\b(understand|fair|totally|appreciate|good question|makes sense)\b/.test(t);
      const desperate = /\b(please don't|begging|desperate|i'll lower)\b/.test(t);
      const sc = (value ? 2 : 0) + (fees ? 1 : 0) + (respect ? 1 : 0) - (desperate ? 2 : 0);
      return { score: sc, delta: sc >= 3 ? 3 : -2, notes: [value ? "✓ Showed your value (their plan, progress, personal service)" : "✗ Remind them what you've done together and where their plan stands", fees ? "✓ Addressed fees openly" : "✗ Talk about fees and what they get for them", respect ? "✓ Respected their question" : "✗ Don't get defensive — it's a fair question", ...(desperate ? ["✗ Sounding desperate lowers trust"] : []), sc >= 3 ? "→ They'll probably stay" : "→ They might leave"] };
    }
    if (msg.kind === "hr") {
      const care = /\b(thank|appreciate|sorry|of course|absolutely|yes|let's (talk|sit down|find)|i hear you|that's (not okay|rough|hard)|support|happy to)\b/.test(t);
      const dismiss = /\b(no\.?$|not now|busy|deal with it|figure it out|suck it up)\b/.test(t);
      const sc = (care ? 3 : 0) - (dismiss ? 3 : 0);
      return { score: sc, delta: 0, notes: [care ? "✓ Your employee felt heard" : "✗ Acknowledge them and offer something concrete", ...(dismiss ? ["✗ Dismissive — morale drops"] : [])] };
    }
    return null;
  }
  function onReply(b, m, res) {
    if (m.kind === "hr" && b.hires?.[m.hr]) {
      const h = b.hires[m.hr];
      h.morale = Math.max(0, Math.min(100, (h.morale ?? 70) + (res.score > 0 ? 10 : -10)));
    }
  }

  // ---------- complaints & lawsuits ----------
  // Your outcome depends on what you wrote AND what's documented in the file.
  function evidence(b, k) {
    const c = k.clientId ? Clients.find(k.clientId) : null;
    if (!c) return { pts: 1, items: ["Employee records on file"] };
    const items = [];
    let pts = 0;
    if (c.plan?.submittedAt) (pts++, items.push("✓ A written plan is on file"));
    else items.push("✗ No written plan");
    const flags = c.plan?.submittedAt ? Clients.compliance(c, c.plan).filter((f) => f.sev === "high").length : 0;
    if (c.plan?.submittedAt && !flags) (pts++, items.push("✓ No unresolved suitability flags"));
    else if (flags) items.push(`✗ ${flags} unresolved compliance flag${flags === 1 ? "" : "s"}`);
    if (c.meetings.some((m) => m.notes)) (pts++, items.push("✓ Meeting notes are documented"));
    else items.push("✗ No meeting notes — write notes during meetings");
    if (c.collected.risk || c.collected.riskq) (pts++, items.push("✓ Risk tolerance documented"));
    else items.push("✗ Risk tolerance never documented");
    return { pts, items };
  }
  function respond(caseId, text) {
    const s = FP.state();
    const b = s.books[s.mode];
    const k = b.cases.find((x) => x.id === caseId);
    if (!k || k.status !== "open") return null;
    const t = text.toLowerCase();
    const notes = [];
    let sc = 0;
    if (k.kind === "complaint") {
      if (/\b(sorry|apologi[sz]e|i understand|you're right|fell short)\b/.test(t)) (sc++, notes.push("✓ Acknowledged their experience"));
      else notes.push("✗ Acknowledge what went wrong first");
      if (/\b(on \w+day|meeting on|i missed|the facts|timeline|what happened)\b/.test(t)) (sc++, notes.push("✓ Laid out the facts"));
      else notes.push("✗ Lay out what happened, factually");
      if (/\b(going forward|will|from now on|changed|fix|make it right|schedule|call)\b/.test(t)) (sc++, notes.push("✓ Concrete fix going forward"));
      else notes.push("✗ Say exactly what you'll do differently");
      if (/\b(their fault|they should have|not my|blame)\b/.test(t)) (sc -= 2, notes.push("✗ Blaming the client makes it worse"));
    } else {
      if (/\b(document|notes|records|file|written|plan|questionnaire|suitab|disclos)\b/.test(t)) (sc++, notes.push("✓ Pointed to your documentation"));
      else notes.push("✗ Cite your documentation (notes, plan, risk questionnaire)");
      if (/\b(fact|timeline|on \w+day|dated|email)\b/.test(t)) (sc++, notes.push("✓ Gave a factual timeline"));
      else notes.push("✗ Give a dated, factual timeline");
      if (/\b(guarantee|promise|it was their fault|i admit|my fault)\b/.test(t)) (sc -= 2, notes.push("✗ Don't admit fault or make promises in a legal statement — stick to facts"));
      if (k.kind === "hr" && /\b(pay|overtime|back pay|policy|hours|fix)\b/.test(t)) (sc++, notes.push("✓ Addressed the pay issue directly"));
    }
    return settle(b, k, { score: sc, notes, text }, s);
  }
  function settle(b, k, res, s = null) {
    const ev = evidence(b, k);
    const total = res.score + ev.pts;
    k.status = "closed";
    k.response = res.text || "";
    k.notes = [...res.notes, ...ev.items];
    const c = k.clientId ? Clients.find(k.clientId) : null;
    if (k.kind === "complaint") {
      k.outcome = total >= 4 ? "resolved" : total >= 2 ? "warning" : "lost";
      const rel = k.outcome === "resolved" ? 10 : k.outcome === "warning" ? 2 : -5;
      if (c) Clients.update(c.id, (x) => ((x.relationship = Math.max(0, Math.min(100, x.relationship + rel))), x.relHistory.push({ month: x.month, delta: rel, reason: `Complaint ${k.outcome === "resolved" ? "resolved well" : k.outcome === "warning" ? "closed with a warning" : "handled poorly"}` })));
      k.cost = k.outcome === "lost" ? 2500 : 0;
    } else {
      k.outcome = total >= 5 ? "dismissed" : total >= 3 ? "settled" : "lost";
      k.cost = k.outcome === "dismissed" ? 1500 : k.outcome === "settled" ? (k.kind === "hr" ? 8000 : 6000) : k.kind === "hr" ? 20000 : 18000;
      if (k.kind === "hr" && b.hires?.[k.hr]) delete b.hires[k.hr];
    }
    b.revenue = (b.revenue || 0) - (k.cost || 0);
    b.legal = (b.legal || 0) + (k.cost || 0);
    FP.push(b, { app: "messages", from: FP.TEAM.compliance, clientId: k.clientId, body: `${k.title}: ${{ resolved: "resolved — the client accepted your response.", warning: "closed with a written warning in your file.", lost: "ruled against you.", dismissed: "dismissed. Legal fees only.", settled: "settled.", escalated: "escalated." }[k.outcome]}${k.cost ? ` Cost: ${Clients.usd(k.cost)}.` : ""}`, kind: "report" });
    b.rep = repOf(b);
    if (s) FP.save(s);
    else FP.setBook(b);
    return k;
  }

  // ---------- account paperwork (catch the errors before it's submitted) ----------
  function paperwork(c) {
    const r = (() => {
      let a = (c.seed || 7) + 4242;
      return () => ((a = (a * 1103515245 + 12345) % 2147483648), a / 2147483648);
    })();
    const plan = c.plan || {};
    const alloc = plan.alloc || { stocks: 60, bonds: 35, cash: 5 };
    const benef = c.partner || c.kids[0]?.name || "Estate";
    const right = [
      ["Client name", `${c.first} ${c.last}`],
      ["Email", c.email],
      ["Phone", c.phone],
      ["City", `${c.city}, CA`],
      ["Account type", plan.k401Pct != null && c.truth.match ? "Roth IRA + taxable brokerage" : "Taxable brokerage"],
      ["Investment mix", `${alloc.stocks}% stocks / ${alloc.bonds}% bonds / ${alloc.cash ?? 0}% cash`],
      ["Primary beneficiary", benef],
      ["Monthly contribution", Clients.usd(Object.values(plan.goalSavings || {}).reduce((n, v) => n + (+v || 0), 0) || 250)],
    ];
    const swap = (s2) => (s2.length > 3 ? s2.slice(0, 1) + s2[2] + s2[1] + s2.slice(3) : s2 + "e");
    const breakers = [
      (v) => [0, `${swap(c.first)} ${c.last}`],
      (v) => [2, c.phone.replace(/\d(?=\d{2}$)/, (d) => String((+d + 3) % 10))],
      (v) => [3, `${c.city === "Oceanside" ? "Escondido" : "Oceanside"}, CA`],
      (v) => [5, `${alloc.bonds}% stocks / ${alloc.stocks}% bonds / ${alloc.cash ?? 0}% cash`],
      (v) => [6, "—"],
      (v) => [4, right[4][1] === "Taxable brokerage" ? "Traditional IRA" : "Taxable brokerage"],
    ].filter((f) => !(alloc.bonds === alloc.stocks && f.toString().includes("[5")));
    const shown = right.map((x) => x.slice());
    const errors = new Set();
    const n = 2 + Math.floor(r() * 2);
    const order = breakers.map((f, i) => [r(), f]).sort((a, z) => a[0] - z[0]).map((x) => x[1]);
    for (const f of order) {
      if (errors.size >= n) break;
      const [idx, val] = f();
      if (errors.has(idx) || val === right[idx][1]) continue;
      shown[idx][1] = val;
      errors.add(idx);
    }
    return { right, shown, errors: [...errors] };
  }
  function submitPaperwork(c, flagged) {
    const p = paperwork(c);
    const caught = p.errors.filter((i) => flagged.includes(i));
    const missed = p.errors.filter((i) => !flagged.includes(i));
    const false_ = flagged.filter((i) => !p.errors.includes(i));
    const b = FP.bookOf(c);
    Clients.update(c.id, (x) => (x.paperwork = { done: missed.length === 0, tries: (x.paperwork?.tries || 0) + 1, caught: caught.length, missed: missed.map((i) => p.right[i][0]) }));
    if (missed.length) FP.push(b, { app: "messages", from: FP.TEAM.ops, clientId: c.id, body: `${c.first}'s account paperwork came back NIGO ("not in good order") — ${missed.map((i) => p.right[i][0].toLowerCase()).join(", ")} ${missed.length === 1 ? "was" : "were"} wrong. Fix it and resubmit.`, kind: "update" });
    else {
      FP.push(b, { app: "messages", from: FP.TEAM.ops, clientId: c.id, body: `${c.first}'s accounts are open. Clean paperwork on the ${["first", "second", "third"][Math.min(2, c.paperwork?.tries || 0)]} try — nice.`, kind: "update" });
      b.xp = (b.xp || 0) + 10;
    }
    FP.setBook(b);
    return { caught, missed, false_, p };
  }

  // ---------- your own firm ----------
  const canOpenFirm = (b) => b.mode === "career" && !b.firm && ((b.role || 0) >= 4 || (b.aum || 0) >= 6000000);
  function openFirm(name) {
    const b = FP.book("career");
    b.firm = { name: name || "Ngo Wealth Management", since: b.day };
    b.office = Math.max(b.office || 0, 3);
    FP.push(b, { app: "messages", from: "Your new office manager", body: `Welcome to ${b.firm.name}! Rent is about ${Clients.usd(6000 + b.office * 2500)}/month. You keep 100% of fees now, and wealthier clients will start finding you.`, kind: "promo" });
    FP.setBook(b);
  }
  // Skip ahead: start as the founder of a wealth-management firm with an inherited book.
  function startFirm() {
    const st = FP.state();
    delete st.books.career;
    st.mode = "career";
    FP.save(st);
    const b = FP.book("career");
    b.started = true;
    b.cal3 = true;
    b.role = 4;
    b.office = 3;
    b.firm = { name: "Ngo Wealth Management", since: 0 };
    b.revenue = 40000;
    b.hires = { associate: { since: 0, morale: 75 }, paraplanner: { since: 0, morale: 75 } };
    FP.setBook(b);
    const old = Clients.all().filter((c) => c.book === "career");
    Clients.saveAll(Clients.all().filter((c) => c.book !== "career"));
    const made = [];
    for (let i = 0; i < 5; i++) {
      const c = Clients.generate(i < 2 ? "realistic" : i < 4 ? "easy" : "tough", Math.floor(Math.random() * 1e9), { book: "career", day: 0, wealth: 3 + (i % 2) });
      // Inherited from the founder you bought out: their file came with the facts.
      for (const f of Clients.fields(c)) if (!f.hidden && f.key !== "riskq") c.collected[f.key] = { value: f.key === "risk" ? c.truth.risk : f.num ?? f.text, quote: "From the previous planner's file", month: 0, meeting: 0 };
      c.stage = "discovery";
      c.relationship = 50 + Math.floor(Math.random() * 15);
      c.aum = Math.round((c.truth.brokerage || 0) + (c.truth.roth || 0) + (c.truth.k401 || 0) * 0.5);
      c.referral = "the founder you bought out";
      made.push(c);
    }
    Clients.saveAll([...made, ...Clients.all()]);
    made.forEach((c, i) => Clients.update(c.id, (x) => FP.schedule(x, "discovery", 1 + i)));
    const b2 = FP.book("career");
    b2.aum = made.reduce((n, c) => n + c.aum, 0);
    FP.push(b2, { app: "messages", from: "Your office manager", body: `Welcome to ${b2.firm.name}. You bought out a retiring planner's book: ${made.length} wealthy households. I booked intro meetings this week — their files are in, but you'll need to rebuild every plan.`, kind: "update" });
    FP.setBook(b2);
    return old.length;
  }
  function buyOffice(i) {
    const b = FP.book(FP.state().mode);
    const o = OFFICES[i];
    b.revenue = (b.revenue || 0) - o.cost;
    b.office = i;
    b.rep = repOf(b);
    FP.push(b, { app: "messages", from: FP.TEAM.ops, body: `Moved into your ${o.name.toLowerCase()}. ${o.perk}`, kind: "update" });
    FP.setBook(b);
  }

  return { RIVALS, OFFICES, officeOf, repOf, day, score, onReply, respond, evidence, paperwork, submitPaperwork, canOpenFirm, openFirm, startFirm, buyOffice };
})();

// ---------- screens ----------
function fpCaseModal(k) {
  const b = FP.book(FP.state().mode);
  const ev = FPBiz.evidence(b, k);
  fpModal(
    `<h2>${esc(k.title)}</h2><p class="small">${esc(k.text)}</p>
    <div class="callout small"><strong>What's in the file</strong>${ev.items.map((x) => `<div class="${x[0] === "✓" ? "good-text" : "warn-text"}">${esc(x)}</div>`).join("")}</div>
    <p class="small muted">${k.kind === "complaint" ? "Write to the client (copied to compliance): acknowledge what happened, lay out the facts, and say exactly what you'll do differently. Don't blame them." : "Write your statement: stick to dated facts and point to your documentation. Don't admit fault or make promises — that's for lawyers."}</p>
    <textarea id="case-text" rows="7" placeholder="Your response…"></textarea>
    <button class="btn primary block mt" id="case-send">Submit response</button>`,
    (el, close) =>
      (el.querySelector("#case-send").onclick = () => {
        const t = el.querySelector("#case-text").value.trim();
        if (t.length < 40) return toast("Write a real response (a few sentences).");
        const res = FPBiz.respond(k.id, t);
        close();
        fpModal(`<h2>Outcome: ${esc(res.outcome)}</h2>${res.cost ? `<p>Cost: <strong>${Clients.usd(res.cost)}</strong></p>` : ""}<div class="small">${res.notes.map((n) => `<div class="${n[0] === "✓" ? "good-text" : "warn-text"}">${esc(n)}</div>`).join("")}</div>`);
        route.keepScroll = true;
        route();
      })
  );
}
function fpPaperworkModal(c) {
  const p = FPBiz.paperwork(c);
  fpModal(
    `<h2>Open ${esc(c.first)}'s accounts</h2><p class="small muted">Operations pre-filled the forms. Compare them with ${esc(c.first)}'s file and plan, and flag anything that's wrong before you submit. Wrong forms come back "not in good order" — or worse, money gets invested the wrong way.</p>
    <div class="pw-form">${p.shown.map(([k, v], i) => `<label class="pw-row"><span class="pw-k">${esc(k)}</span><span class="pw-v">${esc(v)}</span><span class="pw-flag"><input type="checkbox" data-pw="${i}"> Wrong</span></label>`).join("")}</div>
    <details class="small"><summary>Peek at the client file</summary><div class="small">${esc(c.first)} ${esc(c.last)} · ${esc(c.email)} · ${esc(c.phone)} · ${esc(c.city)}${c.partner ? ` · partner ${esc(c.partner)}` : ""}${c.kids.length ? ` · kids ${c.kids.map((k) => esc(k.name)).join(", ")}` : ""}${c.plan?.alloc ? ` · plan mix ${c.plan.alloc.stocks}/${c.plan.alloc.bonds}/${c.plan.alloc.cash ?? 0}` : ""}</div></details>
    <button class="btn primary block mt" id="pw-send">Submit paperwork</button>`,
    (el, close) =>
      (el.querySelector("#pw-send").onclick = () => {
        const flagged = [...el.querySelectorAll("[data-pw]:checked")].map((x) => +x.dataset.pw);
        const res = FPBiz.submitPaperwork(c, flagged);
        close();
        toast(res.missed.length ? `Missed ${res.missed.length} error${res.missed.length === 1 ? "" : "s"} — it came back. Check Messages.` : `All ${res.caught.length} errors caught — accounts opened!${res.false_.length ? ` (${res.false_.length} false alarm${res.false_.length === 1 ? "" : "s"})` : ""}`);
        route.keepScroll = true;
        route();
      })
  );
}
function fpBizHTML(b, mode) {
  const rep = FPBiz.repOf(b);
  const cases = (b.cases || []).filter((k) => k.status === "open");
  const closed = (b.cases || []).filter((k) => k.status !== "open").slice(0, 3);
  const rv = (b.reviews || []).slice(0, 3);
  const off = FPBiz.officeOf(b);
  const nextOff = FPBiz.OFFICES[(b.office || 0) + 1];
  const canBuy = nextOff && (!nextOff.role || (b.role || 0) >= nextOff.role) && (!nextOff.firm || b.firm);
  const stars = (n) => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));
  return `<div class="two-col">
    <section class="card"><div class="section-head"><h2>Reputation</h2><span class="pill ${rep >= 70 ? "good" : rep < 45 ? "pill-urgent" : ""}">${rep}/100</span></div>
      <p class="small muted">Comes from online reviews, your office, and complaints. Higher reputation brings more and wealthier leads.</p>
      ${rv.length ? rv.map((x) => `<div class="rv"><div class="spread small"><strong>${esc(x.name)}</strong><span class="rv-stars">${stars(x.stars)}</span></div><p class="small">“${esc(x.text)}”</p></div>`).join("") : `<p class="small muted">No online reviews yet — clients post them after a few meetings.</p>`}</section>
    <section class="card"><div class="section-head"><h2>${b.firm ? esc(b.firm.name) : "Your office"}</h2><span class="small muted">${esc(off.name)}</span></div>
      ${nextOff ? `<div class="team-row"><div class="grow"><div class="row-title">Upgrade: ${esc(nextOff.name)}</div><div class="small muted">${esc(nextOff.perk)} Costs ${Clients.usd(nextOff.cost)} from your fees.</div></div>${canBuy ? `<button class="btn small" data-office="${(b.office || 0) + 1}">Upgrade</button>` : `<span class="small muted">${nextOff.firm ? "Needs your own firm" : `Unlocks at ${FP.ROLES[nextOff.role].name}`}</span>`}</div>` : `<p class="small muted">You have the best office in town.</p>`}
      ${mode === "career" && FPBiz.canOpenFirm(b) ? `<div class="team-row"><div class="grow"><div class="row-title">Open your own wealth management firm</div><div class="small muted">Keep 100% of fees, attract wealthier clients, pay rent and staff yourself.</div></div><button class="btn primary small" id="fp-firm">Open firm</button></div>` : ""}
      ${b.firm ? `<p class="small muted">Firm expenses so far: ${Clients.usd(b.firm.expenses || 0)} · legal: ${Clients.usd(b.legal || 0)}</p>` : b.legal ? `<p class="small muted">Legal costs so far: ${Clients.usd(b.legal)}</p>` : ""}</section>
  </div>
  ${cases.length || closed.length ? `<section class="card"><div class="section-head"><h2>Cases</h2><span class="small muted">Complaints, lawsuits and HR claims</span></div>${cases.map((k) => `<div class="task tone-bad"><span class="task-ic">${icon("shield")}</span><div class="grow"><div class="row-title">${esc(k.title)}</div><div class="small muted">Respond by ${FP.fmtDate(b, k.due)}</div></div><div class="task-actions"><button class="btn primary small" data-case="${k.id}">Respond</button></div></div>`).join("")}${closed.map((k) => `<div class="small muted case-closed">${esc(k.title)} — ${esc(k.outcome)}${k.cost ? ` (${Clients.usd(k.cost)})` : ""}</div>`).join("")}</section>` : ""}`;
}
