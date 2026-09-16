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

// Hydraulic efficiency, λ, by pond/wetland configuration (Fig 10.5, Australian Runoff Quality, 2003).
// good ≥ 0.70; satisfactory 0.5–0.70; poor ≤ 0.5.
// Pictograms are simplified illustrations of each configuration's general arrangement, not a
// traced reproduction of the source figure — cross-check the published figure for shape selection.
type PondVariant = "simple" | "short" | "tapered" | "distributed" | "baffled" | "offset" | "elongated" | "bent" | "island" | "diffuser" | "curtain";
const POND_SHAPE_FACTORS: { label: string; lambda: number; variant: PondVariant }[] = [
  { label: "A", lambda: 0.30, variant: "simple" }, { label: "B", lambda: 0.26, variant: "simple" },
  { label: "C", lambda: 0.11, variant: "short" }, { label: "D", lambda: 0.18, variant: "tapered" },
  { label: "E", lambda: 0.76, variant: "distributed" }, { label: "G", lambda: 0.76, variant: "baffled" },
  { label: "H", lambda: 0.11, variant: "short" }, { label: "I", lambda: 0.41, variant: "offset" },
  { label: "J", lambda: 0.90, variant: "elongated" }, { label: "K", lambda: 0.36, variant: "bent" },
  { label: "O", lambda: 0.26, variant: "island" }, { label: "P", lambda: 0.61, variant: "diffuser" },
  { label: "Q", lambda: 0.59, variant: "curtain" }
];
const lambdaBand = (l: number) => (l > 0.70 ? "good" : l > 0.5 ? "satisfactory" : "poor");

function PondShapeIcon({ variant }: { variant: PondVariant }) {
  const inlet = <line x1="2" y1="20" x2="12" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" />;
  const outlet = <line x1="58" y1="20" x2="68" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" />;
  const box = (x2 = 58) => <rect x="12" y="8" width={x2 - 12} height="24" fill="#eef3f8" stroke="#456b99" strokeWidth="1.5" />;
  return <svg viewBox="0 0 70 40" width="70" height="40">
    <defs><marker id="pond-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#365b91" /></marker></defs>
    {variant === "simple" && <>{box()}{inlet}{outlet}</>}
    {variant === "short" && <>{box(40)}<line x1="2" y1="20" x2="12" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /><line x1="40" y1="20" x2="50" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /></>}
    {variant === "tapered" && <><path d="M12 8H58L48 32H12Z" fill="#eef3f8" stroke="#456b99" strokeWidth="1.5" />{inlet}<line x1="48" y1="20" x2="66" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /></>}
    {variant === "distributed" && <>{box()}<line x1="2" y1="12" x2="12" y2="12" stroke="#365b91" strokeWidth="1.5" markerEnd="url(#pond-arrow)" /><line x1="2" y1="20" x2="12" y2="20" stroke="#365b91" strokeWidth="1.5" markerEnd="url(#pond-arrow)" /><line x1="2" y1="28" x2="12" y2="28" stroke="#365b91" strokeWidth="1.5" markerEnd="url(#pond-arrow)" />{outlet}</>}
    {variant === "baffled" && <>{box()}<path d="M28 8V26M42 14V32" fill="none" stroke="#456b99" strokeWidth="2" />{inlet}{outlet}</>}
    {variant === "offset" && <>{box()}<line x1="2" y1="12" x2="12" y2="12" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /><line x1="58" y1="28" x2="68" y2="28" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /></>}
    {variant === "elongated" && <>{box(66)}<line x1="2" y1="20" x2="12" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /><line x1="66" y1="20" x2="68" y2="20" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /></>}
    {variant === "bent" && <><path d="M12 8H42V20H58V32H12Z" fill="#eef3f8" stroke="#456b99" strokeWidth="1.5" />{inlet}<line x1="58" y1="26" x2="68" y2="26" stroke="#365b91" strokeWidth="2" markerEnd="url(#pond-arrow)" /></>}
    {variant === "island" && <>{box()}<circle cx="24" cy="20" r="4" fill="#fff" stroke="#456b99" strokeWidth="1.5" />{inlet}{outlet}</>}
    {variant === "diffuser" && <>{box()}<circle cx="20" cy="20" r="5" fill="none" stroke="#456b99" strokeWidth="1.5" />{inlet}{outlet}</>}
    {variant === "curtain" && <>{box()}<line x1="46" y1="9" x2="46" y2="31" stroke="#456b99" strokeWidth="3" strokeDasharray="2 2" />{inlet}{outlet}</>}
  </svg>;
}

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

function BasinGeometryDiagram({ de, dp, dStar, bottomWidth, topWidth }: { de: number; dp: number; dStar: number; bottomWidth: number; topWidth: number }) {
  if (![de, dp, dStar, bottomWidth, topWidth].every((v) => Number.isFinite(v) && v >= 0) || dp <= 0 || topWidth <= 0) return null;
  const totalDepth = de + dp;
  const halfTop = 120;
  const halfBottom = Math.max(25, halfTop * (bottomWidth / topWidth));
  const cx = 160, tedY = 18, baseY = 188;
  const scale = (baseY - tedY) / totalDepth;
  const nwlY = tedY + de * scale;
  const dStarY = nwlY + dStar * scale;
  const sedimentTopDepth = Math.max(0, dp - 0.5); // sediment accumulates from the base up to 0.5 m below NWL (cleanout trigger)
  const sedimentTopY = nwlY + sedimentTopDepth * scale;
  const halfWidthAtY = (y: number) => halfTop - (halfTop - halfBottom) * ((y - tedY) / (baseY - tedY));

  return <div className="cross-section">
    <h3>BASIN GEOMETRY (schematic)</h3>
    <svg viewBox="0 0 320 225" role="img" aria-label="Sediment basin depth profile showing TED, NWL, permanent pool depth, retention depth and the accumulated sediment zone">
      <path d={`M${cx - halfTop} ${tedY} L${cx + halfTop} ${tedY} L${cx + halfBottom} ${baseY} L${cx - halfBottom} ${baseY} Z`} fill="#eaf3fb" stroke="#263746" strokeWidth="1.4" />
      <path d={`M${cx - halfBottom} ${baseY} L${cx + halfBottom} ${baseY} L${cx + halfWidthAtY(sedimentTopY)} ${sedimentTopY} L${cx - halfWidthAtY(sedimentTopY)} ${sedimentTopY} Z`} fill="#dcb488" opacity="0.85" />
      <line x1={cx - halfTop - 8} y1={tedY} x2={cx + halfTop + 8} y2={tedY} stroke="#b91c1c" strokeDasharray="4 3" strokeWidth="1.2" />
      <text x={cx - halfTop - 12} y={tedY + 3} textAnchor="end" fontSize="9" fill="#b91c1c">TED</text>
      <line x1={cx - halfTop - 8} y1={nwlY} x2={cx + halfTop + 8} y2={nwlY} stroke="#2786c2" strokeDasharray="4 3" strokeWidth="1.2" />
      <text x={cx - halfTop - 12} y={nwlY + 3} textAnchor="end" fontSize="9" fill="#2786c2">NWL</text>
      <line x1={cx - halfWidthAtY(dStarY) - 6} y1={dStarY} x2={cx + halfWidthAtY(dStarY) + 6} y2={dStarY} stroke="#2f7d4f" strokeDasharray="3 3" strokeWidth="1.2" />
      <text x={cx + halfWidthAtY(dStarY) + 10} y={dStarY + 3} fontSize="9" fill="#2f7d4f">d* = {fmt(dStar, 2)} m</text>
      <text x={cx + halfTop + 12} y={(tedY + nwlY) / 2 + 3} fontSize="9">de = {fmt(de, 2)} m</text>
      <text x={cx + halfTop + 12} y={(nwlY + baseY) / 2 + 3} fontSize="9">dp = {fmt(dp, 2)} m</text>
      <text x={cx} y={baseY + 15} textAnchor="middle" fontSize="8" fill="#8a6a3d">Accumulated sediment at cleanout trigger (0.5 m below NWL)</text>
    </svg>
  </div>;
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
      de, dp, dStar, depthRatio, overflowRatio, nExp, efficiency, efficiencyOk,
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
      </div>
      <section className="roughness-reference">
        <div className="reference-head"><div><p className="eyebrow">REFERENCE TABLE</p><h2>Hydraulic efficiency, λ, by pond configuration</h2><span>Fig 10.5, Australian Runoff Quality (2003). Range 0–1; 1 = best hydrodynamic conditions.</span></div></div>
        <div className="reference-table"><table><thead><tr><th>Configuration</th><th>Schematic</th><th>λ</th><th>Efficiency</th><th></th></tr></thead><tbody>{POND_SHAPE_FACTORS.map((s) => <tr key={s.label}><td>{s.label}</td><td><PondShapeIcon variant={s.variant} /></td><td>{fmt(s.lambda, 2)}</td><td>{lambdaBand(s.lambda)}</td><td><button type="button" onClick={() => setShapeFactor(String(s.lambda))}>Use value</button></td></tr>)}</tbody></table></div>
        <p className="engine-note">λ = (1 − 1/N) = (t<sub>mean</sub>/t<sub>n</sub>)(1 − (t<sub>mean</sub>−t<sub>p</sub>)/t<sub>mean</sub>) = t<sub>p</sub>/t<sub>n</sub>. Good hydraulic efficiency: λ &gt; 0.70; satisfactory: 0.5 &lt; λ ≤ 0.70; poor: λ ≤ 0.5. Schematics are simplified illustrations of each configuration&apos;s general arrangement (inlet/outlet position, baffling), not a traced reproduction — confirm against Australian Runoff Quality (2003) Fig 10.5 before final shape selection.</p>
      </section></Section>
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
      <BasinGeometryDiagram de={r.de} dp={r.dp} dStar={r.dStar} bottomWidth={r.bottomWidth} topWidth={r.nwlWidth} />
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
