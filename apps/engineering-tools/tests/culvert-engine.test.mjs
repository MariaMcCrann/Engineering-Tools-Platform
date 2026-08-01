import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCulvert,
  manningDischarge,
  sectionProperties,
  solveCriticalDepth,
  solveNormalDepth,
} from "../app/culvert/engine.ts";

const circular = {
  shape: "circular",
  diameter: 1.2,
  barrels: 1,
  length: 30,
  slope: 0.01,
  roughness: 0.013,
  discharge: 2,
  tailwaterDepth: 0.5,
  entranceLossCoefficient: 0.5,
  outletLossCoefficient: 1,
  inletInvertLevel: 100,
};

test("calculates the full circular section", () => {
  const section = sectionProperties(circular, 1.2);
  assert.ok(Math.abs(section.area - Math.PI * 0.6 ** 2) < 1e-10);
  assert.ok(Math.abs(section.hydraulicRadius - 0.3) < 1e-10);
});

test("calculates positive Manning capacity", () => {
  assert.ok(manningDischarge(circular, 1.2) > 0);
});

test("solves normal and critical depths within the culvert", () => {
  assert.ok(solveNormalDepth(circular) > 0);
  assert.ok(solveNormalDepth(circular) <= 1.2);
  assert.ok(solveCriticalDepth(circular) > 0);
  assert.ok(solveCriticalDepth(circular) <= 1.2);
});

test("returns finite design results", () => {
  const result = calculateCulvert(circular);
  assert.ok(result.fullFlowCapacity > 0);
  assert.equal(Number.isFinite(result.outletControlHeadwaterDepth), true);
  assert.ok(result.headwaterLevel > 100);
});

test("supports rectangular culverts and multiple barrels", () => {
  const result = calculateCulvert({
    ...circular,
    shape: "rectangular",
    diameter: undefined,
    width: 1.5,
    height: 1.2,
    barrels: 2,
    discharge: 3,
  });
  assert.ok(result.fullFlowCapacity > 3);
});

test("rejects invalid inputs", () => {
  assert.throws(
    () => calculateCulvert({ ...circular, roughness: 0 }),
    /Manning roughness/,
  );
});
