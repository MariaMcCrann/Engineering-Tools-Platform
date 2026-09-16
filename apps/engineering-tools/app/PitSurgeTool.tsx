"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const kinematicViscosity = 1.005e-6; // m2/s, water ~20degC
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

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
function frictionHeadLoss(pipeLength: number, diameterM: number, roughnessMm: number, flowLps: number) {
  const area = (Math.PI / 4) * diameterM * diameterM;
  const velocity = flowLps / 1000 / area;
  if (!Number.isFinite(velocity) || velocity <= 0) return 0;
  const re = (velocity * diameterM) / kinematicViscosity;
  const f = frictionFactor(re, roughnessMm, diameterM);
  return f * (pipeLength / diameterM) * ((velocity * velocity) / (2 * g));
}

type Step = { t: number; inflow: number; outflow: number; level: number; velocity: number; flowRate: number };

function simulate(pumpInflow: number, pitLength: number, pitWidth: number, pipeLength: number, diameterMm: number, roughnessMm: number, lossCoeff: number, timeStep: number, durationS: number): Step[] {
  const diameterM = diameterMm / 1000;
  const area = (Math.PI / 4) * diameterM * diameterM;
  const pitArea = pitLength * pitWidth;
  const steps = Math.max(1, Math.round(durationS / timeStep));
  const series: Step[] = [{ t: 0, inflow: 0, outflow: 0, level: 0, velocity: 0, flowRate: 0 }];
  let frictionLoss = 0, entryExitLoss = 0;
  for (let n = 1; n <= steps; n++) {
    const prev = series[n - 1];
    const inflow = pumpInflow;
    const outflow = prev.flowRate;
    const level = prev.level + ((inflow - outflow) / 1000) / pitArea;
    const drivingHead = level - frictionLoss - entryExitLoss;
    const accel = (drivingHead * g) / pipeLength;
    const velocity = prev.velocity + accel * timeStep;
    const flowRate = velocity * area * 1000;
    frictionLoss = frictionHeadLoss(pipeLength, diameterM, roughnessMm, flowRate);
    entryExitLoss = (lossCoeff * velocity * velocity) / (2 * g);
    series.push({ t: n * timeStep, inflow, outflow, level, velocity, flowRate });
  }
  return series;
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

export function PitSurgeTool() {
  const [pumpInflow, setPumpInflow] = useState("200");
  const [pitLength, setPitLength] = useState("2");
  const [pitWidth, setPitWidth] = useState("1");
  const [pipeLength, setPipeLength] = useState("100");
  const [diameter, setDiameter] = useState("375");
  const [roughness, setRoughness] = useState("1.5");
  const [lossCoeff, setLossCoeff] = useState("1.5");
  const [timeStep, setTimeStep] = useState("1");
  const [duration, setDuration] = useState("600");

  const r = useMemo(() => {
    const Q = num(pumpInflow), pl = num(pitLength), pw = num(pitWidth), L = num(pipeLength), D = num(diameter), ks = num(roughness), k = num(lossCoeff), T = num(timeStep), dur = num(duration);
    if (![Q, pl, pw, L, D, ks, k, T, dur].every((v) => Number.isFinite(v) && v > 0)) return null;
    const series = simulate(Q, pl, pw, L, D, ks, k, T, dur);
    const peak = series.reduce((a, b) => (b.level > a.level ? b : a), series[0]);
    const final = series[series.length - 1];
    let stabiliseAt: number | null = null;
    for (let i = 20; i < series.length; i++) {
      if (Math.abs(series[i].level - series[i - 10].level) < 0.0005) { stabiliseAt = series[i].t; break; }
    }
    const sampleEvery = Math.max(1, Math.floor(series.length / 40));
    const sampled = series.filter((_, i) => i % sampleEvery === 0);
    return { series, peak, final, stabiliseAt, sampled };
  }, [pumpInflow, pitLength, pitWidth, pipeLength, diameter, roughness, lossCoeff, timeStep, duration]);

  const exportCsv = () => {
    if (!r) return;
    const header = ["Elapsed time (s)", "Pit inflow (L/s)", "Pit outflow (L/s)", "Water level (m)", "Pipe velocity (m/s)", "Flow rate (L/s)"];
    const rows = r.series.map((s) => [s.t, s.inflow, s.outflow, s.level, s.velocity, s.flowRate]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "pit-surge-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const maxLevel = r ? Math.max(...r.sampled.map((s) => s.level), 0.001) : 1;

  return <div className="content calc-content">
    <p className="eyebrow">TRANSIENT PIT / SIPHON RESPONSE</p>
    <h1>Pit Surge on Receiving Pumped Flow</h1>
    <p className="subtitle">Water level at the end of a siphon after pump inflow into a rectangular pit — time-stepped mass and momentum balance.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Inlet pit"><div className="calc-fields">
        <Field label="Pit length" value={pitLength} unit="m" onChange={setPitLength} />
        <Field label="Pit width" value={pitWidth} unit="m" onChange={setPitWidth} />
        <Field label="Pump inflow" value={pumpInflow} unit="L/s" hint="Constant step inflow, applied from t = 0" onChange={setPumpInflow} />
      </div></Section>
      <Section number={2} title="Outlet pipeline"><div className="calc-fields">
        <Field label="Pipe length" value={pipeLength} unit="m" onChange={setPipeLength} />
        <Field label="Pipe diameter" value={diameter} unit="mm" onChange={setDiameter} />
        <Field label="Colebrook-White roughness, ks" value={roughness} unit="mm" onChange={setRoughness} />
        <Field label="Entrance and exit loss coefficient, k" value={lossCoeff} onChange={setLossCoeff} />
      </div></Section>
      <Section number={3} title="Simulation settings"><div className="calc-fields">
        <Field label="Time interval" value={timeStep} unit="s" onChange={setTimeStep} />
        <Field label="Simulation duration" value={duration} unit="s" onChange={setDuration} />
      </div>
      <p className="engine-note">Modelled as an accelerating water column (F = ma) driven by the pit water level less the previous step&apos;s friction and entrance/exit losses, with friction computed from the Colebrook–White equation each step.</p></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Peak pit water level</span><strong>{r ? fmt(r.peak.level, 3) : "—"}<small>m at t = {r ? fmt(r.peak.t, 0) : "—"}s</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.stabiliseAt !== null ? "pass" : "warn"}>{r.stabiliseAt !== null ? `✓ Level stabilises by t ≈ ${fmt(r.stabiliseAt, 0)}s` : "! Level has not stabilised within the simulated duration"}</span>
      </div>
      <Metric name="Final water level" value={fmt(r.final.level, 3) + " m at t = " + fmt(r.final.t, 0) + "s"} />
      <Metric name="Final outflow" value={fmt(r.final.flowRate, 2) + " L/s"} />
      <Metric name="Final pipe velocity" value={fmt(r.final.velocity, 3) + " m/s"} />
      <div className="gsdm-mini-chart">{r.sampled.map((s) => <div key={s.t}><span>{fmt(s.t, 0)}s</span><i><b style={{ width: (Math.max(0, s.level) / maxLevel * 100) + "%" }}></b></i><strong>{fmt(s.level, 2)}</strong></div>)}</div>
      <button className="download-btn" onClick={exportCsv}>↓ Export full time-series CSV</button>
      <p className="engine-note">Preliminary design aid only. Friction loss uses the Colebrook–White equation with default water properties (20°C) — confirm against the source workbook for critical designs, and check the outlet condition is not drowned.</p></>}
    </aside></div>
  </div>;
}
