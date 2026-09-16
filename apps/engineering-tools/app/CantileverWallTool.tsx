"use client";

import { useMemo, useState } from "react";

const num = (v: string) => Number(v);
const fmt = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

const FC_OPTIONS = [20, 25, 32, 40, 50];
// AS3600 deformed bar sizes. The source workbook's N24/N28 rows had transposed
// diameters (16mm/20mm) — corrected here to the standard 24mm/28mm.
const BAR_SIZES = [
  { id: 1, label: "N12", dia: 12 }, { id: 2, label: "N16", dia: 16 }, { id: 3, label: "N20", dia: 20 },
  { id: 4, label: "N24", dia: 24 }, { id: 5, label: "N28", dia: 28 }, { id: 6, label: "N32", dia: 32 }, { id: 7, label: "N36", dia: 36 }
];
const barArea = (dia: number) => (Math.PI * dia * dia) / 4;
// Cover (mm) by exposure classification and concrete strength (AS3600), from the source workbook's table.
const COVER_TABLE: Record<string, Record<number, number>> = {
  A1: { 20: 20, 25: 20, 32: 20, 40: 20, 50: 20 },
  A2: { 20: 50, 25: 30, 32: 25, 40: 20, 50: 20 },
  B1: { 25: 60, 32: 40, 40: 30, 50: 25 },
  B2: { 32: 65, 40: 45, 50: 35 },
  C: { 40: 70, 50: 50 }
};

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field">
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: (string | number)[]; onChange: (v: string) => void }) {
  return <label className="calc-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}
function ReinforcementFields({ title, barId, setBarId, count, setCount }: { title: string; barId: string; setBarId: (v: string) => void; count: string; setCount: (v: string) => void }) {
  return <div className="calc-fields">
    <Select label={title + " bar size"} value={barId} options={BAR_SIZES.map((b) => b.label)} onChange={setBarId} />
    <Field label="Number of bars" value={count} onChange={setCount} />
  </div>;
}

export function CantileverWallTool() {
  const [freeHeight, setFreeHeight] = useState("8.9");
  const [foundationDepth, setFoundationDepth] = useState("0");
  const [overloadW, setOverloadW] = useState("0");
  const [materialWeight, setMaterialWeight] = useState("20");
  const [saturatedSoilWeight, setSaturatedSoilWeight] = useState("22");
  const [waterUnitWeight, setWaterUnitWeight] = useState("10");
  const [frictionAngle, setFrictionAngle] = useState("22");
  const [ka, setKa] = useState("0.5");
  const [bearingCapacity, setBearingCapacity] = useState("200");
  const [frictionCoefficient, setFrictionCoefficient] = useState("1");
  const [fc, setFc] = useState("32");
  const [fsyMain, setFsyMain] = useState("500");
  const [fsyShear, setFsyShear] = useState("250");
  const [concreteUnitWeight, setConcreteUnitWeight] = useState("23");
  const [frictionAngleFoundation, setFrictionAngleFoundation] = useState("18");
  const [minOverturningSF, setMinOverturningSF] = useState("2");
  const [minSlidingSF, setMinSlidingSF] = useState("3");

  const [aDim, setADim] = useState("0.6");
  const [bDim, setBDim] = useState("3.2");
  const [dDim, setDDim] = useState("0.4");
  const [eDim, setEDim] = useState("0.6");
  const [fDim, setFDim] = useState("3.5");
  const [coverClass, setCoverClass] = useState("A1");

  const [stemBar, setStemBar] = useState("N36");
  const [stemCount, setStemCount] = useState("10");
  const [stemStirrupBar, setStemStirrupBar] = useState("N12");
  const [stemStirrupSpacing, setStemStirrupSpacing] = useState("100");
  const [baseBar, setBaseBar] = useState("N12");
  const [baseCount, setBaseCount] = useState("4");
  const [heelBar, setHeelBar] = useState("N12");
  const [heelCount, setHeelCount] = useState("8");

  const r = useMemo(() => {
    const h = num(freeHeight), fd = num(foundationDepth), w = num(overloadW), gMat = num(materialWeight),
      gSat = num(saturatedSoilWeight), gW = num(waterUnitWeight), phiDeg = num(frictionAngle), kaVal = num(ka),
      qAllow = num(bearingCapacity), fCoeff = num(frictionCoefficient), fcVal = num(fc), fsyM = num(fsyMain),
      fsyS = num(fsyShear), gConc = num(concreteUnitWeight), deltaDeg = num(frictionAngleFoundation),
      minOT = num(minOverturningSF), minSl = num(minSlidingSF);
    const a = num(aDim), b = num(bDim), d = num(dDim), e = num(eDim), f = num(fDim);

    const inputs = [h, fd, w, gMat, gSat, gW, phiDeg, kaVal, qAllow, fCoeff, fcVal, fsyM, fsyS, gConc, deltaDeg, minOT, minSl, a, b, d, e, f];
    if (!inputs.every((v) => Number.isFinite(v)) || h <= 0 || a <= 0 || d <= 0) return null;

    const c = b + e + f;
    const g = f + e;
    if (c <= 0 || e < a) return null;

    const aGuide = h / 24, dGuide = h / 12, eGuide = h / 12, cGuide = (2 * h) / 3, bGuide = cGuide / 3;

    const wallAWeight = 0.5 * (e - a) * (h - d) * gConc;
    const wallAArm = (2 / 3) * (e - a) + b;
    const wallBWeight = a * (h - d) * gConc;
    const wallBArm = b + e - a / 2;
    const baseWeight = c * d * gConc;
    const baseArm = c / 2;
    const materialForce = (c - b - e) * (h - d) * gMat;
    const materialArm = c - (c - b - e) / 2;
    const Fv = wallAWeight + wallBWeight + baseWeight + materialForce;
    const Mv = wallAWeight * wallAArm + wallBWeight * wallBArm + baseWeight * baseArm + materialForce * materialArm;

    const earthForce = 0.5 * kaVal * (gSat - gW) * h * h;
    const earthArm = h / 3;
    const hydroForce = 0.5 * gW * h * h;
    const hydroArm = h / 3;
    const Fh = earthForce + hydroForce;
    const Mh = earthForce * earthArm + hydroForce * hydroArm;

    const overturningSF = Mh > 0 ? Mv / Mh : Infinity;
    const overturningOk = overturningSF >= minOT;

    const momentAboutA = Mv - Mh;
    const pointOfApplication = Fv > 0 ? momentAboutA / Fv : NaN;
    const eccentricity = c / 2 - pointOfApplication;
    const qmax = (Fv / c) * (1 + (6 * eccentricity) / c);
    const qmin = (Fv / c) * (1 - (6 * eccentricity) / c);
    const bearingOk = qmax <= qAllow;
    const noTensionOk = qmin >= 0;

    const tanDelta = Math.tan((deltaDeg * Math.PI) / 180);
    const slidingResistance = Fv * tanDelta;
    const slidingSF = Fh > 0 ? slidingResistance / Fh : Infinity;
    const keyNeeded = slidingSF < minSl;

    const tanPhi = Math.tan((phiDeg * Math.PI) / 180);
    const bearingAtG = qmin + (qmax - qmin) * (g / c);
    const forceUnderB = 0.5 * (qmax + bearingAtG) * b;
    const forceUnderG = 0.5 * (bearingAtG + qmin) * g;
    const requiredKeyDepth = keyNeeded && gMat * c > 0
      ? Math.sqrt(Math.max(0, ((3 * Fh - fCoeff * forceUnderG - tanPhi * forceUnderB) * 2) / (gMat * c)))
      : 0;
    const additionalKeyDepth = Math.max(0, requiredKeyDepth - d);

    const stemThrustOverload = w * kaVal * h;
    const stemTotalThrust = Fh + stemThrustOverload;
    const stemMoment = Mh;

    const coverMm = COVER_TABLE[coverClass]?.[fcVal] ?? 20;
    const effDepthStem = a * 1000 - coverMm;
    const gammaFactor = 0.85 - 0.007 * (fcVal - 28);
    const rhoMin = 1.4 / fsyM;
    const rhoMax = 0.34 * gammaFactor * (fcVal / fsyM);
    const rhoDesign = rhoMax / 3;
    const rhoOk = rhoDesign >= rhoMin;
    const width = 1000; // 1 m design strip, in mm
    const AstReqStem = rhoDesign * effDepthStem * width;
    const MuStem = rhoDesign * fsyM * width * effDepthStem * effDepthStem * (1 - 0.6 * rhoDesign * (fsyM / fcVal));
    const phiMuStem = 0.8 * MuStem;
    const stemMomentNmm = stemMoment * 1e6;
    const stemMomentOk = phiMuStem >= stemMomentNmm;

    const stemBarDia = BAR_SIZES.find((bs) => bs.label === stemBar)?.dia ?? 12;
    const stemBars = Math.max(0, num(stemCount));
    const AstUsedStem = barArea(stemBarDia) * stemBars;
    const stemAstOk = AstUsedStem >= AstReqStem;
    const stemSpacing = stemBars > 1 ? (width - 2 * coverMm - stemBarDia) / (stemBars - 1) : NaN;

    const VStarStem = stemTotalThrust * 1000; // N
    const VmaxStem = 0.2 * fcVal * width * effDepthStem;
    const phiVmaxStem = 0.7 * VmaxStem;
    const VmaxOk = phiVmaxStem > VStarStem;
    const beta1 = 1.1 * (1.6 - effDepthStem / 1000);
    const VucStem = beta1 * 1 * 1 * width * effDepthStem * Math.pow((AstUsedStem * fcVal) / (width * effDepthStem), 1 / 3);
    const phiVucStem = 0.7 * VucStem;
    const stemNeedsShearReo = phiVucStem < VStarStem;

    const stemStirrupDia = BAR_SIZES.find((bs) => bs.label === stemStirrupBar)?.dia ?? 12;
    const AsvUsedStem = barArea(stemStirrupDia) * 2;
    const VusStem = (VStarStem - phiVucStem) / 0.7;
    const thetaV = 30 + 15 * ((VStarStem - 0.5 * phiVucStem) / (phiVmaxStem - 0.5 * phiVucStem || 1));
    const thetaVRad = (thetaV * Math.PI) / 180;
    const spacingStem = num(stemStirrupSpacing);
    const AsvReqStem = (VusStem * spacingStem) / (fsyS * (1 / Math.tan(thetaVRad)) * effDepthStem);
    const stemShearReoOk = AsvUsedStem >= AsvReqStem;

    // Toe (base) — cantilevers length b from the stem face, x measured from the stem face.
    // Pressure at the stem face (from the toe side) is the bearing pressure at distance g from the toe edge.
    const effDepthBase = d * 1000 - coverMm;
    const pressureAtStemFaceToe = bearingAtG; // qmin + (qmax-qmin)*(g/c)
    const VuToe = 0.5 * (qmax + pressureAtStemFaceToe) * b - b * d * gConc;
    const MToe = (pressureAtStemFaceToe * b * b) / 2 + ((qmax - pressureAtStemFaceToe) * b * b) / 3 - (d * gConc * b * b) / 2;
    const AstReqToe = rhoDesign * effDepthBase * width;
    const baseBarDia = BAR_SIZES.find((bs) => bs.label === baseBar)?.dia ?? 12;
    const baseBars = Math.max(0, num(baseCount));
    const AstUsedToe = barArea(baseBarDia) * baseBars;
    const toeAstOk = AstUsedToe >= AstReqToe;
    const betaBase = 1.1 * (1.6 - effDepthBase / 1000);
    const VucToe = betaBase * width * effDepthBase * Math.pow((AstUsedToe * fcVal) / (width * effDepthBase), 1 / 3);
    const phiVucToe = 0.7 * VucToe;
    const toeShearOk = phiVucToe >= VuToe * 1000;
    const rhoToe = AstUsedToe / (effDepthBase * width);
    const MuToe = rhoToe * fsyM * width * effDepthBase * effDepthBase * (1 - 0.6 * rhoToe * (fsyM / fcVal));
    const phiMuToe = 0.8 * MuToe;
    const toeMomentOk = phiMuToe >= MToe * 1e6;

    // Heel — cantilevers length f from the stem face, carrying the retained material weight plus self weight,
    // relieved by the (lower) bearing pressure over that span. x measured from the stem face.
    const pressureAtStemFaceHeel = qmin + (qmax - qmin) * (f / c);
    const VuHeel = materialForce - 0.5 * (qmin + pressureAtStemFaceHeel) * f + d * f * gConc;
    const MHeel = (materialForce * f) / 2 + (d * gConc * f * f) / 2 - ((pressureAtStemFaceHeel * f * f) / 2 + ((qmin - pressureAtStemFaceHeel) * f * f) / 3);
    const AstReqHeel = rhoDesign * effDepthBase * width;
    const heelBarDia = BAR_SIZES.find((bs) => bs.label === heelBar)?.dia ?? 12;
    const heelBars = Math.max(0, num(heelCount));
    const AstUsedHeel = barArea(heelBarDia) * heelBars;
    const heelAstOk = AstUsedHeel >= AstReqHeel;
    const VucHeel = betaBase * width * effDepthBase * Math.pow((AstUsedHeel * fcVal) / (width * effDepthBase), 1 / 3);
    const phiVucHeel = 0.7 * VucHeel;
    const heelShearOk = phiVucHeel >= Math.abs(VuHeel) * 1000;
    const rhoHeel = AstUsedHeel / (effDepthBase * width);
    const MuHeel = rhoHeel * fsyM * width * effDepthBase * effDepthBase * (1 - 0.6 * rhoHeel * (fsyM / fcVal));
    const phiMuHeel = 0.8 * MuHeel;
    const heelMomentOk = phiMuHeel >= Math.abs(MHeel) * 1e6;

    return {
      c, g, aGuide, bGuide, cGuide, dGuide, eGuide,
      Fv, Mv, Fh, Mh, overturningSF, overturningOk,
      eccentricity, qmax, qmin, bearingOk, noTensionOk,
      slidingSF, keyNeeded, requiredKeyDepth, additionalKeyDepth,
      stemTotalThrust, stemMoment, coverMm, effDepthStem, rhoDesign, rhoOk, AstReqStem, MuStem, phiMuStem, stemMomentOk,
      AstUsedStem, stemAstOk, stemSpacing, VmaxOk, VucStem, phiVucStem, stemNeedsShearReo, AsvUsedStem, AsvReqStem, stemShearReoOk,
      effDepthBase, toeShearOk, MToe, AstReqToe, AstUsedToe, toeAstOk, phiMuToe, toeMomentOk,
      heelShearOk, MHeel, AstReqHeel, AstUsedHeel, heelAstOk, phiMuHeel, heelMomentOk
    };
  }, [
    freeHeight, foundationDepth, overloadW, materialWeight, saturatedSoilWeight, waterUnitWeight, frictionAngle, ka,
    bearingCapacity, frictionCoefficient, fc, fsyMain, fsyShear, concreteUnitWeight, frictionAngleFoundation,
    minOverturningSF, minSlidingSF, aDim, bDim, dDim, eDim, fDim, coverClass,
    stemBar, stemCount, stemStirrupBar, stemStirrupSpacing, baseBar, baseCount, heelBar, heelCount
  ]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Cantilever Retaining Wall Calculation", "Value", "Unit"],
      ["Overturning safety factor", r.overturningSF, ""], ["Sliding safety factor", r.slidingSF, ""],
      ["Max bearing pressure, qmax", r.qmax, "kPa"], ["Min bearing pressure, qmin", r.qmin, "kPa"],
      ["Additional key depth required", r.additionalKeyDepth, "m"],
      ["Stem effective depth", r.effDepthStem, "mm"], ["Stem Ast required / used", r.AstReqStem, "mm2 / " + r.AstUsedStem + " mm2"],
      ["Toe Ast required / used", r.AstReqToe, "mm2 / " + r.AstUsedToe + " mm2"],
      ["Heel Ast required / used", r.AstReqHeel, "mm2 / " + r.AstUsedHeel + " mm2"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "cantilever-wall-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">FREE-STANDING RETAINING WALL</p>
    <h1>Cantilever Wall</h1>
    <p className="subtitle">AS3600 design of a free-standing cantilever retaining wall — predimensioning, overturning/sliding stability and stem/toe/heel reinforcement.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Design conditions"><div className="calc-fields">
        <Field label="Free height, h" value={freeHeight} unit="m" onChange={setFreeHeight} />
        <Field label="Depth of foundation" value={foundationDepth} unit="m" onChange={setFoundationDepth} />
        <Field label="Overload, w" value={overloadW} unit="kPa" onChange={setOverloadW} />
        <Field label="Weight of material contained, γ" value={materialWeight} unit="kN/m³" onChange={setMaterialWeight} />
        <Field label="Saturated unit weight of soil" value={saturatedSoilWeight} unit="kN/m³" onChange={setSaturatedSoilWeight} />
        <Field label="Unit weight of water" value={waterUnitWeight} unit="kN/m³" onChange={setWaterUnitWeight} />
        <Field label="Angle of internal friction, φ" value={frictionAngle} unit="°" onChange={setFrictionAngle} />
        <Field label="Active pressure factor, Ka" value={ka} onChange={setKa} />
        <Field label="Bearing capacity" value={bearingCapacity} unit="kPa" onChange={setBearingCapacity} />
        <Field label="Passive resistance factor" value={frictionCoefficient} hint="Used in the key design formula" onChange={setFrictionCoefficient} />
        <Select label="Concrete strength, f'c" value={fc} options={FC_OPTIONS} onChange={setFc} />
        <Field label="Steel yield strength, fsy (main)" value={fsyMain} unit="MPa" onChange={setFsyMain} />
        <Field label="Steel yield strength, fsy (shear)" value={fsyShear} unit="MPa" onChange={setFsyShear} />
        <Field label="Unit weight of concrete" value={concreteUnitWeight} unit="kN/m³" onChange={setConcreteUnitWeight} />
        <Field label="Friction angle, concrete-foundation, δ" value={frictionAngleFoundation} unit="°" onChange={setFrictionAngleFoundation} />
        <Field label="Minimum overturning safety factor" value={minOverturningSF} onChange={setMinOverturningSF} />
        <Field label="Minimum sliding safety factor" value={minSlidingSF} hint="ANCOLD recommends 3" onChange={setMinSlidingSF} />
      </div></Section>
      <Section number={2} title="Predimensioning"><div className="calc-fields">
        <Field label="a — stem thickness" value={aDim} unit="m" hint={r ? `Guidance: h/24 ≈ ${fmt(r.aGuide, 3)} m` : "Guidance: h/24"} onChange={setADim} />
        <Field label="b — toe length" value={bDim} unit="m" hint={r ? `Guidance: c/3 ≈ ${fmt(r.bGuide, 3)} m` : "Guidance: c/3"} onChange={setBDim} />
        <Field label="d — base thickness" value={dDim} unit="m" hint={r ? `Guidance: h/12 ≈ ${fmt(r.dGuide, 3)} m` : "Guidance: h/12"} onChange={setDDim} />
        <Field label="e — stem thickness at base" value={eDim} unit="m" hint={r ? `Guidance: h/12 ≈ ${fmt(r.eGuide, 3)} m` : "Guidance: h/12"} onChange={setEDim} />
        <Field label="f — heel length" value={fDim} unit="m" onChange={setFDim} />
        <Select label="Exposure classification" value={coverClass} options={Object.keys(COVER_TABLE)} onChange={setCoverClass} />
      </div>
      {r && <div className="check-row"><span className="pass">Base width, c = b+e+f = {fmt(r.c, 2)} m</span><span className="pass">g = f+e = {fmt(r.g, 2)} m</span></div>}
      <p className="engine-note">Dimensions follow the source workbook&apos;s lettered predimensioning convention. Guidance values are standard starting-point proportions of the free height, h — adopt and refine your own a-f values.</p></Section>
      <Section number={3} title="Stem reinforcement"><ReinforcementFields title="Main" barId={stemBar} setBarId={setStemBar} count={stemCount} setCount={setStemCount} />
        <div className="calc-fields"><Select label="Shear ligature bar size" value={stemStirrupBar} options={BAR_SIZES.map((b) => b.label)} onChange={setStemStirrupBar} /><Field label="Stirrup spacing" value={stemStirrupSpacing} unit="mm" onChange={setStemStirrupSpacing} /></div></Section>
      <Section number={4} title="Toe (base) reinforcement"><ReinforcementFields title="Toe" barId={baseBar} setBarId={setBaseBar} count={baseCount} setCount={setBaseCount} /></Section>
      <Section number={5} title="Heel reinforcement"><ReinforcementFields title="Heel" barId={heelBar} setBarId={setHeelBar} count={heelCount} setCount={setHeelCount} /></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Overturning safety factor</span><strong>{r ? fmt(r.overturningSF, 2) : "—"}</strong></div>
      {r && <><div className="check-row">
        <span className={r.overturningOk ? "pass" : "fail"}>{r.overturningOk ? "✓ Overturning SF adequate" : "✕ Overturning SF too low"}</span>
        <span className={r.bearingOk ? "pass" : "fail"}>{r.bearingOk ? "✓ Bearing pressure OK" : "✕ Bearing capacity exceeded"}</span>
        <span className={r.noTensionOk ? "pass" : "warn"}>{r.noTensionOk ? "✓ No tension under footing" : "! Tension under footing (qmin < 0)"}</span>
        <span className={!r.keyNeeded ? "pass" : "warn"}>{!r.keyNeeded ? "✓ Sliding SF adequate — no key needed" : "! Sliding SF low — shear key required"}</span>
      </div>
      <h3 className="result-section-title">Stability</h3>
      <Metric name="Bearing pressure, qmax / qmin" value={fmt(r.qmax, 1) + " / " + fmt(r.qmin, 1) + " kPa"} />
      <Metric name="Sliding safety factor" value={fmt(r.slidingSF, 2)} />
      {r.keyNeeded && <Metric name="Additional key depth required" value={fmt(r.additionalKeyDepth, 2) + " m"} />}
      <h3 className="result-section-title">Stem</h3>
      <div className="check-row">
        <span className={r.rhoOk ? "pass" : "fail"}>{r.rhoOk ? "✓ ρ ≥ ρmin" : "✕ ρ below minimum"}</span>
        <span className={r.stemAstOk ? "pass" : "fail"}>{r.stemAstOk ? "✓ Ast adequate" : "✕ Ast insufficient"}</span>
        <span className={r.stemMomentOk ? "pass" : "fail"}>{r.stemMomentOk ? "✓ Moment capacity OK" : "✕ Moment capacity exceeded"}</span>
        <span className={r.VmaxOk ? "pass" : "fail"}>{r.VmaxOk ? "✓ Below Vmax" : "✕ Exceeds Vmax — resize"}</span>
        <span className={!r.stemNeedsShearReo || r.stemShearReoOk ? "pass" : "fail"}>{!r.stemNeedsShearReo ? "✓ No shear reo required" : r.stemShearReoOk ? "✓ Shear reo adequate" : "✕ Shear reo insufficient"}</span>
      </div>
      <Metric name="Effective depth" value={fmt(r.effDepthStem, 0) + " mm"} />
      <Metric name="Ast required / used" value={fmt(r.AstReqStem, 0) + " / " + fmt(r.AstUsedStem, 0) + " mm²"} />
      <Metric name="Bar spacing" value={fmt(r.stemSpacing, 0) + " mm"} />
      <Metric name="φMu / M*" value={fmt(r.phiMuStem / 1e6, 1) + " / " + fmt(r.stemMoment, 1) + " kNm"} />
      <h3 className="result-section-title">Toe</h3>
      <div className="check-row"><span className={r.toeShearOk ? "pass" : "fail"}>{r.toeShearOk ? "✓ Shear OK" : "✕ Shear exceeded"}</span><span className={r.toeAstOk ? "pass" : "fail"}>{r.toeAstOk ? "✓ Ast adequate" : "✕ Ast insufficient"}</span><span className={r.toeMomentOk ? "pass" : "fail"}>{r.toeMomentOk ? "✓ Moment OK" : "✕ Moment exceeded"}</span></div>
      <Metric name="Ast required / used" value={fmt(r.AstReqToe, 0) + " / " + fmt(r.AstUsedToe, 0) + " mm²"} />
      <Metric name="φMu / M*" value={fmt(r.phiMuToe / 1e6, 1) + " / " + fmt(r.MToe, 1) + " kNm"} />
      <h3 className="result-section-title">Heel</h3>
      <div className="check-row"><span className={r.heelShearOk ? "pass" : "fail"}>{r.heelShearOk ? "✓ Shear OK" : "✕ Shear exceeded"}</span><span className={r.heelAstOk ? "pass" : "fail"}>{r.heelAstOk ? "✓ Ast adequate" : "✕ Ast insufficient"}</span><span className={r.heelMomentOk ? "pass" : "fail"}>{r.heelMomentOk ? "✓ Moment OK" : "✕ Moment exceeded"}</span></div>
      <Metric name="Ast required / used" value={fmt(r.AstReqHeel, 0) + " / " + fmt(r.AstUsedHeel, 0) + " mm²"} />
      <Metric name="φMu / M*" value={fmt(r.phiMuHeel / 1e6, 1) + " / " + fmt(r.MHeel, 1) + " kNm"} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only, ported from the source workbook. The workbook&apos;s moment-capacity formulas appeared to omit the design-strip width term (giving implausibly small capacities); this tool applies it explicitly (b = 1000 mm) for a physically consistent AS3600 check. Confirm all geometry, loads and reinforcement against the source workbook and independent structural review before issue.</p></>}
    </aside></div>
  </div>;
}
