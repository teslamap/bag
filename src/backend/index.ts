import type { CommerceBackend } from '@/backend/types';
import { LocalBackend } from '@/backend/local';
import { MakuBackend } from '@/backend/maku';

// V2 connects to the same makasia Firebase project as the original MAKU.
// Offline local preview is opt-in; connection errors never fall back to fake orders.
export const backend: CommerceBackend = import.meta.env.VITE_BACKEND_MODE === 'demo' ? new LocalBackend() : new MakuBackend();
export const backendMode = backend.mode;
