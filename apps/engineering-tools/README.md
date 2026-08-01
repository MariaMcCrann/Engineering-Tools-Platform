# RORB Median Flow

Browser-based processor for RORB `batch.out` results.

## Features

- Reads single-pattern and ARR temporal-pattern ensemble batch outputs.
- Detects available hydrograph locations.
- Groups peak flows by AEP and duration.
- Calculates the median of each temporal-pattern ensemble.
- Selects the smallest peak strictly above the median (the 1-up median).
- Identifies the critical duration and temporal pattern for each AEP.
- Flags missing or incomplete temporal-pattern groups.
- Exports the result summary as CSV.
- Processes files locally in the browser.

## Verification dataset

The ensemble test file used during development contained 1,680 rows: 168 AEP-duration groups with 10 temporal patterns per group.

Representative verified results for the Outlet hydrograph:

| AEP | Critical duration | 1-up median flow (m³/s) | Temporal pattern |
| --- | ---: | ---: | ---: |
| 63.2% | 18 hour | 1.4287 | TP8 |
| 50% | 18 hour | 1.7448 | TP8 |
| 20% | 9 hour | 3.5866 | TP5 |
| 10% | 9 hour | 4.9888 | TP18 |
| 5% | 9 hour | 6.6101 | TP18 |
| 2% | 9 hour | 9.1824 | TP27 |
| 1% | 6 hour | 11.4326 | TP24 |

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```
