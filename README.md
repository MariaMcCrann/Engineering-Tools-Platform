# Engineering Tools Platform

A private, unified collection of browser-based civil engineering calculation and workflow tools.

**Design Review & Close-out** is available under Design & Documentation and at `/design-review`. It supports source-based culvert checks, other asset types, response rounds, reviewer verification, audit history, local browser persistence, sequential review-file handoff and Excel/Word/printable PDF reports. See [the version 1 guide](apps/engineering-tools/docs/design-review.md) for source provenance and storage limitations.

## Tools included

- **RORB Median Flow** — processes RORB batch output files, calculates the 1-up median flow for each duration, and identifies the critical duration and temporal pattern.
- **Channel Flow** — calculates trapezoidal channel capacity using Manning's equation and displays a cross-section.
- **Stage Storage** — calculates basin stage, area and storage tables and displays a cross-section.
- **Overland Flow** — checks road-reserve overland-flow capacity using Manning’s equation.
- **Rising Main** — calculates pipeline losses, surge pressure, thrust blocks and pump-sump cycling.
- **GSDM PMP** — calculates short-duration PMP depths and credible-limit rainfall inputs for RORB.
- **Spillway** — calculates weir flow, chute hydraulics, hydraulic-jump properties and USBR stilling-basin dimensions.
- **Culvert** — calculates circular and rectangular culvert capacity, normal and critical depth, FHWA HDS-5 inlet control (with the legacy Hidroalcun entrance-type families), outlet control (an actual traced backwater profile on mild slopes, a simplified FHWA energy approximation on steep slopes where a jump may form), the governing design headwater, auto-sizes a culvert dimension to meet a target headwater level, traces the water-surface profile with hydraulic-jump detection, rates tailwater from a rectangular, trapezoidal or surveyed natural-channel cross-section instead of a typed-in depth, and runs a discharge hydrograph as a batch of rows to find the peak governing headwater. Not yet a certified replacement for the legacy Hidroalcun design software (the profile trace follows the governing boundary condition rather than the legacy app's 17 named profile-family cases exactly).
- **Proposal Tool** — sends RFQ documents to the established proposal-analysis and document-generation service.

All nine tools are available from the **All Tools** screen and the persistent left navigation.

## Railway deployment

Create a Railway service from this repository and configure:

1. **Root Directory:** `/apps/engineering-tools`
2. **Config file path:** `/apps/engineering-tools/railway.json`
3. **Environment variable:**
   `NEXT_PUBLIC_PROPOSAL_PROCESS_URL=https://rain-proposal-tool-production.up.railway.app/process`
4. Generate a public Railway domain after the deployment becomes healthy.

The Railway configuration runs a standard Next.js production build and binds the server to Railway's `PORT`.

The proposal analysis remains a separate backend service. The environment variable allows its address to be changed without editing application code.

## Request a New Tool email setup

The dashboard posts to the Next.js server at `/api/tool-requests`, which sends a plain-text email through Resend to `maria.mccrann@floodriskadvisory.com.au`. Requests are no longer saved to localStorage. No existing email provider was configured in this repository.

Before delivery works:

1. Create a Resend account and verify a sending domain by adding its required DNS records. See https://resend.com/docs/dashboard/domains/introduction.
2. Create a sending API key, preferably restricted to that domain.
3. In the **Engineering Tools Railway service → Variables**, set `RESEND_API_KEY` to that secret and `TOOL_REQUEST_FROM_EMAIL` to a verified sender, for example `Engineering Tools <tools@floodriskadvisory.com.au>` after verifying that domain. The sender and recipient can differ. Do not use Resend's test sender for production delivery to arbitrary recipients.
4. Redeploy the service with these variables. For local development put them in `apps/engineering-tools/.env.local`, which is gitignored. Never prefix either variable with `NEXT_PUBLIC_` or commit real credentials.
5. Submit a distinctive request from the dashboard. Confirm “Request submitted”, then check Resend's delivery log and Maria's inbox/spam folder. The UI confirms provider acceptance, not guaranteed inbox delivery.

The form preserves text on configuration, provider or network errors, disables submission while sending, and reuses an idempotency key for retries of unchanged text. Resend retains idempotency keys for 24 hours; closing/reloading the page starts a new submission. Old localStorage requests are not automatically sent.

The server enforces same-origin JSON requests, a 24 KB body limit, a 5,000-character text limit, a 15-second provider timeout and a cap of 10 send attempts per minute per server instance. This cap resets on restart and is not a distributed abuse control; use an edge/WAF rate limit or shared limiter if deploying multiple replicas or experiencing spam. No authentication is implied by the origin check. Provider error details, request text and credentials are not returned to the browser or logged.

Run the mocked route tests with `node --experimental-strip-types --test tests/tool-requests.test.mjs` from the app directory. They do not send real emails. Production deployment remains the documented Railway Next.js server; the separate experimental Worker entry point is not configured by these instructions.

## Local development commands

```bash
cd apps/engineering-tools
npm install
npm run dev
```

## Privacy

Keep this repository private. The applications reproduce engineering workflows developed from internal calculation resources.
