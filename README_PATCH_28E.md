# Patch 28E - Money Sign and Bucket Fix

Fixes Money page breakdown so purchase/cost rows are displayed as costs even when the source workbook stores the row total as a positive number.

Key corrections:
- Postseason Purchase and Other Game Purchase rows move out of Other Money In.
- Purchase/cost buckets display as negative fund impact.
- Ticket/parking resale buckets remain positive fund proceeds.
- Seth direct payout remains excluded from fund proceeds.
- Money breakdown subtotals now use the signed bucket amount shown to members.

Keep `config.js` and `data/public-ledger.json` when uploading normal app patches.
