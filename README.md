# Nuba

A fast, privacy-friendly tracker and discovery site. It ships configured for anime,
with data from [AniList](https://anilist.co), but the data source and wording are
swappable: the same app can track books, games, or anything else with a catalog.
Named after *nubatama*, an old poetic word for black.

Nuba does not host, embed or link to unofficial content. The "Where to watch"
section only shows official services listed by the catalog.

## Features

- Home page with a hero carousel, shelves, a top-ranked list and a release schedule
  in the viewer's timezone (whatever the catalog provides)
- Search, browsing, and detail pages with outbound links and recommendations
- **Nuba's own accounts and lists**: username and password only, no email, nothing
  linked to a third-party account. Continue Watching row, status badges on cards,
  one-click progress, and a list editor on every title
- Dark/light mode, 8 accent presets or any custom color, title language, reduce-motion
- Works with JavaScript disabled (Tor Browser "Safest"): server-rendered pages,
  CSS-only menu and tabs, and plain forms for sign-in, settings and lists
- Catalog data and images go through the server, with caching, so visitors' browsers
  never contact third parties

## Run it

Requires Node.js 20.19+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Production:

```bash
npm run build
PORT=3000 HOST=127.0.0.1 npm start
```

See `.env.example` for configuration. Accounts and lists are stored in
`data/nuba.db` (SQLite); back up that file to back up your users.

## How it fits together

| Piece | Where | What to change to repurpose Nuba |
| --- | --- | --- |
| Data source | `src/lib/server/catalog/` | Add a folder that implements the `Catalog` interface in `catalog/types.ts`, register it in `catalog/index.ts`, set `NUBA_CATALOG` |
| Wording | `src/lib/site.ts` | Site name, search placeholder, unit name (episode → chapter), list status labels |
| Data model | `src/lib/types.ts` | Generic `Item`, `ItemDetail`, `HomeFeed`, used by every page |
| Accounts and lists | `src/lib/server/users.ts`, `library.ts` | Independent of the catalog. Each list entry stores a snapshot of its item, so lists keep working if the catalog changes or goes offline |

Nothing outside `src/lib/server/catalog/` knows AniList exists. Syncing lists with
AniList (or another service) can be added later as a separate, optional feature.

## Hosting as a Tor onion service

Bind Nuba to localhost only, then point a hidden service at it in `/etc/tor/torrc`:

```
HiddenServiceDir /var/lib/tor/nuba/
HiddenServicePort 80 127.0.0.1:3000
```

Restart Tor; your `.onion` address is in `/var/lib/tor/nuba/hostname`.
Keep `NUBA_IMAGE_PROXY=true` so images are served from your own server.

## Notes

- Passwords are hashed with scrypt; sessions are random tokens of which only a hash
  is stored. There is no email, so forgotten passwords cannot be reset.
- Repeated wrong passwords for one username are slowed down per username rather than
  per IP, because over Tor every visitor shares an IP.
- AniList rate-limits API clients (currently about 30 requests per minute). Nuba caches
  responses in memory and serves stale data while refreshing.
- Not affiliated with AniList.
