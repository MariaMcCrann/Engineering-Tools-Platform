"use client";

import { useMemo, useState } from "react";

const G = 9.81;
const NU = 1.01e-6; // m2/s, water at about 20 C - matches source workbook

const MATERIALS = {
  HDPE: { roughnessMm: 0.007, manningN: 0.009 },
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
  const [length, setLength] = useState("20");
  const [flow, setFlow] = useState("15");
  const [lossK, setLossK] = useState("1.5");
  const [customRoughness, setCustomRoughness] = useState("0.15");
  const [upstreamHgl, setUpstreamHgl] = useState("");

  const roughnessMm = material === "Custom" ? num(customRoughness) : MATERIALS[material].roughnessMm;

  const result = useMemo<Result | null>(() => {
    const d = num(diameter) / 1000;
    const l = num(length);
    const q = num(flow) / 86.4; // ML/d to m3/s
    const k = num(lossK);
    const e = roughnessMm / 1000;
    if (![d, l, q, e].every(Number.isFinite) || d <= 0 || l < 0 || q <= 0 || e < 0 || k < 0) return null;

    const area = Math.PI * d * d / 4;
    const velocity = q / area;
    const reynolds = velocity * d / NU;
    const frictionFactor = colebrookFrictionFactor(reynolds, e / d);
    const velocityHead = velocity * velocity / (2 * G);
    const frictionLoss = frictionFactor * (l / d) * velocityHead;
    const minorLoss = k * velocityHead;
    const totalLoss = frictionLoss + minorLoss;
    const hydraulicGradient = l > 0 ? frictionLoss / l : 0;

    return { flowM3s: q, area, velocity, reynolds, frictionFactor, frictionLoss, minorLoss, totalLoss, hydraulicGradient };
  }, [diameter, length, flow, lossK, roughnessMm]);

  const downstreamHgl = result && upstreamHgl.trim() !== "" ? num(upstreamHgl) - result.totalLoss : null;

  const exportCsv = () => {
    if (!result) return;
    const rows = [
      ["Pipe Headloss Calculation", "Value", "Unit"],
      ["Material", material, ""],
      ["Internal diameter", diameter, "mm"],
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
                <select value={material} onChange={(e) => setMaterial(e.target.value as Material)}>
                  <option value="HDPE">HDPE</option>
                  <option value="RCP">RCP</option>
                  <option value="PVC">PVC</option>
                  <option value="Custom">Custom</option>
                </select>
              </label>
              <Field label="Internal diameter" value={diameter} unit="mm" onChange={setDiameter} />
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
