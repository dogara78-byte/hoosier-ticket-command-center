# Patch 12 - Current Season Calculation Fix

This patch corrects the Patch 11 member-view math. Patch 11 was summing all historical workbook rows across 2024, 2025, and 2026, and also displayed Dennis_x2 as if it were a separate person.

Patch 12 changes live Seats, Parking, and Settlement calculations to scope to the active/current season (max Season in TransactionsTable) and treats Dennis_x2 as part of Dennis for settlement/person balances.

Upload/overwrite index.html, styles.css, app.js, graph-client.js, ledger-fallback.json, and data files as usual. Keep config.js.
