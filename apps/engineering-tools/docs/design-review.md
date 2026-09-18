# Design Review & Close-out — version 1

Open **Design & Documentation → Design Review & Close-out** from the platform dashboard, or visit `/design-review`.

## First review

1. Enter your name and choose Reviewer.
2. Choose **Start ST045683 case** for the source-based culvert case, or **New review** for a blank review of any asset.
3. Confirm project details, reviewer/designer assignment, documents, revisions and scope. The sample intentionally leaves unverified stage, revision and location blank.
4. Select a check. Record a finding as Compliant, Comment, Action required or Not applicable, with a reason. Compliant also requires an evidence reference.
5. A designer records a response against Comment or Action required, identifying revised evidence. The original comment is retained.
6. The reviewer records Reviewer verification, then Closed, or requests further action. Further action after response/verification/closure starts another numbered round.
7. Close the review with a final statement once every check is Compliant, Closed or Not applicable. Reopen to consider later revisions; all prior entries remain.

Dashboard counts use the entered name and assigned reviewer/designer. **All reviews on this device** lets you access other assignments. These are workflow conveniences, not access controls.

## Handoff and backup

Reviews save to this browser's local storage after each recorded action. They do not synchronise to another computer, browser or deployment URL. Clearing browser storage removes the local copy.

- Download **Review file** (JSON) after issuing comments and as a regular backup.
- Send that file to the designer using your normal document exchange process. The app does not send messages.
- The designer imports it, enters their name, selects Designer, records responses and downloads the updated file.
- Import the returned file into the reviewer's workspace. Only a sequential extension of local history is accepted. Older files and competing edits are rejected without replacing history.
- Do not work on two copies concurrently. If histories diverge, retain both exports and re-enter outstanding responses against the latest agreed file.
- A second browser tab changing the saved collection blocks further writes until reload. Copy unsaved draft text before navigating, switching checks/roles or reloading. Unsubmitted forms are not saved.

## Downloads

- **Excel register (.xlsx):** metadata, current register, every response round and audit trail, with filters and frozen headings. This is a snapshot, not a re-import format.
- **Word report (.docx):** metadata, current outcomes, source provenance, all rounds and audit trail.
- **PDF / Print report:** opens a complete report preview. Use its Print / Save as PDF button and the browser's PDF destination. A printable HTML download is also available.
- **Review file (.json):** complete versioned review record for backup and sequential handoff.

## Source basis

The original ST045683 marked-up drawing set and issued review register were not found in the accessible local files or Drive search. The seeded case is explicitly reconstructed, not presented as an issued or completed assessment:

- `Engineering Tool Ideas`, conversation `6aac974f-bbf8-83ec-8246-69ceb40f4348`: ST045683 twin-cell 2400 × 1800 case, dimensions/levels/services/backfill, channel-versus-barrel velocity, scour, headwall and coordination topics. The reported 3000/6840 mm discrepancy needs original drawing verification.
- `Assessing Design Basis`, conversation `6a9f28e1-fd50-83ec-8789-4e8a65b3682b`: agreed wording requesting hydraulic basis, flows, channel/culvert velocities, head losses, rock protection and headwall justification. This conversation did not identify ST045683; the template explicitly requires confirmation of association.
- `Culvert Review Checklist`, conversation `6a960d22-89b0-83ec-8a36-c531ae9e0e45`: existing checklist for scour details, capacity/headwater/afflux and constructability.

Every seeded check begins **Not reviewed**. No designer responses, accepted calculations, revision numbers or close-out decisions are fabricated. Guideline text must be assessed and deliberately recorded before it becomes a formal comment. This tool does not calculate or certify culvert adequacy.

## Architecture and extension

- `app/design-review/engine.ts`: asset-neutral typed record, immutable workflow operations, numbered rounds, validation, queues and sequential import rules.
- `templates.ts`: source-specific check definitions, separate from the engine. New asset templates can provide the same discipline/title/guidance/source fields.
- `exports.ts`: exports from the complete record, independent of screen filters or selected check.
- `DesignReviewTool.tsx`: local repository adapter and React workflow UI. Schema version 1 enables future migration.
- `Evidence` supports calculator identifiers, evidence references, optional captured input/output snapshots and timestamps. Version 1's UI records calculator references only; automatic calculator capture is not implemented. A future adapter should append a captured snapshot to a new entry, never overwrite the snapshot used for an earlier decision.
- A shared service can replace local storage while retaining the engine and record structure. Before multi-user production use, add authenticated identity, project permissions, transactional concurrency, durable storage/backups and a server-controlled audit log. The current role selector is self-declared, and local JSON is editable outside the app.

## Validation

Run `node --experimental-strip-types --test tests/design-review.test.mjs`, then `npm run build`. CI runs the workflow/export tests. Tests cover two rounds, close/reopen, role restrictions, evidence requirements, closure guards, assignments, immutable history, stale/conflicting imports and Excel/Word contents.
