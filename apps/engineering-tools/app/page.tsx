"use client";

import { useEffect, useState } from "react";
import { ChannelFlowTool, ProposalTool, StageStorageTool } from "./EngineeringTools";
import { OverlandFlowTool } from "./OverlandFlowTool";
import { RisingMainTool } from "./RisingMainTool";
import { GsdmPmpTool } from "./GsdmPmpTool";
import { RationalMethodTool } from "./RationalMethodTool";
import { SpillwayTool } from "./SpillwayTool";
import { CulvertTool } from "./CulvertTool";
import { HeadlossTool } from "./HeadlossTool";
import { PipeSizingTool, PipelineHglTool } from "./pipeline-tools";
import { RockProtectionTool } from "./RockProtectionTool";
import { HeadwallStructuralTool, BaseSlabStructuralTool } from "./StructuralConcreteTools";
import { RorbMedianFlowTool } from "./RorbMedianFlowTool";
import { BroadCrestedWeirTool } from "./BroadCrestedWeirTool";
import { DrownedSluiceGateTool } from "./DrownedSluiceGateTool";
import { ThrustAtBendsTool } from "./ThrustAtBendsTool";
import { BuriedFlexiblePipeTool } from "./BuriedFlexiblePipeTool";
import { VNotchWeirTool } from "./VNotchWeirTool";
import { PitSurgeTool } from "./PitSurgeTool";
import { PumpDutyPointTool } from "./PumpDutyPointTool";
import { CantileverWallTool } from "./CantileverWallTool";
import { SedimentPondTool } from "./SedimentPondTool";
import { RegulatorDesignTool } from "./RegulatorDesignTool";
import { EngineeringDashboard, DashboardCategory, DashboardTool, HANDBOOK_ITEMS } from "./EngineeringDashboard";
import { SavedProjectsPanel, SaveProjectControl, CalculationTemplatesPanel, SavedProject, loadSavedProjects, persistSavedProjects } from "./WorkspacePanels";

type ViewKey = "tools" | "saved-projects" | "templates" | "rorb" | "rational" | "channel" | "storage" | "overland" | "rising" | "gsdm" | "spillway" | "culvert" | "headloss" | "pipe-sizing" | "pipeline-hgl" | "rock-protection" | "headwall-concrete" | "base-slab-concrete" | "broad-crested-weir" | "drowned-sluice-gate" | "thrust-at-bends" | "buried-flexible-pipe" | "v-notch-weir" | "pit-surge" | "pump-duty-point" | "cantilever-wall" | "sediment-pond" | "regulator-design" | "proposal" | "site-intelligence";
type ToolEntry = DashboardTool & { view: Exclude<ViewKey, "tools" | "saved-projects" | "templates"> };

const TOOL_CATEGORIES: DashboardCategory[] = [
  { key: "hydrology", label: "Hydrology & Catchments", description: "Rainfall, catchment analysis, runoff and flood estimation.", icon: "💧", tools: [
    { view: "rational", icon: "RM", label: "Rational Method Runoff", desc: "Calculate peak runoff using site-specific BoM IFD rainfall intensities." },
    { view: "rorb", icon: "MF", label: "RORB Median Flow", desc: "Process temporal-pattern ensembles and identify critical flows." },
    { view: "gsdm", icon: "GP", label: "GSDM PMP", desc: "Short-duration PMP estimates and RORB rainfall inputs." },
  ]},
  { key: "hydraulics", label: "Hydraulics", description: "Channels, culverts, pipes, overland flow and scour.", icon: "≋", tools: [
    { view: "channel", icon: "CF", label: "Channel Flow", desc: "Trapezoidal channel flow calculations." },
    { view: "overland", icon: "OF", label: "Overland Flow", desc: "Road cross-section capacity and Manning flow checks." },
    { view: "culvert", icon: "CV", label: "Culvert", desc: "Culvert capacity, depth, velocity and headwater checks." },
    { view: "headloss", icon: "HL", label: "Pipe Headloss", desc: "Colebrook–White friction, minor losses and HGL checks." },
    { view: "pipe-sizing", icon: "PS", label: "Pipe Sizing", desc: "Compare workbook pipe sizes against velocity and allowable headloss." },
    { view: "pipeline-hgl", icon: "HG", label: "Pipeline HGL", desc: "Multi-reach headloss and running hydraulic grade line." },
    { view: "rock-protection", icon: "RP", label: "Rock Protection / Riprap", desc: "Preliminary D50 and culvert outlet apron sizing using Austroads Guide to Road Design Part 5B." },
    { view: "rising", icon: "RM", label: "Rising Main", desc: "Pipe losses, surge pressure, thrust blocks and pump-sump cycling." },
    { view: "spillway", icon: "SP", label: "Spillway", desc: "Weir flow, chute hydraulics and stilling-basin checks." },
    { view: "broad-crested-weir", icon: "BW", label: "Broad Crested Weir", desc: "Open channel discharge via a broad crested weir, per AS3778.4.2." },
    { view: "drowned-sluice-gate", icon: "SG", label: "Drowned Sluice Gate", desc: "Discharge rate through a drowned sluice gate for free flow." },
    { view: "thrust-at-bends", icon: "TB", label: "Thrust at Bends", desc: "Momentum and pressure thrust for anchorage design at pipeline bends." },
    { view: "v-notch-weir", icon: "VN", label: "V-Notch Weir", desc: "Discharge over a 90° V-notch thin plate weir — AS3778.4.1 and Ackers & White." },
    { view: "pit-surge", icon: "PG", label: "Pit Surge", desc: "Transient pit water level and siphon outflow response to pump inflow." },
    { view: "pump-duty-point", icon: "DP", label: "Pump Duty Point", desc: "Rising main system curves intersected with a pump curve — duty point, power and NPSHA." },
    { view: "regulator-design", icon: "RG", label: "Regulator Design", desc: "FlumeGate flow capacity, precast structure geometry and seepage checks for a channel regulator." },
  ]},
  { key: "structures", label: "Structures", description: "Concrete headwalls, slabs and structural checks.", icon: "▥", tools: [
    { view: "headwall-concrete", icon: "HW", label: "Headwall Concrete", desc: "AS 3600 headwall bending, minimum steel and shear screening checks." },
    { view: "base-slab-concrete", icon: "BS", label: "Base Slab Concrete", desc: "AS 3600 reinforced base-slab design checks from the supplied workbook." },
    { view: "buried-flexible-pipe", icon: "FP", label: "Buried Flexible Pipe", desc: "AS2566.1 deflection, strength and buckling checks for buried flexible pipe." },
    { view: "cantilever-wall", icon: "CW", label: "Cantilever Wall", desc: "AS3600 design of a free-standing cantilever retaining wall." },
  ]},
  { key: "storage", label: "Storage & Dams", description: "Stage-storage, detention and dam-related calculations.", icon: "▤", tools: [
    { view: "storage", icon: "SS", label: "Stage Storage", desc: "Stage-storage calculations and outputs." },
    { view: "sediment-pond", icon: "SD", label: "Sediment Pond Sizing", desc: "Fair & Geyer removal efficiency, basin stage-storage, cleanout and dewatering." },
  ]},
  { key: "site-gis", label: "Site & GIS", description: "Site intelligence, planning overlays, cadastre and mapping.", icon: "⌖", tools: [
    { view: "site-intelligence", icon: "GIS", label: "Project Site Intelligence", desc: "Screen a Victorian site against planning, cadastral and waterway open data.", externalUrl: "https://siteintelligence.floodriskadvisory.com.au" },
  ]},
  { key: "design-docs", label: "Design & Documentation", description: "Proposal, design checking, reporting and templates.", icon: "▤", tools: [
    { view: "proposal", icon: "PT", label: "Proposal Tool", desc: "Prepare consistent consultancy proposals.", disabled: true },
  ]},
  { key: "utilities", label: "Utilities & Converters", description: "Small calculators, conversions and engineering helpers.", icon: "▦", tools: [] },
  { key: "project-management", label: "Project Management", description: "Cost, planning and delivery support tools.", icon: "⚙", tools: [] },
  { key: "ai-automation", label: "AI & Automation", description: "AI-assisted engineering and workflow automation.", icon: "✦", tools: [] },
];

export default function Home() {
  const [view, setView] = useState<ViewKey>("tools");
  const [showHandbook, setShowHandbook] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [dashboardKey, setDashboardKey] = useState(0);
  const goHome = () => { setView("tools"); setDashboardKey((k) => k + 1); };

  useEffect(() => { setSavedProjects(loadSavedProjects()); }, []);

  const saveProject = (project: SavedProject) => {
    setSavedProjects((prev) => {
      const next = [...prev, project];
      persistSavedProjects(next);
      return next;
    });
  };
  const deleteProject = (id: string) => {
    setSavedProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistSavedProjects(next);
      return next;
    });
  };

  const allTools = TOOL_CATEGORIES.flatMap((category) => category.tools) as ToolEntry[];
  const currentTool = allTools.find((tool) => tool.view === view);
  const openTool = (tool: DashboardTool) => { if (tool.disabled) return; if (tool.externalUrl) { window.open(tool.externalUrl, "_blank", "noopener,noreferrer"); return; } setView(tool.view as ViewKey); };

  const toolHeader = (label: string, key: Exclude<ViewKey, "tools" | "saved-projects" | "templates">) => (
    <header className="hub-header"><span>{label}</span><SaveProjectControl toolView={key} toolLabel={label} onSave={saveProject} /></header>
  );

  const selectedTool = view === "saved-projects" ? <SavedProjectsPanel projects={savedProjects} onOpen={(v) => setView(v as ViewKey)} onDelete={deleteProject} onBack={() => setView("tools")}/>
    : view === "templates" ? <CalculationTemplatesPanel onOpen={(v) => setView(v as ViewKey)} onBack={() => setView("tools")}/>
    : view === "rorb" ? <>{toolHeader("RORB Median Flow", "rorb")}<RorbMedianFlowTool/></>
    : view === "rational" ? <>{toolHeader("Rational Method Runoff", "rational")}<RationalMethodTool/></>
    : view === "channel" ? <>{toolHeader("Channel Flow", "channel")}<ChannelFlowTool/></>
    : view === "storage" ? <>{toolHeader("Stage Storage", "storage")}<StageStorageTool/></>
    : view === "overland" ? <>{toolHeader("Overland Flow", "overland")}<OverlandFlowTool/></>
    : view === "headloss" ? <>{toolHeader("Pipe Headloss", "headloss")}<HeadlossTool/></>
    : view === "pipe-sizing" ? <>{toolHeader("Pipe Sizing", "pipe-sizing")}<PipeSizingTool/></>
    : view === "pipeline-hgl" ? <>{toolHeader("Pipeline HGL", "pipeline-hgl")}<PipelineHglTool/></>
    : view === "rock-protection" ? <>{toolHeader("Rock Protection / Riprap", "rock-protection")}<RockProtectionTool/></>
    : view === "headwall-concrete" ? <>{toolHeader("Headwall Concrete", "headwall-concrete")}<HeadwallStructuralTool/></>
    : view === "base-slab-concrete" ? <>{toolHeader("Base Slab Concrete", "base-slab-concrete")}<BaseSlabStructuralTool/></>
    : view === "rising" ? <>{toolHeader("Rising Main", "rising")}<RisingMainTool/></>
    : view === "gsdm" ? <>{toolHeader("GSDM PMP", "gsdm")}<GsdmPmpTool/></>
    : view === "spillway" ? <>{toolHeader("Spillway", "spillway")}<SpillwayTool/></>
    : view === "culvert" ? <>{toolHeader("Culvert", "culvert")}<CulvertTool/></>
    : view === "broad-crested-weir" ? <>{toolHeader("Broad Crested Weir", "broad-crested-weir")}<BroadCrestedWeirTool/></>
    : view === "drowned-sluice-gate" ? <>{toolHeader("Drowned Sluice Gate", "drowned-sluice-gate")}<DrownedSluiceGateTool/></>
    : view === "thrust-at-bends" ? <>{toolHeader("Thrust at Bends", "thrust-at-bends")}<ThrustAtBendsTool/></>
    : view === "buried-flexible-pipe" ? <>{toolHeader("Buried Flexible Pipe", "buried-flexible-pipe")}<BuriedFlexiblePipeTool/></>
    : view === "v-notch-weir" ? <>{toolHeader("V-Notch Weir", "v-notch-weir")}<VNotchWeirTool/></>
    : view === "pit-surge" ? <>{toolHeader("Pit Surge", "pit-surge")}<PitSurgeTool/></>
    : view === "pump-duty-point" ? <>{toolHeader("Pump Duty Point", "pump-duty-point")}<PumpDutyPointTool/></>
    : view === "cantilever-wall" ? <>{toolHeader("Cantilever Wall", "cantilever-wall")}<CantileverWallTool/></>
    : view === "sediment-pond" ? <>{toolHeader("Sediment Pond Sizing", "sediment-pond")}<SedimentPondTool/></>
    : view === "regulator-design" ? <>{toolHeader("Regulator Design", "regulator-design")}<RegulatorDesignTool/></>
    : view === "proposal" ? <>{toolHeader("Proposal Tool", "proposal")}<ProposalTool/></> : null;

  return <main className="app-shell">
    <aside className="sidebar dashboard-nav">
      <div className="brand"><img className="personal-mark" src="/brand-mark.svg" alt=""/><span className="brand-text"><strong>FLOOD RISK<br/>ADVISORY</strong><small>Engineering Tools</small></span></div>
      <nav className="tool-nav">
        <button className={view === "tools" ? "nav-selected" : ""} onClick={goHome}>⌂ &nbsp; Home</button>
        <button onClick={goHome}>▦ &nbsp; All Tools</button>
        <button onClick={goHome}>▦ &nbsp; Categories</button>
        <button onClick={goHome}>☆ &nbsp; Favourites</button>
        <button onClick={goHome}>◷ &nbsp; Recently Used</button>
        <div className="nav-divider"/>
        <button className={view === "saved-projects" ? "nav-selected" : ""} onClick={() => setView("saved-projects")}>▢ &nbsp; Saved Projects</button>
        <button className={view === "templates" ? "nav-selected" : ""} onClick={() => setView("templates")}>▤ &nbsp; Calculation Templates</button>
        <button onClick={() => setShowHandbook(true)}>▤ &nbsp; Source Documents</button>
        <div className="nav-divider"/>
        <button onClick={goHome}>? &nbsp; Help &amp; Support</button>
        {view !== "tools" && view !== "saved-projects" && view !== "templates" && <><div className="nav-divider"/><div className="nav-category-label">Current tool</div><button className="active-tool">{currentTool?.label ?? "Tool"}</button></>}
      </nav>
      <div className="version">ENGINEERING TOOLS<br/><strong>Growing toolkit</strong></div>
    </aside>
    <section className="workspace">{view === "tools" ? <EngineeringDashboard key={dashboardKey} categories={TOOL_CATEGORIES} onOpenTool={openTool} onOpenHandbook={() => setShowHandbook(true)} onOpenSaved={() => setView("saved-projects")} onOpenTemplates={() => setView("templates")}/> : selectedTool}</section>

    {showHandbook && <div className="dashboard-modal-backdrop" onClick={() => setShowHandbook(false)}><div className="dashboard-modal handbook-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowHandbook(false)}>×</button><p className="eyebrow">TECHNICAL BASIS & TRACEABILITY</p><h2>Engineering Handbook</h2><p className="modal-lead">A single place for the source documents, manuals, standards and engineering methods used by the tools.</p><div className="handbook-list">{HANDBOOK_ITEMS.map((item) => <div key={item.title}><span>▤</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}</div><div className="handbook-note"><strong>Next step</strong><span>Each calculator can link directly to the references and assumptions that support its methodology.</span></div></div></div>}
  </main>;
}
