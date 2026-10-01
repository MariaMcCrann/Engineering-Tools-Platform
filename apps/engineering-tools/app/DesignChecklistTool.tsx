"use client";

import { useState } from "react";
import { ANSWERS, blankItem, CHECKLISTS, HEADER_FIELDS, questionsOf, STATUSES, summarise } from "./design-checklist/checklists";
import type { Answer, Checklist, ChecklistState, ItemState, ItemStatus } from "./design-checklist/checklists";

const STORAGE_KEY = "engineering-design-checklists-v1";
type Store = Record<string, ChecklistState>;
type Filter = "all" | "open" | "unanswered";

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try { const raw = window.localStorage.getItem(STORAGE_KEY); const data = raw ? JSON.parse(raw) : {}; return data && typeof data === "object" && !Array.isArray(data) ? data : {}; }
  catch { return {}; }
}
const emptyState = (): ChecklistState => ({ header: { date: new Date().toLocaleDateString("en-CA") }, items: {} });
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
const fileStem = (c: Checklist, state: ChecklistState) => `${c.label}-checklist-${state.header.job || state.header.project || "draft"}`.replace(/[^a-zA-Z0-9_-]+/g, "_");

function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function exportWorkbook(c: Checklist, state: ChecklistState) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Engineering Tools"; wb.created = new Date();
  const ws = wb.addWorksheet(c.label);
  ws.columns = [{ width: 7 }, { width: 26 }, { width: 60 }, { width: 12 }, { width: 10 }, { width: 34 }, { width: 34 }, { width: 10 }];
  ws.addRow([c.title.toUpperCase()]).font = { bold: true, size: 14 };
  ws.addRow([]);
  for (let i = 0; i < HEADER_FIELDS.length; i += 2) {
    const [[k1, l1], [k2, l2]] = [HEADER_FIELDS[i], HEADER_FIELDS[i + 1]];
    const row = ws.addRow(["", `${l1}:`, state.header[k1] ?? "", "", "", `${l2}:`, state.header[k2] ?? ""]);
    row.getCell(2).font = { bold: true }; row.getCell(6).font = { bold: true };
  }
  ws.addRow([]);
  const head = ws.addRow(["No.", "Item", "Procedure — have the following requirements been met/considered?", "Yes/No or N/A", "Checked", "Designer comments", "Reviewer comments", "Status"]);
  head.eachCell(cell => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF24466A" } }; cell.alignment = { wrapText: true, vertical: "middle" }; });
  ws.views = [{ state: "frozen", ySplit: head.number }];
  for (const s of c.sections) {
    const sec = ws.addRow([s.no, s.title]);
    sec.font = { bold: true }; sec.eachCell({ includeEmpty: true }, cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE8F0" } }; });
    for (const r of s.rows) {
      if (r.heading) { ws.addRow([r.no, r.item]).font = { bold: true, italic: true }; continue; }
      const it = state.items[r.id] ?? blankItem();
      const row = ws.addRow([r.no, r.item, r.procedure, it.answer, it.checked ? "✓" : "", it.designer, it.reviewer, it.status]);
      row.alignment = { wrapText: true, vertical: "top" };
      row.getCell(4).dataValidation = { type: "list", allowBlank: true, formulae: [`"${ANSWERS.join(",")}"`] };
      row.getCell(8).dataValidation = { type: "list", allowBlank: false, formulae: [`"${STATUSES.join(",")}"`] };
    }
  }
  ws.addRow([]);
  ws.addRow([`Exported ${new Date().toLocaleString()} from Engineering Tools — Design Checklist.`]).font = { italic: true, color: { argb: "FF607587" } };
  download(await wb.xlsx.writeBuffer(), `${fileStem(c, state)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

function printHtml(c: Checklist, state: ChecklistState) {
  const h = (k: string) => escapeHtml(state.header[k] ?? "");
  const header = HEADER_FIELDS.map(([k, l]) => `<div><b>${escapeHtml(l)}:</b> ${h(k)}</div>`).join("");
  const body = c.sections.map(s => `<tr class="sec"><td>${s.no}</td><td colspan="7">${escapeHtml(s.title)}</td></tr>` + s.rows.map(r => {
    if (r.heading) return `<tr class="sub"><td>${r.no}</td><td colspan="7">${escapeHtml(r.item)}</td></tr>`;
    const it = state.items[r.id] ?? blankItem();
    return `<tr><td>${r.no}</td><td>${escapeHtml(r.item)}</td><td>${escapeHtml(r.procedure)}</td><td>${it.answer}</td><td>${it.checked ? "✓" : ""}</td><td>${escapeHtml(it.designer)}</td><td>${escapeHtml(it.reviewer)}</td><td>${it.status}</td></tr>`;
  }).join("")).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(c.title)}</title><style>body{font:11px/1.4 Arial,sans-serif;color:#1d3446;margin:18px}h1{font-size:18px;margin:0 0 10px}.hdr{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-bottom:14px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #9fb3c2;padding:4px 6px;vertical-align:top;text-align:left}th{background:#24466a;color:#fff}tr.sec td{background:#dce8f0;font-weight:bold}tr.sub td{font-weight:bold;font-style:italic}@page{size:A4 landscape;margin:12mm}@media print{button{display:none}}</style></head><body><button onclick="print()">Print / Save as PDF</button><h1>${escapeHtml(c.title)}</h1><div class="hdr">${header}</div><table><thead><tr><th>No.</th><th>Item</th><th>Procedure</th><th>Yes/No/N/A</th><th>Checked</th><th>Designer comments</th><th>Reviewer comments</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="dchk-metric"><strong>{value}</strong><span>{label}</span></div>;
}

export function DesignChecklistTool() {
  const [store, setStore] = useState<Store>(loadStore);
  const [key, setKey] = useState(CHECKLISTS[0].key);
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState("");
  const checklist = CHECKLISTS.find(c => c.key === key) ?? CHECKLISTS[0];
  const state = store[key] ?? emptyState();
  const stats = summarise(checklist, state);

  function commit(next: ChecklistState) {
    const all = { ...store, [key]: next };
    setStore(all);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); setNotice(""); }
    catch { setNotice("Browser storage is unavailable — changes are kept only until you leave this page. Export to Excel to keep a copy."); }
  }
  const setHeader = (k: string, v: string) => commit({ ...state, header: { ...state.header, [k]: v } });
  const setItem = (id: string, patch: Partial<ItemState>) => commit({ ...state, items: { ...state.items, [id]: { ...(state.items[id] ?? blankItem()), ...patch } } });
  const reset = () => { if (window.confirm(`Clear all answers and project details on the ${checklist.label} checklist?`)) commit(emptyState()); };
  const openPrint = () => { const url = URL.createObjectURL(new Blob([printHtml(checklist, state)], { type: "text/html" })); window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60000); };
  const shown = (id: string) => { const it = state.items[id] ?? blankItem(); return filter === "all" || (filter === "open" && it.status === "Open") || (filter === "unanswered" && !it.answer); };

  return <div className="dchk">
    <header className="dchk-head"><div><p className="eyebrow">DESIGN & DOCUMENTATION</p><h1>Design Checklist</h1><p>Work through the design procedure, record designer and reviewer comments, and close each item out. Saved automatically in this browser.</p></div></header>

    <div className="dchk-tabs" role="tablist">{CHECKLISTS.map(c => { const s = summarise(c, store[c.key] ?? emptyState()); return <button key={c.key} role="tab" aria-selected={c.key === key} className={c.key === key ? "active" : ""} onClick={() => setKey(c.key)}><strong>{c.label}</strong><small>{s.closed}/{s.total} closed</small></button>; })}</div>

    <section className="dchk-card"><h2>{checklist.title}</h2><p className="dchk-muted">{checklist.description}</p>
      <div className="dchk-fields">{HEADER_FIELDS.map(([k, label]) => <label key={k}>{label}<input type={k === "date" ? "date" : "text"} value={state.header[k] ?? ""} onChange={e => setHeader(k, e.target.value)}/></label>)}</div>
    </section>

    <div className="dchk-summary"><Metric label="Items" value={String(stats.total)}/><Metric label="Answered" value={`${stats.answered}`}/><Metric label="Checked" value={`${stats.checked}`}/><Metric label="Answered “No”" value={`${stats.no}`}/><Metric label="Closed" value={`${stats.closed} / ${stats.total}`}/></div>
    <div className="dchk-progress" aria-label={`${stats.closed} of ${stats.total} items closed`}><span style={{ width: `${stats.total ? (100 * stats.closed) / stats.total : 0}%` }}/></div>

    <div className="dchk-toolbar"><label>Show<select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">All items</option><option value="open">Open items only</option><option value="unanswered">Unanswered only</option></select></label><div className="dchk-actions"><button onClick={() => void exportWorkbook(checklist, state)}>↓ Excel</button><button onClick={openPrint}>Print / PDF</button><button onClick={reset}>Clear checklist</button></div></div>
    {notice && <p role="alert" className="dchk-notice">{notice}</p>}

    {checklist.sections.map(s => { const rows = s.rows.filter(r => r.heading || shown(r.id)); if (!rows.some(r => !r.heading)) return null; return <section key={s.no} className="dchk-card dchk-section">
      <h3><span>{s.no}</span>{s.title}<small>{questionsOf({ ...checklist, sections: [s] }).filter(r => state.items[r.id]?.status === "Closed").length}/{s.rows.filter(r => !r.heading).length} closed</small></h3>
      {rows.map(r => {
        if (r.heading) return <h4 key={r.id} className="dchk-sub"><span>{r.no}</span>{r.item}</h4>;
        const it = state.items[r.id] ?? blankItem();
        return <article key={r.id} className={`dchk-item ${it.status === "Closed" ? "closed" : ""} ${it.answer === "No" ? "no" : ""}`}>
          <div className="dchk-q"><span className="dchk-no">{r.no}</span><div>{r.item && <b>{r.item}</b>}<p>{r.procedure}</p></div></div>
          <div className="dchk-controls">
            <div className="dchk-seg" role="radiogroup" aria-label="Yes, No or N/A">{ANSWERS.map(a => <button key={a} role="radio" aria-checked={it.answer === a} className={it.answer === a ? `on ${a === "N/A" ? "na" : a.toLowerCase()}` : ""} onClick={() => setItem(r.id, { answer: it.answer === a ? "" : a as Answer })}>{a}</button>)}</div>
            <label className="dchk-check"><input type="checkbox" checked={it.checked} onChange={e => setItem(r.id, { checked: e.target.checked })}/>Checked</label>
            <select aria-label="Status" className={`dchk-status ${it.status.toLowerCase()}`} value={it.status} onChange={e => setItem(r.id, { status: e.target.value as ItemStatus })}>{STATUSES.map(st => <option key={st}>{st}</option>)}</select>
          </div>
          <div className="dchk-comments"><label>Designer comments<textarea rows={2} value={it.designer} onChange={e => setItem(r.id, { designer: e.target.value })}/></label><label>Reviewer comments<textarea rows={2} value={it.reviewer} onChange={e => setItem(r.id, { reviewer: e.target.value })}/></label></div>
        </article>;
      })}
    </section>; })}
    <p className="dchk-muted">Source: DESIGN CHECKLIST (draft workbook, last updated 28 September 2016). Answers are stored only in this browser — export to Excel to file a copy with the project.</p>
  </div>;
}
