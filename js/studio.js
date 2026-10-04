// Resume Studio: live editor with ATS + recruiter scores that move as you type, per-bullet diagnostics,
// AI improvements (fact-checked), job-description targeting, and exports.

const Studio = { key: null, draft: null, result: null, sug: {}, timer: null };

function studioStore() {
  return Object.assign({ drafts: {}, jds: [], last: "general" }, Store.get("studio", {}));
}
function saveStudioStore(s) {
  Store.set("studio", s);
}

function studioTargets() {
  const s = studioStore();
  const tracked = Object.keys(tracker()).map((id) => findRole(id)).filter(Boolean);
  const top = allRoles()
    .filter(({ r }) => r.eligibility.status === "eligible" && (r.kind === "internship" || r.kind === "research"))
    .map((x) => ({ ...x, ch: cachedChance(x.r) }))
    .sort((a, b) => forYouScore(b.r, b.ch) - forYouScore(a.r, a.ch))
    .slice(0, 8);
  const seen = new Set();
  const roles = [...tracked, ...top].filter(({ r }) => !seen.has(r.id) && seen.add(r.id));
  return [
    { key: "general", label: `General — ${GOALS[goal()].label}` },
    ...s.jds.map((j) => ({ key: "jd:" + j.id, label: `Pasted: ${j.org ? j.org + " — " : ""}${j.title}` })),
    ...roles.map(({ r, c }) => ({ key: r.id, label: `${r.org || c.name} — ${r.title}` })),
  ];
}

function studioTarget(key) {
  if (key.startsWith("jd:")) {
    const j = studioStore().jds.find((x) => "jd:" + x.id === key);
    if (j) return { key, title: j.title, org: j.org, keywords: j.keywords, category: "finance" };
  }
  const found = key !== "general" && findRole(key);
  if (found) {
    const r = { ...found.r, org: found.r.org || found.c.name };
    const research = Store.get("research", {})[r.id];
    let keywords = r.keywords;
    if (research?.keywords?.length) {
      const seen = new Set(keywords.map((k) => k.term.toLowerCase()));
      keywords = [...keywords, ...research.keywords.filter((k) => !seen.has(k.term.toLowerCase()))].slice(0, 14);
    }
    return { key, title: r.title, org: r.org, keywords, role: r, category: r.category };
  }
  const g = goal();
  return { key: "general", title: g === "tech" ? "Software / data internship" : "Finance internship", org: "", keywords: TYPICAL_KEYWORDS[g === "tech" ? "tech" : "finance"], category: g === "tech" ? "tech" : "finance" };
}

function freshDraft(target) {
  const r = buildResume(target.role || { keywords: target.keywords, category: target.category }, getBank(), getSettings());
  return { ...r, summary: [r.summary.join(" ")] };
}

function loadDraft(key) {
  const s = studioStore();
  const target = studioTarget(key);
  let d = s.drafts[key];
  if (!d) {
    d = freshDraft(target);
    s.drafts[key] = d;
  }
  // The header always reflects current contact info (phone lives in Settings).
  d.header = buildResume(null, getBank(), getSettings()).header;
  s.last = key;
  saveStudioStore(s);
  return { target, draft: d };
}
function persistDraft() {
  const s = studioStore();
  s.drafts[Studio.key] = Studio.draft;
  saveStudioStore(s);
}

// Fact-check one line against everything verified (data block + Skill Bank answers).
function lineFlags(text, dataText, allowed) {
  const flags = [];
  const nums = numbersNotIn(text, dataText);
  if (nums.length) flags.push(`Unverified number${nums.length > 1 ? "s" : ""}: ${nums.join(", ")}`);
  for (const k of SKILL_VOCAB)
    for (const a of k.any) {
      const al = a.replace("*", "");
      if (allowed.includes(al)) continue;
      if (aliasRegex(a).test(text) && !aliasRegex(a).test(dataText)) {
        flags.push(`“${k.term}” isn't in your verified data`);
        break;
      }
    }
  return flags;
}

function renderStudio(arg) {
  const s = studioStore();
  const key = arg || s.last || "general";
  const { target, draft } = loadDraft(studioTargets().some((t) => t.key === key) || key.startsWith("jd:") || findRole(key) ? key : "general");
  Object.assign(Studio, { key: target.key, target, draft, sug: {}, dataText: dataBlockText(getBank()), allowed: allowedRewriteTerms(target.keywords) });
  const targets = studioTargets();
  if (!targets.some((t) => t.key === target.key)) targets.push({ key: target.key, label: `${target.org ? target.org + " — " : ""}${target.title}` });

  app.innerHTML = `
    <div class="page-head studio-head">
      <div><div class="eyebrow">Resume Studio</div><h1>Build an ATS-ready resume</h1>
        <p class="muted">Edit any line — both scores update as you type. Every change is fact-checked against your verified data.</p></div>
      <div class="studio-target">
        <label class="sr-only" for="st-target">Target role</label>
        <select id="st-target">${targets.map((t) => `<option value="${esc(t.key)}" ${t.key === target.key ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select>
        <button class="btn" id="st-jd">${icon("scan")} Paste job description</button>
      </div>
    </div>
    <div class="studio">
      <div class="studio-editor" id="st-editor">${studioEditorHTML()}</div>
      <aside class="studio-panel" id="st-panel"></aside>
    </div>`;

  document.getElementById("st-target").addEventListener("change", (e) => go("studio/" + e.target.value));
  document.getElementById("st-jd").addEventListener("click", openJDModal);
  wireStudioEditor();
  rescore(true);
}

function bulletRowHTML(it, ii, b, bi) {
  return `<div class="st-bullet" data-ii="${ii}" data-bi="${bi}">
    <div class="st-bullet-main">
      <textarea class="st-input" rows="1" data-field="bullet" data-ii="${ii}" data-bi="${bi}" aria-label="Bullet">${esc(b.text)}</textarea>
      <div class="st-tools">
        <button class="icon-btn" data-move="-1" title="Move up" aria-label="Move up">${icon("up")}</button>
        <button class="icon-btn" data-move="1" title="Move down" aria-label="Move down">${icon("down")}</button>
        <button class="icon-btn" data-del title="Delete" aria-label="Delete bullet">${icon("trash")}</button>
      </div>
    </div>
    <div class="st-flags" id="flags-${ii}-${bi}"></div>
    <div class="st-sug" id="sug-${ii}-${bi}"></div>
  </div>`;
}

function studioEditorHTML() {
  const d = Studio.draft;
  const items = [...d.projects.map((x) => ({ ...x, _sec: "projects" })), ...d.experience.map((x) => ({ ...x, _sec: "experience" }))];
  let ii = -1;
  const section = (title, list) =>
    list.length
      ? `<section class="st-section"><h3 class="st-label">${title}</h3>${list
          .map((it) => {
            ii++;
            return `<div class="st-item" data-ii="${ii}"><div class="st-item-head"><input class="st-title" data-field="title" data-ii="${ii}" value="${esc(it.title)}" aria-label="Entry title"><span class="muted small">${esc([it.org, it.dates].filter(Boolean).join(" · "))}</span></div>
              ${it.bullets.map((b, bi) => bulletRowHTML(it, ii, b, bi)).join("")}
              <button class="btn ghost small" data-add-bullet="${ii}">${icon("plus")} Add bullet</button></div>`;
          })
          .join("")}</section>`
      : "";
  return `
    <section class="st-section">
      <div class="spread"><h3 class="st-label">Summary</h3>${AI.enabled() ? `<button class="btn ghost small" id="st-ai-summary">${icon("sparkles")} Write with AI</button>` : ""}</div>
      <textarea class="st-input st-summary" data-field="summary" rows="3" aria-label="Summary">${esc(d.summary.join(" "))}</textarea>
      <div class="st-flags" id="flags-summary"></div><div class="st-sug" id="sug-summary"></div>
    </section>
    ${section("Projects", items.filter((x) => x._sec === "projects"))}
    ${section("Experience", items.filter((x) => x._sec === "experience"))}
    <section class="st-section"><h3 class="st-label">Skills</h3>
      <label class="field"><span>Technical</span><textarea class="st-input" rows="2" data-field="skills.technical">${esc(d.skills.technical.join(", "))}</textarea></label>
      <label class="field"><span>Soft skills</span><textarea class="st-input" rows="1" data-field="skills.soft">${esc(d.skills.soft.join(", "))}</textarea></label>
    </section>
    <section class="st-section"><h3 class="st-label">Education</h3><textarea class="st-input" rows="4" data-field="education">${esc(d.education.join("\n"))}</textarea></section>
    <div class="row st-foot"><button class="btn ghost small" id="st-reset">${icon("refresh")} Reset to verified data</button><a class="btn ghost small" href="#resumes">Saved versions</a></div>`;
}

// Map the flat item index back to projects/experience.
function itemAt(ii) {
  const d = Studio.draft;
  return ii < d.projects.length ? d.projects[ii] : d.experience[ii - d.projects.length];
}

function autosize(t) {
  t.style.height = "auto";
  t.style.height = t.scrollHeight + 2 + "px";
}

function wireStudioEditor() {
  const ed = document.getElementById("st-editor");
  ed.querySelectorAll("textarea.st-input").forEach(autosize);
  ed.addEventListener("input", (e) => {
    const t = e.target;
    const f = t.dataset.field;
    if (!f) return;
    const d = Studio.draft;
    if (t.tagName === "TEXTAREA") autosize(t);
    if (f === "bullet") itemAt(+t.dataset.ii).bullets[+t.dataset.bi].text = t.value;
    else if (f === "title") itemAt(+t.dataset.ii).title = t.value;
    else if (f === "summary") d.summary = [t.value];
    else if (f === "skills.technical" || f === "skills.soft") d.skills[f.split(".")[1]] = t.value.split(",").map((x) => x.trim()).filter(Boolean);
    else if (f === "education") d.education = t.value.split("\n").map((x) => x.trim()).filter(Boolean);
    persistDraft();
    clearTimeout(Studio.timer);
    Studio.timer = setTimeout(() => rescore(false), 140);
  });
  ed.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const row = b.closest(".st-bullet");
    if (row && (b.dataset.move || b.hasAttribute("data-del"))) {
      const it = itemAt(+row.dataset.ii);
      const bi = +row.dataset.bi;
      if (b.hasAttribute("data-del")) it.bullets.splice(bi, 1);
      else {
        const j = bi + +b.dataset.move;
        if (j < 0 || j >= it.bullets.length) return;
        [it.bullets[bi], it.bullets[j]] = [it.bullets[j], it.bullets[bi]];
      }
      persistDraft();
      return refreshEditor();
    }
    if (b.dataset.addBullet !== undefined) {
      itemAt(+b.dataset.addBullet).bullets.push({ text: "", src: "you" });
      persistDraft();
      refreshEditor();
      const rows = document.querySelectorAll(`.st-bullet[data-ii="${b.dataset.addBullet}"] textarea`);
      rows[rows.length - 1]?.focus();
      return;
    }
    if (b.id === "st-reset") {
      if (!confirm("Reset this version to your verified data? Your edits for this target will be replaced.")) return;
      Studio.draft = freshDraft(Studio.target);
      persistDraft();
      return refreshEditor();
    }
    if (b.id === "st-ai-summary")
      return busy(b, async () => {
        const text = await AI.writeSummary(Studio.target, Studio.draft);
        const flags = lineFlags(text, Studio.dataText, Studio.allowed);
        document.getElementById("sug-summary").innerHTML = suggestionHTML("summary", Studio.draft.summary.join(" "), text, flags.length ? flags.join(" · ") : "Targets the role in under 60 words", !flags.length);
      });
    if (b.dataset.accept) return acceptSuggestion(b.dataset.accept);
    if (b.dataset.dismiss) {
      document.getElementById("sug-" + b.dataset.dismiss).innerHTML = "";
      delete Studio.sug[b.dataset.dismiss];
    }
  });
}

function refreshEditor() {
  const ed = document.getElementById("st-editor");
  const y = window.scrollY;
  ed.innerHTML = studioEditorHTML();
  ed.querySelectorAll("textarea.st-input").forEach(autosize);
  window.scrollTo(0, y);
  rescore(false);
}

function suggestionHTML(id, before, after, why, ok) {
  Studio.sug[id] = after;
  return `<div class="suggestion ${ok ? "" : "blocked"}">
    <div class="suggestion-head">${icon(ok ? "sparkles" : "alert")}<span>${ok ? "Suggested" : "Blocked by fact-check"}</span><span class="muted small">${esc(why)}</span></div>
    <div class="suggestion-text">${esc(after)}</div>
    <div class="row">${ok ? `<button class="btn primary small" data-accept="${id}">${icon("check")} Accept</button>` : ""}<button class="btn ghost small" data-dismiss="${id}">Dismiss</button></div>
  </div>`;
}

function acceptSuggestion(id) {
  const text = Studio.sug[id];
  if (text == null) return;
  if (id === "summary") Studio.draft.summary = [text];
  else {
    const [ii, bi] = id.split("-").map(Number);
    itemAt(ii).bullets[bi].text = text;
  }
  delete Studio.sug[id];
  persistDraft();
  const keep = { ...Studio.sug };
  refreshEditor();
  // Re-render any other open suggestions after the editor refresh.
  for (const [k, v] of Object.entries(keep)) {
    const el = document.getElementById("sug-" + k);
    if (el) el.innerHTML = suggestionHTML(k, "", v, "Suggested", true);
  }
}

async function improveAll(btn) {
  const res = Studio.result;
  const items = res.bullets.filter((b) => b.a.issues.length).map((b) => ({ id: `${b.ii}-${b.bi}`, text: b.text, issues: b.a.issues.map((i) => i.msg) }));
  if (!items.length) return toast("Every bullet already passes the checks.");
  const out = await AI.improveBullets(Studio.target, items.slice(0, 14), Studio.allowed);
  let shown = 0;
  for (const s of out) {
    const orig = items.find((x) => x.id === s.id);
    const el = document.getElementById("sug-" + s.id);
    if (!orig || !el || s.text.trim() === orig.text.trim()) continue;
    const text = s.text.trim().replace(/\.$/, "");
    const why = verifyRewrite(orig.text, text, Studio.dataText, Studio.allowed);
    el.innerHTML = suggestionHTML(s.id, orig.text, text, why || s.why || "", !why);
    shown++;
  }
  toast(shown ? `${shown} suggestion${shown === 1 ? "" : "s"} — review each one below.` : "No safe improvements found.");
  if (shown) document.querySelector(".suggestion")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function gaugeHTML(id, label, v) {
  return `<div class="gauge" id="${id}"><div class="ring tone-${v >= 80 ? "good" : v >= 60 ? "accent" : "warn"}" style="--p:${v};--size:92px"><span>${v}</span></div><div><div class="gauge-label">${label}</div><div class="gauge-delta" id="${id}-delta"></div></div></div>`;
}

function rescore(first) {
  const prev = Studio.result;
  const res = scoreAll(Studio.draft, Studio.target);
  Studio.result = res;
  // per-line diagnostics
  res.bullets.forEach((b) => {
    const el = document.getElementById(`flags-${b.ii}-${b.bi}`);
    if (!el) return;
    const facts = lineFlags(b.text, Studio.dataText, Studio.allowed);
    el.innerHTML = [...facts.map((f) => `<span class="flag bad">${icon("alert")}${esc(f)}</span>`), ...b.a.issues.map((i) => `<span class="flag">${esc(i.msg)}</span>`)].join("") || `<span class="flag good">${icon("check")}Strong</span>`;
  });
  const sumEl = document.getElementById("flags-summary");
  if (sumEl) {
    const facts = lineFlags(Studio.draft.summary.join(" "), Studio.dataText, Studio.allowed);
    sumEl.innerHTML = facts.map((f) => `<span class="flag bad">${icon("alert")}${esc(f)}</span>`).join("");
  }
  const unverified = [...document.querySelectorAll("#st-editor .st-flags")].filter((f) => f.querySelector(".flag.bad")).length;

  const panel = document.getElementById("st-panel");
  if (!panel) return;
  if (first || !panel.children.length) {
    panel.innerHTML = `
      <div class="card score-card">
        <div class="score-orb" id="score-orb"></div>
        <div class="gauges">${gaugeHTML("g-ats", "ATS score", res.ats.score)}${gaugeHTML("g-rec", "Recruiter score", res.recruiter.score)}</div>
        <div class="match"><div class="spread small"><span>Keyword match</span><strong id="match-v">${res.matchRate}%</strong></div>
          <div class="match-bar"><i id="match-bar" style="width:${res.matchRate}%"></i><span class="match-goal" title="Jobscan suggests 75%+"></span></div>
          <div class="small muted">Target 75%+ (Jobscan)</div></div>
        <div class="integrity" id="integrity"></div>
        ${AI.enabled() ? `<button class="btn primary block" id="st-improve">${icon("sparkles")} Improve with AI</button>` : `<p class="small muted">Add your API key in <a href="#settings">Settings</a> for AI improvements.</p>`}
      </div>
      <div class="card"><h3>Top fixes</h3><div id="fixes"></div></div>
      <div class="card"><div class="tabs-inline"><button class="on" data-bd="ats">ATS</button><button data-bd="rec">Recruiter</button></div><div id="breakdown"></div></div>
      <div class="card"><h3>Keywords</h3><div class="chips" id="kw"></div></div>
      <div class="card"><h3>How an ATS reads it</h3><div id="parse"></div></div>
      <div class="card"><h3>Export</h3>${templatePicker()}<div class="row mt-s"><button class="btn primary" data-st="pdf">${icon("download")} PDF</button><button class="btn" data-st="copy">${icon("copy")} Copy text</button><button class="btn" data-st="txt">.txt</button><button class="btn" data-st="save">Save version</button></div>
        <p class="small muted">For online applications, pasting plain text is the most ATS-safe. Use PDF when a file is requested.</p></div>
      <p class="small muted sources">Scoring draws on ${ATS_SOURCES.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(" and ")}. Scores are estimates, not a guarantee of any ATS.</p>`;
    document.getElementById("st-improve")?.addEventListener("click", (e) => busy(e.currentTarget, () => improveAll(e.currentTarget)));
    panel.querySelectorAll("[data-bd]").forEach((b) =>
      b.addEventListener("click", () => {
        panel.querySelectorAll("[data-bd]").forEach((x) => x.classList.toggle("on", x === b));
        Studio.bd = b.dataset.bd;
        renderBreakdown();
      })
    );
    panel.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => studioExport(b.dataset.st)));
    Motion.orb?.(document.getElementById("score-orb"), () => Studio.result?.ats.score ?? 0);
  } else {
    animateScore("g-ats", prev.ats.score, res.ats.score);
    animateScore("g-rec", prev.recruiter.score, res.recruiter.score);
    document.getElementById("match-v").textContent = res.matchRate + "%";
    document.getElementById("match-bar").style.width = res.matchRate + "%";
  }
  document.getElementById("integrity").innerHTML = unverified
    ? `<span class="flag bad">${icon("alert")}${unverified} line${unverified === 1 ? "" : "s"} with unverified claims — fix before exporting</span>`
    : `<span class="flag good">${icon("shield")}Every line matches your verified data</span>`;
  document.getElementById("fixes").innerHTML = res.fixes.length
    ? res.fixes.map((f) => `<div class="fix"><span class="fix-pts">+${f.pts}</span><span>${esc(f.text)}</span></div>`).join("")
    : `<p class="small muted">No major issues. Nice.</p>`;
  document.getElementById("kw").innerHTML = res.keywords
    .map((k) => `<span class="chip ${k.via ? (k.inWork ? "hit" : "half") : "miss"}" title="${k.via ? (k.inWork ? "In your experience" : "Only in skills/summary") : "Missing"}">${k.via ? icon("check") : icon("x")}${esc(k.term)}${k.req ? " ★" : ""}</span>`)
    .join("");
  document.getElementById("parse").innerHTML = `<div class="parse">${res.parse.fields.map(([k, v]) => `<div class="kv"><span>${k}</span><strong class="${v ? "" : "bad-text"}">${v ? esc(v) : "Not found"}</strong></div>`).join("")}</div><p class="small muted">Sections detected: ${res.parse.sections.join(", ")}</p>`;
  renderBreakdown();
}

function renderBreakdown() {
  const res = Studio.result;
  const parts = Studio.bd === "rec" ? res.recruiter.parts : res.ats.parts;
  const el = document.getElementById("breakdown");
  if (el) el.innerHTML = parts.map((p) => `<div class="rubric-row"><div class="spread small"><strong>${p.label}</strong><span>${p.score}/${p.max}</span></div><div class="bar"><i style="width:${(p.score / p.max) * 100}%"></i></div><div class="small muted">${esc(p.detail)}</div></div>`).join("");
}

function animateScore(id, from, to) {
  const g = document.getElementById(id);
  if (!g || from === to) return;
  const ring = g.querySelector(".ring");
  const span = ring.querySelector("span");
  ring.className = `ring tone-${to >= 80 ? "good" : to >= 60 ? "accent" : "warn"}`;
  const delta = document.getElementById(id + "-delta");
  delta.textContent = (to > from ? "+" : "") + (to - from);
  delta.className = "gauge-delta " + (to > from ? "up" : "down");
  if (window.gsap && !Motion.reduced) {
    const o = { v: from };
    gsap.to(o, { v: to, duration: 0.6, ease: "power2.out", onUpdate: () => (span.textContent = Math.round(o.v)) });
    gsap.to(ring, { "--p": to, duration: 0.6, ease: "power2.out" });
    gsap.fromTo(delta, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 });
    gsap.to(delta, { autoAlpha: 0, delay: 1.6, duration: 0.4 });
    setTimeout(() => {
      span.textContent = to;
      ring.style.setProperty("--p", to);
    }, 900);
  } else {
    span.textContent = to;
    ring.style.setProperty("--p", to);
  }
}

function studioExport(kind) {
  const d = Studio.draft;
  const unverified = [...document.querySelectorAll("#st-editor .st-flags")].filter((f) => f.querySelector(".flag.bad")).length;
  if (unverified && kind !== "save" && !confirm(`${unverified} line(s) have claims that aren't in your verified data. Export anyway?`)) return;
  const name = Studio.target.org ? `${Studio.target.org} - ${Studio.target.title}` : Studio.target.title;
  const text = resumeToText(d);
  if (kind === "copy") return navigator.clipboard.writeText(text).then(() => toast("Copied — paste it into the application."), () => toast("Copy blocked — use .txt instead."));
  if (kind === "txt") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `Mason Ngo Resume - ${name}.txt`.replace(/[\\/:*?"<>|]/g, "");
    a.click();
    return URL.revokeObjectURL(a.href);
  }
  if (kind === "pdf") {
    document.getElementById("print-root").innerHTML = `<div class="paper ${tplClass()}">${resumeToHTML(d)}</div>`;
    const t = document.title;
    document.title = `Mason Ngo Resume - ${name}`;
    window.print();
    document.title = t;
    return;
  }
  if (kind === "save") {
    const list = Store.get("resumes", []);
    list.unshift({ id: uid(), name, roleId: Studio.target.role?.id || "", score: Studio.result.ats.score, date: new Date().toISOString().slice(0, 10), resume: JSON.parse(JSON.stringify(d)) });
    Store.set("resumes", list.slice(0, 50));
    toast("Saved to your versions.");
  }
}

function openJDModal() {
  modalBody.innerHTML = `
    <div class="spread"><h2>Target a job description</h2><button class="icon-btn" data-close aria-label="Close">${icon("x")}</button></div>
    <p class="muted small">Paste the posting. Keywords and the job title are pulled out so your ATS match rate is measured against the real thing.</p>
    <div class="grid cards2"><label class="field"><span>Company</span><input type="text" id="jd-org"></label><label class="field"><span>Job title</span><input type="text" id="jd-title" placeholder="e.g. Finance Intern"></label></div>
    <label class="field"><span>Job description</span><textarea id="jd-text" style="min-height:200px"></textarea></label>
    <button class="btn primary" id="jd-go">${icon("scan")} Analyze</button>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector("[data-close]").onclick = () => modal.close();
  document.getElementById("jd-go").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const title = document.getElementById("jd-title").value.trim();
      const org = document.getElementById("jd-org").value.trim();
      const text = document.getElementById("jd-text").value.trim();
      if (!title || text.length < 80) return toast("Add the job title and the full description.");
      const keywords = (AI.enabled() && (await AI.postingKeywords(text))) || analyzePosting(text).keywords;
      if (!keywords.length) return toast("Couldn't find skills in that description — paste the requirements section too.");
      const s = studioStore();
      const id = uid();
      s.jds.unshift({ id, title, org, keywords, at: Date.now() });
      s.jds = s.jds.slice(0, 10);
      saveStudioStore(s);
      modal.close();
      go("studio/jd:" + id);
    })
  );
}

// ================= COMMAND PALETTE =================
function paletteItems() {
  const pages = [
    ["Dashboard", "#dashboard", "home"],
    ["Programs", "#internships", "briefcase"],
    ["Resume Studio", "#studio", "file"],
    ["Tracker", "#tracker", "clipboard"],
    ["Colleges", "#colleges", "cap"],
    ["College profile", "#profile", "cap"],
    ["Skill Bank", "#skills", "award"],
    ["Study", "#study", "book"],
    ["Spoken practice", "#practice", "mic"],
    ["Networking practice", "#practice/networking", "message"],
    ["Mock interview", "#practice/interview", "mic"],
    ["Financial planning practice", "#practice/fp", "trend"],
    ["Sales practice", "#practice/sales", "target"],
    ["Financial planning", "#fp", "users"],
    ["SIE practice exam", "#fp/exam/sie", "award"],
    ["CFP-style practice exam", "#fp/exam/cfp", "award"],
    ["Market brief", "#markets/brief", "trend"],
    ["Paper trading", "#markets/paper", "gauge"],
    ["Elevator pitch", "#brand/pitch", "mic"],
    ["LinkedIn optimizer", "#brand/linkedin", "users"],
    ["Case studies", "#cases", "briefcase"],
    ["Mixed review quiz", "#quiz/mix", "sparkles"],
    ["Saved resume versions", "#resumes", "layers"],
    ["Settings", "#settings", "settings"],
  ].map(([t, h, i]) => ({ group: "Pages", title: t, href: h, icon: i }));
  const programs = allRoles().map(({ r, c }) => ({ group: "Programs", title: `${r.org || c.name} — ${r.title}`, href: "#internship/" + encodeURIComponent(r.id), icon: "briefcase", sub: STATUS_LABEL[r.eligibility.status] }));
  const cols = COLLEGES.map((c) => ({ group: "Colleges", title: c.name, href: "#college/" + c.id, icon: "cap", sub: c.rate + "% admit" }));
  const skills = allSkills(getBank()).map((s) => ({ group: "Skills", title: s.name, href: "#coach/" + s.id, icon: "award", sub: "Coach" }));
  const lessons = allTracks().flatMap((t) => t.lessons.map((l, i) => ({ group: "Lessons", title: l, href: `#lesson/${t.id}/${i}`, icon: "book", sub: t.name })));
  return [...pages, ...programs, ...cols, ...skills, ...lessons];
}

function openPalette() {
  const items = paletteItems();
  let sel = 0;
  let shown = [];
  modalBody.innerHTML = `<div class="palette"><div class="palette-input">${icon("search")}<input id="pal-q" type="text" placeholder="Search pages, programs, colleges, skills, lessons…" autocomplete="off"><kbd>esc</kbd></div><div class="palette-list" id="pal-list" role="listbox"></div></div>`;
  modal.classList.add("palette-modal");
  if (!modal.open) modal.showModal();
  const q = document.getElementById("pal-q");
  const list = document.getElementById("pal-list");
  const draw = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = (words.length ? items.filter((it) => words.every((w) => (it.title + " " + (it.sub || "") + " " + it.group).toLowerCase().includes(w))) : items.filter((it) => it.group === "Pages")).slice(0, 40);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    let last = "";
    list.innerHTML =
      shown
        .map((it, i) => {
          const head = it.group !== last ? `<div class="palette-group">${it.group}</div>` : "";
          last = it.group;
          return `${head}<a href="${it.href}" class="palette-item ${i === sel ? "on" : ""}" data-i="${i}" role="option">${icon(it.icon)}<span class="grow">${esc(it.title)}</span>${it.sub ? `<span class="muted small">${esc(it.sub)}</span>` : ""}</a>`;
        })
        .join("") || `<div class="palette-empty">No results</div>`;
    list.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  };
  const close = () => {
    modal.close();
  };
  q.addEventListener("input", () => ((sel = 0), draw()));
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") (sel = Math.min(shown.length - 1, sel + 1)), draw(), e.preventDefault();
    else if (e.key === "ArrowUp") (sel = Math.max(0, sel - 1)), draw(), e.preventDefault();
    else if (e.key === "Enter" && shown[sel]) {
      e.preventDefault();
      close();
      location.hash = shown[sel].href;
    }
  });
  list.addEventListener("click", (e) => e.target.closest(".palette-item") && close());
  modal.addEventListener("close", () => modal.classList.remove("palette-modal"), { once: true });
  draw();
  q.focus();
  if (window.gsap && !Motion.reduced) gsap.fromTo(".palette", { y: -8, scale: 0.98, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.22, ease: "power2.out", clearProps: "all" });
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    openPalette();
  }
});
