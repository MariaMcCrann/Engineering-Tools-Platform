export const STATUSES = ["Not reviewed", "Compliant", "Comment", "Action required", "Designer responded", "Reviewer verification", "Closed", "Not applicable"] as const;
export type Status = typeof STATUSES[number];
export type Role = "Reviewer" | "Designer";
export type Actor = { name: string; role: Role };
export type Metadata = { project: string; title: string; asset: string; location: string; stage: string; revision: string; date: string; reviewer: string; designer: string; documents: string; scope: string };
export type Evidence = { reference: string; calculator?: "culvert" | "rock-protection" | "headwall-concrete"; snapshot?: Record<string, string | number>; capturedAt?: string };
export type Entry = { id: string; at: string; actor: Actor; round: number; from: Status; to: Status; text: string; evidence: Evidence };
export type Check = { id: string; discipline: string; title: string; source: string; guidance: string; status: Status; history: Entry[] };
export type Audit = { id: string; at: string; actor: Actor; action: string; detail: string };
export type Review = { schemaVersion: 1; id: string; metadata: Metadata; items: Check[]; audit: Audit[]; closed: boolean; createdAt: string; updatedAt: string };
export const TERMINAL: Status[] = ["Compliant", "Closed", "Not applicable"];
export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
function requireActor(actor: Actor, role?: Role) {
  if (!actor.name.trim()) throw new Error("Enter your name before recording a decision.");
  if (role && actor.role !== role) throw new Error(`Only the ${role.toLowerCase()} can perform this action.`);
}
function audit(review: Review, actor: Actor, action: string, detail: string): Review {
  const at = now();
  return { ...review, updatedAt: at, audit: [...review.audit, { id: uid(), at, actor: { ...actor }, action, detail }] };
}
export function createReview(metadata: Metadata, actor: Actor, checks: Pick<Check, "discipline" | "title" | "source" | "guidance">[] = []): Review {
  requireActor(actor, "Reviewer");
  if (!metadata.project.trim() || !metadata.title.trim()) throw new Error("Project and review title are required.");
  const id = uid(), at = now();
  let review: Review = { schemaVersion: 1, id, metadata: { ...metadata }, items: [], audit: [], closed: false, createdAt: at, updatedAt: at };
  review = audit(review, actor, "Review created", JSON.stringify(metadata));
  for (const check of checks) review = addCheck(review, actor, check);
  return review;
}
export function addCheck(review: Review, actor: Actor, check: Pick<Check, "discipline" | "title" | "source" | "guidance">): Review {
  requireActor(actor, "Reviewer");
  if (review.closed) throw new Error("Reopen the review before adding checks.");
  if (!check.title.trim() || !check.discipline.trim()) throw new Error("A discipline and check description are required.");
  const prefix = check.discipline.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "REV";
  const id = `${review.id.slice(0, 8)}-${prefix}-${String(review.items.length + 1).padStart(3, "0")}`;
  return audit({ ...review, items: [...review.items, { ...check, id, status: "Not reviewed", history: [] }] }, actor, "Check added", JSON.stringify({ id, ...check }));
}
export function allowedStatuses(check: Check, role: Role): Status[] {
  if (role === "Designer") return ["Comment", "Action required"].includes(check.status) ? ["Designer responded"] : [];
  if (check.status === "Closed") return ["Action required"];
  if (check.status === "Designer responded") return ["Reviewer verification", "Action required"];
  if (check.status === "Reviewer verification") return ["Closed", "Action required"];
  if (check.history.some(e => e.to === "Comment" || e.to === "Action required")) return ["Comment", "Action required"];
  return ["Compliant", "Comment", "Action required", "Not applicable"];
}
export function recordEntry(review: Review, itemId: string, actor: Actor, to: Status, text: string, evidence: Evidence): Review {
  requireActor(actor);
  if (review.closed) throw new Error("Reopen the review before recording another entry.");
  const check = review.items.find(c => c.id === itemId);
  if (!check || !allowedStatuses(check, actor.role).includes(to)) throw new Error("This status transition is not available.");
  if (!text.trim()) throw new Error("Record the comment, response or decision reason.");
  if (["Compliant", "Designer responded", "Reviewer verification", "Closed"].includes(to) && !evidence.reference.trim()) throw new Error("Provide the drawing, revision, calculation or evidence reference.");
  const lastRound = check.history.at(-1)?.round ?? 0;
  const round = lastRound === 0 ? 1 : to === "Action required" && ["Designer responded", "Reviewer verification", "Closed"].includes(check.status) ? lastRound + 1 : lastRound;
  const entry: Entry = { id: uid(), at: now(), actor: { ...actor }, round, from: check.status, to, text: text.trim(), evidence: { ...evidence } };
  return audit({ ...review, items: review.items.map(c => c.id === itemId ? { ...c, status: to, history: [...c.history, entry] } : c) }, actor, `${itemId}: ${to}`, JSON.stringify(entry));
}
export function updateMetadata(review: Review, actor: Actor, metadata: Metadata): Review {
  requireActor(actor, "Reviewer");
  if (review.closed) throw new Error("Reopen the review before changing its metadata.");
  if (!metadata.project.trim() || !metadata.title.trim()) throw new Error("Project and review title are required.");
  return audit({ ...review, metadata: { ...metadata } }, actor, "Metadata updated", JSON.stringify({ before: review.metadata, after: metadata }));
}
export function setClosed(review: Review, actor: Actor, closed: boolean, reason: string): Review {
  requireActor(actor, "Reviewer");
  if (!reason.trim()) throw new Error("Record a review close-out or reopening reason.");
  if (closed && (!review.items.length || review.items.some(c => !TERMINAL.includes(c.status)))) throw new Error("Resolve every check before closing the review.");
  if (closed === review.closed) throw new Error("The review already has this state.");
  return audit({ ...review, closed }, actor, closed ? "Review closed" : "Review reopened", reason.trim());
}
export const VIEWS = ["My Reviews", "Awaiting Designer Response", "Awaiting My Review", "Closed Reviews"] as const;
export function inView(review: Review, view: string, name: string) {
  const mine = review.metadata.reviewer.trim().toLowerCase() === name.trim().toLowerCase();
  if (view === "Closed Reviews") return review.closed && mine;
  if (review.closed) return false;
  if (view === "Awaiting Designer Response") return (mine || review.metadata.designer.trim().toLowerCase() === name.trim().toLowerCase()) && review.items.some(c => ["Comment", "Action required"].includes(c.status));
  if (view === "Awaiting My Review") return mine && review.items.some(c => ["Designer responded", "Reviewer verification"].includes(c.status));
  return mine;
}
export function validateReview(value: unknown): Review {
  if (!value || typeof value !== "object") throw new Error("Invalid review file.");
  const r = value as Review;
  const string = (v: unknown): v is string => typeof v === "string" && v.length <= 100000;
  const date = (v: unknown) => string(v) && Number.isFinite(Date.parse(v));
  const actor = (v: Actor) => v && string(v.name) && !!v.name.trim() && ["Reviewer", "Designer"].includes(v.role);
  const keys = ["project", "title", "asset", "location", "stage", "revision", "date", "reviewer", "designer", "documents", "scope"] as const;
  if (r.schemaVersion !== 1 || !string(r.id) || !r.id || !r.metadata || !keys.every(k => string(r.metadata[k])) || !r.metadata.project.trim() || !r.metadata.title.trim() || typeof r.closed !== "boolean" || !date(r.createdAt) || !date(r.updatedAt) || !Array.isArray(r.items) || r.items.length > 2000 || !Array.isArray(r.audit) || r.audit.length > 20000) throw new Error("Unsupported or incomplete review file.");
  const ids = new Set<string>();
  for (const c of r.items) {
    if (!c || ![c.id, c.discipline, c.title, c.source, c.guidance].every(string) || !c.id.trim() || !c.title.trim() || !c.discipline.trim() || ids.has(c.id) || !STATUSES.includes(c.status) || !Array.isArray(c.history) || c.history.length > 1000) throw new Error("Invalid or duplicate checklist item.");
    ids.add(c.id);
    let prior: Check = { ...c, status: "Not reviewed", history: [] };
    for (const e of c.history) {
      if (!e || !string(e.id) || ids.has(e.id) || !date(e.at) || !actor(e.actor) || !string(e.text) || !e.text.trim() || !e.evidence || !string(e.evidence.reference) || !Number.isInteger(e.round) || e.round < 1 || e.from !== prior.status || !allowedStatuses(prior, e.actor.role).includes(e.to)) throw new Error("Invalid response history.");
      if (["Compliant", "Designer responded", "Reviewer verification", "Closed"].includes(e.to) && !e.evidence.reference.trim()) throw new Error("History is missing evidence references.");
      if (e.evidence.calculator !== undefined && !["culvert", "rock-protection", "headwall-concrete"].includes(e.evidence.calculator)) throw new Error("Invalid calculator reference.");
      if (e.evidence.snapshot !== undefined && (!e.evidence.snapshot || typeof e.evidence.snapshot !== "object" || Array.isArray(e.evidence.snapshot) || !Object.values(e.evidence.snapshot).every(v => string(v) || (typeof v === "number" && Number.isFinite(v))))) throw new Error("Invalid calculator snapshot.");
      const last = prior.history.at(-1)?.round ?? 0;
      const expected = !last ? 1 : e.to === "Action required" && ["Designer responded", "Reviewer verification", "Closed"].includes(prior.status) ? last + 1 : last;
      if (e.round !== expected) throw new Error("Invalid review round sequence.");
      ids.add(e.id); prior = { ...prior, status: e.to, history: [...prior.history, e] };
    }
    if (prior.status !== c.status) throw new Error("Status does not match the recorded history.");
  }
  for (const a of r.audit) {
    if (!a || !string(a.id) || ids.has(a.id) || !date(a.at) || !actor(a.actor) || !string(a.action) || !string(a.detail)) throw new Error("Invalid audit trail.");
    ids.add(a.id);
  }
  if (!r.audit.length || (r.closed && (!r.items.length || r.items.some(c => !TERMINAL.includes(c.status))))) throw new Error("Invalid review closure or missing audit trail.");
  return r;
}
// Sequential handoff only: never silently resolve competing edits or discard history.
export function mergeReview(local: Review | undefined, incoming: Review): Review {
  validateReview(incoming);
  if (!local) return incoming;
  if (JSON.stringify(local) === JSON.stringify(incoming)) return local;
  const prefix = <T,>(a: T[], b: T[]) => a.length <= b.length && a.every((v, i) => JSON.stringify(v) === JSON.stringify(b[i]));
  if (local.id !== incoming.id || !prefix(local.audit, incoming.audit) || incoming.audit.length <= local.audit.length || !local.items.every(c => { const next = incoming.items.find(n => n.id === c.id); return next && c.title === next.title && c.discipline === next.discipline && c.source === next.source && c.guidance === next.guidance && prefix(c.history, next.history); })) throw new Error("This file is older or contains competing edits. No local history was replaced. Start from the latest review file and re-enter the outstanding responses.");
  return incoming;
}
