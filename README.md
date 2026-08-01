# Engineering Tools Platform

A private, unified collection of browser-based civil engineering calculation and workflow tools.

## Tools included

- **RORB Median Flow** — processes RORB batch output files, calculates the 1-up median flow for each duration, and identifies the critical duration and temporal pattern.
- **Channel Flow** — calculates trapezoidal channel capacity using Manning's equation and displays a cross-section.
- **Stage Storage** — calculates basin stage, area and storage tables and displays a cross-section.
- **Overland Flow** — checks road-reserve overland-flow capacity using Manning’s equation.
- **Rising Main** — calculates pipeline losses, surge pressure, thrust blocks and pump-sump cycling.
- **GSDM PMP** — calculates short-duration PMP depths and credible-limit rainfall inputs for RORB.
- **Spillway** — calculates weir flow, chute hydraulics, hydraulic-jump properties and USBR stilling-basin dimensions.
- **Proposal Tool** — sends RFQ documents to the established proposal-analysis and document-generation service.

All eight tools are available from the **All Tools** screen and the persistent left navigation.

## Railway deployment

Create a Railway service from this repository and configure:

1. **Root Directory:** `/apps/engineering-tools`
2. **Config file path:** `/apps/engineering-tools/railway.json`
3. **Environment variable:**
   `NEXT_PUBLIC_PROPOSAL_PROCESS_URL=https://rain-proposal-tool-production.up.railway.app/process`
4. Generate a public Railway domain after the deployment becomes healthy.

The Railway configuration runs a standard Next.js production build and binds the server to Railway's `PORT`.

The proposal analysis remains a separate backend service. The environment variable allows its address to be changed without editing application code.

## Local development

```bash
cd apps/engineering-tools
npm install
npm run dev
```

## Privacy

Keep this repository private. The applications reproduce engineering workflows developed from internal calculation resources.
