# Patch 8 - Live Ledger Refresh and Recent Transactions

Upload these files to the GitHub repository root and keep the existing `config.js`:

- `index.html`
- `styles.css`
- `app.js`
- `graph-client.js`
- `data/ledger-fallback.json`
- `README_PATCH_8.md`

Version marker: `v2026.06.25-patch8-live-refresh`

## What changed

- Loads live rows from OneDrive `TransactionsTable` after sign-in.
- Shows workbook row count and recent transactions on Score, Money, Parking, and Manager screens.
- Adds a Refresh Workbook button.
- After successful writeback, the app re-reads `TransactionsTable` and reports the live row count.
- Keeps the current/fallback dashboard totals separated from workbook status until full accounting formulas are finalized.

## Test

1. Connect OneDrive.
2. Confirm the status says workbook loaded and shows a row count.
3. Go to Manager.
4. Add a test writeback row.
5. Confirm the row appears in the workbook and in Recent Transactions.
6. Delete the test row from the workbook afterward.
