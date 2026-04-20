# Podcast Knowledge Graph MVP — lives in Canopy

The "community podcast knowledge graph" MVP from the April 10 Garfield / Cousins / Hasse call (aka **Bonfire**) was built in the sibling repo, not here. During planning we picked Canopy because it already has the Firebase/Firestore substrate (persistent query trails fit naturally alongside Canopy's existing agent reports) and vanilla HTML/JS frontend conventions.

- Canopy branch: `claude/podcast-knowledge-graph-mvp-S7INf`
- Key paths in Canopy:
  - `functions/bonfire/` — ingestion script + Cloud Functions (query, trails)
  - `public/bonfire.html` + `public/js/bonfire{,-graph,-config}.js` — three-column UI
  - `functions/bonfire/README.md` — setup + run + deploy instructions

This branch exists in SpiderTest-please-workx04zm per the session's branch-management contract, but contains no code changes — the property atlas is unrelated to the podcast MVP.
