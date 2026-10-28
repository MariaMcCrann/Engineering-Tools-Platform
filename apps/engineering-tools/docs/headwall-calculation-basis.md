# Headwall side-panel calculation basis

The headwall is a solid side panel between a culvert connection and its outer free end, excluding the culvert openings. Church Street's 5.5 m by 2.43 m panel has a/b approximately 2.263. Reinforced connections support investigation of a base-and-one-side restrained model; actual anchor capacity, rotational stiffness and foundation restraint remain separate design checks.

## Analysis limits

USBR Engineering Monograph 27, Figure 27 (uniform load) and Figure 30 (full-height triangular load), gives Case 4 for two adjacent fixed edges and two free edges. The monograph introduction states that Case 4 excludes a/b=3/2; tabulated Case 4 ratios extend through 1. The app stores only the a/b=1 matrix. The full-height triangular matrix was corrected against Figure 30 on 28 October 2026; the historic workbook matrix had different values (for example, horizontal fixed-edge coefficient 0.0776 rather than the published 0.0662, and vertical fixed-edge maximum 0.1605 rather than 0.1157). Matching those historic workbook values is not a validation target. It must not apply that matrix to other ratios, extrapolate, or replace side restraint with a cantilever merely because a/b exceeds 1.

Official reference: https://www.usbr.gov/tsc/techreferences/hydraulics_lab/pubs/EM/EM27.pdf (introduction, printed pages 5–6; Figures 27 and 30).

Automatic actions are reinstated for all base + one side panels (29 October 2026). For a/b <= 1 the a/b = 1 coefficients are applied (an approximation below 1). For long panels (a/b > 1), vertical actions use a base-fixed cantilever strip integrating the actual soil, water and live pressure, and horizontal actions use the a/b = 1 local fixed-edge coefficients near the restrained side. Independently verified ULS and service actions can still be entered instead. This is not a validated numerical plate solver for the Church Street geometry.

Base-only cantilever analysis is available only when explicitly selected. It integrates uniform lateral live pressure and partial-height soil/water triangles, using the workbook lateral soil coefficient K=0.5. Top and outer edges are free. The location and adequacy of the base restraint must be independently established.

## Loads

Automatic uniform live pressure is horizontal wall pressure at service level, not vertical road surcharge. For K=0.5, the base pressure is K × total soil unit weight × retained height + (1−K) × water unit weight × water height. This subtracts buoyancy only in the submerged zone; a dry wall uses the full soil unit weight. The entered total soil unit weight and water unit weight generate effective-soil plus hydrostatic pressure; water height cannot exceed retained soil height. Front-face water is not automatically subtracted. Net-water load cases must be established by the designer.

ULS multipliers start at 1.0 as unapproved placeholders; the tool reminds the designer to set project factors but no longer blocks the calculation. Soil and water share one multiplier in automatic mode; distinct factors and other pressure models require external analysis actions. SLS moments are independently calculated at service pressure, never obtained by multiplying ULS positive moments by 0.7, 0.12 or 0.16.

## Section checks

Both directions and both moment signs use their own section properties. Mesh primary wires are horizontal and secondary wires vertical. Per-face N-bar inputs apply in both directions. The user must confirm which face is in tension for positive moments. Crack checks reproduce the supplied workbook's 0.3 mm stress tables and cracked-section equations using explicit service moments. Minimum steel and nominal strength are checked per face and direction. Temperature/shrinkage steel sums both faces on the workbook 1.75 bD/1000 basis.

Concrete-only one-way shear uses the workbook strain-dependent procedure with no shear links, checked against each tension face and capped by web crushing. The headwall tool does not check connection resistance, foundation capacity, restraint stiffness, global stability, deflection, barrier impact or general plate torsion. These exclusions are displayed in the tool and report.

Regression tests cover square-panel coefficient envelopes, explicit cantilever loading, unsupported geometry rejection, manual action completeness/provenance and directional mesh/cracking behaviour. Slab workbook regressions must remain passing.
