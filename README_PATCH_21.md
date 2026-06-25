# Patch 21 - Snapshot Download Fix

Fixes the Manager button for downloading `public-ledger.json`.

Changes:
- Wraps snapshot generation/download in error handling.
- Uses a more reliable browser click event for the JSON download.
- Shows a backup download link after generation.
- Shows a copy/paste JSON fallback if the browser blocks downloads.

Use Dennis manager mode: `?manager=1&v=patch21snapshot`.
