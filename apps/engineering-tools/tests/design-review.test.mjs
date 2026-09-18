import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
import { addCheck, createReview, inView, mergeReview, recordEntry, setClosed, updateMetadata, validateReview } from "../app/design-review/engine.ts";
import { CULVERT_CHECKS, initialMetadata } from "../app/design-review/templates.ts";

const reviewer = { name: "Maria", role: "Reviewer" };
const designer = { name: "Designer A", role: "Designer" };
const evidence = { reference: "Drawing 01 Rev C, detail 2" };
function fixture() {
  return createReview({ ...initialMetadata(true, "Maria"), designer: "Designer A" }, reviewer, CULVERT_CHECKS.slice(0, 1));
}
function move(r, actor, status, text = "Recorded evidence and decision") {
  return recordEntry(r, r.items[0].id, actor, status, text, evidence);
}
test("full two-round review, verification, closure and reopening preserves every entry", () => {
  const original = fixture();
  let r = move(original, reviewer, "Action required", "Confirm geometry.");
  const first = JSON.stringify(r.items[0].history[0]);
  r = move(r, designer, "Designer responded", "Drawing updated.");
  r = move(r, reviewer, "Reviewer verification", "Checking revised geometry.");
  r = move(r, reviewer, "Action required", "Please reconcile remaining dimension.");
  r = move(r, designer, "Designer responded", "Remaining dimension corrected.");
  r = move(r, reviewer, "Reviewer verification", "Revised drawing checked.");
  r = move(r, reviewer, "Closed", "Verified and closed.");
  assert.equal(r.items[0].history.length, 7);
  assert.equal(r.items[0].history[6].round, 2);
  assert.equal(JSON.stringify(r.items[0].history[0]), first);
  assert.equal(original.items[0].history.length, 0);
  r = setClosed(r, reviewer, true, "All checks completed.");
  assert.equal(inView(r, "Closed Reviews", "Maria"), true);
  assert.throws(() => move(r, reviewer, "Action required"), /Reopen/);
  assert.throws(() => updateMetadata(r, reviewer, r.metadata), /Reopen/);
  r = setClosed(r, reviewer, false, "New revision issued.");
  r = move(r, reviewer, "Action required");
  assert.equal(r.items[0].history[7].round, 3);
  assert.equal(validateReview(JSON.parse(JSON.stringify(r))).closed, false);
});
test("designer cannot approve; issued comments cannot bypass verification", () => {
  const r = fixture();
  assert.throws(() => move(r, designer, "Compliant"), /transition/);
  assert.throws(() => setClosed(r, reviewer, true, "done"), /Resolve/);
  assert.throws(() => setClosed(r, designer, true, "done"), /Only/);
  const issued = move(r, reviewer, "Comment");
  assert.throws(() => move(issued, reviewer, "Compliant"), /transition/);
  assert.throws(() => move(issued, reviewer, "Not applicable"), /transition/);
  assert.throws(() => move(issued, reviewer, "Closed"), /transition/);
  const responded = move(issued, designer, "Designer responded");
  assert.throws(() => move(responded, reviewer, "Closed"), /transition/);
  assert.throws(() => recordEntry(r, r.items[0].id, reviewer, "Compliant", "OK", { reference: "" }), /reference/);
  assert.throws(() => recordEntry(r, r.items[0].id, reviewer, "Comment", "  ", evidence), /reason/);
});
test("unraised checks can be compliant or not applicable with an explicit reason", () => {
  let r = move(fixture(), reviewer, "Not applicable", "No services at this location, survey verified.");
  r = setClosed(r, reviewer, true, "All checks resolved.");
  assert.equal(r.closed, true);
  assert.throws(() => setClosed(createReview(initialMetadata(true, "Maria"), reviewer), reviewer, true, "done"), /Resolve/);
});
test("handoff accepts extensions and rejects stale, divergent and rewritten histories", () => {
  const r = fixture();
  const issued = move(r, reviewer, "Action required");
  const responded = move(issued, designer, "Designer responded");
  assert.deepEqual(mergeReview(issued, responded), responded);
  assert.deepEqual(mergeReview(responded, responded), responded);
  assert.throws(() => mergeReview(responded, issued), /older/);
  assert.throws(() => mergeReview(issued, move(r, reviewer, "Comment")), /competing/);
  const tampered = structuredClone(responded); tampered.items[0].history[0].text = "Overwritten";
  assert.throws(() => mergeReview(issued, tampered), /competing/);
  const badStatus = structuredClone(responded); badStatus.items[0].status = "Closed";
  assert.throws(() => validateReview(badStatus), /Status/);
  const badRound = structuredClone(responded); badRound.items[0].history[1].round = 99;
  assert.throws(() => validateReview(badRound), /round/);
  assert.throws(() => validateReview({}), /incomplete/);
});
test("dashboard queues respond to assignment and workflow state", () => {
  const r = fixture();
  assert.equal(inView(r, "My Reviews", "maria"), true);
  assert.equal(inView(r, "My Reviews", "Another reviewer"), false);
  const issued = move(r, reviewer, "Action required");
  assert.equal(inView(issued, "Awaiting Designer Response", "Designer A"), true);
  assert.equal(inView(issued, "Awaiting My Review", "Maria"), false);
  assert.equal(inView(move(issued, designer, "Designer responded"), "Awaiting My Review", "Maria"), true);
});
test("sample starts entirely unreviewed with provenance and stable unique IDs", () => {
  const r = createReview(initialMetadata(true, "Maria"), reviewer, CULVERT_CHECKS);
  assert.equal(r.items.length, 15);
  assert.ok(r.items.every(c => c.status === "Not reviewed" && c.history.length === 0 && c.source));
  const next = addCheck(r, reviewer, { discipline: "Structures", title: "Custom asset check", source: "Design report", guidance: "Verify" });
  assert.equal(new Set(next.items.map(c => c.id)).size, 16);
  const revised = updateMetadata(next, reviewer, { ...next.metadata, revision: "C" });
  assert.equal(revised.items[0].id, r.items[0].id);
  assert.match(revised.audit.at(-1).detail, /before/);
});
test("Excel and Word exports contain history, provenance and escaped text", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  await mkdir(path.join(root, "build"), { recursive: true });
  const dir = await mkdtemp(path.join(root, "build", "review-export-test-"));
  try {
    for (const name of ["engine", "exports"]) {
      const source = await readFile(path.join(root, "app/design-review", `${name}.ts`), "utf8");
      const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('from "./engine"', 'from "./engine.js"');
      await writeFile(path.join(dir, `${name}.js`), output);
    }
    const { workbook, reportHtml, wordDocument } = await import(pathToFileURL(path.join(dir, "exports.js")));
    const r = move(move(fixture(), reviewer, "Action required", '<script>alert("x")</script> & dimensions'), designer, "Designer responded", "=SUM(A1:A2)");
    const wb = await workbook(r);
    const { default: ExcelJS } = await import("exceljs");
    const loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(await wb.xlsx.writeBuffer());
    assert.equal(loaded.worksheets.length, 4);
    assert.equal(loaded.getWorksheet("All response rounds").rowCount, 3);
    assert.equal(loaded.getWorksheet("All response rounds").getCell("H3").value, "=SUM(A1:A2)");
    assert.match(loaded.getWorksheet("Review register").getCell("G2").value, /original marked-up/);
    const html = reportHtml(r); assert.ok(!html.includes('<script>alert')); assert.match(html, /&lt;script&gt;/);
    const { default: JSZip } = await import("jszip");
    const docx = await wordDocument(r);
    const zip = await JSZip.loadAsync(await docx.arrayBuffer());
    const xml = await zip.file("word/document.xml").async("string");
    assert.match(xml, /Designer responded/); assert.match(xml, /Audit trail/); assert.match(xml, /&lt;script&gt;/);
    assert.ok(zip.file("[Content_Types].xml"));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
