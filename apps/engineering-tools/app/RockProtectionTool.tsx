"use client";

import { useMemo, useState } from "react";

const G = 9.81;

const RIPRAP_CLASSES = [
  { cls: 1, d50: 125, lengthD: 4, depthFactor: 3.5 },
  { cls: 2, d50: 150, lengthD: 4, depthFactor: 3.3 },
  { cls: 3, d50: 250, lengthD: 5, depthFactor: 2.4 },
  { cls: 4, d50: 350, lengthD: 6, depthFactor: 2.2 },
  { cls: 5, d50: 500, lengthD: 7, depthFactor: 2.0 },
  { cls: 6, d50: 550, lengthD: 8, depthFactor: 2.0 },
] as const;

const num = (v: string) => Number(v);
const fmt = (v: number, d = 3) => Number.isFinite(v)
  ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
  : "—";

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (v: string) => void }) {
  return (
    <label className="calc-field">
      <span>{label}</span>
      {hint && <small>{hint}</small>}
      <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      {unit && <i>{unit}</i>}
    </label>
  );
}

function Metric({ name, value }: { name: string; value: string }) {
  return <div className="metric"><span>{name}</span><strong>{value}</strong></div>;
}

export function RockProtectionTool() {
  const [flowMLd, setFlowMLd] = useState("13");
  const [diameterMm, setDiameterMm] = useState("560");
  const [tailwaterM, setTailwaterM] = useState("0.30");
  const [specificGravity, setSpecificGravity] = useState("2.65");
  const [outletVelocity, setOutletVelocity] = useState("");

  const result = useMemo(() => {
    const q = num(flowMLd) / 86.4;
    const d = num(diameterMm) / 1000;
    const twRaw = num(tailwaterM);
    const tw = Math.max(0.4 * d, twRaw);
    const area = Math.PI * d * d / 4;
    const barrelV = q / area;
    const designV = outletVelocity.trim() ? num(outletVelocity) : barrelV;

    // FHWA HEC-14 Eq. 10.4 / Appendix D form for circular culvert riprap apron sizing.
    const intensity = q / (Math.sqrt(G) * Math.pow(d, 2.5));
    const d50Hec14 = 0.2 * d * Math.pow(intensity, 4 / 3) * (d / tw);

    // Velocity-only cross-check from HEC-14 Appendix D (Berry/Peterka form).
    const d50Velocity = 0.0413 * designV * designV;

    // Specific-gravity-sensitive cross-check from HEC-14 Appendix D / HEC-11 form.
    const sg = Math.max(1.01, num(specificGravity));
    const d50Sg = (0.692 / (sg - 1)) * (designV * designV / (2 * G));

    const designD50 = Math.max(d50Hec14, d50Velocity, d50Sg);
    const riprapClass = RIPRAP_CLASSES.find((r) => r.d50 / 1000 >= designD50) ?? null;
    const apronLength = riprapClass ? riprapClass.lengthD * d : NaN;
    const apronDepth = riprapClass ? riprapClass.depthFactor * (riprapClass.d50 / 1000) : NaN;

    return {
      q, d, twRaw, tw, area, barrelV, designV,
      d50Hec14, d50Velocity, d50Sg, designD50,
      riprapClass, apronLength, apronDepth,
      twAdjusted: twRaw < 0.4 * d,
      tailwaterRatio: d > 0 ? twRaw / d : NaN,
    };
  }, [flowMLd, diameterMm, tailwaterM, specificGravity, outletVelocity]);

  const exportCsv = () => {
    const rows = [
      ["Input / Result", "Value", "Unit"],
      ["Design flow", flowMLd, "ML/d"],
      ["Design flow", result.q, "m3/s"],
      ["Culvert diameter/rise", diameterMm, "mm"],
      ["Tailwater depth entered", tailwaterM, "m"],
      ["Tailwater used in HEC-14 equation", result.tw, "m"],
      ["Outlet velocity", result.designV, "m/s"],
      ["HEC-14 D50", result.d50Hec14 * 1000, "mm"],
      ["Velocity cross-check D50", result.d50Velocity * 1000, "mm"],
      ["Specific gravity cross-check D50", result.d50Sg * 1000, "mm"],
      ["Governing D50", result.designD50 * 1000, "mm"],
      ["Selected riprap class", result.riprapClass?.cls ?? "Beyond class table", ""],
      ["Selected class D50", result.riprapClass?.d50 ?? "", "mm"],
      ["Apron length", result.apronLength, "m"],
      ["Apron depth", result.apronDepth, "m"],
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "rock-protection-sizing.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="content">
      <div className="title-row">
        <div>
          <p className="eyebrow">CULVERT OUTLET PROTECTION</p>
          <h1>Rock Protection / Riprap</h1>
          <p className="subtitle">Preliminary D50 and apron sizing using FHWA HEC-14 guidance, with velocity-based cross-checks.</p>
        </div>
      </div>

      <div className="calc-layout">
        <div>
          <section className="calc-card">
            <div className="calc-card-title"><b>1</b><h2>Hydraulic inputs</h2></div>
            <div className="calc-fields">
              <Field label="Design flow" value={flowMLd} unit="ML/d" onChange={setFlowMLd} />
              <Field label="Culvert diameter / rise" value={diameterMm} unit="mm" onChange={setDiameterMm} />
              <Field label="Tailwater depth" value={tailwaterM} unit="m" hint="HEC-14 uses a minimum of 0.4D in the apron equation" onChange={setTailwaterM} />
              <Field label="Rock specific gravity" value={specificGravity} hint="Typical competent rock ≈ 2.65" onChange={setSpecificGravity} />
              <Field label="Outlet velocity override" value={outletVelocity} unit="m/s" hint="Leave blank to use Q / full circular area" onChange={setOutletVelocity} />
            </div>
          </section>

          {result.twAdjusted && (
            <div className="warning"><div>!</div><p><strong>Tailwater adjusted for the HEC-14 equation.</strong><br />Entered TW/D = {fmt(result.tailwaterRatio, 2)}. The sizing equation is using TW = 0.4D = {fmt(result.tw)} m for the preliminary apron check.</p></div>
          )}

          <section className="calc-card">
            <div className="calc-card-title"><b>2</b><h2>Rock sizing checks</h2></div>
            <div className="storage-table">
              <table>
                <thead><tr><th>Method</th><th>D50</th><th>Purpose</th></tr></thead>
                <tbody>
                  <tr><td><strong>HEC-14 culvert apron</strong></td><td>{fmt(result.d50Hec14 * 1000, 0)} mm</td><td>Primary circular culvert outlet-apron sizing check</td></tr>
                  <tr><td>HEC-14 velocity form</td><td>{fmt(result.d50Velocity * 1000, 0)} mm</td><td>Velocity-only cross-check</td></tr>
                  <tr><td>Specific-gravity velocity form</td><td>{fmt(result.d50Sg * 1000, 0)} mm</td><td>Checks sensitivity to rock density</td></tr>
                  <tr><td><strong>Governing calculated D50</strong></td><td><strong>{fmt(result.designD50 * 1000, 0)} mm</strong></td><td>Largest of the three preliminary checks</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="calc-card">
            <div className="calc-card-title"><b>3</b><h2>HEC-14 apron class reference</h2></div>
            <div className="storage-table">
              <table>
                <thead><tr><th>Class</th><th>D50</th><th>Apron length</th><th>Apron depth</th></tr></thead>
                <tbody>{RIPRAP_CLASSES.map((r) => (
                  <tr key={r.cls}><td>Class {r.cls}</td><td>{r.d50} mm</td><td>{r.lengthD}D</td><td>{r.depthFactor} × D50</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="results-card">
          <p className="eyebrow">PRELIMINARY DESIGN</p>
          <div className="result-main">
            <strong>{result.riprapClass ? `Class ${result.riprapClass.cls}` : "> Class 6"}</strong>
            <span>{result.riprapClass ? `D50 = ${result.riprapClass.d50} mm` : "Site-specific energy dissipation review required"}</span>
          </div>
          <Metric name="Design flow" value={`${fmt(result.q)} m³/s`} />
          <Metric name="Outlet velocity used" value={`${fmt(result.designV)} m/s`} />
          <Metric name="Governing calculated D50" value={`${fmt(result.designD50 * 1000, 0)} mm`} />
          <Metric name="Apron length" value={result.riprapClass ? `${fmt(result.apronLength, 2)} m` : "—"} />
          <Metric name="Apron depth" value={result.riprapClass ? `${fmt(result.apronDepth, 2)} m` : "—"} />
          <p className="answer-note">Use this as a preliminary erosion-protection check, not a substitute for site-specific assessment of downstream channel geometry, tailwater, turbulence, scour, bank stability, filter/geotextile requirements and constructability.</p>
          <button className="download-btn" onClick={exportCsv}>↓ Export sizing CSV</button>
        </aside>
      </div>

      <section className="calc-card">
        <div className="calc-card-title"><b>i</b><h2>Method note</h2></div>
        <p className="answer-note">The uploaded regulator spreadsheet references “Earthworks and Beaching” but does not contain a dedicated rock-sizing calculation. This tool therefore identifies its design basis explicitly as FHWA HEC-14 rather than presenting the calculation as a direct conversion of the spreadsheet.</p>
      </section>
    </div>
  );
}
