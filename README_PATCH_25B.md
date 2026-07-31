# Patch 25B - Hide Manager Tab in Member View

This patch hides the Manager tab from the normal public/member view. Dennis can still access Manager tools using `?manager=1`.

## Upload / overwrite

- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- assets/iu-logo.png
- README_PATCH_25B.md

## Preserve

- config.js
- data/public-ledger.json

## Test links

Member view:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch25bmember

Manager view:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch25bmanager
