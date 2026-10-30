import { describe, expect, it } from 'vitest';
import type { Promotion, StoreSettings } from '@/lib/types';
import {
  calculatePromoDiscount,
  calculateShipping,
  calculateSubtotal,
  computeOrderTotals,
  evaluatePromotion,
} from '@/domain/pricing';

const NOW = new Date('2026-10-30T12:00:00.000Z');

const settings: Pick<
  StoreSettings,
  'freeShippingThreshold' | 'standardShippingFee' | 'expressShippingFee'
> = {
  freeShippingThreshold: 30_000,
  standardShippingFee: 1_500,
  expressShippingFee: 3_000,
};

function promotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo_test',
    code: 'TEST10',
    description: 'ტესტ პრომოკოდი',
    type: 'percent',
    value: 10,
    minOrder: 10_000,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
    usageLimit: 100,
    perUserLimit: 1,
    usageCount: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calculateSubtotal', () => {
  it('sums line totals and ignores negative quantities', () => {
    expect(
      calculateSubtotal([
        { unitPrice: 12_000, quantity: 2 },
        { unitPrice: 5_000, quantity: 1 },
        { unitPrice: 9_000, quantity: -4 },
      ]),
    ).toBe(29_000);
  });

  it('returns zero for an empty basket', () => {
    expect(calculateSubtotal([])).toBe(0);
  });
});

describe('calculatePromoDiscount', () => {
  it('rounds percentage discounts to whole tetri', () => {
    expect(calculatePromoDiscount(promotion({ value: 15 }), 12_345)).toBe(1_852);
  });

  it('clamps percentage values to 0–100', () => {
    expect(calculatePromoDiscount(promotion({ value: 180 }), 10_000)).toBe(10_000);
    expect(calculatePromoDiscount(promotion({ value: -20 }), 10_000)).toBe(0);
  });

  it('caps fixed discounts at the subtotal', () => {
    expect(calculatePromoDiscount(promotion({ type: 'fixed', value: 5_000 }), 3_200)).toBe(3_200);
    expect(calculatePromoDiscount(promotion({ type: 'fixed', value: 5_000 }), 20_000)).toBe(5_000);
  });

  it('never discounts an empty subtotal', () => {
    expect(calculatePromoDiscount(promotion(), 0)).toBe(0);
  });
});

describe('evaluatePromotion', () => {
  it('accepts a live promotion above the minimum order', () => {
    const result = evaluatePromotion(promotion(), 25_000, { now: NOW });
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(2_500);
    expect(result.promotion?.code).toBe('TEST10');
  });

  it('rejects unknown, inactive, expired and not-yet-started promotions', () => {
    expect(evaluatePromotion(undefined, 20_000, { now: NOW }).valid).toBe(false);
    expect(evaluatePromotion(promotion({ active: false }), 20_000, { now: NOW }).valid).toBe(false);
    expect(
      evaluatePromotion(promotion({ endsAt: '2026-10-01T00:00:00.000Z' }), 20_000, { now: NOW }).valid,
    ).toBe(false);
    expect(
      evaluatePromotion(promotion({ startsAt: '2026-11-01T00:00:00.000Z' }), 20_000, { now: NOW }).valid,
    ).toBe(false);
  });

  it('rejects invalid date values', () => {
    const result = evaluatePromotion(promotion({ startsAt: 'not-a-date' }), 20_000, { now: NOW });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('ვადები');
  });

  it('enforces minimum order, global usage and per-user limits', () => {
    expect(evaluatePromotion(promotion({ minOrder: 30_000 }), 20_000, { now: NOW }).valid).toBe(false);
    expect(
      evaluatePromotion(promotion({ usageLimit: 5, usageCount: 5 }), 20_000, { now: NOW }).valid,
    ).toBe(false);
    expect(
      evaluatePromotion(promotion({ perUserLimit: 1 }), 20_000, { now: NOW, userRedemptions: 1 }).valid,
    ).toBe(false);
    expect(
      evaluatePromotion(promotion({ usageLimit: 0, perUserLimit: 0 }), 20_000, {
        now: NOW,
        userRedemptions: 9,
      }).valid,
    ).toBe(true);
  });
});

describe('calculateShipping', () => {
  it('applies standard shipping below the free threshold', () => {
    expect(calculateShipping(settings, 29_999, 'standard')).toBe(1_500);
    expect(calculateShipping(settings, 30_000, 'standard')).toBe(0);
  });

  it('always charges express shipping, including above the free threshold', () => {
    expect(calculateShipping(settings, 90_000, 'express')).toBe(3_000);
  });
});

describe('computeOrderTotals', () => {
  it('calculates discount before deciding free shipping', () => {
    const totals = computeOrderTotals({
      lines: [{ unitPrice: 32_000, quantity: 1 }],
      promotion: promotion({ value: 10 }),
      settings,
      deliveryMethod: 'standard',
      now: NOW,
    });
    expect(totals).toMatchObject({
      subtotal: 32_000,
      discountTotal: 3_200,
      shippingFee: 1_500,
      total: 30_300,
    });
    expect(totals.promo.valid).toBe(true);
  });

  it('ignores an invalid promotion and still prices the order safely', () => {
    const totals = computeOrderTotals({
      lines: [{ unitPrice: 12_000, quantity: 1 }],
      promotion: promotion({ active: false }),
      settings,
      deliveryMethod: 'standard',
      now: NOW,
    });
    expect(totals.discountTotal).toBe(0);
    expect(totals.shippingFee).toBe(1_500);
    expect(totals.total).toBe(13_500);
    expect(totals.promo.valid).toBe(false);
  });

  it('never returns a negative total', () => {
    const totals = computeOrderTotals({
      lines: [{ unitPrice: 2_000, quantity: 1 }],
      promotion: promotion({ type: 'fixed', value: 10_000, minOrder: 0 }),
      settings,
      deliveryMethod: 'express',
      now: NOW,
    });
    expect(totals.discountTotal).toBe(2_000);
    expect(totals.total).toBe(3_000);
  });
});
