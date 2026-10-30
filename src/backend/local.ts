import type {
  Address,
  AppNotification,
  AuditLog,
  Category,
  DataSnapshot,
  EmployeeDraft,
  Order,
  OrderDraft,
  OrderStatus,
  Product,
  ProductDraft,
  ProductStatus,
  Promotion,
  PromotionDraft,
  CategoryDraft,
  RegisterInput,
  Review,
  ReviewStatus,
  SessionUser,
  StaffPermission,
  StoreSettings,
  User,
} from '@/lib/types';
import type {
  CommerceBackend,
  PasswordResetRequestResult,
  ProfileInput,
  ReviewInput,
} from '@/backend/types';
import { CommerceError, normalizeError } from '@/lib/errors';
import { createSeed, type SeedCredential, type SeedResult } from '@/lib/seed';
import {
  constantTimeEqual,
  hashPassword,
  hashToken,
  randomCode,
  randomSalt,
  randomToken,
} from '@/lib/crypto';
import {
  addressSchema,
  employeeSchema,
  loginSchema,
  passwordSchema,
  productSchema,
  profileSchema,
  promotionSchema,
  registerSchema,
  reviewSchema,
  settingsSchema,
  checkoutSchema,
  fieldErrors,
  categorySchema,
} from '@/lib/validation';
import { evaluatePromotion, computeOrderTotals } from '@/domain/pricing';
import {
  canManageInventory,
  canManageOrders,
  canManageProducts,
  canManagePromotions,
  canManageReviews,
  canManageStaff,
} from '@/domain/permissions';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import {
  fileToCompressedDataUrl,
  getVariantLabel,
  makeId,
  normalizeEmail,
  slugify,
} from '@/lib/utils';
import type { z } from 'zod';

const DB_KEY = 'bag.local.db.v2.gel';
const TOKEN_KEY = 'bag.local.session.v2';
const DB_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

export function createBrowserStorage(): StorageLike {
  try {
    const testKey = '__maku_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

interface SessionRecord {
  userId: string;
  expiresAt: string;
}

interface PasswordResetRecord {
  userId: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
}

interface LocalDb {
  version: number;
  seededAt: string;
  users: User[];
  credentials: Record<string, SeedCredential>;
  categories: Category[];
  products: Product[];
  orders: Order[];
  promotions: Promotion[];
  reviews: Review[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  settings: StoreSettings;
  sessions: Record<string, SessionRecord>;
  passwordResets: Record<string, PasswordResetRecord>;
  orderCounter: number;
}

interface LocalBackendOptions {
  storage?: StorageLike;
  now?: () => Date;
  seedFactory?: (now: Date) => SeedResult;
}

const SESSION_TTL_MS = 7 * 24 * 3_600_000;

function emptySnapshot(): DataSnapshot {
  return {
    users: [],
    products: [],
    categories: [],
    orders: [],
    promotions: [],
    reviews: [],
    notifications: [],
    auditLogs: [],
    settings: {
      storeName: 'MAKU',
      tagline: '',
      supportEmail: '',
      supportPhone: '',
      address: '',
      currency: 'GEL',
      freeShippingThreshold: 300,
      standardShippingFee: 15,
      expressShippingFee: 30,
      codEnabled: false,
      codInstructions: '',
      lowStockThreshold: 3,
      announcement: '',
      instagramUrl: '',
      facebookUrl: '',
      updatedAt: new Date().toISOString(),
    },
    session: null,
    authReady: false,
    loading: true,
    backendMode: 'demo',
  };
}

export class LocalBackend implements CommerceBackend {
  readonly mode = 'demo' as const;
  private storage: StorageLike;
  private now: () => Date;
  private seedFactory: (now: Date) => SeedResult;
  private db: LocalDb;
  private snapshot: DataSnapshot = emptySnapshot();
  private listeners = new Set<() => void>();
  private token: string | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
  private initialized = false;

  constructor(options: LocalBackendOptions = {}) {
    this.storage = options.storage ?? createBrowserStorage();
    this.now = options.now ?? (() => new Date());
    this.seedFactory = options.seedFactory ?? createSeed;
    this.db = this.loadDatabase();
    this.token = this.storage.getItem(TOKEN_KEY);
    this.pruneSessions();
    this.snapshot = this.buildSnapshot();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.emit();
  }

  getSnapshot(): DataSnapshot {
    return this.snapshot;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private loadDatabase(): LocalDb {
    const stored = this.storage.getItem(DB_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LocalDb;
        if (parsed.version === DB_VERSION && Array.isArray(parsed.users) && parsed.settings) {
          return parsed;
        }
      } catch {
        // Corrupt local data is replaced with a clean demo seed below.
      }
    }
    return this.seedDatabase();
  }

  private seedDatabase(): LocalDb {
    const seed = this.seedFactory(this.now());
    const db: LocalDb = {
      version: DB_VERSION,
      seededAt: seed.seededAt,
      users: seed.users,
      credentials: seed.credentials,
      categories: seed.categories,
      products: seed.products,
      orders: seed.orders,
      promotions: seed.promotions,
      reviews: seed.reviews,
      notifications: seed.notifications,
      auditLogs: seed.auditLogs,
      settings: seed.settings,
      sessions: {},
      passwordResets: {},
      orderCounter: seed.orders.length,
    };
    try {
      this.storage.setItem(DB_KEY, JSON.stringify(db));
    } catch {
      // Storage may be unavailable in private mode; the in-memory session still works.
    }
    return db;
  }

  private persist() {
    try {
      this.storage.setItem(DB_KEY, JSON.stringify(this.db));
    } catch {
      throw new CommerceError(
        'storage_full',
        'ლოკალური მონაცემების შენახვა ვერ მოხერხდა. სცადეთ ნაკლები მოცულობის სურათი.',
      );
    }
  }

  private pruneSessions() {
    const now = this.now().getTime();
    let changed = false;
    for (const [token, session] of Object.entries(this.db.sessions)) {
      if (new Date(session.expiresAt).getTime() < now) {
        delete this.db.sessions[token];
        changed = true;
      }
    }
    if (changed) {
      try {
        this.persist();
      } catch {
        // ignore persistence issues while pruning
      }
    }
    if (this.token && !this.db.sessions[this.token]) {
      this.token = null;
      this.storage.removeItem(TOKEN_KEY);
    }
  }

  private getSessionUser(): User | null {
    if (!this.token) return null;
    const session = this.db.sessions[this.token];
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < this.now().getTime()) {
      delete this.db.sessions[this.token];
      return null;
    }
    const user = this.db.users.find((entry) => entry.id === session.userId);
    if (!user || user.status !== 'active') return null;
    return user;
  }

  private sessionUser(): SessionUser | null {
    const user = this.getSessionUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      status: user.status,
    };
  }

  private buildSnapshot(): DataSnapshot {
    const session = this.sessionUser();
    const role = session?.role;
    const isAdmin = role === 'admin';
    const isStaff = role === 'admin' || role === 'manager';

    const users = isAdmin ? this.db.users : session ? this.db.users.filter((entry) => entry.id === session.id) : [];
    const products = isStaff
      ? this.db.products
      : this.db.products.filter((product) => product.status === 'active');
    const orders = isStaff
      ? this.db.orders
      : session
        ? this.db.orders.filter((order) => order.userId === session.id)
        : [];
    const reviews = isStaff
      ? this.db.reviews
      : this.db.reviews.filter(
          (review) => review.status === 'approved' || (session && review.userId === session.id),
        );
    const notifications = this.db.notifications.filter((notification) => {
      if (!session) return false;
      if (notification.audience === 'customer') return notification.userId === session.id;
      if (notification.audience === 'staff') return isStaff;
      if (notification.audience === 'manager') return role === 'manager' || isAdmin;
      if (notification.audience === 'admin') return isAdmin;
      return false;
    });
    const promotions =
      isAdmin || (role === 'manager' && session?.permissions.includes('promotions'))
        ? this.db.promotions
        : [];
    const auditLogs = isAdmin ? this.db.auditLogs : [];

    const data: DataSnapshot = {
      users: this.sortUsers(users),
      products: this.sortProducts(products),
      categories: this.sortCategories(this.db.categories),
      orders: this.sortOrders(orders),
      promotions: [...promotions].sort((a, b) => a.code.localeCompare(b.code)),
      reviews: [...reviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      notifications: [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      auditLogs: [...auditLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      settings: this.db.settings,
      session,
      authReady: true,
      loading: false,
      backendMode: 'demo',
    };
    return structuredClone(data);
  }

  private sortUsers(users: User[]): User[] {
    return [...users].sort((a, b) => {
      const order = { admin: 0, manager: 1, customer: 2 };
      return order[a.role] - order[b.role] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private sortProducts(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private sortCategories(categories: Category[]): Category[] {
    return [...categories].sort((a, b) => {
      if (a.parentId === b.parentId) return a.order - b.order;
      if (!a.parentId) return -1;
      if (!b.parentId) return 1;
      return a.order - b.order;
    });
  }

  private sortOrders(orders: Order[]): Order[] {
    return [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private enqueue<T>(task: () => T | Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private mutate<T>(task: () => T | Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      const before = structuredClone(this.db);
      try {
        const result = await task();
        this.persist();
        this.emit();
        return result;
      } catch (error) {
        this.db = before;
        this.emit();
        throw normalizeError(error);
      }
    });
  }

  private parseSchema<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error);
      const firstKey = Object.keys(errors)[0];
      throw new CommerceError('validation', errors[firstKey] ?? 'მონაცემები არასწორია.', firstKey);
    }
    return parsed.data as z.infer<T>;
  }

  private requireUser(): User {
    const user = this.getSessionUser();
    if (!user) throw new CommerceError('auth_required', 'გაიარეთ ავტორიზაცია.');
    return user;
  }

  private requireStaff(permission?: StaffPermission): User {
    const user = this.requireUser();
    if (user.role === 'admin') return user;
    if (user.role !== 'manager') {
      throw new CommerceError('forbidden', 'ამ მოქმედების უფლება არ გაქვთ.');
    }
    if (permission && !user.permissions.includes(permission)) {
      throw new CommerceError('forbidden', 'ამ განყოფილებაზე წვდომა შეზღუდულია.');
    }
    return user;
  }

  private requireAdmin(): User {
    const user = this.requireUser();
    if (user.role !== 'admin') throw new CommerceError('forbidden', 'მოქმედება ხელმისაწვდომია მხოლოდ ადმინისტრატორისთვის.');
    return user;
  }

  private addAudit(
    actor: { id: string; firstName: string; lastName: string } | null,
    action: string,
    entity: AuditLog['entity'],
    entityId: string,
    summary: string,
    metadata?: Record<string, unknown>,
  ) {
    this.db.auditLogs.unshift({
      id: makeId('audit'),
      actorId: actor?.id ?? 'system',
      actorName: actor ? `${actor.firstName} ${actor.lastName}` : 'სისტემა',
      action,
      entity,
      entityId,
      summary,
      metadata,
      createdAt: this.now().toISOString(),
    });
    if (this.db.auditLogs.length > 2000) this.db.auditLogs.length = 2000;
  }

  private addNotification(
    input: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'> & { readBy?: string[] },
  ) {
    this.db.notifications.unshift({
      ...input,
      id: makeId('notif'),
      createdAt: this.now().toISOString(),
      readBy: input.readBy ?? [],
    });
    if (this.db.notifications.length > 500) this.db.notifications.length = 500;
  }

  private notifyStaff(title: string, message: string, link?: string, type: AppNotification['type'] = 'order') {
    this.addNotification({ audience: 'staff', type, title, message, link });
  }

  private notifyCustomer(userId: string, title: string, message: string, link?: string, type: AppNotification['type'] = 'order') {
    this.addNotification({ audience: 'customer', userId, type, title, message, link });
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const parsed = this.parseSchema(loginSchema, { email, password });
    const normalized = normalizeEmail(parsed.email);
    const attempt = this.loginAttempts.get(normalized);
    if (attempt && attempt.lockedUntil > Date.now()) {
      throw new CommerceError(
        'rate_limited',
        'რამდენიმე წარუმატებელი მცდელობა. სცადეთ ერთი წუთის შემდეგ.',
      );
    }
    const user = this.db.users.find((entry) => entry.email.toLowerCase() === normalized);
    const credential = user ? this.db.credentials[user.id] : undefined;
    if (!user || !credential) {
      this.registerFailedAttempt(normalized);
      throw new CommerceError('invalid_credentials', 'ელფოსტა ან პაროლი არასწორია.');
    }
    const hash = await hashPassword(password, credential.salt, credential.iterations);
    if (!constantTimeEqual(hash, credential.hash)) {
      this.registerFailedAttempt(normalized);
      throw new CommerceError('invalid_credentials', 'ელფოსტა ან პაროლი არასწორია.');
    }
    if (user.status !== 'active') {
      throw new CommerceError('account_suspended', 'თქვენი ანგარიში დროებით შეჩერებულია. დაუკავშირდით მხარდაჭერას.');
    }
    this.loginAttempts.delete(normalized);
    const token = randomToken(32);
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_MS).toISOString();
    await this.mutate(() => {
      this.db.sessions[token] = { userId: user.id, expiresAt };
      this.token = token;
      user.lastLoginAt = this.now().toISOString();
      this.storage.setItem(TOKEN_KEY, token);
      this.addAudit(user, 'auth.login', 'auth', user.id, 'სისტემაში შესვლა', { role: user.role });
    });
    const session = this.sessionUser();
    if (!session) throw new CommerceError('auth_failed', 'სესიის შექმნა ვერ მოხერხდა.');
    return session;
  }

  private registerFailedAttempt(email: string) {
    const current = this.loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
    const count = current.count + 1;
    this.loginAttempts.set(email, {
      count: count >= 5 ? 0 : count,
      lockedUntil: count >= 5 ? Date.now() + 60_000 : 0,
    });
  }

  async register(input: RegisterInput): Promise<SessionUser> {
    const parsed = this.parseSchema(registerSchema.omit({ acceptTerms: true }), input);
    const normalized = normalizeEmail(parsed.email);
    if (this.db.users.some((entry) => entry.email.toLowerCase() === normalized)) {
      throw new CommerceError('email_exists', 'ამ ელფოსტით ანგარიში უკვე არსებობს.', 'email');
    }
    const id = makeId('user');
    const salt = randomSalt(id);
    const hash = await hashPassword(parsed.password, salt);
    const now = this.now().toISOString();
    const user: User = {
      id,
      email: normalized,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
      role: 'customer',
      status: 'active',
      permissions: [],
      addresses: [],
      favoriteProductIds: [],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    const token = randomToken(32);
    await this.mutate(() => {
      this.db.users.push(user);
      this.db.credentials[id] = { salt, hash, iterations: 120_000 };
      this.db.sessions[token] = {
        userId: id,
        expiresAt: new Date(this.now().getTime() + SESSION_TTL_MS).toISOString(),
      };
      this.token = token;
      this.storage.setItem(TOKEN_KEY, token);
      this.addAudit(user, 'auth.register', 'auth', id, 'ახალი მომხმარებლის რეგისტრაცია');
      this.notifyCustomer(
        id,
        'კეთილი იყოს თქვენი მობრძანება MAKU-ში',
        'ანგარიში შექმნილია. აირჩიეთ რჩეულები და შეინახეთ მისამართები უფრო სწრაფი შეკვეთისთვის.',
        '/account',
        'account',
      );
    });
    const session = this.sessionUser();
    if (!session) throw new CommerceError('auth_failed', 'რეგისტრაცია ვერ დასრულდა.');
    return session;
  }

  async logout(): Promise<void> {
    const token = this.token;
    if (token) {
      await this.mutate(() => {
        delete this.db.sessions[token];
        this.token = null;
        this.storage.removeItem(TOKEN_KEY);
      });
    } else {
      this.token = null;
      this.storage.removeItem(TOKEN_KEY);
      this.emit();
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalized = normalizeEmail(email);
    const user = this.db.users.find((entry) => entry.email.toLowerCase() === normalized);
    if (!user) return { delivered: true };
    const code = randomCode();
    const codeHash = await hashToken(`${code}:${user.id}`);
    await this.mutate(() => {
      this.db.passwordResets[normalized] = {
        userId: user.id,
        codeHash,
        expiresAt: new Date(this.now().getTime() + 15 * 60_000).toISOString(),
        attempts: 0,
      };
      this.addAudit(null, 'auth.password_reset_requested', 'auth', user.id, 'პაროლის აღდგენის მოთხოვნა');
    });
    return { delivered: true, demoCode: code };
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalized = normalizeEmail(email);
    const reset = this.db.passwordResets[normalized];
    if (!reset) throw new CommerceError('reset_invalid', 'აღდგენის კოდი არასწორია ან ვადა ამოიწურა.');
    if (new Date(reset.expiresAt).getTime() < this.now().getTime()) {
      throw new CommerceError('reset_expired', 'აღდგენის კოდის ვადა ამოიწურა.');
    }
    if (reset.attempts >= 5) {
      throw new CommerceError('rate_limited', 'მცდელობების ლიმიტი ამოიწურა. მოითხოვეთ ახალი კოდი.');
    }
    const parsedPassword = this.parseSchema(passwordSchema, newPassword);
    const codeHash = await hashToken(`${code.trim()}:${reset.userId}`);
    if (!constantTimeEqual(codeHash, reset.codeHash)) {
      reset.attempts += 1;
      this.persist();
      throw new CommerceError('reset_invalid', 'აღდგენის კოდი არასწორია.');
    }
    const user = this.db.users.find((entry) => entry.id === reset.userId);
    if (!user) throw new CommerceError('reset_invalid', 'მომხმარებელი ვერ მოიძებნა.');
    const salt = randomSalt(user.id);
    const hash = await hashPassword(parsedPassword, salt);
    await this.mutate(() => {
      this.db.credentials[user.id] = { salt, hash, iterations: 120_000 };
      for (const [token, session] of Object.entries(this.db.sessions)) {
        if (session.userId === user.id) delete this.db.sessions[token];
      }
      delete this.db.passwordResets[normalized];
      if (this.token && !this.db.sessions[this.token]) {
        this.token = null;
        this.storage.removeItem(TOKEN_KEY);
      }
      this.addAudit(null, 'auth.password_reset', 'auth', user.id, 'პაროლი შეიცვალა აღდგენის კოდით');
    });
  }

  async updateProfile(input: ProfileInput): Promise<User> {
    const user = this.requireUser();
    const parsed = this.parseSchema(profileSchema, input);
    await this.mutate(() => {
      Object.assign(user, parsed, { updatedAt: this.now().toISOString() });
      this.addAudit(user, 'user.profile_updated', 'user', user.id, 'პროფილის მონაცემები განახლდა');
    });
    return user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.requireUser();
    const credential = this.db.credentials[user.id];
    if (!credential) throw new CommerceError('auth_failed', 'პაროლის შეცვლა ვერ მოხერხდა.');
    const currentHash = await hashPassword(currentPassword, credential.salt, credential.iterations);
    if (!constantTimeEqual(currentHash, credential.hash)) {
      throw new CommerceError('invalid_credentials', 'მიმდინარე პაროლი არასწორია.', 'currentPassword');
    }
    const parsedPassword = this.parseSchema(passwordSchema, newPassword);
    const salt = randomSalt(user.id);
    const hash = await hashPassword(parsedPassword, salt);
    await this.mutate(() => {
      this.db.credentials[user.id] = { salt, hash, iterations: 120_000 };
      this.addAudit(user, 'auth.password_changed', 'auth', user.id, 'პაროლი შეიცვალა');
    });
  }

  async saveAddress(input: Address): Promise<Address[]> {
    const user = this.requireUser();
    const parsed = this.parseSchema(addressSchema, input);
    const address: Address = {
      ...parsed,
      id: parsed.id ?? makeId('addr'),
      apartment: parsed.apartment || '',
      postalCode: parsed.postalCode || '',
      isDefault: parsed.isDefault ?? false,
    };
    await this.mutate(() => {
      const existingIndex = user.addresses.findIndex((entry) => entry.id === address.id);
      if (existingIndex >= 0) user.addresses[existingIndex] = address;
      else user.addresses.push(address);
      if (!user.addresses.some((entry) => entry.isDefault) || address.isDefault) {
        user.addresses = user.addresses.map((entry) => ({
          ...entry,
          isDefault: entry.id === address.id,
        }));
      } else if (address.isDefault) {
        user.addresses = user.addresses.map((entry) => ({
          ...entry,
          isDefault: entry.id === address.id,
        }));
      }
      user.updatedAt = this.now().toISOString();
    });
    return user.addresses;
  }

  async deleteAddress(addressId: string): Promise<void> {
    const user = this.requireUser();
    await this.mutate(() => {
      const wasDefault = user.addresses.find((entry) => entry.id === addressId)?.isDefault;
      user.addresses = user.addresses.filter((entry) => entry.id !== addressId);
      if (wasDefault && user.addresses[0]) {
        user.addresses = user.addresses.map((entry, index) => ({ ...entry, isDefault: index === 0 }));
      }
      user.updatedAt = this.now().toISOString();
    });
  }

  async setDefaultAddress(addressId: string): Promise<void> {
    const user = this.requireUser();
    if (!user.addresses.some((entry) => entry.id === addressId)) {
      throw new CommerceError('not_found', 'მისამართი ვერ მოიძებნა.');
    }
    await this.mutate(() => {
      user.addresses = user.addresses.map((entry) => ({
        ...entry,
        isDefault: entry.id === addressId,
      }));
      user.updatedAt = this.now().toISOString();
    });
  }

  async toggleFavorite(productId: string): Promise<boolean> {
    const user = this.requireUser();
    const product = this.db.products.find((entry) => entry.id === productId);
    if (!product || product.status !== 'active') {
      throw new CommerceError('not_found', 'პროდუქტი ვერ მოიძებნა.');
    }
    let favorite = false;
    await this.mutate(() => {
      if (user.favoriteProductIds.includes(productId)) {
        user.favoriteProductIds = user.favoriteProductIds.filter((id) => id !== productId);
        favorite = false;
      } else {
        user.favoriteProductIds = [...user.favoriteProductIds, productId];
        favorite = true;
      }
      user.updatedAt = this.now().toISOString();
    });
    return favorite;
  }

  async validatePromo(code: string, subtotal: number): Promise<ReturnType<typeof evaluatePromotion>> {
    const normalized = code.trim().toUpperCase();
    const promotion = this.db.promotions.find((entry) => entry.code === normalized);
    if (!promotion) {
      return { valid: false, discount: 0, reason: 'პრომოკოდი ვერ მოიძებნა.' };
    }
    const user = this.getSessionUser();
    const redemptions = user
      ? this.db.orders.filter(
          (order) =>
            order.userId === user.id && order.promoId === promotion.id && order.status !== 'cancelled',
        ).length
      : 0;
    return evaluatePromotion(promotion, Math.max(0, Math.round(subtotal)), {
      now: this.now(),
      userRedemptions: redemptions,
    });
  }

  async createOrder(input: OrderDraft): Promise<Order> {
    const user = this.requireUser();
    const parsed = this.parseSchema(checkoutSchema, input);
    if (!this.db.settings.codEnabled && parsed.paymentMethod === 'cod') {
      throw new CommerceError('payment_unavailable', 'მიღებისას გადახდა ამჟამად გამორთულია.');
    }
    return this.enqueue(async () => {
      const existing = this.db.orders.find(
        (order) => order.userId === user.id && order.idempotencyKey === parsed.idempotencyKey,
      );
      if (existing) return structuredClone(existing);

      const before = structuredClone(this.db);
      try {
        const now = this.now();
        const mergedLines = new Map<string, { productId: string; variantId: string; quantity: number }>();
        for (const line of parsed.items) {
          const key = `${line.productId}:${line.variantId}`;
          const current = mergedLines.get(key);
          if (current) current.quantity += line.quantity;
          else mergedLines.set(key, { ...line });
        }
        for (const line of mergedLines.values()) {
          if (line.quantity > 20) {
            throw new CommerceError('validation', 'ერთი პროდუქტის მაქსიმალური რაოდენობაა 20.');
          }
        }
        const validatedItems = [...mergedLines.values()].map((line) => {
          const product = this.db.products.find((entry) => entry.id === line.productId);
          if (!product || product.status !== 'active') {
            throw new CommerceError('product_unavailable', 'ერთ-ერთი პროდუქტი აღარ არის ხელმისაწვდომი.');
          }
          const variant = product.variants.find((entry) => entry.id === line.variantId);
          if (!variant) throw new CommerceError('variant_unavailable', 'პროდუქტის ვარიანტი ვერ მოიძებნა.');
          if (variant.stock < line.quantity) {
            throw new CommerceError(
              'out_of_stock',
              `${product.name} — მარაგში დარჩენილია ${variant.stock} ერთეული.`,
            );
          }
          const unitPrice = product.price + variant.priceDelta;
          return {
            product,
            variant,
            quantity: line.quantity,
            unitPrice,
            lineTotal: unitPrice * line.quantity,
          };
        });

        const subtotal = validatedItems.reduce((total, item) => total + item.lineTotal, 0);
        let promotion: Promotion | undefined;
        if (parsed.promoCode?.trim()) {
          promotion = this.db.promotions.find(
            (entry) => entry.code === parsed.promoCode?.trim().toUpperCase(),
          );
          const userRedemptions = this.db.orders.filter(
            (order) => order.userId === user.id && order.promoId === promotion?.id && order.status !== 'cancelled',
          ).length;
          const evaluation = evaluatePromotion(promotion, subtotal, {
            now,
            userRedemptions,
          });
          if (!evaluation.valid) {
            throw new CommerceError('promo_invalid', evaluation.reason ?? 'პრომოკოდი არასწორია.', 'promoCode');
          }
        }

        const totals = computeOrderTotals({
          lines: validatedItems.map((item) => ({ unitPrice: item.unitPrice, quantity: item.quantity })),
          promotion,
          settings: this.db.settings,
          deliveryMethod: parsed.deliveryMethod,
          now,
        });
        if (parsed.promoCode?.trim() && !totals.promo.valid) {
          throw new CommerceError('promo_invalid', totals.promo.reason ?? 'პრომოკოდი არასწორია.', 'promoCode');
        }

        const address: Address = {
          ...parsed.address,
          id: parsed.address.id ?? makeId('addr'),
          apartment: parsed.address.apartment || '',
          postalCode: parsed.address.postalCode || '',
        };
        this.db.orderCounter += 1;
        const id = makeId('order');
        const orderNumber = `MK-${now.getFullYear()}-${String(this.db.orderCounter).padStart(4, '0')}`;
        const order: Order = {
          id,
          number: orderNumber,
          userId: user.id,
          customer: {
            firstName: parsed.contact.firstName,
            lastName: parsed.contact.lastName,
            email: normalizeEmail(parsed.contact.email),
            phone: parsed.contact.phone,
          },
          items: validatedItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            productSlug: item.product.slug,
            variantId: item.variant.id,
            variantLabel: getVariantLabel(item.product, item.variant),
            sku: item.variant.sku,
            image: item.product.images[0]?.source ?? '',
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shippingFee: totals.shippingFee,
          total: totals.total,
          promoCode: totals.promo.valid ? promotion?.code : undefined,
          promoId: totals.promo.valid ? promotion?.id : undefined,
          status: 'new',
          paymentMethod: 'cod',
          paymentStatus: 'unpaid',
          deliveryMethod: parsed.deliveryMethod,
          address,
          notes: parsed.notes?.trim() || undefined,
          internalNotes: [],
          timeline: [
            {
              status: 'new',
              at: now.toISOString(),
              by: `${user.firstName} ${user.lastName}`,
              note: 'შეკვეთა გაფორმდა ონლაინ.',
            },
          ],
          idempotencyKey: parsed.idempotencyKey,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        for (const item of validatedItems) {
          const product = item.product;
          const variant = product.variants.find((entry) => entry.id === item.variant.id);
          if (!variant) continue;
          const stockBefore = variant.stock;
          variant.stock -= item.quantity;
          product.stock = product.variants.reduce((total, entry) => total + entry.stock, 0);
          product.updatedAt = now.toISOString();
          if (stockBefore > product.lowStockThreshold && variant.stock <= product.lowStockThreshold) {
            this.notifyStaff(
              `დაბალი მარაგი — ${product.name}`,
              `${variant.sku} ვარიანტს დარჩა ${variant.stock} ერთეული.`,
              '/admin/inventory',
              'stock',
            );
          }
        }

        if (promotion && totals.promo.valid) promotion.usageCount += 1;

        this.db.orders.unshift(order);
        this.addNotification({
          audience: 'staff',
          type: 'order',
          title: `ახალი შეკვეთა ${order.number}`,
          message: `${user.firstName} ${user.lastName} · ${order.items.length} ნივთი · ${(order.total).toFixed(0)} ₾`,
          link: '/admin/orders',
        });
        this.notifyCustomer(
          user.id,
          `შეკვეთა ${order.number} მიღებულია`,
          'ჩვენ დაგიკავშირდებით შეკვეთის დასადასტურებლად. სტატუსი შეგიძლიათ თვალი ადევნოთ პროფილში.',
          `/account/orders/${order.id}`,
          'order',
        );
        this.addAudit(user, 'order.created', 'order', order.id, `ახალი შეკვეთა — ${order.number}`, {
          total: order.total,
          items: order.items.length,
        });
        this.persist();
        this.emit();
        return structuredClone(order);
      } catch (error) {
        this.db = before;
        this.emit();
        throw normalizeError(error);
      }
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
    const actor = this.requireStaff('orders');
    if (!canManageOrders(actor.role, actor.permissions)) {
      throw new CommerceError('forbidden', 'შეკვეთების მართვის უფლება არ გაქვთ.');
    }
    return this.mutate(() => {
      const order = this.db.orders.find((entry) => entry.id === orderId);
      if (!order) throw new CommerceError('not_found', 'შეკვეთა ვერ მოიძებნა.');
      if (order.status === status) return structuredClone(order);
      const transitions = {
        new: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      } as const;
      if (!(transitions[order.status] as readonly OrderStatus[]).includes(status)) {
        throw new CommerceError(
          'invalid_transition',
          `სტატუსის შეცვლა „${ORDER_STATUS_LABELS[order.status]}“-დან „${ORDER_STATUS_LABELS[status]}“-ზე დაუშვებელია.`,
        );
      }
      const now = this.now().toISOString();
      if (status === 'cancelled') {
        for (const item of order.items) {
          const product = this.db.products.find((entry) => entry.id === item.productId);
          const variant = product?.variants.find((entry) => entry.id === item.variantId);
          if (product && variant) {
            variant.stock += item.quantity;
            product.stock = product.variants.reduce((total, entry) => total + entry.stock, 0);
            product.updatedAt = now;
          }
        }
        order.paymentStatus = order.paymentStatus === 'paid' ? 'refunded' : 'unpaid';
      }
      if (status === 'completed') order.paymentStatus = 'paid';
      order.status = status;
      order.updatedAt = now;
      order.timeline.push({
        status,
        at: now,
        by: `${actor.firstName} ${actor.lastName}`,
        note: note?.trim() || undefined,
      });
      if (note?.trim()) {
        order.internalNotes.push({
          id: makeId('note'),
          text: note.trim(),
          authorId: actor.id,
          authorName: `${actor.firstName} ${actor.lastName}`,
          createdAt: now,
        });
      }
      this.notifyCustomer(
        order.userId,
        `შეკვეთის სტატუსი განახლდა — ${ORDER_STATUS_LABELS[status]}`,
        `შეკვეთა ${order.number}: ${ORDER_STATUS_LABELS[status]}.`,
        `/account/orders/${order.id}`,
        'order',
      );
      this.addAudit(
        actor,
        'order.status_changed',
        'order',
        order.id,
        `შეკვეთა ${order.number} — ${ORDER_STATUS_LABELS[status]}`,
        { status, note },
      );
      return structuredClone(order);
    });
  }

  async addOrderNote(orderId: string, text: string): Promise<void> {
    const actor = this.requireStaff('orders');
    if (!text.trim()) throw new CommerceError('validation', 'შენიშვნა ცარიელია.');
    await this.mutate(() => {
      const order = this.db.orders.find((entry) => entry.id === orderId);
      if (!order) throw new CommerceError('not_found', 'შეკვეთა ვერ მოიძებნა.');
      order.internalNotes.push({
        id: makeId('note'),
        text: text.trim().slice(0, 1000),
        authorId: actor.id,
        authorName: `${actor.firstName} ${actor.lastName}`,
        createdAt: this.now().toISOString(),
      });
      order.updatedAt = this.now().toISOString();
    });
  }

  async createReview(input: ReviewInput): Promise<Review> {
    const user = this.requireUser();
    const parsed = this.parseSchema(reviewSchema, input);
    const product = this.db.products.find((entry) => entry.id === input.productId);
    if (!product || product.status !== 'active') {
      throw new CommerceError('not_found', 'პროდუქტი ვერ მოიძებნა.');
    }
    const purchased = this.db.orders.some(
      (order) =>
        order.userId === user.id &&
        order.status !== 'cancelled' &&
        order.items.some((item) => item.productId === input.productId),
    );
    if (!purchased) {
      throw new CommerceError('purchase_required', 'მიმოხილვის დასატოვებლად საჭიროა პროდუქტის შეძენა.');
    }
    const existing = this.db.reviews.find(
      (review) => review.userId === user.id && review.productId === input.productId,
    );
    if (existing && existing.status !== 'rejected') {
      throw new CommerceError('review_exists', 'ამ პროდუქტზე უკვე დატოვეთ მიმოხილვა.');
    }
    let created!: Review;
    await this.mutate(() => {
      if (existing) {
        existing.rating = parsed.rating;
        existing.title = parsed.title;
        existing.body = parsed.body;
        existing.status = 'pending';
        existing.createdAt = this.now().toISOString();
        existing.moderatedAt = undefined;
        existing.moderatedBy = undefined;
        created = existing;
      } else {
        created = {
          id: makeId('review'),
          productId: input.productId,
          productName: product.name,
          userId: user.id,
          author: `${user.firstName} ${user.lastName}`,
          rating: parsed.rating,
          title: parsed.title,
          body: parsed.body,
          status: 'pending',
          verifiedPurchase: true,
          createdAt: this.now().toISOString(),
        };
        this.db.reviews.unshift(created);
      }
      this.notifyStaff(
        'ახალი მიმოხილვა მოდერაციას ელოდება',
        `${user.firstName} ${user.lastName} — ${product.name}, ${parsed.rating}★`,
        '/admin/reviews',
        'review',
      );
      this.addAudit(user, 'review.created', 'review', created.id, `მიმოხილვა — ${product.name}`, {
        rating: parsed.rating,
      });
    });
    return structuredClone(created);
  }

  async moderateReview(reviewId: string, status: Extract<ReviewStatus, 'approved' | 'rejected'>): Promise<void> {
    const actor = this.requireStaff('reviews');
    if (!canManageReviews(actor.role, actor.permissions)) {
      throw new CommerceError('forbidden', 'მიმოხილვების მოდერაციის უფლება არ გაქვთ.');
    }
    await this.mutate(() => {
      const review = this.db.reviews.find((entry) => entry.id === reviewId);
      if (!review) throw new CommerceError('not_found', 'მიმოხილვა ვერ მოიძებნა.');
      review.status = status;
      review.moderatedAt = this.now().toISOString();
      review.moderatedBy = actor.id;
      this.recalculateRating(review.productId);
      this.notifyCustomer(
        review.userId,
        status === 'approved' ? 'მიმოხილვა გამოქვეყნდა' : 'მიმოხილვა არ გამოქვეყნდა',
        status === 'approved'
          ? `თქვენი შეფასება ${review.productName}-ზე უკვე ჩანს მაღაზიაში.`
          : `თქვენი შეფასება ${review.productName}-ზე ვერ გამოქვეყნდა.`,
        `/product/${this.db.products.find((entry) => entry.id === review.productId)?.slug ?? ''}`,
        'review',
      );
      this.addAudit(
        actor,
        'review.moderated',
        'review',
        review.id,
        `მიმოხილვა ${status === 'approved' ? 'დამტკიცდა' : 'უარყოფილ იქნა'} — ${review.productName}`,
        { status },
      );
    });
  }

  private recalculateRating(productId: string) {
    const product = this.db.products.find((entry) => entry.id === productId);
    if (!product) return;
    const approved = this.db.reviews.filter(
      (review) => review.productId === productId && review.status === 'approved',
    );
    product.reviewCount = approved.length;
    product.rating = approved.length
      ? Math.round((approved.reduce((total, review) => total + review.rating, 0) / approved.length) * 10) / 10
      : 0;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const user = this.requireUser();
    await this.mutate(() => {
      const notification = this.db.notifications.find((entry) => entry.id === notificationId);
      if (!notification) return;
      const visible =
        (notification.audience === 'customer' && notification.userId === user.id) ||
        (notification.audience === 'staff' && (user.role === 'admin' || user.role === 'manager')) ||
        notification.audience === user.role;
      if (visible && !notification.readBy.includes(user.id)) {
        notification.readBy.push(user.id);
      }
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    const user = this.requireUser();
    await this.mutate(() => {
      for (const notification of this.db.notifications) {
        const visible =
          (notification.audience === 'customer' && notification.userId === user.id) ||
          (notification.audience === 'staff' && (user.role === 'admin' || user.role === 'manager')) ||
          notification.audience === user.role;
        if (visible && !notification.readBy.includes(user.id)) notification.readBy.push(user.id);
      }
    });
  }

  async saveProduct(draft: ProductDraft): Promise<Product> {
    const actor = this.requireStaff('products');
    if (!canManageProducts(actor.role, actor.permissions)) {
      throw new CommerceError('forbidden', 'პროდუქციის მართვის უფლება არ გაქვთ.');
    }
    const parsed = this.parseSchema(productSchema, draft);
    if (!draft.variants.length) throw new CommerceError('validation', 'დაამატეთ მინიმუმ ერთი ვარიანტი.');
    if (draft.status === 'active' && !draft.images.length) {
      throw new CommerceError('validation', 'აქტიურ პროდუქტს სჭირდება მინიმუმ ერთი ფოტო.');
    }
    const category = this.db.categories.find((entry) => entry.id === draft.categoryId);
    const subcategory = this.db.categories.find((entry) => entry.id === draft.subcategoryId);
    if (!category || category.parentId) throw new CommerceError('validation', 'კატეგორია არასწორია.', 'categoryId');
    if (!subcategory || subcategory.parentId !== category.id) {
      throw new CommerceError('validation', 'ქვეკატეგორია არასწორია.', 'subcategoryId');
    }
    for (const option of draft.options) {
      if (!option.name.trim() || !option.values.length) {
        throw new CommerceError('validation', 'პროდუქტის ოფციები არასრულადაა შევსებული.');
      }
    }
    for (const variant of draft.variants) {
      if (variant.stock < 0 || !Number.isInteger(variant.stock)) {
        throw new CommerceError('validation', 'მარაგი უნდა იყოს დადებითი მთელი რიცხვი.');
      }
      for (const option of draft.options) {
        if (!variant.options[option.name]) {
          throw new CommerceError('validation', `ვარიანტს აკლია ${option.name}.`);
        }
      }
    }
    const allVariantSkus = this.db.products
      .flatMap((product) => product.variants)
      .filter((variant) => !draft.variants.some((entry) => entry.id === variant.id))
      .map((variant) => variant.sku.toUpperCase());
    for (const variant of draft.variants) {
      if (allVariantSkus.includes(variant.sku.toUpperCase())) {
        throw new CommerceError('validation', `SKU ${variant.sku} უკვე გამოყენებულია.`, 'sku');
      }
    }
    let saved!: Product;
    await this.mutate(() => {
      const now = this.now().toISOString();
      const existing = draft.id ? this.db.products.find((product) => product.id === draft.id) : undefined;
      const stock = draft.variants.reduce((total, variant) => total + variant.stock, 0);
      const images = draft.images.map((image, index) => ({
        ...image,
        id: image.id || `img_${Date.now()}_${index}`,
      }));
      if (existing) {
        Object.assign(existing, {
          ...parsed,
          subtitle: parsed.subtitle || '',
          story: parsed.story || '',
          materials: parsed.materials || '',
          dimensions: parsed.dimensions || '',
          care: parsed.care || '',
          compareAtPrice: parsed.compareAtPrice || undefined,
          images,
          options: draft.options,
          variants: draft.variants,
          featured: Boolean(draft.featured),
          bestseller: Boolean(draft.bestseller),
          isNew: Boolean(draft.isNew),
          tags: draft.tags,
          stock,
          updatedAt: now,
        });
        saved = existing;
      } else {
        const id = makeId('product');
        let slug = slugify(draft.name);
        if (this.db.products.some((product) => product.slug === slug)) slug = `${slug}-${id.slice(-4)}`;
        saved = {
          id,
          slug,
          ...parsed,
          subtitle: parsed.subtitle || '',
          description: parsed.description,
          story: parsed.story || '',
          materials: parsed.materials || '',
          dimensions: parsed.dimensions || '',
          care: parsed.care || '',
          compareAtPrice: parsed.compareAtPrice || undefined,
          images,
          options: draft.options,
          variants: draft.variants,
          featured: Boolean(draft.featured),
          bestseller: Boolean(draft.bestseller),
          isNew: Boolean(draft.isNew),
          tags: draft.tags,
          stock,
          rating: 0,
          reviewCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        this.db.products.unshift(saved);
      }
      this.addAudit(
        actor,
        existing ? 'product.updated' : 'product.created',
        'product',
        saved.id,
        `${existing ? 'განახლდა' : 'შეიქმნა'} პროდუქტი — ${saved.name}`,
        { price: saved.price, stock },
      );
    });
    return structuredClone(saved);
  }

  async deleteProducts(ids: string[]): Promise<void> {
    const actor = this.requireStaff('products');
    await this.mutate(() => {
      const toDelete = new Set(ids);
      const names = this.db.products.filter((product) => toDelete.has(product.id)).map((product) => product.name);
      this.db.products = this.db.products.filter((product) => !toDelete.has(product.id));
      this.db.reviews = this.db.reviews.filter((review) => !toDelete.has(review.productId));
      this.addAudit(actor, 'product.deleted', 'product', ids.join(','), `წაიშალა პროდუქტები: ${names.join(', ')}`, {
        count: names.length,
      });
    });
  }

  async saveCategory(draft: CategoryDraft): Promise<Category> {
    const actor = this.requireStaff('products');
    const parsed = this.parseSchema(categorySchema, draft);
    const parentId = draft.parentId || undefined;
    const saved = await this.mutate(() => {
      const existing = draft.id ? this.db.categories.find((entry) => entry.id === draft.id) : undefined;
      if (existing && existing.parentId && !parentId) {
        throw new CommerceError('validation', 'ქვეკატეგორიას მშობელი კატეგორია აუცილებელია.');
      }
      let result!: Category;
      if (existing) {
        const nextSlug = parsed.slug;
        if (nextSlug !== existing.slug && this.db.categories.some((c) => c.id !== existing.id && c.slug === nextSlug)) {
          throw new CommerceError('validation', 'Slug is already in use.');
        }
        Object.assign(existing, { ...parsed, parentId });
        result = existing;
      } else {
        const { slug, ...categoryFields } = parsed;
        let finalSlug = slug;
        if (this.db.categories.some((category) => category.slug === finalSlug)) finalSlug = `${finalSlug}-${makeId('cat').slice(-4)}`;
        result = { id: makeId('category'), ...categoryFields, slug: finalSlug, parentId };
        this.db.categories.push(result);
      }
      this.addAudit(
        actor,
        existing ? 'category.updated' : 'category.created',
        'category',
        result.id,
        `${existing ? 'განახლდა' : 'შეიქმნა'} კატეგორია — ${parsed.name}`,
        { active: parsed.active, parentId },
      );
      return result;
    });
    return structuredClone(saved);
  }

  async deleteCategory(id: string): Promise<void> {
    const actor = this.requireStaff('products');
    const category = this.db.categories.find((entry) => entry.id === id);
    if (!category) throw new CommerceError('validation', 'კატეგორია არ მოიძებნა.');
    const usedBy = this.db.products.filter((product) => product.categoryId === id || product.subcategoryId === id);
    if (usedBy.length) {
      throw new CommerceError('validation', 'კატეგორია "' + category.name + '"-ს ' + usedBy.length + ' პროდუქტს აპირობს.', 'id');
    }
    const hasChildren = this.db.categories.some((entry) => entry.parentId === id);
    if (hasChildren) {
      throw new CommerceError('validation', 'კატეგორია "' + category.name + '"-ს ქვეკატეგორიები აქვს.', 'id');
    }
    await this.mutate(() => {
      this.db.categories = this.db.categories.filter((entry) => entry.id !== id);
      this.addAudit(actor, 'category.deleted', 'category', id, `წაიშალა კატეგორია — ${category.name}`);
    });
  }

  async setProductsStatus(ids: string[], status: ProductStatus): Promise<void> {
    const actor = this.requireStaff('products');
    await this.mutate(() => {
      const set = new Set(ids);
      for (const product of this.db.products) {
        if (!set.has(product.id)) continue;
        product.status = status;
        product.updatedAt = this.now().toISOString();
      }
      this.addAudit(actor, 'product.status_changed', 'product', ids.join(','), `სტატუსი შეიცვალა — ${status}`, {
        status,
        count: ids.length,
      });
    });
  }

  async adjustStock(productId: string, variantId: string, newStock: number, reason: string): Promise<void> {
    const actor = this.requireStaff('inventory');
    if (!canManageInventory(actor.role, actor.permissions)) {
      throw new CommerceError('forbidden', 'მარაგის მართვის უფლება არ გაქვთ.');
    }
    if (!Number.isInteger(newStock) || newStock < 0) {
      throw new CommerceError('validation', 'მარაგი უნდა იყოს დადებითი მთელი რიცხვი.');
    }
    if (!reason.trim()) throw new CommerceError('validation', 'მიუთითეთ ცვლილების მიზეზი.');
    await this.mutate(() => {
      const product = this.db.products.find((entry) => entry.id === productId);
      const variant = product?.variants.find((entry) => entry.id === variantId);
      if (!product || !variant) throw new CommerceError('not_found', 'პროდუქტის ვარიანტი ვერ მოიძებნა.');
      const before = variant.stock;
      variant.stock = newStock;
      product.stock = product.variants.reduce((total, entry) => total + entry.stock, 0);
      product.updatedAt = this.now().toISOString();
      if (newStock <= product.lowStockThreshold && newStock < before) {
        this.notifyStaff(
          `დაბალი მარაგი — ${product.name}`,
          `${variant.sku}: დარჩენილია ${newStock} ერთეული.`,
          '/admin/inventory',
          'stock',
        );
      }
      this.addAudit(
        actor,
        'inventory.adjusted',
        'product',
        product.id,
        `${product.name} / ${variant.sku} — მარაგი ${before} → ${newStock}`,
        { before, after: newStock, reason: reason.trim() },
      );
    });
  }

  async uploadImage(file: File): Promise<string> {
    this.requireStaff('products');
    return fileToCompressedDataUrl(file, 1200, 0.78);
  }

  async savePromotion(draft: PromotionDraft): Promise<Promotion> {
    const actor = this.requireStaff('promotions');
    if (!canManagePromotions(actor.role, actor.permissions)) {
      throw new CommerceError('forbidden', 'პრომოკოდების მართვის უფლება არ გაქვთ.');
    }
    const parsed = this.parseSchema(promotionSchema, draft);
    const code = parsed.code.trim().toUpperCase();
    const duplicate = this.db.promotions.find(
      (promotion) => promotion.code.toUpperCase() === code && promotion.id !== draft.id,
    );
    if (duplicate) throw new CommerceError('duplicate_code', 'ეს პრომოკოდი უკვე არსებობს.', 'code');
    let saved!: Promotion;
    await this.mutate(() => {
      const now = this.now().toISOString();
      const existing = draft.id ? this.db.promotions.find((promotion) => promotion.id === draft.id) : undefined;
      if (existing) {
        Object.assign(existing, {
          ...parsed,
          code,
          usageCount: existing.usageCount,
          updatedAt: now,
        });
        saved = existing;
      } else {
        saved = {
          id: makeId('promo'),
          ...parsed,
          code,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        this.db.promotions.unshift(saved);
      }
      this.addAudit(
        actor,
        existing ? 'promotion.updated' : 'promotion.created',
        'promotion',
        saved.id,
        `${existing ? 'განახლდა' : 'შეიქმნა'} პრომოკოდი ${saved.code}`,
        { value: saved.value, type: saved.type },
      );
    });
    return structuredClone(saved);
  }

  async deletePromotion(id: string): Promise<void> {
    const actor = this.requireStaff('promotions');
    await this.mutate(() => {
      const promotion = this.db.promotions.find((entry) => entry.id === id);
      if (!promotion) return;
      this.db.promotions = this.db.promotions.filter((entry) => entry.id !== id);
      this.addAudit(actor, 'promotion.deleted', 'promotion', id, `წაიშალა პრომოკოდი ${promotion.code}`);
    });
  }

  async createEmployee(draft: EmployeeDraft & { password: string }): Promise<User> {
    const actor = this.requireAdmin();
    if (!canManageStaff(actor.role)) throw new CommerceError('forbidden', 'წვდომა აკრძალულია.');
    const parsed = this.parseSchema(employeeSchema, draft);
    if (!parsed.password) throw new CommerceError('validation', 'შეიყვანეთ დროებითი პაროლი.', 'password');
    const normalized = normalizeEmail(parsed.email);
    if (this.db.users.some((entry) => entry.email.toLowerCase() === normalized)) {
      throw new CommerceError('email_exists', 'ამ ელფოსტით მომხმარებელი უკვე არსებობს.', 'email');
    }
    const salt = randomSalt(normalized);
    const hash = await hashPassword(parsed.password, salt);
    const now = this.now().toISOString();
    const user: User = {
      id: makeId('user'),
      email: normalized,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
      role: parsed.role,
      status: parsed.status,
      permissions: parsed.role === 'admin' ? ['orders', 'products', 'inventory', 'reviews', 'promotions', 'customers'] : parsed.permissions,
      addresses: [],
      favoriteProductIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.mutate(() => {
      this.db.users.push(user);
      this.db.credentials[user.id] = { salt, hash, iterations: 120_000 };
      this.addAudit(
        actor,
        'user.created',
        'user',
        user.id,
        `შეიქმნა თანამშრომელი — ${user.firstName} ${user.lastName} (${user.role})`,
        { role: user.role, permissions: user.permissions },
      );
    });
    return structuredClone(user);
  }

  async updateEmployee(id: string, draft: EmployeeDraft & { password?: string }): Promise<User> {
    const actor = this.requireAdmin();
    const parsed = this.parseSchema(employeeSchema, draft);
    const target = this.db.users.find((user) => user.id === id);
    if (!target) throw new CommerceError('not_found', 'თანამშრომელი ვერ მოიძებნა.');
    if (target.id === actor.id && (parsed.role !== target.role || parsed.status !== target.status)) {
      throw new CommerceError('forbidden', 'საკუთარი როლის ან სტატუსის შეცვლა დაუშვებელია.');
    }
    const normalized = normalizeEmail(parsed.email);
    if (this.db.users.some((entry) => entry.email.toLowerCase() === normalized && entry.id !== id)) {
      throw new CommerceError('email_exists', 'ეს ელფოსტა უკვე გამოყენებულია.', 'email');
    }
    let updated!: User;
    await this.mutate(async () => {
      Object.assign(target, {
        email: normalized,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone,
        role: parsed.role,
        status: parsed.status,
        permissions:
          parsed.role === 'admin'
            ? ['orders', 'products', 'inventory', 'reviews', 'promotions', 'customers']
            : parsed.permissions,
        updatedAt: this.now().toISOString(),
      });
      if (parsed.password) {
        const salt = randomSalt(target.id);
        const hash = await hashPassword(parsed.password, salt);
        this.db.credentials[target.id] = { salt, hash, iterations: 120_000 };
      }
      updated = target;
      this.addAudit(
        actor,
        'user.updated',
        'user',
        target.id,
        `განახლდა თანამშრომელი — ${target.firstName} ${target.lastName}`,
        { role: target.role, status: target.status },
      );
    });
    return structuredClone(updated);
  }

  async setUserStatus(userId: string, status: User['status']): Promise<void> {
    const actor = this.requireAdmin();
    if (userId === actor.id) throw new CommerceError('forbidden', 'საკუთარი სტატუსის შეცვლა დაუშვებელია.');
    await this.mutate(() => {
      const user = this.db.users.find((entry) => entry.id === userId);
      if (!user) throw new CommerceError('not_found', 'მომხმარებელი ვერ მოიძებნა.');
      if (user.role === 'admin') throw new CommerceError('forbidden', 'ადმინისტრატორის სტატუსი დაცულია.');
      user.status = status;
      user.updatedAt = this.now().toISOString();
      if (status === 'suspended') {
        for (const [token, session] of Object.entries(this.db.sessions)) {
          if (session.userId === user.id) delete this.db.sessions[token];
        }
      }
      this.addAudit(actor, 'user.status_updated', 'user', user.id, `მომხმარებლის სტატუსი — ${status}`, {
        status,
      });
      this.notifyCustomer(
        user.id,
        status === 'suspended' ? 'ანგარიში შეჩერებულია' : 'ანგარიში აღდგენილია',
        status === 'suspended'
          ? 'თქვენი ანგარიში დროებით შეჩერდა. დაუკავშირდით მხარდაჭერას.'
          : 'თქვენი ანგარიში კვლავ აქტიურია.',
        '/account',
        'account',
      );
    });
  }

  async saveSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
    const actor = this.requireAdmin();
    const merged = { ...this.db.settings, ...settings, updatedAt: this.now().toISOString() };
    const parsed = this.parseSchema(settingsSchema, merged);
    let saved!: StoreSettings;
    await this.mutate(() => {
      this.db.settings = {
        ...merged,
        ...parsed,
        currency: 'GEL',
        updatedAt: this.now().toISOString(),
      } as StoreSettings;
      saved = this.db.settings;
      this.addAudit(actor, 'settings.updated', 'settings', 'global', 'მაღაზიის პარამეტრები განახლდა');
    });
    return structuredClone(saved);
  }

  async resetDemo(): Promise<void> {
    this.requireAdmin();
    await this.enqueue(async () => {
      const fresh = this.seedDatabase();
      this.db = fresh;
      this.token = null;
      this.storage.removeItem(TOKEN_KEY);
      this.persist();
      this.emit();
    });
  }
}
