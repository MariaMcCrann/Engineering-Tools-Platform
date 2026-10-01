// Checklist content transcribed from "DESIGN CHECKLIST_Draft.xlsx" (CULVERT, Drawings and Railway sheets,
// last updated 28 September 2016). Only the procedure wording is carried over; the example project answers are not.
// A row is [number, item, procedure]. A row without a procedure is a sub-heading.
type Row = [no: string, item: string, procedure?: string];
type SectionSource = { no: string; title: string; rows: Row[] };
type TemplateSource = { key: string; label: string; title: string; description: string; sections: SectionSource[] };

export const ANSWERS = ["Yes", "No", "N/A"] as const;
export const STATUSES = ["Open", "Closed"] as const;
export type Answer = "" | typeof ANSWERS[number];
export type ItemStatus = typeof STATUSES[number];
export type ItemState = { answer: Answer; checked: boolean; designer: string; reviewer: string; status: ItemStatus };
export type ChecklistState = { header: Record<string, string>; items: Record<string, ItemState> };
export type ChecklistRow = { id: string; no: string; item: string; procedure: string; heading: boolean };
export type ChecklistSection = { no: string; title: string; rows: ChecklistRow[] };
export type Checklist = { key: string; label: string; title: string; description: string; sections: ChecklistSection[] };

export const HEADER_FIELDS: [key: string, label: string][] = [
  ["project", "Project description"], ["budget", "Budget"],
  ["date", "Date"], ["estimate", "Design estimate"],
  ["designer", "Designer"], ["job", "Job number"],
  ["manager", "Project manager"], ["asset", "Asset no."],
  ["fileRef", "File reference"], ["drawing", "Drawing no."],
  ["checkedBy", "Design checked by"], ["fy", "FY of works"],
];

const SOURCES: TemplateSource[] = [
  { key: "culvert", label: "Culvert", title: "Culvert Summary Procedure", description: "Full culvert replacement design procedure — background, survey, OH&S, consultation, environment, design, finance and reporting.", sections: [
    { no: "1", title: "Background", rows: [
      ["1.1", "Supply Levels", "Have supply levels been obtained and confirmed?"],
      ["1.2", "Property Ownership", "Has property ownership at and around the proposed culvert replacement site been checked and confirmed?"],
      ["", "", "Who is the Road Authority? (VicRoads, Council)"],
      ["1.3", "Revision of ACR", "What is the current Asset Condition Rating? Has it been revised?"],
      ["", "", "Has there been a site inspection?"],
    ] },
    { no: "2", title: "Rationalisation", rows: [
      ["", "", "Are the assets required? Can they be rationalised?"],
      ["", "", "Have alternative solutions been investigated?"],
      ["", "", "Has an NPV been completed (for projects > $50,000 only)?"],
    ] },
    { no: "3", title: "Field Survey", rows: [
      ["3.1", "Benchmarks", "Have AHD benchmarks been identified and cards printed?"],
      ["", "", "Was the survey completed by GMW?"],
      ["3.2", "OH&S Risks Identified", "Has HRA been completed prior to start of survey?"],
      ["3.3", "Survey Completed"],
      ["3.31", "Flow Direction", "What is the flow direction?"],
      ["3.32", "Drainage", "Are there table drains & drainage infrastructure near the proposed works site?"],
      ["3.33", "Structure Dimensions & Elevations", "What are the existing structure elevations (check, measure & document)?"],
      ["", "", "Diameter/area of existing culvert"],
      ["", "", "Length of track"],
      ["3.34", "Track Elevation", "What is the existing track elevation — can the level be reduced?"],
      ["3.35", "Proximity of other assets", "Will other assets be affected by the proposal? If so, how, to what extent and potential repercussions?"],
      ["", "Photos", "Have site photos been taken?"],
    ] },
    { no: "4", title: "OH&S", rows: [
      ["4.1", "Site hazard identification", "Does the design or works site have any potential OH&S issues?"],
      ["", "", "Have OH&S site hazards been identified?"],
      ["", "", "Are services shown on design plans?"],
      ["4.2", "Dial Before You Dig", "Has a Dial Before You Dig request been undertaken? Flag and document identified services on detailed design, project report and to contractor/construction."],
      ["", "", "Has a proving of services been undertaken and the assets shown on the plans?"],
      ["4.3", "HRA for Construction", "Have risks been listed in the Approval Memo under the OH&S heading?"],
      ["4.4", "Road detour", "Have road detours been considered? If so, are they shown on the plans?"],
    ] },
    { no: "5", title: "Consultation", rows: [
      ["5.1", "Irrigation Area", "Has the Area been consulted about preliminary design requirements/recommendations (prior to commencing design)?"],
      ["5.2", "Authorities", "Does the structure need to be extended to full road reserve width? Check Council requirements."],
      ["", "", "Do Councils follow Austroads or VicRoads design requirements?"],
      ["", "", "Have relevant Authority approvals & requirements been sought?"],
      ["", "", "Is a 3rd party review required?"],
      ["5.3", "Landowners", "Have landowners been consulted regarding the proposal?"],
      ["", "", "Does the landowner require additional width at their cost?"],
      ["", "", "Refer DM#3336418 for Landowner Consultation Form."],
    ] },
    { no: "6", title: "Environment", rows: [
      ["6.1", "Project Environmental Procedure", "Has the Pre-Works Checklist been completed? (DM#3307052)"],
      ["", "", "Have you completed the requirements of Project Environment Procedure DM#1821110?"],
      ["6.2", "", "Is it routine works (as defined under the EMS procedure)?"],
      ["6.3", "", "If not routine works, have you completed the Environmental Risk Assessment, Legal Checklist and Project Environmental Management Plan?"],
      ["6.4", "", "Do trees need to be removed? If so, complete the Vegetation Removal Form (https://gmwater.nexus.objective.com/documents/A1412359/details)."],
      ["6.5", "Land Status", "Is the work site located on easement, crown reserve, road reserve or G-MW freehold?"],
      ["6.6", "Planning Permit", "Is a Planning Permit required? Has a planning permit been obtained?"],
    ] },
    { no: "7", title: "Design", rows: [
      ["7.1", "Calculations complete"],
      ["7.11", "Adequate Capacity", "Has the capacity been determined through IPM, Maximo and Area assessment?"],
      ["", "", "Has the proposed capacity been approved by the Area?"],
      ["", "", "What is the IPM capacity of the upstream & downstream regulators?"],
      ["7.12", "Headloss", "Have standard headloss spreadsheets been used to calculate headloss for HDPE and RCP? (DM#2302299)"],
      ["", "", "Is headloss less than 0.030 m (typically) or is there more head available?"],
      ["", "", "Does overtopping occur?"],
      ["7.13", "Exit Velocity", "Is the exit velocity < 0.75 m/s, 0.75–1.5 m/s or > 1.5 m/s?"],
      ["7.14", "Vicinity of Assets", "What is the distance to the closest GMW asset?"],
      ["", "", "What is the distance to the channel bend? Can a headwall-less arrangement be used?"],
      ["7.15", "Material (HDPE/RCP)", "Will there be excessive loads on the crossing? Depending on size, use Class 2 RCP? (Refer Design Loading Standards (CPAA) and attached PipeClass v2.0 load report)"],
      ["7.16", "Outlets", "Is the culvert for outlet irrigation flows? If so, follow the design guidelines for irrigation road crossings (A2833884)."],
      ["7.2", "Design to current Standard"],
      ["7.21", "Invert", "Is the pipe a minimum of 1/2 (channels) or 1/3 (drains) the pipe diameter below the bed of the channel/drain?"],
      ["7.22", "Cover", "Is there 600 mm cover between top of pipe and road/track?"],
      ["", "", "Is there 450 mm cover between top of pipe and bed of table drain?"],
      ["7.23", "Submergence", "Is the top of the pipe 17 mm for every 100 mm of pipe diameter below supply level?"],
      ["7.24", "Headwall", "Is it 150 mm thick (230 mm where pipe dia > 750 mm), 600 mm into solid bank?"],
      ["", "", "Have pre-cast headwall and wingwalls been considered?"],
      ["7.25", "Freeboard", "Is there 300 mm freeboard between SL and top of headwall/batter & 230 mm between HWM and top of headwall/batter?"],
      ["7.26", "Batter Slopes", "Are the banks at 1V:2H (or other suitable slope)?"],
      ["7.27", "Beaching / Geotextile Fabric", "Does the beaching extend 3 m u/s and d/s from the structure and 300 mm above SL?"],
      ["7.28", "Collar block", "Is there a 300 mm wide reinforced concrete collar block extending 300 mm from the pipe (with stainless steel weep flange for HDPE)?"],
      ["7.29", "Bed slopes", "Is the U/S bed slope 1V:5H and D/S bed slope 1V:9H?"],
      ["7.30", "Cut-off walls (for headwall-less)", "Does it extend 600 mm into solid ground and up to SL on channels, and 450 mm into solid ground on drains?"],
      ["7.31", "Clear zone", "What is the minimum clear zone required?"],
      ["7.32", "Geotechnical", "Is the proposed culvert pipe size greater than or equal to 900 mm diameter? If so, has a soil test been done at the site by the contractor or G-MW soils lab?"],
      ["7.33", "Quality Assurance", "Has the design plan been checked by another team member?"],
      ["7.34", "Technical Report", "Has the technical report highlighted all constraints and construction methods?"],
    ] },
    { no: "8", title: "Finance", rows: [
      ["8.1", "Cost Estimate", "Has the cost estimate been checked by Project Delivery? (DM#4257540 Template)"],
      ["", "", "Is the appropriate contingency level being used? Refer to Project Cost Estimating & Risk Sharing Policy (DM#854341)."],
      ["8.2", "Budget", "Is the cost estimate within the project budget?"],
      ["", "", "Where are the funds for the project sourced from?"],
    ] },
    { no: "9", title: "Reporting", rows: [
      ["9.1", "Documents in DM", "Have all spreadsheets/drawings/reports been saved to the correct File No in DM?"],
    ] },
  ] },
  { key: "drawings", label: "Drawings", title: "Drawings Checklist", description: "Drawing content checks — levels, existing assets, services, boundaries, legend and trees.", sections: [
    { no: "1", title: "Background", rows: [
      ["1.1", "", "Are finished surface levels provided?"],
      ["1.2", "", "Are the existing assets shown on plans?"],
      ["", "", "Has there been consideration of the location of the worksite?"],
      ["1.3", "", "Underground power lines?"],
      ["", "", "Overhead power lines?"],
      ["", "", "Flow direction shown in plans?"],
      ["", "", "Property boundaries shown?"],
      ["", "", "All line types shown in the legend?"],
      ["", "", "Fencing?"],
      ["", "", "Trees to be removed clearly marked?"],
      ["", "", "Trees TPZ clearly marked?"],
    ] },
  ] },
  { key: "railway", label: "Railway", title: "Assets within VicTrack Property", description: "Additional checks for works within the rail corridor — VicTrack consultation, permits, AS 4799 and rail loading.", sections: [
    { no: "1", title: "VicTrack requirements", rows: [
      ["", "", "Have the VicTrack details been requested and documented in the report and drawings?"],
      ["", "", "Distance to the nearest up and down rail stations"],
      ["", "", "Has the geotechnical investigation been completed?"],
      ["", "", "Has VicTrack been consulted?"],
      ["", "", "Is there a Site Access Permit to conduct investigations?"],
      ["", "", "Are all the services proved and shown on plans?"],
      ["", "", "Are VicTrack property boundaries shown clearly on plans?"],
      ["", "", "Has the pipe class calculation been completed and reported?"],
      ["", "", "Is the design compliant with AS 4799?"],
      ["", "", "Was rail loading considered in the design?"],
      ["", "", "Have the relevant safety implications been considered and reported for construction within a rail corridor?"],
      ["", "", "Was the consultant engaged for the 3rd party review?"],
    ] },
  ] },
];

export const CHECKLISTS: Checklist[] = SOURCES.map(t => {
  let n = 0;
  return { ...t, sections: t.sections.map(s => ({ no: s.no, title: s.title, rows: s.rows.map(([no, item, procedure]) => ({ id: `${t.key}-${++n}`, no, item, procedure: procedure ?? "", heading: procedure === undefined })) })) };
});

export const blankItem = (): ItemState => ({ answer: "", checked: false, designer: "", reviewer: "", status: "Open" });
export const questionsOf = (c: Checklist) => c.sections.flatMap(s => s.rows.filter(r => !r.heading));
export function summarise(c: Checklist, state: ChecklistState) {
  const items = questionsOf(c).map(r => state.items[r.id] ?? blankItem());
  return { total: items.length, answered: items.filter(i => i.answer).length, checked: items.filter(i => i.checked).length, closed: items.filter(i => i.status === "Closed").length, no: items.filter(i => i.answer === "No").length };
}
