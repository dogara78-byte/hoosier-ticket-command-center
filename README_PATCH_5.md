# Patch 5

Purpose: replace the Microsoft MSAL CDN that was blocked by ORB with jsDelivr CDN.

Upload these files to the repo root and keep config.js:

- index.html
- app.js
- graph-client.js
- styles.css
- data/ledger-fallback.json

Expected version marker: v2026.06.25-patch5

After deployment, open DevTools console and run: typeof msal
Expected result: "object"
