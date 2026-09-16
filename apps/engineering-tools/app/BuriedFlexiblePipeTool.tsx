"use client";

import { useMemo, useState } from "react";

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

  const r = useMemo(() => {
    const De = num(outsideDiameter), tMm = num(wallThickness), n = num(poissonsRatio), EbL = num(ringBendingModulus);
    const En = num(nativeSoilModulus), H = num(coverHeight), Ee = num(embedmentSoilModulus), B = num(trenchWidth),
      Hw = num(waterTableHeight), gL = num(liquidUnitWeight), g = num(backfillWeight), rs = num(soilParticleDensity),
      wgs = num(deadLoad), wq = num(vehicleLoad);
    const dyAllPct = num(allowableDeflection), K = num(beddingConstant), ebAll = num(allowableStrain), Fs = num(bucklingSafetyFactor);
    const inputs = [De, tMm, n, EbL, En, H, Ee, B, Hw, gL, g, rs, wgs, wq, dyAllPct, K, ebAll, Fs];
    if (!inputs.every((v) => Number.isFinite(v)) || De <= 0 || tMm <= 0 || Fs <= 0) return null;
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
    const qAll = H > 0.5 ? Math.max(qAllPipeAlone, qAllPipeEmbed) : qAllPipeAlone;
    const qPredicted =
      H >= Hw
        ? g * (H - Hw) + (gL + gSub) * (De / 2 + Hw) + (wgs + wq)
        : gL * (De / 2 + Hw) + gSub * (De / 2 + H) + (wgs + wq);
    const bucklingOk = qAllPipeEmbed > qPredicted;

    return {
      I, SDL, bOverDe, eeOverEn, designFactorDf, leonhardtZ, combinedModulus, hydrostaticLoad, soilLoad,
      dyOverDPct, deflectionOk, shapeFactor, bendingStrain, strengthOk, gSub, qAllPipeAlone, qAllPipeEmbed, qAll, qPredicted, bucklingOk
    };
  }, [
    outsideDiameter, wallThickness, poissonsRatio, ringBendingModulus, nativeSoilModulus, coverHeight, embedmentSoilModulus,
    trenchWidth, waterTableHeight, liquidUnitWeight, backfillWeight, soilParticleDensity, deadLoad, vehicleLoad,
    allowableDeflection, beddingConstant, allowableStrain, bucklingSafetyFactor
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
      ["Allowable buckling pressure - pipe/embedment", r.qAllPipeEmbed, "kPa"], ["Predicted buckling pressure, qb", r.qPredicted, "kPa"]
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
      <Section number={1} title="Pipe specification"><div className="calc-fields">
        <Field label="Outside diameter, De" value={outsideDiameter} unit="m" onChange={setOutsideDiameter} />
        <Field label="Wall thickness, t" value={wallThickness} unit="mm" onChange={setWallThickness} />
        <Field label="Poisson's ratio, n" value={poissonsRatio} hint="AS2566.1 Table 2.1" onChange={setPoissonsRatio} />
        <Field label="Long term ring bending modulus, EbL" value={ringBendingModulus} unit="MPa" hint="AS2566.1 Table 2.1" onChange={setRingBendingModulus} />
      </div></Section>
      <Section number={2} title="Embedment and loads"><div className="calc-fields">
        <Field label="Native soil modulus, E'n" value={nativeSoilModulus} unit="MPa" hint="AS2566.1 Table 3.2" onChange={setNativeSoilModulus} />
        <Field label="Cover height, H" value={coverHeight} unit="m" onChange={setCoverHeight} />
        <Field label="Embedment soil modulus, E'e" value={embedmentSoilModulus} unit="MPa" hint="AS2566.1 Table 3.2" onChange={setEmbedmentSoilModulus} />
        <Field label="Minimum trench width, B" value={trenchWidth} unit="m" hint="AS2566.1 Figure 3.1" onChange={setTrenchWidth} />
        <Field label="Water table height above pipe, Hw" value={waterTableHeight} unit="m" onChange={setWaterTableHeight} />
        <Field label="Unit weight of liquid external to pipe, γL" value={liquidUnitWeight} unit="kN/m³" onChange={setLiquidUnitWeight} />
        <Field label="Backfill specific weight, γ" value={backfillWeight} unit="kN/m³" onChange={setBackfillWeight} />
        <Field label="Soil particle specific density, ρs" value={soilParticleDensity} onChange={setSoilParticleDensity} />
        <Field label="Superimposed dead load, wgs" value={deadLoad} unit="kPa" hint="Uniformly distributed" onChange={setDeadLoad} />
        <Field label="Vehicle load intensity, wq" value={vehicleLoad} unit="kPa" hint="AS2566.1 Figure 4.1" onChange={setVehicleLoad} />
      </div></Section>
      <Section number={3} title="Allowable criteria"><div className="calc-fields">
        <Field label="Allowable long-term vertical deflection, Δy(all)/D" value={allowableDeflection} unit="%" hint="AS2566.1 Table 2.1 — 4% pressure, 7.5% gravity" onChange={setAllowableDeflection} />
        <Field label="Bedding constant, K" value={beddingConstant} hint="AS2566.1 §5.2" onChange={setBeddingConstant} />
        <Field label="Allowable long-term bending strain, eb(all)" value={allowableStrain} unit="%" hint="AS2566.1 Table 2.1" onChange={setAllowableStrain} />
        <Field label="Minimum buckling factor of safety, Fs" value={bucklingSafetyFactor} hint="AS2566.1 §5.4 — long term installation" onChange={setBucklingSafetyFactor} />
      </div></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Long-term vertical deflection, Δy/D</span><strong>{r ? fmt(r.dyOverDPct, 2) : "—"}<small>%</small></strong></div>
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
      <Metric name="Predicted buckling pressure, qb" value={fmt(r.qPredicted, 1) + " kPa"} />
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only. Confirm pipe stiffness class, soil parameters, cover and groundwater assumptions against project geotechnical advice and AS2566.1 before issue.</p></>}
    </aside></div>
  </div>;
}
