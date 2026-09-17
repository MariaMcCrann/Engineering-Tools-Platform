"use client";

import { useState } from "react";
import { calculateRatingCurve, culvertHeight, profileCalculationRows, type CulvertInput, type CulvertProfileResult, type TailwaterDefinition } from "./engine";

const fmt = (n: number) => Number.isFinite(n) ? n.toFixed(3) : "—";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ProfileDetails({ input, result }: { input: CulvertInput; result: CulvertProfileResult }) {
  const [detailed, setDetailed] = useState(false);
  const groups = result.profiles.map((profile) => ({ profile, rows: profileCalculationRows(input, profile) }));
  const header = ["Station (m)", "Depth (m)", "Bed level (m)", "Water level (m)", "Velocity (m/s)", "Froude", "Area (m²)", "Wetted perimeter (m)", "Hydraulic radius (m)", "Velocity head (m)", "Energy level (m)", "Friction slope"];
  const values = (row: ReturnType<typeof profileCalculationRows>[number]) => [row.x, row.depth, row.bedElevation, row.waterSurfaceElevation, row.velocity, row.froudeNumber, row.area, row.wettedPerimeter, row.hydraulicRadius, row.velocityHead, row.energyLevel, row.frictionSlope];
  if (!groups.length) return null;
  return <details className="culvert-detail-panel">
    <summary>Profile calculation tables</summary>
    <p className="answer-note">Station 0 is the inlet. Levels use the project datum. Only solved stations are tabulated; graph extensions are excluded. Separate branches are candidate profiles, not a solved rapidly varied transition.</p>
    <label className="research-check"><input type="checkbox" checked={detailed} onChange={(event) => setDetailed(event.target.checked)} /> Show detailed hydraulic calculations</label>
    <button type="button" className="download-btn" data-keep-csv onClick={() => downloadCsv("culvert-profile.csv", [
      ["Total discharge (m3/s)", input.discharge], ["Flow per barrel (m3/s)", input.discharge / input.barrels],
      ["Branch", ...header], ...groups.flatMap(({ profile, rows }, index) => rows.map((row) => [`${index + 1}: ${profile.regime}, ${profile.direction}`, ...values(row)])),
    ])}>Export profile CSV</button>
    {groups.map(({ profile, rows }, index) => <div key={index}>
      <h3>{profile.regime === "subcritical" ? "Subcritical" : "Supercritical"} branch · traced {profile.direction}</h3>
      {(profile.reachedFull || profile.reachedCritical) && <p className="answer-note">Trace ends at {profile.reachedFull ? "the barrel crown" : "critical depth"}; the remaining reach is not tabulated as solved open-channel flow.</p>}
      <div className="culvert-table-scroll" tabIndex={0} role="region" aria-label={`${profile.regime} profile calculations`}>
        <table><thead><tr>{header.slice(0, detailed ? header.length : 6).map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{values(row).slice(0, detailed ? header.length : 6).map((value, cell) => <td key={cell}>{cell === 11 ? value.toPrecision(4) : fmt(value)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>)}
  </details>;
}

export function RatingCurvePanel({ input, tailwater }: { input: CulvertInput; tailwater: TailwaterDefinition }) {
  const [enabled, setEnabled] = useState(false);
  const [minimum, setMinimum] = useState("0.1");
  const [maximum, setMaximum] = useState("5");
  const [visible, setVisible] = useState({ inlet: true, outlet: true, design: true, crown: true });
  let rows: ReturnType<typeof calculateRatingCurve> = [];
  let error = "";
  if (enabled) {
    try { rows = calculateRatingCurve(input, Number(minimum), Number(maximum), tailwater); }
    catch (caught) { error = caught instanceof Error ? caught.message : "Could not calculate curve."; }
  }
  const height = culvertHeight(input);
  const valid = rows.filter((row) => row.result);
  const maxHead = Math.max(height, ...valid.flatMap((row) => [row.result!.inletControl.headwaterDepth, row.result!.outletControl.headwaterDepth])) * 1.1;
  const x = (q: number) => 65 + (q - Number(minimum)) / (Number(maximum) - Number(minimum)) * 605;
  const y = (head: number) => 270 - head / maxHead * 230;
  const series = [
    { key: "inlet" as const, label: "Inlet control", color: "#2563eb", value: (row: typeof rows[number]) => row.result!.inletControl.headwaterDepth },
    { key: "outlet" as const, label: "Outlet control", color: "#b45309", value: (row: typeof rows[number]) => row.result!.outletControl.headwaterDepth },
    { key: "design" as const, label: "Governing headwater", color: "#0f766e", value: (row: typeof rows[number]) => row.result!.governingHeadwaterDepth },
  ];
  function path(value: typeof series[number]["value"]) {
    let move = true;
    return rows.map((row) => {
      if (!row.result) { move = true; return ""; }
      const command = move ? "M" : "L"; move = false;
      return `${command}${x(row.discharge)},${y(value(row))}`;
    }).join(" ");
  }
  return <div>
    <p className="answer-note">Compare inlet, outlet and governing headwater over 20 equal flow intervals, as in Hidroalcun. Flow is total discharge across all barrels; headwater is depth above the inlet invert. Receiving-channel tailwater is recalculated at each flow.</p>
    <div className="calc-fields">
      <label className="calc-field"><span>Minimum total flow (m³/s)</span><input type="number" step="any" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></label>
      <label className="calc-field"><span>Maximum total flow (m³/s)</span><input type="number" step="any" value={maximum} onChange={(e) => setMaximum(e.target.value)} /></label>
    </div>
    <label className="research-check"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Show calibration curve</label>
    {error && <p className="proposal-error" role="alert">{error}</p>}
    {enabled && valid.length > 0 && <>
      <div className="culvert-curve-options">{[...series, { key: "crown" as const, label: "Barrel height", color: "#64748b" }].map((item) => <label key={item.key} style={{ color: item.color }}><input type="checkbox" checked={visible[item.key]} onChange={(e) => setVisible({ ...visible, [item.key]: e.target.checked })} />{item.label}</label>)}</div>
      <svg viewBox="0 0 710 325" role="img" aria-label="Calibration curve: total discharge against headwater depth" className="culvert-rating-chart">
        {[0, 1, 2, 3, 4].map((tick) => <g key={tick}>
          <line x1="65" y1={y(maxHead * tick / 4)} x2="670" y2={y(maxHead * tick / 4)} stroke="#e2e8f0" />
          <text x="56" y={y(maxHead * tick / 4) + 4} textAnchor="end">{(maxHead * tick / 4).toFixed(2)}</text>
          <text x={65 + tick * 605 / 4} y="289" textAnchor="middle">{(Number(minimum) + (Number(maximum) - Number(minimum)) * tick / 4).toFixed(2)}</text>
        </g>)}
        <line x1="65" y1="40" x2="65" y2="270" stroke="#64748b" /><line x1="65" y1="270" x2="670" y2="270" stroke="#64748b" />
        <text x="370" y="316" textAnchor="middle">Total discharge (m³/s)</text><text transform="translate(16 160) rotate(-90)" textAnchor="middle">Headwater depth (m)</text>
        {visible.crown && <line x1="65" x2="670" y1={y(height)} y2={y(height)} stroke="#64748b" strokeDasharray="5 5" />}
        {series.filter((item) => visible[item.key]).map((item) => <path key={item.key} d={path(item.value)} stroke={item.color} strokeWidth={item.key === "design" ? 3 : 2} strokeDasharray={item.key === "design" ? "7 3" : undefined} fill="none" />)}
      </svg>
    </>}
    {rows.length > 0 && <>
      {rows.some((row) => row.error) && <p className="proposal-error" role="alert">Some flows could not be calculated. Gaps are omitted from the curves; see the table for reasons.</p>}
      <button type="button" className="download-btn" data-keep-csv onClick={() => downloadCsv("culvert-calibration.csv", [
        ["Total Q (m3/s)", "Tailwater above outlet (m)", "Inlet HW (m)", "Outlet HW (m)", "Governing HW (m)", "Control", "Error", "Warnings"],
        ...rows.map((row) => [row.discharge, row.input?.tailwaterDepth ?? "", row.result?.inletControl.headwaterDepth ?? "", row.result?.outletControl.headwaterDepth ?? "", row.result?.governingHeadwaterDepth ?? "", row.result?.governingControl ?? "", row.error, row.result?.warnings.join("; ") ?? ""]),
      ])}>Export calibration CSV</button>
      <details className="culvert-detail-panel"><summary>Calibration results · {rows.length} flows</summary>
        <div className="culvert-table-scroll" tabIndex={0} role="region" aria-label="Calibration results"><table>
          <thead><tr><th>Total Q (m³/s)</th><th>Tailwater (m)</th><th>Inlet HW (m)</th><th>Outlet HW (m)</th><th>Governing HW (m)</th><th>Control / error</th><th>Review notes</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.discharge}><td>{fmt(row.discharge)}</td><td>{fmt(row.input?.tailwaterDepth ?? NaN)}</td><td>{fmt(row.result?.inletControl.headwaterDepth ?? NaN)}</td><td>{fmt(row.result?.outletControl.headwaterDepth ?? NaN)}</td><td>{fmt(row.result?.governingHeadwaterDepth ?? NaN)}</td><td>{row.result?.governingControl ?? row.error}</td><td style={{ whiteSpace: "normal", minWidth: 240 }}>{row.result?.warnings.join(" ")}</td></tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </div>;
}
