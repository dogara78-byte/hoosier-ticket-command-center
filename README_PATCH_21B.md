# Patch 21B - Snapshot Helper Fix

Fixes public-ledger.json snapshot generation when manager mode calls the member summary builder.

## Fixed
- Adds missing `isSaleLike()` helper used by snapshot summary generation.
- Adds missing `escapeHtml()` helper used by the copy/paste fallback JSON box.
- Keeps the Patch 21 fallback behavior: automatic download, backup link, and copyable JSON.

## Test
Open manager mode, connect OneDrive, then click **Download public-ledger.json**.
