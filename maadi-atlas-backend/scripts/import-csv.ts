import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Area, Listing, RawListing } from '../src/types.ts';
import { enrichAndUpsert } from '../src/enrich/pipeline.ts';
import { closeDb, getDb } from '../src/db/client.ts';

const AREAS: Area[] = [
  'Old Maadi',
  'Maadi Degla',
  'Maadi Sarayat',
  'Zahraa El Maadi',
  'New Maadi',
];

// Minimal CSV parser — handles quoted fields and embedded commas, but not
// multiline cells. Listings CSVs coming from pasted browser rows never need
// multiline, so we keep this in-tree instead of pulling a dependency.
function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (inQuotes) {
      if (ch === '"' && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      // swallow
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function toRaw(row: Record<string, string>): RawListing | null {
  const area = row.area as Area;
  if (!AREAS.includes(area)) {
    console.warn(JSON.stringify({ msg: 'skip-bad-area', area, url: row.source_url }));
    return null;
  }
  const listing = row.listing as Listing;
  if (listing !== 'rent' && listing !== 'sale') {
    console.warn(JSON.stringify({ msg: 'skip-bad-listing', listing }));
    return null;
  }
  const priceEgp = Number(row.price_egp);
  if (!Number.isFinite(priceEgp) || priceEgp <= 0) return null;

  // `lat` / `lng` are optional; when present they skip the geocoding step,
  // which is how we support a fully offline CSV → API round trip.
  const lat = row.lat ? Number(row.lat) : undefined;
  const lng = row.lng ? Number(row.lng) : undefined;

  return {
    source: 'manual',
    sourceUrl: row.source_url ?? '',
    title: row.title ?? '',
    street: row.street ?? '',
    area,
    listing,
    priceEgp,
    beds: Number(row.beds) || 0,
    baths: Number(row.baths) || 0,
    sqm: Number(row.sqm) || 0,
    description: row.description ?? '',
    ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: npm run import:csv <path-to-csv>');
    process.exit(1);
  }

  const raw = readFileSync(resolve(process.cwd(), path), 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) {
    console.error('CSV has no data rows.');
    process.exit(1);
  }

  const header = rows[0]!.map((h) => h.trim());
  const records: Record<string, string>[] = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => {
      obj[key] = (r[i] ?? '').trim();
    });
    return obj;
  });

  getDb();

  let ok = 0;
  const skipped: Array<{ url: string; reason: string }> = [];
  for (const rec of records) {
    const raw = toRaw(rec);
    if (!raw) {
      skipped.push({ url: rec.source_url ?? '?', reason: 'invalid-row' });
      continue;
    }
    const result = await enrichAndUpsert(raw);
    if (result.ok) ok += 1;
    else skipped.push({ url: raw.sourceUrl, reason: result.reason });
  }

  console.log(JSON.stringify({ msg: 'csv-import-complete', inserted: ok, skipped }));
  closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
