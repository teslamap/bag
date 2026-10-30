import type { DeliveryMethod, Money, Promotion, StoreSettings } from '@/lib/types';

export interface PricedLine {
  unitPrice: Money;
  quantity: number;
}

export interface PromoEvaluation {
  valid: boolean;
  discount: Money;
  reason?: string;
  promotion?: Promotion;
}

export function calculateSubtotal(lines: PricedLine[]): Money {
  return lines.reduce((total, line) => total + line.unitPrice * Math.max(0, line.quantity), 0);
}

export function calculatePromoDiscount(promotion: Promotion, subtotal: Money): Money {
  if (subtotal <= 0) return 0;
  if (promotion.type === 'percent') {
    const percent = Math.min(100, Math.max(0, promotion.value));
    return Math.round((subtotal * percent) / 100);
  }
  return Math.min(subtotal, Math.max(0, promotion.value));
}

export function evaluatePromotion(
  promotion: Promotion | undefined,
  subtotal: Money,
  options: { now?: Date; userRedemptions?: number } = {},
): PromoEvaluation {
  if (!promotion) {
    return { valid: false, discount: 0, reason: 'პრომოკოდი ვერ მოიძებნა.' };
  }
  const now = options.now ?? new Date();
  const startsAt = new Date(promotion.startsAt);
  const endsAt = new Date(promotion.endsAt);

  if (!promotion.active) {
    return { valid: false, discount: 0, reason: 'პრომოკოდი არააქტიურია.' };
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { valid: false, discount: 0, reason: 'პრომოკოდის ვადები არასწორია.' };
  }
  if (now < startsAt) {
    return { valid: false, discount: 0, reason: 'პრომოკოდი ჯერ არ ამოქმედებულა.' };
  }
  if (now > endsAt) {
    return { valid: false, discount: 0, reason: 'პრომოკოდის ვადა ამოიწურა.' };
  }
  if (subtotal < promotion.minOrder) {
    return {
      valid: false,
      discount: 0,
      reason: `მინიმალური შეკვეთა — ${(promotion.minOrder / 100).toFixed(0)} ₾.`,
    };
  }
  if (promotion.usageLimit > 0 && promotion.usageCount >= promotion.usageLimit) {
    return { valid: false, discount: 0, reason: 'პრომოკოდის გამოყენების ლიმიტი ამოიწურა.' };
  }
  if (
    promotion.perUserLimit > 0 &&
    (options.userRedemptions ?? 0) >= promotion.perUserLimit
  ) {
    return { valid: false, discount: 0, reason: 'თქვენ უკვე გამოიყენეთ ეს პრომოკოდი.' };
  }

  return {
    valid: true,
    discount: calculatePromoDiscount(promotion, subtotal),
    promotion,
  };
}

export function calculateShipping(
  settings: Pick<StoreSettings, 'freeShippingThreshold' | 'standardShippingFee' | 'expressShippingFee'>,
  discountedSubtotal: Money,
  method: DeliveryMethod,
): Money {
  if (method === 'express') return settings.expressShippingFee;
  if (discountedSubtotal >= settings.freeShippingThreshold) return 0;
  return settings.standardShippingFee;
}

export interface OrderTotals {
  subtotal: Money;
  discountTotal: Money;
  shippingFee: Money;
  total: Money;
}

export function computeOrderTotals(params: {
  lines: PricedLine[];
  promotion?: Promotion;
  settings: Pick<StoreSettings, 'freeShippingThreshold' | 'standardShippingFee' | 'expressShippingFee'>;
  deliveryMethod: DeliveryMethod;
  now?: Date;
  userRedemptions?: number;
}): OrderTotals & { promo: PromoEvaluation } {
  const subtotal = calculateSubtotal(params.lines);
  const promo = evaluatePromotion(params.promotion, subtotal, {
    now: params.now,
    userRedemptions: params.userRedemptions,
  });
  const discountTotal = promo.valid ? promo.discount : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountTotal);
  const shippingFee = calculateShipping(params.settings, discountedSubtotal, params.deliveryMethod);
  return {
    subtotal,
    discountTotal,
    shippingFee,
    total: discountedSubtotal + shippingFee,
    promo,
  };
}
