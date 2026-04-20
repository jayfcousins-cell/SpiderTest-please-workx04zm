import type { RawListing } from '../types.ts';

// Broadest inventory but noisiest. Fallback only — prefer the portals above
// when their ToS permits. Disabled by default.
export async function fetchFromOlx(): Promise<RawListing[]> {
  return [];
}
