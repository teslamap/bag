import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import { LocalBackend, createMemoryStorage } from '@/backend/local';

describe('empty BAG frontend', () => {
 it('starts without commercial records or bundled credentials', () => {
  const seed = createSeed();
  for (const key of ['users', 'categories', 'products', 'promotions', 'orders', 'reviews', 'notifications', 'auditLogs'] as const) expect(seed[key]).toEqual([]);
  expect(seed.credentials).toEqual({});
 });
 it('ignores old MAKU local data', async () => {
  const storage = createMemoryStorage();
  storage.setItem('maku.local.db.v1', JSON.stringify({ products: [{ id: 'old-product' }] }));
  const backend = new LocalBackend({ storage });
  await backend.init();
  expect(backend.getSnapshot().products).toEqual([]);
  expect(backend.getSnapshot().session).toBeNull();
 });
});
