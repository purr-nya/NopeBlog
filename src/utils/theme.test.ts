import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampHue,
  computeExpressivePalette,
  getRadiusTokens,
  resolveEffectiveDark,
} from './theme';

test('clampHue wraps negative and overflow hues cleanly into 0..359', () => {
  assert.equal(clampHue(250), 250);
  assert.equal(clampHue(360), 0);
  assert.equal(clampHue(410), 50);
  assert.equal(clampHue(-30), 330);
  assert.equal(clampHue(Number.NaN), 250);
});

test('getRadiusTokens returns distinct geometry for expressive, balanced, and sharp presets', () => {
  assert.equal(getRadiusTokens('expressive').card, '28px');
  assert.equal(getRadiusTokens('balanced').card, '18px');
  assert.equal(getRadiusTokens('sharp').card, '6px');
});

test('resolveEffectiveDark handles light, dark, and system modes', () => {
  assert.equal(resolveEffectiveDark('dark', false), true);
  assert.equal(resolveEffectiveDark('light', true), false);
  assert.equal(resolveEffectiveDark('system', true), true);
  assert.equal(resolveEffectiveDark('system', false), false);
});

test('computeExpressivePalette generates valid OKLCH light and dark tokens for target hue', () => {
  const light = computeExpressivePalette(168, false);
  const dark = computeExpressivePalette(168, true);
  assert.equal(light['--hue'], '168');
  assert.match(light['--md-surface'], /^oklch\(0\.978 /);
  assert.match(dark['--md-surface'], /^oklch\(0\.155 /);
  assert.notEqual(light['--md-primary'], dark['--md-primary']);
});
