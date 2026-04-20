import { getDb } from '../db/client.ts';
import { ANCHORS, BOTTLENECKS } from './anchors.ts';
import { haversineKm } from './distances.ts';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FREE_FLOW_KMH = 40;

export type TrafficResult = {
  score: number;
  note: string;
  morningRatio: number;
  eveningRatio: number;
};

export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function scoreFromRatios(morning: number, evening: number): number {
  const worst = Math.max(morning, evening);
  return clamp(Math.round(100 - (worst - 1) * 60), 0, 100);
}

export async function scoreTraffic(point: {
  lat: number;
  lng: number;
}): Promise<TrafficResult> {
  const db = getDb();
  const key = coordKey(point.lat, point.lng);

  const row = db
    .prepare(
      'SELECT score, note, morning_ratio, evening_ratio, cached_at FROM traffic_cache WHERE coord_key = ?',
    )
    .get(key) as
    | {
        score: number;
        note: string;
        morning_ratio: number;
        evening_ratio: number;
        cached_at: string;
      }
    | undefined;

  if (row && Date.now() - Date.parse(row.cached_at) < CACHE_TTL_MS) {
    return {
      score: row.score,
      note: row.note,
      morningRatio: row.morning_ratio,
      eveningRatio: row.evening_ratio,
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_KEY?.trim();
  const school = ANCHORS.school216;
  const club = ANCHORS.maadiClub;

  const morningRatio = apiKey
    ? await congestionRatio(point, school, nextPeak('morning'), apiKey)
    : estimatedRatio(point, school);
  const eveningRatio = apiKey
    ? await congestionRatio(club, point, nextPeak('evening'), apiKey)
    : estimatedRatio(club, point);

  const score = scoreFromRatios(morningRatio, eveningRatio);
  const note = buildNote(score, point, morningRatio, eveningRatio);

  db.prepare(
    `INSERT INTO traffic_cache (coord_key, score, note, morning_ratio, evening_ratio, cached_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(coord_key) DO UPDATE SET
       score=excluded.score, note=excluded.note,
       morning_ratio=excluded.morning_ratio, evening_ratio=excluded.evening_ratio,
       cached_at=excluded.cached_at`,
  ).run(key, score, note, morningRatio, eveningRatio, new Date().toISOString());

  return { score, note, morningRatio, eveningRatio };
}

async function congestionRatio(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  departureTime: number,
  apiKey: string,
): Promise<number> {
  const freeFlowHours = haversineKm(origin, destination) / FREE_FLOW_KMH;
  if (freeFlowHours <= 0) return 1;
  const freeFlowSeconds = freeFlowHours * 3600;

  const url = new URL(
    'https://maps.googleapis.com/maps/api/distancematrix/json',
  );
  url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destinations', `${destination.lat},${destination.lng}`);
  url.searchParams.set('departure_time', String(departureTime));
  url.searchParams.set('traffic_model', 'best_guess');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url);
  if (!res.ok) return estimatedRatio(origin, destination);
  const data = (await res.json()) as {
    rows: Array<{
      elements: Array<{
        status: string;
        duration_in_traffic?: { value: number };
        duration?: { value: number };
      }>;
    }>;
  };
  const el = data.rows[0]?.elements[0];
  if (!el || el.status !== 'OK') return estimatedRatio(origin, destination);
  const actual = el.duration_in_traffic?.value ?? el.duration?.value;
  if (!actual) return estimatedRatio(origin, destination);
  return Math.max(1, actual / freeFlowSeconds);
}

// Fallback when we have no API key. Assumes ~1.35x congestion on average —
// matches what Maadi side streets see at peak vs. 3 AM — and nudges it up
// for properties near a bottleneck.
function estimatedRatio(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  const { distanceKm } = nearestBottleneck(mid);
  const proximityPenalty = distanceKm < 0.4 ? 0.35 : distanceKm < 1 ? 0.15 : 0;
  return 1.35 + proximityPenalty;
}

// Peaks: next Sunday at 8:15 AM Cairo for morning, 5:30 PM for evening.
// Google accepts future Unix seconds; past timestamps are rejected.
function nextPeak(slot: 'morning' | 'evening'): number {
  const now = new Date();
  const target = new Date(now);
  // Advance to the next Sunday–Thursday (0..4 in JS getDay, since Sunday = 0).
  const day = target.getUTCDay();
  const daysUntilSunday = (7 - day) % 7 || 7;
  target.setUTCDate(target.getUTCDate() + daysUntilSunday);
  // Cairo is UTC+2 (no DST as of 2023 standardisation — Egypt reintroduced
  // DST in 2023, so this is an approximation; good enough for a traffic
  // estimate).
  const utcHour = slot === 'morning' ? 6 : 15; // 8:15 AM / 5:30 PM local
  const utcMinute = slot === 'morning' ? 15 : 30;
  target.setUTCHours(utcHour, utcMinute, 0, 0);
  return Math.floor(target.getTime() / 1000);
}

function buildNote(
  score: number,
  point: { lat: number; lng: number },
  morningRatio: number,
  eveningRatio: number,
): string {
  const { name, distanceKm } = nearestBottleneck(point);
  if (score >= 75) {
    return `Quiet residential grid, two exit routes away from ${name}.`;
  }
  if (score >= 55) {
    const worse = morningRatio >= eveningRatio ? 'morning' : 'evening';
    const worstRatio = Math.max(morningRatio, eveningRatio);
    const freeMin = 8; // typical same-neighbourhood hop baseline
    const extra = Math.max(1, Math.round((worstRatio - 1) * freeMin));
    return `Manageable outside peak, expect +${extra} min ${worse}.`;
  }
  if (score >= 40) {
    const bucket = distanceKm < 0.6 ? name : 'Local artery';
    return `${bucket} jams roughly 7:45–9:30 and 4:30–6:30.`;
  }
  return 'Central artery — walk or bike during peaks.';
}

function nearestBottleneck(point: { lat: number; lng: number }): {
  name: string;
  distanceKm: number;
} {
  let best = { name: BOTTLENECKS[0]!.name, distanceKm: Infinity };
  for (const b of BOTTLENECKS) {
    const d = haversineKm(point, b);
    if (d < best.distanceKm) best = { name: b.name, distanceKm: d };
  }
  return best;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
