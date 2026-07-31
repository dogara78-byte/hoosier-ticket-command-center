# Patch 28B - Parking Cost Split

This patch refines the Money page so parking is no longer hidden inside broad cost totals.

## What changed

- Adds separate **Ticket Costs** card.
- Adds separate **Parking Costs** card.
- Keeps **Parking Sales / Resales** separate from parking costs.
- Adds **Other Costs** for travel, non-ticket fees, and miscellaneous expenses.
- Renames broad **Money Spent** to **Total Costs** so it is clear that it is a roll-up.
- Keeps Dennis audit details with the same split.

## Upload notes

Upload/overwrite the app files from this patch, but preserve:

- `config.js`
- `data/public-ledger.json`

Do not overwrite `data/public-ledger.json` unless intentionally publishing a fresh member snapshot.
