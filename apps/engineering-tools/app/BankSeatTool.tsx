"use client";

import { useState } from "react";

export function peakReaction(span: number, axles: number[][]) {
  let peak = 0;
  for (const [, offset] of axles) {
    // Between axle crossings, the reaction is linear in the train position.
    for (const first of [-offset, span - offset]) {
      const reaction = axles.reduce((sum, [load, distance]) => {
        const x = first + distance;
        const inside = x >= -1e-9 && x <= span + 1e-9;
        return sum + (inside ? load * (1 - Math.max(0, Math.min(span, x)) / span) : 0);
      }, 0);
      peak = Math.max(peak, reaction);
    }
  }
  return peak;
}

const fields = [
  ["span", "Span between supports (m)", ""],
  ["width", "Loaded width across seat (m)", ""],
  ["beams", "Number of deck beams", ""],
  ["beamMass", "Mass per beam (t)", ""],
  ["kerbs", "Number of additional kerb units", "0"],
  ["kerbMass", "Mass per kerb (t)", "0"],
  ["other", "Other permanent reaction at seat (kN)", "0"],
  ["udl", "Concurrent full-span traffic UDL (kN/m)", "0"],
  ["axleDynamic", "Axle dynamic multiplier", "1"],
  ["udlDynamic", "UDL dynamic multiplier", "1"],
] as const;

const optional = [
  ["ulsG", "ULS permanent factor"],
  ["ulsQ", "ULS traffic factor"],
  ["slsG", "SLS permanent factor"],
  ["slsQ", "SLS traffic factor"],
  ["bearingG", "Permanent reaction at bearing (kN)"],
  ["bearingQ", "Traffic reaction at bearing including dynamics (kN)"],
  ["area", "Effective bearing area (mm²)"],
  ["resistance", "Design bearing resistance (kN)"],
] as const;

export function BankSeatTool() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(([key, , initial]) => [key, initial]))
  );
  const [train, setTrain] = useState("");
  const number = (key: string) => values[key]?.trim() ? Number(values[key]) : NaN;
  const axles = train.split("\n").filter(line => line.trim()).map(line => line.trim().split(/[,\s]+/).map(Number));
  const validAxles = axles.length <= 100 &&
    axles.every(row => row.length === 2 && row.every(Number.isFinite) && row[0] > 0 && row[1] >= 0) &&
    (axles.length === 0 || axles[0][1] === 0);
  const span = number("span");
  const width = number("width");
  const valid = fields.every(([key]) => Number.isFinite(number(key)) && number(key) >= 0) &&
    span > 0 && width > 0 && Number.isInteger(number("beams")) && Number.isInteger(number("kerbs")) &&
    number("axleDynamic") >= 1 && number("udlDynamic") >= 1;
  const permanent = (number("beams") * number("beamMass") + number("kerbs") * number("kerbMass")) * 9.8 / 2 + number("other");
  const traffic = valid && validAxles
    ? peakReaction(span, axles) * number("axleDynamic") + number("udl") * span / 2 * number("udlDynamic")
    : NaN;
  const combine = (g: number, q: number, gf: string, qf: string) =>
    [g, q, number(gf), number(qf)].every(value => Number.isFinite(value) && value >= 0)
      ? g * number(gf) + q * number(qf) : NaN;
  const bearing = combine(number("bearingG"), number("bearingQ"), "ulsG", "ulsQ");
  const results: [string, number, string][] = [
    ["Permanent deck reaction", valid ? permanent : NaN, "kN"],
    ["Equivalent permanent line load across seat", valid ? permanent / width : NaN, "kN/m"],
    ["Peak traffic reaction", traffic, "kN"],
    ["ULS vertical deck reaction", combine(permanent, traffic, "ulsG", "ulsQ"), "kN"],
    ["SLS vertical deck reaction", combine(permanent, traffic, "slsG", "slsQ"), "kN"],
    ["Local ULS bearing reaction", bearing, "kN"],
    ["Average ULS contact pressure", number("area") > 0 ? 1000 * bearing / number("area") : NaN, "MPa"],
    ["Vertical bearing utilisation", number("resistance") > 0 ? 100 * bearing / number("resistance") : NaN, "%"],
  ];
  const input = ([key, label]: readonly [string, string, ...string[]]) => (
    <label key={key} className="grid gap-1">
      {label}
      <input className="rounded border border-slate-400 px-3 py-2" type="number" min="0" step="any"
        value={values[key] ?? ""} onChange={event => setValues({ ...values, [key]: event.target.value })} />
    </label>
  );
  return (
    <div className="grid max-w-5xl gap-6 p-6">
      <p>Calculate vertical reactions for one simply supported end span. Beam and kerb self-weight is assumed symmetric.</p>
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 font-semibold">Span and actions</legend>
        {fields.map(input)}
      </fieldset>
      <label className="grid gap-1">
        Axle train (one load in kN and offset in m per line)
        <textarea className="rounded border border-slate-400 p-3 font-mono" rows={4}
          value={train} onChange={event => setTrain(event.target.value)} placeholder="160, 0" />
      </label>
      {!validAxles && <p role="alert">Enter positive axle loads and non-negative offsets, starting at zero. Maximum 100 axles.</p>}
      <p>Use one approved traffic case at a time. The solver allows partial axle trains on the span and assumes the entered UDL covers the entire span. Verify placement and concurrency against the adopted load model.</p>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">Load factors and local bearing</legend>
        {optional.map(input)}
      </fieldset>
      <p>Enter the governing local bearing actions from the transverse load analysis. Use project-approved factors and dynamic allowances.</p>
      <dl aria-live="polite" className="grid gap-3 rounded border border-slate-400 p-4 sm:grid-cols-2">
        {results.map(([label, value, unit]) => (
          <div key={label}><dt>{label}</dt><dd className="font-semibold">
            {Number.isFinite(value) ? value.toFixed(2) + " " + unit : "Enter inputs"}
          </dd></div>
        ))}
      </dl>
      <p>Seat flexure, shear, edge effects, horizontal actions, restraints and foundation checks require the actual bearing and support layout.</p>
    </div>
  );
}
