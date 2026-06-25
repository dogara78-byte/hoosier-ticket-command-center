# Patch 20 - Public Member Snapshot Polish

Version: v2026.06.25-patch20-public-member-polish

## Purpose
This patch makes the app clearer for Joel/Kyle-style public member viewing without OneDrive sign-in.

## Changes
- Adds a clear Read-only Member View message when using `data/public-ledger.json`.
- Adds a snapshot published timestamp / row count status on the Score page.
- Keeps technical workbook row/status information tucked into a collapsible Dennis data-status section.
- Hides Manager transaction controls unless the signed-in account is the configured manager.
- Adds a safer read-only Manager screen for non-managers/public viewers.
- Updates the public snapshot export metadata to include a member-friendly summary block.
- Updates cache/version references to Patch 20.

## Upload
Overwrite the repo root files with this package, but keep your existing `config.js`.

