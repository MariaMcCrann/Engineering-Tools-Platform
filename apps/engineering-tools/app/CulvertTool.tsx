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
  runCulvertHydrograph,
  solveNaturalChannelDepth,
  solveRectangularChannelDepth,
  solveTrapezoidalChannelDepth,
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

type TailwaterSource = "direct" | "rectangular" | "trapezoidal" | "natural";

const TAILWATER_SOURCE_LABELS: Record<TailwaterSource, string> = {
  direct: "Direct entry",
  rectangular: "Rectangular channel",
  trapezoidal: "Trapezoidal channel",
  natural: "Natural channel (surveyed cross-section)",
};

interface ChannelPointInput {
  station: string;
  elevation: string;
}

function runChannelTailwater(
  source: TailwaterSource,
  discharge: number,
  base: number,
  sideSlope: number,
  manningN: number,
  channelSlope: number,
  points: ChannelPointInput[],
): { result: number | null; error: string } {
  try {
    if (source === "rectangular") {
      return { result: solveRectangularChannelDepth(discharge, { base, manningN, slope: channelSlope }), error: "" };
    }
    if (source === "trapezoidal") {
      return {
        result: solveTrapezoidalChannelDepth(discharge, { base, sideSlope, manningN, slope: channelSlope }),
        error: "",
      };
    }
    if (source === "natural") {
      return {
        result: solveNaturalChannelDepth(discharge, {
          points: points.map((p) => ({ station: numberValue(p.station), elevation: numberValue(p.elevation) })),
          manningN,
          slope: channelSlope,
        }),
        error: "",
      };
    }
    return { result: null, error: "" };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Channel tailwater calculation failed." };
  }
}

function NaturalChannelTable({
  points, onChange,
}: {
  points: ChannelPointInput[];
  onChange: (points: ChannelPointInput[]) => void;
}) {
  const updatePoint = (index: number, field: keyof ChannelPointInput, value: string) => {
    onChange(points.map((point, i) => (i === index ? { ...point, [field]: value } : point)));
  };
  const addPoint = () => onChange([...points, { station: "", elevation: "" }]);
  const removePoint = (index: number) => onChange(points.filter((_, i) => i !== index));

  return (
    <div className="channel-points-table">
      <table>
        <thead><tr><th>Station (m)</th><th>Elevation (m AHD / datum)</th><th /></tr></thead>
        <tbody>
          {points.map((point, index) => (
            <tr key={index}>
              <td><input type="number" step="any" value={point.station} onChange={(e) => updatePoint(index, "station", e.target.value)} /></td>
              <td><input type="number" step="any" value={point.elevation} onChange={(e) => updatePoint(index, "elevation", e.target.value)} /></td>
              <td>
                <button type="button" onClick={() => removePoint(index)} disabled={points.length <= 2} aria-label="Remove point">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="add-point-btn" onClick={addPoint}>+ Add point</button>
    </div>
  );
}

type DischargeMode = "constant" | "hydrograph";

interface HydrographRowInput {
  time: string;
  discharge: string;
}

function runHydrograph(
  input: CulvertInput,
  rows: HydrographRowInput[],
): { result: ReturnType<typeof runCulvertHydrograph> | null; error: string } {
  try {
    return {
      result: runCulvertHydrograph(
        input,
        rows.map((row) => ({ time: numberValue(row.time), discharge: numberValue(row.discharge) })),
      ),
      error: "",
    };
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Hydrograph calculation failed." };
  }
}

function HydrographTable({
  rows, onChange,
}: {
  rows: HydrographRowInput[];
  onChange: (rows: HydrographRowInput[]) => void;
}) {
  const updateRow = (index: number, field: keyof HydrographRowInput, value: string) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const addRow = () => onChange([...rows, { time: "", discharge: "" }]);
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="channel-points-table">
      <table>
        <thead><tr><th>Time (min)</th><th>Discharge (m³/s)</th><th /></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td><input type="number" step="any" value={row.time} onChange={(e) => updateRow(index, "time", e.target.value)} /></td>
              <td><input type="number" step="any" value={row.discharge} onChange={(e) => updateRow(index, "discharge", e.target.value)} /></td>
              <td>
                <button type="button" onClick={() => removeRow(index)} disabled={rows.length <= 1} aria-label="Remove row">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="add-point-btn" onClick={addRow}>+ Add row</button>
    </div>
  );
}

const REGIME_LABELS: Record<WaterSurfaceProfile["regime"], string> = {
  subcritical: "Subcritical",
  supercritical: "Supercritical",
};

function waterMarkerPath(cx: number, cy: number, size = 7): string {
  // A downward-pointing ▽ marker sitting on the water surface line.
  return `M ${cx - size} ${cy - size} L ${cx + size} ${cy - size} L ${cx} ${cy + size} Z`;
}

function ProfileChart({
  length, height, inletLevel, slope, profiles, jump, normalDepth, criticalDepth, tailwaterDepth, governingHeadwaterLevel,
}: {
  length: number;
  height: number;
  inletLevel: number;
  slope: number;
  profiles: WaterSurfaceProfile[];
  jump: HydraulicJump | null;
  normalDepth: number;
  criticalDepth: number;
  tailwaterDepth: number;
  governingHeadwaterLevel: number;
}) {
  const width = 760;
  const viewHeight = 320;
  const leftPad = 92;
  const rightPad = 92;
  const topPad = 34;
  const bottomPad = 26;
  const span = Math.max(length, 0.001);
  const outletLevel = inletLevel - slope * length;
  const tailwaterLevel = outletLevel + tailwaterDepth;
  const invertAt = (x: number) => inletLevel - slope * x;

  const elevations = [
    inletLevel, outletLevel, inletLevel + height, outletLevel + height,
    invertAt(0) + criticalDepth, invertAt(length) + criticalDepth,
    invertAt(0) + normalDepth, invertAt(length) + normalDepth,
    tailwaterLevel, governingHeadwaterLevel,
    ...profiles.flatMap((profile) => profile.stations.map((station) => station.waterSurfaceElevation)),
  ];
  const elevMin = Math.min(...elevations) - 0.08 * height;
  const elevMax = Math.max(...elevations) + 0.08 * height;
  const elevRange = Math.max(elevMax - elevMin, 0.001);

  const plotWidth = width - leftPad - rightPad;
  const xScale = (x: number) => leftPad + (x / span) * plotWidth;
  const yScale = (elevation: number) =>
    (viewHeight - bottomPad) - ((elevation - elevMin) / elevRange) * (viewHeight - topPad - bottomPad);

  const jumpBedElevation = jump ? invertAt(jump.station) : 0;
  const midStation = (profile: WaterSurfaceProfile) => profile.stations[Math.floor(profile.stations.length / 2)];

  return (
    <div className="profile-chart">
      <svg viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="culvert-ground-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="7" height="7" className="profile-hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="7" className="profile-hatch-line" />
          </pattern>
        </defs>

        <polygon
          className="profile-ground"
          points={`${leftPad},${yScale(invertAt(0))} ${width - rightPad},${yScale(invertAt(length))} ${width - rightPad},${viewHeight} ${leftPad},${viewHeight}`}
        />

        <rect
          className="profile-pool"
          x={0} y={yScale(governingHeadwaterLevel)}
          width={leftPad} height={Math.max(yScale(invertAt(0)) - yScale(governingHeadwaterLevel), 0)}
        />
        <line className="profile-waterline" x1={0} y1={yScale(governingHeadwaterLevel)} x2={leftPad} y2={yScale(governingHeadwaterLevel)} />
        <path className="profile-water-marker" d={waterMarkerPath(leftPad - 12, yScale(governingHeadwaterLevel))} />
        <text className="profile-pool-label" x={4} y={yScale(governingHeadwaterLevel) - 8}>
          HW {format(governingHeadwaterLevel - inletLevel, 2)} m
        </text>

        <rect
          className="profile-pool"
          x={width - rightPad} y={yScale(tailwaterLevel)}
          width={rightPad} height={Math.max(yScale(invertAt(length)) - yScale(tailwaterLevel), 0)}
        />
        <line className="profile-waterline" x1={width - rightPad} y1={yScale(tailwaterLevel)} x2={width} y2={yScale(tailwaterLevel)} />
        <path className="profile-water-marker" d={waterMarkerPath(width - rightPad + 12, yScale(tailwaterLevel))} />
        <text className="profile-pool-label" textAnchor="end" x={width - 4} y={yScale(tailwaterLevel) - 8}>
          TW {format(tailwaterDepth, 2)} m
        </text>

        <line className="profile-endcap" x1={xScale(0)} y1={yScale(invertAt(0))} x2={xScale(0)} y2={yScale(invertAt(0) + height)} />
        <line className="profile-endcap" x1={xScale(length)} y1={yScale(invertAt(length))} x2={xScale(length)} y2={yScale(invertAt(length) + height)} />

        <line
          className="profile-yc"
          x1={xScale(0)} y1={yScale(invertAt(0) + criticalDepth)} x2={xScale(length)} y2={yScale(invertAt(length) + criticalDepth)}
        />
        <text className="profile-ref-label profile-yc-label" x={xScale(0) + 6} y={yScale(invertAt(0) + criticalDepth) - 5}>
          Critical depth
        </text>
        <line
          className="profile-yn"
          x1={xScale(0)} y1={yScale(invertAt(0) + normalDepth)} x2={xScale(length)} y2={yScale(invertAt(length) + normalDepth)}
        />
        <text className="profile-ref-label profile-yn-label" x={xScale(0) + 6} y={yScale(invertAt(0) + normalDepth) - 5}>
          Normal depth
        </text>

        <line className="profile-invert" x1={xScale(0)} y1={yScale(invertAt(0))} x2={xScale(length)} y2={yScale(invertAt(length))} />
        <line
          className="profile-crown"
          x1={xScale(0)} y1={yScale(invertAt(0) + height)} x2={xScale(length)} y2={yScale(invertAt(length) + height)}
        />

        {profiles.map((profile) => {
          const mid = midStation(profile);
          return (
            <g key={profile.direction + profile.regime}>
              <polyline
                className={`profile-line profile-${profile.regime}`}
                points={profile.stations.map((s) => `${xScale(s.x)},${yScale(s.waterSurfaceElevation)}`).join(" ")}
              />
              {mid && (
                <text
                  className={`profile-curve-label profile-${profile.regime}-label`}
                  x={xScale(mid.x)} y={yScale(mid.waterSurfaceElevation) - 8}
                  textAnchor="middle"
                >
                  {REGIME_LABELS[profile.regime]}
                </text>
              )}
            </g>
          );
        })}

        {jump && (
          <>
            <line
              className="profile-jump"
              x1={xScale(jump.station)} y1={yScale(jumpBedElevation + jump.upstreamDepth)}
              x2={xScale(jump.station)} y2={yScale(jumpBedElevation + jump.downstreamDepth)}
            />
            <line
              className="profile-jump-leader"
              x1={xScale(jump.station)} y1={yScale(invertAt(jump.station) + height)}
              x2={xScale(jump.station)} y2={Math.max(yScale(invertAt(jump.station) + height) - 14, topPad - 6)}
            />
            <text
              className="profile-jump-label"
              textAnchor="middle"
              x={xScale(jump.station)}
              y={Math.max(yScale(invertAt(jump.station) + height) - 16, topPad - 8)}
            >
              Hydraulic jump
            </text>
          </>
        )}
      </svg>
      <div className="profile-legend">
        {profiles.map((profile) => (
          <span key={profile.regime}><i className={`profile-swatch ${profile.regime}`} />{REGIME_LABELS[profile.regime]} profile</span>
        ))}
        {jump && <span><i className="profile-swatch jump" />Hydraulic jump</span>}
        <span><i className="profile-swatch normal" />Normal depth</span>
        <span><i className="profile-swatch critical" />Critical depth</span>
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

  const [tailwaterSource, setTailwaterSource] = useState<TailwaterSource>("direct");
  const [channelBase, setChannelBase] = useState("2");
  const [channelSideSlope, setChannelSideSlope] = useState("2");
  const [channelManningN, setChannelManningN] = useState("0.03");
  const [channelSlope, setChannelSlope] = useState("0.005");
  const [naturalPoints, setNaturalPoints] = useState<ChannelPointInput[]>([
    { station: "-5", elevation: "2" },
    { station: "-1", elevation: "0" },
    { station: "1", elevation: "0" },
    { station: "5", elevation: "2" },
  ]);

  const [dischargeMode, setDischargeMode] = useState<DischargeMode>("constant");
  const [hydrographRows, setHydrographRows] = useState<HydrographRowInput[]>([
    { time: "0", discharge: "0.5" },
    { time: "30", discharge: "2" },
    { time: "60", discharge: "1" },
  ]);

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

  const channelTailwater = tailwaterSource !== "direct"
    ? runChannelTailwater(
        tailwaterSource, numberValue(discharge), numberValue(channelBase), numberValue(channelSideSlope),
        numberValue(channelManningN), numberValue(channelSlope), naturalPoints,
      )
    : null;
  const effectiveTailwaterDepth = channelTailwater?.result ?? numberValue(tailwaterDepth);

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
    tailwaterDepth: effectiveTailwaterDepth,
    entranceLossCoefficient: numberValue(entranceLoss),
    outletLossCoefficient: numberValue(outletLoss),
    inletInvertLevel: numberValue(invertLevel),
    entranceType,
    inletEquationForm,
    customEntranceCoefficients: {
      k: numberValue(customK), m: numberValue(customM), c: numberValue(customC), y: numberValue(customY),
    },
  };
  const hydrograph = dischargeMode === "hydrograph" ? runHydrograph(input, hydrographRows) : null;
  const autoSize = autoSizeEnabled && dischargeMode === "constant"
    ? runAutoSize(input, autoSizeParameter, numberValue(targetHeadwaterLevel))
    : null;
  const peakRow = hydrograph?.result && hydrograph.result.peakIndex !== null
    ? hydrograph.result.rows[hydrograph.result.peakIndex]
    : null;
  const calculation = hydrograph
    ? {
        result: peakRow?.result ?? null,
        error: hydrograph.error || (hydrograph.result && !peakRow ? "No hydrograph row produced a valid result." : ""),
      }
    : autoSize
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
      ...(hydrograph?.result
        ? [
            ["", "", ""],
            ["Hydrograph time (min)", "Discharge (m3/s)", "Governing headwater (m)"],
            ...hydrograph.result.rows.map((row) => [
              String(row.time), String(row.discharge), row.result ? String(row.result.governingHeadwaterDepth) : row.error,
            ]),
          ]
        : []),
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
            <div className="shape-selector">
              <button
                type="button"
                className={dischargeMode === "constant" ? "selected" : ""}
                onClick={() => setDischargeMode("constant")}
              >
                Constant discharge
              </button>
              <button
                type="button"
                className={dischargeMode === "hydrograph" ? "selected" : ""}
                onClick={() => setDischargeMode("hydrograph")}
              >
                Hydrograph
              </button>
            </div>
            {dischargeMode === "hydrograph" && (
              <HydrographTable rows={hydrographRows} onChange={setHydrographRows} />
            )}
            <div className="calc-fields">
              {dischargeMode === "constant" && (
                <Field label="Design discharge" value={discharge} unit="m³/s" onChange={setDischarge} />
              )}
              <SelectField
                label="Tailwater source"
                value={tailwaterSource}
                onChange={(value) => setTailwaterSource(value as TailwaterSource)}
              >
                {(Object.keys(TAILWATER_SOURCE_LABELS) as TailwaterSource[]).map((source) => (
                  <option value={source} key={source}>{TAILWATER_SOURCE_LABELS[source]}</option>
                ))}
              </SelectField>
              {tailwaterSource === "direct" ? (
                <Field label="Tailwater depth" value={tailwaterDepth} unit="m" onChange={setTailwaterDepth} />
              ) : (
                <div className="calc-field">
                  <span>Tailwater depth (computed)</span>
                  <strong className="computed-value">
                    {channelTailwater?.result != null ? `${format(channelTailwater.result)} m` : "—"}
                  </strong>
                </div>
              )}
              <Field label="Entrance loss coefficient" value={entranceLoss} onChange={setEntranceLoss} />
              <Field label="Outlet loss coefficient" value={outletLoss} onChange={setOutletLoss} />
              <Field label="Inlet invert level" value={invertLevel} unit="m" onChange={setInvertLevel} />
            </div>
            {tailwaterSource !== "direct" && (
              <>
                <div className="calc-fields">
                  {(tailwaterSource === "rectangular" || tailwaterSource === "trapezoidal") && (
                    <Field label="Channel base width" value={channelBase} unit="m" onChange={setChannelBase} />
                  )}
                  {tailwaterSource === "trapezoidal" && (
                    <Field label="Channel side slope (H:V)" value={channelSideSlope} onChange={setChannelSideSlope} />
                  )}
                  <Field label="Channel Manning's n" value={channelManningN} onChange={setChannelManningN} />
                  <Field label="Channel slope" value={channelSlope} unit="m/m" onChange={setChannelSlope} />
                </div>
                {tailwaterSource === "natural" && (
                  <NaturalChannelTable points={naturalPoints} onChange={setNaturalPoints} />
                )}
                {channelTailwater?.error && <p className="proposal-error">⚠ {channelTailwater.error}</p>}
              </>
            )}
          </Section>

          <Section number={4} title="Auto-size (design mode)">
            {dischargeMode === "hydrograph" && (
              <p className="answer-note">Auto-size is evaluated against the constant-discharge field and does not apply while a hydrograph is active.</p>
            )}
            <label className="research-check">
              <input
                type="checkbox"
                checked={autoSizeEnabled}
                disabled={dischargeMode === "hydrograph"}
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
                    normalDepth={profile.result.normalDepth}
                    criticalDepth={profile.result.criticalDepth}
                    tailwaterDepth={effectiveInput.tailwaterDepth}
                    governingHeadwaterLevel={calculateCulvert(effectiveInput).governingHeadwaterLevel}
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
              Governing headwater is the greater of FHWA HDS-5 inlet control
              and outlet control. On a mild slope, outlet control is computed
              by tracing the actual backwater profile from the outlet to the
              inlet (continuing as pressurized pipe flow if the barrel fills
              before reaching the inlet); on a steep slope, where a hydraulic
              jump may form inside the barrel, it falls back to the FHWA
              simplified energy approximation. Auto-size searches for the
              smallest size meeting the target headwater; a scan-then-bisect
              search finds the smallest adequate size even though governing
              headwater is not always monotonic in culvert size. The
              water-surface profile traces from whichever boundary the
              governing control implies rather than reproducing the legacy
              app&apos;s 17 named profile-family cases exactly. Confirm
              blockage, afflux and governing authority criteria before design
              issue. This is not yet a certified replacement for the full
              legacy Hidroalcun application.
            </p>
          </Section>
        </div>

        <aside className="calc-results">
          <p>LIVE RESULTS</p>
          <div className="result-hero">
            <span>{hydrograph ? "Peak governing headwater" : "Governing headwater"}</span>
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
          {peakRow && (
            <div className="auto-size-summary">
              <span>Peak at time {format(peakRow.time, 0)} min</span>
              <strong>{format(peakRow.discharge)} m³/s</strong>
              <small className="pass">✓ governs among {hydrograph?.result?.rows.length} rows</small>
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
              {hydrograph?.result && (
                <div className="hydrograph-table">
                  <table>
                    <thead><tr><th>Time (min)</th><th>Q (m³/s)</th><th>Headwater (m)</th><th>Control</th></tr></thead>
                    <tbody>
                      {hydrograph.result.rows.map((row, index) => (
                        <tr key={index} className={index === hydrograph.result?.peakIndex ? "peak" : ""}>
                          <td>{format(row.time, 0)}</td>
                          <td>{format(row.discharge, 2)}</td>
                          <td>{row.result ? format(row.result.governingHeadwaterDepth) : "—"}</td>
                          <td>{row.result ? row.result.governingControl : row.error || "error"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
