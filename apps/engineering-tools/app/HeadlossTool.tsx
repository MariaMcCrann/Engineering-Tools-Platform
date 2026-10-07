"use client";

import { useMemo, useState } from "react";

type PipeSize = { nominal: number; hdpe?: number; rcp?: number; pvc?: number };
const PIPE_SIZES: PipeSize[] = [
  { nominal: 150, hdpe: 150, pvc: 153.4 },
  { nominal: 200, hdpe: 189 },
  { nominal: 225, hdpe: 213, pvc: 240.8 },
  { nominal: 250, hdpe: 237 },
  { nominal: 280, hdpe: 266 },
  { nominal: 300, rcp: 300, pvc: 303.1 },
  { nominal: 315, hdpe: 299 },
  { nominal: 355, hdpe: 334 },
  { nominal: 375, rcp: 375, pvc: 285.1 },
  { nominal: 400, hdpe: 369.5 },
  { nominal: 450, hdpe: 427, rcp: 450 },
  { nominal: 500, hdpe: 452 },
  { nominal: 560, hdpe: 506 },
  { nominal: 600, rcp: 610 },
  { nominal: 630, hdpe: 597 },
  { nominal: 710, hdpe: 676 },
  { nominal: 750, rcp: 760 },
  { nominal: 800, hdpe: 723.4 },
  { nominal: 900, hdpe: 858, rcp: 910 },
  { nominal: 1000, hdpe: 949 },
  { nominal: 1050, rcp: 1070 },
  { nominal: 1200, rcp: 1220 },
  { nominal: 1350, rcp: 1370 },
  { nominal: 1500, rcp: 1524 },
  { nominal: 1650, rcp: 1676 },
  { nominal: 1800, rcp: 1828 },
];
const BOX_SIZES = ["375 x 225", "450 x 225", "450 x 300", "600 x 300", "600 x 450", "600 x 600", "750 x 300", "750 x 450", "750 x 600", "750 x 750", "900 x 300", "900 x 450", "900 x 600", "900 x 750", "900 x 900", "1200 x 300", "1200 x 450", "1200 x 600", "1200 x 750", "1200 x 900", "1200 x 1200", "1500 x 600", "1500 x 750", "1500 x 900", "1500 x 1200", "1500 x 1500", "1800 x 600", "1800 x 750", "1800 x 900", "1800 x 1200", "1800 x 1500", "1800 x 1800", "2100 x 600", "2100 x 750", "2100 x 900", "2100 x 1200", "2100 x 1500", "2100 x 1800", "2100 x 2100", "2400 x 600", "2400 x 750", "2400 x 900", "2400 x 1200", "2400 x 1500", "2400 x 1800", "2400 x 2100", "2400 x 2400", "2700 x 600", "2700 x 750", "2700 x 900", "2700 x 1200", "2700 x 1500", "2700 x 1800", "2700 x 2100", "2700 x 2400", "2700 x 2700", "3000 x 600", "3000 x 750", "3000 x 900", "3000 x 1200", "3000 x 1500", "3000 x 1800", "3000 x 2100", "3000 x 2400", "3000 x 2700", "3000 x 3000", "3300 x 600", "3300 x 750", "3300 x 900", "3300 x 1200", "3300 x 1500", "3300 x 1800", "3300 x 2100", "3300 x 2400", "3300 x 2700", "3300 x 3000", "3300 x 3300", "3600 x 600", "3600 x 750", "3600 x 900", "3600 x 1200", "3600 x 1500", "3600 x 1800", "3600 x 2100", "3600 x 2400", "3600 x 2700", "3600 x 3000", "3600 x 3300", "3600 x 3600", "4200 x 600", "4200 x 750", "4200 x 900", "4200 x 1200", "4200 x 1500", "4200 x 1800", "4200 x 2100", "4200 x 2400", "4200 x 2700", "4200 x 3000", "4200 x 3300", "4200 x 3600"];
const G = 9.81;
const NU = 1.01e-6; // m2/s, water at about 20 C - matches source workbook

const MATERIALS = {
  HDPE: { roughnessMm: 0.007, manningN: 0.009 },
  "RCP Box": { roughnessMm: 0.15, manningN: 0.012 },
  RCP: { roughnessMm: 0.15, manningN: 0.012 },
  PVC: { roughnessMm: 0.003, manningN: 0.009 },
  Custom: { roughnessMm: 0.15, manningN: 0.012 },
} as const;

type Material = keyof typeof MATERIALS;

type Result = {
  flowM3s: number;
  area: number;
  velocity: number;
  reynolds: number;
  frictionFactor: number;
  frictionLoss: number;
  minorLoss: number;
  totalLoss: number;
  hydraulicGradient: number;
};

const num = (value: string) => Number(value);
const fmt = (value: number, digits = 3) =>
  Number.isFinite(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

function colebrookFrictionFactor(reynolds: number, relativeRoughness: number) {
  if (!(reynolds > 0)) return NaN;
  if (reynolds < 2300) return 64 / reynolds;

  // Swamee-Jain provides a stable starting point, then fixed-point Colebrook iterations.
  let f = 0.25 / Math.pow(Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynolds, 0.9)), 2);
  for (let i = 0; i < 30; i += 1) {
    const invSqrtF = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (reynolds * Math.sqrt(f)));
    const next = 1 / (invSqrtF * invSqrtF);
    if (Math.abs(next - f) < 1e-10) return next;
    f = next;
  }
  return f;
}

function Field({ label, value, unit, hint, onChange }: { label: string; value: string; unit?: string; hint?: string; onChange: (value: string) => void }) {
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

export function HeadlossTool() {
  const [material, setMaterial] = useState<Material>("RCP");
  const [diameter, setDiameter] = useState("600");
  const [size, setSize] = useState("custom");
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("900");
  const isBox = material === "RCP Box";
  const pipeSizes = PIPE_SIZES.filter((p) => p[material.toLowerCase() as "hdpe" | "rcp" | "pvc"]);
  const [length, setLength] = useState("20");
  const [flow, setFlow] = useState("15");
  const [lossK, setLossK] = useState("1.5");
  const [customRoughness, setCustomRoughness] = useState("0.15");
  const [upstreamHgl, setUpstreamHgl] = useState("");

  const roughnessMm = material === "Custom" ? num(customRoughness) : MATERIALS[material].roughnessMm;

  const result = useMemo<Result | null>(() => {
    const w = num(width) / 1000, h = num(height) / 1000;
    const d = isBox ? 2 * w * h / (w + h) : num(diameter) / 1000;
    const l = num(length);
    const q = num(flow) / 86.4; // ML/d to m3/s
    const k = num(lossK);
    const e = roughnessMm / 1000;
    if (![d, l, q, e, k].every(Number.isFinite) || d <= 0 || l < 0 || q <= 0 || e < 0 || k < 0 || (isBox && (!(w > 0) || !(h > 0)))) return null;

    const area = isBox ? w * h : Math.PI * d * d / 4;
    const velocity = q / area;
    const reynolds = velocity * d / NU;
    const frictionFactor = colebrookFrictionFactor(reynolds, e / d);
    const velocityHead = velocity * velocity / (2 * G);
    const frictionLoss = frictionFactor * (l / d) * velocityHead;
    const minorLoss = k * velocityHead;
    const totalLoss = frictionLoss + minorLoss;
    const hydraulicGradient = l > 0 ? frictionLoss / l : 0;

    return { flowM3s: q, area, velocity, reynolds, frictionFactor, frictionLoss, minorLoss, totalLoss, hydraulicGradient };
  }, [diameter, width, height, isBox, length, flow, lossK, roughnessMm]);

  const downstreamHgl = result && upstreamHgl.trim() !== "" ? num(upstreamHgl) - result.totalLoss : null;

  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ["Pipe Headloss Calculation", "Value", "Unit"],
      ["Material", material, ""],
      ...(isBox ? [["Internal width", width, "mm"], ["Internal height", height, "mm"]] : [["Internal diameter", diameter, "mm"]]),
      ["Pipe length", length, "m"],
      ["Design flow", flow, "ML/d"],
      ["Design flow", result.flowM3s, "m3/s"],
      ["Absolute roughness", roughnessMm, "mm"],
      ["Minor loss coefficient K", lossK, ""],
      ["Velocity", result.velocity, "m/s"],
      ["Reynolds number", result.reynolds, ""],
      ["Darcy friction factor", result.frictionFactor, ""],
      ["Friction loss hf", result.frictionLoss, "m"],
      ["Minor losses hs", result.minorLoss, "m"],
      ["Total headloss", result.totalLoss, "m"],
      ["Hydraulic gradient", result.hydraulicGradient, "m/m"],
    ];
    if (downstreamHgl !== null) rows.push(["Downstream HGL", downstreamHgl, "m AHD"]);
    const csv = rows.map((row) => row.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "pipe-headloss-calculation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="content">
      <div className="title-row">
        <div>
          <p className="eyebrow">HYDRAULIC CALCULATOR</p>
          <h1>Pipe Headloss</h1>
          <p className="subtitle">Colebrook–White friction and minor-loss calculation for full-flow pipes and culverts.</p>
        </div>
      </div>

      <div className="calc-layout">
        <div>
          <section className="calc-card">
            <div className="calc-card-title"><b>1</b><h2>Pipe and design flow</h2></div>
            <div className="calc-fields">
              <label className="calc-field">
                <span>Pipe material</span>
                <select value={material} onChange={(e) => { setMaterial(e.target.value as Material); setSize("custom"); }}>
                  <option value="HDPE">HDPE</option>
                  <option value="RCP">RCP Circular</option><option value="RCP Box">Concrete box culvert</option>
                  <option value="PVC">PVC</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <label className="calc-field"><span>Standard size</span><select value={size} onChange={(e) => {
                const selected = e.target.value; setSize(selected); if (selected === "custom") return;
                if (isBox) { const [w, h] = selected.split(" x "); setWidth(w); setHeight(h); }
                else { const row = pipeSizes.find((p) => String(p.nominal) === selected); const id = row?.[material.toLowerCase() as "hdpe" | "rcp" | "pvc"]; if (id) setDiameter(String(id)); }
              }}><option value="custom">Custom dimensions</option>{isBox ? BOX_SIZES.map((box) => <option key={box} value={box}>{box.replace(" x ", " × ")} mm</option>) : pipeSizes.map((p) => <option key={p.nominal} value={p.nominal}>DN{p.nominal}</option>)}</select></label>
              {isBox ? <><Field label="Internal width" value={width} unit="mm" onChange={(v) => { setWidth(v); setSize("custom"); }} /><Field label="Internal height" value={height} unit="mm" onChange={(v) => { setHeight(v); setSize("custom"); }} /></> : <Field label="Internal diameter" value={diameter} unit="mm" onChange={(v) => { setDiameter(v); setSize("custom"); }} />}
              <p className="answer-note">Full-flow closed conduits only. Boxes use hydraulic diameter 4A/P. Box presets are nominal internal sizes from the existing culvert workbook list; confirm actual manufacturer dimensions. Circular pipe IDs match Pipeline HGL.</p>
              <Field label="Pipe length" value={length} unit="m" onChange={setLength} />
              <Field label="Design flow" value={flow} unit="ML/d" hint={result ? `${fmt(result.flowM3s, 4)} m³/s` : undefined} onChange={setFlow} />
              {material === "Custom" && <Field label="Absolute roughness, k" value={customRoughness} unit="mm" onChange={setCustomRoughness} />}
            </div>
          </section>

          <section className="calc-card">
            <div className="calc-card-title"><b>2</b><h2>Minor losses</h2></div>
            <div className="calc-fields">
              <Field label="Combined loss coefficient, K" value={lossK} hint="Workbook default is 1.5 for entry + exit" onChange={setLossK} />
            </div>
            <p className="answer-note">Use the combined K for entrance, exit, bends, valves or other fittings included in the reach.</p>
          </section>

          <section className="calc-card">
            <div className="calc-card-title"><b>3</b><h2>Hydraulic grade line (optional)</h2></div>
            <div className="calc-fields">
              <Field label="Upstream HGL / water level" value={upstreamHgl} unit="m AHD" onChange={setUpstreamHgl} />
            </div>
          </section>
        </div>

        <aside className="results-card">
          <p className="eyebrow">TOTAL HEADLOSS</p>
          <div className="result-main"><strong>{result ? fmt(result.totalLoss) : "—"}</strong><span>m</span></div>
          {result && <>
            <div className="check-row">
              <span className={result.velocity <= 1.5 ? "pass" : result.velocity <= 2.5 ? "warn" : "fail"}>
                {result.velocity <= 1.5 ? "✓ Velocity ≤ 1.5 m/s" : result.velocity <= 2.5 ? "! Review velocity" : "✕ High velocity"}
              </span>
              <span className={result.reynolds >= 4000 ? "pass" : "warn"}>{result.reynolds >= 4000 ? "✓ Turbulent flow" : "! Non-turbulent regime"}</span>
            </div>
            <Metric name="Velocity" value={`${fmt(result.velocity)} m/s`} />
            <Metric name="Flow area" value={`${fmt(result.area, 4)} m²`} />
            <Metric name="Reynolds number" value={fmt(result.reynolds, 0)} />
            <Metric name="Absolute roughness" value={`${fmt(roughnessMm, 3)} mm`} />
            <Metric name="Darcy friction factor" value={fmt(result.frictionFactor, 5)} />
            <Metric name="Friction loss, hf" value={`${fmt(result.frictionLoss)} m`} />
            <Metric name="Minor losses, hs" value={`${fmt(result.minorLoss)} m`} />
            <Metric name="Hydraulic gradient" value={`${fmt(result.hydraulicGradient, 5)} m/m`} />
            {downstreamHgl !== null && Number.isFinite(downstreamHgl) && <Metric name="Downstream HGL" value={`${fmt(downstreamHgl)} m AHD`} />}
            <p className="answer-note">Colebrook–White calculation uses water kinematic viscosity 1.01×10⁻⁶ m²/s, consistent with the source spreadsheet at approximately 20°C.</p>
            <button className="download-btn" onClick={exportCsv}>↓ Export CSV</button>
          </>}
        </aside>
      </div>
    </div>
  );
}
