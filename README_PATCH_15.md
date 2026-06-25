# Patch 15 - Fund Baseline + Settlement Clarity

This patch updates settlement around Dennis' confirmed accounting rule:

- Positive member balance means the member is owed money back from the fund.
- Negative member balance means the member owes money into the fund.
- For 2026, all members are fully paid and the ticket fund is depleted until the first sale.

## Changes

- Adds a Ticket Fund Position card to Settlement.
- Replaces person-to-person netting with fund-based settlement rows.
- Clarifies that 2026 starts at $0 because everyone is paid in and the fund is depleted.
- Preserves the season selector and audit rows from Patch 14.
- Updates version to v2026.06.25-patch15-fund-baseline.

Upload all files from this package, but keep your existing config.js.
