# Hidroalcun workflow comparison

This change was checked against Maria's supplied `MANUAL DEL USUARIO.doc`, `PROGRAMA HIDROALC.doc`, and the Visual Basic source under `codigo/Hidroalcun English/` in `codigo.zip`. The original documents and archive are not redistributed in this repository.

## Restored behaviour

| Original evidence | Web implementation |
| --- | --- |
| User manual: conduit characteristics include inlet/outlet invert levels | Optional inlet/outlet level entry derives the barrel slope, alongside the existing slope entry |
| `modanalisis.bas`, `analisiscaudalconstante`: `calculoy2` runs for each hydrograph discharge | Every row recalculates receiving-channel tailwater at total discharge; its resolved input is retained for profile/result inspection |
| User manual: a fixed receiving depth remains constant across the hydrograph | Direct tailwater remains a fixed depth above the culvert outlet invert |
| `modprecalculos.bas`, `calculoy2canalnatural`: channel minimum elevation is retained as `cotafondo2` | Survey elevations share the inlet datum; channel water level is converted to depth above the outlet invert |
| `frmcurvacalibracion.frm`: minimum/maximum flows, 20 intervals, inlet/outlet/design curves and conduit-height reference | Calibration chart with the same 20-interval structure, individual curve visibility, numerical table and CSV export |
| User manual results: scroll through hydrograph flows to view profiles | Select peak headwater or any individual row; the result summary, profile and export use the same resolved flow and tailwater |
| User manual tables and `modmetodoestandar.bas`: summary and detailed hydraulic calculations | Solved-station table with depth, levels, velocity, Froude, area, wetted perimeter, hydraulic radius, velocity head, energy level and friction slope; CSV export |

## Corrections to the existing web implementation

- Channel-based hydrographs previously reused the constant-discharge tailwater and displayed a profile for the hidden constant flow. They now use each row's actual boundary conditions.
- Natural-channel depth was previously used as culvert tailwater without its elevation offset. The datum conversion now preserves water level.
- Invalid channel inputs previously fell back to the manual tailwater. They now block the affected result.
- Surveyed-channel over-capacity flow previously returned a capped bank depth. It now reports that the survey must be extended, bounded by the lower surveyed end elevation. Non-finite coordinates and duplicate stations are rejected.
- Blank numeric fields, fractional barrel counts and non-finite inlet levels are rejected.
- The initial entrance loss now matches the initially selected projecting groove-edge pipe entrance (0.2); changing section shape also synchronizes a newly selected entrance's loss coefficient.
- Detailed tables exclude the synthetic boundary points that the existing profile solver adds only for display.
- Calibration rows and exports retain engineering warnings. Inlet predictions below critical depth explicitly flag the selected equation/coefficients for review; the existing selectable legacy forms are preserved, not silently reinterpreted.
- Culvert CSV buttons opt out of the global report toolbar's CSV hiding, so raw calibration and profile data remain downloadable alongside PDF/Excel reports.

## Limits and verification

This is a workflow and boundary-condition improvement, not a complete port or a claim of numerical parity with the original executable. The existing FHWA inlet/outlet engine remains in use. In particular, the legacy 10 inlet and 7 outlet profile-case routines, Chow comparison, direct-step method, rapidly varied transitions, project-file import and animated hydrograph playback have not been reproduced here. The receiving-channel calculations use normal depth; hydrograph rows are independent steady-flow calculations, not unsteady routing. Zero-discharge rows remain explicitly invalid in the current positive-flow engine.

The chart uses headwater depth above the inlet invert; profile tables use absolute project levels. Channel ratings use total flow, while barrel profiles use flow per barrel. Separate candidate profile branches must not be read as a continuous solution through a hydraulic jump. Fixed-depth tailwater is explicitly referenced to the culvert outlet; for an independently elevated receiving bed, use a channel-based rating.

Verification includes existing hydraulic tests, hand-computed rectangular-channel depth, trapezoidal-versus-surveyed cross-section equivalence, datum-translation invariance, per-flow boundary conditions, constant-tailwater preservation, failure propagation, rating-curve bounds/envelopes, and profile energy/Manning identities. The legacy executable has not been run for a numerical benchmark comparison.

Method context: [FHWA HDS-5, Hydraulic Design of Highway Culverts, Third Edition](https://highways.dot.gov/media/211466), including performance curves and receiving-channel tailwater. The supplied 2004 source is the workflow reference; it is not treated as proof that every legacy equation or edge case should be copied unchanged.
