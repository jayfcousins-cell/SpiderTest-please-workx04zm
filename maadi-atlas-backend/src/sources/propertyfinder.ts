import type { RawListing } from '../types.ts';

// Phase 2 target. Robots.txt fetch on 2026-04-20 returned 403 from the main
// edge — the site is aggressively Cloudflare-protected, which strongly
// suggests scraping will be blocked or at least require a headless browser
// plus residential IPs. Before enabling this, re-check:
//   - https://www.propertyfinder.eg/robots.txt (via a browser)
//   - Their Terms of Use section on automated access
// If ToS forbids it, keep this stub disabled and document that in the README.
export async function fetchFromPropertyFinder(): Promise<RawListing[]> {
  return [];
}
