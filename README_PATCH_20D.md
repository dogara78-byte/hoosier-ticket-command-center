# Patch 20D - Plain-English Money Page

This patch removes member-facing accounting/developer language from the Money page.

## Changes

- Renames the Money page header to plain `Money`.
- Replaces confusing member-facing labels like `Selected Scope Net Activity`, `Positive / Inflow Rows`, and `Cost / Outflow Rows`.
- Uses member-friendly labels: `Fund Balance`, `Member Status`, `Money Collected`, `Money Spent`, `Ticket Sales`, and `Parking Sales`.
- Keeps raw ledger math in a collapsible `Dennis audit details` section.
- Preserves manager mode, public snapshot mode, and OneDrive writeback behavior.

## Test URLs

Public member view:

```
https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch20dmoney
```

Manager view:

```
https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch20dmoney
```
