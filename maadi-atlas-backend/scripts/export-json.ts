import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { closeDb, getDb } from '../src/db/client.ts';
import {
  distinctSources,
  latestUpdatedAt,
  queryListings,
} from '../src/db/listings.ts';
import { seedIfEmpty } from './seed.ts';
import type { ListingsResponse } from '../src/types.ts';

// Builds the static JSON snapshot served via GitHub Pages / jsDelivr.
// Uses an isolated DB file so running this locally doesn't stomp on the
// dev database the server uses.
async function main(): Promise<void> {
  const buildDb = resolve(process.cwd(), 'data', 'build.db');
  process.env.DB_PATH = buildDb;

  getDb();
  await seedIfEmpty();

  const payload: ListingsResponse = {
    listings: queryListings({ sort: 'school216' }),
    updatedAt: latestUpdatedAt(),
    sources: distinctSources(),
  };

  // Output lives at the repo root's docs/ so GitHub Pages can serve from
  // there. `cwd` is maadi-atlas-backend/ when run via `npm run export`,
  // so go up one level.
  const out = resolve(process.cwd(), '..', 'docs', 'listings.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify({
      msg: 'export-complete',
      path: out,
      count: payload.listings.length,
    }),
  );
  closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
