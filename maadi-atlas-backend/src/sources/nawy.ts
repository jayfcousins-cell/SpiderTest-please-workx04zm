import type { RawListing } from '../types.ts';

// Nawy's frontend makes JSON calls (the brief mentions api.nawy.com). If the
// endpoint is still public on investigation we skip HTML scraping entirely
// and just paginate that JSON feed, filtered server-side to Maadi areas.
// Robots.txt returned 403 on first check — redo the check before enabling.
export async function fetchFromNawy(): Promise<RawListing[]> {
  return [];
}
