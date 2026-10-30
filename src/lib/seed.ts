import type { User, Category, Product, Promotion, Order, Review, AppNotification, AuditLog, StoreSettings } from '@/lib/types';
export interface SeedCredential { salt: string; hash: string; iterations: number; }
export interface SeedResult {
 users: User[]; credentials: Record<string, SeedCredential>; categories: Category[];
 products: Product[]; promotions: Promotion[]; orders: Order[]; reviews: Review[];
 notifications: AppNotification[]; auditLogs: AuditLog[]; settings: StoreSettings; seededAt: string;
}
/** Empty local state; replace the CommerceBackend adapter when the real backend is connected. */
export function createSeed(now = new Date()): SeedResult {
 return {
  users: [], credentials: {}, categories: [], products: [], promotions: [], orders: [],
  reviews: [], notifications: [], auditLogs: [], seededAt: now.toISOString(),
  settings: {
   storeName: 'MAKU', tagline: 'ობიექტები, რომლებიც დროს უძლებს',
   supportEmail: '', supportPhone: '', address: '', currency: 'GEL',
   freeShippingThreshold: 30000, standardShippingFee: 1500, expressShippingFee: 3000,
   codEnabled: true, codInstructions: '', lowStockThreshold: 3, announcement: '',
   instagramUrl: '', facebookUrl: '', updatedAt: now.toISOString(),
  },
 };
}
