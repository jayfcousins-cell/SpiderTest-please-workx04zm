import { getDb } from './db/client.ts';
import { seedIfEmpty } from '../scripts/seed.ts';

// Called at server startup. If the DB is empty (fresh boot on an ephemeral
// filesystem like Render free tier), load the 8 baseline Maadi listings so
// the API is immediately useful.
export async function bootstrap(): Promise<void> {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM listings').get() as {
    n: number;
  };
  if (row.n > 0) return;

  console.log(JSON.stringify({ msg: 'bootstrap-seeding-empty-db' }));
  await seedIfEmpty();
}
