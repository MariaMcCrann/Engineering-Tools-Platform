import assert from "node:assert/strict";
import test from "node:test";
import { CHECKLISTS, blankItem, questionsOf, summarise, SECTION_7_DESTINATIONS } from "../app/design-checklist/checklists.ts";

test("workbook sheets are all transcribed with unique item ids", () => {
  assert.deepEqual(CHECKLISTS.map(c => c.key), ["culvert", "drawings", "railway", "culvert-design-review"]);
  const count = key => questionsOf(CHECKLISTS.find(c => c.key === key)).length;
  assert.equal(count("culvert"), 56); // General procedures after moving the 27 section 7 checks
  assert.equal(count("drawings"), 12);
  assert.equal(count("railway"), 12);
  assert.equal(count("culvert-design-review"), 112);
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
  assert.deepEqual(s, { total: 12, answered: 2, checked: 1, closed: 1, no: 1 });
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
  assert.deepEqual(summarise(newList, { header: {}, items: {} }), { total: 112, answered: 0, checked: 0, closed: 0, no: 0 });
});
