"use client";

import { useState } from "react";

export type SavedProject = {
  id: string;
  toolView: string;
  toolLabel: string;
  name: string;
  note?: string;
  savedAt: number;
};

export const SAVED_PROJECTS_KEY = "engineering-tools-saved-projects";

export function loadSavedProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as SavedProject[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedProjects(projects: SavedProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(projects));
}

export function SavedProjectsPanel({ projects, onOpen, onDelete, onBack }: { projects: SavedProject[]; onOpen: (toolView: string) => void; onDelete: (id: string) => void; onBack: () => void }) {
  return <div className="panel-view">
    <div className="dashboard-section-head"><div><button className="dashboard-back" onClick={onBack}>← Dashboard</button><h2>Saved Projects</h2></div></div>
    {!projects.length ? <div className="dashboard-empty">No saved projects yet. Open a tool and use "Save as project" to keep it here for quick access.</div> : <div className="saved-project-list">
      {projects.slice().sort((a, b) => b.savedAt - a.savedAt).map((p) => <div className="saved-project-card" key={p.id}>
        <div><strong>{p.name}</strong><small>{p.toolLabel}{p.note ? ` · ${p.note}` : ""}</small><em>{new Date(p.savedAt).toLocaleDateString()}</em></div>
        <div className="saved-project-actions"><button onClick={() => onOpen(p.toolView)}>Open →</button><button className="danger" onClick={() => onDelete(p.id)}>Delete</button></div>
      </div>)}
    </div>}
  </div>;
}

export function SaveProjectControl({ toolView, toolLabel, onSave }: { toolView: string; toolLabel: string; onSave: (project: SavedProject) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  if (!open) return <button className="save-project-trigger" onClick={() => { setOpen(true); setName(toolLabel); }}>☆ Save as project</button>;

  return <div className="save-project-form">
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, e.g. site address)" />
    <button disabled={!name.trim()} onClick={() => {
      onSave({ id: `${Date.now()}`, toolView, toolLabel, name: name.trim(), note: note.trim() || undefined, savedAt: Date.now() });
      setOpen(false); setName(""); setNote("");
    }}>Save</button>
    <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
  </div>;
}

export type CalculationTemplate = {
  id: string;
  toolView: string;
  toolLabel: string;
  category: string;
  name: string;
  description: string;
};

export const CALCULATION_TEMPLATES: CalculationTemplate[] = [
  { id: "t1", toolView: "rational", toolLabel: "Rational Method Runoff", category: "Hydrology & Catchments", name: "Small residential allotment, 10yr ARI", description: "Typical infill lot: <2000m² catchment, standard urban Tc, 10yr ARI design storm." },
  { id: "t2", toolView: "rorb", toolLabel: "RORB Median Flow", category: "Hydrology & Catchments", name: "Rural catchment, 100yr ARI ensemble", description: "Median flow across a full temporal-pattern ensemble for a rural catchment." },
  { id: "t3", toolView: "culvert", toolLabel: "Culvert", category: "Hydraulics", name: "600mm RCP road crossing", description: "Single 600mm reinforced concrete pipe, standard headwall, minor rural road crossing." },
  { id: "t4", toolView: "headloss", toolLabel: "Pipe Headloss", category: "Hydraulics", name: "150mm stormwater lateral", description: "Short 150mm pipe run, standard fittings, typical allotment stormwater connection." },
  { id: "t5", toolView: "rising", toolLabel: "Rising Main", category: "Hydraulics", name: "300mm rising main, single pump station", description: "Typical pump-sump cycling and surge check for a small pump station rising main." },
  { id: "t6", toolView: "headwall-concrete", toolLabel: "Headwall Concrete", category: "Structures", name: "Standard council headwall, SM1600", description: "AS 3600 headwall check against council standard drawing loading (SM1600)." },
  { id: "t7", toolView: "storage", toolLabel: "Stage Storage", category: "Storage & Dams", name: "Detention basin, 5yr pre / post development", description: "Stage-storage curve for a small on-site detention basin." },
];

export function CalculationTemplatesPanel({ onOpen, onBack }: { onOpen: (toolView: string) => void; onBack: () => void }) {
  const byCategory = CALCULATION_TEMPLATES.reduce<Record<string, CalculationTemplate[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});
  return <div className="panel-view">
    <div className="dashboard-section-head"><div><button className="dashboard-back" onClick={onBack}>← Dashboard</button><h2>Calculation Templates</h2></div></div>
    <p className="modal-lead" style={{ marginBottom: 18 }}>Starting points for common jobs. Opening a template takes you straight to the right tool — inputs still need to be entered for your site; the template isn't pre-filled yet.</p>
    {Object.entries(byCategory).map(([cat, templates]) => <div key={cat} className="template-category">
      <h3 className="tool-category-title">{cat}</h3>
      <div className="dashboard-tool-grid">{templates.map((t) => <button className="dashboard-tool-card" key={t.id} onClick={() => onOpen(t.toolView)}>
        <span>{t.toolLabel.slice(0, 2).toUpperCase()}</span>
        <div><strong>{t.name}</strong><small>{t.description}</small><em>{t.toolLabel}</em></div>
        <b>→</b>
      </button>)}</div>
    </div>)}
  </div>;
}
