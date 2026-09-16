"use client";

import { useMemo, useState } from "react";

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

export function ThrustAtBendsTool() {
  const [internalDiameter, setInternalDiameter] = useState("2.5");
  const [density, setDensity] = useState("1000");
  const [flow, setFlow] = useState("2209.639");
  const [bendAngle, setBendAngle] = useState("66");
  const [pressure, setPressure] = useState("107.9");
  const [externalDiameter, setExternalDiameter] = useState("2.5");

  const r = useMemo(() => {
    const d = num(internalDiameter), rho = num(density), qMld = num(flow), theta = num(bendAngle), P = num(pressure), D = num(externalDiameter);
    if (![d, rho, qMld, theta, P, D].every((v) => Number.isFinite(v) && v > 0)) return null;
    const Qms = (qMld * 1000) / (24 * 3600);
    const velocity = Qms / (0.25 * Math.PI * d * d);
    const sinHalfTheta = Math.sin((theta * Math.PI) / (180 * 2));
    const momentumThrust = (2 * rho * Qms * velocity * sinHalfTheta) / 1000;
    const area = 0.25 * Math.PI * D * D;
    const pressureThrust = 2 * P * area * sinHalfTheta;
    const totalThrust = momentumThrust + pressureThrust;
    return { d, rho, Qms, theta, P, D, velocity, sinHalfTheta, momentumThrust, area, pressureThrust, totalThrust };
  }, [internalDiameter, density, flow, bendAngle, pressure, externalDiameter]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Thrust at Bend Calculation", "Value", "Unit"],
      ["Internal diameter, d", r.d, "m"], ["Density, ρ", r.rho, "kg/m3"], ["Flow, Q", r.Qms, "m3/s"], ["Bend angle, θB", r.theta, "degrees"],
      ["Velocity, V", r.velocity, "m/s"], ["Momentum thrust", r.momentumThrust, "kN"],
      ["Pressure, P", r.P, "kPa"], ["External diameter, D", r.D, "m"], ["Area, A", r.area, "m2"], ["Pressure thrust", r.pressureThrust, "kN"],
      ["Total thrust, T", r.totalThrust, "kN"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "thrust-at-bends-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">PRESSURISED PIPELINE ANCHORAGE</p>
    <h1>Thrust at Bends</h1>
    <p className="subtitle">Thrust block or anchorage design load at bends in pressure pipelines — momentum plus pressure force.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Momentum force at bend"><div className="calc-fields">
        <Field label="Internal diameter, d" value={internalDiameter} unit="m" onChange={setInternalDiameter} />
        <Field label="Density, ρ" value={density} unit="kg/m³" onChange={setDensity} />
        <Field label="Flow, Q" value={flow} unit="ML/d" onChange={setFlow} />
        <Field label="Bend angle, θB" value={bendAngle} unit="degrees" onChange={setBendAngle} />
      </div></Section>
      <Section number={2} title="Pressure force at bend"><div className="calc-fields">
        <Field label="Pressure, P" value={pressure} unit="kPa" onChange={setPressure} />
        <Field label="External diameter, D" value={externalDiameter} unit="m" hint="For RRJ pipelines, use the internal diameter of the socket" onChange={setExternalDiameter} />
      </div></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Total thrust, T</span><strong>{r ? fmt(r.totalThrust, 1) : "—"}<small>kN</small></strong></div>
      {r && <><Metric name="Flow, Q" value={fmt(r.Qms, 3) + " m³/s"} /><Metric name="Velocity, V" value={fmt(r.velocity, 3) + " m/s"} />
      <Metric name="Momentum thrust" value={fmt(r.momentumThrust, 1) + " kN"} />
      <Metric name="Pipe area, A" value={fmt(r.area, 3) + " m²"} /><Metric name="Pressure thrust" value={fmt(r.pressureThrust, 1) + " kN"} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm design pressure (including surge allowance), flow, pipe diameters and bend angle before sizing a thrust block or anchorage.</p></>}
    </aside></div>
  </div>;
}
