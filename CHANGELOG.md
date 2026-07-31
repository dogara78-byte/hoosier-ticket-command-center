# Changelog

## v3.1.0 — One fund, auto-publish, dark mode

- **Unified the fund model**: `SharedOpportunity` (postseason/away/single-game
  purchases split evenly Dennis/Joel/Kyle) now counts toward the same overall
  per-member balance instead of being tracked as a separate pool.
- Fixed two rounding bugs surfaced by that change: `round2()` rounded `.5`
  toward +Infinity regardless of sign (asymmetric on exact half-cent splits),
  and per-seat cost shares were rounded once per seat instead of once per
  owner's total (drifted a cent for Dennis's two seats). Both now round
  correctly.
- Removed dead seat-balance code (`seatBalances`/`seatNet`/`seatExpenseShare`/
  etc.) left over from the v3.0 rebuild that was never wired into any screen.
- **Auto-publish to GitHub**: Manager can connect a GitHub token once
  (`github-client.js`) and publish the member snapshot with one click instead
  of downloading and manually uploading the file. Manual download stays as a
  fallback.
- **Settle Up**: added a "Copy summary" button on Home's settlement section,
  plus print-friendly styles for sharing/printing a clean payout recap.
- **Dark mode**: follows OS `prefers-color-scheme`, no manual toggle.
- **Freshness indicator**: "Updated X ago" now shows prominently on Home,
  not just in the footer.
- Branding: added a 🌭 next to "Halftime Glizzy's Ledger".

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
