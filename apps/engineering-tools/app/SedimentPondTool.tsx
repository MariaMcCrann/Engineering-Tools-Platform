"use client";

import { useMemo, useState } from "react";

const num = (v: string) => Number(v);
const fmt = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

// Settling velocity, m/s (Wetland Design Manual / WSUD Stormwater Technical Manual)
const SEDIMENT_TARGETS: { label: string; vs: number }[] = [
  { label: "Very coarse sand", vs: 200 / 1000 }, { label: "Coarse sand", vs: 100 / 1000 },
  { label: "Medium sand", vs: 53 / 1000 }, { label: "Fine sand", vs: 26 / 1000 },
  { label: "Very fine sand", vs: 11 / 1000 }, { label: "Coarse silt", vs: 2.3 / 1000 },
  { label: "Medium silt", vs: 0.66 / 1000 }, { label: "Fine silt", vs: 0.18 / 1000 },
  { label: "Very fine silt", vs: 0.04 / 1000 }, { label: "Clay", vs: 0.011 / 1000 }
];

type StageRow = { stage: number; storage: number; area: number; length: number; width: number };
function buildStageStorage(bottomLength: number, bottomWidth: number, sideSlope: number, maxStage: number, increment: number): StageRow[] {
  const sideLenPerIncrement = increment * sideSlope;
  const rows: StageRow[] = [{ stage: 0, storage: 0, area: bottomLength * bottomWidth, length: bottomLength, width: bottomWidth }];
  let stage = 0;
  while (stage < maxStage - 1e-9) {
    const prev = rows[rows.length - 1];
    const nextStage = Math.min(Math.round((stage + increment) * 100) / 100, maxStage);
    const length = prev.length + 2 * sideLenPerIncrement;
    const width = prev.width + 2 * sideLenPerIncrement;
    const area = (bottomLength + 2 * nextStage * sideSlope) * (bottomWidth + 2 * nextStage * sideSlope);
    const storage = prev.storage + prev.area * increment + increment * sideLenPerIncrement * prev.length + prev.width * increment * sideLenPerIncrement;
    rows.push({ stage: nextStage, storage, area, length, width });
    stage = nextStage;
  }
  return rows;
}
function storageAtDepth(rows: StageRow[], depth: number) {
  if (depth <= rows[0].stage) return rows[0].storage;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].stage >= depth) {
      const p0 = rows[i - 1], p1 = rows[i];
      const t = p1.stage === p0.stage ? 0 : (depth - p0.stage) / (p1.stage - p0.stage);
      return p0.storage + (p1.storage - p0.storage) * t;
    }
  }
  return rows[rows.length - 1].storage;
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field">
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="calc-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function SedimentPondTool() {
  const [sedimentTarget, setSedimentTarget] = useState("Very fine sand");
  const [flowRate, setFlowRate] = useState("2.5");
  const [nwlArea, setNwlArea] = useState("1500");
  const [lwRatio, setLwRatio] = useState("1.5");

  const [extendedDetentionDepth, setExtendedDetentionDepth] = useState("0.35");
  const [permanentPoolDepth, setPermanentPoolDepth] = useState("1.5");
  const [sideSlope, setSideSlope] = useState("6");
  const [shapeFactor, setShapeFactor] = useState("0.41");
  const [stageIncrement, setStageIncrement] = useState("0.1");
  const [requiredEfficiency, setRequiredEfficiency] = useState("0.95");

  const [catchmentArea, setCatchmentArea] = useState("55");
  const [sedimentLoadRate, setSedimentLoadRate] = useState("1.6");
  const [targetCleanoutFrequency, setTargetCleanoutFrequency] = useState("5");
  const [dewateringDepth, setDewateringDepth] = useState("0.5");
  const [providedDewateringArea, setProvidedDewateringArea] = useState("1166");

  const r = useMemo(() => {
    const Q = num(flowRate), A = num(nwlArea), lw = num(lwRatio), de = num(extendedDetentionDepth), dp = num(permanentPoolDepth),
      ss = num(sideSlope), lambda = num(shapeFactor), increment = num(stageIncrement), reqEff = num(requiredEfficiency),
      catchment = num(catchmentArea), loadRate = num(sedimentLoadRate), targetFr = num(targetCleanoutFrequency),
      dewaterDepth = num(dewateringDepth), providedArea = num(providedDewateringArea);
    const vs = SEDIMENT_TARGETS.find((s) => s.label === sedimentTarget)?.vs ?? 0;

    const inputs = [Q, A, lw, de, dp, ss, lambda, increment, reqEff, catchment, loadRate, targetFr, dewaterDepth, providedArea, vs];
    if (!inputs.every((v) => Number.isFinite(v) && v >= 0) || Q <= 0 || A <= 0 || lw <= 0 || de < 0 || dp <= 0 || ss <= 0 || lambda <= 0 || lambda >= 1 || increment <= 0) return null;

    const nwlWidth = Math.sqrt(A / lw);
    const nwlLength = lw * nwlWidth;
    const bottomLength = nwlLength - 2 * de * ss;
    const bottomWidth = nwlWidth - 2 * de * ss;
    if (bottomLength <= 0 || bottomWidth <= 0) return null;
    const bottomArea = bottomLength * bottomWidth;

    const dStar = Math.min(1, dp);
    const depthRatio = (de + dp) / (de + dStar);
    const overflowRatio = (vs * A) / Q;
    const nExp = 1 / (1 - lambda);
    const efficiency = 1 - Math.pow(1 + (1 / nExp) * overflowRatio * depthRatio, -nExp);
    const efficiencyOk = efficiency >= reqEff;

    const maxStage = Math.round((de + dp) * 100) / 100;
    const stageRows = buildStageStorage(bottomLength, bottomWidth, ss, maxStage, increment);

    const requiredStorage = catchment * reqEff * loadRate * targetFr;
    const actualBasinDepth = Math.round((dp - 0.5) * 100) / 100;
    const actualBasinVolume = actualBasinDepth > 0 ? storageAtDepth(stageRows, actualBasinDepth) : 0;
    const actualCleanoutFrequency = catchment * reqEff * loadRate > 0 ? actualBasinVolume / (catchment * reqEff * loadRate) : 0;
    const cleanoutOk = actualCleanoutFrequency >= targetFr;

    const requiredDewateringArea = requiredStorage / dewaterDepth;
    const dewateringOk = providedArea >= requiredDewateringArea;

    const sampled = stageRows.filter((_, i) => i % Math.max(1, Math.floor(stageRows.length / 12)) === 0 || stageRows[i] === stageRows[stageRows.length - 1]);

    return {
      vs, nwlWidth, nwlLength, bottomLength, bottomWidth, bottomArea,
      depthRatio, overflowRatio, nExp, efficiency, efficiencyOk,
      requiredStorage, actualBasinDepth, actualBasinVolume, actualCleanoutFrequency, cleanoutOk,
      requiredDewateringArea, dewateringOk, sampled
    };
  }, [
    sedimentTarget, flowRate, nwlArea, lwRatio, extendedDetentionDepth, permanentPoolDepth, sideSlope, shapeFactor,
    stageIncrement, requiredEfficiency, catchmentArea, sedimentLoadRate, targetCleanoutFrequency, dewateringDepth, providedDewateringArea
  ]);

  const exportCsv = () => {
    if (!r) return;
    const rows: (string | number)[][] = [
      ["Sediment Pond Sizing Calculation", "Value", "Unit"],
      ["Settling velocity, Vs", r.vs, "m/s"], ["NWL length / width", r.nwlLength, "m / " + fmt(r.nwlWidth) + " m"],
      ["Bottom length / width", r.bottomLength, "m / " + fmt(r.bottomWidth) + " m"], ["Bottom area", r.bottomArea, "m2"],
      ["Fraction of solids removed, R", r.efficiency, ""], ["Required storage, St", r.requiredStorage, "m3"],
      ["Actual basin volume (0.5m below NWL)", r.actualBasinVolume, "m3"], ["Actual cleanout frequency", r.actualCleanoutFrequency, "years"],
      ["Required dewatering area", r.requiredDewateringArea, "m2"],
      [], ["Stage (m)", "Storage (m3)", "Area (m2)", "Length (m)", "Width (m)"],
      ...r.sampled.map((s) => [s.stage, s.storage, s.area, s.length, s.width])
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "sediment-pond-sizing-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">STORMWATER TREATMENT — WSUD</p>
    <h1>Sediment Pond Sizing</h1>
    <p className="subtitle">Sediment removal efficiency (Fair &amp; Geyer), trapezoidal basin stage-storage, cleanout frequency and dewatering area.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Site and target"><div className="calc-fields">
        <Select label="Sediment target" value={sedimentTarget} options={SEDIMENT_TARGETS.map((s) => s.label)} onChange={setSedimentTarget} />
        <Field label="Design flow rate, Q" value={flowRate} unit="m³/s" hint="Rational Method 1yr ARI, adjusted to 3-month ARI" onChange={setFlowRate} />
        <Field label="Basin area at NWL, A" value={nwlArea} unit="m²" onChange={setNwlArea} />
        <Field label="Length : width ratio at NWL" value={lwRatio} onChange={setLwRatio} />
        <Field label="Required removal efficiency, R" value={requiredEfficiency} hint="Melbourne Water requires 95% for 125 μm particle" onChange={setRequiredEfficiency} />
      </div></Section>
      <Section number={2} title="Basin geometry"><div className="calc-fields">
        <Field label="Extended detention depth, de" value={extendedDetentionDepth} unit="m" hint="Max 0.35 m typical" onChange={setExtendedDetentionDepth} />
        <Field label="Permanent pool depth, dp" value={permanentPoolDepth} unit="m" onChange={setPermanentPoolDepth} />
        <Field label="Side slopes, 1 in X" value={sideSlope} onChange={setSideSlope} />
        <Field label="Pond shape factor, λ" value={shapeFactor} hint="Per Fig 10.5, WSUD Stormwater Technical Manual" onChange={setShapeFactor} />
        <Field label="Stage increment" value={stageIncrement} unit="m" onChange={setStageIncrement} />
      </div></Section>
      <Section number={3} title="Cleanout and dewatering"><div className="calc-fields">
        <Field label="Contributing catchment area, Ca" value={catchmentArea} unit="ha" onChange={setCatchmentArea} />
        <Field label="Sediment loading rate, Lo" value={sedimentLoadRate} unit="m³/ha/yr" hint="1.6 — Willing and Partners 1992, urban load" onChange={setSedimentLoadRate} />
        <Field label="Target cleanout frequency, Fr" value={targetCleanoutFrequency} unit="years" onChange={setTargetCleanoutFrequency} />
        <Field label="Dewatering depth" value={dewateringDepth} unit="m" hint="Max deposition height — 0.5 m typical, 0.3 m good practice" onChange={setDewateringDepth} />
        <Field label="Provided dewatering area" value={providedDewateringArea} unit="m²" onChange={setProvidedDewateringArea} />
      </div></Section>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Fraction of solids removed, R (basin empty)</span><strong>{r ? fmt(r.efficiency * 100, 1) : "—"}<small>%</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.efficiencyOk ? "pass" : "fail"}>{r.efficiencyOk ? "✓ Meets required removal efficiency" : "✕ Below required removal efficiency"}</span>
        <span className={r.cleanoutOk ? "pass" : "warn"}>{r.cleanoutOk ? "✓ Cleanout frequency OK" : "! Increase basin area — cleanout too frequent"}</span>
        <span className={r.dewateringOk ? "pass" : "warn"}>{r.dewateringOk ? "✓ Dewatering area adequate" : "! Increase dewatering area"}</span>
      </div>
      <h3 className="result-section-title">Basin geometry</h3>
      <Metric name="NWL length / width" value={fmt(r.nwlLength) + " / " + fmt(r.nwlWidth) + " m"} />
      <Metric name="Bottom length / width" value={fmt(r.bottomLength) + " / " + fmt(r.bottomWidth) + " m"} />
      <Metric name="Bottom area" value={fmt(r.bottomArea, 1) + " m²"} />
      <h3 className="result-section-title">Cleanout and dewatering</h3>
      <Metric name="Required storage, St" value={fmt(r.requiredStorage, 1) + " m³"} />
      <Metric name="Actual basin volume (0.5m below NWL)" value={fmt(r.actualBasinVolume, 1) + " m³"} />
      <Metric name="Actual cleanout frequency" value={fmt(r.actualCleanoutFrequency, 2) + " years"} />
      <Metric name="Required dewatering area" value={fmt(r.requiredDewateringArea, 1) + " m²"} />
      <div className="stage-table-wrap"><table className="stage-table"><thead><tr><th>Stage (m)</th><th>Storage (m³)</th><th>Area (m²)</th></tr></thead><tbody>{r.sampled.map((s) => <tr key={s.stage}><td>{fmt(s.stage, 2)}</td><td>{fmt(s.storage, 1)}</td><td>{fmt(s.area, 1)}</td></tr>)}</tbody></table></div>
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only, based on the Wetland Design Manual Part C and WSUD Stormwater Technical Manual worked example. Confirm design flow, particle target and Melbourne Water (or relevant authority) requirements before issue.</p></>}
    </aside></div>
  </div>;
}
