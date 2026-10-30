import { describe, expect, it } from 'vitest';
import { amount, categoryId, fromOrder, fromProduct, fromPromo, fromUser, orderStatus, orderWrite, productWrite, promoWrite, OWNER_UID } from './legacy-schema';
import { formatMoney, moneyToInput, parseMoneyInput } from '@/lib/utils';
import { productSchema } from '@/lib/validation';
import { calculatePromoDiscount } from '@/domain/pricing';
import type { OrderDraft, ProductDraft, PromotionDraft } from '@/lib/types';

describe('shared MAKU GEL compatibility', () => {
  it('keeps lari unchanged through price display, input and legacy reads', () => {
    expect(formatMoney(150)).toBe('₾150');
    expect(formatMoney(150.55)).toBe('₾150.55');
    expect(parseMoneyInput('150,55')).toBe(150.55);
    expect(moneyToInput(150.55)).toBe('150.55');
    expect(amount('150.55 ₾')).toBe(150.55);
    expect(amount(undefined, 23.45)).toBe(23.45);
  });
  it('accepts valid fractional GEL prices', () => {
    const product = fromProduct('p', { name: 'Leather bag', description: 'A description long enough for validation.', category: 'ჩანთები', sku: 'BAG-001', price: 150.55, stock: 4 });
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(product.price).toBe(150.55);
    expect(product.variants[0]).toMatchObject({ id: 'default', stock: 4, priceDelta: 0 });
    expect(categoryId('ჩანთები')).toBe('bags');
    expect(categoryId('ქართული კატეგორია')).toMatch(/^legacy-[a-z0-9]+$/);
  });
  it('uses old MAKU edits instead of stale V2 price, photo and stock copies', () => {
    const product = fromProduct('p', { name: 'Updated', price: 199.99, stock: 2, image: 'https://example.com/new.webp', category: 'Other', bagV2: { price: 10, category: { id: 'old', name: 'Old' }, variants: [{ id: 'v', stock: 99, priceDelta: 0, options: {}, sku: 'sku' }] } });
    expect(product.price).toBe(199.99);
    expect(product.images[0].source).toBe('https://example.com/new.webp');
    expect(product.variants[0].stock).toBe(2);
    expect(product.categoryId).toBe(categoryId('Other'));
  });
  it('does not sell stale variant stock after old MAKU changes a combined stock total', () => {
    const product = fromProduct('p', { stock: 1, bagV2: { variants: [{ id: 'a', stock: 3 }, { id: 'b', stock: 4 }] } });
    expect(product.variants.every((variant) => variant.stock === 0)).toBe(true);
  });
  it('writes the fields old MAKU needs alongside additive V2 metadata', () => {
    const product = fromProduct('p', { name: 'Bag', price: 129.55, stock: 3, image: 'https://example.com/bag.webp', category: 'ჩანთები' });
    const draft = { ...product, price: 149.95 } satisfies ProductDraft;
    const result = productWrite(draft, [{ id: 'bags', name: 'ჩანთები', nameEn: 'Bags', slug: 'bags', description: '', image: '', active: true, order: 0 }]);
    expect(result).toMatchObject({ price: 149.95, category: 'ჩანთები', image: 'https://example.com/bag.webp', stock: 3, status: 'active', bagV2: { version: 2, moneyUnit: 'GEL' } });
    expect(fromProduct('p', result).price).toBe(149.95);
  });
  it('uses only the original admin UID as administrator', () => {
    expect(fromUser('customer', { role: 'admin', isAdmin: true }).role).toBe('customer');
    expect(fromUser(OWNER_UID, {}).role).toBe('admin');
    expect(fromUser('manager', { role: 'manager' }).permissions).toEqual(['orders', 'products', 'inventory']);
  });
  it('reads Georgian statuses and Firestore timestamps from old orders', () => {
    const order = fromOrder('o', { userId: 'u', customerName: 'Nino Test', address: 'Tbilisi', totalAmount: 150.55, subtotal: 145.55, deliveryFee: 5, status: 'მუშავდება', createdAt: { seconds: 1700000000 }, items: [{ productId: 'p', name: 'Bag', price: 145.55, quantity: 1 }] });
    expect(order).toMatchObject({ total: 150.55, shippingFee: 5, status: 'processing', customer: { firstName: 'Nino', lastName: 'Test' } });
    expect(order.createdAt).toBe('2023-11-14T22:13:20.000Z');
    expect(order.items[0].unitPrice).toBe(145.55);
    expect(orderStatus('დასრულებული')).toBe('completed');
  });
  it('round-trips a V2 order into the old order schema without changing currency', () => {
    const draft: OrderDraft = { contact: { firstName: 'Nino', lastName: 'Test', email: 'test@example.com', phone: '+995555123456' }, address: { id: 'a', label: 'Home', firstName: 'Nino', lastName: 'Test', phone: '+995555123456', city: 'Tbilisi', street: 'Test street 12' }, items: [{ productId: 'p', variantId: 'default', quantity: 1 }], paymentMethod: 'cod', deliveryMethod: 'standard', idempotencyKey: 'test-order-key' };
    const order = fromOrder('o', { userId: 'u', totalAmount: 150.55, subtotal: 150.55, status: 'ახალი', items: [{ productId: 'p', name: 'Bag', price: 150.55, quantity: 1 }] });
    const raw = orderWrite({ ...order, customer: draft.contact, address: draft.address }, draft);
    expect(raw).toMatchObject({ userId: 'u', totalAmount: 150.55, customerName: 'Nino Test', status: 'ახალი', items: [{ name: 'Bag', price: 150.55 }] });
    expect(fromOrder('o', raw).total).toBe(150.55);
  });
  it('writes both promotion field conventions used by the old storefront and admin', () => {
    const draft: PromotionDraft = { code: 'SAVE10', description: 'Save ten percent', type: 'percent', value: 10, minOrder: 100, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-12-31T23:59:59.999Z', usageLimit: 0, perUserLimit: 0, active: true };
    const raw = promoWrite(draft);
    expect(raw).toMatchObject({ value: 10, discountPercent: 10, min: 100, startAt: draft.startsAt, startDate: '2026-01-01', active: true });
    expect(fromPromo('p', raw)).toMatchObject({ value: 10, minOrder: 100, startsAt: draft.startsAt });
    expect(fromPromo('p', { code: 'OLD', discountPercent: 15, endDate: '2026-12-31' }).endsAt).toBe('2026-12-31T23:59:59.999Z');
    const capped = fromPromo('p', { code: 'CAP', value: 50, type: 'percent', maxDiscount: 12.55 });
    expect(calculatePromoDiscount(capped, 100)).toBe(12.55);
  });
});
