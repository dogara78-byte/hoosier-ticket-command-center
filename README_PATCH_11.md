# Patch 11 - Public Member Snapshot Mode

This patch adds a read-only public member snapshot path for friends who do not have OneDrive/Microsoft accounts.

## Upload/overwrite

- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- data/public-ledger.json
- README_PATCH_11.md

Keep your existing config.js.

## How it works

Dennis signs in with OneDrive as manager. The app reads the live workbook. From Manager, click **Download public-ledger.json**. Upload that downloaded file to GitHub at:

`data/public-ledger.json`

Joel and Kyle can then open the normal GitHub Pages dashboard without OneDrive sign-in. The app will load `data/public-ledger.json` as a public read-only snapshot.

## Privacy

If the GitHub Pages site/repo is public, anything in `data/public-ledger.json` is public. This patch is intended as a bridge to a future secure automated publish layer.
