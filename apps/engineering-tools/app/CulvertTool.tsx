"use client";

import { useState } from "react";
import {
  autoSizeCulvert,
  AutoSizeParameter,
  calculateCulvert,
  culvertHeight,
  CulvertInput,
  CulvertProfileResult,
  CulvertShape,
  EntranceCategory,
  ENTRANCE_CATEGORY_LABELS,
  ENTRANCE_OPTIONS,
  findEntranceOption,
  HydraulicJump,
  inputAtSize,
  InletEquationForm,
  traceCulvertProfile,
  WaterSurfaceProfile,
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

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="calc-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
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

const CATEGORIES_BY_SHAPE: Record<CulvertShape, EntranceCategory[]> = {
  rectangular: ["box"],
  circular: ["concretePipe", "metalPipe"],
};

function entranceOptionsForShape(forShape: CulvertShape) {
  return ENTRANCE_OPTIONS.filter((option) => CATEGORIES_BY_SHAPE[forShape].includes(option.category));
}

function runCulvertCalculation(input: CulvertInput): { result: ReturnType<typeof calculateCulvert> | null; error: string } {
  try {
    return { result: calculateCulvert(input), error: "" };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Calculation failed." };
  }
}

const AUTO_SIZE_PARAMETERS_BY_SHAPE: Record<CulvertShape, { value: AutoSizeParameter; label: string }[]> = {
  circular: [{ value: "diameter", label: "Diameter" }],
  rectangular: [
    { value: "height", label: "Height (width held fixed)" },
    { value: "width", label: "Width (height held fixed)" },
    { value: "side", label: "Square side (width = height)" },
  ],
};

const AUTO_SIZE_PARAMETER_NAMES: Record<AutoSizeParameter, string> = {
  diameter: "Diameter",
  height: "Height",
  width: "Width",
  side: "Side",
};

function runAutoSize(
  input: CulvertInput,
  parameter: AutoSizeParameter,
  targetHeadwaterLevel: number,
): { result: ReturnType<typeof autoSizeCulvert> | null; error: string } {
  try {
    return { result: autoSizeCulvert(input, parameter, targetHeadwaterLevel), error: "" };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Auto-size calculation failed." };
  }
}

function runProfile(input: CulvertInput): { result: CulvertProfileResult | null; error: string } {
  try {
    return { result: traceCulvertProfile(input), error: "" };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Profile calculation failed." };
  }
}

const REGIME_LABELS: Record<WaterSurfaceProfile["regime"], string> = {
  subcritical: "Subcritical (outlet-control side)",
  supercritical: "Supercritical (inlet-control side)",
};

function ProfileChart({
  length, height, inletLevel, slope, profiles, jump,
}: {
  length: number;
  height: number;
  inletLevel: number;
  slope: number;
  profiles: WaterSurfaceProfile[];
  jump: HydraulicJump | null;
}) {
  const width = 700;
  const viewHeight = 260;
  const pad = 28;
  const span = Math.max(length, 0.001);
  const outletLevel = inletLevel - slope * length;

  const elevations = [
    inletLevel, outletLevel, inletLevel + height, outletLevel + height,
    ...profiles.flatMap((profile) => profile.stations.map((station) => station.waterSurfaceElevation)),
  ];
  const elevMin = Math.min(...elevations);
  const elevMax = Math.max(...elevations);
  const elevRange = Math.max(elevMax - elevMin, 0.001);

  const xScale = (x: number) => pad + (x / span) * (width - 2 * pad);
  const yScale = (elevation: number) =>
    (viewHeight - pad) - ((elevation - elevMin) / elevRange) * (viewHeight - 2 * pad);

  const jumpBedElevation = jump ? inletLevel - slope * jump.station : 0;

  return (
    <div className="profile-chart">
      <svg viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <line
          className="profile-invert"
          x1={xScale(0)} y1={yScale(inletLevel)} x2={xScale(length)} y2={yScale(outletLevel)}
        />
        <line
          className="profile-crown"
          x1={xScale(0)} y1={yScale(inletLevel + height)} x2={xScale(length)} y2={yScale(outletLevel + height)}
        />
        {profiles.map((profile) => (
          <polyline
            key={profile.direction + profile.regime}
            className={`profile-line profile-${profile.regime}`}
            points={profile.stations.map((s) => `${xScale(s.x)},${yScale(s.waterSurfaceElevation)}`).join(" ")}
          />
        ))}
        {jump && (
          <line
            className="profile-jump"
            x1={xScale(jump.station)} y1={yScale(jumpBedElevation)}
            x2={xScale(jump.station)} y2={yScale(jumpBedElevation + height)}
          />
        )}
      </svg>
      <div className="profile-legend">
        {profiles.map((profile) => (
          <span key={profile.regime}><i className={`profile-swatch ${profile.regime}`} />{REGIME_LABELS[profile.regime]}</span>
        ))}
        {jump && <span><i className="profile-swatch jump" />Hydraulic jump</span>}
      </div>
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

  const [entranceType, setEntranceType] = useState(() => entranceOptionsForShape(shape)[0]?.id ?? "custom");
  const [inletEquationForm, setInletEquationForm] = useState<InletEquationForm>("empirical");
  const [customK, setCustomK] = useState("0.02");
  const [customM, setCustomM] = useState("1.5");
  const [customC, setCustomC] = useState("0.04");
  const [customY, setCustomY] = useState("0.75");

  const [autoSizeEnabled, setAutoSizeEnabled] = useState(false);
  const [autoSizeParameter, setAutoSizeParameter] = useState<AutoSizeParameter>("diameter");
  const [targetHeadwaterLevel, setTargetHeadwaterLevel] = useState("1.5");

  const [showProfile, setShowProfile] = useState(false);

  const selectedEntrance = entranceType === "custom" ? undefined : findEntranceOption(entranceType);

  const handleEntranceChange = (id: string) => {
    setEntranceType(id);
    const option = findEntranceOption(id);
    if (option) setEntranceLoss(String(option.ke));
  };

  const handleShapeChange = (nextShape: CulvertShape) => {
    setShape(nextShape);
    const nextOptions = entranceOptionsForShape(nextShape);
    if (!nextOptions.some((option) => option.id === entranceType)) {
      setEntranceType(nextOptions[0]?.id ?? "custom");
    }
    const nextAutoSizeOptions = AUTO_SIZE_PARAMETERS_BY_SHAPE[nextShape];
    if (!nextAutoSizeOptions.some((option) => option.value === autoSizeParameter)) {
      setAutoSizeParameter(nextAutoSizeOptions[0].value);
    }
  };

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
    entranceType,
    inletEquationForm,
    customEntranceCoefficients: {
      k: numberValue(customK), m: numberValue(customM), c: numberValue(customC), y: numberValue(customY),
    },
  };
  const autoSize = autoSizeEnabled
    ? runAutoSize(input, autoSizeParameter, numberValue(targetHeadwaterLevel))
    : null;
  const calculation = autoSize
    ? { result: autoSize.result?.result ?? null, error: autoSize.error }
    : runCulvertCalculation(input);

  const effectiveInput = autoSize?.result
    ? inputAtSize(input, autoSize.result.parameter, autoSize.result.solvedSize)
    : input;
  const profile = showProfile ? runProfile(effectiveInput) : null;

  const download = () => {
    if (!calculation.result) return;
    const result = calculation.result;
    const rows = [
      ["Culvert calculation", "Value", "Unit"],
      ...(autoSize?.result
        ? [
            ["Auto-sized parameter", autoSize.result.parameter, "-"],
            ["Auto-sized value", autoSize.result.solvedSize, "m"],
            ["Auto-size converged", autoSize.result.converged ? "yes" : "no", "-"],
          ]
        : []),
      ["Governing headwater", result.governingHeadwaterDepth, "m"],
      ["Governing control", result.governingControl === "inlet" ? "Inlet control" : "Outlet control", "-"],
      ["Inlet-control headwater", result.inletControl.headwaterDepth, "m"],
      ["Inlet-control flow condition", result.inletControl.condition, "-"],
      ["Outlet-control headwater", result.outletControl.headwaterDepth, "m"],
      ["Full-flow capacity", result.fullFlowCapacity, "m3/s"],
      ["Capacity utilisation", result.capacityUtilisation * 100, "%"],
      ["Normal depth", result.normalDepth, "m"],
      ["Critical depth", result.criticalDepth, "m"],
      ["Governing headwater level", result.governingHeadwaterLevel, "m AHD / datum"],
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
        Manning capacity, normal and critical depth, FHWA HDS-5 inlet control,
        outlet-control headwater, and the governing design headwater.
      </p>

      <div className="calc-layout">
        <div>
          <Section number={1} title="Culvert geometry">
            <div className="shape-selector">
              <button
                type="button"
                className={shape === "circular" ? "selected" : ""}
                onClick={() => handleShapeChange("circular")}
              >
                Circular
              </button>
              <button
                type="button"
                className={shape === "rectangular" ? "selected" : ""}
                onClick={() => handleShapeChange("rectangular")}
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

          <Section number={2} title="Entrance configuration">
            <div className="calc-fields">
              <SelectField label="Entrance type" value={entranceType} onChange={handleEntranceChange}>
                {CATEGORIES_BY_SHAPE[shape].map((category) => (
                  <optgroup label={ENTRANCE_CATEGORY_LABELS[category]} key={category}>
                    {ENTRANCE_OPTIONS.filter((option) => option.category === category).map((option) => (
                      <option value={option.id} key={option.id}>{option.label}</option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Custom">
                  <option value="custom">Personalized (custom K, M, c, Y)</option>
                </optgroup>
              </SelectField>
              <div className="shape-selector">
                <button
                  type="button"
                  className={inletEquationForm === "empirical" ? "selected" : ""}
                  onClick={() => setInletEquationForm("empirical")}
                >
                  Empirical (Form 2)
                </button>
                <button
                  type="button"
                  className={inletEquationForm === "mathematical" ? "selected" : ""}
                  onClick={() => setInletEquationForm("mathematical")}
                >
                  Mathematical (Form 1)
                </button>
              </div>
            </div>
            {selectedEntrance ? (
              <div className="entrance-coefficients">
                <Metric name="K" value={format(selectedEntrance.k, 4)} />
                <Metric name="M" value={format(selectedEntrance.m, 3)} />
                <Metric name="c" value={format(selectedEntrance.c, 4)} />
                <Metric name="Y" value={format(selectedEntrance.y, 3)} />
                <Metric name="Entrance loss ke" value={format(selectedEntrance.ke, 2)} />
              </div>
            ) : (
              <div className="calc-fields">
                <Field label="Coefficient K" value={customK} onChange={setCustomK} />
                <Field label="Coefficient M" value={customM} onChange={setCustomM} />
                <Field label="Coefficient c" value={customC} onChange={setCustomC} />
                <Field label="Coefficient Y" value={customY} onChange={setCustomY} />
              </div>
            )}
          </Section>

          <Section number={3} title="Hydraulic conditions">
            <div className="calc-fields">
              <Field label="Design discharge" value={discharge} unit="m³/s" onChange={setDischarge} />
              <Field label="Tailwater depth" value={tailwaterDepth} unit="m" onChange={setTailwaterDepth} />
              <Field label="Entrance loss coefficient" value={entranceLoss} onChange={setEntranceLoss} />
              <Field label="Outlet loss coefficient" value={outletLoss} onChange={setOutletLoss} />
              <Field label="Inlet invert level" value={invertLevel} unit="m" onChange={setInvertLevel} />
            </div>
          </Section>

          <Section number={4} title="Auto-size (design mode)">
            <label className="research-check">
              <input
                type="checkbox"
                checked={autoSizeEnabled}
                onChange={(event) => setAutoSizeEnabled(event.target.checked)}
              />
              <span>
                <strong>Solve for a culvert size instead of entering it</strong>
                <small>Finds the smallest size whose governing headwater meets the target level below, following the legacy design-mode bisection.</small>
              </span>
            </label>
            {autoSizeEnabled && (
              <div className="calc-fields">
                <SelectField
                  label="Solve for"
                  value={autoSizeParameter}
                  onChange={(value) => setAutoSizeParameter(value as AutoSizeParameter)}
                >
                  {AUTO_SIZE_PARAMETERS_BY_SHAPE[shape].map((option) => (
                    <option value={option.value} key={option.value}>{option.label}</option>
                  ))}
                </SelectField>
                <Field
                  label="Target headwater level"
                  value={targetHeadwaterLevel}
                  unit="m"
                  onChange={setTargetHeadwaterLevel}
                />
              </div>
            )}
          </Section>

          <Section number={5} title="Water-surface profile">
            <label className="research-check">
              <input
                type="checkbox"
                checked={showProfile}
                onChange={(event) => setShowProfile(event.target.checked)}
              />
              <span>
                <strong>Trace the water-surface profile</strong>
                <small>Standard-step energy-balance march from the governing boundary, with hydraulic-jump detection on steep, outlet-influenced barrels.</small>
              </span>
            </label>
            {showProfile && profile?.error && <p className="proposal-error">⚠ {profile.error}</p>}
            {showProfile && profile?.result && (
              <>
                <div className="check-row">
                  <span className="pass">{profile.result.slopeRegime} slope</span>
                  {profile.result.hydraulicJump && <span className="warn">! Hydraulic jump detected</span>}
                </div>
                {profile.result.note && <p className="answer-note">{profile.result.note}</p>}
                {profile.result.profiles.length > 0 && (
                  <ProfileChart
                    length={effectiveInput.length}
                    height={culvertHeight(effectiveInput)}
                    inletLevel={effectiveInput.inletInvertLevel ?? 0}
                    slope={effectiveInput.slope}
                    profiles={profile.result.profiles}
                    jump={profile.result.hydraulicJump}
                  />
                )}
                {profile.result.hydraulicJump && (
                  <div className="entrance-coefficients">
                    <Metric name="Jump station" value={`${format(profile.result.hydraulicJump.station, 1)} m`} />
                    <Metric name="Upstream depth" value={`${format(profile.result.hydraulicJump.upstreamDepth)} m`} />
                    <Metric name="Downstream depth" value={`${format(profile.result.hydraulicJump.downstreamDepth)} m`} />
                    <Metric name="Jump length (USBR)" value={`${format(profile.result.hydraulicJump.length, 2)} m`} />
                  </div>
                )}
              </>
            )}
          </Section>

          <Section number={6} title="Calculation basis">
            <p className="answer-note">
              Governing headwater is the greater of FHWA HDS-5 inlet control and
              an outlet-control energy-balance approximation. Auto-size searches
              for the smallest size meeting the target headwater; a scan-then-
              bisect search finds the smallest adequate size even though
              governing headwater is not always monotonic in culvert size. The
              water-surface profile traces from whichever boundary the
              governing control implies rather than reproducing the legacy
              app&apos;s 17 named profile-family cases exactly. Confirm
              blockage, afflux and governing authority criteria before design
              issue. This is not yet a certified replacement for the full
              legacy Hidroalcun application (hydrograph batch processing and
              natural-channel tailwater rating remain deferred).
            </p>
          </Section>
        </div>

        <aside className="calc-results">
          <p>LIVE RESULTS</p>
          <div className="result-hero">
            <span>Governing headwater</span>
            <strong>
              {result ? format(result.governingHeadwaterDepth) : "—"}
              <small>m</small>
            </strong>
          </div>
          {autoSize?.result && (
            <div className="auto-size-summary">
              <span>Auto-sized {AUTO_SIZE_PARAMETER_NAMES[autoSize.result.parameter].toLowerCase()}</span>
              <strong>{format(autoSize.result.solvedSize)} m</strong>
              <small className={autoSize.result.converged ? "pass" : "fail"}>
                {autoSize.result.converged ? "✓ converged" : "✕ no solution in search range"}
              </small>
            </div>
          )}
          {calculation.error && <p className="proposal-error">⚠ {calculation.error}</p>}
          {result && (
            <>
              <div className="check-row">
                <span className={result.governingControl === "inlet" ? "warn" : "pass"}>
                  {result.governingControl === "inlet" ? "Inlet control governs" : "Outlet control governs"}
                </span>
                <span className={result.capacityUtilisation <= 1 ? "pass" : "fail"}>
                  {result.capacityUtilisation <= 1 ? "✓ Capacity available" : "✕ Capacity exceeded"}
                </span>
                <span className={result.upstreamVelocity <= 3 ? "pass" : "warn"}>
                  {result.upstreamVelocity <= 3 ? "✓ Velocity ≤ 3 m/s" : "! High velocity"}
                </span>
              </div>

              <div className="control-comparison">
                <div className={result.governingControl === "inlet" ? "governs" : ""}>
                  <span>Inlet control</span>
                  <strong>{format(result.inletControl.headwaterDepth)} m</strong>
                  <small>{result.inletControl.condition}</small>
                </div>
                <div className={result.governingControl === "outlet" ? "governs" : ""}>
                  <span>Outlet control</span>
                  <strong>{format(result.outletControl.headwaterDepth)} m</strong>
                  <small>tailwater basis {format(result.outletControl.controllingTailwaterDepth, 2)} m</small>
                </div>
              </div>

              <Metric name="Full-flow capacity" value={`${format(result.fullFlowCapacity)} m³/s`} />
              <Metric name="Capacity utilisation" value={`${format(result.capacityUtilisation * 100, 1)}%`} />
              <Metric name="Normal depth" value={`${format(result.normalDepth)} m`} />
              <Metric name="Critical depth" value={`${format(result.criticalDepth)} m`} />
              <Metric name="Governing headwater level" value={`${format(result.governingHeadwaterLevel)} m`} />
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
