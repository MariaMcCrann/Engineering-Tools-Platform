"use client";

import { useMemo, useState } from "react";

export type DashboardTool = {
  view: string;
  icon: string;
  label: string;
  desc: string;
  disabled?: boolean;
  badge?: string;
  externalUrl?: string;
};

export type DashboardCategory = {
  key: string;
  label: string;
  description: string;
  icon: string;
  tools: DashboardTool[];
};

export const HANDBOOK_ITEMS = [
  { title: "Engineering Handbook", detail: "Methods, assumptions, standards and calculation guidance." },
  { title: "ARR2019", detail: "Australian Rainfall and Runoff guidance used by hydrology tools." },
  { title: "Hydraulic references", detail: "Manning, culvert, pipe, spillway and scour design references." },
  { title: "Structural references", detail: "AS 3600 and source material used by structural calculators." },
  { title: "Authority manuals", detail: "DTP, CMA, GMW, VicPlan and other authority guidance." },
];

export function EngineeringDashboard({ categories, onOpenTool, onOpenHandbook, onOpenSaved, onOpenTemplates }: { categories: DashboardCategory[]; onOpenTool: (tool: DashboardTool) => void; onOpenHandbook: () => void; onOpenSaved: () => void; onOpenTemplates: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const allTools = useMemo(() => categories.flatMap((c) => c.tools.map((tool) => ({ ...tool, category: c.label, categoryKey: c.key }))), [categories]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTools.filter((tool) => (!category || tool.categoryKey === category) && (!q || `${tool.label} ${tool.desc} ${tool.category}`.toLowerCase().includes(q)));
  }, [allTools, query, category]);
  const favourites = allTools.filter((tool) => ["rational", "rorb", "culvert", "site-intelligence", "storage"].includes(tool.view)).slice(0, 5);

  return <div className="dashboard-shell">
    <div className="dashboard-topbar">
      <div className="dashboard-search"><span>⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setCategory(null); }} placeholder={'Search tools (e.g. "RORB", "culvert", "headwall", "VicPlan", "storage")…'} /><kbd>Ctrl+K</kbd></div>
      <button className="topbar-bell" aria-label="Notifications">🔔</button>
      <button className="topbar-user"><span className="topbar-avatar">MM</span><span>Maria McCrann</span><em>⌄</em></button>
    </div>
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <div className="dashboard-intro">
          <h1>Engineering Tools</h1>
          <p>Practical tools for flood, water and infrastructure engineering.</p>
          <div className="hero-banner"><span>Better decisions.<br/>Resilient communities.</span></div>
        </div>

        {!query && !category ? <>
          <div className="dashboard-section-head"><h2>Browse by Category</h2><button onClick={() => setCategory("all")}>View all tools →</button></div>
          <div className="category-grid">{categories.map((cat) => <button className={`category-card category-${cat.key}`} key={cat.key} onClick={() => setCategory(cat.key)}><span className="category-icon">{cat.icon}</span><span><strong>{cat.label}</strong><small>{cat.description}</small><em>{cat.tools.length} tools</em></span><b>→</b></button>)}</div>
          <div className="dashboard-section-head favourites-head"><h2>★ My Favourites</h2></div>
          <div className="favourite-grid">{favourites.map((tool) => <button key={tool.view} onClick={() => onOpenTool(tool)} disabled={tool.disabled}><span>{tool.icon}</span><strong>{tool.label}</strong><small>{tool.desc}</small><em>★</em></button>)}</div>
          <div className="request-banner"><div><strong>Don’t see the tool you need?</strong><span>Request a new engineering calculator, checker or workflow.</span></div><button onClick={() => { setShowRequest(true); setRequestSent(false); }}>Request a New Tool</button></div>
        </> : <>
          <div className="dashboard-section-head"><div><button className="dashboard-back" onClick={() => { setCategory(null); setQuery(""); }}>← Dashboard</button><h2>{query ? `Search results for “${query}”` : category === "all" ? "All Tools" : categories.find((c) => c.key === category)?.label}</h2></div></div>
          <div className="dashboard-tool-grid">{filtered.map((tool) => <button className="dashboard-tool-card" key={tool.view} onClick={() => onOpenTool(tool)} disabled={tool.disabled}><span>{tool.icon}</span><div><strong>{tool.label}</strong><small>{tool.desc}</small><em>{tool.category}{tool.badge ? ` · ${tool.badge}` : ""}</em></div><b>{tool.externalUrl ? "↗" : "→"}</b></button>)}{!filtered.length && <div className="dashboard-empty">No tools match that search.</div>}</div>
        </>}
      </div>

      <aside className="dashboard-side">
        <section><h3>⚙ Quick Actions</h3><button onClick={() => { setShowRequest(true); setRequestSent(false); }}><b>＋</b><span><strong>Request a New Tool</strong><small>Have an idea? Add it to the pipeline.</small></span><em>›</em></button><button onClick={onOpenSaved}><b>▢</b><span><strong>Saved Projects</strong><small>Access your saved calculations.</small></span><em>›</em></button><button onClick={onOpenTemplates}><b>▤</b><span><strong>Calculation Templates</strong><small>Use and manage templates.</small></span><em>›</em></button></section>
        <section><h3>◷ Recently Used</h3>{favourites.slice(0,4).map((tool) => <button key={tool.view} onClick={() => onOpenTool(tool)} disabled={tool.disabled}><b>{tool.icon}</b><span><strong>{tool.label}</strong></span><em>›</em></button>)}</section>
        <section><h3>▣ Source Documents & Manuals</h3>{HANDBOOK_ITEMS.slice(1,5).map((item) => <button key={item.title} onClick={onOpenHandbook}><b>▤</b><span><strong>{item.title}</strong><small>{item.detail}</small></span><em>›</em></button>)}<button className="view-handbook" onClick={onOpenHandbook}>Open Engineering Handbook →</button></section>
      </aside>
    </div>

    {showRequest && <div className="dashboard-modal-backdrop" onClick={() => setShowRequest(false)}><div className="dashboard-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShowRequest(false)}>×</button><p className="eyebrow">TOOL PIPELINE</p><h2>Request a New Tool</h2>{requestSent ? <div className="request-success"><strong>Request captured</strong><p>The request is saved in this browser for now. A database/email workflow can be connected next.</p></div> : <><p className="modal-lead">What calculation, check or engineering workflow would make your work easier?</p><label className="request-field">Tool idea or problem to solve<textarea value={requestText} onChange={(e) => setRequestText(e.target.value)} placeholder="e.g. I need a quick calculator for…" /></label><button className="request-submit" disabled={!requestText.trim()} onClick={() => { localStorage.setItem(`engineering-tool-request-${Date.now()}`, requestText.trim()); setRequestSent(true); setRequestText(""); }}>Submit Request</button></>}</div></div>}
  </div>;
}
