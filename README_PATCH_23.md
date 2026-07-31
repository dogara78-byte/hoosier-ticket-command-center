# Patch 23 - Publish Checklist

Adds a clear Manager publish checklist for creating the public member snapshot.

## Upload / overwrite

- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- README_PATCH_23.md

## Preserve

- config.js
- data/public-ledger.json

Do not overwrite `data/public-ledger.json` during ordinary app patches. Replace it only when intentionally publishing a fresh member snapshot from Manager mode.

## Test URLs

Manager:
`https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch23publish`

Public/member:
`https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch23publish`
