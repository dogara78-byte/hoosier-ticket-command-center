# Patch 9 - Real Transaction Workflow

Upload/overwrite these files in the GitHub repository root:

- index.html
- styles.css
- app.js
- graph-client.js
- data/ledger-fallback.json
- README_PATCH_9.md

Keep your existing config.js.

Open the app with:

https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch9workflow

Expected version label:

v2026.06.25-patch9-real-workflow

## Adds

- More opinionated transaction presets and preset guidance.
- Stronger validation for amount signs, parking/member allocation, ticket/seat allocation, and test rows.
- Allocation preview showing member and seat impact before append.
- Reversal helper that creates an offsetting correction row instead of deleting history.
- Recent transaction filters by season, asset, member, and search term.
- Final confirmation before append.
