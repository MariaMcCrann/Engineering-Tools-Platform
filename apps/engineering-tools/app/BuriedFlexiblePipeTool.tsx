"use client";

import { useMemo, useState } from "react";

const pipeWalls: Record<string, (number | null)[]> = {"16": [1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.675, 1.875, 2.325], "20": [1.65, 1.65, 1.65, 1.65, 1.65, 1.675, 1.975, 2.425, 2.925], "25": [1.65, 1.65, 1.65, 1.65, 1.675, 1.975, 2.425, 2.925, 3.675], "32": [1.65, 1.65, 1.65, 1.675, 1.975, 2.525, 3.025, 3.775, 4.625], "40": [1.65, 1.65, 1.95, 1.95, 2.5, 3.1, 3.85, 4.7, 5.75], "50": [1.65, 1.65, 2.05, 2.475, 3.075, 3.825, 4.8, 5.825, 7.175], "63": [1.65, 2, 2.45, 3.05, 3.9, 4.85, 6, 8, 8.95], "75": [1.9, 2.325, 2.925, 3.675, 4.625, 5.675, 7.025, 9.4, 10.725], "90": [2.25, 2.775, 3.525, 4.375, 5.525, 6.775, 8.475, 11.3, 12.775], "110": [2.65, 3.4, 4.35, 5.4, 6.75, 8.35, 10.3, 12.75, 15.7], "125": [3.05, 3.85, 4.8, 6.05, 7.55, 9.45, 11.75, 14.45, 17.75], "140": [3.425, 4.275, 5.425, 6.775, 8.475, 10.575, 13.075, 16.225, 19.925], "160": [3.875, 4.825, 6.225, 7.775, 9.675, 12.075, 15.025, 18.475, 22.675], "180": [4.275, 5.425, 6.875, 8.45, 10.875, 13.625, 16.875, 20.775, 25.475], "200": [4.75, 6.15, 7.7, 9.7, 12.1, 14.975, 18.75, 23.15, 28.3], "225": [5.325, 6.775, 8.575, 10.875, 13.625, 16.975, 21.075, 25.925, 31.875], "250": [6.025, 7.575, 9.575, 11.975, 15.025, 18.825, 23.325, 28.775, 35.425], "280": [6.65, 8.45, 10.65, 13.5, 16.85, 21.05, 26.1, 32.3, 39.65], "315": [7.425, 9.525, 12.075, 15.075, 19.225, 23.725, 29.375, 36.325, 44.475], "355": [8.4, 10.7, 13.55, 17, 21.45, 26.7, 33.1, 40.85, 50.2], "400": [10, 12.1, 15.25, 19.25, 24.05, 30.05, 37.3, 46.1, 56.5], "450": [10.575, 13.525, 17.125, 21.625, 27.075, 33.825, 41.975, 51.775, 63.625], "500": [11.875, 15.025, 19.025, 24.025, 30.025, 37.575, 46.625, 57.525, 57.65], "560": [13.175, 16.875, 21.275, 26.825, 33.675, 42.075, 52.125, 64.85, null], "630": [14.825, 18.925, 23.975, 30.125, 37.825, 47.275, 58.725, 72.95, null], "710": [16.75, 21.35, 27.05, 34.05, 42.7, 53.3, 66.2, 81.75, null], "800": [18.85, 24, 30.4, 38.3, 48.05, 60, 74.5, 92.05, null], "900": [21.125, 27.025, 34.175, 43.075, 54.175, 67.575, 83.825, null, null], "1000": [23.55, 29.95, 37.95, 47.9, 60.1, 73.95, 92.55, null, null], "1200": [28.45, 36.1, 45.75, 57.65, 68.6475, 89.9975, null, null, null], "1400": [33.7, 42.6, 53.45, 66.95, 83.4475, 104.95, null, null, null], "1600": [38.85, 49, 61.95, 76.5, 95.2975, 119.95, null, null, null], "1800": [42, 53.25, 68.75, 86, 107.1975, null, null, null, null], "2000": [46.8, 59.2, 76.3, 95.55, 119.0475, null, null, null, null]};
const sdrs = [41, 33, 26, 21, 17, 13.6, 11, 9, 7.4];
const pressureClasses: Record<string, string[]> = { PE80: ["PN3.2", "PN4", "", "PN6.3", "PN8", "PN10", "PN12.5", "PN16", "PN20"], PE100: ["PN4", "", "PN6.3", "PN8", "PN10", "PN12.5", "PN16", "PN20", "PN24"] };

const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

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

export function BuriedFlexiblePipeTool() {
  const [automatic, setAutomatic] = useState(true);
  const [diameter, setDiameter] = useState("560");
  const [material, setMaterial] = useState("PE100");
  const [classIndex, setClassIndex] = useState(3);
  const [pressureService, setPressureService] = useState(false);
  const [groundwaterAtSurface, setGroundwaterAtSurface] = useState(true);
  const [minimumTrench, setMinimumTrench] = useState(true);
  const [outsideDiameter, setOutsideDiameter] = useState("0.25035");
  const [wallThickness, setWallThickness] = useState("7.2");
  const [poissonsRatio, setPoissonsRatio] = useState("0.38");
  const [ringBendingModulus, setRingBendingModulus] = useState("1400");

  const [nativeSoilModulus, setNativeSoilModulus] = useState("3");
  const [coverHeight, setCoverHeight] = useState("6.05");
  const [embedmentSoilModulus, setEmbedmentSoilModulus] = useState("5");
  const [trenchWidth, setTrenchWidth] = useState("0.55");
  const [waterTableHeight, setWaterTableHeight] = useState("6.05");
  const [liquidUnitWeight, setLiquidUnitWeight] = useState("10");
  const [backfillWeight, setBackfillWeight] = useState("21");
  const [soilParticleDensity, setSoilParticleDensity] = useState("2.65");
  const [deadLoad, setDeadLoad] = useState("0");
  const [vehicleLoad, setVehicleLoad] = useState("4.1");

  const [allowableDeflection, setAllowableDeflection] = useState("7.5");
  const [beddingConstant, setBeddingConstant] = useState("0.1");
  const [allowableStrain, setAllowableStrain] = useState("1");
  const [bucklingSafetyFactor, setBucklingSafetyFactor] = useState("2.5");

  const selectedWall = pipeWalls[diameter]?.[classIndex];
  const effectiveDiameter = automatic ? String(Number(diameter) / 1000) : outsideDiameter;
  const effectiveWall = automatic ? String(selectedWall ?? NaN) : wallThickness;
  const effectiveModulus = automatic ? (material === "PE100" ? "260" : "200") : ringBendingModulus;
  const effectivePoisson = automatic ? "0.4" : poissonsRatio;
  const effectiveStrain = automatic ? "4" : allowableStrain;
  const effectiveDeflection = automatic ? (pressureService ? "4" : "7.5") : allowableDeflection;
  const deMm = Number(effectiveDiameter) * 1000;
  // Workbook spring-line clearance bands; use the next band at each boundary.
  const clearance = deMm < 160 ? 100 : deMm < 300 ? 150 : deMm < 450 ? 200 : deMm < 900 ? 300 : deMm <= 1500 ? 350 : deMm * 0.25;
  const effectiveTrench = minimumTrench ? String((deMm + 2 * clearance) / 1000) : trenchWidth;
  const effectiveWater = groundwaterAtSurface ? coverHeight : waterTableHeight;

  const r = useMemo(() => {
    const De = num(effectiveDiameter), tMm = num(effectiveWall), n = num(effectivePoisson), EbL = num(effectiveModulus);
    const En = num(nativeSoilModulus), H = num(coverHeight), Ee = num(embedmentSoilModulus), B = num(effectiveTrench),
      Hw = num(effectiveWater), gL = num(liquidUnitWeight), g = num(backfillWeight), rs = num(soilParticleDensity),
      wgs = num(deadLoad), wq = num(vehicleLoad);
    const dyAllPct = num(effectiveDeflection), K = num(beddingConstant), ebAll = num(effectiveStrain), Fs = num(bucklingSafetyFactor);
    const inputs = [De, tMm, n, EbL, En, H, Ee, B, Hw, gL, g, rs, wgs, wq, dyAllPct, K, ebAll, Fs];
    if (!inputs.every((v) => Number.isFinite(v)) || De <= 0 || tMm <= 0 || Fs <= 0 || tMm * 2 >= De * 1000 || En <= 0 || Ee <= 0 || EbL <= 0 || B < De || H < 0 || Hw < 0 || n < 0 || n >= 0.5 || g <= 0 || gL <= 0 || rs <= 1 || wgs < 0 || wq < 0 || K <= 0 || dyAllPct <= 0 || ebAll <= 0) return null;
    const t = tMm / 1000;

    const I = Math.pow(t, 3) / 12;
    const SDL = (EbL * I * 1000000) / Math.pow(De - t, 3);

    const bOverDe = B / De;
    const eeOverEn = Ee / En;
    const designFactorDf = Math.min((bOverDe - 1) / (1.154 + 0.444 * (bOverDe - 1)), 1.44);
    const leonhardtZ = 1.44 / (designFactorDf + (1.44 - designFactorDf) * eeOverEn);
    const combinedModulus = leonhardtZ * Ee;

    const hydrostaticLoad = 9.8 * Hw;
    const soilLoad = g * H;

    const dyOverD = (K * 0.001 * (soilLoad + wq + wgs)) / (8 * 0.000001 * SDL + 0.061 * combinedModulus);
    const dyOverDPct = dyOverD * 100;
    const deflectionOk = dyOverDPct < dyAllPct;

    const shapeFactor = (3.33e-6 * (SDL / combinedModulus) + 0.00136) / (1.11e-6 * (SDL / combinedModulus) + 0.000151);
    const bendingStrain = shapeFactor * dyOverD * (t / (De - t)) * 100;
    const strengthOk = bendingStrain < ebAll;

    const gSub = ((rs - 1) / rs) * g;
    const qAllPipeAlone = ((1 / Fs) * 24 * SDL) / 1000 / (1 - n * n);
    const qAllPipeEmbed = Math.pow(SDL / 1000000, 1 / 3) * Math.pow(combinedModulus, 2 / 3) * (1000 / Fs);
    const qAll = H >= 0.5 ? Math.max(qAllPipeAlone, qAllPipeEmbed) : qAllPipeAlone;
    const qPredicted =
      H >= Hw
        ? g * (H - Hw) + (gL + gSub) * (De / 2 + Hw) + (wgs + wq)
        : gL * (De / 2 + Hw) + gSub * (De / 2 + H) + (wgs + wq);
    const bucklingOk = qAll > qPredicted;

    return {
      I, SDL, bOverDe, eeOverEn, designFactorDf, leonhardtZ, combinedModulus, hydrostaticLoad, soilLoad,
      dyOverDPct, deflectionOk, shapeFactor, bendingStrain, strengthOk, gSub, qAllPipeAlone, qAllPipeEmbed, qAll, qPredicted, bucklingOk
    };
  }, [
    effectiveDiameter, effectiveWall, effectivePoisson, effectiveModulus, nativeSoilModulus, coverHeight, embedmentSoilModulus,
    effectiveTrench, effectiveWater, liquidUnitWeight, backfillWeight, soilParticleDensity, deadLoad, vehicleLoad,
    effectiveDeflection, beddingConstant, effectiveStrain, bucklingSafetyFactor
  ]);

  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ["Buried Flexible Pipe Structural Design (AS2566.1)", "Value", "Unit"],
      ["Second moment of area, I", r.I, "m4/m"], ["Long term ring-bending stiffness, SDL", r.SDL, "N/m/m"],
      ["B/De", r.bOverDe, ""], ["Ee/En", r.eeOverEn, ""], ["Design factor, Df", r.designFactorDf, ""], ["Leonhardt factor, z", r.leonhardtZ, ""],
      ["Effective combined soil modulus, E'", r.combinedModulus, "MPa"],
      ["Hydrostatic load", r.hydrostaticLoad, "kPa"], ["Soil loading, wg", r.soilLoad, "kPa"],
      ["Deflection, Dy/D", r.dyOverDPct, "%"], ["Shape factor", r.shapeFactor, ""], ["Bending strain, eb", r.bendingStrain, "%"],
      ["Submerged unit weight, gsub", r.gSub, "kN/m3"], ["Allowable buckling pressure - pipe alone", r.qAllPipeAlone, "kPa"],
      ["Allowable buckling pressure - pipe/embedment", r.qAllPipeEmbed, "kPa"], ["Selected allowable buckling pressure", r.qAll, "kPa"], ["Predicted buckling pressure, qb", r.qPredicted, "kPa"]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "buried-flexible-pipe-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">BURIED FLEXIBLE PIPELINES — STRUCTURAL DESIGN</p>
    <h1>Buried Flexible Pipe</h1>
    <p className="subtitle">Deflection, strength and buckling checks for a buried flexible pipe, refer AS2566.1:1998.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Pipe specification">
        <label><input type="checkbox" checked={automatic} onChange={e => setAutomatic(e.target.checked)} /> Select HDPE pipe from spreadsheet catalogue</label>
        {automatic && <div className="calc-fields">
          <label className="calc-field"><span>Outside diameter (mm)</span><select value={diameter} onChange={e => setDiameter(e.target.value)}>{Object.keys(pipeWalls).map(d => <option key={d}>{d}</option>)}</select></label>
          <label className="calc-field"><span>Material</span><select value={material} onChange={e => setMaterial(e.target.value)}><option>PE100</option><option>PE80</option></select></label>
          <label className="calc-field"><span>Pipe class / SDR</span><select value={classIndex} onChange={e => setClassIndex(Number(e.target.value))}>{sdrs.map((sdr, i) => <option key={sdr} value={i} disabled={pipeWalls[diameter][i] == null}>SDR {sdr}{pressureClasses[material][i] ? ` / ${pressureClasses[material][i]}` : ""}</option>)}</select></label>
          <label><input type="checkbox" checked={pressureService} onChange={e => setPressureService(e.target.checked)} /> Pressure pipe (4% deflection limit)</label>
          <Metric name="Wall thickness — workbook catalogue" value={fmt(Number(effectiveWall), 3) + " mm"} />
          <Metric name="Long-term modulus" value={effectiveModulus + " MPa"} />
          <Metric name="Poisson’s ratio / allowable bending strain" value="0.4 / 4%" />
        </div>}
        {!automatic && <div className="calc-fields">
        <Field label="Outside diameter, De" value={outsideDiameter} unit="m" onChange={setOutsideDiameter} />
        <Field label="Wall thickness, t" value={wallThickness} unit="mm" onChange={setWallThickness} />
        <Field label="Poisson's ratio, n" value={poissonsRatio} hint="AS2566.1 Table 2.1" onChange={setPoissonsRatio} />
        <Field label="Long term ring bending modulus, EbL" value={ringBendingModulus} unit="MPa" hint="AS2566.1 Table 2.1" onChange={setRingBendingModulus} />
      </div>}</Section>
      <Section number={2} title="Embedment and loads"><div className="calc-fields">
        <Field label="Native soil modulus, E'n" value={nativeSoilModulus} unit="MPa" hint="AS2566.1 Table 3.2" onChange={setNativeSoilModulus} />
        <Field label="Cover height, H" value={coverHeight} unit="m" onChange={setCoverHeight} />
        <Field label="Embedment soil modulus, E'e" value={embedmentSoilModulus} unit="MPa" hint="AS2566.1 Table 3.2" onChange={setEmbedmentSoilModulus} />
        <label><input type="checkbox" checked={minimumTrench} onChange={e => setMinimumTrench(e.target.checked)} /> Calculate minimum trench width from diameter</label>
        {minimumTrench ? <Metric name="Calculated minimum trench width" value={fmt(Number(effectiveTrench)) + " m"} /> : <Field label="Actual trench width, B" value={trenchWidth} unit="m" hint="AS2566.1 Figure 3.1" onChange={setTrenchWidth} />}
        <label><input type="checkbox" checked={groundwaterAtSurface} onChange={e => setGroundwaterAtSurface(e.target.checked)} /> Groundwater at ground surface (Hw = cover)</label>
        {groundwaterAtSurface ? <Metric name="Groundwater height above crown" value={fmt(Number(effectiveWater)) + " m"} /> : <Field label="Water table height above crown, Hw" value={waterTableHeight} unit="m" onChange={setWaterTableHeight} />}
        <Field label="Unit weight of liquid external to pipe, γL" value={liquidUnitWeight} unit="kN/m³" onChange={setLiquidUnitWeight} />
        <Field label="Backfill specific weight, γ" value={backfillWeight} unit="kN/m³" onChange={setBackfillWeight} />
        <Field label="Soil particle specific density, ρs" value={soilParticleDensity} onChange={setSoilParticleDensity} />
        <Field label="Superimposed dead load, wgs" value={deadLoad} unit="kPa" hint="Uniformly distributed" onChange={setDeadLoad} />
        <Field label="Vehicle load intensity, wq" value={vehicleLoad} unit="kPa" hint="AS2566.1 Figure 4.1" onChange={setVehicleLoad} />
      </div></Section>
      <Section number={3} title="Allowable criteria"><div className="calc-fields">
        {automatic ? <Metric name="Allowable long-term deflection" value={effectiveDeflection + " %"} /> : <Field label="Allowable long-term vertical deflection, Δy(all)/D" value={allowableDeflection} unit="%" hint="AS2566.1 Table 2.1 — 4% pressure, 7.5% gravity" onChange={setAllowableDeflection} />}
        <Field label="Bedding constant, K" value={beddingConstant} hint="AS2566.1 §5.2" onChange={setBeddingConstant} />
        {automatic ? <Metric name="Allowable long-term bending strain" value="4 %" /> : <Field label="Allowable long-term bending strain, eb(all)" value={allowableStrain} unit="%" hint="AS2566.1 Table 2.1" onChange={setAllowableStrain} />}
        <Field label="Minimum buckling factor of safety, Fs" value={bucklingSafetyFactor} hint="AS2566.1 §5.4 — long term installation" onChange={setBucklingSafetyFactor} />
      </div></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Long-term vertical deflection, Δy/D</span><strong>{r ? fmt(r.dyOverDPct, 2) : "—"}<small>%</small></strong></div>
      {!r && <p role="alert">Enter valid inputs. Select an available pipe class; soil moduli must be positive and trench width must be at least the outside diameter.</p>}
      {r && <><div className="check-row">
        <span className={r.deflectionOk ? "pass" : "fail"}>{r.deflectionOk ? "✓ Deflection satisfactory" : "✕ Deflection too high"}</span>
        <span className={r.strengthOk ? "pass" : "fail"}>{r.strengthOk ? "✓ Bending strain satisfactory" : "✕ Bending strain too high"}</span>
        <span className={r.bucklingOk ? "pass" : "fail"}>{r.bucklingOk ? "✓ Buckling satisfactory" : "✕ Failed in buckling"}</span>
      </div>
      <h3 className="result-section-title">Stiffness</h3>
      <Metric name="Second moment of area, I" value={fmt(r.I, 9) + " m⁴/m"} /><Metric name="Ring-bending stiffness, SDL" value={fmt(r.SDL, 1) + " N/m/m"} />
      <h3 className="result-section-title">Soil support</h3>
      <Metric name="B/De" value={fmt(r.bOverDe, 3)} /><Metric name="Ee/En" value={fmt(r.eeOverEn, 3)} /><Metric name="Design factor, Df" value={fmt(r.designFactorDf, 3)} />
      <Metric name="Leonhardt factor, z" value={fmt(r.leonhardtZ, 3)} /><Metric name="Effective combined soil modulus, E'" value={fmt(r.combinedModulus, 3) + " MPa"} />
      <h3 className="result-section-title">Deflection and strength</h3>
      <Metric name="Soil loading, wg" value={fmt(r.soilLoad, 2) + " kPa"} /><Metric name="Shape factor" value={fmt(r.shapeFactor, 3)} /><Metric name="Bending strain, eb" value={fmt(r.bendingStrain, 3) + " %"} />
      <h3 className="result-section-title">Buckling</h3>
      <Metric name="Submerged unit weight, γsub" value={fmt(r.gSub, 2) + " kN/m³"} />
      <Metric name="Allowable — pipe alone" value={fmt(r.qAllPipeAlone, 1) + " kPa"} /><Metric name="Allowable — pipe/embedment" value={fmt(r.qAllPipeEmbed, 1) + " kPa"} />
      <Metric name="Selected allowable buckling pressure" value={fmt(r.qAll, 1) + " kPa"} />
      <Metric name="Predicted buckling pressure, qb" value={fmt(r.qPredicted, 1) + " kPa"} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm pipe stiffness class, soil parameters, cover and groundwater assumptions against project geotechnical advice and AS2566.1 before issue.</p></>}
    </aside></div>
  </div>;
}
