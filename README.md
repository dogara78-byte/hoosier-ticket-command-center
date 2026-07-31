# Hoosier Ticket Command Center

A hosted mobile-friendly app that tracks a shared IU football season-ticket
fund. The Excel workbook (on OneDrive) is the source of truth; the app reads
it live via Microsoft Graph for the manager, and reads a published read-only
JSON snapshot for other members.

## Structure

Three screens:
- **Home** — fund status, who owes/is owed money, recent activity.
- **Activity** — one filterable/groupable ledger of every transaction
  (filter by season, money type, member, or free-text search; group by game).
- **Manager** (Dennis only, via `?manager=1` + OneDrive sign-in) — enter
  transactions, build reversals, publish the member snapshot.

Every transaction has an explicit `MoneyType` (`TicketSale`, `ParkingSale`,
`TicketCost`, `ParkingCost`, `OtherCost`, `MemberFunding`, `SharedOpportunity`)
set at entry time in Manager — the app does not try to guess a transaction's
meaning from its description text. See `CHANGELOG.md` for what changed from
the original 8-screen build.

## Migrating an existing workbook to add `MoneyType`

If your `TransactionsTable` doesn't have a `MoneyType` column yet:
1. Run `node scripts/backfill-money-type.mjs` to backfill `data/public-ledger.json`
   and generate `scripts/output/money-type-column.txt`.
2. Add a `MoneyType` column as the last column of the live `TransactionsTable`
   in the OneDrive workbook.
3. Paste the values from `money-type-column.txt` in `TxnID` order.
4. Resize the table if needed so the new column is included.

New transactions entered through Manager set `MoneyType` automatically.

## Best hosting path

Use **GitHub Pages** first. It gives the app a real HTTPS URL, which is required for a smooth Microsoft sign-in redirect. Do not share it by opening the HTML file directly from OneDrive preview or a ZIP.

Your home workstation can host it for your own testing, but it is not ideal for the group unless you set up a stable HTTPS URL, router/firewall rules, TLS certificate, and redirect URI. For this project, GitHub Pages is cleaner and safer.

## Setup now

1. Extract this folder.
2. Upload the folder to a private or carefully controlled GitHub repository.
3. Enable GitHub Pages for the folder/repo.
4. Open the GitHub Pages URL.
5. The app will load `data/public-ledger.json` (the published member snapshot)
   until Microsoft Graph is configured and a manager signs in.

## OneDrive integration later

After app registration, copy `config.sample.js` to `config.js` and update:

- `clientId`
- `tenantId` — for personal Microsoft accounts use `consumers`
- `redirectUri` — your GitHub Pages URL
- `managerEmail`
- workbook `driveId` and `itemId`

The workbook remains the source of truth until manager writeback is tested.

## Publishing the member snapshot

Manager has two ways to publish `data/public-ledger.json` after changes:
- **Connect GitHub** (recommended) — paste a fine-grained GitHub token (scoped
  to just this repo's Contents: read/write) once in Manager. It's saved in
  that browser's local storage, and "Publish to GitHub" pushes the snapshot
  directly with no manual file upload. Create a token at
  https://github.com/settings/personal-access-tokens/new.
- **Manual download** — always available as a fallback: download the JSON and
  replace `data/public-ledger.json` on GitHub yourself.

## Privacy

`data/public-ledger.json` contains real financial data (real dollar amounts
and per-member breakdowns). Do not publish it in a public repository unless
that's an intentional, informed choice — otherwise keep the repository/site
private or switch the app to Graph-only reads.
