# Patch 13 - Accounting Rules Fix

This patch fixes Seats and Settlement by separating member credits/payments from allocated costs.

Settlement rule: positive means a member is owed money back from the fund; negative means the member owes money into the fund.

For negative cost rows, the app treats member/seat columns as payments or credits and allocates the actual expense from TotalAmount according to AllocationType. For positive rows, member/seat columns are treated as revenue/credit.

Deploy all files except config.js.
