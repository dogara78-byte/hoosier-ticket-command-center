# Hoosier Ticket Command Center - Patch 1

This patch replaces the older accurate/static app with the Graph-ready app shell and fixes the Money page render issue.

Upload these files/folders to the root of your GitHub Pages repo:

- `index.html`
- `styles.css`
- `app.js`
- `graph-client.js`
- `data/ledger-fallback.json`

Keep your existing `config.js` file. Do not overwrite it unless you are intentionally updating the client ID / workbook IDs.

After upload, commit changes and hard refresh:

- Windows: Ctrl + Shift + R
- Mobile: close the tab and reopen the GitHub Pages URL

Expected result:

- Money page loads normally.
- Top-right data mode should show Graph Ready or OneDrive Connected once config.js is active.
- Fallback JSON is still used for dashboard display until workbook table reading is wired fully.
