"use client";

import { useState } from "react";
import { blindingSlab } from "./blinding-slab-calcs";
import { Card, Check, Field, Metric, ResultHero, TitleRow, fmt } from "./BridgeUi";

const fields = [
  ["width", "Existing footing width", "m", ""],
  ["length", "Existing footing length", "m", ""],
  ["pressure", "Applied pressure under existing footing", "kPa", "Vertical load ÷ footing area"],
  ["soil", "Allowable soil bearing pressure", "kPa", "Same load basis as above"],
  ["density", "Concrete density", "t/m³", "Workbook uses 2.45"],
] as const;

function Plan({ width, length, slabWidth, slabLength }: { width: number; length: number; slabWidth: number; slabLength: number }) {
  const scale = 420 / Math.max(slabLength, 1e-9), sw = slabLength * scale, sh = Math.max(slabWidth * scale, 24);
  const fw = length * scale, fh = Math.max(width * scale, 12), x0 = 40, y0 = 30;
  return <svg viewBox={`0 0 500 ${sh + 80}`} role="img" aria-label="Blinding slab plan" style={{ width: "100%", height: "auto", marginTop: 12 }}>
    <rect x={x0} y={y0} width={sw} height={sh} fill="#dbe8f5" stroke="#365b91" strokeWidth="2" />
    <rect x={x0 + (sw - fw) / 2} y={y0 + (sh - fh) / 2} width={fw} height={fh} fill="#94a3b8" stroke="#334155" />
    <text x={x0} y={y0 - 8} fontSize="11" fill="#334e70">Blinding slab {fmt(slabLength, 2)} × {fmt(slabWidth, 2)} m</text>
    <text x={x0} y={y0 + sh + 22} fontSize="11" fill="#334e70">Existing footing {fmt(length, 2)} × {fmt(width, 2)} m (grey)</text>
  </svg>;
}

export function BlindingSlabTool() {
  const [inputs, setInputs] = useState<Record<string, string>>({ width: "0.63", length: "5.7", pressure: "215", soil: "110", density: "2.45" });
  const [trialProjection, setTrialProjection] = useState("");
  const [trialDepth, setTrialDepth] = useState("");
  const number = (key: string) => inputs[key].trim() ? Number(inputs[key]) : NaN;
  const result = blindingSlab(number("width"), number("length"), number("pressure"), number("soil"), number("density"));
  const entered = trialProjection.trim() !== "" || trialDepth.trim() !== "";
  // With nothing entered, check the suggested size: minimum thickness rounded up to 50 mm, projection equal to thickness.
  const suggested = result ? Math.max(50, Math.ceil(result.thickness / 50) * 50) / 1000 : NaN;
  const projection = trialProjection.trim() ? Number(trialProjection) / 1000 : entered ? NaN : suggested;
  const depth = trialDepth.trim() ? Number(trialDepth) / 1000 : entered ? NaN : suggested;
  const trialWidth = number("width") + 2 * projection;
  const trialLength = number("length") + 2 * projection;
  const effectiveProjection = Math.min(projection, depth);
  const effectiveArea = (number("width") + 2 * effectiveProjection) * (number("length") + 2 * effectiveProjection);
  const trialVolume = trialWidth * trialLength * depth;
  const trialMass = trialVolume * number("density");
  const trialPressure = result ? (result.force + trialMass * 9.80665) / effectiveArea : NaN;
  const hasTrial = projection >= 0 && depth > 0 && [trialWidth, trialLength, trialVolume, trialMass, trialPressure].every(Number.isFinite);
  const soil = number("soil");
  const adopted = hasTrial ? Math.round(depth * 1000) : NaN;

  return <div className="content calc-content bridge-tool">
    <TitleRow eyebrow="BRIDGE SUBSTRUCTURE · FOOTING" title="Blinding Slab"
      subtitle="Size a centred blinding slab under an existing footing so the soil pressure stays within the allowable value. Method from the Lodson Road Bridge blinding slab workbook (A2914643), 1H:1V load spread." />
    <div className="calc-layout"><div>
      <Card step="1" title="Footing and soil">
        <div className="calc-fields">
          {fields.map(([key, label, unit, hint]) => <Field key={key} label={label} unit={unit} hint={hint || undefined} value={inputs[key]}
            onChange={value => setInputs({ ...inputs, [key]: value })} />)}
        </div>
        <p className="answer-note">Starting values are the workbook example. Required area = applied load ÷ allowable pressure. The slab extends the same distance a/2 past every edge, solved directly from (x + a)(y + a) = required area, so no Excel Solver step is needed.</p>
      </Card>

      {result ? <>
        <Card step="2" title="Slab with spread on all sides">
          <Plan width={number("width")} length={number("length")} slabWidth={result.slabWidth} slabLength={result.slabLength} />
          <div className="storage-table" style={{ maxHeight: "none" }}><table><tbody>
            <tr><td style={{ textAlign: "left" }}>Existing footing area A1 = x1 × y1</td><td>{fmt(result.area, 3)} m²</td></tr>
            <tr><td style={{ textAlign: "left" }}>Applied vertical load F = A1 × P</td><td>{fmt(result.force, 1)} kN</td></tr>
            <tr><td style={{ textAlign: "left" }}>Required bearing area A2 = F ÷ q allow</td><td>{fmt(result.requiredArea, 3)} m²</td></tr>
            <tr><td style={{ textAlign: "left" }}>Slab width x2 = x1 + a</td><td>{fmt(result.slabWidth, 3)} m</td></tr>
            <tr><td style={{ textAlign: "left" }}>Slab length y2 = y1 + a</td><td>{fmt(result.slabLength, 3)} m</td></tr>
            <tr><td style={{ textAlign: "left" }}>Projection each edge a/2</td><td>{fmt(result.projection * 1000, 0)} mm</td></tr>
            <tr><td style={{ textAlign: "left" }}>Minimum thickness (1H:1V), rounded up</td><td><strong>{result.thickness} mm</strong></td></tr>
            <tr><td style={{ textAlign: "left" }}>Concrete volume / mass</td><td>{fmt(result.volume, 2)} m³ / {fmt(result.mass, 2)} t</td></tr>
            <tr><td style={{ textAlign: "left" }}>Soil pressure incl. slab weight</td><td>{fmt(result.pressureWithWeight, 1)} kPa</td></tr>
          </tbody></table></div>
          {result.thickness > 0 && result.pressureWithWeight > soil + 1e-9 && <div className="warning"><div>!</div><p>With the slab weight added the minimum plan slightly exceeds the allowable pressure. The rounded up size in step 3 is checked with the slab weight included.</p></div>}
        </Card>

        <Card step="3" title="Check the size you adopt">
          <div className="calc-fields">
            <Field label="Adopted projection each edge" unit="mm" hint={`Minimum ${fmt(result.projection * 1000, 0)} mm. Blank = suggested`} placeholder={fmt(suggested * 1000, 0)} value={trialProjection} onChange={setTrialProjection} />
            <Field label="Adopted slab thickness" unit="mm" hint="Blank = minimum rounded up to 50 mm" placeholder={fmt(suggested * 1000, 0)} value={trialDepth} onChange={setTrialDepth} />
          </div>
          {hasTrial ? <div className="storage-table" style={{ maxHeight: "none", marginTop: 14 }}><table><tbody>
            <tr><td style={{ textAlign: "left" }}>Adopted slab</td><td>{fmt(trialLength, 2)} × {fmt(trialWidth, 2)} × {fmt(depth, 3)} m</td></tr>
            <tr><td style={{ textAlign: "left" }}>Effective bearing area (spread limited to thickness)</td><td>{fmt(effectiveArea, 3)} m²</td></tr>
            <tr><td style={{ textAlign: "left" }}>Concrete volume / mass</td><td>{fmt(trialVolume, 2)} m³ / {fmt(trialMass, 2)} t</td></tr>
            <tr><td style={{ textAlign: "left" }}>Soil pressure incl. slab weight</td><td className={trialPressure <= soil + 1e-9 ? "pass" : "fail"}>{fmt(trialPressure, 1)} kPa</td></tr>
          </tbody></table></div> : <p className="answer-note">Enter both a projection and a thickness.</p>}
        </Card>

        <Card step="4" title="Workbook 1 m strip check (width spread only)">
          <div className="storage-table" style={{ maxHeight: "none" }}><table><tbody>
            <tr><td style={{ textAlign: "left" }}>Load per metre</td><td>{fmt(result.stripReaction, 1)} kN/m</td></tr>
            <tr><td style={{ textAlign: "left" }}>Required width</td><td>{fmt(result.stripWidth, 3)} m</td></tr>
            <tr><td style={{ textAlign: "left" }}>Projection each side = thickness</td><td>{result.stripThickness} mm</td></tr>
          </tbody></table></div>
          <p className="answer-note">Ignores spread past the footing ends, so it is slightly conservative. This matches the workbook Sheet2 check.</p>
        </Card>
      </> : <div className="warning"><div>!</div><p>Enter positive footing dimensions, allowable soil pressure and concrete density, and an applied pressure of zero or more.</p></div>}
    </div>

    <aside className="calc-results results-card">
      <p className="eyebrow">BLINDING SLAB</p>
      <ResultHero label={entered ? "Adopted thickness" : "Suggested thickness (rounded up to 50 mm)"} value={Number.isFinite(adopted) ? String(adopted) : "—"} unit="mm" />
      <div className="check-row">
        <Check ok={result && hasTrial ? trialPressure <= soil + 1e-9 : null} pass={`${fmt(trialPressure, 1)} kPa ≤ ${fmt(soil, 0)} kPa allowable`} fail={`${fmt(trialPressure, 1)} kPa > ${fmt(soil, 0)} kPa allowable`} />
      </div>
      {result && <>
        <Metric name="Minimum thickness" value={`${result.thickness} mm`} />
        <Metric name="Slab plan" value={`${fmt(result.slabLength, 2)} × ${fmt(result.slabWidth, 2)} m`} />
        <Metric name="Required bearing area" value={`${fmt(result.requiredArea, 3)} m²`} />
        <Metric name="Concrete volume" value={`${fmt(hasTrial ? trialVolume : result.volume, 2)} m³`} />
        <Metric name="Concrete mass" value={`${fmt(hasTrial ? trialMass : result.mass, 2)} t`} />
        <Metric name="Strip check thickness" value={`${result.stripThickness} mm`} />
      </>}
      <p className="answer-note" style={{ marginTop: 12 }}>Workbook assumes 32 MPa concrete. Confirm bearing and settlement with the geotechnical report.</p>
    </aside></div>
  </div>;
}
