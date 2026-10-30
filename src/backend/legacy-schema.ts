import type { Category, Order, OrderDraft, OrderStatus, Product, ProductDraft, Promotion, PromotionDraft, StaffPermission, User } from '@/lib/types';
import { roundMoney } from '@/domain/pricing';

export const OWNER_UID = 'D2N37vcj9tgGKdhw0oXKOhetK3q1';
export const STAFF_PERMISSIONS: StaffPermission[] = ['orders', 'products', 'inventory', 'reviews', 'promotions', 'customers'];
type Data = Record<string, any>;
export function iso(value: any, fallback = ''): string {
  if (!value) return fallback;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(typeof value.seconds === 'number' ? value.seconds * 1000 : value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
export function amount(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? roundMoney(parsed) : fallback;
}
export function categoryId(name: string): string {
  const normalized = name.trim().toLowerCase();
  const known: Record<string, string> = { 'ჩანთები': 'bags', 'ჩანთა': 'bags', bags: 'bags', 'აქსესუარები': 'accessories', accessories: 'accessories', 'სამკაულები': 'jewelry', jewelry: 'jewelry' };
  if (known[normalized]) return known[normalized];
  let hash = 2166136261;
  for (const character of normalized) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  return `legacy-${hash.toString(36)}`;
}
export function fromUser(id: string, data: Data, email = ''): User {
  const parts = String(data.name ?? '').trim().split(/\s+/);
  const role = id === OWNER_UID ? 'admin' : data.role === 'manager' ? 'manager' : 'customer';
  return {
    id, email: String(data.email || email), firstName: data.firstName ?? parts[0] ?? '',
    lastName: data.lastName ?? parts.slice(1).join(' '), phone: data.phone ?? '', role,
    status: data.status === 'suspended' ? 'suspended' : 'active',
    permissions: role === 'admin' ? STAFF_PERMISSIONS : role === 'manager' ? (Array.isArray(data.permissions) ? data.permissions.filter((p: StaffPermission) => ['orders', 'products', 'inventory'].includes(p)) : ['orders', 'products', 'inventory']) : [],
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    favoriteProductIds: Array.isArray(data.favoriteProductIds) ? data.favoriteProductIds : [],
    createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt), photoURL: data.photoURL,
  };
}
export function fromProduct(id: string, data: Data): Product {
  const meta = data.bagV2 ?? {};
  const category = String(data.category || 'სხვა');
  const price = amount(data.price);
  const stock = Math.max(0, Math.floor(amount(data.stock)));
  // Legacy editors own the top-level fields; never prefer stale V2 copies of them.
  const images = [data.image, data.image2, ...(meta.images ?? []).map((image: any) => image.source)]
    .filter((source, index, all) => typeof source === 'string' && source && all.indexOf(source) === index)
    .map((source, index) => ({ id: `image-${index}`, source, alt: String(data.name ?? '') }));
  const hidden = ['inactive', 'დამალული', 'draft', 'archived'].includes(String(data.status).toLowerCase());
  const savedVariants = Array.isArray(meta.variants) && meta.variants.length ? meta.variants : null;
  // Single-variant stock always follows the field edited by old MAKU.
  const variants = savedVariants ? savedVariants.map((variant: any) => ({ ...variant, stock: savedVariants.length === 1 ? stock : variant.stock })) : [{ id: 'default', sku: data.sku || id, options: {}, stock, priceDelta: 0 }];
  // Old MAKU only edits total stock. Do not silently distribute an inconsistent total.
  const variantStock = variants.reduce((total: number, variant: any) => total + Number(variant.stock || 0), 0);
  const mismatch = savedVariants?.length > 1 && variantStock !== stock;
  return {
    id, name: String(data.name ?? ''), slug: id, subtitle: meta.subtitle ?? '',
    description: data.description ?? '', story: meta.story ?? '', categoryId: meta.category?.name === category ? meta.category.id : categoryId(category),
    subcategoryId: meta.category?.name === category ? (meta.subcategory?.id ?? meta.category.id) : categoryId(category),
    price, compareAtPrice: amount(data.oldPrice) || undefined, sku: data.sku || meta.sku || id,
    stock, lowStockThreshold: meta.lowStockThreshold ?? 3, status: hidden ? 'draft' : 'active', images,
    options: meta.options ?? [], variants: mismatch ? variants.map((variant: any) => ({ ...variant, stock: 0 })) : variants,
    materials: meta.materials ?? '', dimensions: meta.dimensions ?? data.size ?? '', care: meta.care ?? '',
    tags: meta.tags ?? [], featured: Boolean(meta.featured), bestseller: Boolean(meta.bestseller), isNew: Boolean(meta.isNew),
    rating: amount(meta.rating), reviewCount: Number(meta.reviewCount ?? 0), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt),
  };
}
export function productWrite(draft: ProductDraft, categories: Category[]): Data {
  const category = categories.find((entry) => entry.id === draft.categoryId);
  const subcategory = categories.find((entry) => entry.id === draft.subcategoryId);
  return {
    name: draft.name, description: draft.description, price: roundMoney(draft.price), oldPrice: draft.compareAtPrice ?? 0,
    category: category?.name ?? draft.categoryId, image: draft.images[0]?.source ?? '', image2: draft.images[1]?.source ?? '',
    stock: draft.variants.reduce((total, variant) => total + variant.stock, 0), sku: draft.sku,
    status: draft.status === 'active' ? 'active' : 'inactive',
    color: draft.variants[0]?.options['ფერი'] ?? '', size: draft.dimensions,
    bagV2: { ...draft, category, subcategory, moneyUnit: 'GEL', version: 2 },
  };
}
export const LEGACY_STATUS: Record<OrderStatus, string> = {
  new: 'ახალი', confirmed: 'დადასტურებული', processing: 'მუშავდება', shipped: 'გაგზავნილი', completed: 'დასრულებული', cancelled: 'გაუქმებული',
};
export function orderStatus(value: unknown): OrderStatus {
  const text = String(value ?? '').trim().toLowerCase();
  const translated = Object.entries(LEGACY_STATUS).find(([, legacy]) => legacy === text)?.[0];
  if (translated) return translated as OrderStatus;
  if (['new', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled'].includes(text)) return text as OrderStatus;
  if (['delivered', 'მიწოდებული'].includes(text)) return 'completed';
  if (['canceled', 'გაუქმებულია'].includes(text)) return 'cancelled';
  if (text === 'მზადდება') return 'processing';
  return 'new';
}
export function fromOrder(id: string, data: Data): Order {
  const meta = data.bagV2 ?? {};
  const status = orderStatus(data.status);
  const name = String(data.customerName ?? data.customer?.firstName ?? '').split(/\s+/);
  let rawItems = data.items ?? data.productDetails ?? [];
  if (typeof rawItems === 'string') { try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; } }
  const items = (Array.isArray(rawItems) ? rawItems : []).map((item: Data) => ({
    productId: String(item.productId ?? ''), productName: item.name ?? item.productName ?? '', productSlug: String(item.productId ?? ''),
    variantId: item.variantId ?? 'default', variantLabel: item.variantLabel ?? '', sku: item.sku ?? '', image: item.image ?? '',
    unitPrice: amount(item.price ?? item.unitPrice), quantity: Number(item.quantity ?? 1),
    lineTotal: roundMoney(amount(item.price ?? item.unitPrice) * Number(item.quantity ?? 1)),
  }));
  const createdAt = iso(data.createdAt);
  return {
    id, number: String(data.orderNumber ?? data.number ?? id), userId: data.userId ?? '',
    customer: { firstName: meta.contact?.firstName ?? name[0] ?? '', lastName: meta.contact?.lastName ?? name.slice(1).join(' '), email: data.userEmail ?? data.email ?? '', phone: data.phone ?? '' },
    items, subtotal: amount(data.subtotal, items.reduce((total, item) => total + item.lineTotal, 0)),
    discountTotal: amount(data.discount), shippingFee: amount(data.deliveryFee), total: amount(data.totalAmount ?? data.total ?? data.totalPrice),
    promoCode: data.promoCode || undefined, promoId: meta.promoId, status,
    paymentMethod: 'cod', paymentStatus: status === 'completed' ? 'paid' : (meta.paymentStatus ?? 'unpaid'),
    deliveryMethod: meta.deliveryMethod === 'express' ? 'express' : 'standard',
    address: meta.address ?? { id: '', label: '', firstName: name[0] ?? '', lastName: name.slice(1).join(' '), phone: data.phone ?? '', city: '', street: typeof data.address === 'string' ? data.address : '' },
    notes: data.comment ?? '', internalNotes: [],
    timeline: [{ status, at: iso(data.updatedAt, createdAt), by: 'MAKU', note: '' }],
    idempotencyKey: meta.idempotencyKey ?? '', createdAt, updatedAt: iso(data.updatedAt, createdAt),
  };
}
export function orderWrite(order: Order, draft: OrderDraft): Data {
  return {
    userId: order.userId, userEmail: order.customer.email,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(), phone: order.customer.phone,
    address: [order.address.city, order.address.street, order.address.apartment].filter(Boolean).join(', '),
    delivery: order.deliveryMethod === 'express' ? 'ექსპრესი' : 'კურიერი', status: LEGACY_STATUS[order.status],
    orderNumber: order.number, totalAmount: order.total, totalPrice: `${order.total.toFixed(2)} ₾`,
    subtotal: order.subtotal, discount: order.discountTotal, deliveryFee: order.shippingFee, promoCode: order.promoCode ?? '', comment: order.notes ?? '',
    items: order.items.map((item) => ({ ...item, name: item.productName, price: item.unitPrice })),
    bagV2: { version: 2, moneyUnit: 'GEL', contact: draft.contact, address: draft.address, deliveryMethod: draft.deliveryMethod, idempotencyKey: draft.idempotencyKey, promoId: order.promoId ?? '' },
  };
}
export function fromPromo(id: string, data: Data): Promotion {
  const meta = data.bagV2 ?? {};
  return {
    id, code: String(data.code ?? '').toUpperCase(), description: meta.description ?? data.description ?? data.code ?? '',
    type: data.type === 'fixed' ? 'fixed' : 'percent', value: amount(data.value ?? data.discountPercent), minOrder: amount(data.min ?? meta.minOrder),
    maxDiscount: amount(data.maxDiscount) || undefined,
    startsAt: iso(data.startAt ?? data.startDate, '1970-01-01T00:00:00.000Z'), endsAt: iso(data.endAt ?? (data.endDate ? `${data.endDate}T23:59:59.999Z` : undefined), '9999-12-31T23:59:59.999Z'),
    active: data.active !== false && !['inactive', 'disabled', 'არააქტიური'].includes(data.status),
    usageLimit: Number(data.usageLimit ?? 0), usageCount: Number(data.usageCount ?? 0), perUserLimit: meta.perUserLimit ?? 0,
    createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt),
  };
}
export function promoWrite(draft: PromotionDraft): Data {
  return {
    code: draft.code.toUpperCase(), type: draft.type, value: draft.value, discountPercent: draft.type === 'percent' ? draft.value : 0,
    min: draft.minOrder, startAt: draft.startsAt, endAt: draft.endsAt, startDate: draft.startsAt.slice(0, 10), endDate: draft.endsAt.slice(0, 10),
    active: draft.active, status: draft.active ? 'active' : 'inactive', usageLimit: draft.usageLimit,
    bagV2: { description: draft.description, perUserLimit: draft.perUserLimit },
  };
}
