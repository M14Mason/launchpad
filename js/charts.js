// Charts, rebuilt: crisp SVG (text never stretches), nice axis ticks ($450k, $1.2M), shaded outcome ranges,
// hover/tap readouts with a guide line, and a draw-in animation. Replaces the earlier chart helpers
// (same function names and arguments, so every page picks these up).

const Charts = {
  seq: 0,
  data: {},
  money(v) {
    const a = Math.abs(v);
    const s = v < 0 ? "-$" : "$";
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return s + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "k";
    return s + Math.round(a);
  },
  ticks(min, max, n = 4) {
    const span = max - min || Math.abs(max) || 1;
    const step0 = span / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
    return out;
  },
  // core renderer: series of {name, vals, cls, dash}; bands of {lo[], hi[], cls}; x labels; optional target line.
  render({ series = [], bands = [], labels = [], h = 200, fmt = Charts.money, target = null, targetLabel = "goal", min = null, max = null, legend = true, xTitle = "" }) {
    const id = "ch" + ++Charts.seq;
    const W = 640;
    const H = h + 34;
    const L = 58;
    const R = 16;
    const T = 14;
    const B = 28;
    const all = [...series.flatMap((s) => s.vals), ...bands.flatMap((b) => [...b.lo, ...b.hi]), ...(target != null ? [target] : [])].filter((v) => v != null && isFinite(v));
    const lo0 = min ?? Math.min(0, ...all);
    const hi0 = max ?? Math.max(...all, 1);
    const ticks = Charts.ticks(lo0, hi0);
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const n = Math.max(...series.map((s) => s.vals.length), ...bands.map((b) => b.lo.length), 2);
    const X = (i) => L + (i / (n - 1)) * (W - L - R);
    const Y = (v) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
    const path = (vals) => vals.map((v, i) => (v == null ? "" : `${i && vals[i - 1] != null ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)).join(" ");
    const area = (lo, hi) => `${hi.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ")} ${[...lo].reverse().map((v, j) => `L${X(lo.length - 1 - j).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ")} Z`;
    const xl = labels.length ? labels : Array.from({ length: n }, (_, i) => String(i));
    const xIdx = n <= 6 ? [...Array(n).keys()] : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];
    Charts.data[id] = { n, labels: xl, series: series.map((s) => ({ name: s.name, vals: s.vals, cls: s.cls })), bands: bands.map((b) => ({ name: b.name, lo: b.lo, hi: b.hi })), fmt, W, L, R };
    return `<div class="chartbox" data-chart="${id}">
      <svg class="chart2" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(", "))}">
        ${ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ax" x="${L - 8}" y="${Y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join("")}
        ${xIdx.map((i) => `<text class="ax" x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${esc(xl[i] ?? "")}</text>`).join("")}
        ${bands.map((b) => `<path class="band ${b.cls || ""}" d="${area(b.lo, b.hi)}"/>`).join("")}
        ${target != null ? `<line class="target" x1="${L}" x2="${W - R}" y1="${Y(target)}" y2="${Y(target)}"/><text class="ax tgt" x="${W - R - 4}" y="${Y(target) - 6}" text-anchor="end">${esc(targetLabel)} ${fmt(target)}</text>` : ""}
        ${series.map((s) => `<path class="line draw ${s.cls || ""}" d="${path(s.vals)}" pathLength="1"/>`).join("")}
        <line class="guide" x1="0" x2="0" y1="${T}" y2="${H - B}" style="opacity:0"/>
        ${series.map((s, k) => `<circle class="gdot ${s.cls || ""}" data-k="${k}" r="4.5" cx="-10" cy="-10"/>`).join("")}
        <rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>
      </svg>
      <div class="chart-tip" hidden></div>
      ${legend && (series.length > 1 || bands.length || target != null) ? `<div class="legend small muted">${series.map((s) => `<span><i class="lg ${s.cls || "line"}"></i>${esc(s.name)}</span>`).join("")}${bands.map((b) => `<span><i class="lg band ${b.cls || ""}"></i>${esc(b.name || "range")}</span>`).join("")}${target != null ? `<span><i class="lg target"></i>${esc(targetLabel)}</span>` : ""}</div>` : ""}
    </div>`;
  },
  // Hover / tap: guide line, dots and a readout.
  wire() {
    if (Charts._wired) return;
    Charts._wired = true;
    const move = (e) => {
      const box = e.target.closest?.(".chartbox");
      if (!box) return;
      const d = Charts.data[box.dataset.chart];
      const svg = box.querySelector("svg");
      if (!d || !svg) return;
      const r = svg.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      const fx = ((pt.clientX - r.left) / r.width) * d.W;
      const i = Math.max(0, Math.min(d.n - 1, Math.round(((fx - d.L) / (d.W - d.L - d.R)) * (d.n - 1))));
      const X = d.L + (i / (d.n - 1)) * (d.W - d.L - d.R);
      const guide = svg.querySelector(".guide");
      guide.setAttribute("x1", X);
      guide.setAttribute("x2", X);
      guide.style.opacity = 1;
      const tip = box.querySelector(".chart-tip");
      const rows = [];
      d.series.forEach((s, k) => {
        const v = s.vals[i];
        const dot = svg.querySelector(`.gdot[data-k="${k}"]`);
        const pathEl = svg.querySelectorAll(".line")[k];
        if (v == null || !pathEl) return dot && dot.setAttribute("cx", -10);
        // Find the point's y from the path's own coordinates.
        const seg = pathEl.getAttribute("d").split(/[ML]/).filter(Boolean)[i];
        const [, py] = (seg || "0 0").trim().split(/\s+/).map(Number);
        dot.setAttribute("cx", X);
        dot.setAttribute("cy", py);
        rows.push(`<div><i class="lg ${s.cls || "line"}"></i>${esc(s.name)}: <strong>${d.fmt(v)}</strong></div>`);
      });
      d.bands.forEach((b) => b.lo[i] != null && rows.push(`<div class="muted">${esc(b.name || "range")}: ${d.fmt(b.lo[i])} – ${d.fmt(b.hi[i])}</div>`));
      tip.innerHTML = `<div class="tip-x">${esc(d.labels[i] ?? "")}</div>${rows.join("")}`;
      tip.hidden = false;
      const left = (X / d.W) * r.width;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, left + 12)) + "px";
    };
    const leave = (e) => {
      const box = e.target.closest?.(".chartbox");
      if (!box) return;
      box.querySelector(".chart-tip").hidden = true;
      box.querySelector(".guide").style.opacity = 0;
      box.querySelectorAll(".gdot").forEach((d) => d.setAttribute("cx", -10));
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("pointerleave", leave, true);
    document.addEventListener("pointerout", (e) => !e.relatedTarget?.closest?.(".chartbox") && leave(e), true);
  },
};
Charts.wire();

// ----- the chart helpers used across the app (same names as before) -----
function lineChart(points, { h = 150, min, max, fmt = (v) => String(Math.round(v)) } = {}) {
  if (points.length < 2) return `<p class="small muted">Do this a couple more times to see your trend.</p>`;
  return Charts.render({ series: [{ name: "Score", vals: points.map((p) => p.y) }], labels: points.map((p) => p.x), h, min, max, fmt, legend: false });
}
function linesChart(series, { h = 180, xLabel = "", fmt = Charts.money } = {}) {
  const n = Math.max(...series.map((s) => s.pts.length));
  const labels = Array.from({ length: n }, (_, i) => (i === 0 ? "now" : i === n - 1 && xLabel ? xLabel : String(i)));
  return Charts.render({ series: series.map((s) => ({ name: s.name, vals: s.pts, cls: s.cls })), labels, h, fmt });
}
function fanChart(bands, { target = null, h = 220 } = {}) {
  const yrs = bands.length - 1;
  const labels = bands.map((_, i) => (i === 0 ? "Today" : `Year ${i}`));
  return Charts.render({
    series: [{ name: "Median (typical) outcome", vals: bands.map((b) => b.p50), cls: "" }],
    bands: [
      { name: "10th–90th percentile", lo: bands.map((b) => b.p10), hi: bands.map((b) => b.p90), cls: "outer" },
      ...(bands[0].p25 != null ? [{ name: "25th–75th percentile", lo: bands.map((b) => b.p25), hi: bands.map((b) => b.p75), cls: "inner" }] : []),
    ],
    labels,
    h,
    target,
    targetLabel: "goal",
    xTitle: `${yrs} yrs`,
  });
}
function frontierChart(pick, suggested) {
  const W = 640;
  const H = 230;
  const L = 58;
  const R = 20;
  const T = 16;
  const B = 34;
  const pts = Array.from({ length: 11 }, (_, i) => {
    const s = i * 10;
    const m = Clients.mix({ stocks: s, bonds: Math.max(0, 95 - s), cash: Math.min(5, 100 - s) });
    return { s, mu: m.mu, sd: m.sd };
  });
  const X = (sd) => L + (sd / 0.17) * (W - L - R);
  const Y = (mu) => T + (1 - (mu - 0.025) / 0.075) * (H - T - B);
  const dot = (alloc, cls, lbl, dy) => {
    const m = Clients.mix(alloc);
    return `<circle cx="${X(m.sd)}" cy="${Y(m.mu)}" r="8" class="${cls}"/><text x="${X(m.sd) + 12}" y="${Y(m.mu) + dy}" class="ax strong">${lbl} · ${(m.mu * 100).toFixed(1)}% ± ${(m.sd * 100).toFixed(0)}%</text>`;
  };
  return `<div class="chartbox"><svg class="chart2" viewBox="0 0 ${W} ${H}" role="img" aria-label="Risk versus expected return">
    ${[0.03, 0.05, 0.07, 0.09].map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${(v * 100).toFixed(0)}%</text>`).join("")}
    ${[0, 0.05, 0.1, 0.15].map((v) => `<text class="ax" x="${X(v)}" y="${H - 14}" text-anchor="middle">${(v * 100).toFixed(0)}%</text>`).join("")}
    <text class="ax" x="${W - R}" y="${H - 2}" text-anchor="end">yearly ups and downs (risk) →</text>
    <text class="ax" x="4" y="10">expected return ↑</text>
    <path d="${pts.map((p, i) => `${i ? "L" : "M"}${X(p.sd)} ${Y(p.mu)}`).join(" ")}" class="line draw" pathLength="1"/>
    ${pts.filter((p) => p.s % 20 === 0).map((p) => `<circle cx="${X(p.sd)}" cy="${Y(p.mu)}" r="3" class="chart-dot"/><text x="${X(p.sd)}" y="${Y(p.mu) + 17}" text-anchor="middle" class="ax">${p.s}% stocks</text>`).join("")}
    ${suggested ? dot(suggested, "dot-suggest", "Risk profile", 18) : ""}${dot(pick, "dot-pick", "Your plan", -10)}
  </svg></div>`;
}
