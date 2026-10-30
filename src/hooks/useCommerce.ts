import { useEffect, useMemo, useState } from 'react';
import { useBackendSnapshot } from '@/state/backend';
import { useCartStore } from '@/state/cart';
import { computeOrderTotals } from '@/domain/pricing';
import { getProductStock, getVariantLabel } from '@/lib/utils';
import type { OrderTotals } from '@/domain/pricing';
import type { CartLine, Product, ProductVariant, StoreSettings } from '@/lib/types';

export interface CartResolvedLine {
  line: CartLine;
  product: Product;
  variant: ProductVariant;
  variantLabel: string;
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  maxQuantity: number;
}

export interface CartDetails {
  lines: CartResolvedLine[];
  orphanLines: CartLine[];
  subtotal: number;
  count: number;
  totals: OrderTotals & { promo: { valid: boolean; discount: number; reason?: string } };
  freeShippingRemaining: number;
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = () => setMatches(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export function useCartDetails(): CartDetails {
  const snapshot = useBackendSnapshot();
  const items = useCartStore((state) => state.items);
  const promo = useCartStore((state) => state.promo);

  return useMemo(() => {
    const settings: StoreSettings = snapshot.settings;
    const lines: CartResolvedLine[] = [];
    const orphanLines: CartLine[] = [];
    for (const line of items) {
      const product = snapshot.products.find((entry) => entry.id === line.productId);
      const variant = product?.variants.find((entry) => entry.id === line.variantId);
      if (!product || !variant) {
        orphanLines.push(line);
        continue;
      }
      const unitPrice = product.price + variant.priceDelta;
      const available = product.status === 'active' && variant.stock > 0;
      lines.push({
        line,
        product,
        variant,
        variantLabel: getVariantLabel(product, variant),
        unitPrice,
        lineTotal: unitPrice * line.quantity,
        available,
        maxQuantity: Math.min(20, Math.max(0, variant.stock)),
      });
    }
    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
    const discount = promo?.discount ?? 0;
    const discounted = Math.max(0, subtotal - discount);
    const shippingFee = discounted >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
    const totals = {
      subtotal,
      discountTotal: discount,
      shippingFee,
      total: discounted + shippingFee,
      promo: {
        valid: Boolean(promo),
        discount,
        reason: promo?.message,
      },
    };
    return {
      lines,
      orphanLines,
      subtotal,
      count: items.reduce((total, line) => total + line.quantity, 0),
      totals,
      freeShippingRemaining: Math.max(0, settings.freeShippingThreshold - discounted),
    };
  }, [snapshot.products, snapshot.settings, items, promo]);
}

export function useDeliveryTotals(delivery: 'standard' | 'express', promoEvaluation?: { discount: number }) {
  const snapshot = useBackendSnapshot();
  const { lines, subtotal } = useCartDetails();
  return useMemo(
    () =>
      computeOrderTotals({
        lines: lines.filter((line) => line.available).map((line) => ({ unitPrice: line.unitPrice, quantity: line.line.quantity })),
        settings: snapshot.settings,
        deliveryMethod: delivery,
        promotion: undefined,
      }),
    [delivery, lines, snapshot.settings, subtotal],
  );
}

export function useProductAvailability(product: Product | undefined) {
  if (!product) return { inStock: false, total: 0 };
  return { inStock: getProductStock(product) > 0, total: getProductStock(product) };
}
