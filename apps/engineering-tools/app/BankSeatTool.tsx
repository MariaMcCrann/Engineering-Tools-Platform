"use client";

import { useEffect, useState } from "react";
import { abutmentInputsKey, loadState, openBridgeTool, saveState, seatInputsKey, seatTransferKey, useClientReady, type SeatReactions } from "./bank-seat-transfer";
import { peakReaction, rectangularContactArea } from "./bank-seat-traffic";
import { BankSeatDiagram } from "./BankSeatDiagrams";
import { AS5100_FACTORS as F, EXAMPLE_SEAT as E, brakingForce, designLanes, permanentSeatReaction, seatTraffic } from "./bridge-calcs";
import { BridgeSteps, Card, Check, Field, Metric, ResultHero, Select, TitleRow, fmt } from "./BridgeUi";

const initial: Record<string, string> = {
  span: String(E.span), width: String(E.width), beams: String(E.beams), beamMass: String(E.beamMass),
  kerbs: String(E.kerbs), kerbMass: String(E.kerbMass), other: String(E.other), surfacing: String(E.surfacing), roadWidth: String(E.roadWidth),
  udl: "0", axleDynamic: "1.4", udlDynamic: "1",
  ulsG: String(F.deadUls), slsG: String(F.deadSls), ulsS: String(F.sdlUls), slsS: String(F.sdlSls), ulsQ: String(F.trafficUls), slsQ: String(F.trafficSls),
  padGShare: "", padSShare: "", padQShare: "", bearingG: "", bearingS: "", bearingQ: "",
  padLength: "", padWidth: "", area: "", resistance: "",
};

type SavedSeat = { v: Record<string, string>; model: string; train: string; padSource: string; padModel: string };

export function BankSeatTool() {
  const ready = useClientReady();
  // Remount once in the browser so inputs saved earlier in this session are restored.
  return <BankSeatForm key={ready ? "client" : "server"} saved={ready ? loadState<SavedSeat>(seatInputsKey) : null} persist={ready} />;
}

function BankSeatForm({ saved, persist }: { saved: SavedSeat | null; persist: boolean }) {
  const [v, setV] = useState(() => ({ ...initial, ...(saved?.v ?? {}) }));
  const [model, setModel] = useState(saved?.model ?? "sm1600");
  const [train, setTrain] = useState(saved?.train ?? "");
  const [padSource, setPadSource] = useState(saved?.padSource ?? "linked");
  const [padModel, setPadModel] = useState(saved?.padModel ?? "");
  const n = (key: string) => v[key]?.trim() ? Number(v[key]) : NaN;
  const set = (key: string) => (value: string) => setV({ ...v, [key]: value });
  const field = (key: string, label: string, unit?: string, hint?: string, placeholder?: string) =>
    <Field key={key} label={label} unit={unit} hint={hint} placeholder={placeholder} value={v[key]} onChange={set(key)} />;

  const span = n("span"), width = n("width"), beams = n("beams");
  const geometryOk = span > 0 && width > 0 && Number.isInteger(beams) && beams >= 0 && Number.isInteger(n("kerbs")) &&
    ["beamMass", "kerbMass", "other", "surfacing"].every(key => n(key) >= 0);
  const permanent = geometryOk ? permanentSeatReaction(beams, n("beamMass"), n("kerbs"), n("kerbMass"), n("other")) : NaN;
  const surfacing = geometryOk ? n("surfacing") : NaN;
  const lanes = designLanes(n("roadWidth"));
  const { rows: roadLoads, governing } = seatTraffic(span, lanes);

  const axles = train.split("\n").filter(line => line.trim()).map(line => line.trim().split(/[,\s]+/).map(Number));
  const validAxles = axles.length > 0 && axles.length <= 100 &&
    axles.every(row => row.length === 2 && row.every(Number.isFinite) && row[0] > 0 && row[1] >= 0) && axles[0][1] === 0;
  const customTraffic = span > 0 && validAxles && n("udl") >= 0 && n("axleDynamic") >= 1 && n("udlDynamic") >= 1
    ? peakReaction(span, axles) * n("axleDynamic") + n("udl") * span / 2 * n("udlDynamic") : NaN;
  const traffic = model === "sm1600" ? governing?.total ?? NaN : customTraffic;
  const braking = model === "sm1600" ? brakingForce(span, lanes) : null;

  const combine = (g: string, s: string, q: string) => permanent * n(g) + surfacing * n(s) + traffic * n(q);
  const uls = combine("ulsG", "ulsS", "ulsQ");
  const sls = combine("slsG", "slsS", "slsQ");

  const evenShare = beams > 0 ? 100 / beams : NaN;
  const share = (key: string, fallback: number) => v[key].trim() ? n(key) : fallback;
  const padTraffic = model === "sm1600" && padModel ? roadLoads.find(row => row.name === padModel)?.total ?? NaN : traffic;
  const linked = padSource === "linked";
  const padG = linked ? permanent * share("padGShare", evenShare) / 100 : n("bearingG");
  const padS = linked ? surfacing * share("padSShare", evenShare) / 100 : v.bearingS.trim() ? n("bearingS") : 0;
  const padQ = linked ? padTraffic * share("padQShare", NaN) / 100 : n("bearingQ");
  const padUls = padG * n("ulsG") + padS * n("ulsS") + padQ * n("ulsQ");
  const area = v.area.trim() ? n("area") : rectangularContactArea(n("padLength"), n("padWidth"));
  const pressure = area > 0 ? 1000 * padUls / area : NaN;
  const utilisation = n("resistance") > 0 ? padUls / n("resistance") : NaN;

  const ok = (value: number) => Number.isFinite(value) && value >= 0 ? value : null;
  const reactions: SeatReactions = {
    permanent: ok(permanent), superimposed: ok(surfacing), traffic: ok(traffic),
    trafficOptions: model === "sm1600" ? roadLoads.map(row => ({ name: row.name, value: row.total })) : [],
    span: ok(span), lanes: model === "sm1600" ? lanes : null, braking: braking ? braking.design : null,
    governing: model === "sm1600" ? governing?.name ?? null : "Project-specific axle train",
  };
  const reactionsJson = JSON.stringify(reactions);
  // Keep the inputs and the latest deck actions in this browser session so the abutment tool can use them
  // and coming back here shows the same values.
  useEffect(() => { if (persist) saveState(seatInputsKey, { v, model, train, padSource, padModel }); }, [persist, v, model, train, padSource, padModel]);
  useEffect(() => { if (persist) saveState(seatTransferKey, JSON.parse(reactionsJson)); }, [persist, reactionsJson]);
  const openAbutment = () => {
    saveState(seatTransferKey, reactions);
    // "Next" means carry these deck actions forward, so switch the abutment tool to Bank Seat values.
    const abutment = loadState<Record<string, unknown>>(abutmentInputsKey);
    if (abutment) saveState(abutmentInputsKey, { ...abutment, deckSource: "seat" });
    openBridgeTool("abutment-foundations");
  };

  return <div className="content calc-content bridge-tool">
    <TitleRow eyebrow="BRIDGE SUBSTRUCTURE · AS 5100.2" title="Bridge Bank Seat"
      subtitle="Deck reactions at one bank seat of a simply supported span with SM1600 traffic, AS 5100.2 load factors and a beam-to-seat bearing check." />
    <BridgeSteps current="bank-seat" onOpen={openBridgeTool} />
    <div className="warning"><div>i</div><p>{saved ? "Your inputs from earlier in this session are restored. " : "Example values are loaded so you can see how the tool works. Replace them with your project values. "}The deck actions are kept for the Abutment and Foundations step.</p></div>
    <div className="calc-layout"><div>
      <Card step="1" title="Span and permanent loads">
        <BankSeatDiagram view="span" />
        <div className="calc-fields">
          {field("span", "Span between bearings", "m")}
          {field("width", "Seat length across bridge", "m", "Used for the load per metre")}
          {field("beams", "Number of deck beams")}
          {field("beamMass", "Mass per beam", "t")}
          {field("kerbs", "Number of separate kerb units")}
          {field("kerbMass", "Mass per kerb unit", "t")}
          {field("other", "Other dead load at this seat", "kN", "Diaphragms, barriers, services")}
          {field("surfacing", "Superimposed dead load at this seat", "kN", "Wearing surface. Factored as SDL")}
        </div>
        <p className="answer-note">Each seat carries half of the beam and kerb self weight (g = 9.81 m/s²).</p>
      </Card>

      <Card step="2" title="Traffic load (AS 5100.2 Section 7)">
        <div className="calc-fields">
          <Select label="Vehicle load model" value={model} onChange={setModel}>
            <option value="sm1600">SM1600 (S1600, M1600, A160)</option>
            <option value="custom">Project-specific axle train</option>
          </Select>
          {model === "sm1600" && field("roadWidth", "Clear width between barriers", "m", `${lanes} design lane${lanes === 1 ? "" : "s"} at 3.2 m (Cl 7.5)`)}
        </div>
        {model === "sm1600" ? governing ? <>
          <div className="storage-table" style={{ marginTop: 16 }}><table>
            <thead><tr><th style={{ textAlign: "left" }}>Seat reaction, kN</th>{roadLoads.map(row => <th key={row.name}>{row.name}</th>)}</tr></thead>
            <tbody>
              {([["Axles, one lane", "axleReaction", 1], ["UDL, one lane", "udlReaction", 1], ["Dynamic load allowance α (Table 7.7.2)", "alpha", 2],
                ["One lane including α", "laneReaction", 1], ["All lanes with lane factors (Cl 7.6)", "total", 1]] as const).map(([label, key, d]) =>
                <tr key={key}><td style={{ textAlign: "left" }}>{label}</td>{roadLoads.map(row => <td key={row.name}>{key === "total" && row === governing ? <strong>{fmt(row[key], d)}</strong> : fmt(row[key], d)}</td>)}</tr>)}
            </tbody>
          </table></div>
          <p className="answer-note">Governing: <strong>{governing.name}</strong>, {fmt(traffic, 1)} kN unfactored including dynamic allowance. Axle groups are moved along the span in both directions to find the peak seat reaction.</p>
          {braking && <p className="answer-note">Braking force (Cl 7.8.2): {fmt(braking.design, 1)} kN unfactored, {braking.governs} case. Passed to the abutment tool.</p>}
        </> : <p className="answer-note">Enter a span and a clear width of at least 3.2 m for one design lane.</p> : <>
          <div className="calc-fields" style={{ marginTop: 16 }}>
            {field("udl", "Concurrent lane UDL", "kN/m")}
            {field("axleDynamic", "Axle dynamic factor (1 + α)", undefined, "1.4 for A160 / single axle")}
            {field("udlDynamic", "UDL dynamic factor (1 + α)")}
          </div>
          <label className="calc-field" style={{ display: "block", marginTop: 16 }}><span>Axle train, one axle per line: load kN, offset m</span>
            <textarea rows={4} style={{ width: "100%", fontFamily: "monospace" }} placeholder={"160, 0"} value={train} onChange={event => setTrain(event.target.value)} /></label>
          {train.trim() && !validAxles && <p className="fail" style={{ padding: 8, borderRadius: 6 }}>Enter positive loads with offsets starting at 0, maximum 100 axles.</p>}
        </>}
      </Card>

      <Card step="3" title="Load factors (AS 5100.2)">
        <div className="storage-table"><table>
          <thead><tr><th style={{ textAlign: "left" }}>Action</th><th>ULS</th><th>SLS</th><th style={{ textAlign: "left" }}>Reference</th></tr></thead>
          <tbody>
            {([["Structural dead load", "ulsG", "slsG", "Table 6.2, concrete"], ["Superimposed dead load", "ulsS", "slsS", "Table 6.3, wearing surface"],
              ["Traffic", "ulsQ", "slsQ", "Table 7.10(A), SM1600"]] as const).map(([label, ul, sl, ref]) =>
              <tr key={ul}><td style={{ textAlign: "left" }}>{label}</td>
                <td><input aria-label={`${label} ULS factor`} type="number" step="any" min="0" style={{ width: 80 }} value={v[ul]} onChange={e => set(ul)(e.target.value)} /></td>
                <td><input aria-label={`${label} SLS factor`} type="number" step="any" min="0" style={{ width: 80 }} value={v[sl]} onChange={e => set(sl)(e.target.value)} /></td>
                <td style={{ textAlign: "left" }}>{ref}</td></tr>)}
          </tbody>
        </table></div>
        <p className="answer-note">Defaults are the AS 5100.2 values for maximum effect. Use 0.85 for concrete dead load and 0.7 for wearing surface where the load reduces safety. The abutment tool does this for you in its stability cases.</p>
      </Card>

      <Card step="4" title="Beam-to-seat bearing check (optional)">
        <BankSeatDiagram view="pad" />
        <div className="calc-fields">
          <Select label="Reactions at one bearing" value={padSource} onChange={setPadSource}>
            <option value="linked">Share of the seat reactions above</option>
            <option value="manual">Enter from a separate analysis</option>
          </Select>
          {linked && model === "sm1600" && <Select label="Traffic model at this bearing" value={padModel} onChange={setPadModel}>
            <option value="">Governing model</option>
            {roadLoads.map(row => <option key={row.name}>{row.name}</option>)}
          </Select>}
          {linked ? <>
            {field("padGShare", "Dead load share", "%", "Blank = equal share", fmt(evenShare, 1))}
            {field("padSShare", "Superimposed dead load share", "%", "Blank = equal share", fmt(evenShare, 1))}
            {field("padQShare", "Traffic share", "%", "From transverse distribution")}
          </> : <>
            {field("bearingG", "Dead load at bearing", "kN")}
            {field("bearingS", "Superimposed dead load at bearing", "kN")}
            {field("bearingQ", "Traffic at bearing incl. dynamics", "kN")}
          </>}
          {field("padLength", "Contact length along span", "mm")}
          {field("padWidth", "Contact width across span", "mm")}
          {field("area", "Effective contact area override", "mm²", "Partial or eccentric contact")}
          {field("resistance", "Design bearing resistance", "kN", "AS 5100.4 pad or AS 5100.5 concrete")}
        </div>
        <div className="storage-table" style={{ marginTop: 16 }}><table><tbody>
          <tr><td style={{ textAlign: "left" }}>Dead / SDL / traffic at bearing</td><td>{fmt(padG, 1)} / {fmt(padS, 1)} / {fmt(padQ, 1)} kN</td></tr>
          <tr><td style={{ textAlign: "left" }}>ULS bearing reaction</td><td>{fmt(padUls, 1)} kN</td></tr>
          <tr><td style={{ textAlign: "left" }}>Average ULS contact pressure</td><td>{fmt(pressure, 2)} MPa</td></tr>
        </tbody></table></div>
      </Card>
    </div>

    <aside className="calc-results results-card">
      <p className="eyebrow">ULS SEAT REACTION</p>
      <ResultHero label="Factored vertical reaction, one seat" value={fmt(uls, 1)} unit="kN" />
      <div className="check-row">
        <Check ok={Number.isFinite(traffic) ? true : null} pass={model === "sm1600" ? `${governing?.name ?? ""} governs` : "Custom traffic"} fail="" />
        <Check ok={Number.isFinite(utilisation) ? utilisation <= 1 : null} pass={`Bearing ${fmt(100 * utilisation, 0)}%`} fail={`Bearing ${fmt(100 * utilisation, 0)}%`} />
      </div>
      <Metric name="Dead load reaction (G)" value={`${fmt(permanent, 1)} kN`} />
      <Metric name="Superimposed dead load" value={`${fmt(surfacing, 1)} kN`} />
      <Metric name="Traffic reaction incl. dynamics (Q)" value={`${fmt(traffic, 1)} kN`} />
      <Metric name="SLS vertical reaction" value={`${fmt(sls, 1)} kN`} />
      <Metric name="ULS line load along seat" value={`${fmt(uls / width, 1)} kN/m`} />
      {braking && <Metric name="Braking force (unfactored)" value={`${fmt(braking.design, 1)} kN`} />}
      {Number.isFinite(utilisation) && <Metric name="Bearing utilisation" value={`${fmt(100 * utilisation, 0)} %`} />}
      <button type="button" className="download-btn" onClick={openAbutment}>Next: abutment and foundations →</button>
      <p className="answer-note" style={{ marginTop: 12 }}>The unfactored seat reactions, span, lanes and braking force are available in the abutment tool under &quot;Use Bank Seat deck actions&quot;. Design the reinforced concrete seat itself separately.</p>
    </aside></div>
  </div>;
}
