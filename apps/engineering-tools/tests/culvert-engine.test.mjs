import assert from "node:assert/strict";
import test from "node:test";
import {
  autoSizeCulvert,
  calculateCulvert,
  calculateInletControl,
  calculateOutletControl,
  manningDischarge,
  sectionProperties,
  solveCriticalDepth,
  solveNaturalChannelDepth,
  solveNormalDepth,
  solveRectangularChannelDepth,
  solveTrapezoidalChannelDepth,
  traceCulvertProfile,
  traceStandardStepProfile,
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

test("auto-sizes a circular diameter to hit a target headwater level", () => {
  const sized = autoSizeCulvert(circular, "diameter", 101.5); // 1.5 m depth above the 100 m invert
  assert.equal(sized.converged, true);
  assert.ok(Math.abs(sized.result.governingHeadwaterDepth - 1.5) < 0.2);
  assert.equal(Number.isFinite(sized.solvedSize) && sized.solvedSize > 0, true);
});

test("auto-sizes a rectangular height with the width held fixed", () => {
  const rectangular = { ...circular, shape: "rectangular", diameter: undefined, width: 1.5, height: 1.2, entranceType: "rectancon1" };
  const sized = autoSizeCulvert(rectangular, "height", 101.5);
  assert.equal(sized.converged, true);
  assert.ok(Math.abs(sized.result.governingHeadwaterDepth - 1.5) < 0.2);
});

test("auto-sizes a square side (width and height solved together)", () => {
  const rectangular = { ...circular, shape: "rectangular", diameter: undefined, width: 1.5, height: 1.2, entranceType: "rectancon1" };
  const sized = autoSizeCulvert(rectangular, "side", 101.5);
  assert.equal(sized.converged, true);
  assert.equal(sized.result.fullFlowVelocity > 0, true);
});

test("a larger target headwater allows a smaller solved diameter", () => {
  const tight = autoSizeCulvert(circular, "diameter", 100.8);
  const loose = autoSizeCulvert(circular, "diameter", 101.8);
  assert.ok(tight.converged && loose.converged);
  assert.ok(loose.solvedSize < tight.solvedSize);
});

test("reports non-convergence when the target headwater is unreachable", () => {
  // Tailwater alone (0.5 m) plus losses puts a floor under the achievable
  // outlet-control headwater; a 0.05 m target can never be met.
  const sized = autoSizeCulvert(circular, "diameter", 100.05);
  assert.equal(sized.converged, false);
});

test("a standard-step profile started at normal depth stays at normal depth (uniform flow)", () => {
  const mild = { ...circular, slope: 0.003 };
  const yn = solveNormalDepth(mild);
  const yc = solveCriticalDepth(mild);
  assert.ok(yn > yc, "fixture must be on a mild slope for this check");

  const profile = traceStandardStepProfile(mild, yn, "upstream", "subcritical");
  const maxDeviation = Math.max(...profile.stations.map((s) => Math.abs(s.depth - yn)));
  assert.ok(maxDeviation < 1e-6);
});

test("a supercritical profile accelerates downstream from near-critical depth", () => {
  const steep = { ...circular, slope: 0.08, tailwaterDepth: 0.2 };
  const profile = traceStandardStepProfile(steep, solveCriticalDepth(steep), "downstream", "supercritical");
  const first = profile.stations[0];
  const last = profile.stations[profile.stations.length - 1];
  assert.ok(first.froudeNumber > 0.9 && first.froudeNumber < 1.1, "should start near critical (Fr ~ 1)");
  assert.ok(last.froudeNumber > first.froudeNumber, "supercritical flow should accelerate downstream");
  assert.ok(last.depth < first.depth, "depth should decrease as velocity increases downstream");
});

test("traceCulvertProfile finds a hydraulic jump on a steep, outlet-controlled barrel", () => {
  const steepOutletControlled = { ...circular, slope: 0.01, tailwaterDepth: 0.5 };
  const calc = calculateCulvert(steepOutletControlled);
  assert.equal(calc.governingControl, "outlet");
  const profile = traceCulvertProfile(steepOutletControlled);
  assert.equal(profile.slopeRegime, "steep");
  assert.equal(profile.profiles.length, 2);
  assert.ok(profile.hydraulicJump !== null);
  assert.ok(profile.hydraulicJump.downstreamDepth > profile.hydraulicJump.upstreamDepth);
  assert.ok(profile.hydraulicJump.length > 0);
  assert.ok(profile.hydraulicJump.station >= 0 && profile.hydraulicJump.station <= steepOutletControlled.length);
});

test("traceCulvertProfile traces only the supercritical branch under pure inlet control", () => {
  const inletControlled = { ...circular, slope: 0.08, tailwaterDepth: 0.2 };
  const calc = calculateCulvert(inletControlled);
  assert.equal(calc.governingControl, "inlet");
  const profile = traceCulvertProfile(inletControlled);
  assert.equal(profile.profiles.length, 1);
  assert.equal(profile.profiles[0].regime, "supercritical");
  assert.equal(profile.hydraulicJump, null);
});

test("traceCulvertProfile reports a note instead of a profile when the outlet is submerged", () => {
  const submergedOutlet = { ...circular, tailwaterDepth: 1.3 };
  const calc = calculateCulvert(submergedOutlet);
  assert.equal(calc.governingControl, "outlet");
  const profile = traceCulvertProfile(submergedOutlet);
  assert.ok(profile.note.length > 0);
});

test("solves a rectangular channel's normal depth so it round-trips through Manning's equation", () => {
  const channel = { base: 2, manningN: 0.03, slope: 0.005 };
  const depth = solveRectangularChannelDepth(3, channel);
  const area = channel.base * depth;
  const perimeter = channel.base + 2 * depth;
  const capacity = area * (area / perimeter) ** (2 / 3) * Math.sqrt(channel.slope) / channel.manningN;
  assert.ok(Math.abs(capacity - 3) < 1e-6);
});

test("solves a trapezoidal channel's normal depth so it round-trips through Manning's equation", () => {
  const channel = { base: 2, sideSlope: 2, manningN: 0.03, slope: 0.005 };
  const depth = solveTrapezoidalChannelDepth(3, channel);
  const area = depth * (channel.base + channel.sideSlope * depth);
  const perimeter = channel.base + 2 * depth * Math.sqrt(1 + channel.sideSlope ** 2);
  const capacity = area * (area / perimeter) ** (2 / 3) * Math.sqrt(channel.slope) / channel.manningN;
  assert.ok(Math.abs(capacity - 3) < 1e-6);
});

test("a natural channel cross-section shaped like a trapezoid matches the closed-form trapezoidal solver", () => {
  // Bed from station -1 to 1 (base = 2); banks rising from elevation 0 to 2
  // over a horizontal run of 4 (side slope = run/rise = 2) on each side.
  const natural = solveNaturalChannelDepth(3, {
    points: [
      { station: -5, elevation: 2 },
      { station: -1, elevation: 0 },
      { station: 1, elevation: 0 },
      { station: 5, elevation: 2 },
    ],
    manningN: 0.03,
    slope: 0.005,
  });
  const trapezoidal = solveTrapezoidalChannelDepth(3, { base: 2, sideSlope: 2, manningN: 0.03, slope: 0.005 });
  assert.ok(Math.abs(natural - trapezoidal) < 1e-6);
});

test("channel solvers reject invalid geometry and unsorted natural-channel points still work", () => {
  assert.throws(() => solveRectangularChannelDepth(3, { base: 0, manningN: 0.03, slope: 0.005 }), /base/);
  assert.throws(
    () => solveTrapezoidalChannelDepth(3, { base: 2, sideSlope: -1, manningN: 0.03, slope: 0.005 }),
    /side slope/,
  );
  assert.throws(
    () => solveNaturalChannelDepth(3, { points: [{ station: 0, elevation: 0 }], manningN: 0.03, slope: 0.005 }),
    /at least two points/,
  );
  // Points supplied out of station order should sort internally and give the same answer.
  const forward = solveNaturalChannelDepth(3, {
    points: [
      { station: -5, elevation: 2 }, { station: -1, elevation: 0 },
      { station: 1, elevation: 0 }, { station: 5, elevation: 2 },
    ],
    manningN: 0.03, slope: 0.005,
  });
  const shuffled = solveNaturalChannelDepth(3, {
    points: [
      { station: 5, elevation: 2 }, { station: -5, elevation: 2 },
      { station: 1, elevation: 0 }, { station: -1, elevation: 0 },
    ],
    manningN: 0.03, slope: 0.005,
  });
  assert.ok(Math.abs(forward - shuffled) < 1e-9);
});

test("a discharge exceeding the natural channel's surveyed capacity is capped at the bank crest", () => {
  const channel = {
    points: [
      { station: -5, elevation: 2 }, { station: -1, elevation: 0 },
      { station: 1, elevation: 0 }, { station: 5, elevation: 2 },
    ],
    manningN: 0.03, slope: 0.005,
  };
  const depth = solveNaturalChannelDepth(1e6, channel);
  assert.ok(Math.abs(depth - 2) < 1e-9);
});
