# Patch 31 - Scroll to Top on Page Change

This patch changes bottom-navigation behavior so each time a member or manager selects a different page, the app renders that page from the top instead of keeping the prior scroll position.

Upload/overwrite all app files from this package, but preserve `config.js` and `data/public-ledger.json`.

Test public/member view:

```
https://dogara78-byte.github.io/hoosier-ticket-command-center/?v=patch31scroll
```

Test manager view:

```
https://dogara78-byte.github.io/hoosier-ticket-command-center/?manager=1&v=patch31scroll
```

Expected version:

```
v2026.06.25-patch31-scroll-top
```

Expected behavior: scroll down on Money, tap Seats, and Seats should start at the top. Repeat for Parking, History, and Settle.
