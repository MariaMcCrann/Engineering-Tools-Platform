# Headwall numerical analysis — development checkpoint, 28 October 2026

**Not released and not connected to design PASS/FAIL.** The Church Street automatic design calculation remains incomplete. This folder records actual implementation and independent numerical checks so development can continue without reproducing the historic coefficient errors.

## Implemented

`plate.ts` is a browser-compatible conforming Bogner–Fox–Schmit (BFS) rectangular Kirchhoff plate solver. It uses tensor-product cubic Hermite interpolation, four DOFs per node (w, wy, wx, wxy), 4×4 Gauss integration and banded Cholesky factorisation. Both the base and culvert-side edge are clamped; the top and outer edge are free. Poisson's ratio is 0.2, matching EM27. Rigidity D is normalised to one; calculated actions do not depend on homogeneous plate rigidity, but the internal displacement must not be reported as physical deflection.

Uniform and full-height triangular pressures are applied consistently to the actual rectangular geometry. Retained partial-height pressures, multiple load combinations, reinforcement face mapping and UI/report integration are not implemented in this research module.

Two independent checks are provided:

- `bfs_reference.py`: separate NumPy element assembly and SciPy sparse direct solution. Checks the TypeScript assembly, DOF constraints and banded linear solve.
- `ritz_reference.py`: a different discretisation using global twice-integrated shifted Legendre polynomials and a Rayleigh–Ritz energy formulation. Checks global plate compliance, rather than just repeating a finite-element implementation.

The Python reference scripts require NumPy and SciPy; they are development dependencies only. Run the TypeScript regressions with:

```sh
node --experimental-strip-types --test tests/headwall-plate-research.test.mjs
```

## Independent global-response checks

For a unit square, unit uniform pressure, D=1 and nu=0.2:

- BFS 10×10 compliance: 0.00867297696052
- Ritz 16×16 compliance: 0.00867561672674
- Difference: approximately 0.0304%.

For a unit square with triangular pressure 1 at the base and 0 at the top:

- BFS 10×10 compliance: 0.000843273987867
- Ritz 16×16 compliance: 0.000843577556935
- Difference: approximately 0.0360%.

These are global checks, not acceptance of local corner actions. Tests also verify rotation symmetry, dimensional scaling, zero loading, rejection of invalid inputs and support-force equilibrium.

## Church Street numerical investigation

Benchmark geometry: 5.5 m × 2.43 m, two adjacent clamped edges. **Benchmark pressures only:** 20 kPa uniform horizontal pressure plus a triangular pressure with base intensity 35.3565 kPa. These are not approved project ULS loads; the meaning and factoring of the user's traffic surcharge have not been assumed. Applied force = 503.56981125 kN.

| Mesh | Horizontal moment max/min (kNm/m) | Vertical moment max/min (kNm/m) | Raw largest absolute nodal reaction / spacing, left/base (kN/m) |
| --- | --- | --- | --- |
| 23×10 | 71.0976 / −10.3177 | 88.4163 / −2.0262 | 115.216 / 141.545 |
| 45×20 | 73.0668 / −10.2825 | 89.1637 / −1.9259 | 193.828 / 194.746 |
| 68×30 | 73.6451 / −10.2765 | 89.3742 / −1.9122 | 263.747 / 315.567 |
| 91×40 | 75.7039 / −10.2738 | 89.4502 / −1.9076 | 326.117 / 487.226 |

Relative global force-equilibrium error is below 2×10^-10 for these runs. Compliance changes by about 0.001% between the two finest meshes. Local reaction peaks do not converge. The fixed/free corner idealisation produces a singular local response. **Do not call the reaction-per-spacing figures design shears.** The moments are raw numerical field extrema; they are not reinforcement design actions and do not include a validated torsion treatment.

Simple averaging is not automatically a solution: both signed and absolute 1 m reaction averages were investigated and remained sensitive to refinement and the averaging window. No averaging width or corner peak cut-off has been silently adopted.

## Published benchmark / historic coefficient defect

Official primary source: USBR Engineering Monograph 27, https://www.usbr.gov/tsc/techreferences/hydraulics_lab/pubs/EM/EM27.pdf . Figure 27 is printed p.33 (PDF p.42); Figure 30 is printed p.36 (PDF p.45). The introduction, printed pp.5–6, defines Case 4 and excludes a/b=1.5; available ratios extend only through 1.0.

The old uniform square matrix matches Figure 27. The old triangular matrix does not match Figure 30. Examples at a/b=1:

| Quantity | Old tool | Figure 30 |
| --- | --- | --- |
| Mx at x=0, y=b, coefficient of p b² | 0.0776 | 0.0662 |
| My at x=a, y=0, coefficient of p b² | 0.1605 | 0.1157 |
| Maximum left-edge reaction, coefficient of p b | 0.3929 | 0.2481 |
| Maximum base reaction, coefficient of p b | 0.7476 | 0.5586 |

The separate production correction uses the Figure 30 matrix and fixes dry-soil pressure. Reproducing historic workbook numbers is not a valid acceptance criterion for the new model. EM27 finite-difference tables provide useful comparisons at matching ratios but do not validate local corner extrema of a refined numerical model.

## Release blockers

1. Establish and validate extraction of design section shear and treatment of fixed/free connection corners, including the distinction between plate shear and effective Kirchhoff edge reaction.
2. Establish reinforcement design action envelopes incorporating plate twisting moments, with an explicit physical inside/outside convention.
3. Validate local fields and design extraction independently over the supported aspect ratios and pressure cases, with documented convergence tolerances.
4. Implement approved ULS/SLS combinations and partial-height pressure integration; preserve the distinction between vertical surcharge and horizontal wall pressure.
5. Integrate automatic actions and their calculation basis into the existing face checks and PDF, and verify the rendered UI/report.

No action from Maria is pending in this checkpoint. Do not ask her to supply externally calculated forces as a substitute for implementing the automatic tool.
