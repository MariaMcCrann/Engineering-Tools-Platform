export type CulvertShape = "circular" | "rectangular";

export interface CulvertInput {
  shape: CulvertShape;
  diameter?: number;
  width?: number;
  height?: number;
  barrels: number;
  length: number;
  slope: number;
  roughness: number;
  discharge: number;
  tailwaterDepth: number;
  entranceLossCoefficient: number;
  outletLossCoefficient: number;
  inletInvertLevel?: number;
}

export interface SectionProperties {
  area: number;
  wettedPerimeter: number;
  hydraulicRadius: number;
  topWidth: number;
  depth: number;
}

export interface CulvertResult {
  fullFlowCapacity: number;
  fullFlowVelocity: number;
  normalDepth: number;
  criticalDepth: number;
  outletControlHeadwaterDepth: number;
  headwaterLevel: number;
  upstreamVelocity: number;
  froudeNumber: number;
  capacityUtilisation: number;
  flowCondition: "open-channel" | "full-flow" | "capacity-exceeded";
  warnings: string[];
}

const GRAVITY = 9.80665;
const EPSILON = 1e-10;

function assertPositive(name: string, value: number | undefined): asserts value is number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
}

export function validateInput(input: CulvertInput): void {
  assertPositive("Barrels", input.barrels);
  assertPositive("Length", input.length);
  assertPositive("Slope", input.slope);
  assertPositive("Manning roughness", input.roughness);
  assertPositive("Discharge", input.discharge);

  if (!Number.isFinite(input.tailwaterDepth) || input.tailwaterDepth < 0) {
    throw new Error("Tailwater depth cannot be negative.");
  }
  if (!Number.isFinite(input.entranceLossCoefficient) || input.entranceLossCoefficient < 0) {
    throw new Error("Entrance loss coefficient cannot be negative.");
  }
  if (!Number.isFinite(input.outletLossCoefficient) || input.outletLossCoefficient < 0) {
    throw new Error("Outlet loss coefficient cannot be negative.");
  }

  if (input.shape === "circular") {
    assertPositive("Diameter", input.diameter);
  } else {
    assertPositive("Width", input.width);
    assertPositive("Height", input.height);
  }
}

export function culvertHeight(input: CulvertInput): number {
  return input.shape === "circular" ? input.diameter! : input.height!;
}

export function sectionProperties(input: CulvertInput, depth: number): SectionProperties {
  const maximumDepth = culvertHeight(input);
  const y = Math.min(Math.max(depth, 0), maximumDepth);

  if (input.shape === "rectangular") {
    const width = input.width!;
    const area = width * y;
    const wettedPerimeter = y >= maximumDepth - EPSILON
      ? 2 * (width + maximumDepth)
      : width + 2 * y;
    return {
      area,
      wettedPerimeter,
      hydraulicRadius: area / Math.max(wettedPerimeter, EPSILON),
      topWidth: y >= maximumDepth - EPSILON ? 0 : width,
      depth: y,
    };
  }

  const diameter = input.diameter!;
  const radius = diameter / 2;
  if (y <= EPSILON) {
    return { area: 0, wettedPerimeter: 0, hydraulicRadius: 0, topWidth: 0, depth: 0 };
  }
  if (y >= diameter - EPSILON) {
    const area = Math.PI * radius ** 2;
    const wettedPerimeter = Math.PI * diameter;
    return {
      area,
      wettedPerimeter,
      hydraulicRadius: area / wettedPerimeter,
      topWidth: 0,
      depth: diameter,
    };
  }

  const theta = 2 * Math.acos((radius - y) / radius);
  const area = radius ** 2 * (theta - Math.sin(theta)) / 2;
  const wettedPerimeter = radius * theta;
  const topWidth = 2 * Math.sqrt(Math.max(0, 2 * radius * y - y ** 2));
  return {
    area,
    wettedPerimeter,
    hydraulicRadius: area / wettedPerimeter,
    topWidth,
    depth: y,
  };
}

export function manningDischarge(input: CulvertInput, depth: number): number {
  const properties = sectionProperties(input, depth);
  if (properties.area <= 0 || properties.hydraulicRadius <= 0) return 0;
  return input.barrels *
    properties.area *
    properties.hydraulicRadius ** (2 / 3) *
    Math.sqrt(input.slope) /
    input.roughness;
}

function bisect(
  functionValue: (value: number) => number,
  low: number,
  high: number,
  iterations = 100,
): number {
  let lower = low;
  let upper = high;
  let lowerValue = functionValue(lower);
  const upperValue = functionValue(upper);

  if (!Number.isFinite(lowerValue) || !Number.isFinite(upperValue)) {
    throw new Error("The hydraulic solver received a non-finite value.");
  }
  if (lowerValue === 0) return lower;
  if (upperValue === 0) return upper;
  if (Math.sign(lowerValue) === Math.sign(upperValue)) {
    return Math.abs(lowerValue) < Math.abs(upperValue) ? lower : upper;
  }

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    const midpointValue = functionValue(midpoint);
    if (Math.abs(midpointValue) < 1e-10) return midpoint;
    if (Math.sign(midpointValue) === Math.sign(lowerValue)) {
      lower = midpoint;
      lowerValue = midpointValue;
    } else {
      upper = midpoint;
    }
  }
  return (lower + upper) / 2;
}

export function solveNormalDepth(input: CulvertInput): number {
  const maximumDepth = culvertHeight(input);
  const capacity = manningDischarge(input, maximumDepth);
  if (input.discharge >= capacity) return maximumDepth;
  return bisect(
    (depth) => manningDischarge(input, depth) - input.discharge,
    maximumDepth * 1e-8,
    maximumDepth * (1 - 1e-8),
  );
}

export function solveCriticalDepth(input: CulvertInput): number {
  const maximumDepth = culvertHeight(input);
  const dischargePerBarrel = input.discharge / input.barrels;
  const objective = (depth: number) => {
    const properties = sectionProperties(input, depth);
    if (properties.area <= 0 || properties.topWidth <= 0) return Number.POSITIVE_INFINITY;
    return dischargePerBarrel ** 2 * properties.topWidth /
      (GRAVITY * properties.area ** 3) - 1;
  };

  const sampleCount = 300;
  let previousDepth = maximumDepth * 1e-6;
  let previousValue = objective(previousDepth);
  for (let index = 1; index <= sampleCount; index += 1) {
    const depth = maximumDepth * (index / sampleCount) * (1 - 1e-7);
    const value = objective(depth);
    if (Number.isFinite(previousValue) && Number.isFinite(value) &&
        Math.sign(previousValue) !== Math.sign(value)) {
      return bisect(objective, previousDepth, depth);
    }
    previousDepth = depth;
    previousValue = value;
  }
  return Math.min(maximumDepth, solveNormalDepth(input));
}

export function calculateCulvert(input: CulvertInput): CulvertResult {
  validateInput(input);
  const height = culvertHeight(input);
  const fullProperties = sectionProperties(input, height);
  const fullFlowCapacity = manningDischarge(input, height);
  const dischargePerBarrel = input.discharge / input.barrels;
  const fullFlowVelocity = dischargePerBarrel / fullProperties.area;
  const normalDepth = solveNormalDepth(input);
  const criticalDepth = solveCriticalDepth(input);
  const controllingOutletDepth = Math.max(input.tailwaterDepth, criticalDepth);
  const velocityHead = fullFlowVelocity ** 2 / (2 * GRAVITY);
  const frictionLoss = input.length * input.slope *
    (input.discharge / Math.max(fullFlowCapacity, EPSILON)) ** 2;
  const minorLoss = (
    input.entranceLossCoefficient +
    input.outletLossCoefficient
  ) * velocityHead;
  const outletControlHeadwaterDepth = controllingOutletDepth + frictionLoss + minorLoss;
  const headwaterLevel = (input.inletInvertLevel ?? 0) + outletControlHeadwaterDepth;
  const activeDepth = Math.min(normalDepth, height);
  const activeProperties = sectionProperties(input, activeDepth);
  const upstreamVelocity = dischargePerBarrel / Math.max(activeProperties.area, EPSILON);
  const hydraulicDepth = activeProperties.topWidth > 0
    ? activeProperties.area / activeProperties.topWidth
    : height;
  const froudeNumber = upstreamVelocity /
    Math.sqrt(GRAVITY * Math.max(hydraulicDepth, EPSILON));
  const capacityUtilisation = input.discharge / fullFlowCapacity;
  const warnings: string[] = [];

  if (capacityUtilisation > 1) {
    warnings.push("Design flow exceeds the estimated full-flow Manning capacity.");
  } else if (capacityUtilisation > 0.8) {
    warnings.push("Capacity utilisation exceeds 80%; review blockage and freeboard allowances.");
  }
  if (outletControlHeadwaterDepth > height * 1.2) {
    warnings.push("Headwater exceeds 1.2 times the culvert rise.");
  }
  if (upstreamVelocity > 3) {
    warnings.push("Velocity exceeds 3 m/s; review erosion protection and outlet energy dissipation.");
  }
  if (input.tailwaterDepth > height) {
    warnings.push("Tailwater submerges the culvert outlet.");
  }

  return {
    fullFlowCapacity,
    fullFlowVelocity,
    normalDepth,
    criticalDepth,
    outletControlHeadwaterDepth,
    headwaterLevel,
    upstreamVelocity,
    froudeNumber,
    capacityUtilisation,
    flowCondition: capacityUtilisation > 1
      ? "capacity-exceeded"
      : normalDepth >= height * 0.999
        ? "full-flow"
        : "open-channel",
    warnings,
  };
}
