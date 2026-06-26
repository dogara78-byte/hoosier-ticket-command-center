# Patch 29: Classification Audit Fix

This patch tightens the money and history calculations after a deep review of the workbook rows and app logic.

## Fixes

- History no longer groups purchase rows under Sales / Resales just because `TransactionType` says `Purchase/Resale`.
- Member-facing tables use signed fund impact instead of raw workbook amount.
- Positive purchase rows are shown as costs in the app.
- Parking sales and parking costs are separated consistently.
- Member/fund money such as credits, top-offs, opening balances, and member payments is classified before cost logic.
- Seth's historical direct payout sale/resale proceeds are excluded from shared fund proceeds and member settlement credits.
- Seat and settlement calculations now treat cost rows as costs even if the workbook stores the raw `TotalAmount` as positive.
- Parking page sales/cost cards use the same classification logic as the Money page.

## Preserve these files

Do not overwrite:

- `config.js`
- `data/public-ledger.json`

Only publish `data/public-ledger.json` when intentionally updating the public member snapshot.

## Test URLs

Public:
`https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch29audit`

Manager:
`https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch29audit`

Expected version:
`v2026.06.25-patch29-classification-audit`
