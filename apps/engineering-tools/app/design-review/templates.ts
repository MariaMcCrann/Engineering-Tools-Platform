import type { Check, Metadata } from "./engine";
export const CASE_SOURCE = "Engineering Tool Ideas conversation, 18 September 2026. ST045683 summary only; original marked-up drawings and issued register not recovered. Verify wording and references before issue.";
const basis = "Assessing Design Basis conversation, 8 September 2026; agreed hydraulic hold-point wording. Project association requires confirmation.";
const checklist = "Culvert Review Checklist conversation, 1 September 2026; prior checklist, not a completed project assessment.";
type Seed = Pick<Check, "discipline" | "title" | "source" | "guidance">;
export const CULVERT_CHECKS: Seed[] = [
  ["Drawings", "Plan and section dimensions agree", "Reconcile the reported 3000 mm plan dimension and 6840 mm Section 1 dimension. Confirm what each dimension describes against the original drawings.", CASE_SOURCE],
  ["Culvert", "Cover and finished road levels", "Confirm cover above the twin-cell culvert against finished levels and the adopted loading/design basis.", CASE_SOURCE],
  ["Culvert", "Invert levels and grade", "Verify inlet and outlet inverts, culvert length and derived grade are consistent in drawings and calculations.", CASE_SOURCE],
  ["Services", "Existing services and interfaces", "Confirm services are identified and protection or relocation requirements are documented.", CASE_SOURCE],
  ["Earthworks", "Bedding and backfill arrangement", "Define bedding/backfill extent, material and compaction requirements with a construction detail.", CASE_SOURCE],
  ["Hydraulics", "Hydraulic design basis and head losses", "Provide the hydraulic design basis for the culvert inlet and outlet treatment, including design flows, channel and culvert velocities, and head losses.", basis],
  ["Hydraulics", "Channel velocity assessed separately", "Provide the channel geometry, operating conditions, calculation and velocity separately from barrel velocity.", CASE_SOURCE],
  ["Hydraulics", "Culvert barrel and outlet velocities", "Document barrel and outlet velocities and connect the adopted conditions to the design flow.", CASE_SOURCE],
  ["Scour", "Rock protection sizing and extent", "Demonstrate that the proposed rock protection and its extent are adequate for the calculated velocities and potential scour.", basis],
  ["Scour", "Beaching and filter details", "Confirm rock grading, layer thickness, apron extent, filter/geotextile and termination details are shown.", checklist],
  ["Structures", "Headwall and wingwall design basis", "Where wingwalls are not proposed, confirm the design basis for the headwall arrangement and demonstrate sufficient erosion protection and embankment stability for the design events.", basis],
  ["Coordination", "Calculations and drawings agree", "Verify dimensions, levels, end treatment and scour protection match the design calculations and current drawing revision.", CASE_SOURCE],
  ["Hydraulics", "Capacity, headwater and afflux", "Check inlet/outlet control, tailwater assumptions and existing versus proposed hydraulic performance.", checklist],
  ["Construction", "Construction sequence and temporary water management", "Check diversion/bypass, excavation, dewatering, traffic staging and practical access.", checklist],
  ["Quality", "Design package complete for review stage", "Confirm plan, long section, road cross-section, culvert section, headwall, backfill, rock protection, levels and construction notes are included.", CASE_SOURCE],
].map(([discipline, title, guidance, source]) => ({ discipline, title, guidance, source }));
export function initialMetadata(sample: boolean, reviewer: string): Metadata {
  return { project: sample ? "ST045683" : "", title: sample ? "Twin-cell 2400 × 1800 box culvert — source verification" : "Design review", asset: sample ? "Culvert" : "Other", location: "", stage: "", revision: "", date: new Date().toLocaleDateString("en-CA"), reviewer, designer: "", documents: "", scope: sample ? "Reconstructed from prior conversations. Confirm the original drawing/report revisions and project-specific findings before issuing comments. All checks start Not reviewed." : "" };
}
