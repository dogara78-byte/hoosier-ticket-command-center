# Patch 22B - Public Snapshot Preserve

This patch fixes the public/member-view confusion after Patch 22.

Important: do not overwrite `data/public-ledger.json` with the small placeholder file from a patch package after you have published a real snapshot. That file is the live read-only member data for Joel/Kyle.

Upload these files:
- index.html
- styles.css
- app.js
- graph-client.js
- ledger-fallback.json
- data/ledger-fallback.json
- README_PATCH_22B.md

Do NOT overwrite:
- config.js
- data/public-ledger.json, unless you are intentionally publishing a fresh snapshot from Manager mode.

Manager link:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch22bpublic

Public link:
https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch22bpublic
