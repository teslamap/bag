import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertTriangle, Check, Inbox, LoaderCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-ink/12 bg-ink/[0.04] text-ink/65',
  accent: 'border-champagne/45 bg-champagne/10 text-earth',
  info: 'border-[#587c8b]/25 bg-[#587c8b]/10 text-[#466b7a]',
  success: 'border-[#3f6b53]/25 bg-[#3f6b53]/10 text-[#315742]',
  warning: 'border-[#b88a43]/30 bg-[#b88a43]/10 text-[#815f26]',
  danger: 'border-[#8f3f3f]/25 bg-[#8f3f3f]/10 text-[#7b3434]',
};

export function Badge({
  children,
  tone = 'neutral',
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em]',
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Spinner({ label = 'იტვირთება…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[11px] uppercase tracking-[0.18em] text-ink/65" role="status">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-3 px-4 py-10' : 'gap-5 px-6 py-20',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/10 bg-ink/[0.025] text-ink/65">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </span>
      <div className="max-w-sm space-y-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h3 className={cn('font-display font-light tracking-display', compact ? 'text-2xl' : 'text-3xl')}>{title}</h3>
        {description && <p className="text-[12px] leading-relaxed text-ink/65">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'რაღაც შეფერხდა',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            ხელახლა ცდა
          </Button>
        ) : undefined
      }
    />
  );
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  hideClose?: boolean;
}

function useOverlay(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 80);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((node) => node.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
  className,
  hideClose,
}: OverlayProps) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="დახურვა"
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: 28, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-lift sm:rounded-2xl',
              modalSizes[size],
              className,
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-6 border-b border-ink/10 px-6 py-5">
                <div>
                  {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                  {title && (
                    <h2 id={titleId} className="font-display text-2xl font-light tracking-display">
                      {title}
                    </h2>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="დახურვა"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink/65 transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <div className="border-t border-ink/10 px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  side = 'right',
  width = 'max-w-xl',
  className,
}: OverlayProps & { side?: 'right' | 'left'; width?: string }) {
  const ref = useOverlay(open, onClose);
  const titleId = useId();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="დახურვა"
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            onClick={onClose}
            tabIndex={-1}
          />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ x: side === 'right' ? '105%' : '-105%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '105%' : '-105%' }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute inset-y-0 flex w-full flex-col overflow-hidden bg-ivory shadow-drawer',
              side === 'right' ? 'right-0' : 'left-0',
              width,
              className,
            )}
          >
            {(title || eyebrow) && (
              <div className="flex items-start justify-between gap-5 border-b border-ink/10 px-5 py-5 sm:px-7">
                <div>
                  {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
                  {title && (
                    <h2 id={titleId} className="font-display text-3xl font-light tracking-display">
                      {title}
                    </h2>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="დახურვა"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink/65 transition-colors hover:border-ink/30 hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-ink/10 bg-ivory px-5 py-4 sm:px-7">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'დადასტურება',
  tone = 'danger',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            გაუქმება
          </Button>
          <Button variant={tone} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink/60">{description}</p>
    </Modal>
  );
}

export function InlineNotice({
  children,
  tone = 'info',
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-[12px] leading-relaxed', toneClasses[tone], className)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <span className="mt-[1px] shrink-0">
        {icon ?? (tone === 'success' ? <Check className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />)}
      </span>
      <div>{children}</div>
    </div>
  );
}
