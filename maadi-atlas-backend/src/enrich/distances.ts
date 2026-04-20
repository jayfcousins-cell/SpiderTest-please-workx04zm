import type { AnchorKey, Distances } from '../types.ts';
import { ANCHORS, ANCHOR_KEYS } from './anchors.ts';

const EARTH_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function distancesFromAnchors(point: {
  lat: number;
  lng: number;
}): Distances {
  const out = {} as Record<AnchorKey, number>;
  for (const key of ANCHOR_KEYS) {
    const anchor = ANCHORS[key];
    out[key] = round2(haversineKm(point, anchor));
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
