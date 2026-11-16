# Lifting Beams

Available in Structures > Lifting Beams and directly at `/lifting-beams`.

The calculator runs from same-origin static assets at `/calculators/lifting-beams/index.html`. The embedded view automatically sizes to its contents. Isolating its styles keeps the established calculation and print behavior intact. The calculator's own Save case/Open case JSON handoff is used; it is intentionally excluded from the dashboard's generic input-capture project format, which cannot capture iframe fields. Browser-local persistence stays within the platform's origin. Existing access controls apply without a new login or external-host dependency.

## Scope

Per-beam major-axis elastic analysis, two vertical lifting-lug reactions, symmetric unloaded overhangs with full beam self-weight, point loads and UDL patches, unequal two-beam payload sharing, separate strength/service factors, flexural and shear deflection, sling force demands, independently calculated load-width envelopes and print reports.

Defaults are the supplied 460 UB 67.1 section and 7.9 m lifting-lug spacing from drawing 490039 Rev 0 and the saved Tedds calculations. The actual-loading preset totals 353 kN over three overlapping centred UDL patches. The engine reproduces the saved 28.8 mm deflection as approximately 28.79 mm.

This is preliminary member analysis, not a certified WLL tool. Default bending capacity is the fully restrained section benchmark, not an independently verified member capacity. User-supplied capacities must reflect the actual restraint and design conditions. Separate verification remains necessary for lateral/torsional stability, axial–bending and bending–shear interactions, local effects, lugs, welds, rigging equilibrium, deck integrity, fatigue, fabrication and proof testing. The historic 0.8 deflection ratio is not adopted as a strength multiplier. All load factors require project-specific justification.

Run `node tests/lifting-beam-engine.test.cjs` from the app directory. It covers analytical load effects and deflection, overhang self-weight, sharing, sling-force demands, capacity-search convergence, invalid inputs and the supplied test pattern. The calculator is buildless; the platform's normal Next.js build serves the files.
