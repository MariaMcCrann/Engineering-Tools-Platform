"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field"><span>{label}</span>{hint && <small>{hint}</small>}<input type="number" min="0" step="any" value={value} onChange={e => onChange(e.target.value)} />{unit && <i>{unit}</i>}</label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}
function frictionFactor(re: number, roughnessMm: number, diameterM: number) {
  if (!(re > 0 && diameterM > 0)) return NaN;
  if (re < 2300) return 64 / re;
  let f = 0.02;
  for (let i = 0; i < 40; i++) {
    const next = 1 / Math.pow(-2 * Math.log10(roughnessMm / (3.7 * diameterM * 1000) + 2.51 / (re * Math.sqrt(f))), 2);
    if (Math.abs(next - f) < 1e-10) return next;
    f = next;
  }
  return f;
}

export function RisingMainTool() {
  const [length, setLength] = useState("20");
  const [staticHead, setStaticHead] = useState("5");
  const [flow, setFlow] = useState("30");
  const [diameter, setDiameter] = useState("142.7");
  const [roughness, setRoughness] = useState("0.015");
  const [viscosity, setViscosity] = useState("0.00000101");
  const [b45, setB45] = useState("2");
  const [b90, setB90] = useState("2");
  const [gate, setGate] = useState("0");
  const [reflux, setReflux] = useState("0");
  const [air, setAir] = useState("0");
  const [density, setDensity] = useState("1000");
  const [bulk, setBulk] = useState("2050000000");
  const [wall, setWall] = useState("3.2");
  const [modulus, setModulus] = useState("165000000");
  const [pn, setPn] = useState("6");
  const [bearing, setBearing] = useState("20");
  const [sumpDiameter, setSumpDiameter] = useState("2.1");
  const [sumpDepth, setSumpDepth] = useState("2.7");
  const [inflow, setInflow] = useState("61");
  const [pumpRate, setPumpRate] = useState("30");

  const r = useMemo(() => {
    const values = [length, staticHead, flow, diameter, roughness, viscosity, b45, b90, gate, reflux, air, density, bulk, wall, modulus, pn, bearing, sumpDiameter, sumpDepth, inflow, pumpRate].map(num);
    if (values.some(v => !Number.isFinite(v) || v < 0) || num(diameter) <= 0 || num(viscosity) <= 0 || num(bulk) <= 0 || num(wall) <= 0 || num(modulus) <= 0 || num(bearing) <= 0) return null;
    const d = num(diameter) / 1000;
    const q = num(flow) / 1000;
    const area = Math.PI * d * d / 4;
    const velocity = q / area;
    const re = velocity * d / num(viscosity);
    const f = frictionFactor(re, num(roughness), d);
    const velocityHead = velocity * velocity / (2 * g);
    const friction = f * num(length) / d * velocityHead;
    const bends = (0.2 * num(b45) + 0.5 * num(b90)) * velocityHead;
    const valves = (0.2 * num(gate) + 2.5 * num(reflux) + 0 * num(air)) * velocityHead;
    const pit = 2.3 * velocityHead;
    const form = bends + valves + pit;
    const totalHead = num(staticHead) + velocityHead + friction + form;
    const waveSpeed = 1 / Math.sqrt(num(density) * (1 / num(bulk) + num(diameter) / (num(modulus) * num(wall))));
    const surgeRise = waveSpeed * velocity / g;
    const surgeHead = totalHead + surgeRise;
    const surgeTime = 2 * num(length) / waveSpeed;
    const allowablePressure = num(pn) / 10;
    const surgePressure = surgeHead / 100;
    const safetyFactor = allowablePressure / surgePressure;
    const thrustArea = Math.PI * d * d / 4;
    const thrust = (angle: number) => 1000 * thrustArea * surgePressure * 2 * Math.sin(angle * Math.PI / 360);
    const endThrust = 1000 * thrustArea * surgePressure;
    const thrust45 = thrust(45), thrust90 = thrust(90);
    const block45 = thrust45 / num(bearing), block90 = thrust90 / num(bearing), blockEnd = endThrust / num(bearing);
    const sumpArea = Math.PI * num(sumpDiameter) * num(sumpDiameter) / 4;
    const sumpVolume = sumpArea * num(sumpDepth);
    const fillTime = sumpVolume / (num(inflow) / 1000);
    const emptyTime = sumpVolume / (num(pumpRate) / 1000);
    const cycleTime = fillTime + emptyTime;
    const starts = 3600 / cycleTime;
    return { area, velocity, re, f, velocityHead, friction, bends, valves, pit, form, totalHead, waveSpeed, surgeRise, surgeHead, surgeTime, allowablePressure, surgePressure, safetyFactor, thrust45, thrust90, endThrust, block45, block90, blockEnd, sumpArea, sumpVolume, fillTime, emptyTime, cycleTime, starts };
  }, [length, staticHead, flow, diameter, roughness, viscosity, b45, b90, gate, reflux, air, density, bulk, wall, modulus, pn, bearing, sumpDiameter, sumpDepth, inflow, pumpRate]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Rising Main Calculation", "Value", "Unit"],
      ["Flow velocity", r.velocity, "m/s"], ["Reynolds number", r.re, ""], ["Colebrook friction factor", r.f, ""],
      ["Friction loss", r.friction, "m"], ["Form losses", r.form, "m"], ["Total dynamic head", r.totalHead, "m"],
      ["Wave speed", r.waveSpeed, "m/s"], ["Surge head", r.surgeHead, "m"], ["Surge safety factor", r.safetyFactor, ""],
      ["45 degree thrust", r.thrust45, "kN"], ["90 degree thrust", r.thrust90, "kN"], ["End thrust", r.endThrust, "kN"],
      ["45 degree block bearing area", r.block45, "m2"], ["90 degree block bearing area", r.block90, "m2"], ["End block bearing area", r.blockEnd, "m2"],
      ["Sump working volume", r.sumpVolume, "m3"], ["Pump starts", r.starts, "per hour"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(row => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "rising-main-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">PRESSURISED PIPE HYDRAULICS</p>
    <h1>Rising Main</h1>
    <p className="subtitle">Hydraulic losses, surge pressure, thrust blocks and pump-sump cycling based on the supplied calculation workbook.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Rising main geometry and duty"><div className="calc-fields">
        <Field label="Rising main length" value={length} unit="m" onChange={setLength}/><Field label="Static head" value={staticHead} unit="m" onChange={setStaticHead}/>
        <Field label="Pumping rate" value={flow} unit="L/s" onChange={setFlow}/><Field label="Internal diameter" value={diameter} unit="mm" onChange={setDiameter}/>
        <Field label="Colebrook roughness, k" value={roughness} unit="mm" onChange={setRoughness}/><Field label="Kinematic viscosity" value={viscosity} unit="m²/s" onChange={setViscosity}/>
      </div></Section>
      <Section number={2} title="Fittings and form losses"><div className="calc-fields">
        <Field label="45° bends" value={b45} unit="no." hint="K = 0.2 each" onChange={setB45}/><Field label="90° bends" value={b90} unit="no." hint="K = 0.5 each" onChange={setB90}/>
        <Field label="Gate valves" value={gate} unit="no." hint="K = 0.2 each" onChange={setGate}/><Field label="Reflux valves" value={reflux} unit="no." hint="K = 2.5 each" onChange={setReflux}/>
        <Field label="Air valves" value={air} unit="no." hint="K = 0 in source workbook" onChange={setAir}/>
      </div></Section>
      <Section number={3} title="Surge and pipe properties"><div className="calc-fields">
        <Field label="Water density" value={density} unit="kg/m³" onChange={setDensity}/><Field label="Water bulk modulus" value={bulk} unit="Pa" onChange={setBulk}/>
        <Field label="Pipe wall thickness" value={wall} unit="mm" onChange={setWall}/><Field label="Pipe elastic modulus" value={modulus} unit="Pa" onChange={setModulus}/>
        <Field label="Pipe pressure class" value={pn} unit="PN" onChange={setPn}/>
      </div></Section>
      <Section number={4} title="Thrust block design"><div className="calc-fields"><Field label="Allowable soil bearing pressure" value={bearing} unit="kN/m²" onChange={setBearing}/></div></Section>
      <Section number={5} title="Pump sump cycling"><div className="calc-fields">
        <Field label="Sump diameter" value={sumpDiameter} unit="m" onChange={setSumpDiameter}/><Field label="Working depth" value={sumpDepth} unit="m" onChange={setSumpDepth}/>
        <Field label="Sump inflow" value={inflow} unit="L/s" onChange={setInflow}/><Field label="Pump rate" value={pumpRate} unit="L/s" onChange={setPumpRate}/>
      </div><p className="engine-note">Cycle timing follows the supplied workbook: fill time plus volume divided by pump rate. It does not subtract continuing inflow during pump operation.</p></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Total dynamic head</span><strong>{r ? fmt(r.totalHead) : "—"}<small>m</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.velocity >= 1 && r.velocity <= 2 ? "pass" : "warn"}>{r.velocity >= 1 && r.velocity <= 2 ? "✓ Velocity 1–2 m/s" : "! Review pipe diameter"}</span>
        <span className={r.safetyFactor > 2 ? "pass" : "fail"}>{r.safetyFactor > 2 ? "✓ Surge SF > 2" : "✕ Surge SF ≤ 2"}</span>
        <span className={r.starts < 8 ? "pass" : "fail"}>{r.starts < 8 ? "✓ Pump starts < 8/h" : "✕ Increase sump volume"}</span>
      </div>
      <h3 className="result-section-title">Hydraulics</h3>
      <Metric name="Velocity" value={fmt(r.velocity) + " m/s"}/><Metric name="Reynolds number" value={fmt(r.re, 0)}/><Metric name="Friction factor" value={fmt(r.f, 4)}/><Metric name="Friction loss" value={fmt(r.friction) + " m"}/><Metric name="Form losses" value={fmt(r.form) + " m"}/>
      <h3 className="result-section-title">Surge</h3>
      <Metric name="Wave speed" value={fmt(r.waveSpeed, 2) + " m/s"}/><Metric name="Surge rise" value={fmt(r.surgeRise, 2) + " m"}/><Metric name="Surge head" value={fmt(r.surgeHead, 2) + " m"}/><Metric name="Surge pressure" value={fmt(r.surgePressure, 3) + " MPa"}/><Metric name="Safety factor" value={fmt(r.safetyFactor, 2)}/>
      <h3 className="result-section-title">Thrust blocks</h3>
      <Metric name="45° thrust / area" value={fmt(r.thrust45) + " kN / " + fmt(r.block45, 2) + " m²"}/><Metric name="90° thrust / area" value={fmt(r.thrust90) + " kN / " + fmt(r.block90, 2) + " m²"}/><Metric name="End thrust / area" value={fmt(r.endThrust) + " kN / " + fmt(r.blockEnd, 2) + " m²"}/>
      <h3 className="result-section-title">Sump</h3>
      <Metric name="Working volume" value={fmt(r.sumpVolume) + " m³"}/><Metric name="Fill / empty time" value={fmt(r.fillTime, 1) + " s / " + fmt(r.emptyTime, 1) + " s"}/><Metric name="Pump starts" value={fmt(r.starts, 2) + " per hour"}/>
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm pipe properties, fitting loss coefficients, transient assumptions, pressure class and geotechnical bearing capacity before issue.</p></>}
    </aside></div>
  </div>;
}
