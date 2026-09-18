"use client";

import { useEffect, useRef, useState } from "react";
import { addCheck, allowedStatuses, createReview, inView, mergeReview, recordEntry, setClosed, STATUSES, TERMINAL, updateMetadata, validateReview, VIEWS } from "./design-review/engine";
import type { Actor, Check, Evidence, Metadata, Review, Status } from "./design-review/engine";
import { CASE_SOURCE, CULVERT_CHECKS, initialMetadata } from "./design-review/templates";
import { download, filename, readableDetail, reportHtml, wordDocument, workbook } from "./design-review/exports";

const STORAGE_KEY = "engineering-design-reviews-v1";
const labels: Record<keyof Metadata, string> = { project: "Project / structure ID", title: "Review title", asset: "Asset type", location: "Location", stage: "Review stage", revision: "Revision reviewed", date: "Review date", reviewer: "Assigned reviewer", designer: "Assigned designer", documents: "Documents and revisions reviewed", scope: "Scope, assumptions and limitations" };
const stamp = (s: string) => new Date(s).toLocaleString();
const errorText = (e: unknown) => e instanceof Error ? e.message : "The action could not be completed.";

function MetadataForm({ initial, onSave, onCancel }: { initial: Metadata; onSave: (m: Metadata) => void; onCancel: () => void }) {
  const [values, setValues] = useState(initial);
  return <form className="review-card" onSubmit={e => { e.preventDefault(); onSave(values); }}><h2>Project & review details</h2><div className="review-fields">{Object.entries(labels).map(([key, label]) => <label key={key} className={key === "documents" || key === "scope" ? "review-wide" : ""}>{label}{key === "documents" || key === "scope" ? <textarea value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })}/> : <input type={key === "date" ? "date" : "text"} required={["project", "title", "reviewer"].includes(key)} value={values[key as keyof Metadata]} onChange={e => setValues({ ...values, [key]: e.target.value })}/>}</label>)}</div><div className="review-actions"><button type="submit" className="review-primary">Save review details</button><button type="button" onClick={onCancel}>Cancel</button></div></form>;
}

function EntryForm({ check, actor, onSave }: { check: Check; actor: Actor; onSave: (to: Status, text: string, evidence: Evidence) => boolean }) {
  const choices = allowedStatuses(check, actor.role);
  const [to, setTo] = useState<Status>(choices[0] ?? "Comment");
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [calculator, setCalculator] = useState<Evidence["calculator"]>();
  if (!choices.length) return <p className="review-notice">The designer can respond after a reviewer records a Comment or Action required. Switch to Reviewer to assess this check.</p>;
  const selected = choices.includes(to) ? to : choices[0];
  return <form onSubmit={e => { e.preventDefault(); if (onSave(selected, text, { reference, ...(calculator ? { calculator } : {}) })) { setText(""); setReference(""); } }} className="review-entry-form"><h3>{actor.role === "Designer" ? "Record designer response" : "Record reviewer decision"}</h3><label>Next status<select value={selected} onChange={e => setTo(e.target.value as Status)}>{choices.map(s => <option key={s}>{s}</option>)}</select></label><label>{actor.role === "Designer" ? "Response and changes made" : "Comment / decision and reason"}<textarea required value={text} onChange={e => setText(e.target.value)} placeholder={actor.role === "Designer" ? "Explain how the comment has been addressed…" : "Record the finding, required action or verification outcome…"}/></label><label>Evidence reference<input value={reference} onChange={e => setReference(e.target.value)} placeholder="Drawing number, revision, report section or calculation reference" required={["Compliant", "Designer responded", "Reviewer verification", "Closed"].includes(selected)}/></label><label>Related calculator (reference only)<select value={calculator ?? ""} onChange={e => setCalculator((e.target.value || undefined) as Evidence["calculator"])}><option value="">None</option><option value="culvert">Culvert hydraulics</option><option value="rock-protection">Scour / rock protection</option><option value="headwall-concrete">Headwall concrete</option></select></label><p className="review-muted">Saves a new dated entry as {actor.name || "unnamed"} · {actor.role}. Previous rounds remain unchanged.</p><button className="review-primary" type="submit">Record entry</button></form>;
}

export function DesignReviewTool() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const stored = useRef<string | null>(null);
  const [actor, setActor] = useState<Actor>({ name: "Maria", role: "Reviewer" });
  const [view, setView] = useState<string>(VIEWS[0]);
  const [selected, setSelected] = useState<string>();
  const [itemId, setItemId] = useState<string>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<"new" | "sample" | "edit">();
  const [section, setSection] = useState<"register" | "audit">("register");
  const [discipline, setDiscipline] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingImport, setPendingImport] = useState<Review>();
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [reportPreview, setReportPreview] = useState(false);
  const review = reviews.find(r => r.id === selected);
  const check = review?.items.find(c => c.id === itemId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY); stored.current = raw;
      if (raw) {
        const data = JSON.parse(raw);
        if (!Array.isArray(data) || data.length > 200) throw new Error("Invalid saved review collection.");
        setReviews(data.map(validateReview));
      }
    } catch (e) { setError(`Saved data could not be loaded. It has not been replaced. ${errorText(e)}`); setReadOnly(true); }
    setLoaded(true);
    const changed = (e: StorageEvent) => { if (e.key === STORAGE_KEY) { setReadOnly(true); setError("Reviews changed in another tab. Reload this page before saving; copy any unsaved text first."); } };
    window.addEventListener("storage", changed); return () => window.removeEventListener("storage", changed);
  }, []);

  function save(next: Review[]) {
    if (readOnly || !loaded) throw new Error("Reload the workspace before saving.");
    if (next.length > 200 || new Set(next.map(r => r.id)).size !== next.length) throw new Error("The workspace must contain at most 200 reviews with distinct IDs.");
    next.forEach(validateReview);
    if (localStorage.getItem(STORAGE_KEY) !== stored.current) { setReadOnly(true); throw new Error("Another tab changed these reviews. Reload before saving; no data was overwritten."); }
    const raw = JSON.stringify(next);
    try { localStorage.setItem(STORAGE_KEY, raw); } catch { throw new Error("Browser storage is unavailable or full. The change was not saved. Download a backup of the current review."); }
    stored.current = raw; setReviews(next); setNotice("Saved in this browser."); setError("");
  }
  function act(fn: () => Review) {
    try { const next = fn(); save(reviews.map(r => r.id === next.id ? next : r)); return true; }
    catch (e) { setError(errorText(e)); return false; }
  }
  function open(r: Review) { setSelected(r.id); setItemId(undefined); setForm(undefined); setClosing(false); setAdding(false); setSection("register"); setDiscipline(""); setStatus(""); setQuery(""); }
  async function exportFile(kind: "excel" | "word") {
    if (!review) return;
    setBusy(true); setError("");
    try {
      if (kind === "excel") { const wb = await workbook(review); download(await wb.xlsx.writeBuffer(), `${filename(review)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); }
      else download(await wordDocument(review), `${filename(review)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      setNotice(`${kind === "excel" ? "Excel register" : "Word report"} downloaded, including all rounds and the audit trail.`);
    } catch (e) { setError(`Export failed: ${errorText(e)}`); } finally { setBusy(false); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Review files must be smaller than 10 MB.");
      const incoming = validateReview(JSON.parse(await file.text()));
      mergeReview(reviews.find(r => r.id === incoming.id), incoming);
      setPendingImport(incoming); setError("");
    } catch (e) { setError(errorText(e)); }
  }

  const visible = reviews.filter(r => inView(r, view, actor.name));
  const filtered = review?.items.filter(c => (!discipline || c.discipline === discipline) && (!status || c.status === status) && (!query || `${c.id} ${c.title} ${c.guidance} ${c.history.map(e => e.text).join(" ")}`.toLowerCase().includes(query.toLowerCase()))) ?? [];
  if (reportPreview && review) return <div className="review-workspace"><div className="review-actions"><button onClick={() => setReportPreview(false)}>← Back to review</button><button onClick={() => download(reportHtml(review), `${filename(review)}-report.html`, "text/html")}>↓ Download printable report</button></div><p className="review-muted">Use Print / Save as PDF inside the report, then choose your browser’s PDF destination.</p><iframe title="Complete design review report" srcDoc={reportHtml(review)} sandbox="allow-scripts allow-modals" style={{ width: "100%", height: "80vh", border: "1px solid #d8e2e9", background: "white" }}/></div>;
  return <div className="review-workspace">
    <header className="review-header"><div><p className="eyebrow">DESIGN ASSURANCE</p><h1>Design Review & Close-out</h1><p>Trace every comment from first review to final verification.</p></div><span className="review-version">VERSION 1 · LOCAL WORKSPACE</span></header>
    <div className="review-identity"><label>Your name<input value={actor.name} onChange={e => setActor({ ...actor, name: e.target.value })}/></label><label>Working as<select value={actor.role} onChange={e => setActor({ ...actor, role: e.target.value as Actor["role"] })}><option>Reviewer</option><option>Designer</option></select></label><p>Saved on this device/browser. Use <b>Review file</b> for sequential handoff and backup. Names and roles are self-declared; no shared login or live synchronisation.</p></div>
    {error && <div role="alert" className="review-error">{error}</div>}{notice && <div role="status" className="review-save">{notice}</div>}
    {!loaded ? <p>Loading saved reviews…</p> : <>
    <div className="review-actions review-toolbar"><button onClick={() => { setSelected(undefined); setForm(undefined); setPendingImport(undefined); }}>← Review dashboard</button>{actor.role === "Reviewer" && <><button className="review-primary" disabled={readOnly} onClick={() => { setSelected(undefined); setForm("new"); }}>+ New review</button><button disabled={readOnly} onClick={() => { setSelected(undefined); setForm("sample"); }}>Start ST045683 case</button></>}<label className="review-file-button">Import review file<input aria-label="Import review file" type="file" accept=".json" disabled={readOnly} onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ""; }}/></label></div>
    {pendingImport && <section className="review-card"><h2>Review file ready to import</h2><p><b>{pendingImport.metadata.project} · {pendingImport.metadata.title}</b></p><p>{pendingImport.items.length} checks · {pendingImport.audit.length} audit events · updated {stamp(pendingImport.updatedAt)}. Imported identities and decisions are supplied by the file author.</p><div className="review-actions"><button className="review-primary" onClick={() => { try { const next = mergeReview(reviews.find(r => r.id === pendingImport.id), pendingImport); save([...reviews.filter(r => r.id !== next.id), next]); open(next); setPendingImport(undefined); } catch (e) { setError(errorText(e)); } }}>Import and open</button><button onClick={() => setPendingImport(undefined)}>Cancel import</button></div></section>}
    {form && <>{form === "sample" && <p className="review-notice">{CASE_SOURCE} No completed assessments or designer responses are pre-filled.</p>}<MetadataForm key={`${form}-${selected ?? ""}`} initial={form === "edit" && review ? review.metadata : initialMetadata(form === "sample", actor.name)} onCancel={() => setForm(undefined)} onSave={m => { if (form === "edit" && review) { if (act(() => updateMetadata(review, actor, m))) setForm(undefined); } else { try { const next = createReview(m, actor, form === "sample" ? CULVERT_CHECKS : []); save([...reviews, next]); open(next); } catch (e) { setError(errorText(e)); } } }}/></>}
    {!review && !form && <><div className="review-dashboard-tabs">{VIEWS.map(v => <button key={v} aria-pressed={view === v} className={view === v ? "active" : ""} onClick={() => setView(v)}><strong>{reviews.filter(r => inView(r, v, actor.name)).length}</strong>{v}</button>)}</div><section className="review-card"><div className="review-card-heading"><h2>{view}</h2><small>Assigned to {actor.name || "your name"}</small></div>{visible.length ? <div className="review-list">{visible.map(r => <button key={r.id} onClick={() => open(r)}><span className="review-project">{r.metadata.project}</span><strong>{r.metadata.title}</strong><span>{r.metadata.stage || "Stage not supplied"} · {r.metadata.revision || "Revision not supplied"}</span><span>{r.items.filter(c => TERMINAL.includes(c.status)).length}/{r.items.length} complete · {r.closed ? "Closed" : "Open"}</span></button>)}</div> : <div className="review-empty"><h3>No reviews in this view</h3><p>Start the ST045683 case to review the recovered checks, create a blank review for any asset, or import a review file.</p></div>}</section>{reviews.length > 0 && <details className="review-card"><summary>All reviews on this device ({reviews.length})</summary><div className="review-list">{reviews.map(r => <button key={r.id} onClick={() => open(r)}>{r.metadata.project} · {r.metadata.title} · Reviewer: {r.metadata.reviewer}</button>)}</div></details>}</>}
    {review && !form && <>
      <section className="review-card"><div className="review-card-heading"><div><p className="eyebrow">{review.metadata.project} · {review.metadata.asset}</p><h2>{review.metadata.title}</h2></div><span className={`review-badge ${review.closed ? "complete" : ""}`}>{review.closed ? "Closed review" : "Open review"}</span></div><div className="review-meta"><span><small>Reviewer</small>{review.metadata.reviewer || "Not supplied"}</span><span><small>Designer</small>{review.metadata.designer || "Not supplied"}</span><span><small>Stage / revision</small>{review.metadata.stage || "Not supplied"} / {review.metadata.revision || "Not supplied"}</span><span><small>Review date</small>{review.metadata.date}</span></div>{review.metadata.scope && <p className="review-notice">{review.metadata.scope}</p>}<details><summary>Full review metadata and documents</summary><dl className="review-metadata-list">{Object.entries(labels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{review.metadata[key as keyof Metadata] || "Not supplied"}</dd></div>)}</dl></details><div className="review-actions">{actor.role === "Reviewer" && <><button disabled={review.closed || readOnly} onClick={() => setForm("edit")}>Edit details</button><button disabled={readOnly} onClick={() => { setClosing(!closing); setCloseReason(""); }}>{review.closed ? "Reopen review" : "Close review"}</button></>}<button disabled={busy} onClick={() => void exportFile("excel")}>↓ Excel register</button><button disabled={busy} onClick={() => void exportFile("word")}>↓ Word report</button><button onClick={() => setReportPreview(true)}>PDF / Print report</button><button onClick={() => download(JSON.stringify(review, null, 2), `${filename(review)}.json`, "application/json")}>↓ Review file</button></div>{closing && <form className="review-entry-form" onSubmit={e => { e.preventDefault(); if (act(() => setClosed(review, actor, !review.closed, closeReason))) setClosing(false); }}><label>{review.closed ? "Reason for reopening" : "Final reviewer close-out statement"}<textarea required value={closeReason} onChange={e => setCloseReason(e.target.value)}/></label><p>Closure requires every check to be Compliant, Closed or Not applicable. Raised comments must pass through designer response and reviewer verification.</p><button className="review-primary">{review.closed ? "Record reopening" : "Record final close-out"}</button></form>}</section>
      <div className="review-summary"><div><strong>{review.items.length}</strong>Total checks</div><div><strong>{review.items.filter(c => ["Comment", "Action required"].includes(c.status)).length}</strong>Awaiting designer</div><div><strong>{review.items.filter(c => ["Designer responded", "Reviewer verification"].includes(c.status)).length}</strong>Awaiting reviewer</div><div><strong>{review.items.filter(c => TERMINAL.includes(c.status)).length}</strong>Complete</div></div>
      <div className="review-actions"><button aria-pressed={section === "register"} onClick={() => setSection("register")}>Review register</button><button aria-pressed={section === "audit"} onClick={() => setSection("audit")}>Audit trail ({review.audit.length})</button></div>
      {section === "audit" ? <section className="review-card"><h2>Audit trail</h2><p>Append-only within this app. Local files are editable outside the app; this is not a tamper-proof or authenticated audit system.</p>{[...review.audit].reverse().map(e => <details key={e.id} className="review-audit"><summary>{stamp(e.at)} · {e.actor.name} · {e.action}</summary><pre>{readableDetail(e.detail)}</pre></details>)}</section> : <>
      <div className="review-filters"><label>Search<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Comment ID, check or response…"/></label><label>Discipline<select value={discipline} onChange={e => setDiscipline(e.target.value)}><option value="">All disciplines</option>{[...new Set(review.items.map(c => c.discipline))].map(d => <option key={d}>{d}</option>)}</select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>{actor.role === "Reviewer" && <button disabled={review.closed || readOnly} onClick={() => setAdding(!adding)}>+ Add check</button>}</div>
      {adding && <form className="review-card review-entry-form" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); if (act(() => addCheck(review, actor, { discipline: String(data.get("discipline")), title: String(data.get("title")), guidance: String(data.get("guidance")), source: String(data.get("source")) }))) setAdding(false); }}><h3>Add a review check</h3><label>Discipline<input name="discipline" required list="review-disciplines"/><datalist id="review-disciplines">{[...new Set(CULVERT_CHECKS.map(c => c.discipline))].map(d => <option key={d}>{d}</option>)}</datalist></label><label>Check description<input name="title" required/></label><label>Guidance / required evidence<textarea name="guidance"/></label><label>Source / drawing / report reference<input name="source" required/></label><button className="review-primary">Add check</button></form>}
      <div className="review-register-layout"><section className="review-card review-register"><div className="review-card-heading"><h2>Checklist</h2><small>{filtered.length} of {review.items.length} checks</small></div>{!filtered.length && <p>No checks match. Add a check or clear the filters.</p>}{filtered.map(c => <button key={c.id} className={`review-check ${itemId === c.id ? "selected" : ""}`} aria-pressed={itemId === c.id} onClick={() => setItemId(c.id)}><span className="review-check-id">{c.id} · {c.discipline}</span><strong>{c.title}</strong><span className={`review-badge ${TERMINAL.includes(c.status) ? "complete" : c.status === "Action required" ? "action" : ""}`}>{c.status}</span><small>{c.history.length ? `Round ${c.history.at(-1)?.round} · ${c.history.length} entries` : "No assessment recorded"}</small></button>)}</section><section className="review-card review-detail">{check ? <><p className="eyebrow">{check.id}</p><h2>{check.title}</h2><p>{check.guidance}</p><details><summary>Source provenance</summary><p>{check.source}</p></details><h3>Comment & response history</h3>{!check.history.length && <p className="review-muted">This check has not been assessed. Guidance is not an issued review comment.</p>}{check.history.map(e => <article className={`review-history ${e.actor.role.toLowerCase()}`} key={e.id}><div><b>Round {e.round} · {e.to}</b><small>{stamp(e.at)} · {e.actor.name} ({e.actor.role})</small></div><p>{e.text}</p>{e.evidence.reference && <p className="review-reference">Evidence: {e.evidence.reference}</p>}{e.evidence.calculator && <small>Related calculator: {e.evidence.calculator}</small>}</article>)}{review.closed ? <p className="review-notice">Review closed. Reopen it to record further review activity.</p> : <fieldset disabled={readOnly}><EntryForm key={`${check.id}-${actor.role}-${check.history.length}`} check={check} actor={actor} onSave={(to, text, evidence) => act(() => recordEntry(review, check.id, actor, to, text, evidence))}/></fieldset>}</> : <div className="review-empty"><h3>Select a check</h3><p>Read its source, record a finding and follow each response round here.</p></div>}</section></div></>}
    </>}
    </>}
  </div>;
}
