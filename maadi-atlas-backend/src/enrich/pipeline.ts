import { createHash } from 'node:crypto';
import type { Property, RawListing } from '../types.ts';
import { getDb } from '../db/client.ts';
import { distancesFromAnchors } from './distances.ts';
import { classifyFeatures } from './features.ts';
import { geocode, MIN_CONFIDENCE } from './geocode.ts';
import { scoreTraffic } from './traffic.ts';

export function stableId(raw: RawListing): string {
  const material = `${raw.source}|${raw.sourceUrl}|${raw.title}|${raw.street}|${raw.priceEgp}`;
  return createHash('sha1').update(material).digest('hex').slice(0, 16);
}

export function formatPrice(listing: RawListing['listing'], egp: number): string {
  if (listing === 'rent') {
    return `EGP ${egp.toLocaleString('en-US')} / mo`;
  }
  if (egp >= 1_000_000) {
    return `EGP ${(egp / 1_000_000).toFixed(1)}M`;
  }
  return `EGP ${egp.toLocaleString('en-US')}`;
}

// Short paraphrase for the card — first sentence that mentions something
// concrete, falling back to truncated description.
function deriveNote(description: string): string {
  const sentences = description.split(/(?<=[.!?])\s+/).map((s) => s.trim());
  const first = sentences.find((s) => s.length >= 30 && s.length <= 160);
  const chosen = first ?? description.trim();
  return chosen.length > 160 ? `${chosen.slice(0, 157)}…` : chosen;
}

export async function enrichAndUpsert(
  raw: RawListing,
): Promise<{ ok: true; property: Property } | { ok: false; reason: string }> {
  let lat = raw.lat;
  let lng = raw.lng;

  if (lat === undefined || lng === undefined) {
    const geo = await geocode(raw.street, raw.area);
    if (!geo) return { ok: false, reason: 'geocode-miss' };
    if (geo.confidence < MIN_CONFIDENCE) {
      return { ok: false, reason: `geocode-low-confidence:${geo.confidence.toFixed(2)}` };
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  const { features, tone, vague } = classifyFeatures(raw.title, raw.description);
  const distances = distancesFromAnchors({ lat, lng });
  const traffic = await scoreTraffic({ lat, lng });

  const id = stableId(raw);
  const price = formatPrice(raw.listing, raw.priceEgp);
  const note = deriveNote(raw.description);
  const now = new Date().toISOString();

  const property: Property = {
    id,
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    title: raw.title,
    street: raw.street,
    area: raw.area,
    listing: raw.listing,
    price,
    priceValue: raw.priceEgp,
    beds: raw.beds,
    baths: raw.baths,
    sqm: raw.sqm,
    features,
    distances,
    traffic: traffic.score,
    trafficNote: traffic.note,
    note,
    tone,
    lat,
    lng,
    updatedAt: now,
  };

  const db = getDb();
  db.prepare(
    `INSERT INTO listings (
       id, source, source_url, title, street, area, listing, price, price_value,
       beds, baths, sqm, features, distances, traffic, traffic_note, note, tone,
       lat, lng, description, last_seen_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       source_url=excluded.source_url, title=excluded.title, street=excluded.street,
       area=excluded.area, listing=excluded.listing, price=excluded.price,
       price_value=excluded.price_value, beds=excluded.beds, baths=excluded.baths,
       sqm=excluded.sqm, features=excluded.features, distances=excluded.distances,
       traffic=excluded.traffic, traffic_note=excluded.traffic_note,
       note=excluded.note, tone=excluded.tone, lat=excluded.lat, lng=excluded.lng,
       description=excluded.description, last_seen_at=excluded.last_seen_at,
       updated_at=excluded.updated_at`,
  ).run(
    id,
    raw.source,
    raw.sourceUrl,
    raw.title,
    raw.street,
    raw.area,
    raw.listing,
    price,
    raw.priceEgp,
    raw.beds,
    raw.baths,
    raw.sqm,
    JSON.stringify(features),
    JSON.stringify(distances),
    traffic.score,
    traffic.note,
    note,
    tone,
    lat,
    lng,
    raw.description,
    now,
    now,
  );

  // Vague descriptions keep zero features, which means they silently drop
  // out of feature-filtered queries. That's the intended behaviour — the
  // flag is surfaced in logs, not persisted.
  if (vague) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'description-too-vague',
        id,
        source: raw.source,
      }),
    );
  }

  return { ok: true, property };
}
