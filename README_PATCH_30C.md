# Patch 30C - Penny Tolerance for Settled 2026

This patch keeps the accounting logic from Patch 30, but treats tiny residual balances as settled in the member-facing dashboard.

Why: 2026 parking uses fractional cents ($18.375 per fund share per installment), and Excel/Graph/table rounding can leave harmless penny-level amounts such as $0.04, $0.12, or $0.65. Dennis confirmed the 2026 group is fully paid and the fund is depleted until the first sale.

What changed:
- Member-facing Seats, Parking, and Settlement balances within $1.00 of zero display as $0.00 / settled.
- Suggested settlement transfers are suppressed for those tiny residuals.
- Manager audit sections still remain available for Dennis to inspect row-level details.

Upload all files except keep existing config.js and data/public-ledger.json.
