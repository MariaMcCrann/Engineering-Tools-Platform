"use client";

import { useState } from "react";
import { BankSeatDiagram } from "./BankSeatDiagrams";

type Force = { vertical: number; horizontal: number; arm: number; height: number };
type Case = {
  name: string; limit: string; traffic: string; useSpan: boolean; spanModel: string; surfacingFactor: string;
  g: string; concreteFactor: string; q: string; earth: string; surcharge: string; braking: string; extra: string;
};
const initialCases: Case[] = [
  { name: "Permanent actions and retained soil", limit: "SLS", traffic: "0", useSpan: false, spanModel: "", surfacingFactor: "1.3", g: "1", concreteFactor: "1", q: "0", earth: "", surcharge: "0", braking: "0", extra: "0" },
  { name: "Traffic on approach behind abutment", limit: "ULS", traffic: "0", useSpan: false, spanModel: "", surfacingFactor: "", g: "", concreteFactor: "", q: "0", earth: "", surcharge: "", braking: "", extra: "0" },
  { name: "Traffic on bridge deck", limit: "ULS", traffic: "", useSpan: false, spanModel: "M1600", surfacingFactor: "", g: "", concreteFactor: "", q: "", earth: "", surcharge: "0", braking: "", extra: "0" },
];

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
  const middleThird = Math.abs(eccentricity) <= width / 6;
  const compression = middleThird ? width : 3 * Math.min(x, width - x);
  const average = normal / (length * width);
  const delta = 6 * average * eccentricity / width;
  const peak = 2 * normal / (length * compression);
  return {
    x, eccentricity, compression,
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

const caseGuidance = [
  "Deck and abutment self-weight plus retained soil pressure. Use this service case to review footing contact and service pressures without vehicle loading.",
  "Vehicles on the retained approach can increase lateral pressure through surcharge. Include only braking and deck traffic actions justified by the load path and concurrency.",
  "Vehicles on the deck increase the vertical seat reaction. For a road braking combination, use the concurrent M1600 reaction and design braking force per AS 5100.2 Clauses 7.8.2 and 7.10.",
];

const geometry = [
  ["length", "Abutment / footing length across bridge (m)"],
  ["height", "Retained height above base (m)"],
  ["density", "Backfill unit weight (kN/m³)"],
  ["ka", "Active earth pressure coefficient"],
  ["bearing", "Deck reaction location from toe (m)"],
  ["volume", "Total concrete volume (m³)"],
  ["concrete", "Concrete unit weight (kN/m³)"],
  ["centroid", "Concrete centroid from toe (m)"],
  ["brakeHeight", "Braking force height above base (m)"],
  ["extraHeight", "Additional horizontal force height (m)"],
] as const;

const spread = [
  ["width", "Base width in direction of traffic (m)"],
  ["friction", "Design base friction coefficient"],
  ["slsPressure", "SLS contact pressure limit (kPa)"],
  ["ulsPressure", "ULS contact pressure limit (kPa)"],
] as const;

const caseFields = [
  ["g", "Permanent deck action multiplier"],
  ["concreteFactor", "Abutment self-weight multiplier"],
  ["q", "Traffic reaction multiplier"],
  ["earth", "Earth pressure multiplier"],
  ["surcharge", "Design uniform surcharge (kPa)"],
  ["braking", "Design braking force (kN)"],
  ["extra", "Design additional horizontal force (kN)"],
] as const;

export function AbutmentStability({ permanent, superimposed, traffic, trafficOptions }: {
  permanent: number; superimposed: number; traffic: number;
  trafficOptions: { name: string; value: number }[];
}) {
  const [foundation, setFoundation] = useState("spread");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [cases, setCases] = useState(initialCases.map((item, i) => ({ ...item, template: i })));
  const [positions, setPositions] = useState("");
  const read = (raw?: string) => raw?.trim() ? Number(raw) : NaN;
  const value = (key: string) => read(inputs[key]);
  const nonnegative = (items: number[]) => items.every(item => Number.isFinite(item) && item >= 0);
  const hasGeometry = nonnegative(geometry.map(([key]) => value(key))) &&
    value("length") > 0 && value("concrete") > 0 && (value("height") === 0 || value("density") > 0 && value("ka") > 0);
  const width = value("width");
  const height = value("height");
  const length = value("length");
  const weight = value("volume") * value("concrete");
  const earth = 0.5 * value("ka") * value("density") * height ** 2 * length;
  const piles = positions.trim() ? positions.trim().split(/[,\s]+/).map(Number) : [];
  const validSupport = foundation === "spread"
    ? width > 0 && value("bearing") <= width && value("centroid") <= width
    : piles.length > 0 && piles.length <= 100 && nonnegative(piles);
  const display = (n: number) => Number.isFinite(n) ? n.toFixed(2) : "—";
  const input = ([key, label]: readonly [string, string]) => <label key={key} className="grid gap-1">{label}
    <input className="rounded border border-slate-400 px-3 py-2" type="number" min="0" step="any"
      value={inputs[key] ?? ""} onChange={e => setInputs({ ...inputs, [key]: e.target.value })} /></label>;
  const change = (index: number, patch: Partial<Case>) =>
    setCases(cases.map((item, i) => i === index ? { ...item, ...patch } : item));

  return <section aria-labelledby="foundation-checks" className="grid gap-5 border-t border-slate-400 pt-5">
    <h2 id="foundation-checks" className="text-xl font-semibold">Abutment and foundation checks</h2>
    <BankSeatDiagram view="abutment" />
    <p>These are editable starter cases. Check the project combinations against AS 5100.2 Clause 23 and the asset owner’s requirements. Use AS 5100.3 and the project geotechnical report for footing bearing resistance and serviceability limits.</p>
    <p>Use total forces for one abutment. Measure horizontal distances from the toe and heights from the base. Horizontal actions act towards the toe. The earth model assumes triangular active pressure and uniform surcharge over the full retained height.</p>
    <label className="grid max-w-sm gap-1">Foundation
      <select value={foundation} onChange={e => setFoundation(e.target.value)} className="rounded border p-2">
        <option value="spread">Mass abutment / spread footing</option>
        <option value="piles">Rigid cap on equal-stiffness piles</option>
      </select>
    </label>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{geometry.map(input)}
      {foundation === "spread" ? spread.map(input) : <>
        <label className="grid gap-1">Pile positions from toe (m, comma separated)
          <input className="rounded border p-2" value={positions} onChange={e => setPositions(e.target.value)} />
        </label>
        {input(["compression", "ULS compression resistance per pile (kN)"])}
        {input(["tension", "ULS uplift resistance per pile (kN)"])}
      </>}
    </div>
    <p>Concrete self-weight {display(weight)} kN · Unfactored active earth thrust {display(earth)} kN. Enter zero for unused actions and factors. Enter case-specific braking and surcharge as design values with any applicable factors already included.</p>
    {cases.map((item, i) => {
      const selectedTraffic = trafficOptions.length && item.spanModel
        ? trafficOptions.find(row => row.name === item.spanModel)?.value ?? NaN : traffic;
      const q = item.useSpan ? selectedTraffic : read(item.traffic);
      const surfacingFactor = superimposed === 0 ? 0 : read(item.surfacingFactor);
      const loaded = hasGeometry && validSupport && nonnegative([permanent, superimposed, surfacingFactor, q, ...caseFields.map(([key]) => read(item[key]))]);
      const a = loaded ? actions([
        { vertical: permanent * read(item.g) + superimposed * surfacingFactor + q * read(item.q), horizontal: 0, arm: value("bearing"), height: 0 },
        { vertical: weight * read(item.concreteFactor), horizontal: 0, arm: value("centroid"), height: 0 },
        { vertical: 0, horizontal: earth * read(item.earth), arm: 0, height: height / 3 },
        { vertical: 0, horizontal: value("ka") * read(item.surcharge) * height * length, arm: 0, height: height / 2 },
        { vertical: 0, horizontal: read(item.braking), arm: 0, height: value("brakeHeight") },
        { vertical: 0, horizontal: read(item.extra), arm: 0, height: value("extraHeight") },
      ]) : null;
      const c = a && foundation === "spread" ? contact(a.normal, a.moment, width, length) : null;
      const p = a && foundation === "piles" ? pileActions(piles, a.normal, a.moment) : null;
      const pressureLimit = value(item.limit === "ULS" ? "ulsPressure" : "slsPressure");
      return <fieldset key={i} className="grid gap-3 rounded border border-slate-400 p-4">
        <legend className="px-1 font-semibold">{item.name || "Load case"}</legend>
        {caseGuidance[item.template] && <p>{caseGuidance[item.template]}</p>}
        {item.template >= 0 && <BankSeatDiagram view="abutment" loadCase={item.template} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1">Case name<input className="rounded border p-2" value={item.name} onChange={e => change(i, { name: e.target.value })} /></label>
          <label className="grid gap-1">Limit state<select className="rounded border p-2" value={item.limit} onChange={e => change(i, { limit: e.target.value })}><option>SLS</option><option>ULS</option></select></label>
          <label className="grid gap-1">Concurrent deck traffic reaction (kN, incl. dynamics)
            <input className="rounded border p-2" type="number" step="any" min="0" disabled={item.useSpan} value={item.useSpan ? Number.isFinite(selectedTraffic) ? selectedTraffic.toFixed(2) : "" : item.traffic} onChange={e => change(i, { traffic: e.target.value })} />
          </label>
          <label className="grid gap-1">Superimposed dead-load multiplier
            <input className="rounded border p-2" type="number" step="any" min="0" disabled={superimposed === 0}
              value={item.surfacingFactor} onChange={e => change(i, { surfacingFactor: e.target.value })} />
          </label>
          {caseFields.map(([key, label]) => <label key={key} className="grid gap-1">{label}<input className="rounded border p-2" type="number" step="any" min="0" value={item[key]} onChange={e => change(i, { [key]: e.target.value })} /></label>)}
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={item.useSpan} onChange={e => change(i, { useSpan: e.target.checked })} />Use calculated seat traffic reaction if applicable at the foundation</label>
        {item.useSpan && trafficOptions.length > 0 && <label className="grid max-w-sm gap-1">Concurrent vehicle model
          <select className="rounded border p-2" value={item.spanModel} onChange={e => change(i, { spanModel: e.target.value })}>
            <option value="">Peak vertical reaction across all models</option>
            {trafficOptions.map(row => <option key={row.name}>{row.name}</option>)}
          </select>
        </label>}
        {item.useSpan && <p>Linked traffic uses the above-ground dynamic allowance and peak seat reaction. Enter a case-specific reaction manually where foundation depth, concurrent placement or load distribution requires a different value.</p>}
        {a ? <div className="grid gap-1">
          <p>Normal force {display(a.normal)} kN · Horizontal demand {display(a.horizontal)} kN</p>
          <p>Restoring moment {display(a.restoring)} kNm · Overturning moment {display(a.overturning)} kNm · Net moment about toe {display(a.moment)} kNm</p>
          {foundation === "spread" && <>
            <p>Overturning resistance / demand {a.overturning > 0 ? display(a.restoring / a.overturning) : "—"} · Sliding resistance / demand {a.horizontal > 0 && nonnegative([value("friction")]) ? display(a.normal * value("friction") / a.horizontal) : "—"}</p>
            {c ? <>
              <p>Resultant from toe {display(c.x)} m · Eccentricity towards heel {display(c.eccentricity)} m · Contact width {display(c.compression)} m</p>
              <p>Toe pressure {display(c.toe)} kPa · Heel pressure {display(c.heel)} kPa · Peak pressure / entered limit {pressureLimit > 0 ? display(Math.max(c.toe, c.heel) / pressureLimit) : "—"}</p>
              {c.compression < width && <p>Partial contact. Review the applicable eccentricity and bearing resistance criteria.</p>}
            </> : <p>Resultant outside the footing or at its edge, or no compression. No contact-pressure solution.</p>}
          </>}
          {foundation === "piles" && (p ? <div className="overflow-x-auto"><table className="w-full text-left">
            <thead><tr><th>Pile</th><th>Position (m)</th><th>Axial demand (kN)</th><th>ULS utilisation</th></tr></thead>
            <tbody>{p.map((n, j) => {
              const capacity = value(n < 0 ? "tension" : "compression");
              return <tr key={j}><td>{j + 1}</td><td>{display(piles[j])}</td><td>{display(n)}</td><td>{item.limit !== "ULS" || !nonnegative([capacity]) ? "—" : capacity > 0 ? display(Math.abs(n) / capacity) : n === 0 ? "0.00" : "No resistance"}</td></tr>;
            })}</tbody>
          </table></div> : <p>This pile layout cannot resolve the applied moment through axial forces.</p>)}
        </div> : <p>Enter the deck, foundation and case inputs to calculate.</p>}
        {cases.length > 1 && <button type="button" className="justify-self-start underline" onClick={() => setCases(cases.filter((_, j) => i !== j))}>Remove {item.name || "load case"}</button>}
      </fieldset>;
    })}
    <button type="button" className="justify-self-start rounded border px-3 py-2" onClick={() => setCases([...cases, { ...initialCases[2], template: -1, name: "New load case" }])}>Add load case</button>
    <p>Spread-footing sliding includes base friction only. Toe and heel pressures use a linear, compression-only contact model. Enter a geotechnical pressure limit compatible with the peak contact pressure and limit state. Pile demand assumes a rigid cap, equal axial stiffness and bending about one axis. Verify pile lateral actions, group behaviour, settlement, water and uplift, concrete strength and reinforcement separately.</p>
  </section>;
}

