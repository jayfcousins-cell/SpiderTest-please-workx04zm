import { getDb } from './client.ts';
import type {
  AnchorKey,
  Feature,
  Listing,
  Property,
  Source,
} from '../types.ts';

type Row = {
  id: string;
  source: Source;
  source_url: string;
  title: string;
  street: string;
  area: Property['area'];
  listing: Listing;
  price: string;
  price_value: number;
  beds: number;
  baths: number;
  sqm: number;
  features: string;
  distances: string;
  traffic: number;
  traffic_note: string;
  note: string;
  tone: Feature;
  lat: number;
  lng: number;
  last_seen_at: string;
  updated_at: string;
};

export type ListingsQuery = {
  listing?: Listing | 'all';
  features?: Feature[];
  sort?: AnchorKey | 'traffic' | 'price';
  maxStaleDays?: number;
};

export function queryListings(q: ListingsQuery = {}): Property[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM listings').all() as Row[];

  const maxStaleDays = q.maxStaleDays ?? 30;
  const cutoff = Date.now() - maxStaleDays * 24 * 60 * 60 * 1000;

  const fresh = rows.filter((r) => Date.parse(r.last_seen_at) >= cutoff);

  const listingFilter =
    !q.listing || q.listing === 'all' ? null : q.listing;

  const wanted = q.features ?? [];

  const mapped = fresh
    .map(rowToProperty)
    .filter((p) => (listingFilter ? p.listing === listingFilter : true))
    .filter((p) =>
      wanted.length === 0
        ? true
        : wanted.every((f) => p.features.includes(f)),
    );

  return sort(mapped, q.sort);
}

function sort(
  list: Property[],
  sort: ListingsQuery['sort'],
): Property[] {
  if (!sort) return list;
  const out = [...list];
  if (sort === 'traffic') {
    out.sort((a, b) => b.traffic - a.traffic);
  } else if (sort === 'price') {
    out.sort((a, b) => a.priceValue - b.priceValue);
  } else {
    out.sort((a, b) => a.distances[sort] - b.distances[sort]);
  }
  return out;
}

function rowToProperty(row: Row): Property {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    title: row.title,
    street: row.street,
    area: row.area,
    listing: row.listing,
    price: row.price,
    priceValue: row.price_value,
    beds: row.beds,
    baths: row.baths,
    sqm: row.sqm,
    features: JSON.parse(row.features) as Feature[],
    distances: JSON.parse(row.distances) as Property['distances'],
    traffic: row.traffic,
    trafficNote: row.traffic_note,
    note: row.note,
    tone: row.tone,
    lat: row.lat,
    lng: row.lng,
    updatedAt: row.updated_at,
  };
}

export function latestUpdatedAt(): string {
  const db = getDb();
  const row = db
    .prepare('SELECT MAX(updated_at) AS max_ts FROM listings')
    .get() as { max_ts: string | null };
  return row.max_ts ?? new Date(0).toISOString();
}

export function distinctSources(): Source[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT DISTINCT source FROM listings')
    .all() as Array<{ source: Source }>;
  return rows.map((r) => r.source);
}
