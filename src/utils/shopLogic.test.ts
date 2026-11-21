import test from 'node:test';
import assert from 'node:assert/strict';
import type { ShopProduct } from '../types/blog';
import {
  computeCartPricing,
  formatPriceCny,
  generateDigitalLicenseKey,
  validateCardLast4,
} from './shopLogic';

const mockProducts: ShopProduct[] = [
  {
    id: 'prod-digital',
    slug: 'm3-kit',
    title: 'M3 主题套件',
    subtitle: '数字下载',
    description: 'desc',
    category: 'digital',
    type: 'digital',
    priceCents: 6900,
    image: '/a.jpg',
    gallery: ['/a.jpg'],
    specs: [],
    variants: [{ id: 'v1', name: '个人版', priceCents: 6900, stock: 99 }],
    digitalFileName: 'kit.zip',
    salesCount: 10,
  },
  {
    id: 'prod-physical',
    slug: 'mug',
    title: '手冲陶杯',
    subtitle: '实体器物',
    description: 'desc',
    category: 'physical',
    type: 'physical',
    priceCents: 14800,
    image: '/b.jpg',
    gallery: ['/b.jpg'],
    specs: [],
    variants: [{ id: 'v2', name: '标准套装', priceCents: 14800, stock: 12 }],
    salesCount: 5,
  },
];

test('computeCartPricing calculates free shipping for digital-only carts and applies KAZE10', () => {
  const summary = computeCartPricing(
    [{ productId: 'prod-digital', variantId: 'v1', quantity: 1 }],
    mockProducts,
    'kaze10'
  );
  assert.equal(summary.subtotalCents, 6900);
  assert.equal(summary.discountCents, 690);
  assert.equal(summary.shippingCents, 0);
  assert.equal(summary.totalCents, 6210);
  assert.equal(summary.hasPhysicalItems, false);
});

test('computeCartPricing charges shipping under threshold for physical items and waives over ¥199', () => {
  const oneCup = computeCartPricing(
    [{ productId: 'prod-physical', variantId: 'v2', quantity: 1 }],
    mockProducts
  );
  assert.equal(oneCup.shippingCents, 1200);
  assert.equal(oneCup.totalCents, 16000);

  const twoCups = computeCartPricing(
    [{ productId: 'prod-physical', variantId: 'v2', quantity: 2 }],
    mockProducts,
    'FUWARI20'
  );
  assert.equal(twoCups.discountCents, 2000);
  assert.equal(twoCups.shippingCents, 0);
  assert.equal(twoCups.totalCents, 27600);
});

test('computeCartPricing reports coupon validation error when subtotal is below minimum', () => {
  const res = computeCartPricing(
    [{ productId: 'prod-digital', variantId: 'v1', quantity: 1 }],
    mockProducts,
    'FUWARI20'
  );
  assert.equal(res.discountCents, 0);
  assert.ok(res.couponError && res.couponError.includes('¥100'));
});

test('validateCardLast4 masks card digits cleanly and formatPriceCny formats integers and decimals', () => {
  assert.deepEqual(validateCardLast4('4242 4242 4242 8899'), { valid: true, last4: '8899' });
  assert.equal(validateCardLast4('12345').valid, false);
  assert.equal(formatPriceCny(6900), '¥69');
  assert.equal(formatPriceCny(6210), '¥62.10');
  assert.match(generateDigitalLicenseKey('KZ2026-001', 'prod-digital'), /^KAZE-/);
});
