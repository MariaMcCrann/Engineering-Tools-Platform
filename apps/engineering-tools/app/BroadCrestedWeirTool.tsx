"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

// AS3778.4.2 Figure 2 — coefficient of discharge C, by h1/p (rows) and h1/L (columns)
const H1_P_BREAKS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
const H1_L_BREAKS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
const C_TABLE = [
  [0.85, 0.85, 0.85, 0.861, 0.87, 0.885, 0.893, 0.925, 0.948, 0.971, 0.993, 1.016, 1.039, 1.062],
  [0.855, 0.855, 0.855, 0.864, 0.874, 0.888, 0.907, 0.93, 0.954, 0.977, 1.001, 1.026, 1.05, 1.074],
  [0.864, 0.864, 0.864, 0.868, 0.879, 0.894, 0.913, 0.936, 0.961, 0.986, 1.011, 1.037, 1.061, 1.085],
  [0.873, 0.873, 0.873, 0.874, 0.885, 0.901, 0.92, 0.945, 0.969, 0.995, 1.021, 1.047, 1.072, 1.097],
  [0.882, 0.882, 0.882, 0.883, 0.894, 0.909, 0.929, 0.954, 0.978, 1.005, 1.032, 1.057, 1.083, 1.109],
  [0.892, 0.892, 0.892, 0.894, 0.904, 0.92, 0.941, 0.964, 0.99, 1.016, 1.043, 1.067, 1.094, 1.12],
  [0.901, 0.901, 0.901, 0.906, 0.916, 0.932, 0.952, 0.975, 1.0, 1.026, 1.052, 1.077, 1.104, 1.129],
  [0.911, 0.911, 0.912, 0.916, 0.926, 0.942, 0.962, 0.985, 1.01, 1.036, 1.062, 1.086, 1.112, 1.136],
  [0.921, 0.921, 0.922, 0.926, 0.936, 0.952, 0.972, 0.996, 1.021, 1.046, 1.072, 1.096, 1.12, 1.143],
  [0.929, 0.929, 0.931, 0.936, 0.946, 0.962, 0.982, 1.006, 1.031, 1.056, 1.081, 1.106, 1.128, 1.15],
  [0.935, 0.937, 0.94, 0.946, 0.956, 0.972, 0.993, 1.017, 1.042, 1.066, 1.092, 1.115, 1.138, 1.159],
  [0.941, 0.944, 0.949, 0.956, 0.966, 0.982, 1.004, 1.028, 1.053, 1.077, 1.103, 1.126, 1.148, 1.168],
  [0.946, 0.951, 0.957, 0.966, 0.977, 0.993, 1.016, 1.04, 1.063, 1.089, 1.114, 1.136, 1.158, 1.178],
  [0.953, 0.959, 0.967, 0.975, 0.986, 1.005, 1.028, 1.05, 1.075, 1.101, 1.124, 1.147, 1.168, 1.187],
  [0.961, 0.968, 0.975, 0.984, 0.997, 1.018, 1.04, 1.061, 1.086, 1.111, 1.134, 1.156, 1.176, 1.196],
  [0.972, 0.978, 0.985, 0.994, 1.01, 1.03, 1.05, 1.073, 1.096, 1.119, 1.142, 1.164, 1.184, 1.204]
];

function bracket(x: number, breaks: number[]) {
  const clamped = Math.max(breaks[0], Math.min(breaks[breaks.length - 1], x));
  let i = breaks.findIndex((v) => v >= clamped);
  if (i <= 0) i = 1;
  const i0 = i - 1, i1 = i;
  const t = breaks[i1] === breaks[i0] ? 0 : (clamped - breaks[i0]) / (breaks[i1] - breaks[i0]);
  return { i0, i1, t };
}
function interpolateC(h1p: number, h1l: number) {
  if (!Number.isFinite(h1p) || !Number.isFinite(h1l)) return NaN;
  const r = bracket(h1p, H1_P_BREAKS);
  const c = bracket(h1l, H1_L_BREAKS);
  const v00 = C_TABLE[r.i0][c.i0], v01 = C_TABLE[r.i0][c.i1], v10 = C_TABLE[r.i1][c.i0], v11 = C_TABLE[r.i1][c.i1];
  const top = v00 + (v01 - v00) * c.t;
  const bottom = v10 + (v11 - v10) * c.t;
  return top + (bottom - top) * r.t;
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field">
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function BroadCrestedWeirTool() {
  const [width, setWidth] = useState("3.962");
  const [height, setHeight] = useState("0.3");
  const [length, setLength] = useState("1");
  const [head, setHead] = useState("0.282");

  const r = useMemo(() => {
    const b = num(width), p = num(height), L = num(length), h1 = num(head);
    if (![b, p, L, h1].every((v) => Number.isFinite(v) && v > 0)) return null;
    const h1OverL = h1 / L;
    const h1OverP = h1 / p;
    const LOverP = L / p;
    const C = interpolateC(h1OverP, h1OverL);
    const capacity = Math.pow(2 / 3, 1.5) * Math.sqrt(g) * b * C * Math.pow(h1, 1.5);
    const bOk = b >= 0.3;
    const pOk = p > 0.15;
    const h1Ok = h1 > 0.06;
    const ratioLOk = h1OverL >= 0.1 && h1OverL <= 0.4;
    const ratioPOk = h1OverP < 1.6;
    const ratioLPOk = LOverP > 0.1 && LOverP < 4;
    const withinTable = h1OverP <= 1.6 && h1OverL <= 1.4;
    return { b, p, L, h1, h1OverL, h1OverP, LOverP, C, capacity, bOk, pOk, h1Ok, ratioLOk, ratioPOk, ratioLPOk, withinTable };
  }, [width, height, length, head]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Broad Crested Weir Calculation", "Value", "Unit"],
      ["Width of weir, b", r.b, "m"], ["Height of weir, p", r.p, "m"], ["Length of weir, L", r.L, "m"], ["Upstream head, h1", r.h1, "m"],
      ["h1/L", r.h1OverL, ""], ["h1/p", r.h1OverP, ""], ["L/p", r.LOverP, ""],
      ["Coefficient of discharge, C", r.C, ""], ["Calculated discharge, Qc", r.capacity, "m3/s"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "broad-crested-weir-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">OPEN CHANNEL FLOW MEASUREMENT</p>
    <h1>Broad Crested Weir</h1>
    <p className="subtitle">Discharge rate in an open channel via a broad crested weir, per AS3778.4.2.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Weir geometry"><div className="calc-fields">
        <Field label="Width of weir (across flow), b" value={width} unit="m" hint="Check: b ≥ 0.3 m" onChange={setWidth} />
        <Field label="Height of weir, p" value={height} unit="m" hint="Check: p > 0.15 m" onChange={setHeight} />
        <Field label="Length of weir (with flow), L" value={length} unit="m" onChange={setLength} />
        <Field label="Upstream head, h1" value={head} unit="m" hint="Check: h1 > 0.06 m" onChange={setHead} />
      </div></Section>
      <section className="roughness-reference">
        <div className="reference-head"><div><p className="eyebrow">REFERENCE TABLE</p><h2>Coefficient of discharge, C</h2><span>AS3778.4.2 Figure 2 — interpolated automatically from h1/p and h1/L below.</span></div></div>
        <div className="reference-table"><table><thead><tr><th>h1/p \ h1/L</th>{H1_L_BREAKS.map((v) => <th key={v}>{v.toFixed(1)}</th>)}</tr></thead><tbody>{H1_P_BREAKS.map((hp, ri) => <tr key={hp}><td>{hp.toFixed(1)}</td>{C_TABLE[ri].map((c, ci) => <td key={ci}>{c.toFixed(3)}</td>)}</tr>)}</tbody></table></div>
        <p className="engine-note">Note: the recommended range of application is 0.1 ≤ h1/L ≤ 0.4 (see check below) — the wider table is provided for interpolation only.</p>
      </section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Calculated discharge, Qc</span><strong>{r ? fmt(r.capacity, 3) : "—"}<small>m³/s</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.bOk ? "pass" : "fail"}>{r.bOk ? "✓ b ≥ 0.3 m" : "✕ refer Cl.8.3, AS3778.4.2"}</span>
        <span className={r.pOk ? "pass" : "fail"}>{r.pOk ? "✓ p > 0.15 m" : "✕ refer Cl.8.3, AS3778.4.2"}</span>
        <span className={r.h1Ok ? "pass" : "fail"}>{r.h1Ok ? "✓ h1 > 0.06 m" : "✕ refer Cl.8.3, AS3778.4.2"}</span>
        <span className={r.ratioLOk ? "pass" : "warn"}>{r.ratioLOk ? "✓ 0.1 ≤ h1/L ≤ 0.4" : "! refer Cl.8.2, AS3778.4.2"}</span>
        <span className={r.ratioPOk ? "pass" : "fail"}>{r.ratioPOk ? "✓ h1/p < 1.6" : "✕ refer Cl.8.3, AS3778.4.2"}</span>
        <span className={r.ratioLPOk ? "pass" : "warn"}>{r.ratioLPOk ? "✓ 0.1 < L/p < 4" : "! refer Cl.8.2, AS3778.4.2"}</span>
        {!r.withinTable && <span className="fail">✕ h1/p or h1/L exceeds coefficient table — clamped to table edge</span>}
      </div>
      <Metric name="h1/L" value={fmt(r.h1OverL, 3)} /><Metric name="h1/p" value={fmt(r.h1OverP, 3)} /><Metric name="L/p" value={fmt(r.LOverP, 3)} />
      <Metric name="Coefficient of discharge, C" value={fmt(r.C, 3)} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm weir geometry, approach conditions and the applicability of AS3778.4.2 broad-crested weir theory before issue.</p></>}
    </aside></div>
  </div>;
}
