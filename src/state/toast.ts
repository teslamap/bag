import { create } from 'zustand';
import { makeId } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = makeId('toast');
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }));
    }, 4800);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
}));

export function toast(
  title: string,
  options: { message?: string; variant?: ToastVariant } = {},
): string {
  return useToastStore.getState().push({
    title,
    message: options.message,
    variant: options.variant ?? 'success',
  });
}
