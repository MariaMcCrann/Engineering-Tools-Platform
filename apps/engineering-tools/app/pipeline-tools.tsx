"use client";

import { useMemo, useState } from "react";

const G = 9.81;
const NU = 1.01e-6;

type Material = "HDPE" | "RCP" | "PVC";
type PipeSize = { nominal: number; hdpe?: number; rcp?: number; pvc?: number };
type Reach = { id: number; name: string; length: string; material: Material; nominal: string; barrels: string; k: string };

// Internal diameters reproduced from the source workbook Pipe Sizes sheet.
const PIPE_SIZES: PipeSize[] = [
  { nominal: 150, hdpe: 150, pvc: 153.4 },
  { nominal: 200, hdpe: 189 },
  { nominal: 225, hdpe: 213, pvc: 240.8 },
  { nominal: 250, hdpe: 237 },
  { nominal: 280, hdpe: 266 },
  { nominal: 300, rcp: 300, pvc: 303.1 },
  { nominal: 315, hdpe: 299 },
  { nominal: 355, hdpe: 334 },
  { nominal: 375, rcp: 375, pvc: 285.1 },
  { nominal: 400, hdpe: 369.5 },
  { nominal: 450, hdpe: 427, rcp: 450 },
  { nominal: 500, hdpe: 452 },
  { nominal: 560, hdpe: 506 },
  { nominal: 600, rcp: 610 },
  { nominal: 630, hdpe: 597 },
  { nominal: 710, hdpe: 676 },
  { nominal: 750, rcp: 760 },
  { nominal: 800, hdpe: 723.4 },
  { nominal: 900, hdpe: 858, rcp: 910 },
  { nominal: 1000, hdpe: 949 },
  { nominal: 1050, rcp: 1070 },
  { nominal: 1200, rcp: 1220 },
  { nominal: 1350, rcp: 1370 },
  { nominal: 1500, rcp: 1524 },
  { nominal: 1650, rcp: 1676 },
  { nominal: 1800, rcp: 1828 },
];

const ROUGHNESS_MM: Record<Material, number> = { HDPE: 0.015, RCP: 0.15, PVC: 0.015 };
const FITTINGS = [
  ["Entry", 0.5], ["Exit", 1.0], ["90° bend", 1.2], ["45° bend", 0.32], ["30° bend", 0.17],
  ["22.5° bend", 0.10], ["20° bend", 0.09], ["7° bend", 0.06], ["Butterfly valve", 0.20],
  ["Through tee", 0.60], ["Tee 90° bend", 1.75],
] as const;

const n = (value: string) => Number(value);
const fmt = (value: number, digits = 3) => Number.isFinite(value)
  ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";

function idFor(material: Material, nominal: number) {
  const row = PIPE_SIZES.find((x) => x.nominal === nominal);
  return row?.[material.toLowerCase() as "hdpe" | "rcp" | "pvc"];
}

function colebrookF(re: number, rr: number) {
  if (!(re > 0)) return NaN;
  if (re < 2300) return 64 / re;
  let f = 0.25 / Math.pow(Math.log10(rr / 3.7 + 5.74 / Math.pow(re, 0.9)), 2);
  for (let i = 0; i < 30; i += 1) {
    const inv = -2 * Math.log10(rr / 3.7 + 2.51 / (re * Math.sqrt(f)));
    const next = 1 / (inv * inv);
    if (Math.abs(next - f) < 1e-10) return next;
    f = next;
  }
  return f;
}

function calc(flowMLd: number, length: number, idMm: number, barrels: number, roughnessMm: number, k: number) {
  const qTotal = flowMLd / 86.4;
  const q = qTotal / barrels;
  const d = idMm / 1000;
  const area = Math.PI * d * d / 4;
  const velocity = q / area;
  const re = velocity * d / NU;
  const f = colebrookF(re, (roughnessMm / 1000) / d);
  const vh = velocity * velocity / (2 * G);
  const hf = f * (length / d) * vh;
  const hs = k * vh;
  return { qTotal, q, d, area, velocity, re, f, hf, hs, total: hf + hs };
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field"><span>{label}</span>{hint && <small>{hint}</small>}<input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}</label>;
}

function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function PipeSizingTool() {
  const [flow, setFlow] = useState("15");
  const [length, setLength] = useState("25");
  const [material, setMaterial] = useState<Material>("HDPE");
  const [k, setK] = useState("1.5");
  const [maxVelocity, setMaxVelocity] = useState("1.5");
  const [maxHeadloss, setMaxHeadloss] = useState("0.15");
  const [barrels, setBarrels] = useState("1");

  const candidates = useMemo(() => PIPE_SIZES
    .map((p) => {
      const id = idFor(material, p.nominal);
      if (!id) return null;
      const result = calc(n(flow), n(length), id, Math.max(1, n(barrels)), ROUGHNESS_MM[material], n(k));
      const velocityOk = result.velocity <= n(maxVelocity);
      const headlossOk = result.total <= n(maxHeadloss);
      return { nominal: p.nominal, id, ...result, velocityOk, headlossOk, ok: velocityOk && headlossOk };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x)), [flow, length, material, k, maxVelocity, maxHeadloss, barrels]);

  const recommended = candidates.find((x) => x.ok) ?? null;
  const exportCsv = () => {
    const rows = [["Nominal diameter (mm)", "Internal diameter (mm)", "Velocity (m/s)", "Friction loss (m)", "Minor loss (m)", "Total headloss (m)", "Result"],
      ...candidates.map((x) => [x.nominal, x.id, x.velocity, x.hf, x.hs, x.total, x.ok ? "PASS" : "FAIL"])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "pipe-sizing-comparison.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return <div className="content">
    <div className="title-row"><div><p className="eyebrow">HYDRAULIC DESIGN TOOL</p><h1>Pipe Sizing</h1><p className="subtitle">Compare workbook pipe sizes against design velocity and allowable headloss.</p></div></div>
    <div className="calc-layout"><div>
      <section className="calc-card"><div className="calc-card-title"><b>1</b><h2>Design criteria</h2></div><div className="calc-fields">
        <Field label="Design flow" value={flow} unit="ML/d" onChange={setFlow}/><Field label="Pipe length" value={length} unit="m" onChange={setLength}/>
        <label className="calc-field"><span>Pipe material</span><select value={material} onChange={(e) => setMaterial(e.target.value as Material)}><option>HDPE</option><option>RCP</option><option>PVC</option></select></label>
        <Field label="Number of barrels" value={barrels} onChange={setBarrels}/><Field label="Combined minor-loss K" value={k} hint="Entry + exit default = 1.5" onChange={setK}/>
        <Field label="Maximum velocity" value={maxVelocity} unit="m/s" onChange={setMaxVelocity}/><Field label="Maximum total headloss" value={maxHeadloss} unit="m" onChange={setMaxHeadloss}/>
      </div></section>
      <section className="calc-card"><div className="calc-card-title"><b>2</b><h2>Candidate pipe sizes</h2></div><div className="storage-table"><table><thead><tr><th>Nom.</th><th>ID</th><th>Velocity</th><th>hf</th><th>hs</th><th>Total</th><th>Check</th></tr></thead><tbody>{candidates.map((x) => <tr key={x.nominal}><td>DN{x.nominal}</td><td>{fmt(x.id, 1)} mm</td><td>{fmt(x.velocity)} m/s</td><td>{fmt(x.hf)} m</td><td>{fmt(x.hs)} m</td><td><strong>{fmt(x.total)} m</strong></td><td><span className={x.ok ? "pass" : "fail"}>{x.ok ? "✓ PASS" : `${x.velocityOk ? "" : "Velocity "}${x.headlossOk ? "" : "Headloss"}`}</span></td></tr>)}</tbody></table></div></section>
    </div><aside className="results-card"><p className="eyebrow">RECOMMENDED SIZE</p><div className="result-main"><strong>{recommended ? `DN${recommended.nominal}` : "—"}</strong><span>{recommended ? material : "No passing size"}</span></div>{recommended && <><Metric name="Internal diameter" value={`${fmt(recommended.id, 1)} mm`}/><Metric name="Velocity" value={`${fmt(recommended.velocity)} m/s`}/><Metric name="Friction loss" value={`${fmt(recommended.hf)} m`}/><Metric name="Minor loss" value={`${fmt(recommended.hs)} m`}/><Metric name="Total headloss" value={`${fmt(recommended.total)} m`}/><Metric name="Darcy friction factor" value={fmt(recommended.f, 5)}/></>}<p className="answer-note">Pipe IDs and roughness values are taken from the uploaded GMW headloss workbook. Confirm pressure class and manufacturer dimensions before issue for construction.</p><button className="download-btn" onClick={exportCsv}>↓ Export comparison CSV</button></aside></div>
  </div>;
}

export function PipelineHglTool() {
  const [flow, setFlow] = useState("15");
  const [upstreamHgl, setUpstreamHgl] = useState("100");
  const [reaches, setReaches] = useState<Reach[]>([
    { id: 1, name: "Reach 1", length: "25", material: "HDPE", nominal: "560", barrels: "1", k: "1.5" },
    { id: 2, name: "Reach 2", length: "40", material: "HDPE", nominal: "560", barrels: "1", k: "0" },
  ]);
  const nextId = reaches.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  const setReach = (id: number, patch: Partial<Reach>) => setReaches((rows) => rows.map((r) => r.id === id ? { ...r, ...patch } : r));

  const results = useMemo(() => {
    let hgl = n(upstreamHgl), distance = 0;
    return reaches.map((r) => {
      const idMm = idFor(r.material, n(r.nominal));
      if (!idMm || n(r.length) < 0 || n(r.barrels) <= 0) return { ...r, valid: false as const, fromHgl: hgl, toHgl: hgl, fromDistance: distance, toDistance: distance };
      const c = calc(n(flow), n(r.length), idMm, n(r.barrels), ROUGHNESS_MM[r.material], n(r.k));
      const fromHgl = hgl, fromDistance = distance;
      hgl -= c.total; distance += n(r.length);
      return { ...r, valid: true as const, idMm, ...c, fromHgl, toHgl: hgl, fromDistance, toDistance: distance };
    });
  }, [flow, upstreamHgl, reaches]);
  const final = results.at(-1);
  const totalLoss = final ? n(upstreamHgl) - final.toHgl : 0;

  const exportCsv = () => {
    const rows = [["Reach", "Length (m)", "Material", "Nominal (mm)", "ID (mm)", "Barrels", "K", "Velocity (m/s)", "hf (m)", "hs (m)", "Total loss (m)", "HGL from (m)", "HGL to (m)"],
      ...results.map((x) => x.valid ? [x.name, x.length, x.material, x.nominal, x.idMm, x.barrels, x.k, x.velocity, x.hf, x.hs, x.total, x.fromHgl, x.toHgl] : [x.name, x.length, x.material, x.nominal, "INVALID"] )];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "pipeline-hgl.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return <div className="content">
    <div className="title-row"><div><p className="eyebrow">HYDRAULIC DESIGN TOOL</p><h1>Pipeline HGL</h1><p className="subtitle">Multi-reach Colebrook–White headloss and running hydraulic grade line.</p></div></div>
    <section className="calc-card"><div className="calc-card-title"><b>1</b><h2>Design flow and starting level</h2></div><div className="calc-fields"><Field label="Design flow" value={flow} unit="ML/d" onChange={setFlow}/><Field label="Upstream HGL / FSL" value={upstreamHgl} unit="m AHD" onChange={setUpstreamHgl}/></div></section>
    <section className="calc-card"><div className="calc-card-title"><b>2</b><h2>Pipeline reaches</h2></div><div className="storage-table"><table><thead><tr><th>Reach</th><th>Length</th><th>Material</th><th>Nominal</th><th>Barrels</th><th>K</th><th></th></tr></thead><tbody>{reaches.map((r) => <tr key={r.id}><td><input value={r.name} onChange={(e) => setReach(r.id, { name: e.target.value })}/></td><td><input type="number" value={r.length} onChange={(e) => setReach(r.id, { length: e.target.value })}/></td><td><select value={r.material} onChange={(e) => setReach(r.id, { material: e.target.value as Material })}><option>HDPE</option><option>RCP</option><option>PVC</option></select></td><td><select value={r.nominal} onChange={(e) => setReach(r.id, { nominal: e.target.value })}>{PIPE_SIZES.filter((p) => idFor(r.material, p.nominal)).map((p) => <option key={p.nominal} value={p.nominal}>DN{p.nominal}</option>)}</select></td><td><input type="number" value={r.barrels} onChange={(e) => setReach(r.id, { barrels: e.target.value })}/></td><td><input type="number" step="any" value={r.k} onChange={(e) => setReach(r.id, { k: e.target.value })}/></td><td><button onClick={() => setReaches((rows) => rows.filter((x) => x.id !== r.id))}>×</button></td></tr>)}</tbody></table></div><button className="download-btn" onClick={() => setReaches((rows) => [...rows, { id: nextId, name: `Reach ${nextId}`, length: "10", material: "HDPE", nominal: "560", barrels: "1", k: "0" }])}>+ Add reach</button></section>
    <div className="calc-layout"><section className="calc-card"><div className="calc-card-title"><b>3</b><h2>HGL results</h2></div><div className="storage-table"><table><thead><tr><th>Reach</th><th>Distance</th><th>ID</th><th>Velocity</th><th>hf</th><th>hs</th><th>HGL from</th><th>HGL to</th></tr></thead><tbody>{results.map((x) => <tr key={x.id}><td>{x.name}</td><td>{fmt(x.toDistance, 1)} m</td><td>{x.valid ? `${fmt(x.idMm, 1)} mm` : "—"}</td><td>{x.valid ? `${fmt(x.velocity)} m/s` : "—"}</td><td>{x.valid ? fmt(x.hf) : "—"}</td><td>{x.valid ? fmt(x.hs) : "—"}</td><td>{fmt(x.fromHgl)}</td><td><strong>{fmt(x.toHgl)}</strong></td></tr>)}</tbody></table></div></section><aside className="results-card"><p className="eyebrow">PIPELINE RESULT</p><div className="result-main"><strong>{fmt(totalLoss)}</strong><span>m total headloss</span></div><Metric name="Starting HGL" value={`${fmt(n(upstreamHgl))} m AHD`}/><Metric name="Final HGL" value={`${final ? fmt(final.toHgl) : "—"} m AHD`}/><Metric name="Total length" value={`${final ? fmt(final.toDistance, 1) : "0.0"} m`}/><p className="answer-note">Each reach uses its own material, internal diameter, barrel count and combined fittings K. The web tool solves friction directly, so Excel Goal Seek is not required.</p><button className="download-btn" onClick={exportCsv}>↓ Export HGL CSV</button></aside></div>
    <section className="calc-card"><div className="calc-card-title"><b>4</b><h2>Typical fittings K reference</h2></div><div className="storage-table"><table><thead><tr><th>Fitting</th><th>K</th></tr></thead><tbody>{FITTINGS.map(([name, coeff]) => <tr key={name}><td>{name}</td><td>{coeff}</td></tr>)}</tbody></table></div></section>
  </div>;
}
