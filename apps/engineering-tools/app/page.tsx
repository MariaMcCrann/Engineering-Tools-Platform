"use client";

import { useState } from "react";
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
import { EngineeringDashboard, DashboardCategory, DashboardTool } from "./EngineeringDashboard";

type ViewKey = "tools" | "rorb" | "rational" | "channel" | "storage" | "overland" | "rising" | "gsdm" | "spillway" | "culvert" | "headloss" | "pipe-sizing" | "pipeline-hgl" | "rock-protection" | "headwall-concrete" | "base-slab-concrete" | "proposal" | "site-intelligence";
type ToolEntry = DashboardTool & { view: Exclude<ViewKey, "tools"> };

const TOOL_CATEGORIES: DashboardCategory[] = [
  { key: "hydrology", label: "Hydrology & Catchments", description: "Rainfall, catchment analysis, runoff and flood estimation.", icon: "💧", tools: [
    { view: "rational", icon: "RM", label: "Rational Method Runoff", desc: "Calculate peak runoff using site-specific BoM IFD rainfall intensities." },
    { view: "rorb", icon: "MF", label: "RORB Median Flow", desc: "Process temporal-pattern ensembles and identify critical flows." },
    { view: "gsdm", icon: "GP", label: "GSDM PMP", desc: "Short-duration PMP estimates and RORB rainfall inputs." },
  ]},
  { key: "hydraulics", label: "Hydraulics", description: "Channels, culverts, pipes, overland flow and scour.", icon: "≋", tools: [
    { view: "channel", icon: "CF", label: "Channel Flow", desc: "Trapezoidal channel flow calculations." },
    { view: "overland", icon: "OF", label: "Overland Flow", desc: "Road cross-section capacity and Manning flow checks." },
    { view: "culvert", icon: "CV", label: "Culvert", desc: "Culvert capacity, depth, velocity and headwater checks.", badge: "In progress" },
    { view: "headloss", icon: "HL", label: "Pipe Headloss", desc: "Colebrook–White friction, minor losses and HGL checks." },
    { view: "pipe-sizing", icon: "PS", label: "Pipe Sizing", desc: "Compare workbook pipe sizes against velocity and allowable headloss." },
    { view: "pipeline-hgl", icon: "HG", label: "Pipeline HGL", desc: "Multi-reach headloss and running hydraulic grade line." },
    { view: "rock-protection", icon: "RP", label: "Rock Protection / Riprap", desc: "Preliminary D50 and culvert outlet apron sizing using HEC-14 guidance." },
    { view: "rising", icon: "RM", label: "Rising Main", desc: "Pipe losses, surge pressure, thrust blocks and pump-sump cycling." },
    { view: "spillway", icon: "SP", label: "Spillway", desc: "Weir flow, chute hydraulics and stilling-basin checks." },
  ]},
  { key: "structures", label: "Structures", description: "Concrete headwalls, slabs and structural checks.", icon: "▥", tools: [
    { view: "headwall-concrete", icon: "HW", label: "Headwall Concrete", desc: "AS 3600 headwall bending, minimum steel and shear screening checks." },
    { view: "base-slab-concrete", icon: "BS", label: "Base Slab Concrete", desc: "AS 3600 reinforced base-slab design checks from the supplied workbook." },
  ]},
  { key: "storage", label: "Storage & Dams", description: "Stage-storage, detention and dam-related calculations.", icon: "▤", tools: [
    { view: "storage", icon: "SS", label: "Stage Storage", desc: "Stage-storage calculations and outputs." },
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
  const allTools = TOOL_CATEGORIES.flatMap((category) => category.tools) as ToolEntry[];
  const currentTool = allTools.find((tool) => tool.view === view);
  const openTool = (tool: DashboardTool) => { if (tool.disabled) return; if (tool.externalUrl) { window.open(tool.externalUrl, "_blank", "noopener,noreferrer"); return; } setView(tool.view as ViewKey); };

  const selectedTool = view === "rorb" ? <RorbMedianFlowTool/>
    : view === "rational" ? <><header className="hub-header"><span>Rational Method Runoff</span></header><RationalMethodTool/></>
    : view === "channel" ? <><header className="hub-header"><span>Channel Flow</span></header><ChannelFlowTool/></>
    : view === "storage" ? <><header className="hub-header"><span>Stage Storage</span></header><StageStorageTool/></>
    : view === "overland" ? <><header className="hub-header"><span>Overland Flow</span></header><OverlandFlowTool/></>
    : view === "headloss" ? <><header className="hub-header"><span>Pipe Headloss</span></header><HeadlossTool/></>
    : view === "pipe-sizing" ? <><header className="hub-header"><span>Pipe Sizing</span></header><PipeSizingTool/></>
    : view === "pipeline-hgl" ? <><header className="hub-header"><span>Pipeline HGL</span></header><PipelineHglTool/></>
    : view === "rock-protection" ? <><header className="hub-header"><span>Rock Protection / Riprap</span></header><RockProtectionTool/></>
    : view === "headwall-concrete" ? <><header className="hub-header"><span>Headwall Concrete</span></header><HeadwallStructuralTool/></>
    : view === "base-slab-concrete" ? <><header className="hub-header"><span>Base Slab Concrete</span></header><BaseSlabStructuralTool/></>
    : view === "rising" ? <><header className="hub-header"><span>Rising Main</span></header><RisingMainTool/></>
    : view === "gsdm" ? <><header className="hub-header"><span>GSDM PMP</span></header><GsdmPmpTool/></>
    : view === "spillway" ? <><header className="hub-header"><span>Spillway</span></header><SpillwayTool/></>
    : view === "culvert" ? <><header className="hub-header"><span>Culvert</span></header><CulvertTool/></>
    : view === "proposal" ? <><header className="hub-header"><span>Proposal Tool</span></header><ProposalTool/></> : null;

  return <main className="app-shell">
    <aside className="sidebar dashboard-nav"><div className="brand"><img className="personal-mark" src="/brand-mark.svg" alt=""/><span>ENGINEERING<br/>TOOLS</span></div><nav className="tool-nav"><button className={view === "tools" ? "nav-selected" : ""} onClick={() => setView("tools")}>⌂ &nbsp; Home</button><button onClick={() => setView("tools")}>▦ &nbsp; All Tools</button><button onClick={() => setView("tools")}>▦ &nbsp; Categories</button><button onClick={() => setView("tools")}>☆ &nbsp; Favourites</button><button onClick={() => setView("tools")}>◷ &nbsp; Recently Used</button><div className="nav-divider"/><button onClick={() => setView("tools")}>▤ &nbsp; Engineering Handbook</button><button onClick={() => setView("tools")}>＋ &nbsp; Request a New Tool</button>{view !== "tools" && <><div className="nav-divider"/><div className="nav-category-label">Current tool</div><button className="active-tool">{currentTool?.label ?? "Tool"}</button></>}</nav><div className="version">ENGINEERING TOOLS<br/><strong>Growing toolkit</strong></div></aside>
    <section className="workspace">{view === "tools" ? <EngineeringDashboard categories={TOOL_CATEGORIES} onOpenTool={openTool}/> : selectedTool}</section>
  </main>;
}
