# Changelog

## v3.0.0 — Consolidated rebuild

Replaces the incremental patch history (previously tracked as ~48 separate
`README_PATCH_*.md` files) with a single rebuild:

- Added an explicit `MoneyType` field to every transaction (`TicketSale`,
  `ParkingSale`, `TicketCost`, `ParkingCost`, `OtherCost`, `MemberFunding`,
  `SharedOpportunity`) instead of guessing the category from free-text
  `Category`/`Description` fields with regex at render time.
- Backfilled `MoneyType` for all historical transactions
  (`scripts/backfill-money-type.mjs`); see `scripts/output/money-type-column.txt`
  for the values to paste into the live OneDrive workbook.
- Consolidated the 8-screen nav (Score, Money, Seats, Parking, History, Games,
  Settle, Manager) down to 3: **Home** (fund status + settle-up), **Activity**
  (one filterable/groupable transaction ledger), and **Manager** (Dennis-only
  entry/writeback/snapshot publishing).
- Simplified the visual design: fewer always-open metric cards, consistent
  card chrome, cleaner mobile bottom nav.
- Removed unused workbook table references (`GamesTable`, `MembersTable`,
  `SeatAccountsTable`, `ParkingUsageTable`, `SeatUsageTable`) from config —
  only `TransactionsTable` was ever read.

## Pre-v3.0.0

Built iteratively with ChatGPT from June 2026 onward across ~48 incremental
patches (OneDrive/Graph integration, member/seat/parking tracking, game
summaries, settlement reporting). That history is no longer tracked
file-by-file; see git history from this point forward for future changes.
