import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFeatures } from '../src/enrich/features.ts';

test('garden apartment with position language → garden + tone', () => {
  const r = classifyFeatures(
    'Spacious flat',
    'Ground floor with garden, fully renovated, south-facing.',
  );
  assert.deepEqual(r.features.sort(), ['garden', 'ground']);
  assert.equal(r.tone, 'garden');
  assert.equal(r.vague, false);
});

test('penthouse with terrace → rooftop', () => {
  const r = classifyFeatures(
    'Penthouse with terrace',
    'Top-floor penthouse with a private rooftop terrace and roof access.',
  );
  assert.ok(r.features.includes('rooftop'));
  assert.equal(r.tone, 'rooftop');
});

test('Arabic ground-floor match', () => {
  const r = classifyFeatures(
    'شقة للإيجار',
    'الدور الأرضي على شارع هادئ في المعادي، مدخل مستقل.',
  );
  assert.ok(r.features.includes('ground'));
});

test('vague description sets flag and empty features', () => {
  const r = classifyFeatures('Nice flat', 'Call for details.');
  assert.equal(r.vague, true);
  assert.deepEqual(r.features, []);
});

test('"garden city" alone is not classified as garden', () => {
  const r = classifyFeatures(
    'Maadi flat',
    'Located near Garden City with skyline views, third floor, elevator building.',
  );
  assert.ok(!r.features.includes('garden'));
});

test('garden apartment shorthand is enough without position phrase', () => {
  const r = classifyFeatures(
    'Garden apartment in Degla',
    'Beautiful garden apartment listed for rent, three bedrooms, partly furnished.',
  );
  assert.ok(r.features.includes('garden'));
});
