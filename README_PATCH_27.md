# Patch 27 - Home Screen Icons / PWA Branding

Adds mobile home-screen icon support using the uploaded IU image.

Upload/overwrite:
- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- assets/iu-logo.png
- assets/apple-touch-icon.png
- assets/icon-192.png
- assets/icon-512.png
- assets/favicon-32.png
- manifest.webmanifest
- README_PATCH_27.md

Keep existing:
- config.js
- data/public-ledger.json

Do not overwrite data/public-ledger.json unless publishing a fresh member snapshot.

Public test URL:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch27icons

Manager test URL:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch27icons

Expected manager version:
v2026.06.25-patch27-home-screen-icons

Notes:
- iOS uses assets/apple-touch-icon.png through apple-touch-icon.
- Android/general web app support uses manifest.webmanifest plus 192 and 512 icons.
- Paths are relative so they work under the GitHub Pages subfolder.
