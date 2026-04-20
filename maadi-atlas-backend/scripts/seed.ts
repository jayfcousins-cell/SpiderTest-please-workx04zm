import type { RawListing } from '../src/types.ts';
import { enrichAndUpsert } from '../src/enrich/pipeline.ts';
import { getDb, closeDb } from '../src/db/client.ts';

// The eight seed listings mirror the frontend's hard-coded PROPERTIES array.
// Coordinates are pre-resolved so `npm run seed` works with no API keys.
// Descriptions are paraphrased from the frontend's `note` field and padded
// with the feature text the classifier expects, so the pipeline produces
// identical features/tone even without hitting a real listing page.
const SEEDS: RawListing[] = [
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/1',
    title: 'Garden apartment on Road 231',
    street: 'Road 231',
    area: 'Maadi Degla',
    listing: 'rent',
    priceEgp: 45_000,
    beds: 3,
    baths: 2,
    sqm: 180,
    description:
      'Ground floor with garden on a leafy Degla block. Private garden wraps the living room; ground floor apartment with direct access to a quiet internal street.',
    lat: 29.9598,
    lng: 31.2655,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/2',
    title: 'Rooftop duplex near Road 9',
    street: 'Road 9',
    area: 'Old Maadi',
    listing: 'rent',
    priceEgp: 62_000,
    beds: 3,
    baths: 3,
    sqm: 220,
    description:
      'Penthouse with rooftop terrace steps from the Road 9 promenade. Terrace wraps two sides of the unit; rooftop access included.',
    lat: 29.9612,
    lng: 31.2580,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/3',
    title: 'Ground-floor 2-bed off Road 10',
    street: 'Road 10',
    area: 'Old Maadi',
    listing: 'rent',
    priceEgp: 38_000,
    beds: 2,
    baths: 2,
    sqm: 140,
    description:
      'Ground floor apartment on a quiet side street off Road 10, minutes from Maadi Club. Direct street entrance.',
    lat: 29.9606,
    lng: 31.2498,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/4',
    title: 'Sarayat villa with garden',
    street: 'Road 256',
    area: 'Maadi Sarayat',
    listing: 'sale',
    priceEgp: 42_000_000,
    beds: 5,
    baths: 5,
    sqm: 520,
    description:
      'Detached Sarayat villa with a mature private garden. Garden apartment layout on the ground floor, with garden access from every main room.',
    lat: 29.9640,
    lng: 31.2560,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/5',
    title: 'Penthouse with roof access, Road 206',
    street: 'Road 206',
    area: 'Maadi Degla',
    listing: 'sale',
    priceEgp: 12_000_000,
    beds: 3,
    baths: 3,
    sqm: 210,
    description:
      'Penthouse unit with private rooftop. Terrace spans the full footprint of the flat; roof access is exclusive to this apartment.',
    lat: 29.9587,
    lng: 31.2682,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/6',
    title: 'Compact ground floor near Wadi Degla',
    street: 'Street 7',
    area: 'Zahraa El Maadi',
    listing: 'rent',
    priceEgp: 22_000,
    beds: 2,
    baths: 1,
    sqm: 95,
    description:
      'Ground floor one-bed-plus-study five minutes from Wadi Degla Club. Street entrance, small patio.',
    lat: 29.9520,
    lng: 31.2815,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/7',
    title: 'New Maadi family flat with rooftop',
    street: 'El Nasr Road',
    area: 'New Maadi',
    listing: 'sale',
    priceEgp: 9_500_000,
    beds: 4,
    baths: 3,
    sqm: 245,
    description:
      'Top-floor apartment with roof access in a 2022 building. Rooftop terrace is shared with only one neighbour.',
    lat: 29.9685,
    lng: 31.2845,
  },
  {
    source: 'manual',
    sourceUrl: 'https://maadi-atlas.local/seed/8',
    title: 'Degla garden duplex near Road 216',
    street: 'Road 218',
    area: 'Maadi Degla',
    listing: 'sale',
    priceEgp: 18_500_000,
    beds: 4,
    baths: 4,
    sqm: 340,
    description:
      'Ground floor with garden plus internal stairs up. Private garden along the south side; ground floor apartment entrance through the garden gate.',
    lat: 29.9590,
    lng: 31.2640,
  },
];

async function main(): Promise<void> {
  getDb();

  let ok = 0;
  const misses: Array<{ url: string; reason: string }> = [];
  for (const raw of SEEDS) {
    const result = await enrichAndUpsert(raw);
    if (result.ok) {
      ok += 1;
    } else {
      misses.push({ url: raw.sourceUrl, reason: result.reason });
    }
  }

  console.log(
    JSON.stringify({ msg: 'seed-complete', inserted: ok, skipped: misses }),
  );
  closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
