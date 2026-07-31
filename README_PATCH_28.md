# Patch 28 - Money Classification Fix

This patch tightens the Money page classification so historical seasons do not overstate ticket sales.

## What changed

- Ticket Sales / Resales now counts only true ticket sale or resale proceeds.
- Member payments, top-offs, credits, opening balances, and roll-forwards are separated into Member / Fund Money.
- Purchase, fee, travel, parking cost, and expense rows are not counted as ticket sales just because they have a positive TotalAmount.
- For 2025, the Money page can show the actual amount rolled forward to 2026 separately from gross positive ledger activity.
- Dennis audit details still show raw positive/negative rows for verification.

## Upload notes

Upload the app files from this package, but preserve your existing config.js and data/public-ledger.json.
