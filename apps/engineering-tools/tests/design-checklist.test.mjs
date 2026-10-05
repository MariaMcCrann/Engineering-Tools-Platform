import assert from "node:assert/strict";
import test from "node:test";
import { CHECKLISTS, blankItem, questionsOf, summarise, SECTION_7_DESTINATIONS, DRAWING_MERGES, relocateSavedAnswers } from "../app/design-checklist/checklists.ts";

test("workbook sheets are all transcribed with unique item ids", () => {
  assert.deepEqual(CHECKLISTS.map(c => c.key), ["culvert", "drawings", "railway", "culvert-design-review"]);
  const count = key => questionsOf(CHECKLISTS.find(c => c.key === key)).length;
  assert.equal(count("culvert"), 64); // General procedures after moving the 27 section 7 checks
  assert.equal(count("drawings"), 24);
  assert.equal(count("railway"), 12);
  assert.equal(count("culvert-design-review"), 89);
  const ids = CHECKLISTS.flatMap(c => c.sections.flatMap(s => s.rows.map(r => r.id)));
  assert.equal(new Set(ids).size, ids.length);
});

test("General excludes section 7 and each former design check has one destination", () => {
  const general = CHECKLISTS[0];
  const technical = CHECKLISTS.find(c => c.key === "culvert-design-review");
  assert.equal(general.label, "General");
  assert.ok(!general.sections.some(s => s.no === "7" || s.title === "Design"));
  assert.equal(Object.keys(SECTION_7_DESTINATIONS).length, 27);
  for (const [id, destination] of Object.entries(SECTION_7_DESTINATIONS)) {
    const section = technical.sections.find(s => s.title === destination.section);
    assert.ok(section);
    const matches = section.rows.filter(r => destination.target ? r.no === destination.target || r.id === destination.target : r.id === id);
    assert.equal(matches.length, 1, id);
    if (destination.detail) assert.ok(matches[0].procedure.includes(destination.detail));
  }
  const procedures = questionsOf(technical).map(r => r.procedure.toLowerCase());
  assert.equal(new Set(procedures).size, procedures.length);
});

test("summary counts answers, ticks and closures; unanswered items default to Open", () => {
  const c = CHECKLISTS.find(x => x.key === "drawings");
  const [a, b] = questionsOf(c);
  const s = summarise(c, { header: {}, items: { [a.id]: { ...blankItem(), answer: "Yes", checked: true, status: "Closed" }, [b.id]: { ...blankItem(), answer: "No" } } });
  assert.deepEqual(s, { total: 24, answered: 2, checked: 1, closed: 1, no: 1 });
});

test("workbook additions preserve legacy saved-answer IDs", () => {
  const culvert = CHECKLISTS.find(c => c.key === "culvert");
  const rows = culvert.sections.flatMap(s => s.rows);
  assert.equal(rows.find(r => r.id === "culvert-6").procedure, "Are the assets required? Can they be rationalised?");
  assert.equal(rows.find(r => r.id === "culvert-76").item, "Documents in DM");
  assert.equal(rows.filter(r => r.id.includes("oct2026")).length, 10);
  const drawings = CHECKLISTS.find(c => c.key === "drawings");
  assert.equal(questionsOf(drawings).find(r => r.id === "drawings-11").procedure, "Trees TPZ clearly marked?");
  const newList = CHECKLISTS.find(c => c.key === "culvert-design-review");
  assert.deepEqual(summarise(newList, { header: {}, items: {} }), { total: 89, answered: 0, checked: 0, closed: 0, no: 0 });
});

test("drawing review and report consistency move to their owners without duplicates", () => {
  const general = CHECKLISTS.find(c => c.key === "culvert");
  const drawings = CHECKLISTS.find(c => c.key === "drawings");
  const technical = CHECKLISTS.find(c => c.key === "culvert-design-review");
  assert.ok(!technical.sections.some(s => s.no === "9" || s.no === "10"));
  for (let n = 71; n <= 85; n++) {
    const id = `culvert-design-review-${n}`;
    const rows = questionsOf(drawings);
    assert.equal(rows.filter(r => r.id === (DRAWING_MERGES[id] ?? id)).length, 1);
    if (DRAWING_MERGES[id]) assert.ok(!rows.some(r => r.id === id));
  }
  const reporting = general.sections.find(s => s.title === "Reporting");
  for (let n = 86; n <= 93; n++) assert.equal(reporting.rows.filter(r => r.id === `culvert-design-review-${n}`).length, 1);
  for (const checklist of CHECKLISTS) {
    const procedures = questionsOf(checklist).map(r => r.procedure.toLowerCase());
    assert.equal(new Set(procedures).size, procedures.length);
  }
});

test("unchanged moved answers follow their question without overwriting destination or mixing projects", () => {
  const answer = { ...blankItem(), answer: "Yes", reviewer: "Checked Rev B", status: "Closed" };
  const source = { header: { project: "A", job: "1" }, items: { "culvert-design-review-71": answer, "culvert-design-review-86": answer } };
  const moved = relocateSavedAnswers({ "culvert-design-review": source });
  assert.deepEqual(moved.drawings.items["culvert-design-review-71"], answer);
  assert.deepEqual(moved.culvert.items["culvert-design-review-86"], answer);
  assert.deepEqual(moved.drawings.header, source.header);
  const different = { header: { project: "B", job: "2" }, items: {} };
  assert.deepEqual(relocateSavedAnswers({ "culvert-design-review": source, drawings: different }).drawings, different);
  const existing = { header: { project: "A" }, items: { "culvert-design-review-71": blankItem() } };
  assert.deepEqual(relocateSavedAnswers({ "culvert-design-review": source, drawings: existing }).drawings.items, existing.items);
  assert.deepEqual(source.items["culvert-design-review-71"], answer);
});
