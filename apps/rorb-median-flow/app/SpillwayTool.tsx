"use client";

import { useMemo, useState } from "react";

type Inputs = {
  project: string;
  head: number;
  width: number;
  crest: number;
  apron: number;
  slope: number;
  jhrl: number;
  tailwater: number;
  coefficient: number;
  runFactor: number;
};

const defaults: Inputs = {
  project: "",
  head: 0.4,
  width: 2,
  crest: 4.05,
  apron: 0,
  slope: 4,
  jhrl: 0.88,
  tailwater: 0,
  coefficient: 1.708,
  runFactor: 3,
};

const g = 9.81;
const n = (value: number, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "-";

function calculate(x: Inputs) {
  const flow = x.coefficient * x.width * Math.pow(x.head, 1.5);
  const designLevel = x.crest + x.head;
  const h1 = designLevel - x.apron;
  const unitFlow = flow / x.width;
  const chuteLength = Math.hypot(x.crest, x.runFactor * x.crest);
  const cosTheta = x.slope * x.crest / chuteLength;
  let velocity = Math.sqrt(Math.max(0, 2 * g * h1));
  for (let i = 0; i < 100 && velocity > 0; i += 1) {
    const next = Math.sqrt(Math.max(0, 2 * g * (h1 - unitFlow / velocity * cosTheta)));
    if (Math.abs(next - velocity) < 1e-10) { velocity = next; break; }
    velocity = next;
  }
  const toeDepth = unitFlow / velocity;
  const froude = velocity / Math.sqrt(g * toeDepth);
  const conjugateDepth = toeDepth * 0.5 * (Math.sqrt(1 + 8 * froude * froude) - 1);
  const rollLength = (160 * Math.tanh(froude / 20) - 12) * toeDepth;
  let basinType = "Manual basin selection required";
  if (froude > 4.5 && unitFlow < 46.5 && h1 < 61) basinType = "USBR Basin Type II";
  else if (froude > 4.5 && velocity < 18 && velocity > 15 && unitFlow < 18.6) basinType = "USBR Basin Type III";
  else if (froude < 4.5) basinType = "USBR Basin Type IV";
  const basinFactor = basinType === "USBR Basin Type II" ? 4.4 : basinType === "USBR Basin Type III" ? 2.8 : basinType === "USBR Basin Type IV" ? 6 : NaN;
  const tailFactor = basinType === "USBR Basin Type II" ? 1.05 : basinType === "USBR Basin Type III" ? 1 : basinType === "USBR Basin Type IV" ? 1.1 : NaN;
  const basinLength = basinFactor * conjugateDepth;
  const requiredTailwater = tailFactor * conjugateDepth;
  const upstreamEnergy = conjugateDepth + x.apron + unitFlow ** 2 / (2 * g * conjugateDepth ** 2);
  const actualTailwaterDepth = x.jhrl - x.tailwater;
  const downstreamEnergy = actualTailwaterDepth + x.tailwater + unitFlow ** 2 / (2 * g * actualTailwaterDepth ** 2);
  return { flow, designLevel, h1, unitFlow, chuteLength, cosTheta, velocity, toeDepth, froude, conjugateDepth, rollLength, basinType, basinLength, requiredTailwater, upstreamEnergy, downstreamEnergy, energyDifference: upstreamEnergy - downstreamEnergy };
}

function Field({ label, unit, value, role, defaultValue, onChange }: { label: string; unit?: string; value: number; role: "project" | "assumption"; defaultValue: number; onChange: (v: number) => void }) {
  return <label className={`calc-field guided-field ${role}`}>
    <span>{label}<em className={`field-role ${role}`}>{role === "project" ? "Modify" : "Review assumption"}</em></span>
    <small className="default-value">Workbook default: {defaultValue}{unit ? ` ${unit}` : ""}</small>
    <input type="number" step="any" value={value} onChange={(e) => onChange(Number(e.target.value))}/>{unit && <i>{unit}</i>}
  </label>;
}

export function SpillwayTool() {
  const [inputs, setInputs] = useState(defaults);
  const r = useMemo(() => calculate(inputs), [inputs]);
  const set = (key: keyof Inputs) => (value: number) => setInputs((old) => ({ ...old, [key]: value }));
  const geometryWarning = r.cosTheta > 1;
  const energyPass = Math.abs(r.energyDifference) <= 0.02;
  const inputIssues = [
    inputs.head <= 0 ? "Flow depth over crest must be greater than 0 m." : "",
    inputs.width <= 0 ? "Spillway crest width must be greater than 0 m." : "",
    inputs.coefficient <= 0 ? "Weir discharge coefficient must be greater than 0." : "",
    inputs.slope <= 0 ? "Chute slope denominator must be greater than 0." : "",
    inputs.runFactor <= 0 ? "Chute horizontal-run factor must be greater than 0." : "",
    inputs.jhrl <= inputs.tailwater ? `Hydraulic jump RL (${n(inputs.jhrl, 2)} m) must be higher than tailwater elevation (${n(inputs.tailwater, 2)} m).` : "",
  ].filter(Boolean);
  const valid = inputIssues.length === 0;
  const exportCsv = () => {
    const rows = [
      ["Spillway calculation", inputs.project || "Untitled"],
      ["Parameter", "Value", "Unit"],
      ["Design flow", r.flow, "m3/s"], ["Design water level", r.designLevel, "m"],
      ["Chute velocity", r.velocity, "m/s"], ["Toe depth", r.toeDepth, "m"],
      ["Froude number", r.froude, ""], ["Conjugate depth", r.conjugateDepth, "m"],
      ["Basin type", r.basinType, ""], ["Basin length", r.basinLength, "m"],
      ["Required tailwater depth", r.requiredTailwater, "m"], ["Energy difference", r.energyDifference, "m"],
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${inputs.project.trim().replace(/[^a-z0-9_-]+/gi, "_") || "spillway"}_calculation.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">OPEN CHANNEL HYDRAULICS</p>
    <h1>Spillway</h1>
    <p className="subtitle">Weir flow, chute hydraulics and USBR stilling-basin checks based on the supplied calculation workbook.</p>
    <div className="input-guide"><div><strong>Input guide</strong><span><i className="guide-dot modify"/>Blue = project values to modify</span><span><i className="guide-dot review"/>Amber = workbook assumptions to review</span></div><button onClick={() => setInputs(defaults)}>Reset workbook defaults</button></div>
    <div className="calc-layout">
      <div>
        <section className="calc-card">
          <div className="calc-card-title"><b>1</b><h2>Project and spillway geometry</h2></div>
          <label className="calc-field guided-field project spillway-project"><span>Project name<em className="field-role project">Modify</em></span><small className="default-value">Used in the exported filename</small><input value={inputs.project} onChange={(e) => setInputs((old) => ({ ...old, project: e.target.value }))} placeholder="e.g. Cowra-Linden Drainage"/></label>
          <div className="calc-fields spillway-fields">
            <Field label="Flow depth over crest" unit="m" value={inputs.head} role="project" defaultValue={defaults.head} onChange={set("head")}/>
            <Field label="Spillway crest width" unit="m" value={inputs.width} role="project" defaultValue={defaults.width} onChange={set("width")}/>
            <Field label="Spillway crest elevation" unit="m" value={inputs.crest} role="project" defaultValue={defaults.crest} onChange={set("crest")}/>
            <Field label="Apron elevation" unit="m" value={inputs.apron} role="project" defaultValue={defaults.apron} onChange={set("apron")}/>
            <Field label="Chute slope (1 in N)" value={inputs.slope} role="project" defaultValue={defaults.slope} onChange={set("slope")}/>
            <Field label="Hydraulic jump RL" unit="m" value={inputs.jhrl} role="project" defaultValue={defaults.jhrl} onChange={set("jhrl")}/>
            <Field label="Tailwater elevation" unit="m" value={inputs.tailwater} role="project" defaultValue={defaults.tailwater} onChange={set("tailwater")}/>
          </div>
        </section>
        <section className="calc-card">
          <div className="calc-card-title"><b>2</b><h2>Workbook assumptions</h2></div>
          <p className="section-help">Amber values are carried from the spreadsheet. Confirm they suit the spillway geometry and adopted design standard.</p>
          <div className="calc-fields spillway-fields">
            <Field label="Weir discharge coefficient" value={inputs.coefficient} role="assumption" defaultValue={defaults.coefficient} onChange={set("coefficient")}/>
            <Field label="Chute horizontal-run factor" value={inputs.runFactor} role="assumption" defaultValue={defaults.runFactor} onChange={set("runFactor")}/>
          </div>
        </section>
        {geometryWarning && <div className="warning"><div>!</div><p><strong>Review the chute geometry.</strong><br/>The workbook method gives cos theta = {n(r.cosTheta, 3)}, which is above the physical limit of 1. The result is reproduced for parity, but the slope and chute-length definition should be checked before design use.</p></div>}
        <section className="calc-card">
          <div className="calc-card-title"><b>3</b><h2>Stilling basin summary</h2></div>
          <div className="spillway-table"><table><tbody>
            <tr><th>Recommended basin</th><td>{r.basinType}</td></tr>
            <tr><th>Conjugate depth</th><td>{n(r.conjugateDepth, 3)} m</td></tr>
            <tr><th>Basin length</th><td>{n(r.basinLength, 2)} m</td></tr>
            <tr><th>Required tailwater depth</th><td>{n(r.requiredTailwater, 2)} m</td></tr>
            <tr><th>Hydraulic-jump roll length</th><td>{n(r.rollLength, 2)} m</td></tr>
          </tbody></table></div>
          <p className="engine-note">Basin selection reproduces the workbook decision rules. Confirm the final arrangement against current USBR guidance and project-specific tailwater conditions.</p>
        </section>
      </div>
      <aside className="calc-results">
        <p>LIVE RESULTS</p>
        <div className="result-hero"><span>Design spillway flow</span><strong>{n(r.flow, 3)}</strong><small>m³/s</small></div>
        <div className="check-row"><span className={valid ? "pass" : "fail"}>{valid ? "OK Inputs valid" : `! ${inputIssues.length} input issue${inputIssues.length === 1 ? "" : "s"}`}</span><span className={energyPass ? "pass" : "warn"}>{energyPass ? "OK Energy match" : "! Energy mismatch"}</span><span className={geometryWarning ? "warn" : "pass"}>{geometryWarning ? "! Geometry review" : "OK Geometry"}</span></div>
        {inputIssues.length > 0 && <div className="spillway-input-error"><strong>What needs fixing</strong><ul>{inputIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
        <h3 className="result-section-title">WEIR FLOW</h3>
        <div className="metric"><span>Design water level</span><strong>{n(r.designLevel, 3)} m</strong></div>
        <div className="metric"><span>Unit discharge</span><strong>{n(r.unitFlow, 3)} m²/s</strong></div>
        <h3 className="result-section-title">CHUTE</h3>
        <div className="metric"><span>Chute length</span><strong>{n(r.chuteLength, 2)} m</strong></div>
        <div className="metric"><span>cos theta (workbook)</span><strong>{n(r.cosTheta, 3)}</strong></div>
        <div className="metric"><span>Maximum velocity</span><strong>{n(r.velocity, 3)} m/s</strong></div>
        <div className="metric"><span>Toe depth</span><strong>{n(r.toeDepth, 3)} m</strong></div>
        <div className="metric"><span>Froude number</span><strong>{n(r.froude, 2)}</strong></div>
        <h3 className="result-section-title">ENERGY CHECK</h3>
        <div className="metric"><span>Upstream energy</span><strong>{n(r.upstreamEnergy, 3)} m</strong></div>
        <div className="metric"><span>Tailwater energy</span><strong>{n(r.downstreamEnergy, 3)} m</strong></div>
        <div className="metric"><span>Difference</span><strong>{n(r.energyDifference, 3)} m</strong></div>
        <button className="download-btn" onClick={exportCsv}>Download Export calculation CSV</button>
        <div className="cross-section spillway-diagram"><h3>SPILLWAY PROFILE</h3><svg viewBox="0 0 320 150" role="img" aria-label="Simplified spillway and stilling basin profile"><path d="M20 45 H90 V60 L205 122 H292" fill="none" stroke="#59779b" strokeWidth="4"/><path d="M20 30 H90" stroke="#4d9bc5" strokeWidth="3"/><path d="M25 35 Q38 29 51 35 T77 35" fill="none" stroke="#4d9bc5" strokeWidth="1.5"/><path d="M205 112 Q220 104 235 112 T265 112" fill="none" stroke="#4d9bc5" strokeWidth="2"/><line x1="90" y1="30" x2="90" y2="60" stroke="#b77b20" strokeDasharray="3 3"/><text x="24" y="23">Design water level</text><text x="96" y="53">Crest</text><text x="137" y="84">Chute</text><text x="212" y="140">Stilling basin</text></svg></div>
      </aside>
    </div>
  </div>;
}

