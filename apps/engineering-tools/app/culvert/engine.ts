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

/** Station count for the backwater march run internally by calculateOutletControl (cheaper than the 60-station display trace). */
const OUTLET_CONTROL_MARCH_STATIONS = 40;

/**
 * Outlet control, ported from modoutlet.bas. Three cases, matching the
 * legacy dispatch in calculohw1outlet:
 *  - Tailwater alone submerges the outlet, or the barrel's own full-flow
 *    capacity can't convey the discharge at all (so no open-channel
 *    equilibrium depth exists below the crown, even where mild-slope
 *    normal depth would clamp to the rise): the whole barrel is pressurized
 *    from the outlet, so the full-pipe energy equation applies directly
 *    (modperfiloutlet6.bas calculoconductolleno).
 *  - Mild slope (yn > yc): the legacy traces the actual M-curve backwater
 *    profile from the outlet to the inlet (modperfiloutlet1.bas and
 *    similar). This is reproduced here using the same standard-step engine
 *    as the water-surface profile feature — if the barrel fills before
 *    reaching the inlet, the remaining reach is continued as pressurized
 *    (constant-velocity) pipe flow rather than open channel.
 *  - Steep slope: a hydraulic jump may form inside the barrel, which this
 *    port does not resolve exactly (see traceCulvertProfile's docs). Falls
 *    back to the FHWA simplified energy approximation, matching phase 2.
 */
export function calculateOutletControl(input: CulvertInput): OutletControlResult {
  const height = culvertHeight(input);
  const dischargePerBarrel = input.discharge / input.barrels;
  const fullProperties = sectionProperties(input, height);
  const fullFlowVelocity = dischargePerBarrel / Math.max(fullProperties.area, EPSILON);
  const fullFrictionSlope = fullProperties.area > 0 && fullProperties.hydraulicRadius > 0
    ? (dischargePerBarrel * input.roughness / (fullProperties.area * fullProperties.hydraulicRadius ** (2 / 3))) ** 2
    : 0;
  const criticalDepth = solveCriticalDepth(input);
  const normalDepth = solveNormalDepth(input);
  const inletLevel = input.inletInvertLevel ?? 0;
  const invertDrop = input.slope * input.length;
  const controllingTailwaterDepth = Math.max(input.tailwaterDepth, (criticalDepth + height) / 2);
  const fullFlowCapacity = manningDischarge(input, height);

  // Case 1: tailwater alone submerges the outlet, or the barrel can't convey
  // the discharge at all (no open-channel equilibrium exists below the
  // crown, so an open-channel march would produce a physically meaningless
  // result — see calculateOutletControl's doc comment).
  const outletSubmerged = input.tailwaterDepth >= height;
  const capacityExceeded = input.discharge > fullFlowCapacity;
  if (outletSubmerged || capacityExceeded) {
    const baseDepth = outletSubmerged ? input.tailwaterDepth : controllingTailwaterDepth;
    const velocityHead = fullFlowVelocity ** 2 / (2 * GRAVITY);
    const frictionLoss = fullFrictionSlope * input.length;
    const minorLoss = (input.entranceLossCoefficient + input.outletLossCoefficient) * velocityHead;
    const headwaterDepth = baseDepth + frictionLoss + minorLoss - invertDrop;
    return {
      controllingTailwaterDepth: baseDepth,
      frictionLoss,
      minorLoss,
      headwaterDepth,
      headwaterLevel: inletLevel + headwaterDepth,
      belowValidityThreshold: false,
    };
  }

  // Case 2: mild slope — trace the actual backwater profile.
  if (normalDepth > criticalDepth) {
    const profile = traceStandardStepProfile(
      input, controllingTailwaterDepth, "upstream", "subcritical", OUTLET_CONTROL_MARCH_STATIONS,
    );
    // traceStandardStepProfile appends a synthetic domain-boundary station
    // for display purposes when it hits a branch limit — use the actual
    // last numerically-solved station instead.
    const last = realStations(profile)[realStations(profile).length - 1];
    const finalVelocity = profile.reachedFull ? fullFlowVelocity : last.velocity;
    const entranceLossTerm = (1 + input.entranceLossCoefficient) * finalVelocity ** 2 / (2 * GRAVITY);

    const headwaterDepth = profile.reachedFull
      // Barrel fills before the inlet: continue as pressurized pipe flow for the remaining reach.
      ? height + last.x * (fullFrictionSlope - input.slope) + entranceLossTerm
      : last.depth + entranceLossTerm;

    const minorLoss = input.entranceLossCoefficient * finalVelocity ** 2 / (2 * GRAVITY);
    const frictionLoss = headwaterDepth - controllingTailwaterDepth - minorLoss + invertDrop;

    return {
      controllingTailwaterDepth,
      frictionLoss,
      minorLoss,
      headwaterDepth,
      headwaterLevel: inletLevel + headwaterDepth,
      belowValidityThreshold: false,
    };
  }

  // Case 3: steep slope — simplified FHWA approximation (see doc comment above).
  const velocityHead = fullFlowVelocity ** 2 / (2 * GRAVITY);
  const frictionLoss = fullFrictionSlope * input.length;
  const minorLoss = (input.entranceLossCoefficient + input.outletLossCoefficient) * velocityHead;
  const headwaterDepth = controllingTailwaterDepth + frictionLoss + minorLoss - invertDrop;

  return {
    controllingTailwaterDepth,
    frictionLoss,
    minorLoss,
    headwaterDepth,
    headwaterLevel: inletLevel + headwaterDepth,
    belowValidityThreshold: headwaterDepth < height * 0.75,
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
    warnings.push("This barrel is on a steep slope with a low outlet-control headwater; a hydraulic jump may form inside the barrel, which this simplified outlet-control energy approximation does not resolve exactly. Check the water-surface profile for a jump.");
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

export function inputAtSize(input: CulvertInput, parameter: AutoSizeParameter, size: number): CulvertInput {
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

// ---------------------------------------------------------------------------
// Water-surface profile (standard-step method) and hydraulic jump location.
//
// Ported from the numerical core of modmetodoestandar.bas: an energy-balance
// station-by-station march along the barrel, solving at each station for the
// depth that balances H(y) + (Δx/2)Sf(y) against the previous station's
// H − (Δx/2)Sf. The legacy app additionally has 17 profile-family modules
// (modperfilinlet1-10.bas, modperfiloutlet1-7.bas) that each hardcode which
// boundary depth, marching direction and jump-search heuristic to use for a
// specific combination of slope/depth relationships, then splice segments
// together. That case-by-case dispatch is NOT reproduced here — instead this
// traces from whichever boundary the already-computed governing control
// implies (outlet control ⇒ march upstream from the outlet depth; inlet
// control, or a steep barrel, ⇒ march downstream from a near-critical inlet
// depth), and locates a jump via the same conjugate-depth crossing concept
// the legacy code uses. The traced curve is physically correct; the specific
// legacy "profile family" labelling and jump-search tolerances are not
// reproduced bit-for-bit.
// ---------------------------------------------------------------------------

export type ProfileDirection = "downstream" | "upstream";
export type FlowRegime = "subcritical" | "supercritical";
export type SlopeRegime = "mild" | "steep" | "critical";

export interface ProfileStation {
  x: number;
  depth: number;
  bedElevation: number;
  waterSurfaceElevation: number;
  velocity: number;
  froudeNumber: number;
}

export interface WaterSurfaceProfile {
  direction: ProfileDirection;
  regime: FlowRegime;
  stations: ProfileStation[];
  reachedFull: boolean;
  /**
   * True when marching stopped because the depth asymptotically approached
   * critical depth (a real GVF limit, not a numerical failure) before
   * reaching the domain boundary. When true (or reachedFull is true), the
   * last station in `stations` is a synthetic extension to the domain
   * boundary for display purposes, not a numerically-solved point — see
   * `realStations()`.
   */
  reachedCritical: boolean;
}

/** The numerically-solved stations, excluding any synthetic boundary-extension point. */
function realStations(profile: WaterSurfaceProfile): ProfileStation[] {
  return (profile.reachedFull || profile.reachedCritical) ? profile.stations.slice(0, -1) : profile.stations;
}

export interface HydraulicJump {
  station: number;
  upstreamDepth: number;
  downstreamDepth: number;
  length: number;
}

export interface CulvertProfileResult {
  slopeRegime: SlopeRegime;
  normalDepth: number;
  criticalDepth: number;
  profiles: WaterSurfaceProfile[];
  hydraulicJump: HydraulicJump | null;
  note: string;
}

const PROFILE_STATION_COUNT = 60;
/** Fraction of the way to the branch boundary (critical depth or barrel rise) treated as "reached". */
const PROFILE_BRANCH_MARGIN = 0.9995;

function froudeNumberAt(input: CulvertInput, depth: number, dischargePerBarrel: number): number {
  const properties = sectionProperties(input, depth);
  if (properties.area <= 0) return 0;
  const velocity = dischargePerBarrel / properties.area;
  const hydraulicDepth = properties.topWidth > 0 ? properties.area / properties.topWidth : depth;
  return velocity / Math.sqrt(GRAVITY * Math.max(hydraulicDepth, EPSILON));
}

function stationAt(input: CulvertInput, x: number, depth: number, dischargePerBarrel: number): ProfileStation {
  const properties = sectionProperties(input, depth);
  const bedElevation = (input.inletInvertLevel ?? 0) - input.slope * x;
  return {
    x,
    depth,
    bedElevation,
    waterSurfaceElevation: bedElevation + depth,
    velocity: dischargePerBarrel / Math.max(properties.area, EPSILON),
    froudeNumber: froudeNumberAt(input, depth, dischargePerBarrel),
  };
}

/**
 * Marches the standard-step energy balance from `startDepth` at one end of
 * the barrel toward the other, staying within the subcritical (y > yc) or
 * supercritical (y < yc) branch implied by `regime`.
 */
export function traceStandardStepProfile(
  input: CulvertInput,
  startDepth: number,
  direction: ProfileDirection,
  regime: FlowRegime,
  stationCount: number = PROFILE_STATION_COUNT,
): WaterSurfaceProfile {
  const height = culvertHeight(input);
  const length = input.length;
  const inletLevel = input.inletInvertLevel ?? 0;
  const dischargePerBarrel = input.discharge / input.barrels;
  const criticalDepth = solveCriticalDepth(input);
  const stepSize = length / stationCount;
  const signedStep = direction === "downstream" ? stepSize : -stepSize;

  const branchLower = regime === "supercritical" ? EPSILON : criticalDepth * (2 - PROFILE_BRANCH_MARGIN);
  const branchUpper = regime === "supercritical" ? criticalDepth * PROFILE_BRANCH_MARGIN : height * PROFILE_BRANCH_MARGIN;

  const energyAt = (x: number, depth: number) => {
    const properties = sectionProperties(input, depth);
    const velocity = dischargePerBarrel / Math.max(properties.area, EPSILON);
    return (inletLevel - input.slope * x) + depth + velocity ** 2 / (2 * GRAVITY);
  };
  const frictionSlopeAt = (depth: number) => {
    const properties = sectionProperties(input, depth);
    if (properties.area <= 0 || properties.hydraulicRadius <= 0) return 0;
    return (dischargePerBarrel * input.roughness / (properties.area * properties.hydraulicRadius ** (2 / 3))) ** 2;
  };

  let x = direction === "downstream" ? 0 : length;
  let depth = Math.min(Math.max(startDepth, branchLower), branchUpper);
  const stations: ProfileStation[] = [stationAt(input, x, depth, dischargePerBarrel)];
  let reachedFull = false;
  let reachedCritical = false;
  const domainEnd = direction === "downstream" ? length : 0;

  for (let index = 1; index <= stationCount; index += 1) {
    const previousX = x;
    const previousDepth = depth;
    const nextX = direction === "downstream" ? previousX + stepSize : previousX - stepSize;
    if (nextX < -EPSILON || nextX > length + EPSILON) break;

    const previousEnergy = energyAt(previousX, previousDepth);
    const previousFrictionSlope = frictionSlopeAt(previousDepth);
    const residual = (depthGuess: number) =>
      energyAt(nextX, depthGuess) +
      (signedStep / 2) * frictionSlopeAt(depthGuess) +
      (signedStep / 2) * previousFrictionSlope -
      previousEnergy;

    const residualLower = residual(branchLower);
    const residualUpper = residual(branchUpper);
    if (!Number.isFinite(residualLower) || !Number.isFinite(residualUpper)) break;

    if (Math.sign(residualLower) === Math.sign(residualUpper) && residualLower !== 0) {
      // residual(y) increases monotonically with y on this branch (specific
      // energy dominates), so no bracket here means the true depth lies
      // outside [branchLower, branchUpper] — not that bisect() should fall
      // back to an arbitrary endpoint. Handle both directions and both
      // regimes explicitly instead of freezing the curve at whatever depth
      // this station reached (which previously made hydraulic-jump
      // detection compare against a stale value for the rest of the
      // barrel). The synthetic boundary station appended here is for
      // display purposes only — see realStations().
      if (residualLower < 0) {
        // Needs more depth than branchUpper allows.
        if (regime === "subcritical") {
          // Wants to exceed the crown: continue as pressurized pipe flow.
          stations.push(stationAt(input, domainEnd, height, dischargePerBarrel));
          reachedFull = true;
        } else {
          // Supercritical branch is capped at critical depth: the curve is
          // decelerating toward critical depth from below.
          stations.push(stationAt(input, domainEnd, criticalDepth, dischargePerBarrel));
          reachedCritical = true;
        }
      } else if (regime === "subcritical") {
        // Needs less depth than branchLower (critical depth) allows: the
        // curve has asymptotically approached critical depth from above
        // (true GVF behavior — it never actually reaches yc in finite
        // distance).
        stations.push(stationAt(input, domainEnd, criticalDepth, dischargePerBarrel));
        reachedCritical = true;
      }
      // A supercritical branch wanting less than branchLower (~0) is a
      // degenerate/dry case with no sensible extension — just stop.
      break;
    }

    const nextDepth = bisect(residual, branchLower, branchUpper);
    x = nextX;
    depth = nextDepth;
    stations.push(stationAt(input, x, depth, dischargePerBarrel));

    if (regime === "subcritical" && depth >= branchUpper) {
      reachedFull = true;
      break;
    }
  }

  return { direction, regime, stations, reachedFull, reachedCritical };
}

/**
 * Interpolates depth at `x` from a station list. In `strict` mode, `x`
 * outside the list's actual range returns NaN instead of clamping to the
 * nearest endpoint — used for hydraulic-jump detection, where comparing
 * against a clamped/extrapolated value (rather than genuine computed data)
 * previously produced false-positive jump locations right at a synthetic
 * boundary station.
 */
function depthAtStation(stations: ProfileStation[], x: number, strict = false): number {
  if (stations.length === 0) return NaN;
  // Stations run in x-ascending or x-descending order depending on direction; normalize to ascending.
  const ascending = stations[0].x <= stations[stations.length - 1].x;
  const ordered = ascending ? stations : [...stations].reverse();
  if (x <= ordered[0].x) return strict && x < ordered[0].x - EPSILON ? NaN : ordered[0].depth;
  if (x >= ordered[ordered.length - 1].x) {
    return strict && x > ordered[ordered.length - 1].x + EPSILON ? NaN : ordered[ordered.length - 1].depth;
  }
  for (let i = 1; i < ordered.length; i += 1) {
    if (x <= ordered[i].x) {
      const a = ordered[i - 1];
      const b = ordered[i];
      const t = (x - a.x) / Math.max(b.x - a.x, EPSILON);
      return a.depth + t * (b.depth - a.depth);
    }
  }
  return ordered[ordered.length - 1].depth;
}

/** USBR hydraulic-jump length approximation, ported from modinlet.bas / modoutlet.bas calculoresalto. */
function jumpLength(upstreamDepth: number, upstreamFroude: number): number {
  return upstreamDepth * 220 * Math.tanh((upstreamFroude - 1) / 22);
}

function findHydraulicJump(
  supercritical: WaterSurfaceProfile,
  subcritical: WaterSurfaceProfile,
): HydraulicJump | null {
  // Only compare real, numerically-solved stations — synthetic boundary-extension
  // points (added when a march asymptotically approaches yc or fills to the crown
  // without bracketing) don't represent genuine computed depths, and comparing
  // against one previously produced false jump crossings right at that boundary.
  const stations = [...realStations(supercritical)].sort((a, b) => a.x - b.x);
  const subcriticalReal = realStations(subcritical);
  for (const station of stations) {
    const conjugateDepth = station.depth * (0.5 * (Math.sqrt(1 + 8 * station.froudeNumber ** 2) - 1));
    const subcriticalDepth = depthAtStation(subcriticalReal, station.x, true);
    if (!Number.isFinite(subcriticalDepth)) continue;
    if (conjugateDepth >= subcriticalDepth) {
      return {
        station: station.x,
        upstreamDepth: station.depth,
        downstreamDepth: conjugateDepth,
        length: jumpLength(station.depth, station.froudeNumber),
      };
    }
  }
  return null;
}

export function traceCulvertProfile(input: CulvertInput): CulvertProfileResult {
  validateInput(input);
  const height = culvertHeight(input);
  const normalDepth = solveNormalDepth(input);
  const criticalDepth = solveCriticalDepth(input);
  const calculation = calculateCulvert(input);

  const slopeRegime: SlopeRegime =
    Math.abs(normalDepth - criticalDepth) < 0.01 * Math.max(criticalDepth, EPSILON)
      ? "critical"
      : normalDepth > criticalDepth ? "mild" : "steep";

  const profiles: WaterSurfaceProfile[] = [];
  let note = "";

  if (calculation.governingControl === "outlet") {
    if (input.tailwaterDepth >= height) {
      note = "The outlet-control depth reaches the culvert rise, so the barrel flows full near the outlet and no partial-flow water-surface profile applies there.";
    } else if (input.discharge > calculation.fullFlowCapacity) {
      note = "Design flow exceeds the barrel's full-flow capacity, so the barrel is effectively pressurized throughout and no partial-flow water-surface profile applies.";
    } else {
      profiles.push(traceStandardStepProfile(
        input, calculation.outletControl.controllingTailwaterDepth, "upstream", "subcritical",
      ));
    }
  }

  if (calculation.governingControl === "inlet" || slopeRegime === "steep") {
    profiles.push(traceStandardStepProfile(input, criticalDepth, "downstream", "supercritical"));
  }

  const supercriticalProfile = profiles.find((profile) => profile.regime === "supercritical");
  const subcriticalProfile = profiles.find((profile) => profile.regime === "subcritical");
  const hydraulicJump = supercriticalProfile && subcriticalProfile
    ? findHydraulicJump(supercriticalProfile, subcriticalProfile)
    : null;

  if (!profiles.length && !note) {
    note = "No partial-flow profile applies to this case.";
  }

  return { slopeRegime, normalDepth, criticalDepth, profiles, hydraulicJump, note };
}

// ---------------------------------------------------------------------------
// Receiving-channel tailwater rating (normal depth of the downstream
// channel), ported from modprecalculos.bas calculoy2()/calculoy2canalnatural.
// Rectangular and trapezoidal channels assume the channel invert coincides
// with the culvert outlet invert, matching the legacy behaviour for those two
// cases. The natural-channel solver here takes cross-section points on the
// same absolute elevation datum as inletInvertLevel (rather than a depth
// relative to a separately-entered channel bottom level, as the legacy form
// requires) and computes wetted area/perimeter by clipping the surveyed
// polyline at a trial water elevation — mathematically the same rating-curve
// concept as the legacy's 50-point discretization, just computed directly
// from the polyline instead of pre-binning into fixed depth increments.
// ---------------------------------------------------------------------------

export interface RectangularChannel {
  base: number;
  manningN: number;
  slope: number;
}

export interface TrapezoidalChannel {
  base: number;
  sideSlope: number;
  manningN: number;
  slope: number;
}

export interface NaturalChannelPoint {
  station: number;
  elevation: number;
}

export interface NaturalChannel {
  points: NaturalChannelPoint[];
  manningN: number;
  slope: number;
}

function solveChannelNormalDepth(
  dischargeTarget: number,
  areaAndPerimeterAt: (depth: number) => { area: number; perimeter: number },
  manningN: number,
  channelSlope: number,
): number {
  const capacity = (depth: number) => {
    const { area, perimeter } = areaAndPerimeterAt(depth);
    if (area <= 0 || perimeter <= 0) return 0;
    return area * (area / perimeter) ** (2 / 3) * Math.sqrt(channelSlope) / manningN;
  };
  let upper = 1;
  while (capacity(upper) < dischargeTarget && upper < 1e6) upper *= 2;
  return bisect((depth) => capacity(depth) - dischargeTarget, upper * 1e-9, upper);
}

export function solveRectangularChannelDepth(discharge: number, channel: RectangularChannel): number {
  assertPositive("Discharge", discharge);
  assertPositive("Channel base", channel.base);
  assertPositive("Channel Manning n", channel.manningN);
  assertPositive("Channel slope", channel.slope);
  return solveChannelNormalDepth(
    discharge,
    (depth) => ({ area: channel.base * depth, perimeter: channel.base + 2 * depth }),
    channel.manningN,
    channel.slope,
  );
}

export function solveTrapezoidalChannelDepth(discharge: number, channel: TrapezoidalChannel): number {
  assertPositive("Discharge", discharge);
  assertPositive("Channel base", channel.base);
  assertPositive("Channel Manning n", channel.manningN);
  assertPositive("Channel slope", channel.slope);
  if (!Number.isFinite(channel.sideSlope) || channel.sideSlope < 0) {
    throw new Error("Channel side slope cannot be negative.");
  }
  return solveChannelNormalDepth(
    discharge,
    (depth) => ({
      area: depth * (channel.base + channel.sideSlope * depth),
      perimeter: channel.base + 2 * depth * Math.sqrt(1 + channel.sideSlope ** 2),
    }),
    channel.manningN,
    channel.slope,
  );
}

function naturalChannelSectionProperties(
  sortedPoints: NaturalChannelPoint[],
  waterElevation: number,
): { area: number; perimeter: number } {
  let area = 0;
  let perimeter = 0;
  for (let index = 0; index < sortedPoints.length - 1; index += 1) {
    const p1 = sortedPoints[index];
    const p2 = sortedPoints[index + 1];
    if (p1.elevation >= waterElevation && p2.elevation >= waterElevation) continue;

    let x1 = p1.station;
    let z1 = p1.elevation;
    let x2 = p2.station;
    let z2 = p2.elevation;
    if (z1 > waterElevation) {
      const t = (waterElevation - z2) / (z1 - z2);
      x1 = p2.station + t * (p1.station - p2.station);
      z1 = waterElevation;
    }
    if (z2 > waterElevation) {
      const t = (waterElevation - z1) / (z2 - z1);
      x2 = p1.station + t * (p2.station - p1.station);
      z2 = waterElevation;
    }
    area += 0.5 * (waterElevation - z1 + (waterElevation - z2)) * Math.abs(x2 - x1);
    perimeter += Math.hypot(x2 - x1, z2 - z1);
  }
  return { area, perimeter };
}

export function solveNaturalChannelDepth(discharge: number, channel: NaturalChannel): number {
  assertPositive("Discharge", discharge);
  assertPositive("Channel Manning n", channel.manningN);
  assertPositive("Channel slope", channel.slope);
  if (channel.points.length < 2) {
    throw new Error("A natural channel cross-section needs at least two points.");
  }
  const sorted = [...channel.points].sort((a, b) => a.station - b.station);
  const thalweg = Math.min(...sorted.map((point) => point.elevation));
  const crest = Math.max(...sorted.map((point) => point.elevation));
  if (crest <= thalweg) {
    throw new Error("The natural channel cross-section must include a bank above the lowest point.");
  }

  const capacity = (elevation: number) => {
    const { area, perimeter } = naturalChannelSectionProperties(sorted, elevation);
    if (area <= 0 || perimeter <= 0) return 0;
    return area * (area / perimeter) ** (2 / 3) * Math.sqrt(channel.slope) / channel.manningN;
  };

  if (discharge >= capacity(crest)) return crest - thalweg;
  const solvedElevation = bisect(
    (elevation) => capacity(elevation) - discharge,
    thalweg + (crest - thalweg) * 1e-6,
    crest - (crest - thalweg) * 1e-9,
  );
  return solvedElevation - thalweg;
}

// ---------------------------------------------------------------------------
// Hydrograph batch processing, ported from modanalisis.bas analisishidrograma.
// The legacy app doesn't do anything hydraulically different for a
// hydrograph — it re-runs the same single-discharge analysis once per row
// and stores each row's results for later stepping through the results
// screen. There is no new physics here, just running calculateCulvert once
// per {time, discharge} row and identifying the peak.
// ---------------------------------------------------------------------------

export interface HydrographRow {
  time: number;
  discharge: number;
}

export interface HydrographRowResult {
  time: number;
  discharge: number;
  result: CulvertResult | null;
  error: string;
}

export interface CulvertHydrographResult {
  rows: HydrographRowResult[];
  peakIndex: number | null;
}

export function runCulvertHydrograph(baseInput: CulvertInput, rows: HydrographRow[]): CulvertHydrographResult {
  if (rows.length === 0) {
    throw new Error("The hydrograph needs at least one row.");
  }

  const results: HydrographRowResult[] = rows.map((row) => {
    try {
      return {
        time: row.time,
        discharge: row.discharge,
        result: calculateCulvert({ ...baseInput, discharge: row.discharge }),
        error: "",
      };
    } catch (error) {
      return {
        time: row.time,
        discharge: row.discharge,
        result: null,
        error: error instanceof Error ? error.message : "Calculation failed.",
      };
    }
  });

  let peakIndex: number | null = null;
  results.forEach((row, index) => {
    if (!row.result) return;
    const currentPeak = peakIndex !== null ? results[peakIndex].result : null;
    if (!currentPeak || row.result.governingHeadwaterDepth > currentPeak.governingHeadwaterDepth) {
      peakIndex = index;
    }
  });

  return { rows: results, peakIndex };
}

