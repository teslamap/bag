import type { CommerceBackend } from '@/backend/types';
import { LocalBackend } from '@/backend/local';

// Frontend-only adapter. Connect MAKU's real backend through CommerceBackend later.
export const backend: CommerceBackend = new LocalBackend();
export const backendMode = backend.mode;
