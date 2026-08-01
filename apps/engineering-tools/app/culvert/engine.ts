export type EntranceCategory = "box" | "concretePipe" | "metalPipe";

export interface EntranceOption {
  id: string;
  category: EntranceCategory;
  label: string;
  k: number;
  m: number;
  c: number;
  y: number;
  ke: number;
}

// FHWA HDS-5 inlet-control coefficients (K, M, c, Y) and entrance-loss
// coefficients (ke), as tabulated in the legacy Hidroalcun application.
export const ENTRANCE_OPTIONS: EntranceOption[] = [
  { id: "rectancon1", category: "box", label: "Headwall 90°, three square edges", k: 0.495, m: 0.667, c: 0.0314, y: 0.82, ke: 0.5 },
  { id: "rectancon2", category: "box", label: "Headwall 90°, three rounded or bevel edges", k: 0.495, m: 0.667, c: 0.0314, y: 0.82, ke: 0.2 },
  { id: "rectancon3", category: "box", label: "Wing wall (30°-75°), square edge in the crown", k: 0.026, m: 1, c: 0.347, y: 0.81, ke: 0.4 },
  { id: "rectancon4", category: "box", label: "Wing wall (30°-75°), rounded or bevel edge in the crown", k: 0.497, m: 0.667, c: 0.0302, y: 0.835, ke: 0.2 },
  { id: "rectancon5", category: "box", label: "Wing wall (10°-25°), square edge in the crown", k: 0.486, m: 0.667, c: 0.0249, y: 0.83, ke: 0.5 },
  { id: "rectancon6", category: "box", label: "Wing wall parallel with square edge in the crown", k: 0.061, m: 0.75, c: 0.0423, y: 0.82, ke: 0.7 },
  { id: "rectancon7", category: "box", label: "Side or slope tapered", k: 0.475, m: 0.667, c: 0.0179, y: 0.97, ke: 0.2 },

  { id: "circon1", category: "concretePipe", label: "Projecting end, groove edge", k: 0.0045, m: 2, c: 0.0317, y: 0.69, ke: 0.2 },
  { id: "circon2", category: "concretePipe", label: "Projecting end, square edge", k: 0.0045, m: 2, c: 0.0317, y: 0.69, ke: 0.5 },
  { id: "circon3", category: "concretePipe", label: "Headwall or headwall and wing wall, groove edges", k: 0.0018, m: 2, c: 0.0292, y: 0.74, ke: 0.2 },
  { id: "circon4", category: "concretePipe", label: "Headwall or headwall and wing wall, square edges", k: 0.0098, m: 2, c: 0.0398, y: 0.67, ke: 0.5 },
  { id: "circon5", category: "concretePipe", label: "Rounded edges, r=D/12", k: 0.0018, m: 2.5, c: 0.03, y: 0.74, ke: 0.2 },
  { id: "circon6", category: "concretePipe", label: "Mitered to slope", k: 0.021, m: 1.33, c: 0.0463, y: 0.75, ke: 0.7 },
  { id: "circon7", category: "concretePipe", label: "Prefabricated mitered to slope", k: 0.021, m: 1.33, c: 0.0463, y: 0.75, ke: 0.5 },
  { id: "circon8", category: "concretePipe", label: "Bevel 33.7° or 45°", k: 0.0018, m: 2.5, c: 0.03, y: 0.74, ke: 0.2 },
  { id: "circon9", category: "concretePipe", label: "Side or slope tapered", k: 0.519, m: 0.64, c: 0.021, y: 0.9, ke: 0.2 },

  { id: "circumetal1", category: "metalPipe", label: "Projecting end", k: 0.034, m: 1.5, c: 0.0553, y: 0.54, ke: 0.9 },
  { id: "circumetal2", category: "metalPipe", label: "Headwall or headwall and wing wall, square edges", k: 0.0083, m: 2, c: 0.0379, y: 0.69, ke: 0.5 },
  { id: "circumetal3", category: "metalPipe", label: "Mitered to slope, coated or not coated", k: 0.021, m: 1.33, c: 0.0463, y: 0.75, ke: 0.7 },
  { id: "circumetal4", category: "metalPipe", label: "Prefabricated mitered to slope", k: 0.021, m: 1.33, c: 0.0463, y: 0.75, ke: 0.5 },
  { id: "circumetal5", category: "metalPipe", label: "Bevel edges 33.7° or 45°", k: 0.0018, m: 2.5, c: 0.03, y: 0.74, ke: 0.2 },
  { id: "circumetal6", category: "metalPipe", label: "Side or slope tapered", k: 0.519, m: 0.64, c: 0.021, y: 0.9, ke: 0.2 },
];

export const ENTRANCE_CATEGORY_LABELS: Record<EntranceCategory, string> = {
  box: "Concrete box entrances",
  concretePipe: "Concrete pipe entrances",
  metalPipe: "Corrugated metal pipe entrances",
};

export function findEntranceOption(id: string): EntranceOption | undefined {
  return ENTRANCE_OPTIONS.find((option) => option.id === id);
}

export type CulvertShape = "circular" | "rectangular";
export type InletEquationForm = "empirical" | "mathematical";
export type InletFlowCondition = "unsubmerged" | "transition" | "submerged";
export type HydraulicControl = "inlet" | "outlet";

export interface CustomEntranceCoefficients {
  k: number;
  m: number;
  c: number;
  y: number;
}

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
  /** Entrance option id from entrances.ts, or "custom" to use customEntranceCoefficients. */
  entranceType: string;
  customEntranceCoefficients?: CustomEntranceCoefficients;
  /** FHWA HDS-5 unsubmerged form. Legacy default is "empirical" (Form 2). */
  inletEquationForm: InletEquationForm;
}

export interface SectionProperties {
  area: number;
  wettedPerimeter: number;
  hydraulicRadius: number;
  topWidth: number;
  depth: number;
}

export interface InletControlResult {
  condition: InletFlowCondition;
  headwaterDepth: number;
  headwaterLevel: number;
}

export interface OutletControlResult {
  controllingTailwaterDepth: number;
  frictionLoss: number;
  minorLoss: number;
  headwaterDepth: number;
  headwaterLevel: number;
  belowValidityThreshold: boolean;
}

export interface CulvertResult {
  fullFlowCapacity: number;
  fullFlowVelocity: number;
  normalDepth: number;
  criticalDepth: number;
  upstreamVelocity: number;
  froudeNumber: number;
  capacityUtilisation: number;
  flowCondition: "open-channel" | "full-flow" | "capacity-exceeded";
  inletControl: InletControlResult;
  outletControl: OutletControlResult;
  governingControl: HydraulicControl;
  governingHeadwaterDepth: number;
  governingHeadwaterLevel: number;
  warnings: string[];
}

const GRAVITY = 9.80665;
const EPSILON = 1e-10;
// FHWA HDS-5 SI unit conversion constant for Ku*Q/(A*D^0.5) in the inlet-control equations.
const KU = 1.811;

function assertPositive(name: string, value: number | undefined): asserts value is number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
}

function resolveEntranceCoefficients(input: CulvertInput): CustomEntranceCoefficients {
  if (input.entranceType === "custom") {
    const custom = input.customEntranceCoefficients;
    if (!custom) throw new Error("Custom entrance coefficients (K, M, c, Y) are required.");
    assertPositive("Entrance coefficient K", custom.k);
    assertPositive("Entrance coefficient M", custom.m);
    assertPositive("Entrance coefficient c", custom.c);
    assertPositive("Entrance coefficient Y", custom.y);
    return custom;
  }
  const option = findEntranceOption(input.entranceType);
  if (!option) throw new Error(`Unknown entrance type "${input.entranceType}".`);
  return option;
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

  resolveEntranceCoefficients(input);
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

/** Critical-depth velocity head (hc = yc + vc^2/2g), used by the FHWA HDS-5 unsubmerged form. */
function criticalEnergyHead(input: CulvertInput): number {
  const yc = solveCriticalDepth(input);
  const properties = sectionProperties(input, yc);
  const vc = (input.discharge / input.barrels) / Math.max(properties.area, EPSILON);
  return yc + vc ** 2 / (2 * GRAVITY);
}

function unsubmergedHeadwaterRatio(
  form: InletEquationForm,
  coefficients: CustomEntranceCoefficients,
  slope: number,
  flowTerm: number,
  hcOverD: number,
): number {
  const powerTerm = coefficients.k * flowTerm ** coefficients.m;
  return form === "mathematical"
    ? hcOverD + powerTerm - 0.5 * slope
    : powerTerm;
}

function submergedHeadwaterRatio(
  coefficients: CustomEntranceCoefficients,
  slope: number,
  flowTerm: number,
): number {
  return coefficients.c * flowTerm ** 2 - 0.5 * slope + coefficients.y;
}

export function inletFlowCondition(ratio: number): InletFlowCondition {
  if (ratio < 1.93) return "unsubmerged";
  if (ratio > 2.21) return "submerged";
  return "transition";
}

/** FHWA HDS-5 inlet-control headwater, ported from modinlet.bas. */
export function calculateInletControl(input: CulvertInput): InletControlResult {
  const height = culvertHeight(input);
  const dischargePerBarrel = input.discharge / input.barrels;
  const fullArea = sectionProperties(input, height).area;
  const coefficients = resolveEntranceCoefficients(input);
  const inletLevel = input.inletInvertLevel ?? 0;

  const denominator = fullArea * Math.sqrt(height);
  const ratio = dischargePerBarrel / Math.max(denominator, EPSILON);
  const condition = inletFlowCondition(ratio);
  const hcOverD = criticalEnergyHead(input) / height;

  const flowTerm = (q: number) => (KU * q) / Math.max(denominator, EPSILON);

  let headwaterDepth: number;
  if (condition === "unsubmerged") {
    headwaterDepth = height * unsubmergedHeadwaterRatio(
      input.inletEquationForm, coefficients, input.slope, flowTerm(dischargePerBarrel), hcOverD,
    );
  } else if (condition === "submerged") {
    headwaterDepth = height * submergedHeadwaterRatio(
      coefficients, input.slope, flowTerm(dischargePerBarrel),
    );
  } else {
    const qLower = 1.93 * denominator;
    const qUpper = 2.21 * denominator;
    const ratioLower = unsubmergedHeadwaterRatio(
      input.inletEquationForm, coefficients, input.slope, flowTerm(qLower), hcOverD,
    );
    const ratioUpper = submergedHeadwaterRatio(coefficients, input.slope, flowTerm(qUpper));
    const hwLower = height * ratioLower;
    const hwUpper = height * ratioUpper;
    const slope = (hwUpper - hwLower) / Math.max(qUpper - qLower, EPSILON);
    headwaterDepth = hwLower + slope * (dischargePerBarrel - qLower);
  }

  return {
    condition,
    headwaterDepth,
    headwaterLevel: inletLevel + headwaterDepth,
  };
}

/** FHWA outlet-control energy equation, ported from modoutlet.bas / y1simplificado + calculoconductolleno. */
export function calculateOutletControl(input: CulvertInput): OutletControlResult {
  const height = culvertHeight(input);
  const dischargePerBarrel = input.discharge / input.barrels;
  const fullProperties = sectionProperties(input, height);
  const fullFlowVelocity = dischargePerBarrel / Math.max(fullProperties.area, EPSILON);
  const criticalDepth = solveCriticalDepth(input);
  const inletLevel = input.inletInvertLevel ?? 0;
  const invertDrop = input.slope * input.length;

  const controllingTailwaterDepth = Math.max(input.tailwaterDepth, (criticalDepth + height) / 2);
  const velocityHead = fullFlowVelocity ** 2 / (2 * GRAVITY);
  const frictionLoss = (input.roughness ** 2 * input.length * fullFlowVelocity ** 2) /
    Math.max(fullProperties.hydraulicRadius ** (4 / 3), EPSILON);
  const minorLoss = (input.entranceLossCoefficient + input.outletLossCoefficient) * velocityHead;

  const headwaterDepth = controllingTailwaterDepth + frictionLoss + minorLoss - invertDrop;
  const barrelFlowingFull = input.tailwaterDepth >= height || solveNormalDepth(input) >= height * 0.999;

  return {
    controllingTailwaterDepth,
    frictionLoss,
    minorLoss,
    headwaterDepth,
    headwaterLevel: inletLevel + headwaterDepth,
    belowValidityThreshold: !barrelFlowingFull && headwaterDepth < height * 0.75,
  };
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

  const inletControl = calculateInletControl(input);
  const outletControl = calculateOutletControl(input);
  const governingControl: HydraulicControl =
    inletControl.headwaterDepth >= outletControl.headwaterDepth ? "inlet" : "outlet";
  const governingHeadwaterDepth = Math.max(inletControl.headwaterDepth, outletControl.headwaterDepth);
  const governingHeadwaterLevel = (input.inletInvertLevel ?? 0) + governingHeadwaterDepth;

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
  if (governingHeadwaterDepth > height * 1.2) {
    warnings.push("Governing headwater exceeds 1.2 times the culvert rise.");
  }
  if (upstreamVelocity > 3) {
    warnings.push("Velocity exceeds 3 m/s; review erosion protection and outlet energy dissipation.");
  }
  if (input.tailwaterDepth > height) {
    warnings.push("Tailwater submerges the culvert outlet.");
  }
  if (outletControl.belowValidityThreshold) {
    warnings.push("Outlet-control headwater is below 0.75x the culvert rise; the simplified outlet-control method may be inaccurate here and a full backwater profile would be needed for a precise result.");
  }

  return {
    fullFlowCapacity,
    fullFlowVelocity,
    normalDepth,
    criticalDepth,
    upstreamVelocity,
    froudeNumber,
    capacityUtilisation,
    flowCondition: capacityUtilisation > 1
      ? "capacity-exceeded"
      : normalDepth >= height * 0.999
        ? "full-flow"
        : "open-channel",
    inletControl,
    outletControl,
    governingControl,
    governingHeadwaterDepth,
    governingHeadwaterLevel,
    warnings,
  };
}

/**
 * "diameter" solves a circular culvert's diameter; "height"/"width" solve one
 * rectangular dimension while holding the other fixed; "side" solves a square
 * culvert (width = height) as a single unknown. Ported from moddiseño.bas,
 * which bisects the culvert size until the governing headwater matches a
 * target design water level.
 */
export type AutoSizeParameter = "diameter" | "height" | "width" | "side";

export interface AutoSizeResult {
  parameter: AutoSizeParameter;
  solvedSize: number;
  converged: boolean;
  result: CulvertResult;
}

const AUTO_SIZE_BOUNDS: Record<AutoSizeParameter, { lower: number; upper: number }> = {
  diameter: { lower: 0.1, upper: 50 },
  height: { lower: 0.1, upper: 25 },
  width: { lower: 0.1, upper: 25 },
  side: { lower: 0.1, upper: 25 },
};

/** Legacy convergence tolerance: |target - achieved headwater| < 0.2 m. */
const AUTO_SIZE_TOLERANCE = 0.2;

function inputAtSize(input: CulvertInput, parameter: AutoSizeParameter, size: number): CulvertInput {
  if (parameter === "diameter") return { ...input, shape: "circular", diameter: size };
  if (parameter === "side") return { ...input, shape: "rectangular", width: size, height: size };
  if (parameter === "height") return { ...input, shape: "rectangular", height: size };
  return { ...input, shape: "rectangular", width: size };
}

export function autoSizeCulvert(
  input: CulvertInput,
  parameter: AutoSizeParameter,
  targetHeadwaterLevel: number,
): AutoSizeResult {
  if (!Number.isFinite(targetHeadwaterLevel)) {
    throw new Error("Target headwater level must be a finite number.");
  }
  const inletLevel = input.inletInvertLevel ?? 0;
  const targetDepth = targetHeadwaterLevel - inletLevel;
  const { lower, upper } = AUTO_SIZE_BOUNDS[parameter];

  const headwaterDepthAt = (size: number) =>
    calculateCulvert(inputAtSize(input, parameter, size)).governingHeadwaterDepth;
  const objective = (size: number) => targetDepth - headwaterDepthAt(size);

  // Governing headwater is not monotonic in size (it falls as the barrel
  // gains capacity, then rises again once outlet control's (yc+D)/2 term
  // dominates at very large sizes). Scan upward from the lower bound and
  // bisect within the first bracket where the objective changes sign, so
  // the result is the smallest adequate size rather than an arbitrary root.
  const sampleCount = 400;
  let bracket: [number, number] | null = null;
  let previousSize = lower;
  let previousValue = objective(lower);
  let bestSize = lower;
  let bestAbsValue = Math.abs(previousValue);

  for (let index = 1; index <= sampleCount; index += 1) {
    const size = lower + (upper - lower) * (index / sampleCount);
    const value = objective(size);
    if (Number.isFinite(value) && Math.abs(value) < bestAbsValue) {
      bestAbsValue = Math.abs(value);
      bestSize = size;
    }
    if (
      Number.isFinite(previousValue) && Number.isFinite(value) &&
      Math.sign(previousValue) !== Math.sign(value)
    ) {
      bracket = [previousSize, size];
      break;
    }
    previousSize = size;
    previousValue = value;
  }

  const solvedSize = bracket ? bisect(objective, bracket[0], bracket[1]) : bestSize;
  const result = calculateCulvert(inputAtSize(input, parameter, solvedSize));
  const converged = Math.abs(targetDepth - result.governingHeadwaterDepth) < AUTO_SIZE_TOLERANCE;

  return { parameter, solvedSize, converged, result };
}

