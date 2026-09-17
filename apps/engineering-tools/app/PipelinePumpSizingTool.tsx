"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const fmt = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

const STANDARD_MOTOR_SIZES_KW = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315];

function fluidDensity(tempC: number) {
  return 1000 * (1 - ((tempC + 288.9414) / (508929.2 * (tempC + 68.12963))) * Math.pow(tempC - 3.9863, 2));
}
function dynamicViscosityCp(tempC: number) {
  return Math.exp(-3.7188 + 578.919 / (-137.546 + tempC + 273.15));
}
function vapourPressureM(tempC: number) {
  return (0.61121 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)))) / g;
}
function colebrookF(re: number, roughnessMm: number, diameterMm: number) {
  if (!(re > 0 && diameterMm > 0)) return NaN;
  if (re < 2300) return 64 / re;
  let f = 0.02;
  for (let i = 0; i < 40; i++) {
    const next = 1 / Math.pow(-2 * Math.log10(roughnessMm / (3.7 * diameterMm) + 2.51 / (re * Math.sqrt(f))), 2);
    if (Math.abs(next - f) < 1e-10) return next;
    f = next;
  }
  return f;
}

type PipeSection = {
  enabled: boolean; label: string; material: string; nominalDia: string; idMm: string; lengthM: string;
  numParallel: string; roughnessMaxMm: string; roughnessMinMm: string; fittingsK: string; marginPct: string;
};
const blankSection = (label: string, enabled: boolean): PipeSection => ({
  enabled, label, material: "", nominalDia: "", idMm: "", lengthM: "", numParallel: "1", roughnessMaxMm: "0.05", roughnessMinMm: "0.003", fittingsK: "0", marginPct: "0"
});

type CurvePoint = { flow: string; head: string; eff: string };
type PumpCandidate = {
  enabled: boolean; model: string; noOff: string; speed: string; curve: CurvePoint[];
  directSunlight: boolean; windingProtection: boolean; flowAtMaxPower: string; selectedMotorKw: string; powerFactorAtMinLoad: string;
};
const blankPump = (model: string, enabled: boolean): PumpCandidate => ({
  enabled, model, noOff: "1", speed: "1",
  curve: [{ flow: "0", head: "", eff: "0" }, { flow: "", head: "", eff: "" }, { flow: "", head: "", eff: "" }, { flow: "", head: "", eff: "" }, { flow: "", head: "", eff: "" }, { flow: "", head: "", eff: "" }],
  directSunlight: false, windingProtection: true, flowAtMaxPower: "", selectedMotorKw: "", powerFactorAtMinLoad: "85"
});

function sectionHeadLoss(s: PipeSection, totalFlowLps: number, roughnessMm: number, densityKgM3: number, viscosityCp: number) {
  const idMm = num(s.idMm), n = Math.max(1, num(s.numParallel)), L = num(s.lengthM), K = num(s.fittingsK);
  if (!(idMm > 0) || !(totalFlowLps >= 0)) return { velocity: NaN, headLoss: NaN };
  const idM = idMm / 1000;
  const flowPerPipe = totalFlowLps / n / 1000;
  const area = (Math.PI / 4) * idM * idM;
  const velocity = flowPerPipe / area;
  const muPas = (viscosityCp / 1000);
  const re = (densityKgM3 * velocity * idM) / muPas;
  const f = colebrookF(re, roughnessMm, idMm);
  const velHead = (velocity * velocity) / (2 * g);
  const headLoss = f * (L / idM) * velHead + K * velHead;
  return { velocity, headLoss };
}

function interpLine(xs: number[], ys: number[], x: number) {
  if (xs.length === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
    }
  }
  return ys[ys.length - 1];
}
function findIntersection(pumpXs: number[], pumpYs: number[], sysXs: number[], sysYs: number[]) {
  const lo = Math.max(pumpXs[0], sysXs[0]);
  const hi = Math.min(pumpXs[pumpXs.length - 1], sysXs[sysXs.length - 1]);
  if (!(hi > lo)) return NaN;
  const diff = (x: number) => interpLine(pumpXs, pumpYs, x) - interpLine(sysXs, sysYs, x);
  let a = lo, b = hi, fa = diff(a), fb = diff(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) {
    const steps = 200;
    let prevX = a, prevF = fa;
    for (let i = 1; i <= steps; i++) {
      const x = lo + ((hi - lo) * i) / steps;
      const f = diff(x);
      if (Number.isFinite(prevF) && Number.isFinite(f) && prevF * f <= 0) { a = prevX; b = x; fa = prevF; fb = f; break; }
      prevX = x; prevF = f;
      if (i === steps) return NaN;
    }
  }
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2, fm = diff(m);
    if (Math.abs(fm) < 1e-9) return m;
    if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}
function bepFromCurve(flows: number[], effs: number[]) {
  let iMax = 0;
  for (let i = 1; i < effs.length; i++) if (effs[i] > effs[iMax]) iMax = i;
  if (iMax === 0 || iMax === effs.length - 1) return { flow: flows[iMax], eff: effs[iMax] };
  const [x0, x1, x2] = [flows[iMax - 1], flows[iMax], flows[iMax + 1]];
  const [y0, y1, y2] = [effs[iMax - 1], effs[iMax], effs[iMax + 1]];
  const denom = (x0 - x1) * (x0 - x2) * (x1 - x2);
  if (denom === 0) return { flow: x1, eff: y1 };
  const a = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / denom;
  const b = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / denom;
  if (a === 0) return { flow: x1, eff: y1 };
  const flowAtPeak = -b / (2 * a);
  const c = y0 - a * x0 * x0 - b * x0;
  return { flow: flowAtPeak, eff: a * flowAtPeak * flowAtPeak + b * flowAtPeak + c };
}

function Field({ label, value, unit, onChange, small }: { label: string; value: string; unit?: string; onChange: (v: string) => void; small?: boolean }) {
  return <label className={small ? "calc-field calc-field-sm" : "calc-field"}>
    <span>{label}</span>
    <input type={label === "Material" || label === "Nominal diameter" || label === "Model" ? "text" : "number"} step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

function SchematicDiagram() {
  return <svg viewBox="0 0 780 300" role="img" aria-label="Pipeline schematic showing suction sections 1-4, the pump station, and discharge sections 5-8" style={{ width: "100%", maxWidth: 640, height: "auto", margin: "12px 0" }}>
    <defs><marker id="pp-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4a4a4a" /></marker></defs>
    <path d="M15 20 L100 20 L100 90 L60 110 L15 90 Z" fill="#eef3f7" stroke="#5b7a99" strokeWidth="2" />
    <text x="57" y="55" textAnchor="middle" fontSize="12" fill="#2f3e4d">Inlet tank</text>
    <text x="57" y="70" textAnchor="middle" fontSize="12" fill="#2f3e4d">/ vessel</text>
    <path d="M665 20 L750 20 L750 90 L710 110 L665 90 Z" fill="#eef3f7" stroke="#5b7a99" strokeWidth="2" />
    <text x="707" y="55" textAnchor="middle" fontSize="12" fill="#2f3e4d">Outlet tank</text>
    <text x="707" y="70" textAnchor="middle" fontSize="12" fill="#2f3e4d">/ vessel</text>
    <path d="M60 110 L60 130 L263 130 L263 90" fill="none" stroke="#333" strokeWidth="2" />
    <path d="M263 90 L263 60 L327 60" fill="none" stroke="#333" strokeWidth="2" markerEnd="url(#pp-arr)" />
    <text x="200" y="150" textAnchor="middle" fontSize="12" fill="#2f3e4d">Sections 1, 2, 3</text>
    <text x="295" y="52" textAnchor="middle" fontSize="12" fill="#2f3e4d">Section 4</text>
    <circle cx="360" cy="60" r="22" fill="#fff" stroke="#333" strokeWidth="2" />
    <path d="M345 45 L375 75 M375 45 L345 75" stroke="#333" strokeWidth="2" />
    <text x="360" y="92" textAnchor="middle" fontSize="12" fill="#2f3e4d">Pump 1</text>
    <path d="M393 60 L457 60" stroke="#333" strokeWidth="2" markerEnd="url(#pp-arr)" />
    <text x="425" y="52" textAnchor="middle" fontSize="12" fill="#2f3e4d">Section 5</text>
    <path d="M457 60 L520 60 L520 90 L520 130 L710 130 L710 110" fill="none" stroke="#333" strokeWidth="2" />
    <text x="600" y="150" textAnchor="middle" fontSize="12" fill="#2f3e4d">Sections 6, 7, 8</text>
    <circle cx="360" cy="110" r="18" fill="none" stroke="#999" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M348 98 L372 122 M372 98 L348 122" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <text x="360" y="140" textAnchor="middle" fontSize="11" fill="#777">Pump 2</text>
    <circle cx="360" cy="165" r="18" fill="none" stroke="#999" strokeWidth="1.5" strokeDasharray="4 3" />
    <path d="M348 153 L372 177 M372 153 L348 177" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <text x="360" y="195" textAnchor="middle" fontSize="11" fill="#777">Pump 3</text>
    <path d="M330 110 L342 110" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <path d="M390 110 L378 110" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <path d="M330 165 L342 165" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <path d="M390 165 L378 165" stroke="#999" strokeWidth="1.5" strokeDasharray="3 2" />
    <line x1="15" y1="210" x2="250" y2="210" stroke="#ccc" strokeWidth="1" />
    <text x="130" y="228" textAnchor="middle" fontSize="11" fill="#888">Sections 1, 2, 3 — suction, upstream of Section 4</text>
    <line x1="470" y1="210" x2="750" y2="210" stroke="#ccc" strokeWidth="1" />
    <text x="610" y="228" textAnchor="middle" fontSize="11" fill="#888">Sections 6, 7, 8 — discharge, downstream of Section 5</text>
  </svg>;
}

export function PipelinePumpSizingTool() {
  const [nominalFlow, setNominalFlow] = useState("35");
  const [tempC, setTempC] = useState("20");
  const [atmPressureKpa, setAtmPressureKpa] = useState("101.325");
  const [inletLevelMin, setInletLevelMin] = useState("60");
  const [inletLevelMax, setInletLevelMax] = useState("65");
  const [pumpCentrelineLevel, setPumpCentrelineLevel] = useState("62");
  const [outletLevelMin, setOutletLevelMin] = useState("100");
  const [outletLevelMax, setOutletLevelMax] = useState("100");

  const [suction, setSuction] = useState<PipeSection[]>([
    { ...blankSection("Section 1", true), material: "PVC PN6", nominalDia: "DN200", idMm: "213.8", lengthM: "50", fittingsK: "1.8" },
    { ...blankSection("Section 2", true), material: "SS316", nominalDia: "DN150", idMm: "158", lengthM: "0.5", fittingsK: "1.3" },
    blankSection("Section 3", false), blankSection("Section 4", false)
  ]);
  const [discharge, setDischarge] = useState<PipeSection[]>([
    { ...blankSection("Section 5", true), material: "PVC PN6", nominalDia: "DN200", idMm: "213.8", lengthM: "4950", fittingsK: "4.85" },
    blankSection("Section 6", false), blankSection("Section 7", false), blankSection("Section 8", false)
  ]);

  const [pumps, setPumps] = useState<PumpCandidate[]>([
    { ...blankPump("Pump 1", true), curve: [{ flow: "0", head: "84", eff: "0" }, { flow: "11", head: "80", eff: "44.5" }, { flow: "22", head: "73.5", eff: "67.1" }, { flow: "33", head: "65", eff: "78.7" }, { flow: "44", head: "53.5", eff: "82.9" }, { flow: "53", head: "43", eff: "79.6" }] },
    blankPump("Pump 2", false), blankPump("Pump 3", false)
  ]);

  const updateSection = (list: PipeSection[], setList: (v: PipeSection[]) => void, i: number, patch: Partial<PipeSection>) =>
    setList(list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const updatePump = (i: number, patch: Partial<PumpCandidate>) => setPumps(pumps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const updateCurvePoint = (pi: number, ci: number, patch: Partial<CurvePoint>) =>
    setPumps(pumps.map((p, idx) => idx === pi ? { ...p, curve: p.curve.map((c, cidx) => cidx === ci ? { ...c, ...patch } : c) } : p));

  const result = useMemo(() => {
    const flow = num(nominalFlow), temp = num(tempC), atmKpa = num(atmPressureKpa);
    const inMin = num(inletLevelMin), inMax = num(inletLevelMax), pumpCl = num(pumpCentrelineLevel), outMin = num(outletLevelMin), outMax = num(outletLevelMax);
    if (![flow, temp, atmKpa, inMin, inMax, pumpCl, outMin, outMax].every(Number.isFinite) || flow <= 0) return null;

    const density = fluidDensity(temp);
    const viscosityCp = dynamicViscosityCp(temp);
    const vapourM = vapourPressureM(temp);
    const atmM = (atmKpa * 1000) / (1000 * g);

    const staticHeadMin = outMin - inMax;
    const staticHeadMax = outMax - inMin;

    const activeSuction = suction.filter((s) => s.enabled && num(s.idMm) > 0);
    const activeDischarge = discharge.filter((s) => s.enabled && num(s.idMm) > 0);
    if (activeSuction.length === 0 || activeDischarge.length === 0) return null;

    const N = 16;
    const breakpoints = Array.from({ length: N }, (_, i) => i * 0.1 * flow);

    const sectionCurve = (sections: PipeSection[]) => breakpoints.map((q) => {
      let hMin = 0, hMax = 0;
      let lastVelocityMin = 0, lastVelocityMax = 0;
      for (const s of sections) {
        const rMax = num(s.roughnessMaxMm), rMin = num(s.roughnessMinMm), margin = num(s.marginPct);
        const resMin = sectionHeadLoss(s, q, rMin, density, viscosityCp);
        const resMax = sectionHeadLoss(s, q, rMax, density, viscosityCp);
        hMin += resMin.headLoss;
        hMax += resMax.headLoss * (1 + margin / 100);
        lastVelocityMin = resMin.velocity;
        lastVelocityMax = resMax.velocity;
      }
      return { q, hMin, hMax, lastVelocityMin, lastVelocityMax };
    });

    const suctionCurve = sectionCurve(activeSuction);
    const dischargeCurve = sectionCurve(activeDischarge);
    const systemMin = breakpoints.map((q, i) => staticHeadMin + suctionCurve[i].hMin + dischargeCurve[i].hMin);
    const systemMax = breakpoints.map((q, i) => staticHeadMax + suctionCurve[i].hMax + dischargeCurve[i].hMax);

    const pumpResults = pumps.filter((p) => p.enabled).map((p) => {
      const noOff = num(p.noOff), speed = num(p.speed);
      const rawFlows = p.curve.map((c) => num(c.flow));
      const rawHeads = p.curve.map((c) => num(c.head));
      const rawEffs = p.curve.map((c) => num(c.eff));
      const valid = rawFlows.every(Number.isFinite) && rawHeads.every(Number.isFinite) && rawEffs.every(Number.isFinite) && Number.isFinite(noOff) && Number.isFinite(speed);
      if (!valid) return null;
      const modFlows = rawFlows.map((f) => f * speed * noOff);
      const modHeads = rawHeads.map((h) => h * speed * speed);
      const modEffs = rawEffs;

      const dutyMax = findIntersection(modFlows, modHeads, breakpoints, systemMax);
      const dutyMin = findIntersection(modFlows, modHeads, breakpoints, systemMin);
      const bep = bepFromCurve(modFlows, modEffs);

      const evalDuty = (q: number, sysHeads: number[]) => {
        if (!Number.isFinite(q)) return null;
        const head = interpLine(breakpoints, sysHeads, q);
        const eff = interpLine(modFlows, modEffs, q);
        const powerKw = (q / 1000) * 1000 * g * head / (eff / 100) / 1000;
        const pctBep = bep.flow > 0 ? (q / bep.flow) * 100 : NaN;
        const suctionVelocity = interpLine(breakpoints, sysHeads === systemMax ? suctionCurve.map((c) => c.lastVelocityMax) : suctionCurve.map((c) => c.lastVelocityMin), q);
        const suctionLoss = sysHeads === systemMax
          ? interpLine(breakpoints, suctionCurve.map((c) => c.hMax), q)
          : interpLine(breakpoints, suctionCurve.map((c) => c.hMin), q);
        const inletLevelUsed = sysHeads === systemMax ? inMin : inMax;
        const npsha = atmM - vapourM + (inletLevelUsed - pumpCl) - suctionLoss - (suctionVelocity * suctionVelocity) / (2 * g);
        return { flow: q, head, eff, powerKw, pctBep, npsha };
      };

      const atMax = evalDuty(dutyMax, systemMax);
      const atMin = evalDuty(dutyMin, systemMin);

      const flowAtMaxPower = num(p.flowAtMaxPower);
      const scaledFlowAtMaxPower = flowAtMaxPower * noOff;
      const headAtMaxPower = interpLine(modFlows, modHeads, scaledFlowAtMaxPower);
      const effAtMaxPower = interpLine(modFlows, modEffs, scaledFlowAtMaxPower);
      const pumpMaxShaftPower = Number.isFinite(flowAtMaxPower) ? (g * (scaledFlowAtMaxPower / 1000) * headAtMaxPower) / (effAtMaxPower / 100) : NaN;
      const dutyPointMaxPower = Math.max(atMax?.powerKw ?? -Infinity, atMin?.powerKw ?? -Infinity);
      const sunlightFactor = p.directSunlight ? 1.2 : 1.1;
      const windingOk = p.windingProtection;
      const marginRatio = windingOk ? 1 : Math.min(1.1, pumpMaxShaftPower / dutyPointMaxPower);
      const recommendedMarginPct = (marginRatio * sunlightFactor - 1) * 100;
      const minMotorRatingKw = (windingOk ? dutyPointMaxPower : Math.min(dutyPointMaxPower * 1.1, pumpMaxShaftPower)) * sunlightFactor;
      const nextStandard = STANDARD_MOTOR_SIZES_KW.find((sz) => sz >= minMotorRatingKw);
      const selectedMotorKw = num(p.selectedMotorKw);
      const referenceForMargin = windingOk ? dutyPointMaxPower : Math.min(dutyPointMaxPower * 1.1, pumpMaxShaftPower);
      const actualMarginPct = Number.isFinite(selectedMotorKw) ? (selectedMotorKw / referenceForMargin - 1) * 100 : NaN;
      const minDutyPower = Math.min(atMax?.powerKw ?? Infinity, atMin?.powerKw ?? Infinity);
      const minMotorLoadingPct = Number.isFinite(selectedMotorKw) ? (minDutyPower / selectedMotorKw) * 100 : NaN;
      const pfMin = num(p.powerFactorAtMinLoad);
      const pfPass = Number.isFinite(pfMin) ? pfMin / 100 >= 0.8 : null;

      return {
        model: p.model, noOff, speed, modFlows, modHeads, modEffs, bep, atMax, atMin,
        pumpMaxShaftPower, dutyPointMaxPower, recommendedMarginPct, minMotorRatingKw, nextStandard,
        selectedMotorKw, actualMarginPct, minMotorLoadingPct, pfPass
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    const nominalHead = interpLine(breakpoints, systemMax, flow);

    return { density, viscosityCp, vapourM, atmM, staticHeadMin, staticHeadMax, breakpoints, systemMin, systemMax, nominalHead, pumpResults };
  }, [nominalFlow, tempC, atmPressureKpa, inletLevelMin, inletLevelMax, pumpCentrelineLevel, outletLevelMin, outletLevelMax, suction, discharge, pumps]);

  const exportCsv = () => {
    if (!result) return;
    const rows: (string | number)[][] = [
      ["Pipeline and Pump Sizing", "Value", "Unit"],
      ["Fluid density", result.density, "kg/m3"], ["Dynamic viscosity", result.viscosityCp, "cP"], ["Vapour pressure", result.vapourM, "m water"],
      ["Static head min / max", `${fmt(result.staticHeadMin)} / ${fmt(result.staticHeadMax)}`, "m"],
      ["Nominal duty head (system max)", result.nominalHead, "m"]
    ];
    result.pumpResults.forEach((p) => {
      rows.push([`${p.model} — duty at system max`, p.atMax ? `${fmt(p.atMax.flow)} L/s, ${fmt(p.atMax.head)} m` : "—", ""]);
      rows.push([`${p.model} — duty at system min`, p.atMin ? `${fmt(p.atMin.flow)} L/s, ${fmt(p.atMin.head)} m` : "—", ""]);
      rows.push([`${p.model} — min motor rating`, p.minMotorRatingKw, "kW"]);
      rows.push([`${p.model} — next standard motor`, p.nextStandard ?? "—", "kW"]);
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "pipeline-pump-sizing.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const SectionRow = ({ list, setList, i }: { list: PipeSection[]; setList: (v: PipeSection[]) => void; i: number }) => {
    const s = list[i];
    return <div className="calc-card" style={{ marginBottom: 10 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
        <input type="checkbox" checked={s.enabled} onChange={(e) => updateSection(list, setList, i, { enabled: e.target.checked })} />{s.label}
      </label>
      {s.enabled && <div className="calc-fields">
        <Field label="Material" value={s.material} onChange={(v) => updateSection(list, setList, i, { material: v })} small />
        <Field label="Nominal diameter" value={s.nominalDia} onChange={(v) => updateSection(list, setList, i, { nominalDia: v })} small />
        <Field label="Internal diameter" value={s.idMm} unit="mm" onChange={(v) => updateSection(list, setList, i, { idMm: v })} small />
        <Field label="Length" value={s.lengthM} unit="m" onChange={(v) => updateSection(list, setList, i, { lengthM: v })} small />
        <Field label="Parallel pipes" value={s.numParallel} onChange={(v) => updateSection(list, setList, i, { numParallel: v })} small />
        <Field label="Max roughness, k" value={s.roughnessMaxMm} unit="mm" onChange={(v) => updateSection(list, setList, i, { roughnessMaxMm: v })} small />
        <Field label="Min roughness, k" value={s.roughnessMinMm} unit="mm" onChange={(v) => updateSection(list, setList, i, { roughnessMinMm: v })} small />
        <Field label="Total fittings K" value={s.fittingsK} onChange={(v) => updateSection(list, setList, i, { fittingsK: v })} small />
        <Field label="Additional margin (max curve)" value={s.marginPct} unit="%" onChange={(v) => updateSection(list, setList, i, { marginPct: v })} small />
      </div>}
    </div>;
  };

  return <div className="content calc-content">
    <p className="eyebrow">SYSTEM CURVE & PUMP RATING</p>
    <h1>Pipeline and Pump Sizing</h1>
    <p className="subtitle">Generates the pipeline system curve from Colebrook–White friction losses, intersects it with up to three candidate pump curves for duty points, NPSHa and motor sizing.</p>
    <SchematicDiagram />
    <div className="calc-layout"><div>
      <Section number={1} title="Fluid, elevations and static head"><div className="calc-fields">
        <Field label="Nominal flow rate" value={nominalFlow} unit="L/s" onChange={setNominalFlow} />
        <Field label="Temperature" value={tempC} unit="°C" onChange={setTempC} />
        <Field label="Atmospheric pressure" value={atmPressureKpa} unit="kPa" onChange={setAtmPressureKpa} />
        <Field label="Pipeline inlet water level, min" value={inletLevelMin} unit="mAHD" onChange={setInletLevelMin} />
        <Field label="Pipeline inlet water level, max" value={inletLevelMax} unit="mAHD" onChange={setInletLevelMax} />
        <Field label="Pump centreline level" value={pumpCentrelineLevel} unit="mAHD" onChange={setPumpCentrelineLevel} />
        <Field label="Pipeline outlet water level, min" value={outletLevelMin} unit="mAHD" onChange={setOutletLevelMin} />
        <Field label="Pipeline outlet water level, max" value={outletLevelMax} unit="mAHD" onChange={setOutletLevelMax} />
      </div>
      {result && <div className="check-row"><span className="pass">Static head min {fmt(result.staticHeadMin)} m</span><span className="pass">Static head max {fmt(result.staticHeadMax)} m</span></div>}</Section>

      <Section number={2} title="Pipeline — suction side (up to 4 sections, upstream of the pump)">
        {suction.map((_, i) => <SectionRow key={i} list={suction} setList={setSuction} i={i} />)}
      </Section>
      <Section number={3} title="Pipeline — discharge side (up to 4 sections, downstream of the pump)">
        {discharge.map((_, i) => <SectionRow key={i} list={discharge} setList={setDischarge} i={i} />)}
      </Section>

      <Section number={4} title="Pump curves (up to 3 candidates)">
        <p className="section-help">Enter each candidate&apos;s raw single-pump, 100%-speed curve (6 points, flow vs head vs hydraulic efficiency). No. off and speed are applied as parallel-unit and affinity-law scaling.</p>
        {pumps.map((p, pi) => <div key={pi} className="calc-card" style={{ marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <input type="checkbox" checked={p.enabled} onChange={(e) => updatePump(pi, { enabled: e.target.checked })} />{p.model}
          </label>
          {p.enabled && <>
            <div className="calc-fields">
              <Field label="Model" value={p.model} onChange={(v) => updatePump(pi, { model: v })} small />
              <Field label="No. off (parallel)" value={p.noOff} onChange={(v) => updatePump(pi, { noOff: v })} small />
              <Field label="Speed ratio" value={p.speed} onChange={(v) => updatePump(pi, { speed: v })} small />
            </div>
            <div className="reference-table"><table><thead><tr><th>Flow (L/s)</th><th>Head (m)</th><th>Hyd. eff. (%)</th></tr></thead><tbody>
              {p.curve.map((c, ci) => <tr key={ci}>
                <td><input type="number" step="any" value={c.flow} onChange={(e) => updateCurvePoint(pi, ci, { flow: e.target.value })} style={{ width: 70 }} /></td>
                <td><input type="number" step="any" value={c.head} onChange={(e) => updateCurvePoint(pi, ci, { head: e.target.value })} style={{ width: 70 }} /></td>
                <td><input type="number" step="any" value={c.eff} onChange={(e) => updateCurvePoint(pi, ci, { eff: e.target.value })} style={{ width: 70 }} /></td>
              </tr>)}
            </tbody></table></div>
            <div className="check-row">
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={p.directSunlight} onChange={(e) => updatePump(pi, { directSunlight: e.target.checked })} />Motor in direct sunlight</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={p.windingProtection} onChange={(e) => updatePump(pi, { windingProtection: e.target.checked })} />Winding temp. protection fitted</label>
            </div>
            <div className="calc-fields">
              <Field label="Flow at pump max shaft power" value={p.flowAtMaxPower} unit="L/s" onChange={(v) => updatePump(pi, { flowAtMaxPower: v })} small />
              <Field label="Selected motor size" value={p.selectedMotorKw} unit="kW" onChange={(v) => updatePump(pi, { selectedMotorKw: v })} small />
              <Field label="Power factor at min. loading" value={p.powerFactorAtMinLoad} unit="%" onChange={(v) => updatePump(pi, { powerFactorAtMinLoad: v })} small />
            </div>
          </>}
        </div>)}
      </Section>
      <div className="reference-table"><table><thead><tr><th>Standard motor sizes (kW)</th></tr></thead><tbody><tr><td>{STANDARD_MOTOR_SIZES_KW.join(", ")}</td></tr></tbody></table></div>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      {!result && <p className="section-help">Enter fluid, elevation, at least one suction and one discharge section, and at least one pump curve.</p>}
      {result && <>
      <div className="result-hero"><span>Nominal duty head (system max, at nominal flow)</span><strong>{fmt(result.nominalHead)}<small>m</small></strong></div>
      <Metric name="Fluid density" value={`${fmt(result.density, 1)} kg/m³`} />
      <Metric name="Dynamic viscosity" value={`${fmt(result.viscosityCp, 4)} cP`} />
      <Metric name="Vapour pressure" value={`${fmt(result.vapourM, 3)} m water`} />
      <Metric name="Atmospheric pressure" value={`${fmt(result.atmM, 2)} m water`} />
      {result.pumpResults.map((p, i) => <div key={i}>
        <h3 className="result-section-title">{p.model || `Pump candidate ${i + 1}`}</h3>
        <div className="check-row">
          <span className={p.atMax ? "pass" : "fail"}>{p.atMax ? "✓ Duty point found — system max" : "✕ No intersection — system max"}</span>
          <span className={p.atMin ? "pass" : "fail"}>{p.atMin ? "✓ Duty point found — system min" : "✕ No intersection — system min"}</span>
        </div>
        {p.atMax && <>
          <Metric name="Duty (system max) — flow / head" value={`${fmt(p.atMax.flow)} L/s / ${fmt(p.atMax.head)} m`} />
          <Metric name="Duty (system max) — eff. / power" value={`${fmt(p.atMax.eff, 1)} % / ${fmt(p.atMax.powerKw)} kW`} />
          <Metric name="Duty (system max) — % of BEP flow" value={`${fmt(p.atMax.pctBep, 1)} %`} />
          <Metric name="NPSHa at system max duty" value={`${fmt(p.atMax.npsha)} m`} />
        </>}
        {p.atMin && <>
          <Metric name="Duty (system min) — flow / head" value={`${fmt(p.atMin.flow)} L/s / ${fmt(p.atMin.head)} m`} />
          <Metric name="Duty (system min) — eff. / power" value={`${fmt(p.atMin.eff, 1)} % / ${fmt(p.atMin.powerKw)} kW`} />
          <Metric name="Duty (system min) — % of BEP flow" value={`${fmt(p.atMin.pctBep, 1)} %`} />
          <Metric name="NPSHa at system min duty" value={`${fmt(p.atMin.npsha)} m`} />
        </>}
        <Metric name="BEP flow / efficiency" value={`${fmt(p.bep.flow)} L/s / ${fmt(p.bep.eff, 1)} %`} />
        <Metric name="Recommended motor sizing margin" value={`${fmt(p.recommendedMarginPct, 1)} %`} />
        <Metric name="Min. motor shaft output rating" value={`${fmt(p.minMotorRatingKw)} kW`} />
        <Metric name="Next standard motor size" value={p.nextStandard ? `${p.nextStandard} kW` : "— (exceeds table)"} />
        {Number.isFinite(p.actualMarginPct) && <Metric name="Actual motor sizing margin" value={`${fmt(p.actualMarginPct, 1)} %`} />}
        {Number.isFinite(p.minMotorLoadingPct) && <Metric name="Minimum motor loading" value={`${fmt(p.minMotorLoadingPct, 1)} %`} />}
        {p.pfPass !== null && <div className="check-row"><span className={p.pfPass ? "pass" : "fail"}>{p.pfPass ? "✓ Power factor ≥ 0.8 at min. loading" : "✕ Power factor below 0.8 at min. loading"}</span></div>}
      </div>)}
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only, ported from a project-specific pipeline and pump sizing workbook. Simplifications from the source: friction uses the Colebrook–White equation only (the source&apos;s Von Karman &apos;smooth pipe&apos; branch is not modelled — Colebrook–White is the source&apos;s own recommended, conservative default); fitting losses are entered as a single combined K factor per section rather than an itemised checklist; pump-curve intersections and the best-efficiency point are found by direct numerical interpolation of the entered points rather than the source&apos;s polynomial regression fit — verified to track closely but not bit-identical. Confirm all inputs, pump selection and motor sizing before issue.</p>
      </>}
    </aside></div>
  </div>;
}
