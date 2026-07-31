# Hoosier Ticket Command Center - Graph Patch 2

Version marker: `v2026.06.25-graph2`

Upload these files to the ROOT of the GitHub repo and overwrite the old files:

- `index.html`
- `styles.css`
- `app.js`
- `graph-client.js`
- `data/ledger-fallback.json`

Do not overwrite your existing `config.js`.

After commit, verify deployment by opening:

- `https://dogara78-byte.github.io/hoosier-ticket-command-center/index.html?v=patch2verify`
- `https://dogara78-byte.github.io/hoosier-ticket-command-center/app.js?v=patch2verify`
- `https://dogara78-byte.github.io/hoosier-ticket-command-center/graph-client.js?v=patch2verify`

The app screen should show version `v2026.06.25-graph2` under the Connect OneDrive button.

If it does not, GitHub Pages is still serving old files or the files were uploaded into a subfolder instead of the repo root.
