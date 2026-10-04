// Tax planning and retirement income (Social Security) tools for the client file.
// Estimates only: 2025 federal brackets and a simplified California tax. You make the calls; the tool checks them.

const TAX = {
  // 2025 federal brackets (upper limits) and standard deductions.
  brackets: {
    single: [[11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]],
    mfj: [[23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
    hoh: [[17000, 0.1], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]],
  },
  std: { single: 15750, mfj: 31500, hoh: 23625 },
  // Simplified California brackets (single; doubled for joint).
  ca: [[10756, 0.01], [25499, 0.02], [40245, 0.04], [55866, 0.06], [70606, 0.08], [360659, 0.093], [432787, 0.103], [721314, 0.113], [Infinity, 0.123]],
  calc(taxable, table) {
    let tax = 0;
    let prev = 0;
    let marginal = table[0][1];
    for (const [top, rate] of table) {
      if (taxable > prev) {
        tax += (Math.min(taxable, top) - prev) * rate;
        marginal = rate;
      }
      prev = top;
    }
    return { tax, marginal };
  },
  estimate(c, { pretax401 = 0, filing } = {}) {
    filing ||= c.married ? "mfj" : c.household === "single parent" ? "hoh" : "single";
    const self = ["self-employed", "freelance", "gig"].includes(c.payType);
    const se = self ? c.income * 0.9235 * 0.153 : 0;
    const agi = Math.max(0, c.income - pretax401 - se / 2);
    const taxable = Math.max(0, agi - TAX.std[filing]);
    const fed = TAX.calc(taxable, TAX.brackets[filing]);
    const caTable = filing === "mfj" ? TAX.ca.map(([t, r]) => [t * 2, r]) : TAX.ca;
    const ca = TAX.calc(Math.max(0, agi - (filing === "mfj" ? 11080 : 5540)), caTable);
    const fica = self ? se : Math.min(c.income, 176100) * 0.062 + c.income * 0.0145;
    const credits = (c.kids || []).filter((k) => k.age < 17).length * 2200;
    const fedTax = Math.max(0, fed.tax - credits);
    return { filing, agi, taxable, fed: fedTax, marginal: fed.marginal, ca: ca.tax, fica, self, total: fedTax + ca.tax + fica, effective: (fedTax + ca.tax + fica) / Math.max(1, c.income), quarterly: self ? (fedTax + ca.tax + se) / 4 : 0 };
  },
};

function clTax(c, el) {
  const k = Clients.known(c);
  const plan = c.plan || {};
  const pct = plan.k401Pct ?? k.contrib ?? 0;
  const tax = c.taxChoice || {};
  const est = TAX.estimate(c, { pretax401: (c.income * pct) / 100 });
  const fil = { single: "Single", mfj: "Married filing jointly", hoh: "Head of household" }[est.filing];
  const bestRoth = est.marginal <= 0.12 ? "roth" : est.marginal >= 0.24 ? "traditional" : "split";
  el.innerHTML = `
    <div class="two-col">
      <section class="card"><h2>Tax snapshot</h2><p class="small muted">Estimate from the intake income (${Clients.usd(c.income)}) · 2025 federal brackets · simplified California tax.</p>
        ${[
          ["Filing status", fil],
          ["Adjusted gross income", Clients.usd(est.agi)],
          ["Taxable income (after standard deduction)", Clients.usd(est.taxable)],
          ["Federal income tax", Clients.usd(est.fed) + (c.kids?.some((x) => x.age < 17) ? " (after child tax credit)" : "")],
          ["California income tax", Clients.usd(est.ca)],
          [est.self ? "Self-employment tax" : "Social Security + Medicare", Clients.usd(est.fica)],
          ["Marginal federal bracket", Math.round(est.marginal * 100) + "%"],
          ["Total effective rate", Math.round(est.effective * 1000) / 10 + "%"],
        ]
          .map(([a, b]) => `<div class="kv"><span>${a}</span><strong>${b}</strong></div>`)
          .join("")}
        ${est.self ? `<div class="notice warn mt-s">${icon("alert")} Self-employed: no employer withholding. Quarterly estimated payments of about <strong>${Clients.usd(est.quarterly)}</strong> are due Apr 15, Jun 15, Sep 15 and Jan 15.</div>` : ""}</section>
      <section class="card"><h2>Your tax recommendations</h2>
        <label class="field"><span>Retirement contributions should go to…</span><div class="segmented wrap" id="tx-type">${[
          ["roth", "Roth (pay tax now)"],
          ["traditional", "Traditional (deduct now)"],
          ["split", "Split both"],
        ]
          .map(([v, l]) => `<button data-tx="${v}" class="${tax.type === v ? "on" : ""}">${l}</button>`)
          .join("")}</div></label>
        <label class="field"><span>Refund / withholding advice</span><div class="segmented wrap" id="tx-wh">${[
          ["keep", "Keep withholding as is"],
          ["less", "Withhold less (bigger paychecks)"],
          ["more", "Withhold more"],
        ]
          .map(([v, l]) => `<button data-wh="${v}" class="${tax.wh === v ? "on" : ""}">${l}</button>`)
          .join("")}</div></label>
        <label class="toggle-row"><span><strong>Recommend an HSA</strong><span class="small muted">If they have a high-deductible health plan</span></span><input type="checkbox" id="tx-hsa" ${tax.hsa ? "checked" : ""}></label>
        <div id="tx-check"></div>
        <details class="hint"><summary>${icon("bulb")} Hint</summary><p class="small">Roth makes sense when today's bracket (10–12%) is likely lower than in retirement. Traditional helps more at 24%+. At 22% many planners split. Big refunds mean they're over-withholding — that's an interest-free loan to the IRS.</p></details></section>
    </div>`;
  const check = () => {
    const t = c.taxChoice || {};
    const lines = [];
    if (t.type) lines.push(t.type === bestRoth ? `✓ ${t.type === "roth" ? "Roth" : t.type === "traditional" ? "Traditional" : "Splitting"} fits a ${Math.round(est.marginal * 100)}% bracket.` : `✗ At a ${Math.round(est.marginal * 100)}% bracket, ${bestRoth === "roth" ? "Roth" : bestRoth === "traditional" ? "traditional (pre-tax)" : "a split"} is usually the better fit.`);
    const refundEvent = c.events.some((e) => e.id === "refund");
    const owedEvent = c.events.some((e) => e.id === "taxbill");
    if (t.wh) lines.push(refundEvent && t.wh === "less" ? "✓ They got a big refund — withholding less boosts monthly cash flow." : owedEvent && t.wh === "more" ? "✓ They owed at tax time — withholding more avoids a surprise bill." : t.wh === "keep" && !refundEvent && !owedEvent ? "✓ No sign of over- or under-withholding." : "• Check their last tax return before changing withholding.");
    if (est.self) lines.push(t.quarterly ? "✓ Quarterly estimates noted." : "✗ Self-employed — remind them about quarterly estimated taxes.");
    document.getElementById("tx-check").innerHTML = lines.map((l) => `<div class="small ${l[0] === "✓" ? "good-text" : l[0] === "✗" ? "bad-text" : "muted"}">${esc(l)}</div>`).join("");
  };
  const set = (patch) => {
    Clients.update(c.id, (x) => (x.taxChoice = { ...(x.taxChoice || {}), ...patch }));
    c.taxChoice = { ...(c.taxChoice || {}), ...patch };
    check();
  };
  el.querySelectorAll("[data-tx]").forEach((b) => b.addEventListener("click", () => (set({ type: b.dataset.tx }), b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)))));
  el.querySelectorAll("[data-wh]").forEach((b) => b.addEventListener("click", () => (set({ wh: b.dataset.wh }), b.parentElement.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)))));
  document.getElementById("tx-hsa").addEventListener("change", (e) => set({ hsa: e.target.checked }));
  check();
}

// Social Security estimate (2025 bend points) and a retirement paycheck plan.
const SS = {
  pia(income) {
    const aime = Math.min(income, 176100) / 12;
    return 0.9 * Math.min(aime, 1226) + 0.32 * Math.max(0, Math.min(aime, 7391) - 1226) + 0.15 * Math.max(0, aime - 7391);
  },
  factor(age) {
    // Full retirement age 67: about -30% at 62, +24% at 70.
    if (age < 67) return 1 - Math.min(36, (67 - age) * 12) * (5 / 900) - Math.max(0, (67 - age) * 12 - 36) * (5 / 1200);
    return 1 + (age - 67) * 0.08;
  },
};
function clIncome(c, el) {
  const choice = c.ssChoice || { claim: 67, life: 88 };
  const pia = SS.pia(c.income);
  const ret = c.truth.goals.find((g) => g.id === "retire");
  const retireAge = c.age + (ret?.years ?? 30);
  const k = Clients.known(c);
  const draw = () => {
    const ages = [62, 63, 64, 65, 66, 67, 68, 69, 70];
    const life = choice.life;
    const series = ages.map((a) => {
      const yearly = pia * SS.factor(a) * 12;
      return { a, monthly: Math.round(pia * SS.factor(a)), lifetime: Math.round(yearly * Math.max(0, life - a)) };
    });
    const best = series.reduce((x, y) => (y.lifetime > x.lifetime ? y : x));
    const sel = series.find((s) => s.a === choice.claim);
    const need = Math.round((c.income * 0.7) / 12);
    const savings = (k.k401 || 0) + (k.roth || 0) + (k.brokerage || 0);
    const yrs = Math.max(0, retireAge - c.age);
    const grown = savings * Math.pow(1.06, yrs);
    const withdraw = Math.round((grown * 0.04) / 12);
    const gap = need - sel.monthly - withdraw;
    document.getElementById("ss-out").innerHTML = `
      <div class="metrics">${metricCard("Social Security at " + choice.claim, Clients.usd(sel.monthly) + "/mo", "estimate in today's dollars", "")}${metricCard("Lifetime benefits", Clients.usd(sel.lifetime), "if they live to " + life, sel.a === best.a ? "good-text" : "")}${metricCard("Best claiming age", best.a, "for a life expectancy of " + life, "")}${metricCard("Retirement paycheck gap", gap > 0 ? Clients.usd(gap) + "/mo short" : "Covered", "need ≈ 70% of income: " + Clients.usd(need) + "/mo", gap > 0 ? "warn-text" : "good-text")}</div>
      ${linesChart([{ name: "Lifetime Social Security by claiming age", pts: series.map((s) => s.lifetime) }], { h: 150, xLabel: "claim at 62 → 70" })}
      <p class="small muted">Savings of ${Clients.usd(savings)} growing ~6%/yr for ${yrs} years supports about ${Clients.usd(withdraw)}/mo using the 4% rule. ${k.k401 == null ? "Collect their retirement balances for a better estimate." : ""}</p>`;
  };
  el.innerHTML = `
    <section class="card"><h2>Social Security & retirement income</h2><p class="small muted">Estimated benefit at full retirement age (67): <strong>${Clients.usd(pia)}/month</strong>, from their intake income. Retirement goal: ${esc(ret?.name || "—")} (age ${retireAge}).</p>
      <label class="field"><span>Claim Social Security at age <strong id="ss-cv">${choice.claim}</strong></span><input type="range" min="62" max="70" step="1" id="ss-claim" value="${choice.claim}"></label>
      <label class="field"><span>Life expectancy to plan for: <strong id="ss-lv">${choice.life}</strong></span><input type="range" min="75" max="100" step="1" id="ss-life" value="${choice.life}"></label>
      <div id="ss-out"></div>
      <details class="hint"><summary>${icon("bulb")} Hint</summary><p class="small">Claiming at 62 cuts benefits about 30% for life; waiting to 70 raises them about 24% over age 67. Healthy clients with family longevity usually benefit from waiting; clients with health issues or no other income may claim earlier. Plan for long lives — running out of money is the bigger risk.</p></details></section>`;
  const save = () => Clients.update(c.id, (x) => (x.ssChoice = { ...choice }));
  document.getElementById("ss-claim").addEventListener("input", (e) => ((choice.claim = +e.target.value), (document.getElementById("ss-cv").textContent = choice.claim), draw(), save()));
  document.getElementById("ss-life").addEventListener("input", (e) => ((choice.life = +e.target.value), (document.getElementById("ss-lv").textContent = choice.life), draw(), save()));
  draw();
}
