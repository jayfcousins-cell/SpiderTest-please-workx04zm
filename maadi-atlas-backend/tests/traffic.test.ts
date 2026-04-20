import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreFromRatios, coordKey } from '../src/enrich/traffic.ts';
import { haversineKm } from '../src/enrich/distances.ts';

test('free flow (ratio = 1) → score 100', () => {
  assert.equal(scoreFromRatios(1, 1), 100);
});

test('ratio 1.5 → score 70', () => {
  assert.equal(scoreFromRatios(1.5, 1.2), 70);
});

test('ratio 2.5 → score 10', () => {
  assert.equal(scoreFromRatios(2.5, 2), 10);
});

test('ratio clamps at zero for extreme congestion', () => {
  assert.equal(scoreFromRatios(10, 10), 0);
});

test('worst of the two ratios is used', () => {
  assert.equal(scoreFromRatios(1.0, 2.0), scoreFromRatios(2.0, 1.0));
});

test('coordKey rounds to 4 decimals so nearby units share cache', () => {
  assert.equal(coordKey(29.96001234, 31.25789999), '29.9600,31.2579');
});

test('haversine is zero for identical points', () => {
  const p = { lat: 29.96, lng: 31.25 };
  assert.equal(haversineKm(p, p), 0);
});

test('haversine ~1km for a 0.009° latitude step near Cairo', () => {
  const a = { lat: 29.96, lng: 31.25 };
  const b = { lat: 29.969, lng: 31.25 };
  const km = haversineKm(a, b);
  assert.ok(km > 0.9 && km < 1.1, `expected ~1km, got ${km}`);
});
