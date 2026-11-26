"use client";

import { useState } from "react";
import { abutmentPath, seatTransferKey, type SeatReactions } from "./bank-seat-transfer";
import { peakReaction, rectangularContactArea, sm1600Reactions } from "./bank-seat-traffic";
import { BankSeatDiagram } from "./BankSeatDiagrams";

const fields = [
  ["span", "Span between supports (m)", ""],
  ["width", "Loaded width across seat (m)", ""],
  ["beams", "Number of deck beams", ""],
  ["beamMass", "Mass per beam (t)", ""],
  ["kerbs", "Number of additional kerb units", "0"],
  ["kerbMass", "Mass per kerb (t)", "0"],
  ["other", "Other structural dead-load reaction at seat (kN)", "0"],
  ["surfacing", "Superimposed dead-load reaction at seat (kN)", "0"],
] as const;

const customFields = [
  ["udl", "Concurrent full-span traffic UDL (kN/m)", "0"],
  ["axleDynamic", "Axle dynamic multiplier", "1"],
  ["udlDynamic", "UDL dynamic multiplier", "1"],
] as const;

const optional = [
  ["ulsG", "ULS structural dead-load factor"],
  ["ulsQ", "ULS traffic factor"],
  ["slsG", "SLS structural dead-load factor"],
  ["ulsSurfacing", "ULS superimposed dead-load factor"],
  ["slsSurfacing", "SLS superimposed dead-load factor"],
  ["slsQ", "SLS traffic factor"],
  ["bearingG", "Structural dead-load reaction at pad (kN)"],
  ["bearingSurfacing", "Superimposed dead-load reaction at pad (kN)"],
  ["bearingQ", "Traffic reaction at pad including dynamics (kN)"],
  ["padLength", "Loaded contact length along span (mm)"],
  ["padWidth", "Loaded contact width across span (mm)"],
  ["area", "Verified effective contact area override (mm²)"],
  ["resistance", "Local ULS bearing resistance (kN)"],
] as const;

export function BankSeatTool() {
  const [values, setValues] = useState<Record<string, string>>(
    { ...Object.fromEntries([...fields, ...customFields].map(([key, , initial]) => [key, initial])),
      slsG: "1", slsSurfacing: "1.3", ulsSurfacing: "2" }
  );
  const [train, setTrain] = useState("");
  const [model, setModel] = useState("sm1600");
  const [padSource, setPadSource] = useState("linked");
  const [padTrafficModel, setPadTrafficModel] = useState("");
  const number = (key: string) => values[key]?.trim() ? Number(values[key]) : NaN;
  const axles = train.split("\n").filter(line => line.trim()).map(line => line.trim().split(/[,\s]+/).map(Number));
  const validAxles = axles.length <= 100 &&
    axles.every(row => row.length === 2 && row.every(Number.isFinite) && row[0] > 0 && row[1] >= 0) &&
    (axles.length === 0 || axles[0][1] === 0);
  const span = number("span");
  const width = number("width");
  const valid = fields.every(([key]) => Number.isFinite(number(key)) && number(key) >= 0) &&
    span > 0 && width > 0 && Number.isInteger(number("beams")) && Number.isInteger(number("kerbs"));
  const permanent = (number("beams") * number("beamMass") + number("kerbs") * number("kerbMass")) * 9.8 / 2 + number("other");
  const lanes = Math.floor(number("roadWidth") / 3.2 + 1e-9);
  const roadLoads = span > 0 && Number.isFinite(span) && Number.isSafeInteger(lanes) && lanes > 0
    ? sm1600Reactions(span, lanes) : [];
  const governing = roadLoads.reduce<(typeof roadLoads)[number] | undefined>(
    (max, row) => !max || row.total > max.total ? row : max, undefined
  );
  const validCustom = span > 0 && Number.isFinite(span) && validAxles &&
    customFields.every(([key]) => Number.isFinite(number(key)) && number(key) >= 0) &&
    number("axleDynamic") >= 1 && number("udlDynamic") >= 1;
  const customTraffic = validCustom
    ? peakReaction(span, axles) * number("axleDynamic") + number("udl") * span / 2 * number("udlDynamic")
    : NaN;
  const traffic = model === "sm1600" ? governing?.total ?? NaN : customTraffic;
  const factor = (key: string) => {
    if (model === "sm1600" && !values[key]?.trim()) {
      if (key === "ulsQ") return 1.8;
      if (key === "slsQ") return 1;
    }
    return number(key);
  };
  const format = (value: number, unit = "") =>
    Number.isFinite(value) ? value.toFixed(2) + (unit ? " " + unit : "") : "—";
  const factored = (reaction: number, key: string) => {
    const multiplier = factor(key);
    return reaction === 0 ? 0 : Number.isFinite(reaction) && reaction > 0 &&
      Number.isFinite(multiplier) && multiplier >= 0 ? reaction * multiplier : NaN;
  };
  const surfacing = number("surfacing");
  const deckCombination = (gf: string, qf: string, sf: string) => valid
    ? factored(permanent, gf) + factored(traffic, qf) + factored(surfacing, sf)
    : NaN;
  const area = values.area?.trim() ? number("area") : rectangularContactArea(number("padLength"), number("padWidth"));
  const linkedPad = padSource === "linked";
  const padTraffic = model === "sm1600" && padTrafficModel
    ? roadLoads.find(row => row.name === padTrafficModel)?.total ?? NaN
    : traffic;
  const padShare = (reaction: number, key: string) => {
    const share = number(key);
    return reaction === 0 ? 0 : Number.isFinite(reaction) && reaction > 0 &&
      share >= 0 && share <= 100 ? reaction * share / 100 : NaN;
  };
  const padG = linkedPad ? padShare(valid ? permanent : NaN, "padGShare") : number("bearingG");
  const padS = linkedPad ? padShare(valid ? surfacing : NaN, "padSShare")
    : values.bearingSurfacing?.trim() ? number("bearingSurfacing") : 0;
  const padQ = linkedPad ? padShare(padTraffic, "padQShare") : number("bearingQ");
  const bearing = factored(padG, "ulsG") + factored(padS, "ulsSurfacing") + factored(padQ, "ulsQ");
  const results: [string, number, string][] = [
    ["Permanent deck reaction", valid ? permanent + surfacing : NaN, "kN"],
    ["Equivalent permanent line load across seat", valid ? (permanent + surfacing) / width : NaN, "kN/m"],
    ["Peak traffic reaction", traffic, "kN"],
    ["ULS vertical deck reaction", deckCombination("ulsG", "ulsQ", "ulsSurfacing"), "kN"],
    ["SLS vertical deck reaction", deckCombination("slsG", "slsQ", "slsSurfacing"), "kN"],
  ];
  const padActions: [string, number, string][] = [
    ["Structural dead load at pad", padG, "kN"],
    ["Superimposed dead load at pad", padS, "kN"],
    ["Traffic at pad including dynamics", padQ, "kN"],
  ];
  const localResults: [string, number, string][] = [
    ["Effective contact area", area > 0 ? area : NaN, "mm²"],
    ["Local ULS bearing reaction", bearing, "kN"],
    ["Average ULS contact pressure", area > 0 ? 1000 * bearing / area : NaN, "MPa"],
    ["Vertical bearing utilisation", number("resistance") > 0 ? 100 * bearing / number("resistance") : NaN, "%"],
  ];
  const input = ([key, label]: readonly [string, string, ...string[]], max?: number) => (
    <label key={key} className="grid gap-1">
      {label}
      <input className="rounded border border-slate-400 px-3 py-2" type="number" min="0" max={max} step="any"
        placeholder={key === "ulsQ" || key === "slsQ" ? format(factor(key)) : undefined}
        value={values[key] ?? ""} onChange={event => setValues({ ...values, [key]: event.target.value })} />
    </label>
  );
  const openAbutment = () => {
    const available = (value: number) => Number.isFinite(value) && value >= 0 ? value : null;
    const reactions: SeatReactions = {
      permanent: available(valid ? permanent : NaN),
      superimposed: available(valid ? surfacing : NaN),
      traffic: available(traffic),
      trafficOptions: model === "sm1600" ? roadLoads.filter(row => Number.isFinite(row.total))
        .map(row => ({ name: row.name, value: row.total })) : [],
    };
    let destination = abutmentPath;
    try {
      window.sessionStorage.setItem(seatTransferKey, JSON.stringify(reactions));
      destination += "?from-seat=1";
    } catch {
      // The destination also supports manual entry if browser storage is unavailable.
    }
    window.location.assign(destination);
  };
  const resultList = (items: [string, number, string][]) => (
    <dl aria-live="polite" className="grid gap-3 rounded border border-slate-400 p-4 sm:grid-cols-3">
      {items.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd className="font-semibold">{format(value, unit)}</dd></div>)}
    </dl>
  );

  return (
    <div className="grid max-w-5xl gap-8 p-6">
      <nav aria-label="Bridge bank seat checks" className="flex flex-wrap gap-x-5 gap-y-2 underline">
        <a href="#deck-actions">Deck reactions</a>
        <a href="#local-bearing">Beam-to-seat contact</a>
      </nav>
      <section className="grid gap-4" aria-labelledby="deck-actions">
        <h2 id="deck-actions" className="text-xl font-semibold">Deck reactions at the bank seat</h2>
        <p>The results are for one seat at one end of a simply supported span. Each end takes 50% of the total beam and kerb self-weight under the assumed symmetric loading. The beam weight split is already included.</p>
        <BankSeatDiagram view="span" />
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-3 font-semibold">Span geometry and permanent loads</legend>
          {fields.map(field => input(field))}
        </fieldset>
        <label className="grid max-w-sm gap-1">Vehicle load model
          <select className="rounded border border-slate-400 p-2" value={model} onChange={event => setModel(event.target.value)}>
            <option value="sm1600">AS 5100.2 SM1600 design traffic</option>
            <option value="custom">Project-specific axle train</option>
          </select>
        </label>
        {model === "sm1600" ? <>
          <div className="max-w-sm">{input(["roadWidth", "Clear road width between external barriers (m)"])}</div>
          <p>AS 5100.2 Clauses 7.5–7.6 determine the number of 3.2 m design lanes and their accompanying factors. The road width is measured independently of the loaded seat width.</p>
          {governing ? <details open className="rounded border border-slate-400 p-3">
            <summary className="cursor-pointer font-semibold">SM1600 vehicle load breakdown</summary>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[40rem] text-left">
                <thead className="bg-slate-100 text-slate-900"><tr><th scope="col" className="p-2">Seat reaction component</th>{roadLoads.map(row => <th key={row.name} scope="col" className="p-2">{row.name}</th>)}</tr></thead>
                <tbody>
                  {([
                    ["Axles, one lane", "axleReaction", "kN"],
                    ["Full-span UDL, one lane", "udlReaction", "kN"],
                    ["Dynamic load allowance α", "alpha", ""],
                    ["Reaction including dynamics, one lane", "laneReaction", "kN"],
                    ["Total reaction with accompanying lane factors", "total", "kN"],
                  ] as const).map(([label, key, unit]) => <tr key={key} className="border-t border-slate-200">
                    <th scope="row" className="p-2 font-normal">{label}</th>
                    {roadLoads.map(row => <td key={row.name} className="p-2">{format(row[key], unit)}</td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
            <p className="mt-2 rounded bg-emerald-50 p-2 font-semibold text-emerald-950">Governing total seat reaction over {lanes} design {lanes === 1 ? "lane" : "lanes"}: {governing.name}, {format(traffic, "kN")} before load factors.</p>
          </details> : <p>Enter a positive span and a clear road width sufficient for at least one standard design lane. Use the project-specific model for an approved alternative.</p>}
          <p>The calculation moves axle groups along the span in both directions and applies each model’s UDL and above-ground dynamic allowance from Table 7.7.2. Use transverse load analysis for individual bearings and local wheel effects.</p>
        </> : <>
          <fieldset className="grid gap-4 sm:grid-cols-3"><legend className="mb-3 font-semibold">Project-specific traffic inputs</legend>{customFields.map(field => input(field))}</fieldset>
          <label className="grid gap-1">Axle train (load in kN and offset in m, one axle per line)
            <textarea className="rounded border border-slate-400 p-3 font-mono" rows={4}
              value={train} onChange={event => setTrain(event.target.value)} placeholder="160, 0" />
          </label>
          {!validAxles && <p role="alert">Enter positive axle loads and non-negative offsets, starting at zero. Maximum 100 axles.</p>}
          <p>Enter one approved concurrent case at a time. The solver allows partial axle trains on the span and applies the UDL over the full span.</p>
        </>}
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-3 font-semibold">Load factors for vertical deck reactions</legend>
          {optional.slice(0, 6).map(field => input(field))}
        </fieldset>
        <p>SLS means serviceability limit state. Use AS 5100.2 Table 6.2 for structural dead load (1.0 at SLS), Table 6.3 for superimposed dead load (typically 1.3 at SLS), and Table 7.10(A) for SM1600 traffic (1.0 at SLS and 1.8 at ULS). Select the ULS structural dead-load factor for the action and material. Enter project-specific traffic factors for a custom vehicle. Include surfacing and similar loads in the separate superimposed dead-load field.</p>
        {resultList(results)}
      </section>
      <section className="grid gap-4 border-t border-slate-400 pt-5" aria-labelledby="local-bearing">
        <h2 id="local-bearing" className="text-xl font-semibold">Beam-to-seat contact check</h2>
        <BankSeatDiagram view="pad" />
        <p>Check compression beneath one beam end, either in direct contact with the seat or through a bearing pad. Design the reinforced-concrete bank seat separately using the bearing positions, seat geometry and support conditions. That design establishes the overall dimensions and reinforcement for flexure, shear or strut-and-tie action, anchorage and detailing.</p>
        <label className="grid max-w-md gap-1">Source of pad reactions
          <select className="rounded border border-slate-400 p-2" value={padSource} onChange={event => setPadSource(event.target.value)}>
            <option value="linked">Use a share of the deck reactions above</option>
            <option value="manual">Enter reactions from a separate analysis</option>
          </select>
        </label>
        {linkedPad ? <>
          <p>The percentages apply to one beam contact as a share of the reaction already calculated for one seat. For example, 10 identical beams with equal self-weight reactions each carry 10% of the beam self-weight at that seat. Traffic shares depend on transverse load distribution. Structural dead load includes the other structural reaction entered above. Use 100% only for an action carried entirely through this contact. Check the traffic case and share together for the pad being assessed.</p>
          {model === "sm1600" && <label className="grid max-w-md gap-1">Traffic model for this pad
            <select className="rounded border border-slate-400 p-2" value={padTrafficModel} onChange={event => setPadTrafficModel(event.target.value)}>
              <option value="">Governing whole-seat traffic reaction</option>
              {["S1600", "M1600", "M1600 tri-axle", "A160"].map(name => <option key={name}>{name}</option>)}
            </select>
          </label>}
          <div className="grid gap-4 sm:grid-cols-3">
            {input(["padGShare", "Structural dead-load share (%)"], 100)}
            {input(["padSShare", "Superimposed dead-load share (%)"], 100)}
            {input(["padQShare", "Traffic reaction share (%)"], 100)}
          </div>
        </> : <div className="grid gap-4 sm:grid-cols-3">{optional.slice(6, 9).map(field => input(field))}</div>}
        {resultList(padActions)}
        <p>For direct contact, use the actual loaded beam underside width and the loaded length along the span. Where a pad is installed, use its loaded dimensions for full rectangular contact. For partial contact, eccentric loading or a bearing with a specified effective area, enter a verified area.</p>
        <div className="grid gap-4 sm:grid-cols-3">{optional.slice(9).map(field => input(field))}</div>
        <p>Local ULS bearing resistance is the design force capacity in kN of the governing pad or supporting concrete check. Refer to AS 5100.4 for bridge bearings and AS 5100.5 for supporting concrete. Use the footing checks below for soil bearing pressure in kPa.</p>
        {resultList(localResults)}
      </section>
      <div className="grid justify-items-start gap-2 border-t border-slate-400 pt-5">
        <button type="button" className="rounded bg-blue-800 px-4 py-2 font-semibold text-white" onClick={openAbutment}>
          Open abutment and foundation calculations
        </button>
        <p>The abutment tool receives the unfactored whole-seat reactions above, with dynamics included in traffic.</p>
      </div>
    </div>
  );
}

