import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Transpile the app modules directly, as in slab-workbook.test.mjs, so extensionless imports resolve.
function load(path, modules = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: name => modules[name] ?? {}, Math, Number, Object, Array, Infinity, NaN });
  return exports;
}
const traffic = load("../app/bank-seat-traffic.ts");
const { AS5100_FACTORS, DEFAULT_CASES, brakingForce, designLanes, exampleSeatReactions, laneFactorSum, maxAxleLoadOnSpan, permanentSeatReaction, pileResistance, contact, actions } =
  load("../app/bridge-calcs.ts", { "./bank-seat-traffic": traffic });
const { blindingSlab } = load("../app/blinding-slab-calcs.ts");

const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test("AS 5100.2 default factors", () => {
  assert.deepEqual([AS5100_FACTORS.deadUls, AS5100_FACTORS.deadUlsRelieving, AS5100_FACTORS.sdlUls, AS5100_FACTORS.sdlSls, AS5100_FACTORS.trafficUls, AS5100_FACTORS.earthUls], [1.2, 0.85, 2, 1.3, 1.8, 1.5]);
  const stability = DEFAULT_CASES.filter(c => c.name.startsWith("ULS") && c.name !== "ULS max bearing");
  assert.ok(stability.every(c => c.factors.g === 0.85 && c.factors.concrete === 0.85 && c.factors.sdl === 0.7));
});

test("design lanes and lane factors", () => {
  assert.equal(designLanes(4.2), 1); assert.equal(designLanes(6.4), 2); assert.equal(designLanes(3.1), 0);
  near(laneFactorSum(1), 1); near(laneFactorSum(2), 1.8); near(laneFactorSum(4), 2.6);
});

test("seat dead load is half beam mass times g", () => {
  near(permanentSeatReaction(4, 12.24, 0, 0, 0), 4 * 12.24 * 9.81 / 2);
});

test("braking force limits and multi-lane case", () => {
  assert.equal(maxAxleLoadOnSpan(2.5), 360);
  const short = brakingForce(5, 1); near(short.singleLoad, 360 + 30); near(short.single, 200); // 0.45 x 390 = 175.5, raised to the 200 kN minimum
  assert.equal(brakingForce(3, 1).design, 200);
  assert.equal(brakingForce(100, 1).design, 720);
  const two = brakingForce(40, 2); near(two.multi, 0.15 * (1440 + 240) * 1.8);
  assert.equal(brakingForce(0, 1), null);
});

test("example seat reactions feed the abutment defaults", () => {
  const e = exampleSeatReactions();
  near(e.permanent, 240.1488); assert.equal(e.lanes, 1); assert.ok(e.traffic > 0);
});

test("pile resistance", () => {
  const p = pileResistance(0.3, 9, 200, 20, 0.5);
  near(p.compression, 0.5 * (200 * Math.PI * 0.0225 + 20 * Math.PI * 0.3 * 9));
  near(p.uplift, 0.5 * 20 * Math.PI * 0.3 * 9);
});

test("spread footing contact", () => {
  const a = actions([{ vertical: 100, horizontal: 0, arm: 0.5, height: 0 }]);
  const c = contact(a.normal, a.moment, 1, 1); near(c.toe, 100); near(c.heel, 100);
  const edge = contact(100, 100 * 0.25, 1, 1); assert.equal(edge.middleThird, false); near(edge.toe, 2 * 100 / 0.75);
});

test("blinding slab matches workbook A2914643 with closed-form solver", () => {
  const r = blindingSlab(0.63, 5.7, 215, 110, 2.45);
  near(r.requiredArea, 7.018772727, 1e-6);
  near(r.slabWidth * r.slabLength, r.requiredArea, 1e-9);
  assert.equal(r.thickness, 251); assert.equal(r.stripThickness, 301);
});
