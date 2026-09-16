"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

const TEMP_C = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const KINEMATIC_VISCOSITY_UM2S = [1.787, 1.519, 1.307, 1.004, 0.801, 0.658, 0.553, 0.475, 0.413, 0.365, 0.326, 0.294];
const VAPOUR_PRESSURE_KPA = [0.6105, 0.8722, 1.228, 2.338, 4.243, 7.376, 12.33, 19.92, 31.16, 47.34, 70.1, 101.3];

function interp(x: number, breaks: number[], values: number[]) {
  const clamped = Math.max(breaks[0], Math.min(breaks[breaks.length - 1], x));
  let i = breaks.findIndex((v) => v >= clamped);
  if (i <= 0) i = 1;
  const x0 = breaks[i - 1], x1 = breaks[i], y0 = values[i - 1], y1 = values[i];
  const t = x1 === x0 ? 0 : (clamped - x0) / (x1 - x0);
  return y0 + (y1 - y0) * t;
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
function frictionHeadLoss(pipeLength: number, diameterMm: number, roughnessMm: number, flowLps: number, kinematicViscosityM2s: number) {
  const diameterM = diameterMm / 1000;
  const area = (Math.PI / 4) * diameterM * diameterM;
  const velocity = flowLps / 1000 / area;
  if (!Number.isFinite(velocity) || velocity <= 0) return 0;
  const re = (velocity * diameterM) / kinematicViscosityM2s;
  const f = frictionFactor(re, roughnessMm, diameterM);
  return f * (pipeLength / diameterM) * ((velocity * velocity) / (2 * g));
}
function velocityHead(diameterMm: number, flowLps: number) {
  const diameterM = diameterMm / 1000;
  const area = (Math.PI / 4) * diameterM * diameterM;
  const velocity = flowLps / 1000 / area;
  return (velocity * velocity) / (2 * g);
}

type PumpPoint = { flow: string; head: string };
const DEFAULT_PUMP_CURVE: PumpPoint[] = [
  { flow: "0", head: "60" }, { flow: "10", head: "59.93" }, { flow: "20", head: "59.67" }, { flow: "30", head: "59.07" },
  { flow: "40", head: "58.0" }, { flow: "50", head: "56.33" }, { flow: "60", head: "53.93" }, { flow: "70", head: "50.67" },
  { flow: "80", head: "46.4" }, { flow: "90", head: "41" }, { flow: "100", head: "34.33" }, { flow: "110", head: "26.27" }, { flow: "120", head: "16.67" }
];

function interpolateSeries(x: number, points: { flow: number; head: number }[]) {
  if (x <= points[0].flow) return points[0].head;
  if (x >= points[points.length - 1].flow) return points[points.length - 1].head;
  for (let i = 1; i < points.length; i++) {
    if (points[i].flow >= x) {
      const p0 = points[i - 1], p1 = points[i];
      const t = (x - p0.flow) / (p1.flow - p0.flow);
      return p0.head + (p1.head - p0.head) * t;
    }
  }
  return points[points.length - 1].head;
}
// bisection to find flow where pumpHead(Q) - systemHead(Q) = 0
function findIntersection(pumpHead: (q: number) => number, systemHead: (q: number) => number, qMax: number) {
  const diff = (q: number) => pumpHead(q) - systemHead(q);
  const n = 400;
  let prevQ = 0, prevD = diff(0);
  for (let i = 1; i <= n; i++) {
    const q = (qMax * i) / n;
    const d = diff(q);
    if (prevD === 0) return prevQ;
    if ((prevD > 0 && d <= 0) || (prevD < 0 && d >= 0)) {
      const t = prevD / (prevD - d);
      return prevQ + t * (q - prevQ);
    }
    prevQ = q; prevD = d;
  }
  return null;
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field">
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

type CurveSample = { q: number; sysMax: number; sysMin: number; pump: number; power: number };
function PumpCurveChart({ samples, dutyMax, dutyMin }: { samples: CurveSample[]; dutyMax: { q: number; h: number } | null; dutyMin: { q: number; h: number } | null }) {
  if (!samples.length) return null;
  const w = 620, h = 320, left = 55, right = 565, top = 20, bottom = 265;
  const qMax = Math.max(...samples.map((s) => s.q)) * 1.05;
  const headMax = Math.ceil(Math.max(...samples.map((s) => Math.max(s.sysMax, s.sysMin, s.pump))) / 10) * 10 + 10;
  const powerMax = Math.ceil(Math.max(...samples.map((s) => s.power), 1) / 5) * 5 + 5;
  const x = (q: number) => left + (q / qMax) * (right - left);
  const yHead = (v: number) => bottom - (v / headMax) * (bottom - top);
  const yPower = (v: number) => bottom - (v / powerMax) * (bottom - top);
  const path = (values: number[], scaleY: (v: number) => number) => samples.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.q)} ${scaleY(values[i])}`).join(" ");
  const gridlinesY = [0, 0.25, 0.5, 0.75, 1].map((f) => top + f * (bottom - top));

  return <div className="cross-section pump-curve-chart">
    <h3>SYSTEM AND PUMP CURVES</h3>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="System and pump curves chart, head versus flow rate, with power on a secondary axis">
      {gridlinesY.map((gy) => <line key={gy} x1={left} y1={gy} x2={right} y2={gy} stroke="#e2e8f0" strokeWidth="1" />)}
      <line x1={left} y1={top} x2={left} y2={bottom} stroke="#34495e" strokeWidth="1.5" />
      <line x1={right} y1={top} x2={right} y2={bottom} stroke="#34495e" strokeWidth="1.5" />
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#34495e" strokeWidth="1.5" />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={"hl" + f} x={left - 8} y={bottom - f * (bottom - top) + 4} fontSize="10" textAnchor="end" fill="#34495e">{Math.round(f * headMax)}</text>)}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <text key={"pl" + f} x={right + 8} y={bottom - f * (bottom - top) + 4} fontSize="10" fill="#2f7d4f">{Math.round(f * powerMax)}</text>)}
      {samples.filter((_, i) => i % 2 === 0).map((s) => <text key={s.q} x={x(s.q)} y={bottom + 16} fontSize="10" textAnchor="middle" fill="#34495e">{s.q}</text>)}
      <text x={(left + right) / 2} y={bottom + 32} fontSize="11" textAnchor="middle" fill="#24364d">Flow rate (L/s)</text>
      <text x={left - 40} y={top - 6} fontSize="10" fill="#24364d">Head (m)</text>
      <text x={right - 20} y={top - 6} fontSize="10" fill="#2f7d4f">Power (kW)</text>
      <path d={path(samples.map((s) => s.sysMax), yHead)} fill="none" stroke="#b91c1c" strokeWidth="2" />
      <path d={path(samples.map((s) => s.sysMin), yHead)} fill="none" stroke="#2786c2" strokeWidth="2" />
      <path d={path(samples.map((s) => s.pump), yHead)} fill="none" stroke="#7c3aed" strokeWidth="2.5" />
      <path d={path(samples.map((s) => s.power), yPower)} fill="none" stroke="#2f7d4f" strokeWidth="2" />
      {dutyMax && <><circle cx={x(dutyMax.q)} cy={yHead(dutyMax.h)} r="4" fill="#7c3aed" /><text x={x(dutyMax.q) + 8} y={yHead(dutyMax.h) - 8} fontSize="10" fill="#7c3aed">{fmt(dutyMax.q, 0)} L/s, {fmt(dutyMax.h, 0)} m</text></>}
      {dutyMin && <><circle cx={x(dutyMin.q)} cy={yHead(dutyMin.h)} r="4" fill="#7c3aed" /><text x={x(dutyMin.q) + 8} y={yHead(dutyMin.h) - 8} fontSize="10" fill="#7c3aed">{fmt(dutyMin.q, 0)} L/s, {fmt(dutyMin.h, 0)} m</text></>}
    </svg>
    <div className="chart-legend">
      <span><i style={{ background: "#7c3aed" }} /> Pump curve</span>
      <span><i style={{ background: "#b91c1c" }} /> Max system curve</span>
      <span><i style={{ background: "#2786c2" }} /> Min system curve</span>
      <span><i style={{ background: "#2f7d4f" }} /> Power</span>
    </div>
  </div>;
}

export function PumpDutyPointTool() {
  const [diameter, setDiameter] = useState("288.8");
  const [length, setLength] = useState("2835");
  const [bend90, setBend90] = useState("15");
  const [bend45, setBend45] = useState("4");
  const [gateValves, setGateValves] = useState("0");
  const [airValves, setAirValves] = useState("35");
  const [reducers, setReducers] = useState("0");

  const [suctionMin, setSuctionMin] = useState("5.78");
  const [suctionMax, setSuctionMax] = useState("6.58");
  const [dischargeMin, setDischargeMin] = useState("8.4");
  const [dischargeMax, setDischargeMax] = useState("15");

  const [roughnessMin, setRoughnessMin] = useState("0.03");
  const [roughnessMax, setRoughnessMax] = useState("0.5");
  const [tempMin, setTempMin] = useState("30");
  const [tempMax, setTempMax] = useState("15");

  const [pumpsParallel, setPumpsParallel] = useState("1");
  const [pumpsSeries, setPumpsSeries] = useState("1");
  const [maxSpeed, setMaxSpeed] = useState("50");
  const [speed, setSpeed] = useState("45");
  const [pumpCurve, setPumpCurve] = useState<PumpPoint[]>(DEFAULT_PUMP_CURVE);

  const [density, setDensity] = useState("1000");
  const [pumpEfficiency, setPumpEfficiency] = useState("0.8");
  const [motorEfficiency, setMotorEfficiency] = useState("0.92");
  const [vsdEfficiency, setVsdEfficiency] = useState("0.95");

  const [suctionDiameter, setSuctionDiameter] = useState("288.8");
  const [suctionLength, setSuctionLength] = useState("5");
  const [sEntrance, setSEntrance] = useState("1");
  const [sBend90, setSBend90] = useState("2");
  const [sBend45, setSBend45] = useState("0");
  const [sValve, setSValve] = useState("1");
  const [sAirValve, setSAirValve] = useState("0");
  const [sReducer, setSReducer] = useState("0");
  const [sExit, setSExit] = useState("0");

  const r = useMemo(() => {
    const D = num(diameter), L = num(length), n90 = num(bend90), n45 = num(bend45), nGate = num(gateValves), nAir = num(airValves), nRed = num(reducers);
    const sucMin = num(suctionMin), sucMax = num(suctionMax), disMin = num(dischargeMin), disMax = num(dischargeMax);
    const ksMin = num(roughnessMin), ksMax = num(roughnessMax), tMin = num(tempMin), tMax = num(tempMax);
    const nPar = num(pumpsParallel), nSer = num(pumpsSeries), spdMax = num(maxSpeed), spd = num(speed);
    const rho = num(density), effPump = num(pumpEfficiency), effMotor = num(motorEfficiency), effVsd = num(vsdEfficiency);
    const sD = num(suctionDiameter), sL = num(suctionLength), sEnt = num(sEntrance), sB90 = num(sBend90), sB45 = num(sBend45), sVal = num(sValve), sAir = num(sAirValve), sRed = num(sReducer), sExt = num(sExit);
    const points = pumpCurve.map((p) => ({ flow: num(p.flow), head: num(p.head) }));

    const inputs = [D, L, n90, n45, nGate, nAir, nRed, sucMin, sucMax, disMin, disMax, ksMin, ksMax, tMin, tMax, nPar, nSer, spdMax, spd, rho, effPump, effMotor, effVsd, sD, sL, sEnt, sB90, sB45, sVal, sAir, sRed, sExt];
    if (!inputs.every((v) => Number.isFinite(v)) || D <= 0 || L <= 0 || spdMax <= 0 || points.length < 2 || points.some((p) => !Number.isFinite(p.flow) || !Number.isFinite(p.head))) return null;

    const sumK = 0.5 * 1 + 1.2 * n90 + 0.35 * n45 + 0.5 * nGate + 0.04 * nAir + 0.7 * nRed + 1 * 1;
    const staticHeadMin = disMin - sucMax;
    const staticHeadMax = disMax - sucMin;
    const viscosityMin = interp(tMin, TEMP_C, KINEMATIC_VISCOSITY_UM2S) * 1e-6;
    const viscosityMax = interp(tMax, TEMP_C, KINEMATIC_VISCOSITY_UM2S) * 1e-6;

    const systemHeadMax = (q: number) => staticHeadMax + frictionHeadLoss(L, D, ksMax, q, viscosityMax) + sumK * velocityHead(D, q);
    const systemHeadMin = (q: number) => staticHeadMin + frictionHeadLoss(L, D, ksMin, q, viscosityMin) + sumK * velocityHead(D, q);

    const speedRatio = spd / spdMax;
    const pumpHead = (qScaled: number) => {
      const qNative = qScaled / (speedRatio * nPar);
      return interpolateSeries(qNative, points) * speedRatio * speedRatio * nSer;
    };
    const qMaxRange = Math.max(...points.map((p) => p.flow)) * speedRatio * nPar * 1.2;

    const dutyFlowMaxCase = findIntersection(pumpHead, systemHeadMax, qMaxRange);
    const dutyFlowMinCase = findIntersection(pumpHead, systemHeadMin, qMaxRange);

    const power = (q: number, h: number) => (rho * g * h * q) / 1000 / effPump / effMotor / effVsd / 1000;

    const sumKSuction = 0.5 * sEnt + 1.2 * sB90 + 0.35 * sB45 + 0.5 * sVal + 0.04 * sAir + 0.7 * sRed + 1 * sExt;
    const vapourPressureM = (interp(tMax, TEMP_C, VAPOUR_PRESSURE_KPA) * 1000) / 9.8 / rho;
    const atmPressureM = (101.3 * 1000) / 9.8 / rho;
    const npsha = (q: number) => atmPressureM + staticHeadMin - vapourPressureM - frictionHeadLoss(sL, sD, ksMax, q, viscosityMax) - sumKSuction * velocityHead(sD, q);

    const curveSamples = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map((q) => {
      const pumpH = pumpHead(q);
      return { q, sysMax: systemHeadMax(q), sysMin: systemHeadMin(q), pump: pumpH, power: power(q, pumpH) };
    });

    return {
      sumK, staticHeadMin, staticHeadMax, viscosityMin, viscosityMax, speedRatio,
      dutyFlowMaxCase, dutyHeadMaxCase: dutyFlowMaxCase !== null ? pumpHead(dutyFlowMaxCase) : null,
      dutyFlowMinCase, dutyHeadMinCase: dutyFlowMinCase !== null ? pumpHead(dutyFlowMinCase) : null,
      powerMaxCase: dutyFlowMaxCase !== null ? power(dutyFlowMaxCase, pumpHead(dutyFlowMaxCase)) : null,
      powerMinCase: dutyFlowMinCase !== null ? power(dutyFlowMinCase, pumpHead(dutyFlowMinCase)) : null,
      npshaMaxCase: dutyFlowMaxCase !== null ? npsha(dutyFlowMaxCase) : null,
      npshaMinCase: dutyFlowMinCase !== null ? npsha(dutyFlowMinCase) : null,
      curveSamples
    };
  }, [
    diameter, length, bend90, bend45, gateValves, airValves, reducers, suctionMin, suctionMax, dischargeMin, dischargeMax,
    roughnessMin, roughnessMax, tempMin, tempMax, pumpsParallel, pumpsSeries, maxSpeed, speed, pumpCurve,
    density, pumpEfficiency, motorEfficiency, vsdEfficiency, suctionDiameter, suctionLength, sEntrance, sBend90, sBend45, sValve, sAirValve, sReducer, sExit
  ]);

  const updatePumpPoint = (i: number, field: "flow" | "head", value: string) => {
    setPumpCurve((curr) => curr.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  };

  const exportCsv = () => {
    if (!r) return;
    const rows: (string | number | null)[][] = [
      ["Rising Main Pump Duty Point Calculation", "Value", "Unit"],
      ["Sum of fitting loss factors, ΣK", r.sumK, ""], ["Static head, min", r.staticHeadMin, "m"], ["Static head, max", r.staticHeadMax, "m"],
      ["Duty point (max system curve) — flow", r.dutyFlowMaxCase, "L/s"], ["Duty point (max system curve) — head", r.dutyHeadMaxCase, "m"],
      ["Duty point (min system curve) — flow", r.dutyFlowMinCase, "L/s"], ["Duty point (min system curve) — head", r.dutyHeadMinCase, "m"],
      ["Power (max system curve)", r.powerMaxCase, "kW"], ["Power (min system curve)", r.powerMinCase, "kW"],
      ["NPSHA (max system curve)", r.npshaMaxCase, "m"], ["NPSHA (min system curve)", r.npshaMinCase, "m"],
      [], ["Flow (L/s)", "System head max (m)", "System head min (m)", "Scaled pump head (m)"],
      ...r.curveSamples.map((s) => [s.q, s.sysMax, s.sysMin, s.pump])
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "rising-main-pump-duty-point-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">RISING MAIN SYSTEM CURVES &amp; PUMP SELECTION</p>
    <h1>Pump Duty Point (Colebrook-White)</h1>
    <p className="subtitle">Min and max head loss in a rising main across a range of discharge rates, intersected against a supplier pump curve to find the duty point, power and NPSHA.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Pipeline and fittings"><div className="calc-fields">
        <Field label="Internal diameter" value={diameter} unit="mm" onChange={setDiameter} />
        <Field label="Length" value={length} unit="m" onChange={setLength} />
        <Field label="90° bends" value={bend90} unit="no." hint="K = 1.2 each" onChange={setBend90} />
        <Field label="45° bends" value={bend45} unit="no." hint="K = 0.35 each" onChange={setBend45} />
        <Field label="Gate valves" value={gateValves} unit="no." hint="K = 0.5 each" onChange={setGateValves} />
        <Field label="Air valves and scour valves" value={airValves} unit="no." hint="K = 0.04 each" onChange={setAirValves} />
        <Field label="Reducers" value={reducers} unit="no." hint="K = 0.7 each" onChange={setReducers} />
      </div><p className="engine-note">A single entrance (K = 0.5) and single exit (K = 1) are always included, matching the source workbook.</p></Section>
      <Section number={2} title="Levels and static head"><div className="calc-fields">
        <Field label="Pump suction water level, min" value={suctionMin} unit="m" onChange={setSuctionMin} />
        <Field label="Pump suction water level, max" value={suctionMax} unit="m" onChange={setSuctionMax} />
        <Field label="Rising main discharge water level, min" value={dischargeMin} unit="m" onChange={setDischargeMin} />
        <Field label="Rising main discharge water level, max" value={dischargeMax} unit="m" onChange={setDischargeMax} />
      </div></Section>
      <Section number={3} title="Roughness and viscosity"><div className="calc-fields">
        <Field label="Roughness coefficient, ks, min" value={roughnessMin} unit="mm" onChange={setRoughnessMin} />
        <Field label="Roughness coefficient, ks, max" value={roughnessMax} unit="mm" onChange={setRoughnessMax} />
        <Field label="Temperature, min case" value={tempMin} unit="°C" onChange={setTempMin} />
        <Field label="Temperature, max case" value={tempMax} unit="°C" onChange={setTempMax} />
      </div></Section>
      <Section number={4} title="Pump selection"><div className="calc-fields">
        <Field label="Pumps in parallel" value={pumpsParallel} onChange={setPumpsParallel} />
        <Field label="Pumps in series" value={pumpsSeries} onChange={setPumpsSeries} />
        <Field label="Max pump speed" value={maxSpeed} unit="Hz" onChange={setMaxSpeed} />
        <Field label="Pump speed (VSD)" value={speed} unit="Hz" onChange={setSpeed} />
      </div>
      <div className="stage-table-wrap"><table className="stage-table"><thead><tr><th>Flow (L/s)</th><th>Head (m)</th></tr></thead><tbody>{pumpCurve.map((p, i) => <tr key={i}><td><input type="number" step="any" value={p.flow} onChange={(e) => updatePumpPoint(i, "flow", e.target.value)} /></td><td><input type="number" step="any" value={p.head} onChange={(e) => updatePumpPoint(i, "head", e.target.value)} /></td></tr>)}</tbody></table></div>
      <p className="engine-note">Pump curve from the supplier, for one pump at 100% speed. Scaled by speed ratio and pump count using the affinity laws.</p></Section>
      <Section number={5} title="Other parameters"><div className="calc-fields">
        <Field label="Fluid density" value={density} unit="kg/m³" onChange={setDensity} />
        <Field label="Pump efficiency" value={pumpEfficiency} onChange={setPumpEfficiency} />
        <Field label="Motor efficiency" value={motorEfficiency} onChange={setMotorEfficiency} />
        <Field label="VSD efficiency" value={vsdEfficiency} onChange={setVsdEfficiency} />
      </div></Section>
      <Section number={6} title="NPSH available — suction side"><div className="calc-fields">
        <Field label="Suction pipe internal diameter" value={suctionDiameter} unit="mm" onChange={setSuctionDiameter} />
        <Field label="Suction pipe length" value={suctionLength} unit="m" onChange={setSuctionLength} />
        <Field label="Entrance" value={sEntrance} unit="no." hint="K = 0.5 each" onChange={setSEntrance} />
        <Field label="90° bends" value={sBend90} unit="no." hint="K = 1.2 each" onChange={setSBend90} />
        <Field label="45° bends" value={sBend45} unit="no." hint="K = 0.35 each" onChange={setSBend45} />
        <Field label="Valves" value={sValve} unit="no." hint="K = 0.5 each" onChange={setSValve} />
        <Field label="Air/scour valves" value={sAirValve} unit="no." hint="K = 0.04 each" onChange={setSAirValve} />
        <Field label="Reducers" value={sReducer} unit="no." hint="K = 0.7 each" onChange={setSReducer} />
        <Field label="Exit" value={sExit} unit="no." hint="K = 1.0 each" onChange={setSExit} />
      </div>
      <p className="engine-note">NPSHA = atmospheric pressure + static head (min case) − vapour pressure − suction friction and fitting loss, evaluated at the max-roughness/max-temperature case.</p></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Duty point — max system curve</span><strong>{r?.dutyFlowMaxCase !== null && r ? fmt(r.dutyFlowMaxCase, 1) : "—"}<small>L/s</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.dutyFlowMaxCase !== null ? "pass" : "fail"}>{r.dutyFlowMaxCase !== null ? "✓ Pump and system curves intersect (max case)" : "✕ No intersection found within pump curve range"}</span>
        <span className={r.npshaMaxCase !== null && r.npshaMaxCase > 0 ? "pass" : "warn"}>{r.npshaMaxCase !== null ? (r.npshaMaxCase > 0 ? "✓ NPSHA positive at duty point" : "! NPSHA negative — review suction") : "—"}</span>
      </div>
      <h3 className="result-section-title">Duty points</h3>
      <Metric name="Max system curve — flow / head" value={(r.dutyFlowMaxCase !== null ? fmt(r.dutyFlowMaxCase, 1) : "—") + " L/s / " + (r.dutyHeadMaxCase !== null ? fmt(r.dutyHeadMaxCase, 1) : "—") + " m"} />
      <Metric name="Min system curve — flow / head" value={(r.dutyFlowMinCase !== null ? fmt(r.dutyFlowMinCase, 1) : "—") + " L/s / " + (r.dutyHeadMinCase !== null ? fmt(r.dutyHeadMinCase, 1) : "—") + " m"} />
      <h3 className="result-section-title">Power and NPSHA</h3>
      <Metric name="Shaft power, max case" value={r.powerMaxCase !== null ? fmt(r.powerMaxCase, 2) + " kW" : "—"} />
      <Metric name="Shaft power, min case" value={r.powerMinCase !== null ? fmt(r.powerMinCase, 2) + " kW" : "—"} />
      <Metric name="NPSHA, max case" value={r.npshaMaxCase !== null ? fmt(r.npshaMaxCase, 2) + " m" : "—"} />
      <Metric name="NPSHA, min case" value={r.npshaMinCase !== null ? fmt(r.npshaMinCase, 2) + " m" : "—"} />
      <h3 className="result-section-title">System</h3>
      <Metric name="Sum of fitting loss factors, ΣK" value={fmt(r.sumK, 3)} />
      <Metric name="Static head, min / max" value={fmt(r.staticHeadMin, 2) + " m / " + fmt(r.staticHeadMax, 2) + " m"} />
      <Metric name="Speed ratio" value={fmt(r.speedRatio, 3)} />
      <PumpCurveChart samples={r.curveSamples} dutyMax={r.dutyFlowMaxCase !== null && r.dutyHeadMaxCase !== null ? { q: r.dutyFlowMaxCase, h: r.dutyHeadMaxCase } : null} dutyMin={r.dutyFlowMinCase !== null && r.dutyHeadMinCase !== null ? { q: r.dutyFlowMinCase, h: r.dutyHeadMinCase } : null} />
      <div className="stage-table-wrap"><table className="stage-table"><thead><tr><th>Flow (L/s)</th><th>Sys. max (m)</th><th>Sys. min (m)</th><th>Pump (m)</th></tr></thead><tbody>{r.curveSamples.map((s) => <tr key={s.q}><td>{s.q}</td><td>{fmt(s.sysMax, 1)}</td><td>{fmt(s.sysMin, 1)}</td><td>{fmt(s.pump, 1)}</td></tr>)}</tbody></table></div>
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Friction loss uses the Colebrook-White equation. Confirm pump curve, roughness, levels and NPSH margin against manufacturer data before issue.</p></>}
    </aside></div>
  </div>;
}
