# Patch 36 - Excel Date Normalization

Fixes transaction dates displayed as Excel serial numbers (for example `46234` or `46258`) after rows are read back from the OneDrive workbook through Microsoft Graph.

The app now normalizes Excel serial dates to ISO dates (`YYYY-MM-DD`) when transactions are loaded from either the live workbook or the public snapshot. Sorting, Recent Activity, History, Games, Manager reversal options, and snapshot metadata use the normalized date.

Examples:
- `46234` -> `2026-07-31`
- `46258` -> `2026-08-24`

Keep the existing `config.js` and `data/public-ledger.json` unless you intentionally publish a fresh snapshot.
