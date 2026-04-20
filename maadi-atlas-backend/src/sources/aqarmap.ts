import type { RawListing } from '../types.ts';

// Older inventory, sometimes private sellers. No public JSON endpoint known.
// Disabled until ToS + robots.txt are reviewed manually.
export async function fetchFromAqarmap(): Promise<RawListing[]> {
  return [];
}
