"use client";

import { useEffect, useState } from "react";
import { BankSeatDiagram } from "./BankSeatDiagrams";
import { abutmentInputsKey, loadState, openBridgeTool, parseSeatTransfer, readSeatTransfer, saveState, useClientReady, type SeatReactions } from "./bank-seat-transfer";
import { DEFAULT_CASES, actions, brakingForce, contact, exampleSeatReactions, pileActions, pileResistance, type CaseFactors } from "./bridge-calcs";
import { BridgeSteps, Card, Check, Field, Metric, ResultHero, Select, TitleRow, fmt } from "./BridgeUi";

export { actions, contact, pileActions } from "./bridge-calcs";

const factorRows: [keyof CaseFactors, string][] = [
  ["g", "Deck dead load"], ["sdl", "Deck superimposed dead load"], ["q", "Deck traffic"], ["concrete", "Abutment self weight"],
  ["earth", "Earth pressure"], ["surcharge", "Traffic surcharge on approach"], ["braking", "Braking"],
];

const defaults: Record<string, string> = {
  length: "5.1", width: "0.7", height: "1.45", density: "20", ka: "0.33", bearing: "0.35",
  volume: "4.61", concrete: "25", centroid: "0.35", brakeHeight: "1.45", surchargeKpa: "10",
  friction: "0.45", slsLimit: "200", ultimate: "200", phiG: "0.5",
  positions: "0.15, 0.55", perRow: "3", pileD: "0.3", pileL: "9", qb: "200", fs: "20", pilePhi: "0.5", compression: "", uplift: "",
};

type FactorStrings = Record<keyof CaseFactors, string>;
type SavedAbutment = { v: Record<string, string>; foundation: string; factors: FactorStrings[]; deckSource: string; seatModel: string };

export function AbutmentStability() {
  const ready = useClientReady();
  // Remount once in the browser to pick up saved inputs and the latest Bank Seat deck actions.
  return <AbutmentForm key={ready ? "client" : "server"} persist={ready}
    saved={ready ? loadState<SavedAbutment>(abutmentInputsKey) : null}
    seat={ready ? parseSeatTransfer(readSeatTransfer()) : null} />;
}

const plain = (x: number) => fmt(x, 1).replace(/,/g, "");

function AbutmentForm({ saved, seat, persist }: { saved: SavedAbutment | null; seat: SeatReactions | null; persist: boolean }) {
  const example = exampleSeatReactions();
  const exampleBraking = brakingForce(example.span, example.lanes)?.design ?? 0;
  const seatBraking = seat ? seat.braking ?? brakingForce(seat.span ?? NaN, seat.lanes ?? NaN)?.design ?? 0 : NaN;
  const [v, setV] = useState<Record<string, string>>(() => ({
    ...defaults, brakingShare: "100",
    deckPermanent: plain(seat?.permanent ?? example.permanent),
    deckSuperimposed: plain(seat?.superimposed ?? example.superimposed),
    deckTraffic: plain(seat?.traffic ?? example.traffic),
    braking: plain(seat ? seatBraking : exampleBraking),
    ...(saved?.v ?? {}),
  }));
  const [foundation, setFoundation] = useState(saved?.foundation ?? "spread");
  // Only an explicit choice is remembered; otherwise Bank Seat values are used whenever they exist.
  const [deckChoice, setDeckSource] = useState<string>(saved?.deckSource ?? "");
  const deckSource = deckChoice || (seat ? "seat" : "manual");
  const [seatModel, setSeatModel] = useState(saved?.seatModel ?? "");
  const [cases, setCases] = useState(() => DEFAULT_CASES.map((c, i) => ({ ...c,
    factors: saved?.factors?.[i] ?? Object.fromEntries(Object.entries(c.factors).map(([k, x]) => [k, String(x)])) as FactorStrings })));
  useEffect(() => {
    if (persist) saveState(abutmentInputsKey, { v, foundation, factors: cases.map(c => c.factors), deckSource: deckChoice, seatModel });
  }, [persist, v, foundation, cases, deckChoice, seatModel]);
  const n = (key: string) => v[key]?.trim() ? Number(v[key]) : NaN;
  const set = (key: string) => (value: string) => setV({ ...v, [key]: value });
  const field = (key: string, label: string, unit?: string, hint?: string) =>
    <Field key={key} label={label} unit={unit} hint={hint} value={v[key] ?? ""} onChange={set(key)} />;
  const setFactor = (i: number, key: keyof CaseFactors, value: string) =>
    setCases(cases.map((c, j) => j === i ? { ...c, factors: { ...c.factors, [key]: value } } : c));

  const fromSeat = deckSource === "seat" && seat !== null;
  const seatTraffic = seat ? seatModel ? seat.trafficOptions.find(row => row.name === seatModel)?.value ?? NaN : seat.traffic ?? NaN : NaN;
  const P = fromSeat ? seat.permanent ?? NaN : n("deckPermanent");
  const S = fromSeat ? seat.superimposed ?? 0 : n("deckSuperimposed");
  const Q = fromSeat ? seatTraffic : n("deckTraffic");
  const B = fromSeat ? seatBraking * n("brakingShare") / 100 : n("braking");
  const L = n("length"), W = n("width"), H = n("height");
  const selfWeight = n("volume") * n("concrete");
  const earth = 0.5 * n("ka") * n("density") * H ** 2 * L;
  const surcharge = n("ka") * n("surchargeKpa") * H * L;
  const inputsOk = [P, S, Q, B, L, H, n("density"), n("ka"), n("bearing"), n("volume"), n("concrete"), n("centroid"), n("brakeHeight"), n("surchargeKpa")]
    .every(x => Number.isFinite(x) && x >= 0) && L > 0;
  const ulsLimit = n("ultimate") * n("phiG");

  const positions = v.positions.trim() ? v.positions.trim().split(/[,\s]+/).map(Number) : [];
  const perRow = n("perRow");
  const pileCap = pileResistance(n("pileD"), n("pileL"), n("qb"), n("fs"), n("pilePhi"));
  const compressionCap = v.compression.trim() ? n("compression") : pileCap?.compression ?? NaN;
  const upliftCap = v.uplift.trim() ? n("uplift") : pileCap?.uplift ?? NaN;
  const pilesOk = positions.length > 0 && positions.length <= 50 && positions.every(x => Number.isFinite(x) && x >= 0) && Number.isInteger(perRow) && perRow > 0;

  const results = cases.map(c => {
    const f = Object.fromEntries(Object.entries(c.factors).map(([k, x]) => [k, x.trim() ? Number(x) : NaN])) as CaseFactors;
    if (!inputsOk || !Object.values(f).every(x => Number.isFinite(x) && x >= 0)) return { c, a: null };
    const a = actions([
      { vertical: P * f.g + S * f.sdl + Q * f.q, horizontal: 0, arm: n("bearing"), height: 0 },
      { vertical: selfWeight * f.concrete, horizontal: 0, arm: n("centroid"), height: 0 },
      { vertical: 0, horizontal: earth * f.earth, arm: 0, height: H / 3 },
      { vertical: 0, horizontal: surcharge * f.surcharge, arm: 0, height: H / 2 },
      { vertical: 0, horizontal: B * f.braking, arm: 0, height: n("brakeHeight") },
    ]);
    const uls = c.limit === "ULS";
    const limit = uls ? ulsLimit : n("slsLimit");
    if (foundation === "spread") {
      const p = W > 0 ? contact(a.normal, a.moment, W, L) : null;
      const peak = p ? Math.max(p.toe, p.heel) : NaN;
      return { c, a, p, peak, limit, bearing: p && limit > 0 ? peak / limit : p ? NaN : Infinity,
        overturning: a.overturning > 0 ? a.restoring / a.overturning : Infinity,
        sliding: a.horizontal > 0 ? a.normal * n("friction") / a.horizontal : Infinity };
    }
    const row = pilesOk ? pileActions(positions, a.normal, a.moment) : null;
    const forces = row?.map(x => x / perRow) ?? null;
    const maxC = forces ? Math.max(...forces) : NaN, minC = forces ? Math.min(...forces) : NaN;
    return { c, a, forces, maxC, minC, bearing: forces ? Math.max(maxC > 0 ? maxC / compressionCap : 0, minC < 0 ? -minC / upliftCap : 0) : Infinity };
  });

  const uls = results.filter(r => r.c.limit === "ULS" && r.a);
  const worst = (key: "bearing" | "overturning" | "sliding", high: boolean) => uls.reduce<{ value: number; name: string } | null>((best, r) => {
    const value = (r as Record<string, unknown>)[key] as number;
    if (value === undefined || Number.isNaN(value)) return best;
    return !best || (high ? value > best.value : value < best.value) ? { value, name: r.c.name } : best;
  }, null);
  const bearingWorst = worst("bearing", true);
  const overturnWorst = foundation === "spread" ? worst("overturning", false) : null;
  const slidingWorst = foundation === "spread" ? worst("sliding", false) : null;
  const allPass = !!bearingWorst && bearingWorst.value <= 1 && (!overturnWorst || overturnWorst.value >= 1) && (!slidingWorst || slidingWorst.value >= 1);
  const ratio = (x: number) => x === Infinity ? "n/a" : fmt(x, 2);
  const pct = (x: number) => x === Infinity ? "—" : `${fmt(100 * x, 0)}%`;

  return <div className="content calc-content bridge-tool">
    <TitleRow eyebrow="BRIDGE SUBSTRUCTURE · AS 5100.2 / AS 5100.3" title="Abutment and Foundations"
      subtitle="Bearing, overturning and sliding checks for a bridge abutment on a spread footing or piles, using AS 5100.2 load combinations." />
    <BridgeSteps current="abutment-foundations" onOpen={openBridgeTool} />
    {!saved && <div className="warning"><div>i</div><p>Example values are loaded for the abutment. Replace them with your project values.</p></div>}
    <div className="calc-layout"><div>
      <Card step="1" title="Deck actions at this abutment (unfactored)">
        <div className="bridge-source" role="radiogroup" aria-label="Source of deck actions">
          <button type="button" role="radio" aria-checked={fromSeat} className={fromSeat ? "selected" : ""} disabled={!seat} onClick={() => setDeckSource("seat")}>
            <strong>Use Bank Seat deck actions</strong><small>{seat ? "Latest values calculated in Bridge Bank Seat" : "Not available yet. Open Bridge Bank Seat first"}</small></button>
          <button type="button" role="radio" aria-checked={!fromSeat} className={!fromSeat ? "selected" : ""} onClick={() => setDeckSource("manual")}>
            <strong>Enter deck actions manually</strong><small>Type your own reactions</small></button>
        </div>
        {fromSeat ? <>
          <div className="storage-table" style={{ maxHeight: "none" }}><table><tbody>
            <tr><td style={{ textAlign: "left" }}>Span / design lanes</td><td>{fmt(seat.span ?? NaN, 2)} m / {seat.lanes ?? "—"}</td></tr>
            <tr><td style={{ textAlign: "left" }}>Deck dead load reaction G</td><td>{fmt(P, 1)} kN</td></tr>
            <tr><td style={{ textAlign: "left" }}>Superimposed dead load reaction</td><td>{fmt(S, 1)} kN</td></tr>
            <tr><td style={{ textAlign: "left" }}>Traffic reaction incl. dynamics Q</td><td>{fmt(Q, 1)} kN ({seatModel || seat.governing || "governing"})</td></tr>
            <tr><td style={{ textAlign: "left" }}>Braking force from Bank Seat</td><td>{fmt(seatBraking, 1)} kN</td></tr>
          </tbody></table></div>
          <div className="calc-fields" style={{ marginTop: 14 }}>
            {seat.trafficOptions.length > 0 && <Select label="Traffic model for the abutment" value={seatModel} onChange={setSeatModel} hint="Governing gives the largest reaction">
              <option value="">Governing ({seat.governing ?? "largest"})</option>
              {seat.trafficOptions.map(row => <option key={row.name} value={row.name}>{row.name}, {fmt(row.value, 1)} kN</option>)}
            </Select>}
            {field("brakingShare", "Share of braking at this abutment", "%", `${fmt(B, 1)} kN applied. Reduce if bearings share it`)}
          </div>
          <button type="button" className="link-btn" onClick={() => openBridgeTool("bank-seat")}>← Change these in Bridge Bank Seat</button>
        </> : <div className="calc-fields">
          {field("deckPermanent", "Deck dead load reaction", "kN")}
          {field("deckSuperimposed", "Superimposed dead load reaction", "kN")}
          {field("deckTraffic", "Traffic reaction incl. dynamics", "kN", "SM1600 governing reaction")}
          {field("braking", "Braking force at this abutment", "kN", "Cl 7.8.2. Reduce if shared by bearings")}
        </div>}
      </Card>

      <Card step="2" title="Abutment geometry and backfill">
        <BankSeatDiagram view="abutment" />
        <div className="calc-fields">
          {field("length", "Abutment length across bridge", "m")}
          {field("height", "Retained height H", "m", "Top of fill to underside of footing")}
          {field("bearing", "Deck bearing distance from toe", "m")}
          {field("volume", "Abutment concrete volume", "m³")}
          {field("concrete", "Concrete unit weight", "kN/m³", "AS 5100.2 Cl 5: 25 for reinforced")}
          {field("centroid", "Concrete centroid from toe", "m")}
          {field("density", "Backfill unit weight", "kN/m³")}
          {field("ka", "Active pressure coefficient Ka", undefined, "0.33 for φ' = 30°")}
          {field("surchargeKpa", "Traffic surcharge on approach", "kPa", "Cl 14.2. Confirm for the project")}
          {field("brakeHeight", "Braking force height above base", "m", "Usually the bearing level")}
        </div>
        <p className="answer-note">Earth thrust {fmt(earth, 1)} kN at H/3 · Surcharge thrust {fmt(surcharge, 1)} kN at H/2 · Abutment weight {fmt(selfWeight, 1)} kN. All unfactored.</p>
      </Card>

      <Card step="3" title="Foundation">
        <div className="calc-fields">
          <Select label="Foundation type" value={foundation} onChange={setFoundation}>
            <option value="spread">Spread footing / mass abutment</option>
            <option value="piles">Pile cap on piles</option>
          </Select>
          {foundation === "spread" ? <>
            {field("width", "Footing width in direction of traffic B", "m")}
            {field("friction", "Base friction coefficient", undefined, "Design value, tan δ")}
            {field("slsLimit", "SLS allowable bearing pressure", "kPa", "From the geotechnical report")}
            {field("ultimate", "Ultimate geotechnical bearing capacity", "kPa")}
            {field("phiG", "Geotechnical reduction factor φg", undefined, "AS 5100.3 Cl 10.3: typically 0.45 to 0.65")}
          </> : <>
            <label className="calc-field"><span>Pile row positions from toe</span><small>m, comma separated, for example 0.15, 0.55</small>
              <input type="text" value={v.positions} onChange={e => set("positions")(e.target.value)} /></label>
            {field("perRow", "Piles in each row", undefined, "Along the abutment length")}
            {field("pileD", "Pile diameter", "m")}
            {field("pileL", "Pile embedded length", "m")}
            {field("qb", "Ultimate end bearing", "kPa")}
            {field("fs", "Ultimate shaft adhesion", "kPa")}
            {field("pilePhi", "Geotechnical reduction factor φg", undefined, "AS 2159 / AS 5100.3")}
            {field("compression", "Design compression override", "kN", `Calculated ${fmt(pileCap?.compression ?? NaN, 1)} kN`)}
            {field("uplift", "Design uplift override", "kN", `Calculated ${fmt(pileCap?.uplift ?? NaN, 1)} kN`)}
          </>}
        </div>
        {foundation === "spread"
          ? <p className="answer-note">ULS bearing limit = φg × ultimate = {fmt(ulsLimit, 1)} kPa. Pressures use a linear, compression-only contact model.</p>
          : <p className="answer-note">Design pile compression φg(qb·Ab + fs·As) = {fmt(compressionCap, 1)} kN, uplift φg·fs·As = {fmt(upliftCap, 1)} kN. Assumes a rigid cap and equal pile stiffness. Check pile lateral capacity and structural design separately.</p>}
      </Card>

      <Card step="4" title="Load combinations (AS 5100.2)">
        <div className="storage-table" style={{ maxHeight: "none" }}><table>
          <thead><tr><th style={{ textAlign: "left" }}>Load factor</th>{cases.map(c => <th key={c.name}>{c.name}</th>)}</tr></thead>
          <tbody>{factorRows.map(([key, label]) => <tr key={key}><td style={{ textAlign: "left" }}>{label}</td>
            {cases.map((c, i) => <td key={c.name}><input aria-label={`${c.name} ${label} factor`} type="number" step="any" min="0" style={{ width: 58, padding: "6px 6px" }}
              value={c.factors[key]} onChange={e => setFactor(i, key, e.target.value)} /></td>)}</tr>)}</tbody>
        </table></div>
        <p className="answer-note">Defaults: dead load 1.2 (0.85 where it helps stability), wearing surface 2.0 (0.7), traffic and braking 1.8, earth pressure 1.5, all 1.0 at SLS (wearing surface 1.3). The stability cases use the lower dead load factors because self weight resists overturning and sliding. Edit any factor to suit the asset owner&apos;s requirements.</p>
      </Card>

      <Card step="5" title="Results by load case">
        <div className="storage-table" style={{ maxHeight: "none" }}><table>
          <thead><tr><th style={{ textAlign: "left" }}>Case</th><th>N kN</th><th>H kN</th>
            {foundation === "spread" ? <><th>e m</th><th>Toe kPa</th><th>Heel kPa</th><th>Limit kPa</th><th>Bearing</th><th>Overturning</th><th>Sliding</th></>
              : <><th>Max pile kN</th><th>Min pile kN</th><th>Utilisation</th></>}</tr></thead>
          <tbody>{results.map(r => <tr key={r.c.name}><td style={{ textAlign: "left" }}>{r.c.name} <small>({r.c.limit})</small></td>
            {r.a ? <><td>{fmt(r.a.normal, 1)}</td><td>{fmt(r.a.horizontal, 1)}</td>
              {foundation === "spread" && "p" in r ? r.p ? <><td>{fmt(r.p.eccentricity, 3)}</td><td>{fmt(r.p.toe, 1)}</td><td>{fmt(r.p.heel, 1)}</td><td>{fmt(r.limit, 0)}</td>
                <td className={r.bearing <= 1 ? "pass" : "fail"}>{pct(r.bearing)}</td>
                <td className={r.c.limit === "SLS" ? "" : r.overturning >= 1 ? "pass" : "fail"}>{ratio(r.overturning)}</td>
                <td className={r.c.limit === "SLS" ? "" : r.sliding >= 1 ? "pass" : "fail"}>{ratio(r.sliding)}</td></>
                : <td colSpan={7} className="fail">Resultant outside the footing. Overturns.</td>
              : "forces" in r && r.forces ? <><td>{fmt(r.maxC, 1)}</td><td>{fmt(r.minC, 1)}</td><td className={r.c.limit === "SLS" ? "" : r.bearing <= 1 ? "pass" : "fail"}>{r.c.limit === "SLS" ? "—" : pct(r.bearing)}</td></>
              : <td colSpan={3} className="fail">Enter at least two pile rows to resist the moment.</td>}</>
              : <td colSpan={9}>Check the inputs.</td>}</tr>)}</tbody>
        </table></div>
        <p className="answer-note">Overturning and sliding are ULS ratios of factored resistance to factored demand and need to be at least 1.0. SLS rows are for service pressure only. {foundation === "spread" ? "A resultant outside the middle third means partial contact, which is shown in the toe and heel pressures." : ""}</p>
      </Card>
    </div>

    <aside className="calc-results results-card">
      <p className="eyebrow">FOUNDATION CHECK</p>
      <ResultHero label={bearingWorst ? `Governing: ${bearingWorst.name}` : "Enter inputs"} value={bearingWorst ? allPass ? "PASS" : "FAIL" : "—"}
        unit={bearingWorst ? bearingWorst.value === Infinity ? (foundation === "spread" ? "resultant outside footing" : "pile layout cannot resist moment") : `${pct(bearingWorst.value)} bearing` : undefined} />
      <div className="check-row">
        <Check ok={bearingWorst ? bearingWorst.value <= 1 : null} pass="ULS bearing" fail="ULS bearing" />
        <Check ok={overturnWorst ? overturnWorst.value >= 1 : null} pass="Overturning" fail="Overturning" />
        <Check ok={slidingWorst ? slidingWorst.value >= 1 : null} pass="Sliding" fail="Sliding" />
        {foundation === "spread" && (() => { const sls = results.filter(r => r.c.limit === "SLS" && r.a && "bearing" in r);
          return sls.length ? <Check ok={sls.every(r => (r.bearing ?? Infinity) <= 1)} pass="SLS pressure" fail="SLS pressure" /> : null; })()}
      </div>
      {bearingWorst && <Metric name={foundation === "spread" ? "Max ULS bearing utilisation" : "Max ULS pile utilisation"} value={bearingWorst.value === Infinity ? `Overturns (${bearingWorst.name})` : `${pct(bearingWorst.value)} (${bearingWorst.name})`} />}
      {overturnWorst && <Metric name="Min overturning ratio" value={`${ratio(overturnWorst.value)} (${overturnWorst.name})`} />}
      {slidingWorst && <Metric name="Min sliding ratio" value={`${ratio(slidingWorst.value)} (${slidingWorst.name})`} />}
      <Metric name="Deck reaction G + SDL + Q" value={`${fmt(P + S + Q, 1)} kN`} />
      <Metric name="Braking force" value={`${fmt(B, 1)} kN`} />
      {foundation === "spread" && <Metric name="ULS bearing limit φg·qult" value={`${fmt(ulsLimit, 0)} kPa`} />}
      <Metric name="Deck actions from" value={fromSeat ? "Bridge Bank Seat" : "Manual entry"} />
      <button type="button" className="link-btn" onClick={() => openBridgeTool("bank-seat")}>← Back to Bridge Bank Seat</button>
      <p className="answer-note" style={{ marginTop: 12 }}>Confirm bearing capacity, settlement, scour and groundwater with the geotechnical report. Design the reinforcement separately.</p>
    </aside></div>
  </div>;
}
