"use client";

import { useRef, useState } from "react";

import { exportProjectFile, parseProjectFile, projectFilename, MAX_PROJECT_FILE_BYTES } from "./project-transfer";

export type SavedProject = {
  id: string;
  toolView: string;
  toolLabel: string;
  name: string;
  note?: string;
  savedAt: number;
  inputs?: SavedInput[];
};

export type SavedInput = { index: number; tag: string; type: string; value: string; checked?: boolean; key?: string };

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

export function SavedProjectsPanel({ projects, onOpen, onDelete, onBack, onImport, supportedTools }: { projects: SavedProject[]; onOpen: (project: SavedProject) => void; onDelete: (id: string) => void; onBack: () => void; onImport: (project: SavedProject) => void; supportedTools: string[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<SavedProject | null>(null);
  const [reading, setReading] = useState(false);
  const exportProject = (project: SavedProject) => {
    setError(""); setNotice("");
    try {
      const data = exportProjectFile({...project, inputs: project.inputs?.filter(v=>!["file","password","hidden","submit","button","reset","image"].includes(v.type))});
      const url = URL.createObjectURL(new Blob([data], {type:"application/json"}));
      const a = document.createElement("a"); a.href = url; a.download = projectFilename(project.name);
      document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice(`Exported “${project.name}”. Send the downloaded project file to your colleague.`);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not export this project."); }
  };
  return <div className="panel-view">
    <div className="dashboard-section-head"><div><button className="dashboard-back" onClick={onBack}>← Dashboard</button><h2>Saved Projects</h2></div></div>
    <div className="saved-project-transfer">
      <button type="button" className="save-project-trigger" disabled={reading} onClick={()=>fileInput.current?.click()}>{reading ? "Reading project…" : "Import project"}</button>
      <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Import project file" hidden onChange={async e=>{
        const file=e.target.files?.[0]; e.target.value=""; if(!file)return;
        setError(""); setNotice(""); setPending(null); setReading(true);
        try { if(file.size>MAX_PROJECT_FILE_BYTES)throw new Error("Project files must be smaller than 5 MB."); setPending(parseProjectFile(await file.text(),supportedTools)); }
        catch(err){setError(err instanceof Error?err.message:"Could not read this project file.");}
        finally{setReading(false);}
      }}/>
      <p>Export a project file and send it to a colleague. They can import a separate editable copy here. Changes are not synced. Uploaded source files are not included.</p>
    </div>
    {error&&<p role="alert" className="saved-project-error">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
    {pending&&<section className="saved-project-import"><h3>Import project</h3><strong>{pending.name}</strong><p>{pending.toolLabel}{pending.note?` · ${pending.note}`:""}</p><p>This adds a new copy without replacing existing projects. Check the restored inputs before using the results.</p><button type="button" onClick={()=>{try{onImport(pending);setNotice(`Imported “${pending.name}”. Select Open to review and recalculate.`);setPending(null);}catch{setError("Could not save the imported project. Your browser storage may be full.");}}}>Import copy</button><button type="button" onClick={()=>setPending(null)}>Cancel</button></section>}
    {!projects.length ? <div className="dashboard-empty">No saved projects yet. Open a tool and use "Save as project" to keep it here for quick access.</div> : <div className="saved-project-list">
      {projects.slice().sort((a, b) => b.savedAt - a.savedAt).map((p) => <div className="saved-project-card" key={p.id}>
        <div><strong>{p.name}</strong><small>{p.toolLabel}{p.note ? ` · ${p.note}` : ""}</small><em>{new Date(p.savedAt).toLocaleDateString()}</em></div>
        <div className="saved-project-actions"><button onClick={() => onOpen(p)}>Open →</button><button type="button" onClick={() => exportProject(p)}>Export project</button><button className="danger" onClick={() => onDelete(p.id)}>Delete</button></div>
      </div>)}
    </div>}
  </div>;
}

export function SaveProjectControl({ toolView, toolLabel, onSave, existing }: { toolView: string; toolLabel: string; onSave: (project: SavedProject) => void; existing?: SavedProject }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  if (!open) return <button className="save-project-trigger" onClick={() => { setOpen(true); setName(existing?.name ?? toolLabel); setNote(existing?.note ?? ""); }}>{existing ? "☆ Update saved project" : "☆ Save as project"}</button>;

  return <div className="save-project-form">
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, e.g. site address)" />
    <button disabled={!name.trim()} onClick={() => {
      onSave({ id: existing?.id ?? `${Date.now()}`, toolView, toolLabel, name: name.trim(), note: note.trim() || undefined, savedAt: Date.now() });
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
