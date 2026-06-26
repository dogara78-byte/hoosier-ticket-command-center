# Patch 25 - Final Header + Branding Polish

This patch cleans up the public/member header and adds the supplied IU image as a branded header asset.

## Upload / overwrite

- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- assets/iu-logo.png
- README_PATCH_25.md

## Keep existing

- config.js
- data/public-ledger.json

Do not overwrite `data/public-ledger.json` during normal app patches unless publishing a fresh member snapshot.

## Expected version

`v2026.06.25-patch25-header-branding`

## Changes

- Replaces the placeholder IU block with the uploaded IU logo asset.
- Hides the top-right Data Mode / build number from the normal public member view.
- Keeps OneDrive status and build number visible in Dennis manager mode using `?manager=1`.
