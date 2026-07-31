# Hoosier Ticket Command Center — Graph-ready build

This is the next-step package: a hosted mobile app that keeps the Excel workbook as the official source of truth and prepares for Microsoft Graph / OneDrive integration.

## Best hosting path

Use **GitHub Pages** first. It gives the app a real HTTPS URL, which is required for a smooth Microsoft sign-in redirect. Do not share it by opening the HTML file directly from OneDrive preview or a ZIP.

Your home workstation can host it for your own testing, but it is not ideal for the group unless you set up a stable HTTPS URL, router/firewall rules, TLS certificate, and redirect URI. For this project, GitHub Pages is cleaner and safer.

## Setup now

1. Extract this folder.
2. Upload the folder to a private or carefully controlled GitHub repository.
3. Enable GitHub Pages for the folder/repo.
4. Open the GitHub Pages URL.
5. The app will load `data/ledger-fallback.json` until Microsoft Graph is configured.

## Current accuracy notes

- Current 2026 account balance: $0.00.
- Historical regular sales handled: $6,531.60.
- Ticket sales and parking are shown separately.
- 2025 postseason history includes the Big Ten Championship, Rose Bowl, Peach Bowl, and CFP National Championship.

## OneDrive integration later

After app registration, copy `config.sample.js` to `config.js` and update:

- `clientId`
- `tenantId` — for personal Microsoft accounts use `consumers`
- `redirectUri` — your GitHub Pages URL
- `managerEmail`
- workbook `driveId` and `itemId`

The workbook remains the source of truth until manager writeback is tested.

## Privacy

This package contains real financial data in `data/ledger-fallback.json`. Do not publish the JSON publicly unless the repository/site is appropriately private or you switch the app to Graph-only reads.
