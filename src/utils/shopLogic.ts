import type { CartItem, OrderItemSnapshot, ShopProduct } from '../types/blog';

export interface CouponRule {
  code: string;
  label: string;
  minSubtotalCents: number;
  percentOff?: number;
  flatOffCents?: number;
}

export const COUPON_RULES: Record<string, CouponRule> = {
  KAZE10: {
    code: 'KAZE10',
    label: '晴风读者九折礼遇',
    minSubtotalCents: 0,
    percentOff: 10,
  },
  FUWARI20: {
    code: 'FUWARI20',
    label: '满 ¥100 立减 ¥20',
    minSubtotalCents: 10000,
    flatOffCents: 2000,
  },
};

export const FREE_SHIPPING_THRESHOLD_CENTS = 19900;
export const STANDARD_SHIPPING_CENTS = 1200;

export interface PricingSummary {
  items: OrderItemSnapshot[];
  hasPhysicalItems: boolean;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  appliedCoupon: CouponRule | null;
  couponError: string | null;
}

export function formatPriceCny(cents: number): string {
  const yuan = cents / 100;
  return Number.isInteger(yuan) ? `¥${yuan}` : `¥${yuan.toFixed(2)}`;
}

export function computeCartPricing(
  cartItems: CartItem[],
  products: ShopProduct[],
  rawCoupon?: string
): PricingSummary {
  const snapshots: OrderItemSnapshot[] = [];

  for (const entry of cartItems) {
    if (!Number.isInteger(entry.quantity) || entry.quantity <= 0) continue;
    const product = products.find((p) => p.id === entry.productId);
    if (!product) continue;
    const variant = product.variants.find((v) => v.id === entry.variantId) || product.variants[0];
    if (!variant) continue;

    snapshots.push({
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantName: variant.name,
      type: product.type,
      unitPriceCents: variant.priceCents,
      quantity: Math.min(entry.quantity, Math.max(1, variant.stock)),
      image: product.image,
      digitalFileName: product.digitalFileName,
    });
  }

  const subtotalCents = snapshots.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  const hasPhysicalItems = snapshots.some((item) => item.type === 'physical');

  let appliedCoupon: CouponRule | null = null;
  let couponError: string | null = null;
  let discountCents = 0;

  const normalizedCode = (rawCoupon || '').trim().toUpperCase();
  if (normalizedCode) {
    const rule = COUPON_RULES[normalizedCode];
    if (!rule) {
      couponError = '优惠码无效（可尝试 KAZE10 或 FUWARI20）';
    } else if (subtotalCents < rule.minSubtotalCents) {
      couponError = `该优惠码需满 ${formatPriceCny(rule.minSubtotalCents)} 可用`;
    } else {
      appliedCoupon = rule;
      if (rule.percentOff) {
        discountCents = Math.round((subtotalCents * rule.percentOff) / 100);
      } else if (rule.flatOffCents) {
        discountCents = Math.min(subtotalCents, rule.flatOffCents);
      }
    }
  }

  const afterDiscount = Math.max(0, subtotalCents - discountCents);
  const shippingCents =
    !hasPhysicalItems || snapshots.length === 0 || afterDiscount >= FREE_SHIPPING_THRESHOLD_CENTS
      ? 0
      : STANDARD_SHIPPING_CENTS;

  const totalCents = afterDiscount + shippingCents;

  return {
    items: snapshots,
    hasPhysicalItems,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    appliedCoupon,
    couponError,
  };
}

export function validateCardLast4(rawCardNumber: string): { valid: boolean; last4?: string } {
  const digits = (rawCardNumber || '').replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) {
    return { valid: false };
  }
  return { valid: true, last4: digits.slice(-4) };
}

export function generateDigitalLicenseKey(orderNo: string, productId: string): string {
  const seed = `${orderNo}-${productId}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const block1 = seed.slice(0, 4).padEnd(4, 'K');
  const block2 = seed.slice(-4).padEnd(4, 'Z');
  const checksum = String((seed.length * 73 + 1024) % 9999).padStart(4, '0');
  return `KAZE-${block1}-${block2}-${checksum}`;
}
