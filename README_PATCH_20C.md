# Patch 20C - Public Header Cleanup

This patch makes the header behave differently for public members and Dennis manager mode.

## Public/member link
Use the normal site URL. The header shows read-only snapshot/member mode and hides the Connect OneDrive button.

## Dennis manager link
Use `?manager=1` in the URL. The header shows manager mode and displays Connect OneDrive.

Example:
`https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch20c`

## Notes
- Keeps `config.js` unchanged.
- Public viewers do not need OneDrive.
- Dennis can still connect OneDrive from the manager link for live workbook refresh/writeback.
