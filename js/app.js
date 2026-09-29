// UI: Build (company -> role -> resume), Skill Bank, Master Resume, Settings.

const state = { view: "build", companyId: null, roleId: null, skillFilter: "all" };
const app = document.getElementById("app");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");

const STATUS_LABEL = { eligible: "Eligible", soon: "Not yet — prep", ineligible: "Not eligible" };

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
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function go(view, extra = {}) {
  Object.assign(state, { view }, extra);
  location.hash = view;
  render();
  window.scrollTo(0, 0);
}

function render() {
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
  ({ build: renderBuild, skills: renderSkills, master: renderMaster, settings: renderSettings })[state.view]();
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
    btn.disabled = false;
    btn.innerHTML = html;
  }
}

// ================= BUILD =================
function renderBuild() {
  const company = state.companyId && findCompany(state.companyId);
  if (!company) return renderCompanies();
  const role = state.roleId && company.roles.find((r) => r.id === state.roleId);
  if (!role) return renderRoles(company);
  renderResult(company, role);
}

function crumbs(company, role) {
  return `<div class="crumbs">
    <button data-crumb="root">Companies</button>
    ${company ? `<span class="muted">/</span>${role ? `<button data-crumb="company">${esc(company.name)}</button>` : `<span>${esc(company.name)}</span>`}` : ""}
    ${role ? `<span class="muted">/</span><span>${esc(role.title)}</span>` : ""}
  </div>`;
}
function wireCrumbs() {
  app.querySelectorAll("[data-crumb]").forEach((b) =>
    b.addEventListener("click", () => go("build", b.dataset.crumb === "root" ? { companyId: null, roleId: null } : { roleId: null }))
  );
}

function statusCounts(roles) {
  const n = { eligible: 0, soon: 0, ineligible: 0 };
  roles.forEach((r) => n[r.eligibility.status]++);
  return Object.entries(n)
    .filter(([, v]) => v)
    .map(([k, v]) => `<span class="badge ${k}">${v} ${STATUS_LABEL[k].toLowerCase()}</span>`)
    .join(" ");
}

function renderCompanies() {
  app.innerHTML = `
    <h1 class="page">Pick a company</h1>
    <p class="lede">Eligibility was checked against each program's public info (Sep 2026). Confirm on the source link before you apply.</p>
    <div class="grid">
      ${companies()
        .map(
          (c) => `<button class="card clickable" data-company="${c.id}">
            <div class="spread"><h3>${esc(c.name)}</h3>${c.ai ? '<span class="badge neutral">Added by you</span>' : ""}</div>
            <p class="muted small" style="margin:0 0 10px">${esc(c.blurb || "")}</p>
            <div class="row">${statusCounts(c.roles)}</div>
          </button>`
        )
        .join("")}
      <button class="card clickable" id="other-company" style="border-style:dashed">
        <h3>+ Other company</h3>
        <p class="muted small" style="margin:0">Search any company's openings with AI, or paste a job posting.</p>
      </button>
    </div>`;
  app.querySelectorAll("[data-company]").forEach((b) => b.addEventListener("click", () => go("build", { companyId: b.dataset.company, roleId: null })));
  document.getElementById("other-company").addEventListener("click", openOtherCompany);
}

function renderRoles(company) {
  app.innerHTML = `
    ${crumbs(company)}
    <div class="spread">
      <div><h1 class="page">${esc(company.name)}</h1><p class="lede">Choose a role to generate a tailored resume.</p></div>
      <div class="row">
        ${company.source ? `<a class="btn small" href="${esc(company.source)}" target="_blank" rel="noopener">Source ↗</a>` : ""}
        ${company.ai ? `<button class="btn small ghost" id="remove-company">Remove</button>` : ""}
      </div>
    </div>
    <div class="stack">
      ${company.roles
        .map(
          (r) => `<button class="card clickable" data-role="${r.id}">
            <div class="spread"><h3>${esc(r.title)}</h3><span class="badge ${r.eligibility.status}">${STATUS_LABEL[r.eligibility.status]}</span></div>
            <p class="muted small" style="margin:0 0 6px">${esc(r.type || "")}</p>
            <p class="small" style="margin:0">${esc(r.eligibility.reason)}</p>
            ${r.url ? `<p class="small" style="margin:6px 0 0"><span class="muted">Found at:</span> ${esc(r.url)}</p>` : ""}
          </button>`
        )
        .join("") || `<div class="card muted">No roles found.</div>`}
    </div>`;
  wireCrumbs();
  app.querySelectorAll("[data-role]").forEach((b) => b.addEventListener("click", () => go("build", { roleId: b.dataset.role })));
  document.getElementById("remove-company")?.addEventListener("click", () => {
    Store.set("aiCompanies", Store.get("aiCompanies", []).filter((c) => c.id !== company.id));
    go("build", { companyId: null });
  });
}

function alternatives(exceptId) {
  return companies()
    .flatMap((c) => c.roles.map((r) => ({ c, r })))
    .filter(({ r }) => r.id !== exceptId && r.eligibility.status !== "ineligible")
    .sort((a, b) => (a.r.eligibility.status === "eligible" ? -1 : 1) - (b.r.eligibility.status === "eligible" ? -1 : 1));
}

function renderResult(company, role) {
  const bank = getBank();
  const status = role.eligibility.status;

  if (status === "ineligible") {
    const resume = buildResume(role, bank, getSettings());
    const { missing } = scoreResume(resume, role);
    app.innerHTML = `
      ${crumbs(company, role)}
      <div class="headline card">
        <div><div class="k">Company</div><div class="v">${esc(company.name)}</div></div>
        <div><div class="k">Role</div><div class="v">${esc(role.title)}</div></div>
        <div><div class="k">Eligible</div><div class="v"><span class="badge ineligible">No</span></div></div>
      </div>
      <div class="notice bad"><strong>Not generating this one.</strong> ${esc(role.eligibility.reason)}</div>
      ${
        missing.length
          ? `<div class="card" style="margin-bottom:14px"><h3>Skill gaps for this kind of role</h3>
            <ul>${missing.map((k) => `<li>Missing: ${esc(k.term)}. Learn ${esc(k.term)} before applying to programs like this.</li>`).join("")}</ul></div>`
          : ""
      }
      <h3>Apply to these instead</h3>
      <div class="stack">${alternatives(role.id)
        .map(
          ({ c, r }) => `<button class="card clickable" data-alt="${c.id}|${r.id}">
            <div class="spread"><strong>${esc(c.name)} — ${esc(r.title)}</strong><span class="badge ${r.eligibility.status}">${STATUS_LABEL[r.eligibility.status]}</span></div>
            <p class="small muted" style="margin:4px 0 0">${esc(r.eligibility.reason)}</p></button>`
        )
        .join("")}</div>`;
    wireCrumbs();
    app.querySelectorAll("[data-alt]").forEach((b) =>
      b.addEventListener("click", () => {
        const [companyId, roleId] = b.dataset.alt.split("|");
        go("build", { companyId, roleId });
      })
    );
    return;
  }

  const resume = buildResume(role, bank, getSettings());
  const score = scoreResume(resume, role);
  const questions = interviewQuestions(role, resume);

  app.innerHTML = `
    ${crumbs(company, role)}
    <div class="headline card">
      <div><div class="k">Company</div><div class="v">${esc(company.name)}</div></div>
      <div><div class="k">Role</div><div class="v">${esc(role.title)}</div></div>
      <div><div class="k">Eligible</div><div class="v"><span class="badge ${status}">${status === "eligible" ? "Yes" : "Not yet"}</span></div><div class="small muted">${esc(role.eligibility.reason)}</div></div>
      <div><div class="k">ATS Score</div><div class="bigscore">${score.total}<span class="muted" style="font-size:16px">/100</span></div><div class="small">${score.verdict}</div></div>
    </div>
    ${status === "soon" ? `<div class="notice warn">You can't apply yet — this resume is prep so you're ready the day you qualify.</div>` : ""}
    <div class="result">
      <div class="stack">
        ${resumeActions()}
        <div class="paper" id="resume-paper">${resumeToHTML(resume)}</div>
      </div>
      <div class="stack">
        ${rubricCard(score)}
        ${keywordCard(score, role)}
      </div>
    </div>
    <h2 style="margin-top:28px">Interview practice</h2>
    <p class="lede">Would you like me to score your answer? (1) Dictate it, (2) Type it, or (3) See talking points from your data first.</p>
    <div class="stack">${questions.map((q, i) => practiceCard(q, i, role.id)).join("")}</div>`;
  wireCrumbs();
  wireResumeActions(resume, `${company.name} - ${role.title}`);
  wirePractice(questions, role.id);
}

function resumeActions() {
  return `<div class="row">
    <button class="btn primary" data-act="print">Save as PDF</button>
    <button class="btn" data-act="copy">Copy plain text</button>
    <button class="btn" data-act="txt">Download .txt</button>
  </div>`;
}
function wireResumeActions(resume, name) {
  const text = resumeToText(resume);
  app.querySelector('[data-act="copy"]').addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied — paste into the application's text box.");
    } catch {
      toast("Copy blocked by the browser — use Download .txt instead.");
    }
  });
  app.querySelector('[data-act="txt"]').addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `Mason Ngo Resume - ${name}.txt`.replace(/[\\/:*?"<>|]/g, "");
    a.click();
    URL.revokeObjectURL(a.href);
  });
  app.querySelector('[data-act="print"]').addEventListener("click", () => {
    document.getElementById("print-root").innerHTML = `<div class="paper">${resumeToHTML(resume)}</div>`;
    const title = document.title;
    document.title = `Mason Ngo Resume - ${name}`;
    window.print();
    document.title = title;
  });
}

function rubricCard(score) {
  return `<div class="card">
    <h3>Scoring rubric</h3>
    <table class="rubric" style="width:100%">
      ${score.rows
        .map(
          (r) => `<tr><td style="width:100%"><strong>${r.name}</strong><div class="small muted">${esc(r.note)}</div>
            <div class="bar"><i style="width:${r.score * 5}%"></i></div></td><td class="s">${r.score}/20</td></tr>`
        )
        .join("")}
    </table>
    <p class="small" style="margin:8px 0 0">No hallucination: ✓ every bullet cites your data block or your own Skill Bank answer.</p>
  </div>`;
}

function keywordCard(score, role) {
  if (!role.keywords.length) return `<div class="card"><h3>Keywords</h3><p class="muted small">No keywords detected for this role.</p></div>`;
  return `<div class="card">
    <h3>Keywords <span class="muted small">(★ = usually required)</span></h3>
    <div class="chips" style="margin-bottom:10px">
      ${score.matched.map((k) => `<span class="chip hit ${k.req ? "req" : ""}" title="Matched via “${esc(k.via)}”">✓ ${esc(k.term)}</span>`).join("")}
      ${score.missing.map((k) => `<span class="chip miss ${k.req ? "req" : ""}">✗ ${esc(k.term)}</span>`).join("")}
    </div>
    ${
      score.missing.length
        ? `<ul class="small" style="margin:0;padding-left:18px">${score.missing
            .map((k) => `<li>Missing: ${esc(k.term)}. It's not in your data. If you really have done it, add it in the Skill Bank (with a real bullet); if not, recommend learning ${esc(k.term)} before applying.</li>`)
            .join("")}</ul>`
        : `<p class="small muted" style="margin:0">Every keyword is covered.</p>`
    }
    <p class="small muted" style="margin:10px 0 0">Keywords are what this kind of role usually screens for. For an exact match, use “+ Other company → Paste a posting”.</p>
  </div>`;
}

// ---------- interview practice ----------
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;

function practiceCard(q, i, roleId) {
  const saved = Store.get("practice", {})[`${roleId}:${i}`] || "";
  return `<div class="card" data-q="${i}">
    <div class="row" style="margin-bottom:6px"><span class="badge neutral">${q.type}</span></div>
    <div class="q" style="font-weight:600;margin-bottom:8px">${esc(q.q)}</div>
    <details style="margin-bottom:10px"><summary class="small">Talking points from your data</summary>
      <ul class="small">${q.points.map((p) => `<li>${esc(p)}</li>`).join("") || "<li>Nothing in your data covers this yet — add a Skill Bank answer.</li>"}</ul></details>
    <textarea placeholder="Type your answer the way you'd say it…">${esc(saved)}</textarea>
    <div class="row" style="margin-top:8px">
      <button class="btn primary small" data-score>Score my answer</button>
      ${Speech ? `<button class="btn small" data-mic>🎤 Dictate</button>` : ""}
    </div>
    <div data-out></div>
  </div>`;
}

function wirePractice(questions, roleId) {
  app.querySelectorAll("[data-q]").forEach((card) => {
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
        const checks = starCheck(ta.value);
        let html = `<ul class="small" style="margin:10px 0 0;padding-left:18px">${checks.map((c) => `<li>${c.ok ? "✅" : "⬜"} ${esc(c.t)}</li>`).join("")}</ul>`;
        if (AI.enabled()) html += `<div class="ai-out small">${esc(await AI.scoreAnswer(questions[i].q, ta.value))}</div>`;
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
    { ok: words >= 60 && words <= 250, t: `Length: ${words} words (aim for 60–250, about 1–2 minutes spoken)` },
    { ok: /\b(when|while|during|last|this|in 20\d\d)\b/i.test(ans), t: "Situation: sets up when/where it happened" },
    { ok: /\bI\b/.test(ans), t: "Action: says what YOU did (“I built…”, “I decided…”)" },
    { ok: /\d/.test(ans), t: "Includes a concrete number" },
    { ok: /(result|so that|ended up|now|learned|improv|reduc|increas|because of)/i.test(ans), t: "Result: ends with an outcome or what you learned" },
  ];
}

function dictate(textarea, btn) {
  if (dictate.rec) {
    dictate.rec.stop();
    return;
  }
  const rec = new Speech();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = "en-US";
  const base = textarea.value ? textarea.value.trim() + " " : "";
  let said = "";
  rec.onresult = (e) => {
    said = Array.from(e.results).map((r) => r[0].transcript).join(" ");
    textarea.value = base + said;
    textarea.dispatchEvent(new Event("input"));
  };
  rec.onend = () => {
    dictate.rec = null;
    btn.textContent = "🎤 Dictate";
  };
  rec.onerror = (e) => toast("Mic error: " + e.error);
  rec.start();
  dictate.rec = rec;
  btn.textContent = "⏹ Stop";
}

// ---------- other company ----------
function openOtherCompany() {
  modalBody.innerHTML = `
    <div class="spread"><h2 style="margin:0">Add another company</h2><button class="btn ghost" data-close>✕</button></div>
    <div class="card" style="margin-top:14px">
      <h3>Find roles with AI</h3>
      <p class="small muted">Claude searches the web for real openings and checks whether a 10th grader can apply. ${AI.enabled() ? "" : "<strong>Needs an API key in Settings.</strong>"}</p>
      <div class="row"><input type="text" id="ai-company" placeholder="e.g. Intuit, Charles Schwab, Scripps Research" style="flex:1;min-width:200px">
      <button class="btn primary" id="ai-find" ${AI.enabled() ? "" : "disabled"}>Find roles</button></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Paste a job posting</h3>
      <p class="small muted">Most accurate option — keywords come from the real posting.</p>
      <label class="field"><span>Company</span><input type="text" id="p-company"></label>
      <label class="field"><span>Role title</span><input type="text" id="p-title"></label>
      <label class="field"><span>Posting text</span><textarea id="p-text" style="min-height:160px" placeholder="Paste the full posting, including requirements/eligibility"></textarea></label>
      <button class="btn primary" id="p-go">Analyze posting</button>
    </div>`;
  if (!modal.open) modal.showModal();
  modalBody.querySelector("[data-close]").onclick = () => modal.close();

  modalBody.querySelector("#ai-find").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const name = modalBody.querySelector("#ai-company").value.trim();
      if (!name) return toast("Type a company name.");
      const roles = await AI.findRoles(name);
      if (!roles.length) return toast(`No verifiable openings found for ${name}.`);
      saveCustomCompany({ id: "co-" + uid(), name, blurb: "Found by AI web search — verify each link", roles, ai: true });
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
      const category = /financ|trading|invest|bank|account/i.test(text) ? "finance" : /python|software|code|program|data|engineer/i.test(text) ? "tech" : "community";
      const role = { id: "p-" + uid(), title, type: "From pasted posting", category, eligibility: analysis.eligibility, keywords };
      const existing = Store.get("aiCompanies", []).find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.roles.push(role);
        saveCustomCompany(existing, role.id);
      } else saveCustomCompany({ id: "co-" + uid(), name, blurb: "Added from a pasted posting", roles: [role], ai: true }, role.id);
    })
  );
}

function saveCustomCompany(company, roleId = null) {
  const list = Store.get("aiCompanies", []).filter((c) => c.id !== company.id);
  list.push(company);
  Store.set("aiCompanies", list);
  modal.close();
  go("build", { companyId: company.id, roleId });
}

// ================= SKILL BANK =================
function renderSkills() {
  const bank = getBank();
  const skills = allSkills(bank)
    .filter((s) => state.skillFilter === "all" || s.type === state.skillFilter)
    .map((s) => ({ s, sc: skillScore(s, bank) }));
  const avg = Math.round(skills.reduce((n, x) => n + x.sc.total, 0) / Math.max(1, skills.length));
  const ringColor = (t) => (t >= 75 ? "var(--good)" : t >= 50 ? "var(--accent)" : t >= 25 ? "var(--warn)" : "var(--bad)");

  app.innerHTML = `
    <div class="spread">
      <div><h1 class="page">Skill Bank</h1>
      <p class="lede">Each score shows how much a skill will actually count on a resume: proof, numbers, demand, and depth. Hit <strong>Improve skill</strong> to answer questions and turn your answers into real bullets.</p></div>
      <div class="card" style="text-align:center;min-width:130px"><div class="k small muted">Average</div><div class="bigscore">${avg}</div></div>
    </div>
    <div class="filters">
      ${["all", "technical", "soft"].map((f) => `<button data-filter="${f}" class="${state.skillFilter === f ? "active" : ""}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}
    </div>
    <div class="grid">
      ${skills
        .map(
          ({ s, sc }) => `<div class="card skill-card">
            <div class="spread">
              <div><h3 style="margin:0">${esc(s.name)}</h3><span class="small muted">${s.type === "soft" ? "Soft skill" : "Technical"}${s.custom ? " · added by you" : ""}</span></div>
              <div class="ring" style="--p:${sc.total};--c:${ringColor(sc.total)}"><span>${sc.total}</span></div>
            </div>
            <div class="small"><strong>${sc.label}.</strong> <span class="muted">${esc(sc.evidenceLabels.length ? "Proof: " + sc.evidenceLabels.join(" · ") : "No proof in your data yet")}</span></div>
            <div class="row" style="margin-top:auto">
              <button class="btn primary small" data-improve="${s.id}">Improve skill</button>
              ${s.custom ? `<button class="btn ghost small" data-remove-skill="${s.id}">Remove</button>` : ""}
            </div>
          </div>`
        )
        .join("")}
      <div class="card skill-card" style="border-style:dashed">
        <h3 style="margin:0">+ Add a skill</h3>
        <p class="small muted" style="margin:0">It starts at zero proof. It only appears on resumes after you answer questions and add a bullet.</p>
        <input type="text" id="new-skill" placeholder="e.g. Flask, Public speaking">
        <div class="row"><select id="new-skill-type" style="width:auto"><option value="technical">Technical</option><option value="soft">Soft</option></select>
        <button class="btn small" id="add-skill">Add</button></div>
      </div>
    </div>`;

  app.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => ((state.skillFilter = b.dataset.filter), renderSkills())));
  app.querySelectorAll("[data-improve]").forEach((b) => b.addEventListener("click", () => openImprove(b.dataset.improve)));
  app.querySelectorAll("[data-remove-skill]").forEach((b) =>
    b.addEventListener("click", () => {
      const bank = getBank();
      bank.customSkills = bank.customSkills.filter((s) => s.id !== b.dataset.removeSkill);
      bank.bullets = bank.bullets.filter((x) => x.skillId !== b.dataset.removeSkill);
      saveBank(bank);
      renderSkills();
    })
  );
  app.querySelector("#add-skill").addEventListener("click", () => {
    const name = app.querySelector("#new-skill").value.trim();
    if (!name) return;
    const bank = getBank();
    if (allSkills(bank).some((s) => s.name.toLowerCase() === name.toLowerCase())) return toast("That skill is already in your bank.");
    bank.customSkills.push({ id: "c-" + uid(), name, type: app.querySelector("#new-skill-type").value, evidence: [], custom: true });
    saveBank(bank);
    renderSkills();
  });
}

function openImprove(skillId) {
  const bank = getBank();
  const skill = allSkills(bank).find((s) => s.id === skillId);
  const sc = skillScore(skill, bank);
  const questions = skillQuestions(skill, bank);
  const saved = (q) => bank.answers.find((a) => a.skillId === skillId && a.question === q);
  const lastItem = [...bank.answers].reverse().find((a) => a.skillId === skillId && a.itemId)?.itemId || "";
  const bullets = bank.bullets.filter((b) => b.skillId === skillId);
  const items = attachableItems();

  modalBody.innerHTML = `
    <div class="spread">
      <div><h2 style="margin:0">Improve: ${esc(skill.name)}</h2><div class="small muted">Score ${sc.total}/100 · ${sc.label}</div></div>
      <button class="btn ghost" data-close>✕</button>
    </div>

    <div class="card" style="margin-top:14px">
      ${sc.parts.map((p) => `<div style="margin-bottom:8px"><div class="spread small"><strong>${p.name}</strong><span>${p.pts}/${p.max}</span></div>
        <div class="bar"><i style="width:${(p.pts / p.max) * 100}%"></i></div><div class="small muted">${esc(p.note)}</div></div>`).join("")}
      ${sc.tips.length ? `<ul class="small" style="margin:8px 0 0;padding-left:18px">${sc.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    </div>

    <h3 style="margin-top:18px">1. Answer in your own words</h3>
    <p class="small muted" style="margin-top:0">Only write what really happened. Your answers become verified data the app can use. Skip any question that doesn't fit.</p>
    <label class="field"><span>Which experience are these answers about?</span>
      <select id="item-select">
        <option value="">— Interview story only (not for the resume) —</option>
        ${items.map((i) => `<option value="${i.id}" ${i.id === lastItem ? "selected" : ""}>${esc(i.label)}</option>`).join("")}
      </select></label>
    <div id="qa-list">${questions
      .map((q, i) => `<div class="qa"><div class="q">${esc(q)}</div><textarea data-qi="${i}">${esc(saved(q)?.answer || "")}</textarea></div>`)
      .join("")}</div>
    <div class="row" style="margin-top:12px">
      <button class="btn primary" id="save-answers">Save answers</button>
      <button class="btn" id="more-q" ${AI.enabled() ? "" : 'disabled title="Add an API key in Settings"'}>✨ Generate more questions</button>
    </div>

    <h3 style="margin-top:22px">2. Turn it into a resume bullet</h3>
    <p class="small muted" style="margin-top:0">Numbers in a bullet must already appear in your answers or your data block. Otherwise it won't be added.</p>
    <textarea id="bullet-text" placeholder="Action verb + what you did + result, e.g. “Cut backtest runtime from … to … by …”"></textarea>
    <div class="row" style="margin-top:8px">
      <button class="btn" id="draft" ${AI.enabled() ? "" : 'disabled title="Add an API key in Settings"'}>✨ Draft from my answers</button>
      <button class="btn primary" id="add-bullet">Add to resume</button>
    </div>
    <div id="draft-note"></div>

    ${
      bullets.length
        ? `<h3 style="margin-top:22px">On your resume from this skill</h3>
      <div class="stack">${bullets
        .map((b) => `<div class="card spread small"><div>${esc(b.text)}<div class="muted">Under: ${esc(items.find((i) => i.id === b.itemId)?.label || b.itemId)}${b.aiDrafted ? " · AI-drafted, approved by you" : ""}</div></div>
        <button class="btn ghost small" data-del-bullet="${b.id}">Remove</button></div>`)
        .join("")}</div>`
        : ""
    }`;
  if (!modal.open) modal.showModal();

  const $ = (s) => modalBody.querySelector(s);
  $("[data-close]").onclick = () => modal.close();

  const collect = () => {
    const itemId = $("#item-select").value;
    return questions.map((q, i) => ({ question: q, answer: modalBody.querySelector(`[data-qi="${i}"]`).value.trim(), itemId }));
  };
  const persist = () => {
    const b = getBank();
    for (const qa of collect()) {
      const existing = b.answers.find((a) => a.skillId === skillId && a.question === qa.question);
      if (existing) Object.assign(existing, { answer: qa.answer, itemId: qa.itemId, ts: Date.now() });
      else if (qa.answer) b.answers.push({ id: uid(), skillId, ...qa, ts: Date.now() });
    }
    b.answers = b.answers.filter((a) => a.answer);
    saveBank(b);
  };

  $("#save-answers").addEventListener("click", () => {
    persist();
    toast("Answers saved.");
    openImprove(skillId);
  });

  $("#more-q").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      persist();
      const more = await AI.skillQuestions(skill, questions);
      if (!more.length) return toast("Couldn't generate questions — try again.");
      const b = getBank();
      b.genQuestions[skillId] = [...(b.genQuestions[skillId] || []), ...more];
      saveBank(b);
      openImprove(skillId);
      toast(`Added ${more.length} questions.`);
    })
  );

  $("#draft").addEventListener("click", (e) =>
    busy(e.currentTarget, async () => {
      const qa = collect().filter((x) => x.answer);
      const itemId = $("#item-select").value;
      if (!itemId) return toast("Pick which experience this is about first.");
      if (!qa.length) return toast("Answer at least one question first.");
      persist();
      const draft = await AI.draftBullet(skill, items.find((i) => i.id === itemId).label, qa);
      if (draft.startsWith("NOT ENOUGH INFO")) {
        $("#draft-note").innerHTML = `<div class="notice warn" style="margin-top:8px">${esc(draft)}</div>`;
        return;
      }
      $("#bullet-text").value = draft.replace(/^[-•]\s*/, "");
      $("#bullet-text").dataset.ai = "1";
      $("#draft-note").innerHTML = `<p class="small muted">Draft only — edit it until every word is true, then add it.</p>`;
    })
  );

  $("#add-bullet").addEventListener("click", () => {
    const text = $("#bullet-text").value.trim().replace(/^[-•]\s*/, "").replace(/\.$/, "");
    const itemId = $("#item-select").value;
    if (!text) return toast("Write a bullet first.");
    if (!itemId) return toast("Pick which experience this bullet belongs under.");
    persist();
    const unverified = unverifiedNumbers(text, skillId, itemId);
    if (unverified.length) {
      $("#draft-note").innerHTML = `<div class="notice bad" style="margin-top:8px">Not added: ${unverified.map((n) => `“${esc(n)}”`).join(", ")} ${unverified.length > 1 ? "aren't" : "isn't"} in your answers or data block. Put the real number in an answer first so it's verified.</div>`;
      return;
    }
    const b = getBank();
    b.bullets.push({ id: uid(), skillId, itemId, text, aiDrafted: $("#bullet-text").dataset.ai === "1", ts: Date.now() });
    saveBank(b);
    toast("Added to your resume.");
    openImprove(skillId);
  });

  modalBody.querySelectorAll("[data-del-bullet]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const b = getBank();
      b.bullets = b.bullets.filter((x) => x.id !== btn.dataset.delBullet);
      saveBank(b);
      openImprove(skillId);
    })
  );
}

// Anti-inflation check: every number in a new bullet must already exist in Mason's answers or the data block.
function unverifiedNumbers(text, skillId, itemId) {
  const bank = getBank();
  const norm = (s) => s.replace(/,/g, "");
  const source = norm(
    [...bank.answers.filter((a) => a.skillId === skillId || a.itemId === itemId).map((a) => a.answer), (itemIndex()[itemId] || {}).text || ""].join(" ")
  );
  const nums = norm(text).match(/\d+(\.\d+)?/g) || [];
  return [...new Set(nums)].filter((n) => !new RegExp("(?<![\\d.])" + n.replace(".", "\\.") + "(?![\\d])").test(source));
}

// ================= MASTER =================
function renderMaster() {
  const bank = getBank();
  const resume = buildResume(null, bank, getSettings());
  const score = scoreResume(resume, null);
  const flags = thinFlags(bank);
  app.innerHTML = `
    <h1 class="page">Master resume</h1>
    <p class="lede">Everything verified, in one place. Tailored versions reorder this for each role. Nothing gets added.</p>
    ${getSettings().phone ? "" : `<div class="notice info">Your phone number isn't on the resume yet. Add it in Settings (it's saved only in this browser, not in the public repo).</div>`}
    <div class="result">
      <div class="stack">${resumeActions()}<div class="paper">${resumeToHTML(resume)}</div></div>
      <div class="stack">
        <div class="card"><div class="k small muted">Overall</div><div class="bigscore">${score.total}<span class="muted" style="font-size:16px">/100</span></div><div class="small">${score.verdict}</div></div>
        ${rubricCard(score)}
        <div class="card"><h3>Weak spots recruiters will notice</h3>
          <ul class="small" style="padding-left:18px;margin:0">${flags.map((f) => `<li style="margin-bottom:6px">${esc(f)}</li>`).join("")}</ul>
          <button class="btn small" style="margin-top:10px" id="to-skills">Fix in Skill Bank →</button></div>
      </div>
    </div>`;
  wireResumeActions(resume, "Master");
  app.querySelector("#to-skills").addEventListener("click", () => go("skills"));
}

// ================= SETTINGS =================
function renderSettings() {
  const s = getSettings();
  app.innerHTML = `
    <h1 class="page">Settings</h1>
    <p class="lede">Everything here is saved only in this browser. None of it goes into the GitHub repo.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <div class="card">
        <h3>Contact</h3>
        <label class="field"><span>Phone (printed on resumes)</span><input type="tel" id="phone" value="${esc(s.phone)}" placeholder="(415) 000-0000"></label>
        <button class="btn primary" id="save-contact">Save</button>
      </div>
      <div class="card">
        <h3>AI features (optional)</h3>
        <p class="small muted">Powers “Find roles”, “Generate more questions”, “Draft bullet”, and answer feedback. Get a key at console.anthropic.com. Each use costs a little on your Anthropic account.</p>
        <label class="field"><span>Claude API key</span><input type="password" id="apikey" value="${esc(s.apiKey)}" placeholder="sk-ant-…" autocomplete="off"></label>
        <label class="field"><span>Model</span><select id="model">
          <option value="claude-opus-5" ${s.model === "claude-opus-5" ? "selected" : ""}>Claude Opus 5 (best quality)</option>
          <option value="claude-sonnet-5" ${s.model === "claude-sonnet-5" ? "selected" : ""}>Claude Sonnet 5 (cheaper)</option>
        </select></label>
        <div class="row"><button class="btn primary" id="save-ai">Save</button><button class="btn" id="test-ai">Test key</button></div>
        <p class="small muted" style="margin-bottom:0">Only use this on your own device. Anyone using this browser could see the key.</p>
      </div>
      <div class="card">
        <h3>Backup</h3>
        <p class="small muted">Your Skill Bank answers and bullets live in this browser. Export them to move to another device.</p>
        <div class="row">
          <button class="btn" id="export">Export backup</button>
          <label class="btn">Import backup<input type="file" id="import" accept="application/json" hidden></label>
        </div>
        <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
        <button class="btn" id="reset" style="color:var(--bad)">Erase all saved data…</button>
      </div>
    </div>`;
  const $ = (id) => document.getElementById(id);
  const save = (patch) => Store.set("settings", { ...getSettings(), ...patch });
  $("save-contact").onclick = () => (save({ phone: $("phone").value.trim() }), toast("Saved."));
  $("save-ai").onclick = () => (save({ apiKey: $("apikey").value.trim(), model: $("model").value }), toast("Saved."));
  $("test-ai").onclick = (e) =>
    busy(e.currentTarget, async () => {
      save({ apiKey: $("apikey").value.trim(), model: $("model").value });
      await AI.ask("Reply with exactly: OK", { maxTokens: 50 });
      toast("Key works ✓");
    });
  $("export").onclick = () => {
    const data = { bank: getBank(), aiCompanies: Store.get("aiCompanies", []), practice: Store.get("practice", {}), phone: getSettings().phone };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "resume-builder-backup.json";
    a.click();
  };
  $("import").onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (data.bank) saveBank(data.bank);
      if (data.aiCompanies) Store.set("aiCompanies", data.aiCompanies);
      if (data.practice) Store.set("practice", data.practice);
      if (data.phone) save({ phone: data.phone });
      toast("Backup restored.");
      renderSettings();
    } catch {
      toast("That file isn't a valid backup.");
    }
  };
  $("reset").onclick = () => {
    if (!confirm("Erase all Skill Bank answers, bullets, added companies, practice answers, and settings from this browser?")) return;
    ["bank", "aiCompanies", "practice", "settings"].forEach((k) => localStorage.removeItem("rb." + k));
    toast("Erased.");
    renderSettings();
  };
}

// ================= boot =================
document.getElementById("tabs").addEventListener("click", (e) => {
  const v = e.target.closest("button")?.dataset.view;
  if (v) go(v, v === "build" ? { companyId: null, roleId: null } : {});
});
modal.addEventListener("close", () => state.view === "skills" && renderSkills());
const initial = location.hash.slice(1);
if (["build", "skills", "master", "settings"].includes(initial)) state.view = initial;
render();
