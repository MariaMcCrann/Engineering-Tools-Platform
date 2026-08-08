"use client";

import { FormEvent, useMemo, useState } from "react";

type DurationRow = {
  minutes: number;
  label: string;
  intensities: Record<string, number>;
};

type IfdResponse = {
  address: string;
  latitude: number;
  longitude: number;
  gridLatitude: number;
  gridLongitude: number;
  issued: string;
  sourceUrl: string;
  aeps: string[];
  durations: DurationRow[];
};

const RUNOFF_OPTIONS = [
  ["0.20", "0.20 — Parks / dense vegetation"],
  ["0.35", "0.35 — Lawns / sandy residential"],
  ["0.50", "0.50 — Mixed residential"],
  ["0.65", "0.65 — Dense residential"],
  ["0.80", "0.80 — Commercial / paved"],
  ["0.90", "0.90 — Roofs / impervious"],
  ["custom", "Custom coefficient"],
] as const;

export function RationalMethodTool() {
  const [address, setAddress] = useState("");
  const [ifd, setIfd] = useState<IfdResponse | null>(null);
  const [aep, setAep] = useState("1%");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState("");
  const [intensitySource, setIntensitySource] = useState<"bom" | "manual">("manual");
  const [area, setArea] = useState("1");
  const [areaUnit, setAreaUnit] = useState<"ha" | "km2">("ha");
  const [coefficientChoice, setCoefficientChoice] = useState("0.50");
  const [customCoefficient, setCustomCoefficient] = useState("0.50");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const coefficient = Number(coefficientChoice === "custom" ? customCoefficient : coefficientChoice);
  const areaHa = Number(area) * (areaUnit === "km2" ? 100 : 1);
  const rainfallIntensity = Number(intensity);
  const flow = coefficient * rainfallIntensity * areaHa / 360;
  const validResult = [coefficient, rainfallIntensity, areaHa].every((value) => Number.isFinite(value) && value > 0) && coefficient <= 1;

  const selectedRow = useMemo(
    () => ifd?.durations.find((row) => row.minutes === duration),
    [ifd, duration],
  );

  const applyBomIntensity = (nextAep: string, nextDuration: number, data = ifd) => {
    const value = data?.durations.find((row) => row.minutes === nextDuration)?.intensities[nextAep];
    if (typeof value === "number" && Number.isFinite(value)) {
      setIntensity(String(value));
      setIntensitySource("bom");
    }
  };

  const retrieveIfd = async (event: FormEvent) => {
    event.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rational-ifd?address=${encodeURIComponent(address.trim())}`);
      const body = await response.json() as IfdResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "The IFD data could not be retrieved.");
      setIfd(body);
      const nextAep = body.aeps.includes(aep) ? aep : body.aeps.at(-1) || "1%";
      const nextDuration = body.durations.some((row) => row.minutes === duration) ? duration : body.durations[0]?.minutes;
      if (!nextDuration) throw new Error("BoM returned no standard duration data.");
      setAep(nextAep);
      setDuration(nextDuration);
      applyBomIntensity(nextAep, nextDuration, body);
    } catch (reason) {
      setIfd(null);
      setError(reason instanceof Error ? reason.message : "The IFD data could not be retrieved.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content calc-content rational-tool">
      <div className="title-row">
        <div>
          <p className="eyebrow">HYDROLOGY CALCULATOR</p>
          <h1>Rational Method Runoff</h1>
          <p className="subtitle">Estimate peak runoff using Q = CIA / 360 and site-specific 2016 BoM IFD intensity.</p>
        </div>
        <span className="condition-pill">Peak Flow</span>
      </div>

      <div className="calc-layout">
        <div>
          <section className="calc-card">
            <div className="calc-card-title"><b>1</b><h2>Site and design rainfall</h2></div>
            <form className="address-lookup" onSubmit={retrieveIfd}>
              <label>
                Australian address
                <span className="address-control">
                  <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="e.g. 15 Bridge Street, Bendigo VIC" />
                  <button type="submit" disabled={loading || !address.trim()}>{loading ? "Retrieving…" : "Get BoM IFD"}</button>
                </span>
              </label>
            </form>
            {error && <div className="error">⚠ {error}</div>}
            {ifd && (
              <div className="ifd-site-summary">
                <strong>{ifd.address}</strong>
                <span>Input: {ifd.latitude.toFixed(5)}, {ifd.longitude.toFixed(5)}</span>
                <span>Nearest BoM grid cell: {Math.abs(ifd.gridLatitude).toFixed(4)}°S, {ifd.gridLongitude.toFixed(4)}°E</span>
                <span>Issued: {ifd.issued}</span>
              </div>
            )}
            <div className="calc-fields rational-ifd-fields">
              <label className="calc-field">
                <span>Annual exceedance probability (AEP)</span>
                <select value={aep} disabled={!ifd} onChange={(event) => { setAep(event.target.value); applyBomIntensity(event.target.value, duration); }}>
                  {(ifd?.aeps ?? ["63.2%", "50%", "20%", "10%", "5%", "2%", "1%"]).map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="calc-field">
                <span>Storm duration</span>
                <select value={duration} disabled={!ifd} onChange={(event) => { const value = Number(event.target.value); setDuration(value); applyBomIntensity(aep, value); }}>
                  {(ifd?.durations ?? []).map((row) => <option key={row.minutes} value={row.minutes}>{row.label}</option>)}
                  {!ifd && <option value={30}>Retrieve an address first</option>}
                </select>
              </label>
              <label className="calc-field">
                <span>Rainfall intensity</span>
                <input type="number" min="0" step="any" value={intensity} onChange={(event) => { setIntensity(event.target.value); setIntensitySource("manual"); }} placeholder="mm/h" />
                <i>mm/h</i>
                <small>{intensitySource === "bom" ? `BoM: ${aep} AEP, ${selectedRow?.label ?? "selected duration"}` : "Manual input"}</small>
              </label>
            </div>
          </section>

          <section className="calc-card">
            <div className="calc-card-title"><b>2</b><h2>Catchment inputs</h2></div>
            <div className="calc-fields">
              <label className="calc-field">
                <span>Catchment area</span>
                <input type="number" min="0" step="any" value={area} onChange={(event) => setArea(event.target.value)} />
                <i>{areaUnit === "km2" ? "km²" : "ha"}</i>
              </label>
              <label className="calc-field">
                <span>Area unit</span>
                <select value={areaUnit} onChange={(event) => setAreaUnit(event.target.value as "ha" | "km2")}>
                  <option value="ha">hectares (ha)</option>
                  <option value="km2">square kilometres (km²)</option>
                </select>
              </label>
              <label className="calc-field">
                <span>Runoff coefficient</span>
                <select value={coefficientChoice} onChange={(event) => setCoefficientChoice(event.target.value)}>
                  {RUNOFF_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {coefficientChoice === "custom" && (
                <label className="calc-field">
                  <span>Custom coefficient</span>
                  <input type="number" min="0.01" max="1" step="0.01" value={customCoefficient} onChange={(event) => setCustomCoefficient(event.target.value)} />
                  <small>Enter a value greater than 0 and no more than 1.0.</small>
                </label>
              )}
            </div>
            <p className="engine-note">Select the coefficient appropriate to the catchment surface and adopted design guidance. Typical values are prompts, not a substitute for project-specific judgement.</p>
          </section>
        </div>

        <aside className="calc-results">
          <p>CALCULATED PEAK RUNOFF</p>
          <div className="result-hero">
            <span>Peak discharge, Q</span>
            <strong>{validResult ? flow.toFixed(flow < 0.1 ? 4 : 3) : "—"}</strong><small>m³/s</small>
          </div>
          <div className="metric"><span>Peak discharge</span><strong>{validResult ? `${(flow * 1000).toFixed(1)} L/s` : "—"}</strong></div>
          <div className="metric"><span>Runoff coefficient, C</span><strong>{Number.isFinite(coefficient) ? coefficient.toFixed(2) : "—"}</strong></div>
          <div className="metric"><span>Rainfall intensity, I</span><strong>{rainfallIntensity > 0 ? `${rainfallIntensity} mm/h` : "—"}</strong></div>
          <div className="metric"><span>Catchment area, A</span><strong>{areaHa > 0 ? `${areaHa.toFixed(3)} ha` : "—"}</strong></div>
          <div className="rational-equation">
            <strong>Q = C × I × A / 360</strong>
            <span>{validResult ? `Q = ${coefficient.toFixed(3)} × ${rainfallIntensity} × ${areaHa.toFixed(3)} / 360` : "Complete the required inputs to calculate Q."}</span>
          </div>
          {ifd && <a className="bom-source-link" href={ifd.sourceUrl} target="_blank" rel="noreferrer">Open official BoM IFD result ↗</a>}
          <a className="geocode-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Address search © OpenStreetMap contributors</a>
          <p className="ifd-caution">Check the geocoded location and nearest 0.025° BoM grid cell before using the result. The Rational Method also assumes a design duration appropriate to the catchment time of concentration.</p>
        </aside>
      </div>
    </div>
  );
}
