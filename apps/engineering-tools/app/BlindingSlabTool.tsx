"use client";

import { useState } from "react";
import { blindingSlab } from "./blinding-slab-calcs";

const fields = [
  ["width", "Existing footing width (m)", "0.63"],
  ["length", "Existing footing length (m)", "5.7"],
  ["pressure", "Applied pressure on existing footing (kPa)", "215"],
  ["soil", "Allowable soil bearing pressure (kPa)", "110"],
  ["density", "Concrete density (t/m³)", "2.45"],
] as const;

const format = (value: number, unit: string, digits = 3) =>
  value.toLocaleString("en-AU", { maximumFractionDigits: digits }) + " " + unit;

export function BlindingSlabTool() {
  const [inputs, setInputs] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(([key, , initial]) => [key, initial]))
  );
  const [trialProjection, setTrialProjection] = useState("");
  const [trialDepth, setTrialDepth] = useState("");
  const number = (key: string) => inputs[key].trim() ? Number(inputs[key]) : NaN;
  const result = blindingSlab(number("width"), number("length"), number("pressure"), number("soil"), number("density"));
  const projection = trialProjection.trim() ? Number(trialProjection) / 1000 : NaN;
  const depth = trialDepth.trim() ? Number(trialDepth) / 1000 : NaN;
  const trialWidth = number("width") + 2 * projection;
  const trialLength = number("length") + 2 * projection;
  const effectiveProjection = Math.min(projection, depth);
  const effectiveArea = (number("width") + 2 * effectiveProjection) * (number("length") + 2 * effectiveProjection);
  const trialVolume = trialWidth * trialLength * depth;
  const trialMass = trialVolume * number("density");
  const trialPressure = result ? (result.force + trialMass * 9.80665) / effectiveArea : NaN;
  const hasTrial = projection >= 0 && depth > 0 &&
    [trialWidth, trialLength, trialVolume, trialMass, trialPressure].every(Number.isFinite);
  const results = (rows: [string, string][]) => (
    <dl className="grid gap-4 rounded border border-slate-300 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div className="metric" key={label}><dt><span>{label}</span></dt><dd><strong>{value}</strong></dd></div>
      ))}
    </dl>
  );

  return (
    <div className="grid min-w-0 max-w-5xl gap-6 p-4 sm:p-6">
      <p>Size a centred blinding slab beneath a rectangular footing using the Lodson Road Bridge workbook (A2914643). The starting values are the workbook example.</p>
      <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-3 font-semibold">Footing and soil inputs</legend>
        {fields.map(([key, label]) => <label className="grid gap-1" key={key}>{label}
          <input className="w-full rounded border border-slate-400 p-2" type="number" min="0" step="any"
            value={inputs[key]} onChange={event => setInputs({ ...inputs, [key]: event.target.value })} />
        </label>)}
      </fieldset>
      <p>The applied pressure is the vertical load divided by the existing footing area. Enter the allowable soil pressure on the same load basis.</p>
      {result ? <>
        <section className="grid gap-3" aria-labelledby="blinding-plan">
          <h2 id="blinding-plan" className="text-xl font-semibold">Rectangular slab with spread on all sides</h2>
          <p>The slab projects the same distance beyond each edge. The workbook assumes a 1H:1V spread, so the projection also determines the minimum calculated thickness.</p>
          {results([
            ["Existing footing area", format(result.area, "m²")],
            ["Applied vertical load", format(result.force, "kN")],
            ["Required soil bearing area", format(result.requiredArea, "m²")],
            ["Slab width", format(result.slabWidth, "m", 4)],
            ["Slab length", format(result.slabLength, "m", 4)],
            ["Projection on each edge", format(result.projection * 1000, "mm", 1)],
            ["Calculated thickness, rounded up", format(result.thickness, "mm", 0)],
            ["Concrete volume", format(result.volume, "m³")],
            ["Concrete mass", format(result.mass, "t")],
            ["Average soil pressure excluding slab weight", format(result.pressureWithoutWeight, "kPa", 2)],
            ["Average soil pressure including slab weight", format(result.pressureWithWeight, "kPa", 2)],
          ])}
          {result.thickness === 0 ? <p>The input load requires no bearing-area enlargement. The calculated thickness here is for load spread.</p> :
            result.pressureWithWeight > number("soil") + 1e-9 && (
              <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-950">
                Including slab weight, the calculated minimum plan exceeds the entered soil pressure limit. Use the trial dimensions below to check an adopted slab.
              </p>
            )}
        </section>
        <section className="grid gap-3" aria-labelledby="blinding-trial">
          <h2 id="blinding-trial" className="text-xl font-semibold">Check adopted dimensions</h2>
          <p>The effective spread is limited by the lesser of the actual projection and concrete thickness. The check includes the weight of the full slab.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">Adopted projection on each edge (mm)
              <input className="rounded border border-slate-400 p-2" type="number" step="any" min="0"
                value={trialProjection} onChange={event => setTrialProjection(event.target.value)} />
            </label>
            <label className="grid gap-1">Adopted slab thickness (mm)
              <input className="rounded border border-slate-400 p-2" type="number" step="any" min="0"
                value={trialDepth} onChange={event => setTrialDepth(event.target.value)} />
            </label>
          </div>
          {hasTrial && <>
            {results([
              ["Adopted width", format(trialWidth, "m")],
              ["Adopted length", format(trialLength, "m")],
              ["Effective soil bearing area", format(effectiveArea, "m²")],
              ["Adopted concrete volume", format(trialVolume, "m³")],
              ["Adopted concrete mass", format(trialMass, "t")],
              ["Average soil pressure including slab weight", format(trialPressure, "kPa", 2)],
            ])}
            <p role="status">{trialPressure <= number("soil") + 1e-9 ? "Within the entered average soil pressure limit." : "Exceeds the entered average soil pressure limit."}</p>
          </>}
        </section>
        <section className="grid gap-3" aria-labelledby="blinding-strip">
          <h2 id="blinding-strip" className="text-xl font-semibold">One-metre strip with width spread only</h2>
          <p>This workbook check assumes no spread beyond the footing ends.</p>
          {results([
            ["Applied vertical load per metre", format(result.stripReaction, "kN/m")],
            ["Required width for soil bearing", format(result.stripWidth, "m", 4)],
            ["Projection on each side", format(result.stripProjection * 1000, "mm", 1)],
            ["Calculated thickness, rounded up", format(result.stripThickness, "mm", 0)],
          ])}
        </section>
      </> : <p role="alert">Enter positive footing dimensions, allowable soil pressure and concrete density, and an applied pressure of zero or greater.</p>}
      <p>Confirm the adopted load spread, structural adequacy and geotechnical bearing and settlement criteria for the project. The workbook records 32 MPa concrete. The sizing equations use geometry and pressure.</p>
    </div>
  );
}
