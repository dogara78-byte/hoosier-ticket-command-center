# Patch 7 - Manager Entry Upgrade

This patch upgrades manager entry after the first confirmed Graph writeback.

What changed:
- Adds transaction presets.
- Adds category, transaction type, allocation type, game, game ID, season, and notes fields.
- Adds validation before writeback.
- Enforces manager-only append using `managerEmail` from `config.js`.
- Keeps member dashboards read-only.
- Preserves the 26-column TransactionsTable writeback shape.

Upload everything except `config.js` to the GitHub repo root.
