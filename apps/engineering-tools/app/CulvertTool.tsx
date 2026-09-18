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
  describeProfile,
  EntranceCategory,
  ENTRANCE_CATEGORY_LABELS,
  ENTRANCE_OPTIONS,
  findEntranceOption,
  HydraulicJump,
  inputAtSize,
  InletEquationForm,
  runCulvertHydrograph,
  inputForDischarge,
  TailwaterDefinition,
  traceCulvertProfile,
  WaterSurfaceProfile,
} from "./culvert/engine";

import { RatingCurvePanel, ProfileDetails } from "./culvert/ResultsPanels";

const numberValue = (value: string) => value.trim() ? Number(value) : Number.NaN;
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
  direct: "Known water level (fixed)",
  rectangular: "Rectangular channel",
  trapezoidal: "Trapezoidal channel",
  natural: "Natural channel (surveyed cross-section)",
};

interface ChannelPointInput {
  station: string;
  elevation: string;
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
  tailwater: TailwaterDefinition,
): { result: ReturnType<typeof runCulvertHydrograph> | null; error: string } {
  try {
    return {
      result: runCulvertHydrograph(
        input,
        rows.map((row) => ({ time: numberValue(row.time), discharge: numberValue(row.discharge) })),
        tailwater,
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

function HydrographChart({ rows }: { rows: HydrographRowInput[] }) {
  const points = rows
    .map((row) => ({ time: numberValue(row.time), discharge: numberValue(row.discharge) }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.discharge))
    .sort((a, b) => a.time - b.time);
  if (points.length < 2) return null;
  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;
  const maxDischarge = Math.max(...points.map((point) => point.discharge), 0.001);
  const x = (t: number) => 65 + ((t - minTime) / Math.max(maxTime - minTime, 1e-9)) * 605;
  const y = (q: number) => 250 - (q / maxDischarge) * 200;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.time)},${y(point.discharge)}`).join(" ");
  return (
    <svg viewBox="0 0 710 300" role="img" aria-label="Hydrograph: discharge against time" className="culvert-rating-chart">
      {[0, 1, 2, 3, 4].map((tick) => (
        <g key={tick}>
          <line x1="65" y1={y((maxDischarge * tick) / 4)} x2="670" y2={y((maxDischarge * tick) / 4)} stroke="#e2e8f0" />
          <text x="56" y={y((maxDischarge * tick) / 4) + 4} textAnchor="end">{((maxDischarge * tick) / 4).toFixed(2)}</text>
          <text x={65 + (tick * 605) / 4} y="269" textAnchor="middle">{(minTime + ((maxTime - minTime) * tick) / 4).toFixed(0)}</text>
        </g>
      ))}
      <line x1="65" y1="30" x2="65" y2="250" stroke="#64748b" />
      <line x1="65" y1="250" x2="670" y2="250" stroke="#64748b" />
      <text x="370" y="296" textAnchor="middle">Time (min)</text>
      <text transform="translate(16 150) rotate(-90)" textAnchor="middle">Discharge (m³/s)</text>
      <path d={path} stroke="#2563eb" strokeWidth="2.5" fill="none" />
      {points.map((point, index) => <circle key={index} cx={x(point.time)} cy={y(point.discharge)} r="3" fill="#2563eb" />)}
    </svg>
  );
}

function ChannelCrossSectionChart({
  source, base, sideSlope, bedLevel, naturalPoints, waterLevel,
}: {
  source: TailwaterSource;
  base: number;
  sideSlope: number;
  bedLevel: number;
  naturalPoints: ChannelPointInput[];
  waterLevel: number;
}) {
  if (source === "direct") return null;
  type ChannelPoint = { station: number; elevation: number };
  let points: ChannelPoint[];
  let bedRef: number;

  if (source === "natural") {
    const parsed = naturalPoints
      .map((p) => ({ station: numberValue(p.station), elevation: numberValue(p.elevation) }))
      .filter((p) => Number.isFinite(p.station) && Number.isFinite(p.elevation))
      .sort((a, b) => a.station - b.station);
    if (parsed.length < 2) return null;
    bedRef = Math.min(...parsed.map((p) => p.elevation));
    points = parsed;
  } else {
    if (!(base > 0) || !Number.isFinite(bedLevel)) return null;
    bedRef = bedLevel;
    const wallHeight = Math.max(base * 0.6, Number.isFinite(waterLevel) ? (waterLevel - bedLevel) * 1.4 : 1, 1);
    points = source === "trapezoidal" && sideSlope > 0
      ? [
          { station: -sideSlope * wallHeight, elevation: bedRef + wallHeight },
          { station: 0, elevation: bedRef },
          { station: base, elevation: bedRef },
          { station: base + sideSlope * wallHeight, elevation: bedRef + wallHeight },
        ]
      : [
          { station: 0, elevation: bedRef + wallHeight },
          { station: 0, elevation: bedRef },
          { station: base, elevation: bedRef },
          { station: base, elevation: bedRef + wallHeight },
        ];
  }

  const minStation = Math.min(...points.map((p) => p.station));
  const maxStation = Math.max(...points.map((p) => p.station));
  const minElev = Math.min(...points.map((p) => p.elevation), bedRef);
  const maxElev = Math.max(...points.map((p) => p.elevation), Number.isFinite(waterLevel) ? waterLevel : minElev + 1);
  const stationSpan = Math.max(maxStation - minStation, 0.001);
  const elevSpan = Math.max(maxElev - minElev, 0.001);

  const width = 640, height = 260, leftPad = 60, rightPad = 20, topPad = 24, bottomPad = 34;
  const x = (s: number) => leftPad + ((s - minStation) / stationSpan) * (width - leftPad - rightPad);
  const y = (e: number) => (height - bottomPad) - ((e - minElev) / elevSpan) * (height - topPad - bottomPad);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Receiving channel cross-section" className="culvert-rating-chart">
      <polyline points={points.map((p) => `${x(p.station)},${y(p.elevation)}`).join(" ")} fill="none" stroke="#64748b" strokeWidth="2.5" />
      {Number.isFinite(waterLevel) && waterLevel > minElev && (
        <>
          <line x1={x(minStation)} y1={y(waterLevel)} x2={x(maxStation)} y2={y(waterLevel)} stroke="#2563eb" strokeWidth="2" strokeDasharray="6 3" />
          <text x={x(minStation) + 4} y={y(waterLevel) - 6} fill="#2563eb" fontSize="12">Water level {waterLevel.toFixed(2)} m</text>
        </>
      )}
      {points.map((p, index) => <circle key={index} cx={x(p.station)} cy={y(p.elevation)} r="3" fill="#475569" />)}
      <text x={leftPad} y={height - 10} fontSize="12">Station (m)</text>
      <text transform={`translate(16 ${height / 2}) rotate(-90)`} textAnchor="middle" fontSize="12">Elevation (m)</text>
    </svg>
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

  // Diagram-only formation: no road crest level or overtopping is calculated.
  const formationCover = height * 0.35;
  const elevations = [
    inletLevel + height + formationCover,
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
      <svg viewBox={`0 0 ${width} ${viewHeight}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Culvert water-surface profile with schematic road formation">
        <polyline
          className="profile-road-formation"
          points={`${xScale(0)},${yScale(invertAt(0) + height)} ${xScale(length * 0.14)},${yScale(invertAt(length * 0.14) + height + formationCover)} ${xScale(length * 0.93)},${yScale(invertAt(length * 0.93) + height + formationCover)} ${xScale(length)},${yScale(invertAt(length) + height)}`}
        />
        <text className="profile-road-label" textAnchor="middle" x={xScale(length * 0.5)} y={yScale(invertAt(length * 0.5) + height + formationCover) - 12}>
          Road formation
        </text>

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
      <p className="engine-note">Road formation is schematic; road levels and overtopping are not calculated.</p>
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
  const [useInvertLevels, setUseInvertLevels] = useState(false);
  const [outletInvertLevel, setOutletInvertLevel] = useState("-0.3");
  const [roughness, setRoughness] = useState("0.013");
  const [discharge, setDischarge] = useState("2");
  const [directWaterLevel, setDirectWaterLevel] = useState("0.2");
  const [entranceLoss, setEntranceLoss] = useState("0.2");
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

  const [showProfile, setShowProfile] = useState(true);
  const [selectedHydrographRow, setSelectedHydrographRow] = useState("peak");
  const [channelBedLevel, setChannelBedLevel] = useState("-0.3");

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
      if (nextOptions[0]) setEntranceLoss(String(nextOptions[0].ke));
    }
    const nextAutoSizeOptions = AUTO_SIZE_PARAMETERS_BY_SHAPE[nextShape];
    if (!nextAutoSizeOptions.some((option) => option.value === autoSizeParameter)) {
      setAutoSizeParameter(nextAutoSizeOptions[0].value);
    }
  };

  const resolvedSlope = useInvertLevels ? (numberValue(invertLevel) - numberValue(outletInvertLevel)) / numberValue(length) : numberValue(slope);
  const outletLevel = numberValue(invertLevel) - resolvedSlope * numberValue(length);

  const tailwater: TailwaterDefinition = tailwaterSource === "direct"
    ? { kind: "direct", depth: numberValue(directWaterLevel) - outletLevel }
    : tailwaterSource === "natural"
      ? { kind: "natural", channel: { points: naturalPoints.map((p) => ({ station: numberValue(p.station), elevation: numberValue(p.elevation) })), manningN: numberValue(channelManningN), slope: numberValue(channelSlope) } }
      : tailwaterSource === "rectangular"
        ? { kind: "rectangular", bedLevel: numberValue(channelBedLevel), channel: { base: numberValue(channelBase), manningN: numberValue(channelManningN), slope: numberValue(channelSlope) } }
        : { kind: "trapezoidal", bedLevel: numberValue(channelBedLevel), channel: { base: numberValue(channelBase), sideSlope: numberValue(channelSideSlope), manningN: numberValue(channelManningN), slope: numberValue(channelSlope) } };

  const input: CulvertInput = {
    shape,
    diameter: numberValue(diameter),
    width: numberValue(width),
    height: numberValue(height),
    barrels: numberValue(barrels),
    length: numberValue(length),
    slope: resolvedSlope,
    roughness: numberValue(roughness),
    discharge: numberValue(discharge),
    tailwaterDepth: numberValue(directWaterLevel) - outletLevel,
    entranceLossCoefficient: numberValue(entranceLoss),
    outletLossCoefficient: numberValue(outletLoss),
    inletInvertLevel: numberValue(invertLevel),
    entranceType,
    inletEquationForm,
    customEntranceCoefficients: {
      k: numberValue(customK), m: numberValue(customM), c: numberValue(customC), y: numberValue(customY),
    },
  };
  let channelError = "";
  try { input.tailwaterDepth = inputForDischarge(input, input.discharge, tailwater).tailwaterDepth; }
  catch (error) { input.tailwaterDepth = Number.NaN; channelError = error instanceof Error ? error.message : "Invalid tailwater."; }
  const hydrograph = dischargeMode === "hydrograph" ? runHydrograph(input, hydrographRows, tailwater) : null;
  const autoSize = autoSizeEnabled && dischargeMode === "constant"
    ? runAutoSize(input, autoSizeParameter, numberValue(targetHeadwaterLevel))
    : null;
  const peakRow = hydrograph?.result && hydrograph.result.peakIndex !== null
    ? hydrograph.result.rows[hydrograph.result.peakIndex]
    : null;
  const selectedRow = hydrograph?.result
    ? selectedHydrographRow === "peak" ? peakRow : hydrograph.result.rows[Number(selectedHydrographRow)] ?? null
    : null;
  const calculation = hydrograph
    ? {
        result: selectedRow?.result ?? null,
        error: hydrograph.error || selectedRow?.error || (hydrograph.result && !selectedRow ? "Select a valid hydrograph row." : ""),
      }
    : autoSize
      ? { result: autoSize.result?.result ?? null, error: autoSize.error }
      : channelError ? { result: null, error: channelError } : runCulvertCalculation(input);

  const effectiveInput = autoSize?.result
    ? inputAtSize(input, autoSize.result.parameter, autoSize.result.solvedSize)
    : selectedRow?.input ?? input;
  const profile = showProfile && calculation.result ? runProfile(effectiveInput) : null;

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
      ["Selected total discharge", effectiveInput.discharge, "m3/s"],
      ["Tailwater above outlet invert", effectiveInput.tailwaterDepth, "m"],
      ["Downstream water level", outletLevel + effectiveInput.tailwaterDepth, "m datum"],
      ...(profile?.result ? [["Profile description", describeProfile(profile.result), "-"]] : []),
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
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
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
        outlet-control headwater, and the governing design headwater. Hidroalcun workflow: analyse or size, inspect profiles and tables, then compare the calibration curves.
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
              <Field label="Inlet invert level" value={invertLevel} unit="m datum" onChange={setInvertLevel} />
              {useInvertLevels ? <Field label="Outlet invert level" value={outletInvertLevel} unit="m datum" onChange={setOutletInvertLevel} /> : <Field label="Slope" value={slope} unit="m/m" onChange={setSlope} />}
              <Field label="Manning's n" value={roughness} onChange={setRoughness} />
            </div>
            <label className="research-check"><input type="checkbox" checked={useInvertLevels} onChange={(event) => {
              if (event.target.checked) setOutletInvertLevel(String(numberValue(invertLevel) - numberValue(slope) * numberValue(length)));
              else setSlope(String(input.slope));
              setUseInvertLevels(event.target.checked);
            }} /> Define slope from inlet and outlet levels (Hidroalcun)</label>
            <p className="answer-note">Outlet invert {format((input.inletInvertLevel ?? 0) - input.slope * input.length)} m · slope {format(input.slope * 100)}%. A positive falling slope is required.</p>
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
            <div className="calc-fields">
              <Field label="Entrance loss coefficient" value={entranceLoss} onChange={setEntranceLoss} />
            </div>
          </Section>

          <Section number={3} title="Hydrology">
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
            {dischargeMode === "hydrograph" ? (
              <>
                <HydrographTable rows={hydrographRows} onChange={setHydrographRows} />
                <HydrographChart rows={hydrographRows} />
              </>
            ) : (
              <div className="calc-fields">
                <Field label="Design discharge" value={discharge} unit="m³/s" onChange={setDischarge} />
              </div>
            )}
          </Section>

          <Section number={4} title="Downstream conditions">
            <div className="calc-fields">
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
                <Field label="Downstream water level" value={directWaterLevel} unit="m datum" onChange={setDirectWaterLevel} />
              ) : (
                <div className="calc-field">
                  <span>Tailwater above outlet invert (selected flow)</span>
                  <strong className="computed-value">
                    {calculation.result ? `${format(effectiveInput.tailwaterDepth)} m` : "—"}
                  </strong>
                </div>
              )}
              <Field label="Outlet loss coefficient" value={outletLoss} onChange={setOutletLoss} />
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
                  {tailwaterSource !== "natural" && <Field label="Receiving-channel bed level" value={channelBedLevel} unit="m datum" onChange={setChannelBedLevel} />}
                  <Field label="Channel Manning's n" value={channelManningN} onChange={setChannelManningN} />
                  <Field label="Channel slope" value={channelSlope} unit="m/m" onChange={setChannelSlope} />
                </div>
                {tailwaterSource === "natural" && (
                  <NaturalChannelTable points={naturalPoints} onChange={setNaturalPoints} />
                )}
                <p className="answer-note">Channel levels use the same datum as the inlet invert. Tailwater is recalculated for each total flow; invalid channel data blocks that result.</p>
                <ChannelCrossSectionChart
                  source={tailwaterSource}
                  base={numberValue(channelBase)}
                  sideSlope={numberValue(channelSideSlope)}
                  bedLevel={numberValue(channelBedLevel)}
                  naturalPoints={naturalPoints}
                  waterLevel={outletLevel + effectiveInput.tailwaterDepth}
                />
              </>
            )}
          </Section>

          <Section number={5} title="Auto-size (design mode)">
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

          <Section number={6} title="Water-surface profile and calculation tables">
            {hydrograph?.result && <SelectField label="Inspect hydrograph flow" value={selectedHydrographRow} onChange={setSelectedHydrographRow}>
              <option value="peak">Peak governing headwater</option>
              {hydrograph.result.rows.map((row, index) => <option key={index} value={index}>Row {index + 1}: {format(row.time, 1)} min · {format(row.discharge)} m³/s{row.error ? " — invalid" : ""}</option>)}
            </SelectField>}
            <p className="answer-note">Total flow {format(effectiveInput.discharge)} m³/s · flow per barrel {format(effectiveInput.discharge / effectiveInput.barrels)} m³/s. Profiles and tables use this selected flow.</p>
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
                <Metric name="Profile description" value={describeProfile(profile.result)} />
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
                <ProfileDetails input={effectiveInput} result={profile.result} />
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

          <Section number={7} title="Calibration curve">
            <RatingCurvePanel input={effectiveInput} tailwater={tailwater} />
          </Section>
          <Section number={8} title="Calculation basis">
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
            <span>{hydrograph ? selectedHydrographRow === "peak" ? "Peak governing headwater" : "Selected flow headwater" : "Governing headwater"}</span>
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
              <small className="pass">✓ peak among {hydrograph?.result?.rows.filter((row) => row.result).length} valid rows</small>
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
              <Metric name="Downstream (tailwater) depth" value={`${format(effectiveInput.tailwaterDepth)} m`} />
              <Metric name="Downstream water level" value={`${format(outletLevel + effectiveInput.tailwaterDepth)} m`} />
              <Metric name="Velocity" value={`${format(result.upstreamVelocity)} m/s`} />
              <Metric name="Froude number" value={format(result.froudeNumber)} />
              <Metric name="Flow condition" value={result.flowCondition.replaceAll("-", " ")} />
              {profile?.result && <Metric name="Profile description" value={describeProfile(profile.result)} />}
              {result.warnings.length > 0 && (
                <div className="culvert-warnings">
                  <strong>Engineering review</strong>
                  <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}
              <button className="download-btn" data-keep-csv onClick={download}>↓ Export CSV</button>
            </>
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
        </aside>
      </div>
    </div>
  );
}
