-- Core listings table. One row per deduped listing.
CREATE TABLE IF NOT EXISTS listings (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  title           TEXT NOT NULL,
  street          TEXT NOT NULL,
  area            TEXT NOT NULL,
  listing         TEXT NOT NULL CHECK (listing IN ('rent','sale')),
  price           TEXT NOT NULL,
  price_value     INTEGER NOT NULL,
  beds            INTEGER NOT NULL,
  baths           INTEGER NOT NULL,
  sqm             INTEGER NOT NULL,
  features        TEXT NOT NULL,          -- JSON array of Feature
  distances       TEXT NOT NULL,          -- JSON map of AnchorKey -> km
  traffic         INTEGER NOT NULL,
  traffic_note    TEXT NOT NULL,
  note            TEXT NOT NULL,
  tone            TEXT NOT NULL,
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  description     TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL,          -- ISO, used for freshness filter
  updated_at      TEXT NOT NULL           -- ISO, last enrichment run
);

CREATE INDEX IF NOT EXISTS idx_listings_listing ON listings (listing);
CREATE INDEX IF NOT EXISTS idx_listings_area    ON listings (area);
CREATE INDEX IF NOT EXISTS idx_listings_seen    ON listings (last_seen_at);

-- Traffic cache — keyed by rounded lat/lng so nearby listings share a score.
CREATE TABLE IF NOT EXISTS traffic_cache (
  coord_key       TEXT PRIMARY KEY,       -- "lat4,lng4"
  score           INTEGER NOT NULL,
  note            TEXT NOT NULL,
  morning_ratio   REAL NOT NULL,
  evening_ratio   REAL NOT NULL,
  cached_at       TEXT NOT NULL           -- ISO, TTL enforced in code (7 days)
);

-- Geocode cache — street+area is the natural key. Saves both Google and
-- Nominatim hits across runs, and lets us tell scraped vs manual-typed
-- addresses apart by `provider`.
CREATE TABLE IF NOT EXISTS geocode_cache (
  address_key     TEXT PRIMARY KEY,
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  confidence      REAL NOT NULL,          -- 0..1, provider-specific mapping
  provider        TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
