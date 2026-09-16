"use client";

import { useMemo, useState } from "react";

const g = 9.81;
const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

// FlumeGate dimensional data (Rubicon), mm unless noted. 13 of 99 models in the source workbook were
// missing "Actual Gate Width" (needed for the flow formulas) and are excluded here.
type GateEntry = { model: string; ce: number; do_: number; oe: number; b: number; c: number; e: number; width: number };
const FLUME_GATE_DATA: GateEntry[] = [
  { model: "FGA-2268-1587-01", ce: 1533.3, do_: 1580.8, oe: 230.3, b: 2402, c: 1991, e: 1991, width: 2160 },
  { model: "FGA-1790-1587-01", ce: 1533.3, do_: 1580.8, oe: 230.3, b: 1924, c: 1991, e: 1991, width: 1682 },
  { model: "FGA-1790-1437-01", ce: 1392.6, do_: 1430.2, oe: 230.4, b: 1924, c: 1841, e: 1841, width: 1682 },
  { model: "FGA-1790-1273-01", ce: 1239.5, do_: 1266.4, oe: 220.4, b: 1924, c: 1615, e: 1615, width: 1682 },
  { model: "FGA-1790-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1924, c: 1355, e: 1355, width: 1702 },
  { model: "FGA-1675-1804-01", ce: 1717.8, do_: 1798.6, oe: 230.3, b: 1809, c: 2208, e: 2208, width: 1567 },
  { model: "FGA-1675-1587-01", ce: 1533.3, do_: 1580.8, oe: 230.3, b: 1809, c: 1991, e: 1991, width: 1567 },
  { model: "FGA-1675-1437-01", ce: 1339.6, do_: 1431.1, oe: 220.4, b: 1809, c: 1777, e: 1777, width: 1567 },
  { model: "FGA-1675-1273-01", ce: 1231.5, do_: 1266.4, oe: 212.2, b: 1809, c: 1603, e: 1603, width: 1587 },
  { model: "FGA-1675-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1809, c: 1355, e: 1355, width: 1587 },
  { model: "FGA-1485-1587-01", ce: 1533.3, do_: 1580.8, oe: 230.3, b: 1619, c: 1991, e: 1991, width: 1397 },
  { model: "FGA-1485-1437-01", ce: 1383.7, do_: 1431.3, oe: 210.1, b: 1619, c: 1831, e: 1831, width: 1397 },
  { model: "FGA-1485-1273-01", ce: 1231.5, do_: 1266.4, oe: 212.2, b: 1619, c: 1603, e: 1603, width: 1397 },
  { model: "FGA-1485-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1619, c: 1355, e: 1355, width: 1397 },
  { model: "FGA-1485-620-01", ce: 614.6, do_: 615.6, oe: 160.6, b: 1619, c: 888, e: 888, width: 1397 },
  { model: "FGA-1370-1804-01", ce: 1717.8, do_: 1798.6, oe: 230.3, b: 1504, c: 2208, e: 2208, width: 1262 },
  { model: "FGA-1370-1587-01", ce: 1533.3, do_: 1580.8, oe: 230.3, b: 1504, c: 1991, e: 1991, width: 1262 },
  { model: "FGA-1370-1437-01", ce: 1384.6, do_: 1431.1, oe: 212.1, b: 1504, c: 1767, e: 1767, width: 1282 },
  { model: "FGA-1370-1273-01", ce: 1231.5, do_: 1266.4, oe: 212.2, b: 1504, c: 1603, e: 1603, width: 1282 },
  { model: "FGA-1370-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1504, c: 1355, e: 1355, width: 1282 },
  { model: "FGA-1370-866-01", ce: 879.1, do_: 859.6, oe: 187.3, b: 1504, c: 1145, e: 1145, width: 1282 },
  { model: "FGA-1370-674-01", ce: 713.2, do_: 665.8, oe: 191.2, b: 1504, c: 938, e: 938, width: 1282 },
  { model: "FGA-1180-1587-01", ce: 1525.2, do_: 1580.9, oe: 221.7, b: 1314, c: 1986, e: 1986, width: 1092 },
  { model: "FGA-1180-1437-01", ce: 1384.6, do_: 1431.1, oe: 212.1, b: 1314, c: 1772, e: 1772, width: 1092 },
  { model: "FGA-1180-1273-01", ce: 1232.1, do_: 1268.5, oe: 189.2, b: 1314, c: 1553, e: 1553, width: 1092 },
  { model: "FGA-1180-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1314, c: 1355, e: 1355, width: 1092 },
  { model: "FGA-1180-866-01", ce: 830.4, do_: 859.8, oe: 189.2, b: 1314, c: 1129, e: 1129, width: 1092 },
  { model: "FGA-1050-1587-01", ce: 1525.2, do_: 1580.9, oe: 221.7, b: 1184, c: 1986, e: 1986, width: 962 },
  { model: "FGA-1050-1437-01", ce: 1384.6, do_: 1431.1, oe: 212.1, b: 1184, c: 1787, e: 1787, width: 962 },
  { model: "FGA-1050-1273-01", ce: 1232.1, do_: 1268.5, oe: 189.2, b: 1184, c: 1553, e: 1553, width: 962 },
  { model: "FGA-1050-1077-01", ce: 1028.9, do_: 1071.2, oe: 194.2, b: 1184, c: 1355, e: 1355, width: 962 },
  { model: "FGA-1050-866-01", ce: 830.4, do_: 859.8, oe: 189.2, b: 1184, c: 1129, e: 1129, width: 962 },
  { model: "FGA-760-1273-01", ce: 1232.1, do_: 1268.5, oe: 189.2, b: 894, c: 1553, e: 1553, width: 672 },
  { model: "FGA-760-1077-01", ce: 1036.2, do_: 1072.8, oe: 177.6, b: 894, c: 1375, e: 1375, width: 672 },
  { model: "FGA-760-866-01", ce: 869.5, do_: 861.5, oe: 175.5, b: 894, c: 1149, e: 1149, width: 672 },
  { model: "FGA-760-620-01", ce: 614.6, do_: 615.6, oe: 160.6, b: 894, c: 888, e: 888, width: 672 },
  { model: "FGA-626-1273-01", ce: 1232.1, do_: 1268.5, oe: 189.2, b: 760, c: 1553, e: 1553, width: 538 },
  { model: "FGA-626-1077-01", ce: 1036.2, do_: 1072.8, oe: 177.6, b: 760, c: 1375, e: 1375, width: 577 },
  { model: "FGA-626-866-01", ce: 869.5, do_: 861.5, oe: 175.5, b: 760, c: 1149, e: 1149, width: 577 },
  { model: "FGA-626-674-01", ce: 707, do_: 668.2, oe: 174.6, b: 760, c: 958, e: 958, width: 577 },
  { model: "FGA-626-620-01", ce: 614.6, do_: 615.6, oe: 160.6, b: 760, c: 888, e: 888, width: 577 },
  { model: "FGB-2268-2186", ce: 2200, do_: 2163, oe: 413, b: 2402, c: 2682, e: 2682, width: 2095 },
  { model: "FGB-1790-2186", ce: 2200, do_: 2163, oe: 413, b: 1924, c: 2682, e: 2682, width: 1617 },
  { model: "FGB-1675-2186", ce: 2200, do_: 2163, oe: 413, b: 1809, c: 2682, e: 2682, width: 1502 },
  { model: "FGB-1675-1804", ce: 1720, do_: 1801, oe: 195, b: 1809, c: 2184, e: 2184, width: 1562 },
  { model: "FGB-1485-1804", ce: 1720, do_: 1801, oe: 195, b: 1619, c: 2184, e: 2184, width: 1372 },
  { model: "FGB-1370-1804", ce: 1720, do_: 1801, oe: 195, b: 1504, c: 2184, e: 2184, width: 1257 },
  { model: "FGB-1050-1804", ce: 1720, do_: 1801, oe: 195, b: 1184, c: 2184, e: 2184, width: 937 },
  { model: "FGB-2268-1587", ce: 1535, do_: 1583, oe: 200, b: 2402, c: 1967, e: 1967, width: 2155 },
  { model: "FGB-1790-1587", ce: 1535, do_: 1583, oe: 200, b: 1924, c: 1967, e: 1967, width: 1677 },
  { model: "FGB-1675-1587", ce: 1535, do_: 1583, oe: 200, b: 1809, c: 1967, e: 1967, width: 1562 },
  { model: "FGB-1485-1587", ce: 1535, do_: 1583, oe: 200, b: 1619, c: 1967, e: 1967, width: 1372 },
  { model: "FGB-1370-1587", ce: 1535, do_: 1583, oe: 200, b: 1504, c: 1967, e: 1967, width: 1257 },
  { model: "FGB-1180-1587", ce: 1535, do_: 1583, oe: 200, b: 1314, c: 1967, e: 1967, width: 1067 },
  { model: "FGB-1050-1587", ce: 1535, do_: 1583, oe: 200, b: 1184, c: 1967, e: 1967, width: 937 },
  { model: "FGB-1675-1437", ce: 1385, do_: 1433, oe: 190, b: 1809, c: 1799, e: 1799, width: 1562 },
  { model: "FGB-1485-1437", ce: 1385, do_: 1433, oe: 190, b: 1619, c: 1799, e: 1799, width: 1372 },
  { model: "FGB-1370-1437", ce: 1385, do_: 1433, oe: 190, b: 1504, c: 1799, e: 1799, width: 1277 },
  { model: "FGB-1180-1437", ce: 1385, do_: 1433, oe: 190, b: 1314, c: 1799, e: 1799, width: 1087 },
  { model: "FGB-1050-1437", ce: 1385, do_: 1433, oe: 190, b: 1184, c: 1799, e: 1799, width: 957 },
  { model: "FGB-1675-1273", ce: 1230, do_: 1271, oe: 165, b: 1809, c: 1606, e: 1606, width: 1582 },
  { model: "FGB-1485-1273", ce: 1230, do_: 1271, oe: 165, b: 1619, c: 1606, e: 1606, width: 1392 },
  { model: "FGB-1370-1273", ce: 1230, do_: 1271, oe: 165, b: 1504, c: 1606, e: 1606, width: 1277 },
  { model: "FGB-1180-1273", ce: 1230, do_: 1271, oe: 165, b: 1314, c: 1606, e: 1606, width: 1087 },
  { model: "FGB-1050-1273", ce: 1230, do_: 1271, oe: 165, b: 1184, c: 1606, e: 1606, width: 957 },
  { model: "FGB-760-1273", ce: 1230, do_: 1271, oe: 165, b: 894, c: 1606, e: 1606, width: 667 },
  { model: "FGB-626-1273", ce: 1230, do_: 1271, oe: 165, b: 760, c: 1606, e: 1606, width: 533 },
  { model: "FGB-1790-1077", ce: 1035, do_: 1075, oe: 160, b: 1924, c: 1395, e: 1395, width: 1697 },
  { model: "FGB-1675-1077", ce: 1035, do_: 1075, oe: 160, b: 1809, c: 1395, e: 1395, width: 1582 },
  { model: "FGB-1485-1077", ce: 1035, do_: 1075, oe: 160, b: 1619, c: 1395, e: 1395, width: 1392 },
  { model: "FGB-1370-1077", ce: 1035, do_: 1075, oe: 160, b: 1504, c: 1395, e: 1395, width: 1277 },
  { model: "FGB-1180-1077", ce: 1035, do_: 1075, oe: 160, b: 1314, c: 1395, e: 1395, width: 1087 },
  { model: "FGB-1050-1077", ce: 1035, do_: 1075, oe: 160, b: 1184, c: 1395, e: 1395, width: 957 },
  { model: "FGB-760-1077", ce: 1035, do_: 1075, oe: 160, b: 894, c: 1395, e: 1395, width: 667 },
  { model: "FGB-626-1077", ce: 1035, do_: 1075, oe: 160, b: 760, c: 1395, e: 1395, width: 533 },
  { model: "FGB-1675-866", ce: 880, do_: 865, oe: 135, b: 1809, c: 1153, e: 1153, width: 1582 },
  { model: "FGB-1370-866", ce: 880, do_: 865, oe: 135, b: 1504, c: 1153, e: 1153, width: 1277 },
  { model: "FGB-1180-866", ce: 880, do_: 865, oe: 135, b: 1314, c: 1153, e: 1153, width: 1087 },
  { model: "FGB-1050-866", ce: 880, do_: 865, oe: 135, b: 1184, c: 1153, e: 1153, width: 957 },
  { model: "FGB-760-866", ce: 880, do_: 865, oe: 135, b: 894, c: 1153, e: 1153, width: 707 },
  { model: "FGB-626-866", ce: 880, do_: 865, oe: 135, b: 760, c: 1153, e: 1153, width: 573 },
  { model: "FGB-1675-674", ce: 715, do_: 673, oe: 125, b: 1809, c: 960, e: 960, width: 1582 },
  { model: "FGB-1370-674", ce: 715, do_: 673, oe: 125, b: 1504, c: 960, e: 960, width: 1277 },
  { model: "FGB-1050-674", ce: 715, do_: 673, oe: 125, b: 1184, c: 960, e: 960, width: 997 },
  { model: "FGB-626-674", ce: 715, do_: 673, oe: 125, b: 760, c: 960, e: 960, width: 573 },
  { model: "FGB-1485-620", ce: 615, do_: 620, oe: 105, b: 1619, c: 907, e: 907, width: 1397 }
];

const K_SUBMERGENCE = { pct: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90], k: [0.64, 0.633, 0.627, 0.622, 0.62, 0.621, 0.626, 0.637, 0.652, 0.682] };
function kFromSubmergence(pct: number) {
  const clamped = Math.max(0, Math.min(90, pct));
  const { pct: xs, k: ys } = K_SUBMERGENCE;
  let i = xs.findIndex((v) => v >= clamped);
  if (i <= 0) i = 1;
  const t = (clamped - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
}

const MINIMUM_FREEBOARD = [
  { label: "0 to 100 ML/d", earthenMm: 300, structuresMm: 230 },
  { label: "101 to 300 ML/d", earthenMm: 450, structuresMm: 230 },
  { label: "301 to 800 ML/d", earthenMm: 600, structuresMm: 300 },
  { label: "801 to 1200 ML/d", earthenMm: 750, structuresMm: 380 },
  { label: "> 1200 ML/d", earthenMm: 900, structuresMm: 380 }
];

const PRECAST_UNIT_DIMENSIONS = [
  { gateWidth: 626, actualGateWidth: 780, minOpeningMm: 800, gateRadius: 620, minDepthMm: 650 },
  { gateWidth: 760, actualGateWidth: 914, minOpeningMm: 950, gateRadius: 674, minDepthMm: 750 },
  { gateWidth: 1050, actualGateWidth: 1204, minOpeningMm: 1200, gateRadius: 866, minDepthMm: 900 },
  { gateWidth: 1180, actualGateWidth: 1334, minOpeningMm: 1350, gateRadius: 1077, minDepthMm: 1100 },
  { gateWidth: 1370, actualGateWidth: 1524, minOpeningMm: 1550, gateRadius: 1273, minDepthMm: 1300 },
  { gateWidth: 1485, actualGateWidth: 1639, minOpeningMm: 1650, gateRadius: 1437, minDepthMm: 1450 },
  { gateWidth: 1675, actualGateWidth: 1829, minOpeningMm: 1850, gateRadius: 1587, minDepthMm: 1600 },
  { gateWidth: 1790, actualGateWidth: 1944, minOpeningMm: 1950, gateRadius: 1804, minDepthMm: 1850 },
  { gateWidth: 2268, actualGateWidth: 2422, minOpeningMm: 2450, gateRadius: 2186, minDepthMm: 2450 }
];

// Lane's Weighted Creep Ratio — allowable ratio by foundation material.
const SEEPAGE_MATERIALS = [
  { label: "Very fine sand or silt", ratio: 8.5 }, { label: "Fine sand", ratio: 7.0 }, { label: "Medium sand", ratio: 6.0 },
  { label: "Coarse sand", ratio: 5.0 }, { label: "Fine gravel", ratio: 4.0 }, { label: "Medium gravel", ratio: 3.5 },
  { label: "Coarse gravel including cobbles", ratio: 3.1 }, { label: "Boulders with some cobbles & gravel", ratio: 2.5 },
  { label: "Soft clay", ratio: 3.0 }, { label: "Medium clay", ratio: 2.1 }, { label: "Hard clay", ratio: 1.8 },
  { label: "Very hard clay or hardpan", ratio: 1.6 }
];

function dropBarsFlow(kFactor: number, widthM: number, D: number, H: number) {
  if (!(D > 0 && H >= 0 && H < D)) return NaN;
  return (86.4 * kFactor / 3) * widthM * (3 * D - H) * Math.sqrt(2 * g * H);
}
function usbrFlow(D: number, H: number, oeM: number, radiusM: number, widthM: number, safetyFactor: number) {
  if (!(D > 0 && oeM > 0 && radiusM > 0 && Math.abs(oeM / radiusM) <= 1)) return NaN;
  const thetaDeg = (Math.asin(oeM / radiusM) * 180) / Math.PI;
  const A = -0.0013 * thetaDeg + 1.0663;
  const n = 0.1525 + 0.006077 * thetaDeg - 0.000045 * thetaDeg * thetaDeg;
  const Ca = 1.0333 + 0.003848 * thetaDeg - 0.000045 * thetaDeg * thetaDeg;
  const Ce = 0.075 * (D / oeM) + 0.602;
  const Cdf = A * Math.pow(Math.max(0, 1 - Math.pow(H / D, 1.5)), n);
  const be = widthM - 0.001;
  const he = D + 0.001;
  return 0.552 * Cdf * Ca * Ce * (2 / 3) * Math.sqrt(2 * g) * be * Math.pow(he, 1.5) * 86.4 * safetyFactor;
}
function parseRadiusM(model: string) {
  const parts = model.split("-");
  return parts.length >= 3 ? Number(parts[2]) / 1000 : NaN;
}
function freeboardForCapacity(mld: number) {
  if (mld <= 100) return MINIMUM_FREEBOARD[0];
  if (mld <= 300) return MINIMUM_FREEBOARD[1];
  if (mld <= 800) return MINIMUM_FREEBOARD[2];
  if (mld <= 1200) return MINIMUM_FREEBOARD[3];
  return MINIMUM_FREEBOARD[4];
}
function precastUnitFor(widthMm: number) {
  return PRECAST_UNIT_DIMENSIONS.find((p) => p.actualGateWidth >= widthMm) ?? PRECAST_UNIT_DIMENSIONS[PRECAST_UNIT_DIMENSIONS.length - 1];
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return <label className="calc-field">
    <span>{label}</span>
    {hint && <small>{hint}</small>}
    <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />{unit && <i>{unit}</i>}
  </label>;
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="calc-field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <section className="calc-card"><div className="calc-card-title"><b>{number}</b><h2>{title}</h2></div>{children}</section>;
}
function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function RegulatorDesignTool() {
  const [regulatorType, setRegulatorType] = useState("Inline");
  const [gateModel, setGateModel] = useState("FGA-1675-1077-01");
  const [ipmFlow, setIpmFlow] = useState("78");
  const [safetyFactor, setSafetyFactor] = useState("1");

  const [checkMode, setCheckMode] = useState<"Existing" | "Design">("Existing");
  const [topOfShortLeg, setTopOfShortLeg] = useState("104.668");

  const [usHardBed, setUsHardBed] = useState("103.13");
  const [usSupplyLevel, setUsSupplyLevel] = useState("104.25");
  const [usHighWaterMark, setUsHighWaterMark] = useState("104.3");
  const [dsHardBed, setDsHardBed] = useState("103.1");
  const [dsSupplyLevel, setDsSupplyLevel] = useState("104.07");
  const [dsDdl, setDsDdl] = useState("104.14");

  const [upstreamChannelCapacity, setUpstreamChannelCapacity] = useState("200");
  const [downstreamChannelCapacity, setDownstreamChannelCapacity] = useState("200");

  const [soilType, setSoilType] = useState("Medium clay");
  const [creepHorizontalFlume, setCreepHorizontalFlume] = useState("6");
  const [creepVerticalFlume, setCreepVerticalFlume] = useState("5.07");
  const [creepHorizontalWall, setCreepHorizontalWall] = useState("6");
  const [creepVerticalWall, setCreepVerticalWall] = useState("1.8");
  const [creepHorizontalDry, setCreepHorizontalDry] = useState("6.4");
  const [creepVerticalDry, setCreepVerticalDry] = useState("1.8");

  const gate = useMemo(() => FLUME_GATE_DATA.find((gt) => gt.model === gateModel) ?? FLUME_GATE_DATA[0], [gateModel]);

  const r = useMemo(() => {
    const ipm = num(ipmFlow), sf = num(safetyFactor), topShortLeg = num(topOfShortLeg);
    const usBed = num(usHardBed), usSL = num(usSupplyLevel), usMWL = num(usHighWaterMark);
    const dsBed = num(dsHardBed), dsSL = num(dsSupplyLevel), dsDdlVal = num(dsDdl);
    const usCapacity = num(upstreamChannelCapacity), dsCapacity = num(downstreamChannelCapacity);
    const hCreepF = num(creepHorizontalFlume), vCreepF = num(creepVerticalFlume);
    const hCreepW = num(creepHorizontalWall), vCreepW = num(creepVerticalWall);
    const hCreepD = num(creepHorizontalDry), vCreepD = num(creepVerticalDry);

    const inputs = [ipm, sf, topShortLeg, usBed, usSL, usMWL, dsBed, dsSL, dsDdlVal, usCapacity, dsCapacity, hCreepF, vCreepF, hCreepW, vCreepW, hCreepD, vCreepD];
    if (!inputs.every((v) => Number.isFinite(v))) return null;

    const designFlow = 1.25 * ipm;
    const minFreeboardGateChecking = regulatorType === "Inline" ? 0.08 : regulatorType === "Offtake" ? 0.15 : 0.08;
    const minUpstreamTrainingWallM = regulatorType === "Inline" ? 0.2 : 0.5;
    const minDownstreamTrainingWallM = (gate.do_ / 1000) * 3;

    const oeM = gate.oe / 1000, ceM = gate.ce / 1000, cM = gate.c / 1000, eM = gate.e / 1000, widthM = gate.width / 1000;
    const radiusM = parseRadiusM(gate.model);

    let sillLevel: number, gateCheckingLevel: number, computedTopShortLeg: number;
    if (checkMode === "Existing") {
      sillLevel = topShortLeg - cM;
      gateCheckingLevel = sillLevel + ceM;
      computedTopShortLeg = topShortLeg;
    } else {
      gateCheckingLevel = Math.max(usSL + 0.1, usMWL + minFreeboardGateChecking);
      sillLevel = gateCheckingLevel - ceM;
      computedTopShortLeg = sillLevel + eM;
    }
    const gateCheckingHwm = (gateCheckingLevel - usMWL) * 1000;
    const gateCheckingFsl = (gateCheckingLevel - usSL) * 1000;

    const D = usSL - (sillLevel + oeM);
    const H = usSL - dsDdlVal;
    const submergencePct = D > 0 ? ((D - H) / D) * 100 : NaN;
    const kFactor = kFromSubmergence(submergencePct);

    const dropBarsQ = dropBarsFlow(kFactor, widthM, D, H);
    const usbrQ = usbrFlow(D, H, oeM, radiusM, widthM, sf);
    const dropBarsOk = dropBarsQ >= designFlow;
    const usbrOk = usbrQ >= designFlow;

    const usFreeboard = freeboardForCapacity(usCapacity);
    const dsFreeboard = freeboardForCapacity(dsCapacity);
    const topOfWalls = Math.max(usSL + usFreeboard.earthenMm / 1000, usMWL + usFreeboard.structuresMm / 1000);
    const topOfBank = Math.min(usSL + usFreeboard.earthenMm / 1000, usMWL + usFreeboard.structuresMm / 1000, topOfWalls);
    const wallHeight = topOfWalls - sillLevel;
    const pitFloorLevel = sillLevel;
    const internalWidthPrecast = gate.b + 20;
    const topOfDesignBankDownstream = Math.max(dsSL + dsFreeboard.earthenMm / 1000, dsDdlVal + dsFreeboard.structuresMm / 1000);

    const precastUnit = precastUnitFor(internalWidthPrecast);
    const precastOpeningOk = precastUnit.minOpeningMm >= internalWidthPrecast;
    const precastDepthMm = wallHeight * 1000;
    const precastDepthOk = precastUnit.minDepthMm >= precastDepthMm;

    const allowableCreepRatio = SEEPAGE_MATERIALS.find((m) => m.label === soilType)?.ratio ?? 3;
    const headDiffUsDs = usSL - dsSL;
    const headDiffDry = usSL - dsBed;
    const creepFlume = { length: hCreepF / 3 + vCreepF, headDiff: headDiffUsDs, ratio: (hCreepF / 3 + vCreepF) / headDiffUsDs };
    const creepWall = { length: hCreepW / 3 + vCreepW, headDiff: headDiffUsDs, ratio: (hCreepW / 3 + vCreepW) / headDiffUsDs };
    const creepDry = { length: hCreepD / 3 + vCreepD, headDiff: headDiffDry, ratio: (hCreepD / 3 + vCreepD) / headDiffDry };

    return {
      designFlow, minFreeboardGateChecking, minUpstreamTrainingWallM, minDownstreamTrainingWallM,
      sillLevel, gateCheckingLevel, computedTopShortLeg, gateCheckingHwm, gateCheckingFsl,
      D, H, submergencePct, kFactor, dropBarsQ, usbrQ, dropBarsOk, usbrOk, radiusM,
      topOfWalls, topOfBank, wallHeight, pitFloorLevel, internalWidthPrecast, topOfDesignBankDownstream,
      precastUnit, precastOpeningOk, precastDepthMm, precastDepthOk,
      allowableCreepRatio, creepFlume, creepWall, creepDry
    };
  }, [
    gate, regulatorType, checkMode, ipmFlow, safetyFactor, topOfShortLeg, usHardBed, usSupplyLevel, usHighWaterMark,
    dsHardBed, dsSupplyLevel, dsDdl, upstreamChannelCapacity, downstreamChannelCapacity, soilType,
    creepHorizontalFlume, creepVerticalFlume, creepHorizontalWall, creepVerticalWall, creepHorizontalDry, creepVerticalDry
  ]);

  const exportCsv = () => {
    if (!r) return;
    const rows: (string | number)[][] = [
      ["Regulator Design Calculation", "Value", "Unit"],
      ["Gate model", gate.model, ""], ["Design flow (1.25 x IPM)", r.designFlow, "ML/d"],
      ["Sill level", r.sillLevel, "mAHD"], ["Gate checking level", r.gateCheckingLevel, "mAHD"],
      ["Driving head, D", r.D, "m"], ["Head difference, H", r.H, "m"], ["Submergence", r.submergencePct, "%"], ["K factor", r.kFactor, ""],
      ["Drop Bars flow", r.dropBarsQ, "ML/d"], ["USBR flow", r.usbrQ, "ML/d"],
      ["Top of walls", r.topOfWalls, "mAHD"], ["Pit floor level", r.pitFloorLevel, "mAHD"], ["Wall height", r.wallHeight, "m"],
      ["Internal width, precast flume", r.internalWidthPrecast, "mm"],
      ["Creep ratio (under flume)", r.creepFlume.ratio, ""], ["Creep ratio (under wall)", r.creepWall.ratio, ""], ["Creep ratio (FSL/dry)", r.creepDry.ratio, ""]
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "regulator-design-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="content calc-content">
    <p className="eyebrow">IRRIGATION CHANNEL REGULATOR — FLUMEGATE</p>
    <h1>Regulator Design</h1>
    <p className="subtitle">Gate flow capacity, precast structure geometry and seepage (Lane&apos;s Weighted Creep Ratio) checks for a FlumeGate regulator.</p>
    <div className="calc-layout"><div>
      <Section number={1} title="Structure and gate"><div className="calc-fields">
        <Select label="Regulator type" value={regulatorType} options={["Inline", "Offtake", "Inline D/S of Bend"]} onChange={setRegulatorType} />
        <Select label="FlumeGate model" value={gateModel} options={FLUME_GATE_DATA.map((gt) => gt.model)} onChange={setGateModel} />
        <Field label="IPM flow required, Q" value={ipmFlow} unit="ML/d" onChange={setIpmFlow} />
        <Field label="Safety factor (USBR method)" value={safetyFactor} onChange={setSafetyFactor} />
        <Select label="Check mode" value={checkMode} options={["Existing", "Design"]} onChange={(v) => setCheckMode(v as "Existing" | "Design")} />
        {checkMode === "Existing" && <Field label="Surveyed top of short leg" value={topOfShortLeg} unit="mAHD" onChange={setTopOfShortLeg} />}
      </div>
      <p className="engine-note">13 of 99 FlumeGate models in the source workbook were missing the &quot;Actual Gate Width&quot; dimension needed for the flow formulas and are not offered here. Existing mode uses a surveyed top-of-short-leg level; Design mode computes the gate checking level from supply level and high water mark.</p></Section>
      <Section number={2} title="Water levels"><div className="calc-fields">
        <Field label="Upstream hard bed" value={usHardBed} unit="mAHD" onChange={setUsHardBed} />
        <Field label="Upstream supply level, FSL" value={usSupplyLevel} unit="mAHD" onChange={setUsSupplyLevel} />
        <Field label="Upstream high water mark, MWL" value={usHighWaterMark} unit="mAHD" onChange={setUsHighWaterMark} />
        <Field label="Downstream hard bed" value={dsHardBed} unit="mAHD" onChange={setDsHardBed} />
        <Field label="Downstream supply level" value={dsSupplyLevel} unit="mAHD" onChange={setDsSupplyLevel} />
        <Field label="Downstream design demand level, DDL" value={dsDdl} unit="mAHD" onChange={setDsDdl} />
      </div></Section>
      <Section number={3} title="Freeboard — channel capacity bands"><div className="calc-fields">
        <Field label="Upstream channel capacity" value={upstreamChannelCapacity} unit="ML/d" onChange={setUpstreamChannelCapacity} />
        <Field label="Downstream channel capacity" value={downstreamChannelCapacity} unit="ML/d" onChange={setDownstreamChannelCapacity} />
      </div>
      <div className="reference-table"><table><thead><tr><th>Design discharge</th><th>Earthen assets (mm above MWL)</th><th>Structures (mm above MWL)</th></tr></thead><tbody>{MINIMUM_FREEBOARD.map((f) => <tr key={f.label}><td>{f.label}</td><td>{f.earthenMm}</td><td>{f.structuresMm}</td></tr>)}</tbody></table></div></Section>
      <Section number={4} title="Seepage check — Lane's Weighted Creep Ratio"><div className="calc-fields">
        <Select label="Foundation material" value={soilType} options={SEEPAGE_MATERIALS.map((m) => m.label)} onChange={setSoilType} />
      </div>
      <p className="section-help">Creep ratio = (horizontal length / 3 + vertical length) / head difference, for each scenario.</p>
      <div className="calc-fields">
        <Field label="Under flume structure — horizontal creep length" value={creepHorizontalFlume} unit="m" onChange={setCreepHorizontalFlume} />
        <Field label="Under flume structure — vertical (cutoff) length" value={creepVerticalFlume} unit="m" onChange={setCreepVerticalFlume} />
        <Field label="Under retaining wall — horizontal creep length" value={creepHorizontalWall} unit="m" onChange={setCreepHorizontalWall} />
        <Field label="Under retaining wall — vertical (cutoff) length" value={creepVerticalWall} unit="m" onChange={setCreepVerticalWall} />
        <Field label="FSL upstream, dry downstream — horizontal creep length" value={creepHorizontalDry} unit="m" onChange={setCreepHorizontalDry} />
        <Field label="FSL upstream, dry downstream — vertical (cutoff) length" value={creepVerticalDry} unit="m" onChange={setCreepVerticalDry} />
      </div></Section>
      <div className="reference-table"><table><thead><tr><th>Material</th><th>Allowable ratio</th></tr></thead><tbody>{SEEPAGE_MATERIALS.map((m) => <tr key={m.label}><td>{m.label}</td><td>{m.ratio}:1</td></tr>)}</tbody></table></div>
    </div>
    <aside className="calc-results"><p>LIVE RESULTS</p>
      <div className="result-hero"><span>Gate checking level</span><strong>{r ? fmt(r.gateCheckingLevel, 3) : "—"}<small>mAHD</small></strong></div>
      {r && <><div className="check-row">
        <span className={r.dropBarsOk ? "pass" : "fail"}>{r.dropBarsOk ? "✓ Drop Bars capacity meets design flow" : "✕ Drop Bars capacity below design flow"}</span>
        <span className={r.usbrOk ? "pass" : "fail"}>{r.usbrOk ? "✓ USBR capacity meets design flow" : "✕ USBR capacity below design flow"}</span>
      </div>
      <h3 className="result-section-title">Gate checking level</h3>
      <Metric name="Sill level" value={fmt(r.sillLevel, 3) + " mAHD"} />
      <Metric name="Top of short leg" value={fmt(r.computedTopShortLeg, 3) + " mAHD"} />
      <Metric name="Gate checking level − HWM" value={fmt(r.gateCheckingHwm, 0) + " mm"} />
      <Metric name="Gate checking level − FSL" value={fmt(r.gateCheckingFsl, 0) + " mm"} />
      <h3 className="result-section-title">Flow capacity check</h3>
      <Metric name="Design flow (1.25 × IPM)" value={fmt(r.designFlow, 2) + " ML/d"} />
      <Metric name="Driving head, D / head diff., H" value={fmt(r.D, 3) + " m / " + fmt(r.H, 3) + " m"} />
      <Metric name="Submergence / K factor" value={fmt(r.submergencePct, 1) + " % / " + fmt(r.kFactor, 3)} />
      <Metric name="Drop Bars flow" value={fmt(r.dropBarsQ, 2) + " ML/d"} />
      <Metric name="USBR flow" value={fmt(r.usbrQ, 2) + " ML/d"} />
      <Metric name="Gate radius (parsed from model)" value={fmt(r.radiusM, 3) + " m"} />
      <h3 className="result-section-title">Precast structure</h3>
      <Metric name="Top of walls / bank" value={fmt(r.topOfWalls, 3) + " / " + fmt(r.topOfBank, 3) + " mAHD"} />
      <Metric name="Pit floor level" value={fmt(r.pitFloorLevel, 3) + " mAHD"} />
      <Metric name="Wall height" value={fmt(r.wallHeight, 3) + " m"} />
      <Metric name="Internal width, precast flume" value={fmt(r.internalWidthPrecast, 0) + " mm"} />
      <Metric name="Top of design bank, downstream" value={fmt(r.topOfDesignBankDownstream, 3) + " mAHD"} />
      <Metric name="Min. training wall, u/s / d/s" value={fmt(r.minUpstreamTrainingWallM, 2) + " m / " + fmt(r.minDownstreamTrainingWallM, 2) + " m"} />
      <div className="check-row">
        <span className={r.precastOpeningOk ? "pass" : "fail"}>{r.precastOpeningOk ? "✓ Precast opening adequate" : "✕ Precast opening insufficient"}</span>
        <span className={r.precastDepthOk ? "pass" : "fail"}>{r.precastDepthOk ? "✓ Precast depth adequate" : "✕ Precast depth insufficient"}</span>
      </div>
      <Metric name="Nearest precast unit — opening" value={fmt(r.precastUnit.minOpeningMm, 0) + " mm (required " + fmt(r.internalWidthPrecast, 0) + " mm)"} />
      <Metric name="Nearest precast unit — depth" value={fmt(r.precastUnit.minDepthMm, 0) + " mm (required " + fmt(r.precastDepthMm, 0) + " mm)"} />
      <h3 className="result-section-title">Seepage — Lane&apos;s Weighted Creep Ratio</h3>
      <Metric name="Allowable ratio" value={fmt(r.allowableCreepRatio, 1) + ":1"} />
      <div className="check-row">
        <span className={r.creepFlume.ratio >= r.allowableCreepRatio ? "pass" : "fail"}>{r.creepFlume.ratio >= r.allowableCreepRatio ? "✓ Flume" : "✕ Flume"} {fmt(r.creepFlume.ratio, 2)}:1</span>
        <span className={r.creepWall.ratio >= r.allowableCreepRatio ? "pass" : "fail"}>{r.creepWall.ratio >= r.allowableCreepRatio ? "✓ Wall" : "✕ Wall"} {fmt(r.creepWall.ratio, 2)}:1</span>
        <span className={r.creepDry.ratio >= r.allowableCreepRatio ? "pass" : "fail"}>{r.creepDry.ratio >= r.allowableCreepRatio ? "✓ FSL/dry" : "✕ FSL/dry"} {fmt(r.creepDry.ratio, 2)}:1</span>
      </div>
      <button className="download-btn" onClick={exportCsv}>↓ Export calculation CSV</button>
      <p className="engine-note">Preliminary design aid only, ported from a project-specific Rubicon FlumeGate design workbook. The Rubicon chart cross-check (bilinear interpolation of manufacturer performance-chart corner values) is not included — obtain those from the manufacturer for the selected gate and check separately. Confirm all levels, gate selection, precast geometry and geotechnical seepage parameters before issue.</p></>}
    </aside></div>
  </div>;
}
