"use client";

import { useMemo, useState } from "react";
import {
  calculateCulvert,
  CulvertInput,
  CulvertShape,
} from "./culvert/engine";

const numberValue = (value: string) => Number(value);
const format = (value: number, digits = 3) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";

function Field({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="calc-field">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {unit && <i>{unit}</i>}
    </label>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="calc-card">
      <div className="calc-card-title">
        <b>{number}</b>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ name, value }: { name: string; value: string }) {
  return (
    <div className="metric">
      <span>{name}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function CulvertTool() {
  const [shape, setShape] = useState<CulvertShape>("circular");
  const [diameter, setDiameter] = useState("1.2");
  const [width, setWidth] = useState("1.5");
  const [height, setHeight] = useState("1.2");
  const [barrels, setBarrels] = useState("1");
  const [length, setLength] = useState("30");
  const [slope, setSlope] = useState("0.01");
  const [roughness, setRoughness] = useState("0.013");
  const [discharge, setDischarge] = useState("2");
  const [tailwaterDepth, setTailwaterDepth] = useState("0.5");
  const [entranceLoss, setEntranceLoss] = useState("0.5");
  const [outletLoss, setOutletLoss] = useState("1");
  const [invertLevel, setInvertLevel] = useState("0");

  const calculation = useMemo(() => {
    const input: CulvertInput = {
      shape,
      diameter: numberValue(diameter),
      width: numberValue(width),
      height: numberValue(height),
      barrels: numberValue(barrels),
      length: numberValue(length),
      slope: numberValue(slope),
      roughness: numberValue(roughness),
      discharge: numberValue(discharge),
      tailwaterDepth: numberValue(tailwaterDepth),
      entranceLossCoefficient: numberValue(entranceLoss),
      outletLossCoefficient: numberValue(outletLoss),
      inletInvertLevel: numberValue(invertLevel),
    };

    try {
      return { result: calculateCulvert(input), error: "" };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Calculation failed.",
      };
    }
  }, [
    shape,
    diameter,
    width,
    height,
    barrels,
    length,
    slope,
    roughness,
    discharge,
    tailwaterDepth,
    entranceLoss,
    outletLoss,
    invertLevel,
  ]);

  const download = () => {
    if (!calculation.result) return;
    const result = calculation.result;
    const rows = [
      ["Culvert calculation", "Value", "Unit"],
      ["Full-flow capacity", result.fullFlowCapacity, "m3/s"],
      ["Capacity utilisation", result.capacityUtilisation * 100, "%"],
      ["Normal depth", result.normalDepth, "m"],
      ["Critical depth", result.criticalDepth, "m"],
      ["Outlet-control headwater depth", result.outletControlHeadwaterDepth, "m"],
      ["Headwater level", result.headwaterLevel, "m AHD / datum"],
      ["Velocity", result.upstreamVelocity, "m/s"],
      ["Froude number", result.froudeNumber, "-"],
      ["Flow condition", result.flowCondition, "-"],
      ...result.warnings.map((warning) => ["Warning", warning, ""]),
    ];
    const csv = rows.map((row) => row.map(String).join(",")).join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    anchor.download = "culvert-calculation.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const result = calculation.result;

  return (
    <div className="content calc-content">
      <p className="eyebrow">HYDRAULIC CALCULATOR</p>
      <h1>Culvert</h1>
      <p className="subtitle">
        Manning capacity, normal and critical depth, outlet-control headwater,
        velocity and hydraulic checks.
      </p>

      <div className="calc-layout">
        <div>
          <Section number={1} title="Culvert geometry">
            <div className="shape-selector">
              <button
                type="button"
                className={shape === "circular" ? "selected" : ""}
                onClick={() => setShape("circular")}
              >
                Circular
              </button>
              <button
                type="button"
                className={shape === "rectangular" ? "selected" : ""}
                onClick={() => setShape("rectangular")}
              >
                Rectangular
              </button>
            </div>
            <div className="calc-fields">
              {shape === "circular" ? (
                <Field label="Diameter" value={diameter} unit="m" onChange={setDiameter} />
              ) : (
                <>
                  <Field label="Width" value={width} unit="m" onChange={setWidth} />
                  <Field label="Height" value={height} unit="m" onChange={setHeight} />
                </>
              )}
              <Field label="Number of barrels" value={barrels} onChange={setBarrels} />
              <Field label="Length" value={length} unit="m" onChange={setLength} />
              <Field label="Slope" value={slope} unit="m/m" onChange={setSlope} />
              <Field label="Manning's n" value={roughness} onChange={setRoughness} />
            </div>
          </Section>

          <Section number={2} title="Hydraulic conditions">
            <div className="calc-fields">
              <Field label="Design discharge" value={discharge} unit="m³/s" onChange={setDischarge} />
              <Field label="Tailwater depth" value={tailwaterDepth} unit="m" onChange={setTailwaterDepth} />
              <Field label="Entrance loss coefficient" value={entranceLoss} onChange={setEntranceLoss} />
              <Field label="Outlet loss coefficient" value={outletLoss} onChange={setOutletLoss} />
              <Field label="Inlet invert level" value={invertLevel} unit="m" onChange={setInvertLevel} />
            </div>
          </Section>

          <Section number={3} title="Calculation basis">
            <p className="answer-note">
              Preliminary hydraulic assessment using Manning flow and an
              outlet-control energy-loss approximation. Confirm inlet-control
              coefficients, blockage, afflux and governing authority criteria
              before design issue.
            </p>
          </Section>
        </div>

        <aside className="calc-results">
          <p>LIVE RESULTS</p>
          <div className="result-hero">
            <span>Outlet-control headwater</span>
            <strong>
              {result ? format(result.outletControlHeadwaterDepth) : "—"}
              <small>m</small>
            </strong>
          </div>
          {calculation.error && <p className="proposal-error">⚠ {calculation.error}</p>}
          {result && (
            <>
              <div className="check-row">
                <span className={result.capacityUtilisation <= 1 ? "pass" : "fail"}>
                  {result.capacityUtilisation <= 1 ? "✓ Capacity available" : "✕ Capacity exceeded"}
                </span>
                <span className={result.upstreamVelocity <= 3 ? "pass" : "warn"}>
                  {result.upstreamVelocity <= 3 ? "✓ Velocity ≤ 3 m/s" : "! High velocity"}
                </span>
              </div>
              <Metric name="Full-flow capacity" value={`${format(result.fullFlowCapacity)} m³/s`} />
              <Metric name="Capacity utilisation" value={`${format(result.capacityUtilisation * 100, 1)}%`} />
              <Metric name="Normal depth" value={`${format(result.normalDepth)} m`} />
              <Metric name="Critical depth" value={`${format(result.criticalDepth)} m`} />
              <Metric name="Headwater level" value={`${format(result.headwaterLevel)} m`} />
              <Metric name="Velocity" value={`${format(result.upstreamVelocity)} m/s`} />
              <Metric name="Froude number" value={format(result.froudeNumber)} />
              <Metric name="Flow condition" value={result.flowCondition.replaceAll("-", " ")} />
              {result.warnings.length > 0 && (
                <div className="culvert-warnings">
                  <strong>Engineering review</strong>
                  <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}
              <button className="download-btn" onClick={download}>↓ Export CSV</button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
