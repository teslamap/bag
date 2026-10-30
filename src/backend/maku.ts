import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendPasswordResetEmail, confirmPasswordReset, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, inMemoryPersistence, setPersistence, type User as AuthUser } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, where, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, arrayUnion, type Query, type Unsubscribe } from 'firebase/firestore';
import type { CommerceBackend, ProfileInput, ReviewInput } from './types';
import type { Address, AuditLog, Category, CategoryDraft, DataSnapshot, EmployeeDraft, Order, OrderDraft, OrderStatus, Product, ProductDraft, ProductStatus, PromotionDraft, Review, ReviewStatus, SessionUser, StoreSettings, User, RegisterInput } from '@/lib/types';
import { createSeed } from '@/lib/seed';
import { CommerceError } from '@/lib/errors';
import { checkoutSchema, productSchema, profileSchema, registerSchema, reviewSchema, promotionSchema, passwordSchema, addressSchema } from '@/lib/validation';
import { computeOrderTotals, evaluatePromotion, roundMoney } from '@/domain/pricing';
import { ORDER_TRANSITIONS, ORDER_STATUS_LABELS } from '@/lib/constants';
import { fileToCompressedDataUrl, makeId } from '@/lib/utils';
import { OWNER_UID, fromUser, fromProduct, fromOrder, fromPromo, productWrite, orderWrite, promoWrite, categoryId, iso, LEGACY_STATUS } from './legacy-schema';

// Public web configuration from the existing MAKU application; no server credentials.
export const MAKU_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDuZpWaZFY18eyJNOMjFap2XVTr6D0cMyE',
  authDomain: 'makasia.firebaseapp.com', projectId: 'makasia', storageBucket: 'makasia.firebasestorage.app',
  messagingSenderId: '51102698357', appId: '1:51102698357:web:59f62a3c8e76663947a13c',
};
type Raw = Record<string, any>;
const LEGACY_DELIVERY = { freeShippingThreshold: 100, standardShippingFee: 5, expressShippingFee: 5, codEnabled: true };
const clean = (value: unknown): any => JSON.parse(JSON.stringify(value));
const session = (user: User): SessionUser => ({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, status: user.status, permissions: user.permissions });

/** Uses MAKU's existing collections and rules. Never migrates, seeds or clears shared data. */
export class MakuBackend implements CommerceBackend {
  readonly mode = 'firebase' as const;
  private app = getApps().length ? getApp() : initializeApp(MAKU_CONFIG);
  private auth = getAuth(this.app);
  private db = getFirestore(this.app);
  private listeners = new Set<() => void>();
  private unsubscribers: Unsubscribe[] = [];
  private started = false;
  private authGeneration = 0;
  private profile: User | null = null;
  private rawProducts = new Map<string, Raw>();
  private savedCategories: Category[] = [];
  private readNotifications: string[] = [];
  private notes = new Map<string, Order['internalNotes']>();
  private defaultSettings(): StoreSettings { return { ...createSeed().settings, ...LEGACY_DELIVERY }; }
  private state: DataSnapshot = {
    ...createSeed(), settings: this.defaultSettings(), session: null, loading: true, authReady: false, backendMode: 'firebase',
  };
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private emit(patch: Partial<DataSnapshot> = {}) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  async init() {
    if (this.started) return;
    this.started = true;
    onAuthStateChanged(this.auth, (user) => { void this.authChanged(user).catch((error) => this.failure(error)); }, (error) => this.failure(error));
  }
  private failure(error: unknown) {
    const code = String((error as { code?: string })?.code ?? '');
    const message = code.includes('permission-denied') ? 'ბექენდის წვდომა უარყოფილია. შეამოწმეთ ანგარიშის უფლებები.' : code.includes('unavailable') ? 'ბექენდი დროებით მიუწვდომელია.' : error instanceof Error ? error.message : 'ბექენდთან დაკავშირება ვერ მოხერხდა.';
    this.emit({ error: message, loading: false, authReady: true });
  }
  private watch(source: Query, accept: (rows: Array<{id: string; data: Raw}>) => void) {
    this.unsubscribers.push(onSnapshot(source, (snapshot) => { accept(snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() }))); this.emit(); }, (error) => this.failure(error)));
  }
  private async authChanged(authUser: AuthUser | null) {
    const generation = ++this.authGeneration;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe()); this.unsubscribers = [];
    this.profile = null; this.savedCategories = []; this.readNotifications = []; this.notes.clear(); this.rawProducts.clear();
    this.emit({ ...createSeed(), settings: this.defaultSettings(), session: null, loading: true, authReady: false, error: undefined });
    if (authUser && !authUser.isAnonymous) {
      const stored = await getDoc(doc(this.db, 'users', authUser.uid));
      if (generation !== this.authGeneration) return;
      this.profile = fromUser(authUser.uid, stored.data() ?? { name: authUser.displayName }, authUser.email ?? '');
      if (this.profile.status === 'suspended') { await signOut(this.auth); return; }
      this.state.users = [this.profile]; this.state.session = session(this.profile);
    }
    if (generation !== this.authGeneration) return;
    this.watch(collection(this.db, 'products'), (rows) => {
      this.rawProducts = new Map(rows.map((row) => [row.id, row.data]));
      this.state.products = rows.map((row) => fromProduct(row.id, row.data)); this.refreshCategories();
    });
    this.watch(collection(this.db, 'promos'), (rows) => { this.state.promotions = rows.map((row) => fromPromo(row.id, row.data)); });
    const staff = this.profile?.role === 'admin' || this.profile?.role === 'manager';
    this.watch(collection(this.db, 'reviews'), (rows) => {
      this.state.reviews = rows.filter((row) => this.profile?.role === 'admin' || row.data.status === 'approved' || row.data.userId === this.profile?.id).map(({id, data}) => ({
        id, productId: data.productId ?? '', productName: this.rawProducts.get(data.productId)?.name ?? '', userId: data.userId ?? '',
        author: data.name ?? data.author ?? '', rating: Number(data.rating ?? 0), title: data.bagV2?.title ?? '', body: data.comment ?? data.body ?? '',
        status: ['approved', 'rejected'].includes(data.status) ? data.status : 'pending', verifiedPurchase: false, createdAt: iso(data.createdAt),
      }));
    });
    if (this.profile) {
      const id = this.profile.id;
      this.unsubscribers.push(onSnapshot(doc(this.db, 'users', id), (snapshot) => {
        this.profile = fromUser(id, snapshot.data() ?? {}, this.auth.currentUser?.email ?? '');
        this.readNotifications = snapshot.data()?.bagReadNotifications ?? [];
        if (this.profile.status === 'suspended') { void signOut(this.auth); return; }
        this.state.users = this.state.users.filter((user) => user.id !== id).concat(this.profile);
        this.refreshNotifications(); this.emit({ session: session(this.profile) });
      }, (error) => this.failure(error)));
      this.watch(staff ? collection(this.db, 'orders') : query(collection(this.db, 'orders'), where('userId', '==', id)), (rows) => {
        this.state.orders = rows.map((row) => fromOrder(row.id, row.data)).map((order) => ({ ...order, internalNotes: this.notes.get(order.id) ?? [] })).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        this.refreshNotifications();
      });
    }
    if (this.profile?.role === 'admin') {
      this.watch(collection(this.db, 'users'), (rows) => { this.state.users = rows.map((row) => fromUser(row.id, row.data)); });
      this.watch(collection(this.db, 'categories'), (rows) => { this.savedCategories = rows.map((row) => ({ ...row.data, id: row.id }) as Category); this.refreshCategories(); });
      this.watch(collection(this.db, 'admin_audit'), (rows) => { this.state.auditLogs = rows.map(({ id, data }) => ({
        id, actorId: data.actorUid ?? '', actorName: data.actor ?? '', action: data.action ?? '', entity: data.entity ?? 'settings', entityId: data.recordId ?? '', summary: data.details ?? '', createdAt: iso(data.createdAt),
      } as AuditLog)).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); });
      this.watch(collection(this.db, 'bag_order_notes'), (rows) => {
        this.notes.clear();
        for (const {data} of rows) this.notes.set(data.orderId, [...(this.notes.get(data.orderId) ?? []), data.note]);
        this.state.orders = this.state.orders.map((order) => ({ ...order, internalNotes: this.notes.get(order.id) ?? [] }));
      });
      this.unsubscribers.push(onSnapshot(doc(this.db, 'app_settings', 'general'), (snapshot) => {
        this.emit({ settings: { ...this.defaultSettings(), ...snapshot.data(), ...snapshot.data()?.bagV2, ...LEGACY_DELIVERY } });
      }, (error) => this.failure(error)));
    }
    this.emit({ loading: false, authReady: true });
  }
  private refreshCategories() {
    const categories = new Map(this.savedCategories.map((category) => [category.id, category]));
    for (const raw of this.rawProducts.values()) {
      const name = String(raw.category || 'სხვა');
      const category = raw.bagV2?.category;
      const id = category?.name === name ? category.id : categoryId(name);
      if (!categories.has(id)) categories.set(id, category?.name === name ? category : { id, name, nameEn: name, slug: id, description: '', image: raw.image ?? '', order: 0, active: true });
      const sub = raw.bagV2?.subcategory;
      if (sub?.id && !categories.has(sub.id)) categories.set(sub.id, sub);
    }
    this.state.categories = [...categories.values()].sort((a,b) => a.order - b.order);
  }
  private refreshNotifications() {
    const uid = this.profile?.id;
    this.state.notifications = this.state.orders.slice(0, 100).map((order) => ({
      id: `${order.id}:${order.status}`, audience: 'customer', userId: order.userId, type: 'order',
      title: `${order.number} — ${ORDER_STATUS_LABELS[order.status]}`, message: 'შეკვეთის მიმდინარე მდგომარეობა',
      link: this.profile?.role === 'admin' ? `/admin/orders/${order.id}` : this.profile?.role === 'manager' ? `/manager/orders/${order.id}` : `/account/orders/${order.id}`,
      createdAt: order.updatedAt, readBy: uid && this.readNotifications.includes(`${order.id}:${order.status}`) ? [uid] : [],
    }));
  }
  private user(): User { if (!this.profile) throw new CommerceError('unauthenticated', 'გაიარეთ ავტორიზაცია.'); return this.profile; }
  private admin(): User { const user = this.user(); if (user.id !== OWNER_UID) throw new CommerceError('permission-denied', 'მოქმედება მხოლოდ არსებული MAKU-ს მთავარ ადმინისტრატორს შეუძლია.'); return user; }
  private staff(): User { const user = this.user(); if (!['admin', 'manager'].includes(user.role)) throw new CommerceError('permission-denied', 'ამ მოქმედების უფლება არ გაქვთ.'); return user; }
  private async audit(action: string, collectionName: string, id: string, details = '') {
    if (this.profile?.id !== OWNER_UID) return;
    await setDoc(doc(collection(this.db, 'admin_audit')), { action, collection: collectionName, recordId: id, details, actor: this.profile.email, actorUid: this.profile.id, createdAt: serverTimestamp() }).catch((error) => console.warn('MAKU audit:', error.code));
  }
  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    const stored = await getDoc(doc(this.db, 'users', result.user.uid));
    const user = fromUser(result.user.uid, stored.data() ?? {}, result.user.email ?? '');
    if (user.status === 'suspended') { await signOut(this.auth); throw new CommerceError('suspended', 'ანგარიში შეჩერებულია.'); }
    await this.authChanged(result.user);
    return session(user);
  }
  async register(input: RegisterInput) {
    const parsed = registerSchema.omit({ acceptTerms: true }).parse(input);
    const { user } = await createUserWithEmailAndPassword(this.auth, parsed.email, parsed.password);
    await updateProfile(user, { displayName: `${parsed.firstName} ${parsed.lastName}` });
    // Existing rules prohibit role/isAdmin/permissions on customer-created profiles.
    await setDoc(doc(this.db, 'users', user.uid), { uid: user.uid, name: `${parsed.firstName} ${parsed.lastName}`, email: parsed.email, firstName: parsed.firstName, lastName: parsed.lastName, phone: parsed.phone, addresses: [], favoriteProductIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    await this.authChanged(user);
    return session(fromUser(user.uid, parsed, parsed.email));
  }
  async logout() { await signOut(this.auth); await this.authChanged(null); }
  async requestPasswordReset(email: string) { await sendPasswordResetEmail(this.auth, email.trim()); return { delivered: true }; }
  async resetPassword(_email: string, code: string, password: string) { await confirmPasswordReset(this.auth, code.trim(), passwordSchema.parse(password)); }
  async changePassword(current: string, next: string) {
    const user = this.auth.currentUser;
    if (!user?.email) throw new CommerceError('unauthenticated', 'გაიარეთ ავტორიზაცია.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
    await updatePassword(user, passwordSchema.parse(next));
  }
  async updateProfile(input: ProfileInput) {
    const current = this.user(), parsed = profileSchema.parse(input);
    await setDoc(doc(this.db, 'users', current.id), { ...parsed, name: `${parsed.firstName} ${parsed.lastName}`, updatedAt: serverTimestamp() }, { merge: true });
    return { ...current, ...parsed };
  }
  private async addresses(mutate: (addresses: Address[]) => Address[]) {
    const uid = this.user().id;
    return runTransaction(this.db, async (transaction) => {
      const ref = doc(this.db, 'users', uid), stored = await transaction.get(ref);
      const next = mutate(stored.data()?.addresses ?? []);
      transaction.set(ref, { addresses: clean(next), updatedAt: serverTimestamp() }, { merge: true }); return next;
    });
  }
  async saveAddress(address: Address) {
    const parsed = addressSchema.parse(address); const next = { ...parsed, id: parsed.id || makeId('address') };
    return this.addresses((all) => { const others = all.filter((entry) => entry.id !== next.id); const result = [...others, next]; return result.map((entry, index) => ({ ...entry, isDefault: next.isDefault ? entry.id === next.id : result.some((item) => item.isDefault) ? entry.isDefault : index === 0 })); });
  }
  async deleteAddress(id: string) { await this.addresses((all) => { const next = all.filter((entry) => entry.id !== id); return next.map((entry,index) => ({ ...entry, isDefault: next.some((item) => item.isDefault) ? entry.isDefault : index === 0 })); }); }
  async setDefaultAddress(id: string) { await this.addresses((all) => all.map((entry) => ({ ...entry, isDefault: entry.id === id }))); }
  async toggleFavorite(productId: string) {
    const uid = this.user().id;
    return runTransaction(this.db, async (transaction) => {
      const ref = doc(this.db, 'users', uid), stored = await transaction.get(ref), favorites: string[] = stored.data()?.favoriteProductIds ?? [];
      const add = !favorites.includes(productId); transaction.set(ref, { favoriteProductIds: add ? [...favorites, productId] : favorites.filter((id) => id !== productId) }, { merge: true }); return add;
    });
  }
  async validatePromo(code: string, subtotal: number) {
    const promo = this.state.promotions.find((entry) => entry.code === code.trim().toUpperCase());
    const used = this.state.orders.filter((order) => order.userId === this.profile?.id && order.promoCode === promo?.code && order.status !== 'cancelled').length;
    return evaluatePromotion(promo, subtotal, { userRedemptions: used });
  }
  async createOrder(draft: OrderDraft): Promise<Order> {
    const user = this.user(); checkoutSchema.parse({ ...draft, acceptTerms: true });
    if (!draft.idempotencyKey || !this.state.settings.codEnabled) throw new CommerceError('checkout', 'შეკვეთის გაგზავნა მიუწვდომელია.');
    const merged = new Map<string, OrderDraft['items'][number]>();
    for (const line of draft.items) { const key = `${line.productId}:${line.variantId}`, previous = merged.get(key); merged.set(key, { ...line, quantity: (previous?.quantity ?? 0) + line.quantity }); }
    draft = { ...draft, items: [...merged.values()] };
    if (draft.items.some((line) => line.quantity > 20)) throw new CommerceError('quantity', 'ერთი ვარიანტის მაქსიმალური რაოდენობაა 20.');
    // Deterministic ID works with the old owner-read rule and survives uncertain responses.
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${user.id}:${draft.idempotencyKey}`));
    const id = `bag_${[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2,'0')).join('')}`;
    const ref = doc(this.db, 'orders', id);
    // Query by owner: the old rules reject direct reads of a nonexistent order document.
    const prior = await getDocs(query(collection(this.db, 'orders'), where('userId', '==', user.id)));
    const existing = prior.docs.find((entry) => entry.id === id);
    if (existing) return fromOrder(existing.id, existing.data());
    const lines = await Promise.all(draft.items.map(async (line) => {
      const stored = await getDoc(doc(this.db, 'products', line.productId));
      if (!stored.exists()) throw new CommerceError('unavailable', 'პროდუქტი აღარ არის ხელმისაწვდომი.');
      const product = fromProduct(stored.id, stored.data()), variant = product.variants.find((entry) => entry.id === line.variantId);
      if (product.status !== 'active' || !variant || variant.stock < line.quantity) throw new CommerceError('stock', 'პროდუქტის მარაგი არასაკმარისია.');
      const unitPrice = roundMoney(product.price + variant.priceDelta);
      if (unitPrice <= 0) throw new CommerceError('price', 'პროდუქტის ფასი არასწორია.');
      return { productId: product.id, productName: product.name, productSlug: product.slug, variantId: variant.id, variantLabel: Object.values(variant.options).join(' / '), sku: variant.sku, image: product.images[0]?.source ?? '', unitPrice, quantity: line.quantity, lineTotal: roundMoney(unitPrice * line.quantity) };
    }));
    const promotion = this.state.promotions.find((promo) => promo.code === draft.promoCode?.toUpperCase());
    const totals = computeOrderTotals({ lines, settings: this.state.settings, deliveryMethod: draft.deliveryMethod, promotion });
    if (draft.promoCode && !(await this.validatePromo(draft.promoCode, totals.subtotal)).valid) throw new CommerceError('promo', 'პრომოკოდი აღარ მოქმედებს.');
    const now = new Date().toISOString();
    const order: Order = { id, number: `BAG-${id.slice(4,16).toUpperCase()}`, userId: user.id, customer: draft.contact, items: lines, subtotal: totals.subtotal, discountTotal: totals.discountTotal, shippingFee: totals.shippingFee, total: totals.total, promoCode: draft.promoCode, promoId: promotion?.id, status: 'new', paymentMethod: 'cod', paymentStatus: 'unpaid', deliveryMethod: draft.deliveryMethod, address: draft.address, notes: draft.notes, internalNotes: [], timeline: [{ status: 'new', at: now, by: 'MAKU' }], idempotencyKey: draft.idempotencyKey, createdAt: now, updatedAt: now };
    // Compatibility mode deliberately keeps the old checkout contract. Stock is managed by staff;
    // customer rules cannot atomically decrement products. No fake server-side guarantee is made.
    try {
      await setDoc(ref, { ...clean(orderWrite(order, draft)), createdAt: serverTimestamp() });
    } catch (error) {
      // A concurrent retry may lose the create race under the old create-only customer rule.
      const recovered = await getDocs(query(collection(this.db, 'orders'), where('userId', '==', user.id))).catch(() => null);
      const committed = recovered?.docs.find((entry) => entry.id === id);
      if (committed) return fromOrder(committed.id, committed.data());
      throw error;
    }
    this.emit({ orders: [order, ...this.state.orders.filter((entry) => entry.id !== id)] }); return order;
  }
  async updateOrderStatus(id: string, status: OrderStatus, note?: string) {
    const actor = this.staff(), order = this.state.orders.find((entry) => entry.id === id);
    if (!order) throw new CommerceError('not-found', 'შეკვეთა ვერ მოიძებნა.');
    if (status !== order.status && !ORDER_TRANSITIONS[order.status].includes(status)) throw new CommerceError('status', 'სტატუსის ცვლილება დაუშვებელია.');
    if (note?.trim() && actor.id !== OWNER_UID) throw new CommerceError('permission-denied', 'არსებული წესებით მენეჯერს მხოლოდ სტატუსის შეცვლა შეუძლია.');
    // Only status: the old manager rule disallows updatedAt and timeline.
    await updateDoc(doc(this.db, 'orders', id), { status: LEGACY_STATUS[status] });
    if (note?.trim()) await this.addOrderNote(id, note);
    await this.audit('status_change', 'orders', id, LEGACY_STATUS[status]); return { ...order, status };
  }
  async addOrderNote(id: string, text: string) {
    const actor = this.admin();
    if (!text.trim()) return;
    const note = { id: makeId('note'), text: text.trim().slice(0,1000), authorId: actor.id, authorName: `${actor.firstName} ${actor.lastName}`, createdAt: new Date().toISOString() };
    await setDoc(doc(this.db, 'bag_order_notes', note.id), { orderId: id, note });
  }
  async createReview(input: ReviewInput): Promise<Review> {
    const user = this.user(), parsed = reviewSchema.parse(input), id = `${user.id}_${input.productId}`;
    const data = { productId: input.productId, userId: user.id, name: `${user.firstName} ${user.lastName}`, rating: parsed.rating, comment: parsed.body, status: 'pending' as const, createdAt: new Date().toISOString(), bagV2: { title: parsed.title } };
    await setDoc(doc(this.db, 'reviews', id), data);
    return { id, productId: input.productId, productName: this.rawProducts.get(input.productId)?.name ?? '', userId: user.id, author: data.name, rating: parsed.rating, title: parsed.title, body: parsed.body, status: 'pending', verifiedPurchase: false, createdAt: data.createdAt };
  }
  async moderateReview(id: string, status: Extract<ReviewStatus,'approved'|'rejected'>) { this.admin(); await updateDoc(doc(this.db, 'reviews', id), { status }); }
  async markNotificationRead(id: string) { await setDoc(doc(this.db, 'users', this.user().id), { bagReadNotifications: arrayUnion(id) }, { merge: true }); }
  async markAllNotificationsRead() { await setDoc(doc(this.db, 'users', this.user().id), { bagReadNotifications: this.state.notifications.map((notification) => notification.id) }, { merge: true }); }
  async saveProduct(draft: ProductDraft) {
    this.staff(); productSchema.parse(draft);
    if (!draft.variants.length || draft.variants.some((variant) => !Number.isInteger(variant.stock) || variant.stock < 0)) throw new CommerceError('validation', 'მარაგი უნდა იყოს არაუარყოფითი მთელი რიცხვი.');
    const id = draft.id || makeId('product'), ref = doc(this.db, 'products', id);
    const data = clean({ ...productWrite(draft, this.state.categories), updatedAt: new Date().toISOString() });
    if (JSON.stringify(data).length > 700000) throw new CommerceError('image-size', 'ფოტოების მოცულობა დიდია. გამოიყენეთ ფოტოების URL-ები.');
    await setDoc(ref, { ...data, ...(draft.id ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
    await this.audit('update', 'products', id); return fromProduct(id, data);
  }
  async deleteProducts(ids: string[]) { this.staff(); for (const id of ids) await deleteDoc(doc(this.db, 'products', id)); }
  async setProductsStatus(ids: string[], status: ProductStatus) { this.staff(); for (const id of ids) await updateDoc(doc(this.db, 'products', id), { status: status === 'active' ? 'active' : 'inactive' }); }
  async adjustStock(productId: string, variantId: string, newStock: number, reason: string) {
    this.staff(); if (!Number.isInteger(newStock) || newStock < 0 || !reason.trim()) throw new CommerceError('validation', 'შეამოწმეთ მარაგი და მიზეზი.');
    await runTransaction(this.db, async (transaction) => {
      const ref = doc(this.db, 'products', productId), snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new CommerceError('not-found', 'პროდუქტი ვერ მოიძებნა.');
      const product = fromProduct(snapshot.id, snapshot.data()), variants = product.variants.map((variant) => variant.id === variantId ? { ...variant, stock: newStock } : variant);
      transaction.update(ref, { stock: variants.reduce((sum, variant) => sum + variant.stock, 0), ...(snapshot.data().bagV2 ? { 'bagV2.variants': variants } : {}), updatedAt: serverTimestamp() });
    });
    await this.audit('stock', 'products', productId, reason);
  }
  async uploadImage(file: File) {
    this.staff(); const data = await fileToCompressedDataUrl(file, 900, 0.72);
    if (data.length > 180000) throw new CommerceError('image-size', 'ფოტო ძალიან დიდია. გამოიყენეთ მცირე ფოტო ან URL.'); return data;
  }
  async savePromotion(draft: PromotionDraft) { this.admin(); promotionSchema.parse(draft); const id = draft.id || makeId('promo'); const data = clean(promoWrite(draft)); await setDoc(doc(this.db, 'promos', id), data, { merge: true }); return fromPromo(id, data); }
  async deletePromotion(id: string) { this.admin(); await deleteDoc(doc(this.db, 'promos', id)); }
  async saveCategory(draft: CategoryDraft) { this.admin(); const id = draft.id || makeId('category'); const category: Category = { ...draft, id }; await setDoc(doc(this.db, 'categories', id), clean(category), { merge: true }); return category; }
  async deleteCategory(id: string) { this.admin(); if (this.state.products.some((product) => product.categoryId === id || product.subcategoryId === id)) throw new CommerceError('in-use', 'კატეგორიას პროდუქტები აქვს.'); await deleteDoc(doc(this.db, 'categories', id)); }
  async createEmployee(draft: EmployeeDraft & { password: string }) {
    this.admin(); if (draft.status === 'suspended') throw new CommerceError('backend-required', 'შეჩერებული ანგარიში შექმენით Firebase Authentication-ში.');
    if (draft.role !== 'manager') throw new CommerceError('role', 'არსებული MAKU მხოლოდ ერთ მთავარ ადმინისტრატორს იყენებს. ახალი თანამშრომლის როლი უნდა იყოს მენეჯერი.');
    const secondary = initializeApp(MAKU_CONFIG, makeId('staff-provision'));
    let created: AuthUser | undefined;
    try {
      await setPersistence(getAuth(secondary), inMemoryPersistence);
      const result = await createUserWithEmailAndPassword(getAuth(secondary), draft.email, passwordSchema.parse(draft.password));
      created = result.user;
      const data = { name: `${draft.firstName} ${draft.lastName}`, firstName: draft.firstName, lastName: draft.lastName, email: draft.email, phone: draft.phone, role: 'manager', permissions: draft.permissions, status: draft.status, createdAt: new Date().toISOString() };
      await setDoc(doc(this.db, 'users', result.user.uid), data); return fromUser(result.user.uid, data);
    } catch (error) {
      if (created) await deleteUser(created).catch(() => undefined);
      throw error;
    } finally { await signOut(getAuth(secondary)).catch(() => undefined); await deleteApp(secondary); }
  }
  async updateEmployee(id: string, draft: EmployeeDraft & { password?: string }) {
    this.admin();
    if (draft.status === 'suspended') throw new CommerceError('backend-required', 'ანგარიშის შეჩერება შეასრულეთ Firebase Authentication-ში.');
    if (draft.password) throw new CommerceError('password-reset', 'სხვა მომხმარებლის პაროლი იცვლება Firebase-ის აღდგენის ბმულით.');
    if (draft.role === 'admin' && id !== OWNER_UID) throw new CommerceError('role', 'არსებულ MAKU-ს ერთი მთავარი ადმინისტრატორი ჰყავს.');
    const stored = await getDoc(doc(this.db, 'users', id));
    if (stored.data()?.email && draft.email.trim().toLowerCase() !== String(stored.data()?.email).toLowerCase()) throw new CommerceError('email', 'შესვლის ელფოსტა შეცვალეთ Firebase Authentication-ში.');
    const data = clean({ ...draft, name: `${draft.firstName} ${draft.lastName}` }); delete data.id; delete data.password;
    await setDoc(doc(this.db, 'users', id), data, { merge: true }); return fromUser(id, data);
  }
  async setUserStatus(id: string, status: User['status']) {
    this.admin(); if (id === OWNER_UID) throw new CommerceError('owner', 'მთავარი ადმინისტრატორის შეჩერება დაუშვებელია.');
    // Deactivation must be enforced by the shared rules/Auth, not a self-editable profile field.
    if (status === 'suspended') throw new CommerceError('backend-required', 'ანგარიშის უსაფრთხოდ შესაჩერებლად საჭიროა Firebase Authentication-ში მომხმარებლის დაბლოკვა.');
    await updateDoc(doc(this.db, 'users', id), { status });
  }
  async saveSettings(settings: Partial<StoreSettings>) {
    this.admin();
    for (const key of Object.keys(LEGACY_DELIVERY) as Array<keyof typeof LEGACY_DELIVERY>) {
      if (settings[key] !== undefined && settings[key] !== LEGACY_DELIVERY[key]) throw new CommerceError('shared-policy', 'მიწოდებისა და გადახდის პირობები ორივე საიტისთვის ერთად უნდა განახლდეს.');
    }
    const next = { ...this.state.settings, ...settings, ...LEGACY_DELIVERY, updatedAt: new Date().toISOString() };
    await setDoc(doc(this.db, 'app_settings', 'general'), { storeName: next.storeName, currency: 'GEL', supportEmail: next.supportEmail, lowStockThreshold: next.lowStockThreshold, bagV2: clean(next) }, { merge: true });
    this.emit({ settings: next }); return next;
  }
  async resetDemo(): Promise<void> { throw new CommerceError('production', 'საერთო MAKU-ს ბაზის გასუფთავება ამ ინტერფეისიდან გამორთულია.'); }
}
