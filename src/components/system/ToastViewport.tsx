import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, TriangleAlert } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useToastStore } from '@/state/toast';
import { cn } from '@/lib/utils';

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

const tones = {
  success: 'border-[#3f6b53]/25 bg-[#f6faf7] text-[#315742]',
  error: 'border-[#8f3f3f]/25 bg-[#fbf7f7] text-[#7b3434]',
  warning: 'border-[#b88a43]/30 bg-[#fcf9f2] text-[#815f26]',
  info: 'border-ink/12 bg-warmwhite text-ink/70',
};

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const { pathname } = useLocation();
  const storefront = !pathname.startsWith('/admin') && !pathname.startsWith('/manager');

  return (
    <div
      className={cn('pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end', storefront && 'storefront-theme')}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lift',
                tones[toast.variant],
              )}
              role="status"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-snug">{toast.title}</p>
                {toast.message && <p className="mt-1 text-[11px] leading-relaxed opacity-75">{toast.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="შეტყობინების დახურვა"
                className="mt-0.5 -mr-1 flex h-6 w-6 items-center justify-center rounded-full opacity-45 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
