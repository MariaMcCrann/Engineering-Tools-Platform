"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

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

export function DrownedSluiceGateTool() {
  const [upstreamDepth, setUpstreamDepth] = useState("1.61");
  const [downstreamDepth, setDownstreamDepth] = useState("1.4");
  const [gateOpening, setGateOpening] = useState("0.52");
  const [gateWidth, setGateWidth] = useState("0.8");
  const [designFlow, setDesignFlow] = useState("0.49");
  const [coefficient, setCoefficient] = useState("0.21");

  const r = useMemo(() => {
    const H1 = num(upstreamDepth), DN = num(downstreamDepth), Y = num(gateOpening), b = num(gateWidth), QD = num(designFlow), C = num(coefficient);
    if (![H1, DN, Y, b, QD, C].every((v) => Number.isFinite(v) && v > 0)) return null;
    const velocity = QD / (b * Y);
    const froude = velocity / Math.sqrt(g * Y);
    const dnOverY = DN / Y;
    const capacity = C * b * Y * Math.sqrt(2 * g * H1);
    const capacityOk = capacity >= QD;
    return { H1, DN, Y, b, QD, C, velocity, froude, dnOverY, capacity, capacityOk };
  }, [upstreamDepth, downstreamDepth, gateOpening, gateWidth, designFlow, coefficient]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Drowned Sluice Gate Calculation", "Value", "Unit"],
      ["Upstream depth, H1", r.H1, "m"], ["Downstream depth, DN", r.DN, "m"], ["Gate opening, Y", r.Y, "m"],
      ["Width of sluice gate, b", r.b, "m"], ["Design flow rate, QD", r.QD, "m3/s"], ["Discharge coefficient, C (Fig 9.13)", r.C, ""],
      ["Velocity through gate, V", r.velocity, "m/s"], ["Froude number, F", r.froude, ""], ["DN/Y", r.dnOverY, ""],
      ["Calculated flow rate, QC", r.capacity, "m3/s"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "drowned-sluice-gate-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">DROWNED OUTLET STRUCTURE</p>
    <h1>Drowned Sluice Gate</h1>
    <p className="subtitle">Discharge rate through a drowned sluice gate for free flow. Refer Hamill, Understanding Hydraulics, Fig 9.13; Ven Te Chow, Open Channel Hydraulics, Fig 17-38.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Gate and water levels"><div className="calc-fields">
        <Field label="Upstream depth, H1" value={upstreamDepth} unit="m" hint="Use the upstream head (H1 + V1²/2g)" onChange={setUpstreamDepth} />
        <Field label="Downstream depth, DN" value={downstreamDepth} unit="m" hint="Guess DN, adjust downstream weir to suit" onChange={setDownstreamDepth} />
        <Field label="Gate opening, Y" value={gateOpening} unit="m" onChange={setGateOpening} />
        <Field label="Width of sluice gate, b" value={gateWidth} unit="m" onChange={setGateWidth} />
      </div></Section>
      <Section number={2} title="Design flow and discharge coefficient"><div className="calc-fields">
        <Field label="Design flow rate, QD" value={designFlow} unit="m³/s" onChange={setDesignFlow} />
        <Field label="Discharge coefficient, C" value={coefficient} hint="Read from Fig 9.13 against DN/Y — often much less than 0.6" onChange={setCoefficient} />
      </div>
      <p className="engine-note">Notes from the source workbook: this is not treated as an orifice, as the underside of the gate is supported. Fig 9.13 covers free flow only — check the flow condition is not drowned before adopting C.</p></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Calculated flow rate, QC</span><strong>{r ? fmt(r.capacity, 3) : "—"}<small>m³/s</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.capacityOk ? "pass" : "fail"}>{r.capacityOk ? "✓ QC meets design flow QD" : "✕ QC below design flow QD"}</span>
      </div>
      <Metric name="Velocity through gate, V" value={fmt(r.velocity, 3) + " m/s"} /><Metric name="Froude number, F" value={fmt(r.froude, 3)} /><Metric name="DN/Y" value={fmt(r.dnOverY, 3)} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm the gate discharge coefficient against the applicable figure/reference for the actual gate geometry and flow condition before issue.</p></>}
    </aside></div>
  </div>;
}
