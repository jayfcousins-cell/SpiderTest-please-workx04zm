# Maadi Property Atlas

A browsable map of Maadi rentals and sales, scored on proximity to five
anchor points and peak-traffic flow.

## Live app

**URL:** `https://jayfcousins-cell.github.io/SpiderTest-please-workx04zm/`

Enable GitHub Pages once to activate it (one tap, no card):

1. Open the repo on GitHub → **Settings** → **Pages**.
2. **Source** = *Deploy from a branch* → **Branch** `main` / **Folder** `/docs` → **Save**.
3. Wait ~2 minutes for the first build. Then tap the URL above.

The app is a single static file (`docs/index.html`) that fetches
`docs/listings.json` at the same origin and renders cards with filters,
sort, and a detail modal.

## Live JSON (for other clients)

`https://cdn.jsdelivr.net/gh/jayfcousins-cell/SpiderTest-please-workx04zm@main/docs/listings.json`

Refreshes weekly via [`.github/workflows/refresh.yml`](.github/workflows/refresh.yml),
or on demand: Actions tab → **Refresh listings** → **Run workflow**.

## Backend

The data pipeline and optional live server live in
[`maadi-atlas-backend/`](maadi-atlas-backend/) — see its README for setup,
architecture, enrichment logic, and deployment.
