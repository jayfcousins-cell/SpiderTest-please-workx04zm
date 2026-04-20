# Maadi Atlas — Backend

Backend + data pipeline for the Maadi Property Atlas frontend. Exposes
`GET /api/listings` with filtering, sorting, and per-property distance /
traffic enrichment.

Stack: Node 20+, TypeScript, Fastify 5, better-sqlite3.

## Quickstart

```bash
cp .env.example .env            # fill in values you have, leave others blank
npm install
npm run seed                    # loads the 8 baseline Maadi listings
npm run dev                     # Fastify on :3001
# in another shell
curl 'http://localhost:3001/api/listings?listing=rent&features=garden,ground'
```

With no API keys set, geocoding falls back to Nominatim (OSM) and the traffic
score uses a distance-to-bottleneck heuristic. Set `GOOGLE_MAPS_KEY` to switch
to Google's Geocoding + Distance Matrix APIs.

## Getting a Google Maps key

1. Create a Google Cloud project.
2. Enable **Geocoding API** and **Distance Matrix API** on that project.
3. Create an API key under **Credentials**. Restrict it to those two APIs.
4. Put the value in `.env` as `GOOGLE_MAPS_KEY=…`.

Both APIs bill per request. The backend caches:

- geocode results for 30 days (keyed by `street + area`)
- traffic scores for 7 days (keyed by lat/lng rounded to 4 decimals)

so a re-run over the same listings is free.

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `GOOGLE_MAPS_KEY` | no | — | Enables Google geocoding + traffic APIs. Falls back to Nominatim + heuristic when blank. |
| `PORT` | no | `3001` | Fastify listen port. |
| `FRONTEND_ORIGIN` | no | allow-all (dev) | Comma-separated CORS allowlist. |
| `DB_PATH` | no | `./data/atlas.db` | SQLite file location. Point at a mounted volume in production. |
| `ADMIN_SECRET` | no (Phase 3) | — | Shared secret for `POST /api/listings/refresh`. |

## Data shape

`GET /api/listings?listing=rent|sale|all&features=garden,rooftop,ground&sort=school216|fablab|maadiClub|wadiDegla|garden|traffic|price`

Returns:

```json
{
  "listings": [ /* Property[] matching src/types.ts */ ],
  "updatedAt": "ISO 8601",
  "sources": ["manual", "..."]
}
```

Each `Property` has `distances` (km to each of the five anchors), a
`traffic` score 0–100 with a human-readable `trafficNote`, feature flags
derived from the description, and geo coordinates for a future map view.

## CSV import (manual fallback)

```bash
npm run import:csv -- data/sample-listings.csv
```

Required columns: `source_url, title, area, street, listing, price_egp,
beds, baths, sqm, description`.

Optional columns: `lat, lng`. Supplying both skips the geocoding step, which
is how you ingest listings when you already copied the address off a map.

Every imported row goes through the same enrichment pipeline as a scraped
listing: geocode → distances → traffic → feature classification → upsert.
If a row can't be geocoded or lands below the confidence threshold
(0.6), it's skipped and logged.

## Sources and ToS

On 2026-04-20 every major Egyptian portal's `robots.txt` returned HTTP 403 to
a script-style request, which confirms they sit behind aggressive bot
protection (Cloudflare). Before enabling any scraper, a human needs to:

1. Open each site's `robots.txt` in a real browser.
2. Read the site's Terms of Use section on automated access.
3. Check the DevTools Network tab for a public JSON endpoint (Nawy in
   particular appears to call `api.nawy.com/…` directly from the browser).

Current status per source (all disabled in code until reviewed):

| Source | File | Status | Notes |
|---|---|---|---|
| Property Finder | `src/sources/propertyfinder.ts` | disabled | Largest inventory, strong Cloudflare. Check ToS. |
| Nawy | `src/sources/nawy.ts` | disabled | Prefer their public JSON API over HTML. |
| Aqarmap | `src/sources/aqarmap.ts` | disabled | Older stock. Private sellers sometimes. |
| OLX | `src/sources/olx.ts` | disabled | Noisy fallback only. |

The system is designed so zero working scrapers ≠ zero data: the CSV importer
runs the full enrichment pipeline, so pasting URLs weekly is a real fallback.

## Anchor points

Five hard-coded anchors drive every distance calculation. Edit
`src/enrich/anchors.ts` if any of these move. Also add to `BOTTLENECKS` there
if you want a new landmark surfaced in traffic notes.

| Key | Label |
|---|---|
| `school216` | Street 216 School (Maadi Degla) |
| `fablab` | Fab Lab Egypt (Old Maadi, Road 12) |
| `maadiClub` | Nadi El Maadi |
| `wadiDegla` | Wadi Degla Club (Zahraa El Maadi) |
| `garden` | Victoria Square (nearest consistent public green space) |

## Testing

```bash
npm run typecheck
npm test
```

Covers the feature classifier (Arabic + English, vague descriptions) and
the traffic scoring formula.

## Deployment

Designed for Render or Fly free tier.

- **SQLite persistence**: the file at `DB_PATH` must be on a persistent mount.
  On Render attach a disk; on Fly attach a volume. The traffic cache inside
  the DB is what makes re-syncs cheap — don't put it on ephemeral storage.
- **CORS**: set `FRONTEND_ORIGIN` to the deployed frontend origin(s). Commas
  separate multiple.
- **Cron**: don't use an in-process `setInterval`. Use Render's Cron Jobs or
  a Fly machine schedule to run `npm run sync` every 6 hours.
- **Logs**: Fastify logs structured JSON; pipe that to whatever the platform
  gives you and grep for `level:error` or `msg:source-failed`.

## Project layout

```
src/
  server.ts              Fastify app + CORS
  sync.ts                Phase 2 orchestrator (cron entry point)
  types.ts               Property, RawListing, AnchorKey, etc.
  routes/listings.ts     GET /api/listings
  db/
    schema.sql           listings, traffic_cache, geocode_cache
    client.ts            singleton better-sqlite3 handle
    listings.ts          read-side query helpers
  enrich/
    anchors.ts           Anchor coordinates + bottleneck list
    distances.ts         Haversine
    features.ts          Regex classifier (garden / rooftop / ground)
    geocode.ts           Google → Nominatim fallback, cached
    traffic.ts           Distance Matrix → score 0–100, cached
    pipeline.ts          RawListing → Property, upsert
  sources/
    propertyfinder.ts    stubs; enable per-source after ToS check
    nawy.ts
    aqarmap.ts
    olx.ts
scripts/
  seed.ts                8 baseline Maadi listings
  import-csv.ts          CSV manual ingestion
tests/
  features.test.ts
  traffic.test.ts
data/
  sample-listings.csv    5-row example for the CSV importer
```

## Questions the brief asks to answer inline

- **Which sources had public APIs vs scraping vs ToS-blocked?** Not yet
  determined — robots.txt fetches all returned 403 in the Phase 1 sandbox.
  Needs a manual browser check before Phase 2. See `src/sources/*.ts` for
  the running status of each.
- **Geocoding confidence threshold?** `0.6` (see
  `src/enrich/geocode.ts:MIN_CONFIDENCE`). Google `ROOFTOP` → 0.95,
  `GEOMETRIC_CENTER` → 0.7, `APPROXIMATE` → 0.5 (rejected). Nominatim's
  `importance` mapped into the same scale.
- **Arabic vs English addresses?** Geocoding hands the address to the
  provider as-is; Google handles mixed-script Cairo addresses well, and
  Nominatim falls back fine. The feature classifier matches both English and
  Arabic markers (`الدور الأرضي`, `حديقة`, `سطح`).
- **Realistic freshness per source?** TBD after the Phase 2 investigation.
  The cron cadence is 6 hours regardless; listings are hidden after 30 days
  without a fresh `last_seen_at`.

## Roadmap

Phase 1 (this PR): scaffold, enrichment, CSV import, seed parity, tests.

Phase 2: per-source integrations (Nawy first if their API is public),
dedupe by `hash(title + street + price)`, cron wiring.

Phase 3: traffic rate-limit backoff, freshness filtering exposed in the API,
admin `POST /api/listings/refresh` behind `ADMIN_SECRET`.
