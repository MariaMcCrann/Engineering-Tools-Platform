"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { ChannelFlowTool, ProposalTool, StageStorageTool } from "./EngineeringTools";
import { OverlandFlowTool } from "./OverlandFlowTool";
import { RisingMainTool } from "./RisingMainTool";
import { GsdmPmpTool } from "./GsdmPmpTool";
import { SpillwayTool } from "./SpillwayTool";

type Peak = { key: string; description: string };
type Row = {
  run: number;
  duration: string;
  durationMinutes: number;
  aep: string;
  aepValue: number;
  temporalPattern: number | null;
  rain: number;
  arf: number;
  peaks: Record<string, number>;
};
type Parsed = {
  fileName: string;
  modelVersion: string;
  runDate: string;
  catchment: string;
  kc: string;
  m: string;
  loss: string;
  patternMode: string;
  peaks: Peak[];
  rows: Row[];
};
type Result = {
  aep: string;
  duration: string;
  durationMinutes: number;
  median: number | null;
  selected: number;
  temporalPattern: number | null;
  patternCount: number;
  status: "ok" | "single" | "incomplete";
};

const durationToMinutes = (value: number, unit: string) =>
  unit.toLowerCase().startsWith("hour") ? value * 60 : value;

function parseBatch(text: string, fileName: string): Parsed {
  const lines = text.replace(/\r/g, "").split("\n");
  const field = (label: string) => {
    const line = lines.find((l) => l.trim().startsWith(label));
    return line?.split(":").slice(1).join(":").trim() ?? "—";
  };

  const peakDescriptions = new Map<string, string>();
  let inPeakBlock = false;
  for (const line of lines) {
    if (/^\s*Peak\s+Description\s*$/.test(line)) { inPeakBlock = true; continue; }
    if (inPeakBlock && /^\s*Run\s+Duration/.test(line)) break;
    const match = inPeakBlock && line.match(/^\s*(\d+)\s+(.+?)\s*$/);
    if (match) peakDescriptions.set(`Peak${match[1].padStart(4, "0")}`, match[2].trim());
  }

  const headerIndex = lines.findIndex((l) => /^\s*Run\s+Duration/.test(l));
  if (headerIndex < 0) throw new Error("The RORB results table could not be found.");
  const header = lines[headerIndex];
  const peakKeys = [...header.matchAll(/Peak\d+/g)].map((m) => m[0]);
  if (!peakKeys.length) throw new Error("No peak-flow columns were found.");
  const hasTP = /\bTPat\b|Temporal\s*Pattern/i.test(header);
  const hasFilteringColumns = /%Filtered/i.test(header) && /TempPatFiltering/i.test(header);
  const rows: Row[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    if (/Elapsed Run Time/i.test(line)) break;
    if (!/^\s*\d+\s+/.test(line)) continue;
    const bits = line.trim().split(/\s+/);
    let i = 0;
    const run = Number(bits[i++]);
    const durationValue = Number(bits[i++]);
    const durationUnit = bits[i++];
    const aep = bits[i++];
    const temporalPattern = hasTP ? Number(bits[i++]) : null;
    if (hasFilteringColumns) {
      i += 2; // %Filtered and TempPatFiltering (Y/N)
    }
    const rain = Number(bits[i++]);
    const arf = Number(bits[i++]);
    const values = bits.slice(i).map(Number);
    if (![run, durationValue, rain, arf, ...values].every(Number.isFinite)) continue;
    rows.push({
      run,
      duration: `${durationValue} ${durationUnit}`,
      durationMinutes: durationToMinutes(durationValue, durationUnit),
      aep,
      aepValue: Number(aep.replace("%", "")),
      temporalPattern,
      rain,
      arf,
      peaks: Object.fromEntries(peakKeys.map((key, index) => [key, values[index]])),
    });
  }
  if (!rows.length) throw new Error("No valid RORB run rows were found.");
  const parameterLine = lines.find((l) => /Parameters:\s+kc/i.test(l)) ?? "";
  const params = parameterLine.match(/kc\s*=\s*([\d.]+).*?m\s*=\s*([\d.]+)/i);
  const lossIndex = lines.findIndex((l) => /Loss parameters\s+Initial loss/i.test(l));
  const lossValues = lossIndex >= 0 ? lines[lossIndex + 1]?.trim().split(/\s+/) : [];
  return {
    fileName,
    modelVersion: field("Program version").split("(")[0].trim(),
    runDate: field("Date run"),
    catchment: field("Catchment file").split(/[\\/]/).pop() ?? "—",
    kc: params?.[1] ?? "—",
    m: params?.[2] ?? "—",
    loss: lossValues?.length >= 2 ? `${lossValues[0]} mm / ${lossValues[1]} mm/h` : "—",
    patternMode: field("Temporal pattern"),
    peaks: peakKeys.map((key) => ({ key, description: peakDescriptions.get(key) ?? key })),
    rows,
  };
}

function calculate(parsed: Parsed, peakKey: string): Result[] {
  const groups = new Map<string, Row[]>();
  for (const row of parsed.rows) {
    const key = `${row.aep}|${row.durationMinutes}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const byAep = new Map<string, Result[]>();
  for (const rows of groups.values()) {
    const sorted = rows.map((r) => ({ row: r, flow: r.peaks[peakKey] })).sort((a, b) => a.flow - b.flow);
    const n = sorted.length;
    const median = n > 1
      ? n % 2 ? sorted[(n - 1) / 2].flow : (sorted[n / 2 - 1].flow + sorted[n / 2].flow) / 2
      : null;
    const oneUp = median === null ? sorted[0] : sorted.find((item) => item.flow > median) ?? sorted[n - 1];
    const item: Result = {
      aep: rows[0].aep,
      duration: rows[0].duration,
      durationMinutes: rows[0].durationMinutes,
      median,
      selected: oneUp.flow,
      temporalPattern: oneUp.row.temporalPattern,
      patternCount: n,
      status: n === 1 ? "single" : n === 10 ? "ok" : "incomplete",
    };
    byAep.set(item.aep, [...(byAep.get(item.aep) ?? []), item]);
  }
  return [...byAep.values()]
    .map((items) => items.sort((a, b) => b.selected - a.selected)[0])
    .sort((a, b) => Number(b.aep.replace("%", "")) - Number(a.aep.replace("%", "")));
}

const fmt = (n: number | null) => n === null ? "—" : n.toFixed(4);

type ViewKey = "tools" | "rorb" | "channel" | "storage" | "overland" | "rising" | "gsdm" | "spillway" | "proposal";

type ToolEntry = { view: Exclude<ViewKey, "tools">; icon: string; label: string; desc: string; disabled?: boolean };

const TOOL_CATEGORIES: { key: string; label: string; tools: ToolEntry[] }[] = [
  {
    key: "project-management",
    label: "Project Management",
    tools: [
      { view: "proposal", icon: "PT", label: "Proposal Tool", desc: "Prepare consistent consultancy proposals.", disabled: true },
    ],
  },
  { key: "structures", label: "Structures", tools: [] },
  {
    key: "hydrology",
    label: "Hydrology",
    tools: [
      { view: "rorb", icon: "MF", label: "RORB Median Flow", desc: "Process temporal-pattern ensembles and identify critical flows." },
      { view: "storage", icon: "SS", label: "Stage Storage", desc: "Stage-storage calculations and outputs." },
      { view: "gsdm", icon: "GP", label: "GSDM PMP", desc: "Short-duration PMP estimates and RORB rainfall inputs." },
    ],
  },
  {
    key: "hydraulics",
    label: "Hydraulics",
    tools: [
      { view: "channel", icon: "CF", label: "Channel Flow", desc: "Trapezoidal channel flow calculations." },
      { view: "overland", icon: "OF", label: "Overland Flow", desc: "Road cross-section capacity and Manning flow checks." },
      { view: "rising", icon: "RM", label: "Rising Main", desc: "Pipe losses, surge pressure, thrust blocks and pump-sump cycling." },
      { view: "spillway", icon: "SP", label: "Spillway", desc: "Weir flow, chute hydraulics and stilling-basin checks." },
    ],
  },
];

export default function Home() {
  const [view, setView] = useState<ViewKey>("rorb");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [peakKey, setPeakKey] = useState("");
  const [project, setProject] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => parsed && peakKey ? calculate(parsed, peakKey) : [], [parsed, peakKey]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      const next = parseBatch(await file.text(), file.name);
      setParsed(next);
      setPeakKey(next.peaks[0]?.key ?? "");
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "The file could not be processed.");
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0]);
  };
  const exportCsv = () => {
    if (!results.length) return;
    const lines = ["AEP,Critical duration,Median flow,Selected flow,Temporal pattern,Pattern count,Status"];
    results.forEach((r) => lines.push([r.aep, r.duration, r.median ?? "", r.selected, r.temporalPattern ?? "", r.patternCount, r.status].join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `${project.trim().replace(/[^a-z0-9_-]+/gi, "_") || "RORB"}_median_flow.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const maxFlow = Math.max(...results.map((r) => r.selected), 1);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="personal-mark" src="/brand-mark.svg" alt=""/><span>ENGINEERING<br/>TOOLS</span></div>
        <div className="tool-nav">
          <button className={view === "tools" ? "nav-selected" : "back"} onClick={() => setView("tools")}>◀ &nbsp; All Tools</button>
          {TOOL_CATEGORIES.map((cat) => (
            <div className="nav-category" key={cat.key}>
              <div className="nav-category-label">{cat.label}</div>
              {cat.tools.length === 0 ? (
                <div className="nav-category-empty">Coming soon</div>
              ) : (
                cat.tools.map((t) => (
                  <button
                    key={t.view}
                    className={(view === t.view ? "active-tool" : "") + (t.disabled ? " nav-disabled" : "")}
                    onClick={() => !t.disabled && setView(t.view)}
                    disabled={t.disabled}
                    title={t.disabled ? "Not ready for review" : undefined}
                  >
                    {t.label}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
        <div className="version">ENGINEERING TOOL<br/><strong>Version 1.0</strong></div>
      </aside>

      <section className="workspace">
        {view === "tools" ? (
          <>
            <header className="hub-header"><span>Engineering Tools</span></header>
            <div className="content hub-content">
              <p className="eyebrow">PERSONAL ENGINEERING WORKSPACE</p>
              <h1>All Tools</h1>
              <p className="subtitle">Open a calculator or see what is being added to the platform.</p>
              {TOOL_CATEGORIES.map((cat) => (
                <section className="tool-category-section" key={cat.key}>
                  <h2 className="tool-category-title">{cat.label}</h2>
                  {cat.tools.length === 0 ? (
                    <div className="tool-category-empty">More tools coming soon.</div>
                  ) : (
                    <div className="tool-grid">
                      {cat.tools.map((t) => (
                        <button
                          key={t.view}
                          className={`tool-card ${t.disabled ? "unavailable" : "available"}`}
                          onClick={() => !t.disabled && setView(t.view)}
                          disabled={t.disabled}
                          aria-disabled={t.disabled || undefined}
                          title={t.disabled ? "Not ready for review" : undefined}
                        >
                          <span className="tool-icon">{t.icon}</span>
                          <span><strong>{t.label}</strong><small>{t.desc}</small></span>
                          <b>{t.disabled ? "Not ready" : "Open →"}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : view === "channel" ? <><header className="hub-header"><span>Channel Flow</span></header><ChannelFlowTool/></> : view === "storage" ? <><header className="hub-header"><span>Stage Storage</span></header><StageStorageTool/></> : view === "overland" ? <><header className="hub-header"><span>Overland Flow</span></header><OverlandFlowTool/></> : view === "rising" ? <><header className="hub-header"><span>Rising Main</span></header><RisingMainTool/></> : view === "gsdm" ? <><header className="hub-header"><span>GSDM PMP</span></header><GsdmPmpTool/></> : view === "spillway" ? <><header className="hub-header"><span>Spillway</span></header><SpillwayTool/></> : view === "proposal" ? <><header className="hub-header"><span>Proposal Tool</span></header><ProposalTool/></> : <>
        <header className="top-tabs"><button className="selected">New Analysis</button><button disabled>Projects</button><button disabled>Model QA</button></header>
        <div className="content">
          <div className="title-row"><div><p className="eyebrow">RORB RESULTS PROCESSOR</p><h1>Median Flow Analysis</h1><p className="subtitle">Upload a RORB batch output to identify the 1-up median flow and critical duration.</p></div><span className="condition-pill">Existing Conditions</span></div>

          <div className="form-grid">
            <label>Project Name<input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. 555_01 Project Name" /></label>
            <label>Hydrograph Location<select value={peakKey} onChange={(e) => setPeakKey(e.target.value)} disabled={!parsed}>{parsed?.peaks.map((p) => <option value={p.key} key={p.key}>{p.description}</option>) ?? <option>Upload a file first</option>}</select></label>
          </div>

          <section className="upload-card">
            <div className="card-head"><div><h2>Existing Conditions</h2><p>RORB batch output file</p></div>{parsed && <span className="valid">✓ File validated</span>}</div>
            <div className={`dropzone ${dragging ? "dragging" : ""} ${parsed ? "loaded" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}>
              <input ref={inputRef} hidden type="file" accept=".out,.txt" onChange={(e: ChangeEvent<HTMLInputElement>) => loadFile(e.target.files?.[0])}/>
              <div className="upload-icon">⇧</div><strong>{parsed ? parsed.fileName : "Drop batch.out here or click to browse"}</strong><span>{parsed ? `${parsed.rows.length} runs · ${parsed.peaks.length} hydrograph location${parsed.peaks.length === 1 ? "" : "s"}` : "RORB .out files up to 20 MB"}</span>
            </div>
            {error && <div className="error">⚠ {error}</div>}
          </section>

          {parsed && <>
            <section className="model-strip">
              <div><span>RORB Version</span><strong>{parsed.modelVersion}</strong></div><div><span>Run Date</span><strong>{parsed.runDate}</strong></div><div><span>Catchment</span><strong>{parsed.catchment}</strong></div><div><span>kc / m</span><strong>{parsed.kc} / {parsed.m}</strong></div><div><span>Initial / Continuing Loss</span><strong>{parsed.loss}</strong></div>
            </section>

            {results.some((r) => r.status === "single") && <div className="warning"><div>!</div><p><strong>Median flow cannot be calculated from this run.</strong><br/>This file contains one temporal pattern per AEP and duration. Run the ARR temporal-pattern ensemble in RORB and upload the resulting batch output. The table below shows maximum single-pattern flows for checking only.</p></div>}

            <div className="results-head"><div><p className="eyebrow">ANALYSIS RESULTS</p><h2>Critical flows by AEP</h2></div><button className="export" onClick={exportCsv}>↓ Export CSV</button></div>
            <section className="results-grid">
              <div className="table-card"><table><thead><tr><th>AEP</th><th>Critical duration</th><th>Median</th><th>1-up median / peak</th><th>TP</th><th>Check</th></tr></thead><tbody>{results.map((r) => <tr key={r.aep}><td><strong>{r.aep}</strong></td><td>{r.duration}</td><td>{fmt(r.median)}</td><td className="flow">{fmt(r.selected)} <small>m³/s</small></td><td>{r.temporalPattern ? `TP${r.temporalPattern}` : "—"}</td><td><span className={`status ${r.status}`}>{r.status === "ok" ? "OK" : r.status === "single" ? "1 pattern" : `${r.patternCount} patterns`}</span></td></tr>)}</tbody></table></div>
              <div className="chart-card"><h3>Critical flow profile</h3><p>Selected peak flow by AEP (m³/s)</p><div className="bars">{results.map((r) => <div className="bar-row" key={r.aep}><span>{r.aep}</span><div><i style={{width: `${Math.max(3, r.selected / maxFlow * 100)}%`}}></i></div><strong>{r.selected.toFixed(2)}</strong></div>)}</div></div>
            </section>
          </>}
        </div>
        </>}
      </section>
    </main>
  );
}
