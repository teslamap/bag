import { useSyncExternalStore } from 'react';
import { backend } from '@/backend';
import type { DataSnapshot, User } from '@/lib/types';

export function useBackendSnapshot(): DataSnapshot {
  return useSyncExternalStore(
    (listener) => backend.subscribe(listener),
    () => backend.getSnapshot(),
    () => backend.getSnapshot(),
  );
}

export function useCurrentUser(): User | null {
  const snapshot = useBackendSnapshot();
  if (!snapshot.session) return null;
  return snapshot.users.find((user) => user.id === snapshot.session?.id) ?? null;
}

export function useProducts() {
  return useBackendSnapshot().products;
}

export function useCategories() {
  return useBackendSnapshot().categories;
}
