# Patch 30 - 2026 Four-Fund Allocation Fix

This patch fixes the remaining 2026 balances caused by treating the 2026 parking/member-split costs as a three-person split while also rolling Dennis_x2 into Dennis.

## Rule fixed
For 2026, there are four active fund shares for cost allocation:

- Dennis
- Joel
- Kyle
- Dennis x 2

Dennis x 2 is still shown as Dennis on member-facing settlement, but it receives its own cost share before rolling into Dennis.

## Expected result
For 2026, after refreshing the cleaned workbook:

- Money: fund balance $0.00, everyone paid up
- Seats: active seat balances should be settled / $0.00
- Parking: Dennis, Joel, and Kyle should be settled / $0.00
- Settlement: no one owes money

## Upload notes
Upload/overwrite all app files from this ZIP, but preserve `config.js` and `data/public-ledger.json`.
