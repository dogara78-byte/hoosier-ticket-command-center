# Patch 4

Purpose: remove async startup/fetch dependency. The app renders from inline data first, then Graph connection is a separate action.

Upload these files to the repo root and keep config.js:
- index.html
- styles.css
- app.js
- graph-client.js
- data/ledger-fallback.json

Verify with: https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch4fresh
You should see v2026.06.25-patch4 and the Score page should render immediately.
