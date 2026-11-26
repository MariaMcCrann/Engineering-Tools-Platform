// Shared AS 5100 calculations for the Bridge Bank Seat and Abutment and Foundations tools.
import { sm1600Reactions } from "./bank-seat-traffic";

export const GRAVITY = 9.81;

// AS 5100.2:2017 default load factors. All values remain editable in the tools.
export const AS5100_FACTORS = {
  // Table 6.2 (cast-in-place / precast concrete): 1.2 where the action reduces safety, 0.85 where it increases safety.
  deadUls: 1.2, deadUlsRelieving: 0.85, deadSls: 1.0,
  // Table 6.3 (bitumen or concrete wearing surface): 2.0 at ULS, 0.7 where relieving, 1.3 at SLS.
  sdlUls: 2.0, sdlUlsRelieving: 0.7, sdlSls: 1.3,
  // Tables 7.10(A) and 7.10(B): SM1600 traffic and braking, 1.8 at ULS and 1.0 at SLS.
  trafficUls: 1.8, trafficSls: 1.0,
  // Clause 13 horizontal earth pressure: 1.5 at ULS, 1.0 at SLS.
  earthUls: 1.5, earthSls: 1.0,
} as const;

export const EXAMPLE_SEAT = {
  span: 12, width: 5.1, beams: 4, beamMass: 12.24, kerbs: 0, kerbMass: 0, other: 0, surfacing: 0, roadWidth: 4.2,
};

export function designLanes(roadWidth: number) {
  // AS 5100.2 Clause 7.5: number of 3.2 m standard design lanes.
  return Number.isFinite(roadWidth) && roadWidth > 0 ? Math.max(0, Math.floor(roadWidth / 3.2 + 1e-9)) : 0;
}

export function laneFactorSum(lanes: number) {
  // AS 5100.2 Clause 7.6 accompanying lane factors: 1.0, 0.8, then 0.4 for each further lane.
  return lanes <= 0 ? 0 : 1 + (lanes >= 2 ? 0.8 : 0) + Math.max(0, lanes - 2) * 0.4;
}

export function permanentSeatReaction(beams: number, beamMass: number, kerbs: number, kerbMass: number, other: number) {
  // One seat of a simply supported span carries half the beam and kerb self weight.
  return (beams * beamMass + kerbs * kerbMass) * GRAVITY / 2 + other;
}

const M1600_OFFSETS = [0, 1.25, 2.5, 6.25, 7.5, 8.75, 15, 16.25, 17.5, 22.5, 23.75, 25];

export function maxAxleLoadOnSpan(span: number, offsets = M1600_OFFSETS, axle = 120) {
  let best = 0;
  for (const start of offsets) best = Math.max(best, offsets.filter(x => x >= start - 1e-9 && x <= start + span + 1e-9).length * axle);
  return best;
}

export function brakingForce(span: number, lanes: number) {
  // AS 5100.2 Clause 7.8.2. Single vehicle: 0.45 W_BS, limited to 200 kN to 720 kN, where W_BS is one lane of
  // M1600 (axles plus 6 kN/m UDL) on the span. Several lanes: 0.15 W_BM over all lanes with lane factors.
  if (!(span > 0) || !(lanes > 0)) return null;
  const singleLoad = maxAxleLoadOnSpan(span) + 6 * span;
  const single = Math.min(720, Math.max(200, 0.45 * singleLoad));
  const multiLoad = singleLoad * laneFactorSum(lanes);
  const multi = lanes > 1 ? 0.15 * multiLoad : 0;
  return { singleLoad, single, multiLoad, multi, design: Math.max(single, multi), governs: multi > single ? "multiple lanes" : "single vehicle" };
}

export function seatTraffic(span: number, lanes: number) {
  if (!(span > 0) || !(lanes > 0)) return { rows: [], governing: undefined };
  const rows = sm1600Reactions(span, lanes);
  const governing = rows.reduce<(typeof rows)[number] | undefined>((max, row) => !max || row.total > max.total ? row : max, undefined);
  return { rows, governing };
}

export function exampleSeatReactions() {
  const e = EXAMPLE_SEAT;
  const lanes = designLanes(e.roadWidth);
  const { rows, governing } = seatTraffic(e.span, lanes);
  return {
    permanent: permanentSeatReaction(e.beams, e.beamMass, e.kerbs, e.kerbMass, e.other),
    superimposed: e.surfacing,
    traffic: governing?.total ?? 0,
    trafficOptions: rows.map(row => ({ name: row.name, value: row.total })),
    span: e.span, lanes,
  };
}

export type Force = { vertical: number; horizontal: number; arm: number; height: number };

export function actions(forces: Force[]) {
  let normal = 0, horizontal = 0, restoring = 0, overturning = 0;
  for (const force of forces) {
    normal += force.vertical;
    horizontal += force.horizontal;
    for (const moment of [force.vertical * force.arm, -force.horizontal * force.height]) {
      restoring += Math.max(moment, 0);
      overturning += Math.max(-moment, 0);
    }
  }
  return { normal, horizontal, restoring, overturning, moment: restoring - overturning };
}

export function contact(normal: number, moment: number, width: number, length: number) {
  if (normal <= 0 || width <= 0 || length <= 0) return null;
  const x = moment / normal;
  if (x <= 0 || x >= width) return null;
  const eccentricity = x - width / 2;
  const middleThird = Math.abs(eccentricity) <= width / 6 + 1e-12;
  const compression = middleThird ? width : 3 * Math.min(x, width - x);
  const average = normal / (length * width);
  const delta = 6 * average * eccentricity / width;
  const peak = 2 * normal / (length * compression);
  return {
    x, eccentricity, compression, middleThird,
    toe: middleThird ? Math.max(0, average - delta) : eccentricity < 0 ? peak : 0,
    heel: middleThird ? Math.max(0, average + delta) : eccentricity > 0 ? peak : 0,
  };
}

export function pileActions(positions: number[], normal: number, moment: number) {
  const centre = positions.reduce((sum, x) => sum + x, 0) / positions.length;
  const squared = positions.reduce((sum, x) => sum + (x - centre) ** 2, 0);
  const residual = moment - normal * centre;
  if (squared === 0 && Math.abs(residual) > 1e-8) return null;
  return positions.map(x => normal / positions.length + (squared ? residual * (x - centre) / squared : 0));
}

export function pileResistance(diameter: number, length: number, endBearing: number, shaft: number, phi: number) {
  // Circular pile: design compression φg (qb Ab + fs As) and design uplift φg fs As, pile self weight ignored.
  if (![diameter, length, endBearing, shaft, phi].every(v => Number.isFinite(v) && v >= 0) || diameter <= 0 || length <= 0) return null;
  const base = Math.PI * diameter ** 2 / 4, shaftArea = Math.PI * diameter * length;
  return { base, shaftArea, compression: phi * (endBearing * base + shaft * shaftArea), uplift: phi * shaft * shaftArea };
}

export type CaseFactors = { g: number; concrete: number; sdl: number; q: number; earth: number; surcharge: number; braking: number };
export type DesignCase = { name: string; limit: "SLS" | "ULS"; note: string; factors: CaseFactors };

const F = AS5100_FACTORS;
export const DEFAULT_CASES: DesignCase[] = [
  { name: "SLS permanent", limit: "SLS", note: "Self weight and earth pressure, no traffic",
    factors: { g: F.deadSls, concrete: F.deadSls, sdl: F.sdlSls, q: 0, earth: F.earthSls, surcharge: 0, braking: 0 } },
  { name: "SLS traffic", limit: "SLS", note: "Deck traffic, approach surcharge and braking at service level",
    factors: { g: F.deadSls, concrete: F.deadSls, sdl: F.sdlSls, q: F.trafficSls, earth: F.earthSls, surcharge: F.trafficSls, braking: F.trafficSls } },
  { name: "ULS max bearing", limit: "ULS", note: "Maximum vertical load: unfavourable dead load factors with deck traffic and braking",
    factors: { g: F.deadUls, concrete: F.deadUls, sdl: F.sdlUls, q: F.trafficUls, earth: F.earthUls, surcharge: 0, braking: F.trafficUls } },
  { name: "ULS approach traffic", limit: "ULS", note: "Stability: relieving dead load with traffic surcharge behind the wall",
    factors: { g: F.deadUlsRelieving, concrete: F.deadUlsRelieving, sdl: F.sdlUlsRelieving, q: 0, earth: F.earthUls, surcharge: F.trafficUls, braking: 0 } },
  { name: "ULS braking", limit: "ULS", note: "Stability: relieving dead load with concurrent deck traffic and braking",
    factors: { g: F.deadUlsRelieving, concrete: F.deadUlsRelieving, sdl: F.sdlUlsRelieving, q: F.trafficUls, earth: F.earthUls, surcharge: 0, braking: F.trafficUls } },
];
