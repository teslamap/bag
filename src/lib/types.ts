/**
 * Shared domain types for the MAKU commerce platform.
 * All monetary values are stored as integer tetri (1 GEL = 100 tetri).
 */

export type Money = number;

export type Role = 'customer' | 'manager' | 'admin';

export type StaffPermission =
  | 'orders'
  | 'products'
  | 'inventory'
  | 'reviews'
  | 'promotions'
  | 'customers';

export type UserStatus = 'active' | 'suspended';

export interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  street: string;
  apartment?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  status: UserStatus;
  permissions: StaffPermission[];
  addresses: Address[];
  favoriteProductIds: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  photoURL?: string;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface ProductImage {
  id: string;
  /** A local asset key (e.g. "bag-generic-01"), a data URL, or a remote URL. */
  source: string;
  alt: string;
}

export interface ProductOptionValue {
  value: string;
  label: string;
  swatch?: string;
}

export interface ProductOption {
  name: string;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  /** Option name -> option value key. */
  options: Record<string, string>;
  stock: number;
  priceDelta: Money;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  story: string;
  categoryId: string;
  subcategoryId: string;
  price: Money;
  compareAtPrice?: Money;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  materials: string;
  dimensions: string;
  care: string;
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  isNew: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  image: string;
  parentId?: string;
  order: number;
  active: boolean;
}

export interface CategoryDraft {
  id?: string;
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  image: string;
  parentId?: string;
  order: number;
  active: boolean;
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type DeliveryMethod = 'standard' | 'express';
export type PaymentMethod = 'cod';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  image: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface OrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  by: string;
  note?: string;
}

export interface InternalNote {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  userId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: Money;
  discountTotal: Money;
  shippingFee: Money;
  total: Money;
  promoCode?: string;
  promoId?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  address: Address;
  notes?: string;
  internalNotes: InternalNote[];
  timeline: OrderTimelineEntry[];
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export type PromotionType = 'percent' | 'fixed';

export interface Promotion {
  id: string;
  code: string;
  description: string;
  type: PromotionType;
  /** Percent (1-100) or fixed tetri, depending on type. */
  value: number;
  minOrder: Money;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  perUserLimit: number;
  usageCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  createdAt: string;
  moderatedAt?: string;
  moderatedBy?: string;
}

export type NotificationAudience = 'customer' | 'staff' | 'admin' | 'manager';

export type NotificationType = 'order' | 'stock' | 'system' | 'review' | 'account';

export interface AppNotification {
  id: string;
  audience: NotificationAudience;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
  readBy: string[];
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  currency: 'GEL';
  freeShippingThreshold: Money;
  standardShippingFee: Money;
  expressShippingFee: Money;
  codEnabled: boolean;
  codInstructions: string;
  lowStockThreshold: number;
  announcement: string;
  instagramUrl: string;
  facebookUrl: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: 'product' | 'order' | 'promotion' | 'category' | 'user' | 'settings' | 'review' | 'auth';
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  permissions: StaffPermission[];
  status: UserStatus;
}

export interface DataSnapshot {
  users: User[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  promotions: Promotion[];
  reviews: Review[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  settings: StoreSettings;
  session: SessionUser | null;
  authReady: boolean;
  loading: boolean;
  backendMode: 'demo' | 'firebase';
  error?: string;
}

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface OrderDraft {
  items: CartLine[];
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  address: Address;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface ProductDraft {
  id?: string;
  name: string;
  subtitle: string;
  description: string;
  story: string;
  categoryId: string;
  subcategoryId: string;
  price: Money;
  compareAtPrice?: Money;
  sku: string;
  lowStockThreshold: number;
  status: ProductStatus;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  materials: string;
  dimensions: string;
  care: string;
  tags: string[];
  featured: boolean;
  bestseller: boolean;
  isNew: boolean;
}

export interface PromotionDraft {
  id?: string;
  code: string;
  description: string;
  type: PromotionType;
  value: number;
  minOrder: Money;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  perUserLimit: number;
  active: boolean;
}

export interface EmployeeDraft {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Extract<Role, 'manager' | 'admin' | 'customer'>;
  permissions: StaffPermission[];
  status: UserStatus;
  password?: string;
}

export interface AnalyticsKpis {
  todayRevenue: Money;
  weekRevenue: Money;
  monthRevenue: Money;
  totalRevenue: Money;
  orderCount: number;
  averageOrderValue: Money;
  cancelledCount: Money;
  discountTotal: Money;
  newCustomers: number;
  lowStockCount: number;
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  revenue: Money;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  revenue: Money;
}

export interface CategoryRevenue {
  categoryId: string;
  name: string;
  revenue: Money;
  orders: number;
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export interface AppErrorShape {
  code: string;
  message: string;
  field?: string;
}
