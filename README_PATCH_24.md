# Patch 24 - Member View Cleanup

This patch cleans up the public/member experience so Joel and Kyle see a polished dashboard instead of build-time warnings and accounting/debug notes.

## Changes

- Hides privacy/build warnings from the normal public member view.
- Keeps workbook, Graph, row-count, and audit details in Dennis/manager mode.
- Replaces public missing-data messages with friendlier member language.
- Keeps snapshot update text compact: updated timestamp + read-only status.
- Hides manager audit details on Seats, Parking, Settlement, and Score unless using manager/live mode.
- Preserves the public snapshot workflow: do not overwrite `data/public-ledger.json` during normal app patches.

## Upload

Upload/overwrite:

- `index.html`
- `styles.css`
- `app.js`
- `graph-client.js`
- `ledger-fallback.json`
- `data/ledger-fallback.json`
- `README_PATCH_24.md`

Keep existing:

- `config.js`
- `data/public-ledger.json`
