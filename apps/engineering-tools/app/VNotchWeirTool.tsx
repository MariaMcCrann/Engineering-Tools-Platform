"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

// AS3778.4.1 Table 1 — coefficient of discharge Ce vs head over weir h (m), sampled at 5mm steps
const AS_H = [0.06,0.065,0.07,0.075,0.08,0.085,0.09,0.095,0.1,0.105,0.11,0.115,0.12,0.125,0.13,0.135,0.14,0.145,0.15,0.155,0.16,0.165,0.17,0.175,0.18,0.185,0.19,0.195,0.2,0.205,0.21,0.215,0.22,0.225,0.23,0.235,0.24,0.245,0.25,0.255,0.26,0.265,0.27,0.275,0.28,0.285,0.29,0.295,0.3,0.305,0.31,0.315,0.32,0.325,0.33,0.335,0.34,0.345,0.35,0.355,0.36,0.365,0.37,0.375,0.38,0.381];
const AS_CE = [0.6032,0.6012,0.5994,0.5978,0.5964,0.595,0.5937,0.5927,0.5917,0.5906,0.5898,0.5891,0.5885,0.588,0.5876,0.5872,0.5868,0.5865,0.5861,0.5859,0.5857,0.5855,0.5853,0.5851,0.5851,0.585,0.585,0.5849,0.5849,0.5848,0.5848,0.5847,0.5847,0.5846,0.5846,0.5846,0.5846,0.5846,0.5846,0.5846,0.5846,0.5846,0.5846,0.5847,0.5847,0.5847,0.5847,0.5848,0.5848,0.5848,0.5849,0.5849,0.585,0.585,0.585,0.585,0.5851,0.5851,0.5852,0.5852,0.5853,0.5853,0.5854,0.5855,0.5855,0.5855];

function interpolateCe(h: number) {
  const clamped = Math.max(AS_H[0], Math.min(AS_H[AS_H.length - 1], h));
  let i = AS_H.findIndex((v) => v >= clamped);
  if (i <= 0) i = 1;
  const x0 = AS_H[i - 1], x1 = AS_H[i], y0 = AS_CE[i - 1], y1 = AS_CE[i];
  const t = x1 === x0 ? 0 : (clamped - x0) / (x1 - x0);
  return y0 + (y1 - y0) * t;
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

export function VNotchWeirTool() {
  const [head, setHead] = useState("0.15");
  const [weirHeight, setWeirHeight] = useState("0.5");
  const [channelWidth, setChannelWidth] = useState("1.5");
  const [approachLength, setApproachLength] = useState("2");
  const [notchAngle, setNotchAngle] = useState("90");

  const r = useMemo(() => {
    const h = num(head), p = num(weirHeight), B = num(channelWidth), L = num(approachLength), theta = num(notchAngle);
    if (![h, p, B, L, theta].every((v) => Number.isFinite(v) && v > 0)) return null;

    const withinTable = h >= 0.06 && h <= 0.381;
    const ce = interpolateCe(h);
    const asQ = 2362.5 * ce * Math.pow(h, 2.5); // litres/sec

    const thetaRad = (theta * Math.PI) / 180;
    const cd = 0.44 / Math.pow(h, 0.03);
    const awQ = cd * Math.tan(thetaRad / 2) * Math.sqrt(g) * Math.pow(h, 2.5) * 1000; // litres/sec

    const hOverP = h / p, hOverB = h / B, lOverH = L / h;
    const hRangeOk = h > 0.05 && h < 0.38;
    const hOverPOk = hOverP <= 0.4;
    const hOverBOk = hOverB <= 0.2;
    const pOk = p >= 0.45;
    const bOk = B >= 1.0;
    const lOk = L >= 10 * h;

    return { h, p, B, L, theta, withinTable, ce, asQ, cd, awQ, hOverP, hOverB, lOverH, hRangeOk, hOverPOk, hOverBOk, pOk, bOk, lOk };
  }, [head, weirHeight, channelWidth, approachLength, notchAngle]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["V-Notch Weir Calculation", "Value", "Unit"],
      ["Head over weir, h", r.h, "m"], ["Weir height, p", r.p, "m"], ["Channel width, B", r.B, "m"], ["Approach channel length, L", r.L, "m"],
      ["AS3778.4.1 — coefficient of discharge, Ce", r.ce, ""], ["AS3778.4.1 — flow rate", r.asQ, "L/s"],
      ["Ackers & White — notch angle", r.theta, "degrees"], ["Ackers & White — coefficient of discharge, Cd", r.cd, ""], ["Ackers & White — flow rate", r.awQ, "L/s"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "v-notch-weir-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">OPEN CHANNEL FLOW MEASUREMENT</p>
    <h1>V-Notch Weir</h1>
    <p className="subtitle">Discharge of water over a 90° V-notch thin plate weir, by two methods: AS3778.4.1 Table 1, and Ackers &amp; White.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Weir and channel geometry"><div className="calc-fields">
        <Field label="Head over weir, h" value={head} unit="m" hint="AS3778.4.1 table applies for 0.06 ≤ h ≤ 0.381 m" onChange={setHead} />
        <Field label="Weir height, p" value={weirHeight} unit="m" onChange={setWeirHeight} />
        <Field label="Channel width, B" value={channelWidth} unit="m" onChange={setChannelWidth} />
        <Field label="Approach channel length, L" value={approachLength} unit="m" onChange={setApproachLength} />
      </div></Section>
      <Section number={2} title="Ackers &amp; White notch angle"><div className="calc-fields">
        <Field label="Notch angle, θ" value={notchAngle} unit="degrees" onChange={setNotchAngle} />
      </div></Section>
      <section className="roughness-reference">
        <div className="reference-head"><div><p className="eyebrow">REFERENCE TABLE</p><h2>AS3778.4.1 Table 1 — coefficient of discharge, Ce</h2><span>Interpolated automatically from head, h, above (sampled every 5 mm).</span></div></div>
        <div className="reference-table"><table><thead><tr><th>h (m)</th><th>Ce</th></tr></thead><tbody>{AS_H.filter((_, i) => i % 2 === 0).map((h, idx) => (
          <tr key={h}><td>{h.toFixed(3)}</td><td>{AS_CE[idx * 2].toFixed(4)}</td></tr>
        ))}</tbody></table></div>
      </section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>AS3778.4.1 flow rate</span><strong>{r ? fmt(r.asQ, 2) : "—"}<small>L/s</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.withinTable ? "pass" : "warn"}>{r.withinTable ? "✓ h within table range (0.06–0.381 m)" : "! h outside table range — Ce clamped"}</span>
        <span className={r.hRangeOk ? "pass" : "fail"}>{r.hRangeOk ? "✓ 0.05 < h < 0.38 m" : "✕ outside practical limitation"}</span>
        <span className={r.hOverPOk ? "pass" : "fail"}>{r.hOverPOk ? "✓ h/p ≤ 0.4" : "✕ h/p exceeds 0.4"}</span>
        <span className={r.hOverBOk ? "pass" : "fail"}>{r.hOverBOk ? "✓ h/B ≤ 0.2" : "✕ h/B exceeds 0.2"}</span>
        <span className={r.pOk ? "pass" : "fail"}>{r.pOk ? "✓ p ≥ 0.45 m" : "✕ p below 0.45 m"}</span>
        <span className={r.bOk ? "pass" : "fail"}>{r.bOk ? "✓ B ≥ 1.0 m" : "✕ B below 1.0 m"}</span>
        <span className={r.lOk ? "pass" : "fail"}>{r.lOk ? "✓ L ≥ 10h" : "✕ L below 10h"}</span>
      </div>
      <Metric name="Coefficient of discharge, Ce" value={fmt(r.ce, 4)} />
      <Metric name="h/p" value={fmt(r.hOverP, 3)} /><Metric name="h/B" value={fmt(r.hOverB, 3)} /><Metric name="L/h" value={fmt(r.lOverH, 2)} />
      <h3 className="result-section-title">Ackers &amp; White cross-check</h3>
      <Metric name="Coefficient of discharge, Cd" value={fmt(r.cd, 4)} />
      <Metric name="Flow rate" value={fmt(r.awQ, 2) + " L/s"} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Use weirs to AS3778.4.1 for accurate measurement. Maximum tabulated flow is approximately 124 L/s. Confirm approach conditions and notch angle before issue.</p></>}
    </aside></div>
  </div>;
}
