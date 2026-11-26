import { useId } from "react";

export function BankSeatDiagram({ view, loadCase }: { view: "span" | "pad" | "abutment"; loadCase?: number }) {
  const arrow = useId();
  const down = (x: number, y: number, end: number) =>
    <path d={`M${x} ${y} V${end}`} markerEnd={`url(#${arrow})`} />;
  return <figure className="max-w-xl rounded border border-slate-300 bg-slate-50 p-3 text-slate-900">
    <svg viewBox={view === "abutment" ? "0 0 500 230" : "0 0 500 148"} role="img"
      aria-label={view === "span" ? "Span elevation with axle loads, distributed lane load and end reaction"
        : view === "pad" ? "Pad plan with loaded contact length and width"
        : "Abutment section with footing toe and heel, earth pressure, and force locations"}
      className="h-auto w-full" fill="none" stroke="currentColor" strokeWidth="1.6">
      <defs><marker id={arrow} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0L8 4L0 8Z" fill="currentColor" stroke="none" />
      </marker></defs>
      {view === "span" && <>
        <path d="M70 82H430 M70 82l-12 15h24z M430 82l-12 15h24z M95 51H405" />
        <g stroke="#245888">
          {down(150, 29, 77)}{down(176, 29, 77)}{down(202, 29, 77)}
          {down(95, 51, 77)}{down(260, 51, 77)}{down(310, 51, 77)}{down(360, 51, 77)}{down(405, 51, 77)}
          {down(70, 130, 101)}
        </g>
        <path d="M99 114H417 M99 108v12 M417 108v12" />
        <g fill="currentColor" stroke="none" fontSize="15">
          <text x="140" y="22">Axles</text><text x="255" y="42">Lane UDL</text>
          <text x="175" y="137">Span between supports</text><text x="23" y="145">Seat reaction</text>
        </g>
      </>}
      {view === "pad" && <>
        <rect x="90" y="25" width="305" height="86" rx="3" />
        <rect x="195" y="38" width="105" height="60" fill="#dbeafe" stroke="#245888" />
        <path d="M195 115v12 M300 115v12 M195 121H300 M308 38h12 M308 98h12 M314 38v60" />
        <g fill="currentColor" stroke="none" fontSize="15">
          <text x="118" y="70">Seat</text><text x="207" y="72">Loaded pad</text>
          <text x="317" y="73">Width across span</text><text x="178" y="145">Length along span</text>
        </g>
      </>}
      {view === "abutment" && <>
        <path d="M110 193V173H213V47H255V173H356V193Z" fill="#e2e8f0" />
        <path d="M255 47H460V173H255l80 0L255 47" fill="#f4e8d2" />
        <path d="M255 47L335 173" stroke="#8a5b20" />
        <path d="M27 67H213V78H27Z" fill="#dbeafe" />
        <path d="M330 132H258" markerEnd={`url(#${arrow})`} stroke="#245888" />
        {(loadCase === undefined || loadCase === 2) && <path d="M203 36H77" markerEnd={`url(#${arrow})`} stroke="#245888" />}
        {loadCase === 1 && <g stroke="#8a5b20">{down(292, 28, 45)}{down(315, 28, 45)}{down(338, 28, 45)}</g>}
        <path d="M175 30V65" markerEnd={`url(#${arrow})`} stroke="#245888" />
        <path d="M110 214H356 M110 208v12 M356 208v12 M446 47V173 M440 47h12 M440 173h12" />
        <g fill="currentColor" stroke="none" fontSize="15">
          <text x="74" y="24">{loadCase === 2 ? "Deck traffic and braking" : "Deck reaction"}</text>
          {loadCase === 1 && <text x="278" y="23">Approach surcharge</text>}
          <text x="340" y="126">Earth thrust</text><text x="340" y="146">at H / 3</text>
          <text x="456" y="114">H</text><text x="78" y="192">Toe</text><text x="361" y="192">Heel</text>
          <text x="188" y="229">Footing width B</text>
        </g>
      </>}
    </svg>
    <figcaption className="mt-2 text-sm">
      {loadCase !== undefined ? "Starter load pattern. Enter the actions that apply to this case." : view === "span" ? "Elevation. Seat width runs across the bridge, perpendicular to this view."
        : view === "pad" ? "Plan. Measure the loaded patch beneath one pad."
        : "Section along traffic. Measure deck and concrete moment arms from the toe, and horizontal force heights from the underside of the footing. Uniform surcharge adds a lateral force at H / 2."}
    </figcaption>
  </figure>;
}
