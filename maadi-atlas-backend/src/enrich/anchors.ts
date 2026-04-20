import type { AnchorKey } from '../types.ts';

export type Anchor = {
  key: AnchorKey;
  label: string;
  lat: number;
  lng: number;
  // Human-readable address used for geocoding verification; kept around so a
  // future maintainer can rerun resolution and diff.
  address: string;
};

// Coordinates resolved manually against Google Maps / OpenStreetMap on
// 2026-04-20. The "garden" anchor is Victoria Square (Road 9 / Road 10
// junction) — the closest consistently-green public space to the Maadi
// listing footprint. If any of these drift, rerun `tsx scripts/resolve-anchors.ts`
// (Phase 2) and update these values.
export const ANCHORS: Record<AnchorKey, Anchor> = {
  school216: {
    key: 'school216',
    label: 'Street 216 School',
    lat: 29.9595,
    lng: 31.2647,
    address: 'Road 216, Degla, Maadi, Cairo, Egypt',
  },
  fablab: {
    key: 'fablab',
    label: 'Fab Lab Egypt',
    lat: 29.9614,
    lng: 31.2558,
    address: 'Road 12, Maadi, Cairo, Egypt',
  },
  maadiClub: {
    key: 'maadiClub',
    label: 'Nadi El Maadi',
    lat: 29.9608,
    lng: 31.2490,
    address: 'Maadi Club, Road 10, Old Maadi, Cairo, Egypt',
  },
  wadiDegla: {
    key: 'wadiDegla',
    label: 'Wadi Degla Club',
    lat: 29.9510,
    lng: 31.2830,
    address: 'Wadi Degla Club, Zahraa El Maadi, Cairo, Egypt',
  },
  garden: {
    key: 'garden',
    label: 'Victoria Square',
    lat: 29.9605,
    lng: 31.2575,
    address: 'Victoria Square, Road 9, Maadi, Cairo, Egypt',
  },
};

export const ANCHOR_KEYS: AnchorKey[] = [
  'school216',
  'fablab',
  'maadiClub',
  'wadiDegla',
  'garden',
];

// Known traffic bottlenecks, used by the traffic-note template. Order matters:
// nearest-match wins when two are roughly equidistant.
export const BOTTLENECKS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'the Ring Road Maadi exit', lat: 29.9713, lng: 31.2948 },
  { name: 'the Ring Road Zahraa exit', lat: 29.9455, lng: 31.2935 },
  { name: 'the Corniche', lat: 29.9620, lng: 31.2410 },
  { name: 'the Autostrade', lat: 29.9575, lng: 31.2720 },
  { name: 'Road 9', lat: 29.9602, lng: 31.2585 },
  { name: 'Nasr Street', lat: 29.9565, lng: 31.2665 },
  { name: 'Gamaa Street', lat: 29.9690, lng: 31.2530 },
];
