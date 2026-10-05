import assert from "node:assert/strict";
import test from "node:test";
import { CHECKLISTS, blankItem, questionsOf, summarise } from "../app/design-checklist/checklists.ts";

test("workbook sheets are all transcribed with unique item ids", () => {
  assert.deepEqual(CHECKLISTS.map(c => c.key), ["culvert", "drawings", "railway", "culvert-design-review"]);
  const count = key => questionsOf(CHECKLISTS.find(c => c.key === key)).length;
  assert.equal(count("culvert"), 83); // Original 73 checks plus 10 workbook additions
  assert.equal(count("drawings"), 12);
  assert.equal(count("railway"), 12);
  assert.equal(count("culvert-design-review"), 101);
  const ids = CHECKLISTS.flatMap(c => c.sections.flatMap(s => s.rows.map(r => r.id)));
  assert.equal(new Set(ids).size, ids.length);
});

test("culvert numbering keeps workbook order and fixes stored-number artefacts", () => {
  const nos = questionsOf(CHECKLISTS[0]).map(r => r.no).filter(Boolean);
  assert.ok(nos.includes("7.24") && nos.includes("7.30"));
  assert.ok(!nos.includes("78.24"));
  const design = CHECKLISTS[0].sections.find(s => s.title === "Design");
  assert.deepEqual(design.rows.filter(r => r.heading).map(r => r.no), ["7.1", "7.2"]);
});

test("summary counts answers, ticks and closures; unanswered items default to Open", () => {
  const c = CHECKLISTS.find(x => x.key === "drawings");
  const [a, b] = questionsOf(c);
  const s = summarise(c, { header: {}, items: { [a.id]: { ...blankItem(), answer: "Yes", checked: true, status: "Closed" }, [b.id]: { ...blankItem(), answer: "No" } } });
  assert.deepEqual(s, { total: 12, answered: 2, checked: 1, closed: 1, no: 1 });
});

test("workbook additions preserve legacy saved-answer IDs", () => {
  const culvert = CHECKLISTS.find(c => c.key === "culvert");
  const rows = culvert.sections.flatMap(s => s.rows);
  assert.equal(rows.find(r => r.id === "culvert-6").procedure, "Are the assets required? Can they be rationalised?");
  assert.equal(rows.find(r => r.id === "culvert-43").item, "Calculations complete");
  assert.equal(rows.find(r => r.id === "culvert-76").item, "Documents in DM");
  assert.equal(rows.filter(r => r.id.includes("oct2026")).length, 10);
  const drawings = CHECKLISTS.find(c => c.key === "drawings");
  assert.equal(questionsOf(drawings).find(r => r.id === "drawings-11").procedure, "Trees TPZ clearly marked?");
  const newList = CHECKLISTS.find(c => c.key === "culvert-design-review");
  assert.deepEqual(summarise(newList, { header: {}, items: {} }), { total: 101, answered: 0, checked: 0, closed: 0, no: 0 });
});
