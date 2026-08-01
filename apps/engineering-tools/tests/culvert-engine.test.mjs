import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCulvert,
  calculateInletControl,
  calculateOutletControl,
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
  entranceType: "circon4",
  inletEquationForm: "empirical",
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

test("returns finite governing design results", () => {
  const result = calculateCulvert(circular);
  assert.ok(result.fullFlowCapacity > 0);
  assert.equal(Number.isFinite(result.governingHeadwaterDepth), true);
  assert.ok(result.governingHeadwaterLevel > 100);
  assert.equal(
    result.governingHeadwaterDepth,
    Math.max(result.inletControl.headwaterDepth, result.outletControl.headwaterDepth),
  );
  assert.equal(
    result.governingControl,
    result.inletControl.headwaterDepth >= result.outletControl.headwaterDepth ? "inlet" : "outlet",
  );
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
    entranceType: "rectancon1",
  });
  assert.ok(result.fullFlowCapacity > 3);
});

test("rejects invalid inputs", () => {
  assert.throws(
    () => calculateCulvert({ ...circular, roughness: 0 }),
    /Manning roughness/,
  );
});

test("rejects an unknown entrance type", () => {
  assert.throws(
    () => calculateCulvert({ ...circular, entranceType: "does-not-exist" }),
    /Unknown entrance type/,
  );
});

test("rejects custom entrance type without coefficients", () => {
  assert.throws(
    () => calculateCulvert({ ...circular, entranceType: "custom" }),
    /Custom entrance coefficients/,
  );
});

test("matches a hand-calculated FHWA HDS-5 unsubmerged (empirical) inlet-control headwater", () => {
  // circon4: K=0.0098, M=2. at = pi*0.6^2, denom = at*sqrt(1.2).
  // ratio = Q/denom = 2 / 1.238919 = 1.6143 -> unsubmerged.
  // flowTerm = 1.811*2/denom = 2.9237; HW/D = K*flowTerm^M = 0.0098*8.548 = 0.08377.
  const inlet = calculateInletControl(circular);
  assert.equal(inlet.condition, "unsubmerged");
  assert.ok(Math.abs(inlet.headwaterDepth - 0.1005) < 0.002);
});

test("classifies inlet-control flow regime by the Q/(A*sqrt(D)) ratio", () => {
  const unsubmerged = calculateInletControl({ ...circular, discharge: 2 });
  const transition = calculateInletControl({ ...circular, discharge: 2.55 });
  const submerged = calculateInletControl({ ...circular, discharge: 6 });
  assert.equal(unsubmerged.condition, "unsubmerged");
  assert.equal(transition.condition, "transition");
  assert.equal(submerged.condition, "submerged");
});

test("the mathematical inlet-control form differs from the empirical form", () => {
  const empirical = calculateInletControl({ ...circular, inletEquationForm: "empirical" });
  const mathematical = calculateInletControl({ ...circular, inletEquationForm: "mathematical" });
  assert.notEqual(empirical.headwaterDepth, mathematical.headwaterDepth);
});

test("accepts custom entrance coefficients", () => {
  const inlet = calculateInletControl({
    ...circular,
    entranceType: "custom",
    customEntranceCoefficients: { k: 0.0098, m: 2, c: 0.0398, y: 0.67 },
  });
  const reference = calculateInletControl(circular); // circon4 has the same coefficients
  assert.ok(Math.abs(inlet.headwaterDepth - reference.headwaterDepth) < 1e-9);
});

test("outlet-control headwater subtracts exactly the invert drop (slope * length)", () => {
  const flat = calculateOutletControl({ ...circular, slope: 0 });
  const sloped = calculateOutletControl({ ...circular, slope: 0.01, length: 30 });
  assert.ok(Math.abs((flat.headwaterDepth - sloped.headwaterDepth) - 0.3) < 1e-9);
});

test("outlet-control uses the average of tailwater and (critical depth + rise)/2", () => {
  const outlet = calculateOutletControl(circular);
  const yc = solveCriticalDepth(circular);
  assert.ok(Math.abs(outlet.controllingTailwaterDepth - Math.max(0.5, (yc + 1.2) / 2)) < 1e-9);
});
