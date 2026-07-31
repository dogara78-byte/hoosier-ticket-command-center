# Patch 26 - Share Polish

Member-facing polish before sharing the public link.

## What changed

- Adds a small footer with the snapshot/live refresh timestamp.
- Adds a simple "How to read this" card on the public Score page.
- Keeps manager-only build/data details hidden from normal member view.
- Leaves `data/public-ledger.json` out of the patch workflow so the published member snapshot is preserved.

## Upload / overwrite

- `index.html`
- `styles.css`
- `app.js`
- `graph-client.js`
- `ledger-fallback.json`
- `data/ledger-fallback.json`
- `assets/iu-logo.png`
- `README_PATCH_26.md`

## Preserve

- `config.js`
- `data/public-ledger.json`

## Test links

Public member view:

`https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch26share`

Dennis manager view:

`https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch26share`

Expected version in manager mode:

`v2026.06.25-patch26-share-polish`
