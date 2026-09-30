// Goal-based ranking, application tracker (+ calendar reminders), and application writing (essays / cover letters).
// Loaded before app.js; everything here only runs after the app has booted.

// ---------- goal ----------
const GOALS = {
  finance: { label: "Finance / trading", fields: ["finance", "business"] },
  tech: { label: "Tech / coding", fields: ["tech", "research"] },
  paid: { label: "Anything paid" },
  college: { label: "Best college boost" },
};
function goal() {
  return GOALS[getSettings().goal] ? getSettings().goal : "finance";
}
function isPaid(r) {
  const p = r.pay || "";
  return /(^paid|stipend|\/hr|salary|\$\d)/i.test(p) && !/^(unpaid|fee)/i.test(p);
}
function goalFit(r) {
  const g = goal();
  if (g === "paid") return isPaid(r) ? 1 : 0;
  if (g === "college") return (r.rate?.v ?? 15) <= 15 && r.kind !== "volunteer" && r.kind !== "virtual" ? 1 : 0;
  // The first field is the core one (e.g. finance); the second is adjacent (e.g. business) and counts partly.
  const f = r.field || r.category;
  return f === GOALS[g].fields[0] ? 1 : f === GOALS[g].fields[1] ? 0.5 : 0;
}
// "For you" ranking: goal fit first, then real opportunities over sign-ups, then your chance (a tiebreaker,
// so easy sign-ups don't bury the internships that matter).
function forYouScore(r, ch) {
  const kindBonus = { internship: 20, research: 16, competition: goal() === "finance" ? 8 : 3, program: 6, virtual: 0, volunteer: 2 }[r.kind] ?? 4;
  return goalFit(r) * 45 + kindBonus + Math.min(ch.chance, 60) * 0.2;
}

// ---------- tracker ----------
const TRACK = [
  ["saved", "Saved"],
  ["applying", "Applying"],
  ["applied", "Applied"],
  ["interview", "Interview"],
  ["accepted", "Accepted"],
  ["rejected", "Not this time"],
];
const TRACK_LABEL = Object.fromEntries(TRACK);
function tracker() {
  return Store.get("tracker", {});
}
function setTrack(id, patch) {
  const t = tracker();
  t[id] = { ...(t[id] || { status: "saved", added: Date.now() }), ...patch, updated: Date.now() };
  Store.set("tracker", t);
}
function removeTrack(id) {
  const t = tracker();
  delete t[id];
  Store.set("tracker", t);
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  // Whole calendar days from today to the deadline.
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
function dueLabel(days) {
  if (days === null) return "";
  if (days < 0) return "Deadline passed";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function trackerPanelHTML(r) {
  const t = tracker()[r.id];
  return `<section class="card" id="track-card">
    <div class="section-head"><h2>Your application</h2>${t ? `<button class="linkbtn small" id="track-remove">Stop tracking</button>` : ""}</div>
    <div class="status-chips">${TRACK.map(([k, l]) => `<button class="chip pick ${t?.status === k ? "on" : ""}" data-track="${k}">${l}</button>`).join("")}</div>
    ${
      t
        ? `<div class="grid cards2 mt-s">
            <label class="field"><span>Exact deadline (from the official page)</span><input type="date" id="track-date" value="${esc(t.date || "")}"></label>
            <div class="field"><span class="lbl">Reminder</span><button class="btn block" id="track-ics" ${t.date ? "" : "disabled"}>📅 Add to my calendar</button><div class="small muted">${t.date ? dueLabel(daysUntil(t.date)) + " · reminds you 7 days and 1 day before" : "Set the date first"}</div></div>
          </div>
          <label class="field"><span>Notes</span><textarea id="track-notes" placeholder="Who to ask for a recommendation, essay ideas, login info for the portal…">${esc(t.notes || "")}</textarea></label>`
        : `<p class="small muted">Tap a status to start tracking. Typical deadline: ${esc(r.deadline || "varies")}.</p>`
    }
  </section>`;
}

function wireTrackerPanel(r, rerender) {
  const $ = (id) => document.getElementById(id);
  document.querySelectorAll("[data-track]").forEach((b) =>
    b.addEventListener("click", () => {
      setTrack(r.id, { status: b.dataset.track, org: r.org, title: r.title });
      toast(`Marked as ${TRACK_LABEL[b.dataset.track]}.`);
      rerender();
    })
  );
  $("track-remove")?.addEventListener("click", () => {
    removeTrack(r.id);
    rerender();
  });
  $("track-date")?.addEventListener("change", (e) => {
    setTrack(r.id, { date: e.target.value });
    rerender();
  });
  $("track-notes")?.addEventListener("input", (e) => setTrack(r.id, { notes: e.target.value }));
  $("track-ics")?.addEventListener("click", () => downloadICS(r, tracker()[r.id].date));
}

// Calendar file with the deadline + reminders 7 days and 1 day before. Opens in Apple Calendar, Google Calendar, Outlook.
function downloadICS(r, date) {
  const d = date.replace(/-/g, "");
  const next = new Date(date + "T12:00:00");
  next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, "");
  const clean = (s) => String(s).replace(/[,;\\]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Launchpad//EN",
    "BEGIN:VEVENT",
    `UID:${r.id}-${d}@launchpad`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${d2}`,
    `SUMMARY:${clean(`Deadline: ${r.org} — ${r.title}`)}`,
    `DESCRIPTION:${clean(`Apply at ${r.url || "the official page"}. Tracked in Launchpad.`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P7D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${clean(`1 week left: ${r.org}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${clean(`Due tomorrow: ${r.org}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `${r.org} deadline.ics`.replace(/[\\/:*?"<>|]/g, "");
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Calendar file downloaded — open it to add the reminder.");
}

function renderTracker() {
  const t = tracker();
  const items = Object.entries(t)
    .map(([id, v]) => {
      const found = findRole(id);
      return { id, v, r: found ? { ...found.r, org: found.r.org || found.c.name } : { id, org: v.org || "Removed program", title: v.title || "", eligibility: { status: "eligible" } } };
    })
    .sort((a, b) => (daysUntil(a.v.date) ?? 999) - (daysUntil(b.v.date) ?? 999));
  const active = items.filter((x) => !["accepted", "rejected"].includes(x.v.status));
  const upcoming = active.filter((x) => x.v.date && daysUntil(x.v.date) >= 0).slice(0, 5);
  const counts = Object.fromEntries(TRACK.map(([k]) => [k, items.filter((x) => x.v.status === k).length]));

  app.innerHTML = `
    <div class="page-head"><div><h1>Tracker</h1><p class="muted">Every application in one place. Set exact deadlines and add them to your calendar so nothing slips.</p></div>
      <a class="btn" href="#internships">+ Track a program</a></div>
    <div class="stats">${[
      ["In progress", active.length],
      ["Applied", counts.applied + counts.interview],
      ["Interviews", counts.interview],
      ["Accepted", counts.accepted],
    ]
      .map(([k, v]) => `<div class="card stat"><div class="k">${k}</div><div class="stat-v">${v}</div></div>`)
      .join("")}</div>
    ${
      items.length
        ? `${
            upcoming.length
              ? `<section class="card"><h2>Next deadlines</h2><div class="list compact">${upcoming
                  .map(({ r, v }) => `<a class="list-row" href="#internship/${encodeURIComponent(r.id)}"><div class="due ${daysUntil(v.date) <= 7 ? "urgent" : ""}">${daysUntil(v.date)}<span>days</span></div><div class="grow"><div class="row-title">${esc(r.org)}</div><div class="small muted">${esc(r.title)} · ${esc(TRACK_LABEL[v.status])}</div></div><span class="chev">›</span></a>`)
                  .join("")}</div></section>`
              : ""
          }
          <div class="board">${TRACK.map(([k, l]) => {
            const col = items.filter((x) => x.v.status === k);
            return `<section class="board-col"><div class="board-head"><strong>${l}</strong><span class="pill">${col.length}</span></div>
              ${col
                .map(
                  ({ r, v }) => `<a class="card board-card" href="#internship/${encodeURIComponent(r.id)}">
                    <div class="row-title">${esc(r.org)}</div><div class="small muted">${esc(r.title)}</div>
                    <div class="small">${v.date ? `<span class="${daysUntil(v.date) <= 7 && daysUntil(v.date) >= 0 ? "bad-text" : ""}">${esc(dueLabel(daysUntil(v.date)))}</span>` : `<span class="muted">No date set</span>`}</div></a>`
                )
                .join("") || `<p class="small muted">—</p>`}</section>`;
          }).join("")}</div>`
        : `<div class="card empty">You're not tracking anything yet. Open any program and tap <strong>Saved</strong> or <strong>Applying</strong> to add it here.<br><br><a class="btn primary" href="#internships">Browse programs</a></div>`
    }`;
}

// ---------- application writing ----------
function essays(roleId) {
  return Store.get("essays", {})[roleId] || [];
}
function saveEssay(roleId, entry) {
  const all = Store.get("essays", {});
  all[roleId] = [entry, ...(all[roleId] || []).filter((e) => e.id !== entry.id)].slice(0, 10);
  Store.set("essays", all);
}
function deleteEssay(roleId, id) {
  const all = Store.get("essays", {});
  all[roleId] = (all[roleId] || []).filter((e) => e.id !== id);
  Store.set("essays", all);
}
function writingCheck(text) {
  const bank = getBank();
  const bad = numbersNotIn(text, dataBlockText(bank) + " " + PROFILE.education.gradYear);
  const placeholders = (text.match(/\[[^\]]+\]/g) || []).length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { bad, placeholders, words };
}

function writingPanelHTML(r) {
  const saved = essays(r.id);
  return `<section class="card" id="writing-card">
    <div class="section-head"><h2>Application writing</h2><span class="small muted">Only uses your verified data and Skill Bank stories</span></div>
    <div class="row"><select id="w-kind"><option value="essay">Short-answer essay</option><option value="cover">Cover letter</option></select>
      <input type="text" id="w-limit" placeholder="Word limit (e.g. 250)" inputmode="numeric" style="max-width:190px"></div>
    <label class="field mt-s"><span>Essay question (paste it from the application)</span><textarea id="w-prompt" placeholder="e.g. Describe a problem you solved and what you learned."></textarea></label>
    ${AI.enabled() ? `<button class="btn primary" id="w-go">✨ Draft it</button>` : `<p class="small muted">Add a Claude API key in <a href="#settings">Settings</a> to draft essays.</p>`}
    <div id="w-out"></div>
    ${saved.length ? `<h4>Saved drafts</h4>${saved.map((e) => `<details class="draft"><summary>${e.kind === "cover" ? "Cover letter" : "Essay"} · ${esc(new Date(e.ts).toLocaleDateString())}${e.prompt ? " — " + esc(e.prompt.slice(0, 60)) : ""}</summary><div class="draft-text">${esc(e.text)}</div><div class="row"><button class="btn small" data-copy-essay="${e.id}">Copy</button><button class="btn ghost small" data-del-essay="${e.id}">Delete</button></div></details>`).join("")}` : ""}
  </section>`;
}

function wireWritingPanel(r, rerender) {
  const $ = (id) => document.getElementById(id);
  $("w-kind")?.addEventListener("change", (e) => {
    $("w-prompt").closest(".field").style.display = e.target.value === "cover" ? "none" : "";
  });
  $("w-go")?.addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const kind = $("w-kind").value;
      const prompt = $("w-prompt").value.trim();
      const limit = parseInt($("w-limit").value, 10) || (kind === "cover" ? 300 : 250);
      if (kind === "essay" && prompt.length < 10) return toast("Paste the essay question first.");
      const research = Store.get("research", {})[r.id] || null;
      const text = await AI.draftWriting(r, kind, prompt, limit, research);
      const chk = writingCheck(text);
      $("w-out").innerHTML = `
        <label class="field mt-s"><span>Draft — edit it until every word sounds like you and is true</span><textarea id="w-text" class="essay-box">${esc(text)}</textarea></label>
        <div class="small ${chk.words > limit ? "bad-text" : "muted"}">${chk.words} / ${limit} words</div>
        ${chk.bad.length ? `<p class="small bad-text">⚠ Fact-check: ${chk.bad.map((n) => `“${esc(n)}”`).join(", ")} isn't in your data — fix or remove before submitting.</p>` : `<p class="small good-text">✓ Fact-check: every number matches your data.</p>`}
        ${chk.placeholders ? `<p class="small">✎ ${chk.placeholders} [bracketed] spot${chk.placeholders === 1 ? " needs" : "s need"} your real details — the AI won't invent them.</p>` : ""}
        <div class="row"><button class="btn primary" id="w-save">Save draft</button><button class="btn" id="w-copy">Copy</button></div>`;
      $("w-save").onclick = () => {
        saveEssay(r.id, { id: uid(), kind, prompt, text: $("w-text").value, ts: Date.now() });
        toast("Draft saved.");
        rerender();
      };
      $("w-copy").onclick = () => navigator.clipboard.writeText($("w-text").value).then(() => toast("Copied."), () => toast("Copy blocked — select the text and copy it."));
    })
  );
  document.querySelectorAll("[data-copy-essay]").forEach((b) =>
    b.addEventListener("click", () => {
      const e = essays(r.id).find((x) => x.id === b.dataset.copyEssay);
      navigator.clipboard.writeText(e.text).then(() => toast("Copied."), () => toast("Copy blocked."));
    })
  );
  document.querySelectorAll("[data-del-essay]").forEach((b) =>
    b.addEventListener("click", () => {
      deleteEssay(r.id, b.dataset.delEssay);
      rerender();
    })
  );
}
