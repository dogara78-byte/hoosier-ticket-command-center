# Patch 28C - Money Calculation Breakdown

This patch replaces the Money page recent activity feed with a calculation breakdown for the selected season.

## What changed

- The Money page now shows **Money Breakdown for the selected season** instead of generic recent transactions.
- Rows are grouped into member-friendly buckets:
  - Ticket Sales / Resales
  - Ticket Costs
  - Parking Sales / Resales
  - Parking Costs
  - Other Costs
  - Member / Fund Money
  - Other Money In
- Each bucket shows the exact rows feeding the cards above it.
- Transaction IDs stay out of the member-facing breakdown.

## Upload notes

Upload all patch files except keep your existing `config.js` and `data/public-ledger.json`.

Do not overwrite `data/public-ledger.json` unless you are intentionally publishing a fresh member snapshot.
