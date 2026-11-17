# Lifting Beams

Available in Structures > Lifting Beams and at `/lifting-beams`. Same-origin static assets are served from `public/calculators/lifting-beams`; existing access controls apply.

## UB selection and deck comparison

Select one of 28 manufacturer-tabulated 300PLUS UBs (150–610 UB), or retain custom properties. Catalogue selection fills mass, major-axis inertia, elastic modulus and effective shear area, plus automatic section/shear capacities. The result card compares complete deck/payload mass with the calculated system payload limit, remaining margin, utilisation and governing check. Beam tare stays fixed; rigging tare must be entered as an additional payload. Compare all UB sections uses identical geometry, sharing, load factors and effective length, with independent self-weight for each UB.

Catalogue source: [InfraBuild/Liberty HRSSP ninth edition, 2019](https://www.infrabuild.com/wp-content/uploads/sites/8/2022/02/Hot20Rolled20Cat_Edition9_2019.pdf), Tables 9–10 (printed pages 10–11). Values are rounded manufacturer data for 300PLUS, including grade/thickness-specific flange/web yield stresses and effective section moduli. Properties differ slightly from the original saved Tedds data. This is a reference catalogue, not a current stock/availability statement.

## Capacity basis

- **Buckling screening (default):** entered effective length, manufacturer Iy/J/Iw and section moment capacity, alpha_m = 1.0. Mo = sqrt[(pi² E Iy / Le²)(GJ + pi² E Iw / Le²)]; alpha_s = 0.6[sqrt((Ms/Mo)²+3) − Ms/Mo]; phiMb = min(phiMs, 0.9 alpha_s Ms).
- **Fully restrained section benchmark:** phiMs = 0.9 fy Zex. Does not verify restraint.
- **User-supplied capacities:** independently established design Mcap/Vcap. Catalogue selection still fills properties but preserves entered capacities within this mode. Selecting a different UB resets to automatic buckling screening, preventing capacities from being carried across members unnoticed.

The default effective length of 7.9 m is an explicit assumption, not verified restraint. Le must account for twist restraint, lateral rotation and load height; it does not track geometry changes automatically. Contact with the deck is not proof of restraint. This is an effective-length screening model for doubly symmetric UBs, not a complete AS 4100 or AS 4991 design. Background: [AS 4100 lateral buckling discussion](https://files.engineering.com/files/3ab36fd3-f2d8-4d11-85cf-7629ce14c426/AS4100_LTB.pdf).

Catalogue shear benchmark uses phi × 0.6 × fy_web × (d − 2tf) × tw, with phi = 0.9. Effective shear area for elastic deformation is approximated by d × tw. Catalogue clear webs are below the shear-buckling slenderness threshold; load introduction, bearing and local effects are separate.

## Analysis and limitations

Per-beam major-axis elastic analysis; two vertical lug reactions; symmetric unloaded overhangs including self-weight; point and patch loads between lugs; unequal two-beam sharing; independent strength/service factors; flexural and shear deflection; sling force demands; independently calculated load-width envelopes.

Maximum payload scales all entered payloads together, preserving positions, widths and shares. It is the first bending, shear or deflection ratio to reach 1.0, with beam weight fixed. A positive margin means only that the displayed member checks are within their limits. Inclined-sling axial interaction and bending–shear interaction are excluded. Lugs, welds, local flange/web effects, deck integrity, rigging equilibrium, fabrication, fatigue, proof testing and approved WLL require separate verification. No lift approval or certified WLL is issued. Single-beam use remains analysis-only and is prohibited by the original supplied report.

The historic deflection ratio 0.8 is not used as a strength multiplier. All load factors require justification; default 1.2G + 1.5Q is inherited from the supplied model, not an automatic lifting-device factor set.

## Saved cases and reports

Save/Open JSON and browser persistence are retained. Cases without a catalogue ID migrate to custom properties, preserving their entered values. Catalogue values are regenerated from the ID on calculation. Print and CSV record the capacity basis and effective length. The embedded tool remains outside the dashboard's generic iframe input capture.

## Validation

Run `node tests/lifting-beam-engine.test.cjs`. Tests cover analytical actions/deflection, overhang weight, sharing, sling demand, saved Tedds loading, every catalogue UB's limit convergence, effective-length sensitivity, unequal sharing, verified capacity preservation, invalid section IDs and deck comparison.

The buildless calculator is included by the platform's normal production build.

## Additional WLL factor and clear demand/capacity display

The editable additional WLL factor defaults to 1.5 and must be >= 1.0. Calculated WLL estimate = current-pattern member payload ceiling / factor. This is separate from gammaQ and does not alter strength/service actions. No 0.8 load-test strength reduction is applied; existing equipment ratings remain unchanged. Legacy saved cases receive the new 1.5 default when absent. The factor is included in Save/Open, print, CSV, envelope and section comparisons.

The deck verdict uses the WLL estimate; the original member utilisation and limits remain separate. Thus a load may satisfy the member checks and still fail the WLL estimate. Failure is displayed with red text/border and a direct status message. Automatic size suggestions search heavier, equally deep or deeper catalogue UBs under unchanged geometry, load sharing, restraint assumptions and factors. Only candidates meeting the additional-factor screening are suggested. Custom/verified member capacities are never transferred to another section; no candidate is claimed suitable as a complete lifting assembly.

Capacity fields display one decimal place while automatic catalogue calculations retain full precision. Applied bending/shear demands and calculated displacement are explicitly labelled, with capacity/deflection limits named beneath them.
