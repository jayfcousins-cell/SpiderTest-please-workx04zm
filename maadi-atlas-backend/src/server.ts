import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerListingsRoute } from './routes/listings.ts';
import { getDb } from './db/client.ts';

export async function build() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // Structured JSON is easier to grep once this is running behind Render
      // and the logs are getting shipped off-box.
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
  });

  const originEnv = (process.env.FRONTEND_ORIGIN ?? '').trim();
  const origins = originEnv
    ? originEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : true; // dev: allow all when unset

  await app.register(cors, { origin: origins });

  // Touch the DB once so schema migrations run before any request.
  getDb();

  app.get('/health', async () => ({ ok: true }));
  await registerListingsRoute(app);

  return app;
}

// Only start the HTTP server when executed directly (tsx/node), not when
// imported by tests.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const port = Number(process.env.PORT ?? 3001);
  build()
    .then((app) => app.listen({ port, host: '0.0.0.0' }))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
