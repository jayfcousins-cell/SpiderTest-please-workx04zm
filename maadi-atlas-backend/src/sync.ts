import { closeDb, getDb } from './db/client.ts';
import { enrichAndUpsert } from './enrich/pipeline.ts';
import { fetchFromPropertyFinder } from './sources/propertyfinder.ts';
import { fetchFromNawy } from './sources/nawy.ts';
import { fetchFromAqarmap } from './sources/aqarmap.ts';
import { fetchFromOlx } from './sources/olx.ts';
import type { RawListing } from './types.ts';

// Phase 2 entry point. Runs each enabled source sequentially, respecting the
// per-domain 1-req/2s budget inside the fetcher. We avoid parallel source
// calls so no single site sees concurrent hits from us.
async function main(): Promise<void> {
  getDb();

  const fetchers: Array<[string, () => Promise<RawListing[]>]> = [
    ['nawy', fetchFromNawy],
    ['propertyfinder', fetchFromPropertyFinder],
    ['aqarmap', fetchFromAqarmap],
    ['olx', fetchFromOlx],
  ];

  let totalOk = 0;
  let totalSkipped = 0;

  for (const [name, fn] of fetchers) {
    try {
      const items = await fn();
      for (const raw of items) {
        const res = await enrichAndUpsert(raw);
        if (res.ok) totalOk += 1;
        else totalSkipped += 1;
      }
      console.log(JSON.stringify({ msg: 'source-done', source: name, count: items.length }));
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'source-failed',
          source: name,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }

  console.log(
    JSON.stringify({ msg: 'sync-complete', inserted: totalOk, skipped: totalSkipped }),
  );
  closeDb();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
