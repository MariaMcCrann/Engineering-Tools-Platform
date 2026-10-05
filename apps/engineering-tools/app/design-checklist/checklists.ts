// Checklist content transcribed from "DESIGN CHECKLIST_Draft.xlsx" (CULVERT, Drawings and Railway sheets,
// original procedure last updated 28 September 2016; expanded workbook supplied 5 October 2026). Only the procedure wording is carried over; the example project answers are not.
// A row is [number, item, procedure]. A row without a procedure is a sub-heading.
type Row = [no: string, item: string, procedure?: string, stableId?: string];
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


// Workbook additions use explicit IDs; legacy sequential IDs must never change.
SOURCES.find(t => t.key === "culvert")!.sections.find(s => s.title === "Background")!.rows.push(
  ["", "", "Site/location and culvert identification are correct", "culvert-oct2026-1"],
  ["", "", "Existing culvert size, type, material and condition documented", "culvert-oct2026-2"],
  ["", "", "Design standards/guidelines identified and current", "culvert-oct2026-3"],
  ["", "", "Design life stated and appropriate", "culvert-oct2026-4"],
  ["", "", "Existing upstream/downstream structures identified", "culvert-oct2026-5"],
  ["", "", "Existing inlet/outlet invert levels verified", "culvert-oct2026-6"],
  ["", "", "Existing road levels and crossfall confirmed", "culvert-oct2026-7"]
);
SOURCES.find(t => t.key === "culvert")!.sections.find(s => s.title === "Rationalisation")!.rows.push(
  ["", "", "Design purpose and rationale are clear", "culvert-oct2026-8"]
);
SOURCES.find(t => t.key === "culvert")!.sections.find(s => s.title === "Field Survey")!.rows.push(
  ["", "", "Waterway/channel geometry adequately surveyed", "culvert-oct2026-9"]
);
SOURCES.find(t => t.key === "culvert")!.sections.find(s => s.title === "Reporting")!.rows.push(
  ["", "", "Design assumptions clearly documented", "culvert-oct2026-10"]
);
SOURCES.find(t => t.key === "drawings")!.sections[0].rows.push(["", "", "Existing services shown/considered", "drawings-oct2026-services"]);
SOURCES.push({
  "key": "culvert-design-review",
  "label": "Culvert Design Review",
  "title": "Culvert Replacement – Design Review Checklist",
  "description": "101 technical review checks from the October 2026 workbook, grouped by design basis, hydrology, hydraulics, culvert design, scour, road interface, constructability, drawings, consistency and final QA.",
  "sections": [
    {
      "no": "1",
      "title": "Design basis",
      "rows": [
        ["1", "", "Site/location and culvert identification are correct"],
        ["2", "", "Design purpose and replacement rationale are clear"],
        ["3", "", "Existing culvert size, type, material and condition documented"],
        ["4", "", "Relevant survey information referenced"],
        ["5", "", "Design standards/guidelines identified and current"],
        ["6", "", "Design life stated and appropriate"],
        ["7", "", "Design assumptions clearly documented"]
      ]
    },
    {
      "no": "2",
      "title": "Survey & existing conditions",
      "rows": [
        ["8", "", "Existing inlet/outlet invert levels verified"],
        ["9", "", "Existing road levels and crossfall confirmed"],
        ["10", "", "Waterway/channel geometry adequately surveyed"],
        ["11", "", "Existing upstream/downstream structures identified"],
        ["12", "", "Existing services shown/considered"],
        ["13", "", "Property boundaries/easements considered"],
        ["14", "", "Existing drainage connections identified"]
      ]
    },
    {
      "no": "3",
      "title": "Hydrology",
      "rows": [
        ["15", "", "Catchment area checked"],
        ["16", "", "Catchment delineation reasonable"],
        ["17", "", "ARR methodology appropriate"],
        ["18", "", "IFD/rainfall inputs checked"],
        ["19", "", "Losses and other hydrologic parameters justified"],
        ["20", "", "Existing and design flows clearly reported"],
        ["21", "", "Relevant AEP events assessed"],
        ["22", "", "Climate change allowance considered where required"],
        ["23", "", "Hydrologic calculations independently sense-checked"]
      ]
    },
    {
      "no": "4",
      "title": "Hydraulics",
      "rows": [
        ["24", "", "Proposed culvert capacity checked"],
        ["25", "", "Existing vs proposed hydraulic performance compared"],
        ["26", "", "Inlet/outlet control considered"],
        ["27", "", "Headwater level checked"],
        ["28", "", "Tailwater assumptions reasonable"],
        ["29", "", "Afflux assessed"],
        ["30", "", "Upstream flood impacts assessed"],
        ["31", "", "Road overtopping assessed where applicable"],
        ["32", "", "Velocity through barrels checked"],
        ["33", "", "Outlet velocity checked"],
        ["34", "", "Blockage allowance applied and justified"],
        ["35", "", "Debris passage considered"],
        ["36", "", "Fish passage/environmental requirements considered where relevant"]
      ]
    },
    {
      "no": "5",
      "title": "Culvert design",
      "rows": [
        ["37", "", "Number and size of barrels match calculations"],
        ["38", "", "Culvert material/class appropriate"],
        ["39", "", "Minimum cover requirements satisfied"],
        ["40", "", "Culvert grade checked"],
        ["41", "", "Inlet/outlet invert levels checked"],
        ["42", "", "Culvert length sufficient for road geometry"],
        ["43", "", "End treatments appropriate"],
        ["44", "", "Headwalls/wingwalls appropriately designed"],
        ["45", "", "Structural loading requirements addressed"],
        ["46", "", "Bedding/foundation requirements specified"],
        ["47", "", "Settlement/differential settlement considered"]
      ]
    },
    {
      "no": "6",
      "title": "Scour & erosion",
      "rows": [
        ["48", "", "Scour risk assessed"],
        ["49", "", "Outlet protection sized appropriately"],
        ["50", "", "Rock beaching/riprap details provided"],
        ["51", "", "Apron length/width/depth adequate"],
        ["52", "", "Geotextile/filter requirements specified"],
        ["53", "", "Downstream erosion risk considered"],
        ["54", "", "Upstream erosion/bank protection considered"]
      ]
    },
    {
      "no": "7",
      "title": "Road design/interface",
      "rows": [
        ["55", "", "Finished road levels consistent with culvert design"],
        ["56", "", "Pavement reconstruction limits shown"],
        ["57", "", "Road crossfall and drainage maintained"],
        ["58", "", "Batter slopes appropriate"],
        ["59", "", "Safety barriers considered where required"],
        ["60", "", "Culvert ends clear of required safety zones or appropriately treated"]
      ]
    },
    {
      "no": "8",
      "title": "Constructability",
      "rows": [
        ["61", "", "Practical construction sequence possible"],
        ["62", "", "Temporary water diversion/bypass considered"],
        ["63", "", "Works can be constructed within available footprint"],
        ["64", "", "Excavation depth and stability considered"],
        ["65", "", "Dewatering requirements considered"],
        ["66", "", "Access for construction plant considered"],
        ["67", "", "Existing services can be protected/relocated"],
        ["68", "", "Traffic management/staging considered"],
        ["69", "", "Existing culvert removal methodology considered"],
        ["70", "", "Environmental controls considered"]
      ]
    },
    {
      "no": "9",
      "title": "Drawing review",
      "rows": [
        ["71", "", "Title, drawing number and revision correct"],
        ["72", "", "North point, scale and datum provided"],
        ["73", "", "Existing vs proposed works clearly distinguishable"],
        ["74", "", "Plan, longitudinal section and cross-sections consistent"],
        ["75", "", "Culvert size/number/material/class shown"],
        ["76", "", "Inlet and outlet invert levels shown"],
        ["77", "", "Culvert grade shown or derivable"],
        ["78", "", "Culvert length shown"],
        ["79", "", "Road levels shown"],
        ["80", "", "Headwalls/endwalls shown and detailed"],
        ["81", "", "Scour protection extent and specification shown"],
        ["82", "", "Bedding/backfill details shown"],
        ["83", "", "Services shown"],
        ["84", "", "Construction notes/specifications adequate"],
        ["85", "", "Dimensions and levels sufficient to construct without assumptions"]
      ]
    },
    {
      "no": "10",
      "title": "Report ↔ drawing consistency",
      "rows": [
        ["86", "", "Culvert dimensions match report/calculations"],
        ["87", "", "Invert levels match"],
        ["88", "", "Culvert length and grade match"],
        ["89", "", "Number of barrels match"],
        ["90", "", "Material/class match"],
        ["91", "", "Headwall/end treatment matches"],
        ["92", "", "Scour protection matches hydraulic recommendations"],
        ["93", "", "Design flows/AEPs are consistent throughout documents"]
      ]
    },
    {
      "no": "11",
      "title": "Final QA",
      "rows": [
        ["94", "", "Calculations checked for obvious errors"],
        ["95", "", "Units consistent"],
        ["96", "", "Levels use consistent datum"],
        ["97", "", "Drawing references/details correct"],
        ["98", "", "Superseded information removed"],
        ["99", "", "Comments from previous review incorporated/closed"],
        ["100", "", "Design risks/limitations clearly identified"],
        ["101", "", "Package is suitable for its stated stage (concept/IFR/IFC)"]
      ]
    }
  ]
});

export const CHECKLISTS: Checklist[] = SOURCES.map(t => {
  let n = 0;
  return { ...t, sections: t.sections.map(s => ({ no: s.no, title: s.title, rows: s.rows.map(([no, item, procedure, stableId]) => ({ id: stableId ?? `${t.key}-${++n}`, no, item, procedure: procedure ?? "", heading: procedure === undefined })) })) };
});

// Keep the legacy storage key and IDs when renaming the visible checklist.
const general = CHECKLISTS.find(c => c.key === "culvert")!;
const technical = CHECKLISTS.find(c => c.key === "culvert-design-review")!;
const designSection = general.sections.find(s => s.no === "7")!;
general.label = "General";
general.title = "General Design Checklist";
general.description = "General project procedures — background, rationalisation, survey, OH&S, consultation, environment, finance and reporting. Technical culvert checks are in Culvert Design Review.";

// Each former section 7 question has exactly one destination. Existing technical
// questions are enriched instead of adding a second check for the same assessment.
export const SECTION_7_DESTINATIONS: Record<string, { section: string; target?: string; detail?: string }> = {
  "culvert-44": { section: "Hydraulics", target: "24", detail: "For irrigation assets, confirm capacity through IPM, Maximo and Area assessment." },
  "culvert-45": { section: "Hydraulics" },
  "culvert-46": { section: "Hydraulics" },
  "culvert-47": { section: "Hydraulics" },
  "culvert-48": { section: "Hydraulics", target: "culvert-47", detail: "Check whether headloss is less than 0.030 m (typically), or confirm that more head is available." },
  "culvert-49": { section: "Hydraulics", target: "31" },
  "culvert-50": { section: "Hydraulics", target: "33", detail: "Record whether exit velocity is < 0.75 m/s, 0.75–1.5 m/s or > 1.5 m/s." },
  "culvert-51": { section: "Survey & existing conditions" },
  "culvert-52": { section: "Culvert design", target: "43", detail: "Record the distance to the channel bend and assess whether a headwall-less arrangement is suitable." },
  "culvert-53": { section: "Culvert design", target: "45", detail: "Assess excessive crossing loads and justify pipe class using the applicable Design Loading Standards (CPAA) and PipeClass load report; consider Class 2 RCP where appropriate." },
  "culvert-54": { section: "Design basis", target: "5", detail: "For outlet irrigation flows, check the design guidelines for irrigation road crossings (A2833884)." },
  "culvert-56": { section: "Culvert design", target: "41", detail: "Check pipe embedment below the bed: minimum 1/2 pipe diameter in channels or 1/3 in drains, or document the adopted alternative." },
  "culvert-57": { section: "Culvert design", target: "39", detail: "Check 600 mm cover between pipe crown and road/track, or document the adopted requirement." },
  "culvert-58": { section: "Culvert design", target: "39", detail: "Check 450 mm cover between pipe crown and table-drain bed, or document the adopted requirement." },
  "culvert-59": { section: "Culvert design" },
  "culvert-60": { section: "Culvert design", target: "44", detail: "Check the procedure's headwall thickness of 150 mm (230 mm for pipe dia > 750 mm) and 600 mm embedment into solid bank, or justify the designed alternative." },
  "culvert-61": { section: "Culvert design", target: "44", detail: "Consider pre-cast headwalls and wingwalls." },
  "culvert-62": { section: "Culvert design" },
  "culvert-63": { section: "Road design/interface", target: "58", detail: "Check 1V:2H bank batters or justify another suitable slope." },
  "culvert-64": { section: "Scour & erosion", target: "51", detail: "Check the procedure's beaching extent of 3 m upstream and downstream and 300 mm above supply level, or justify the calculated extent." },
  "culvert-65": { section: "Culvert design" },
  "culvert-66": { section: "Culvert design" },
  "culvert-67": { section: "Culvert design" },
  "culvert-68": { section: "Road design/interface", target: "60", detail: "Determine and document the required minimum clear zone." },
  "culvert-69": { section: "Culvert design" },
  "culvert-70": { section: "Final QA" },
  "culvert-71": { section: "Final QA", target: "100", detail: "Confirm the technical report explains all constraints and construction methods." },
};
let nextNumber = 102;
for (const source of designSection.rows.filter(r => !r.heading)) {
  const destination = SECTION_7_DESTINATIONS[source.id];
  const section = technical.sections.find(s => s.title === destination.section)!;
  if (destination.target) {
    const target = section.rows.find(r => r.no === destination.target || r.id === destination.target)!;
    if (destination.detail) target.procedure += ` ${destination.detail}`;
  } else {
    section.rows.push({ ...source, no: String(nextNumber++) });
  }
}
general.sections = general.sections.filter(s => s !== designSection);
technical.description = "Technical culvert review with section 7 design checks consolidated into the matching topic. Overlapping checks are combined; procedure-specific details are retained.";

export const blankItem = (): ItemState => ({ answer: "", checked: false, designer: "", reviewer: "", status: "Open" });
export const questionsOf = (c: Checklist) => c.sections.flatMap(s => s.rows.filter(r => !r.heading));
export function summarise(c: Checklist, state: ChecklistState) {
  const items = questionsOf(c).map(r => state.items[r.id] ?? blankItem());
  return { total: items.length, answered: items.filter(i => i.answer).length, checked: items.filter(i => i.checked).length, closed: items.filter(i => i.status === "Closed").length, no: items.filter(i => i.answer === "No").length };
}
