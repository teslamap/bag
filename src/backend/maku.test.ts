import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDraft } from '@/lib/types';

const fake = vi.hoisted(() => ({
  auth: { currentUser: null as any }, callback: null as any,
  data: {} as Record<string, Record<string, Record<string, any>>>, writes: [] as Array<{ path: string; data: any }>,
}));
vi.mock('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}), deleteApp: vi.fn() }));
vi.mock('firebase/auth', () => ({
  getAuth: () => fake.auth, onAuthStateChanged: (_auth: any, callback: any) => { fake.callback = callback; return vi.fn(); },
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(), confirmPasswordReset: vi.fn(), updatePassword: vi.fn(), reauthenticateWithCredential: vi.fn(), EmailAuthProvider: {},
}));
vi.mock('firebase/firestore', () => {
  const snapshot = (id: string, data: any) => ({ id, exists: () => data !== undefined, data: () => data });
  const rows = (source: any) => Object.entries(fake.data[source.path] ?? {}).filter(([,data]) => !source.owner || data.userId === source.owner).map(([id,data]) => snapshot(id,data));
  return {
    getFirestore: () => ({}), collection: (_db: any, path: string) => ({ path }),
    doc: (_db: any, path?: string, id?: string) => typeof path === 'string' ? ({ path: `${path}/${id}` }) : ({ path: `${_db.path}/generated` }),
    query: (source: any, condition: any) => ({ ...source, owner: condition?.value }), where: (_field: string, _op: string, value: string) => ({ value }),
    getDoc: async (source: any) => { const [collection,id] = source.path.split('/'); return snapshot(id, fake.data[collection]?.[id]); },
    getDocs: async (source: any) => ({ docs: rows(source) }),
    onSnapshot: (source: any, callback: any) => { if (source.path.includes('/')) { const [collection,id] = source.path.split('/'); callback(snapshot(id, fake.data[collection]?.[id])); } else callback({ docs: rows(source) }); return vi.fn(); },
    setDoc: async (ref: any, data: any) => { fake.writes.push({ path: ref.path, data }); const [collection,id] = ref.path.split('/'); (fake.data[collection] ??= {})[id] = data; },
    updateDoc: async (ref: any, data: any) => { fake.writes.push({ path: ref.path, data }); }, deleteDoc: vi.fn(), runTransaction: vi.fn(),
    serverTimestamp: () => ({ seconds: 1700000000 }), arrayUnion: (...values: any[]) => values,
  };
});
import { MakuBackend } from './maku';
import { OWNER_UID } from './legacy-schema';

async function connect(uid?: string, role?: string) {
  fake.auth.currentUser = uid ? { uid, email: 'test@example.com', isAnonymous: false } : null;
  if (uid) fake.data.users[uid] = { name: 'Test User', role, email: 'test@example.com' };
  const backend = new MakuBackend(); await backend.init(); fake.callback(fake.auth.currentUser);
  await vi.waitFor(() => expect(backend.getSnapshot().authReady).toBe(true)); return backend;
}
beforeEach(() => {
  fake.writes = []; fake.callback = null; fake.auth.currentUser = null;
  fake.data = { users: {}, products: { p: { name: 'Shared bag', price: 149.95, stock: 10, category: 'ჩანთები', image: 'https://example.com/bag.webp', status: 'active' } }, orders: {}, promos: {}, reviews: {} };
});
describe('MAKU shared adapter, with existing Firebase SDK contract mocked', () => {
  it('reads the existing catalogue without creating or migrating any data', async () => {
    const backend = await connect();
    expect(backend.getSnapshot().products[0]).toMatchObject({ id: 'p', price: 149.95 });
    expect(backend.getSnapshot().categories[0].id).toBe('bags');
    expect(fake.writes).toEqual([]);
    expect(backend.getSnapshot().settings).toMatchObject({ standardShippingFee: 5, freeShippingThreshold: 100 });
  });
  it('writes only status for a manager, matching the unchanged old rules', async () => {
    fake.data.orders.o = { userId: 'customer', customerName: 'Customer Test', status: 'ახალი', items: [] };
    const backend = await connect('manager', 'manager');
    await backend.updateOrderStatus('o', 'confirmed');
    expect(fake.writes).toEqual([{ path: 'orders/o', data: { status: 'დადასტურებული' } }]);
  });
  it('uses a stable order ID and the old order schema on a retry', async () => {
    const backend = await connect('customer');
    const draft: OrderDraft = { contact: { firstName: 'Test', lastName: 'Customer', email: 'test@example.com', phone: '+995555123456' }, address: { id: 'a', label: 'Home', firstName: 'Test', lastName: 'Customer', phone: '+995555123456', city: 'Tbilisi', street: 'Test street 12' }, items: [{ productId: 'p', variantId: 'default', quantity: 1 }], paymentMethod: 'cod', deliveryMethod: 'standard', idempotencyKey: 'order-retry-key' };
    const order = await backend.createOrder(draft), retried = await backend.createOrder(draft);
    expect(retried.id).toBe(order.id); expect(fake.writes).toHaveLength(1);
    expect(fake.writes[0].data).toMatchObject({ customerName: 'Test Customer', userId: 'customer', totalAmount: 149.95, subtotal: 149.95, status: 'ახალი', createdAt: { seconds: 1700000000 }, items: [{ name: 'Shared bag', price: 149.95 }] });
    expect(fake.writes[0].data.role).toBeUndefined();
    expect(fake.data.products.p.stock).toBe(10);
  });
  it('does not allow the reset demo control to delete shared production data', async () => {
    const backend = await connect(OWNER_UID);
    await expect(backend.resetDemo()).rejects.toThrow('გამორთულია'); expect(fake.writes).toEqual([]);
  });
  it('does not pretend that changing a profile field securely disables an account', async () => {
    const backend = await connect(OWNER_UID);
    await expect(backend.setUserStatus('customer', 'suspended')).rejects.toThrow('Firebase Authentication'); expect(fake.writes).toEqual([]);
  });
  it('prevents V2-only shipping changes that would disagree with original MAKU', async () => {
    const backend = await connect(OWNER_UID);
    await expect(backend.saveSettings({ standardShippingFee: 15 })).rejects.toThrow('ორივე საიტისთვის');
    expect(fake.writes).toEqual([]);
  });
});
