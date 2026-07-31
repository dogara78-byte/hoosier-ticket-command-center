# Patch 28D - Seth Direct Payout + Workbook Alignment

This patch makes the Money page treat Seth proceeds correctly for 2024/2025 history.

## App changes
- Adds a Seth Direct Payout bucket on the Money page.
- For 2024/2025 ticket or parking sale/resale rows, Seth's positive share is excluded from fund proceeds.
- Ticket Sales / Resales and Parking Sales / Resales now show the amount deposited to the shared fund, not gross sales that included Seth's direct payout.
- Money Breakdown shows a separate Seth Direct Payout group so the member-facing math explains why gross sale proceeds do not equal fund proceeds.

## Workbook cleanup included separately
Use the cleaned workbook file `Hoosier_Ticket_Command_Center_GRAPH_SAFE_SOURCE_CLEANED_28D.xlsx` if you want the uploaded workbook aligned with the app:
- Added TxnIDs TXN-0072 through TXN-0075 to the four 2026 parking installment rows.
- Changed those parking rows from Category `Future Season Ticket` to `Future Parking`.
- Added matching rows in ParkingUsageTable.
- Left TxnDate blank because exact payment dates were not provided.

## Upload instructions
Upload/overwrite the app files from this ZIP, but keep your existing:
- `config.js`
- `data/public-ledger.json` unless you are intentionally publishing a fresh member snapshot
