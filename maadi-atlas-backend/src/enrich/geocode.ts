import { getDb } from '../db/client.ts';

export type GeocodeResult = {
  lat: number;
  lng: number;
  confidence: number;
  provider: 'google' | 'nominatim' | 'manual' | 'cache';
};

// Minimum confidence to accept a geocoded address. Below this we drop the
// listing — mis-placed markers ruin the whole distance/traffic story, and
// it's better to shrink the dataset than fabricate coordinates. Google's
// ROOFTOP/RANGE_INTERPOLATED → 0.9; Nominatim's importance ≥ 0.5 → 0.7.
export const MIN_CONFIDENCE = 0.6;

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function keyFor(street: string, area: string): string {
  return `${street.trim().toLowerCase()}|${area.trim().toLowerCase()}`;
}

export async function geocode(
  street: string,
  area: string,
): Promise<GeocodeResult | null> {
  const db = getDb();
  const key = keyFor(street, area);

  const row = db
    .prepare(
      'SELECT lat, lng, confidence, provider, cached_at FROM geocode_cache WHERE address_key = ?',
    )
    .get(key) as
    | {
        lat: number;
        lng: number;
        confidence: number;
        provider: string;
        cached_at: string;
      }
    | undefined;
  if (row) {
    const age = Date.now() - Date.parse(row.cached_at);
    if (age < CACHE_TTL_MS) {
      return {
        lat: row.lat,
        lng: row.lng,
        confidence: row.confidence,
        provider: 'cache',
      };
    }
  }

  const addr = `${street}, ${area}, Cairo, Egypt`;
  const apiKey = process.env.GOOGLE_MAPS_KEY?.trim();
  const result = apiKey
    ? await geocodeGoogle(addr, apiKey)
    : await geocodeNominatim(addr);
  if (!result) return null;

  db.prepare(
    `INSERT INTO geocode_cache (address_key, lat, lng, confidence, provider, cached_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(address_key) DO UPDATE SET
       lat=excluded.lat, lng=excluded.lng, confidence=excluded.confidence,
       provider=excluded.provider, cached_at=excluded.cached_at`,
  ).run(
    key,
    result.lat,
    result.lng,
    result.confidence,
    result.provider,
    new Date().toISOString(),
  );

  return result;
}

async function geocodeGoogle(
  address: string,
  apiKey: string,
): Promise<GeocodeResult | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'eg');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results: Array<{
      geometry: { location: { lat: number; lng: number }; location_type: string };
    }>;
  };
  if (data.status !== 'OK' || data.results.length === 0) return null;
  const first = data.results[0]!;
  const { lat, lng } = first.geometry.location;
  const confidence = mapGoogleConfidence(first.geometry.location_type);
  return { lat, lng, confidence, provider: 'google' };
}

function mapGoogleConfidence(locationType: string): number {
  switch (locationType) {
    case 'ROOFTOP':
      return 0.95;
    case 'RANGE_INTERPOLATED':
      return 0.85;
    case 'GEOMETRIC_CENTER':
      return 0.7;
    case 'APPROXIMATE':
      return 0.5;
    default:
      return 0.4;
  }
}

async function geocodeNominatim(
  address: string,
): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'maadi-atlas-backend/0.1 (contact: admin@example.com)',
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    importance?: number;
  }>;
  if (data.length === 0) return null;
  const first = data[0]!;
  const importance = first.importance ?? 0.4;
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    // Importance 0.0..1.0; Maadi street-level hits typically land 0.3–0.6.
    // Scale toward the floor of our acceptance band.
    confidence: Math.min(0.9, 0.4 + importance * 0.8),
    provider: 'nominatim',
  };
}
