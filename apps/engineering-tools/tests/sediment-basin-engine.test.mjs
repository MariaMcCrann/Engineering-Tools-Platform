import assert from "node:assert/strict";
import test from "node:test";
import { calculateBasinGeometry, storageAtDepth } from "../app/sediment-basin/engine.ts";

const workbookExample = {
  nwlArea: 1500,
  lengthWidthRatio: 1.5,
  permanentPoolDepth: 1.5,
  extendedDetentionDepth: 0.35,
  sideSlope: 6,
  stageIncrement: 0.1,
};

test("matches the source workbook trapezoidal basin geometry", () => {
  const result = calculateBasinGeometry(workbookExample);
  assert.ok(Math.abs(result.nwlLength - 47.4341649025) < 1e-9);
  assert.ok(Math.abs(result.nwlWidth - 31.6227766017) < 1e-9);
  assert.ok(Math.abs(result.bottomLength - 29.4341649025) < 1e-9);
  assert.ok(Math.abs(result.bottomWidth - 13.6227766017) < 1e-9);
  assert.ok(Math.abs(result.bottomArea - 400.9750529242) < 1e-9);
});

test("matches the workbook storage at the cleanout level", () => {
  const result = calculateBasinGeometry(workbookExample);
  assert.ok(Math.abs(storageAtDepth(result.stageRows, 1.0) - 706.8367019495) < 1e-9);
});

test("uses permanent-pool depth, not extended-detention depth, to locate the basin base", () => {
  const baseline = calculateBasinGeometry(workbookExample);
  const changedExtendedDetention = calculateBasinGeometry({ ...workbookExample, extendedDetentionDepth: 0.2 });
  assert.equal(changedExtendedDetention.bottomLength, baseline.bottomLength);
  assert.equal(changedExtendedDetention.bottomWidth, baseline.bottomWidth);
});

test("rejects geometry that cannot fit within the NWL footprint", () => {
  assert.throws(
    () => calculateBasinGeometry({ ...workbookExample, nwlArea: 100 }),
    /too small/,
  );
});
