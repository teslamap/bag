import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { cn, formatMoney, STATUS_TONES } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import type { OrderStatus } from '@/lib/types';

/* ---------------------------------- layout --------------------------------- */

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">{eyebrow}</p>
        )}
        <h1 className="mt-2 truncate text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)] md:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function AdminPanel({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
  bodyClassName,
  noPadding = false,
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <section className={cn('admin-card overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {eyebrow && <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-[13px] font-medium text-[var(--text-primary)]">{title}</h2>}
            {description && <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(noPadding ? '' : 'p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* --------------------------------- controls -------------------------------- */

export function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  leftIcon,
  rightIcon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  const variants = {
    primary: 'bg-[var(--text-primary)] text-[var(--surface)] hover:opacity-85 border border-transparent',
    secondary:
      'border border-[var(--line-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
    ghost: 'border border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
    danger: 'border border-[#a04a4a]/40 bg-[#a04a4a]/12 text-[var(--tone-danger-text)] hover:bg-[#a04a4a]/20',
    success: 'border border-[#4d7a60]/40 bg-[#4d7a60]/12 text-[var(--tone-success-text)] hover:bg-[#4d7a60]/20',
    accent: 'border border-[#b39365]/35 bg-[#b39365]/12 text-[var(--tone-accent-text)] hover:bg-[#b39365]/20',
  };
  const sizes = {
    sm: 'h-8 gap-1.5 rounded-lg px-3 text-[11px]',
    md: 'h-9 gap-2 rounded-lg px-3.5 text-[11px]',
    lg: 'h-11 gap-2.5 rounded-xl px-5 text-[12px]',
    icon: 'h-8 w-8 rounded-lg p-0',
  };
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export function AdminField({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {label}
            {required && <span className="ml-1 text-[var(--tone-accent-text)]">*</span>}
          </label>
          {hint && <span className="text-right text-[9px] text-[var(--text-secondary)]">{hint}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-[10px] leading-relaxed text-[var(--tone-danger-text)]">{error}</p>}
    </div>
  );
}

export function AdminInput({
  label,
  hint,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <AdminField label={label} hint={hint} error={error}>
      <input {...props} aria-label={props['aria-label'] ?? label} className={cn('admin-input', className)} aria-invalid={Boolean(error)} />
    </AdminField>
  );
}

export function AdminTextarea({
  label,
  hint,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <AdminField label={label} hint={hint} error={error}>
      <textarea {...props} aria-label={props['aria-label'] ?? label} className={cn('admin-input resize-y leading-relaxed', className)} aria-invalid={Boolean(error)} />
    </AdminField>
  );
}

export function AdminSelect({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <AdminField label={label} hint={hint} error={error}>
      <div className="relative">
        <select {...props} aria-label={props['aria-label'] ?? label} className={cn('admin-input cursor-pointer appearance-none pr-9', className)} aria-invalid={Boolean(error)}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden />
      </div>
    </AdminField>
  );
}

export function AdminCheckbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-50')}>
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-[#c6aa82] bg-[#c6aa82] text-[#171717]' : 'border-[var(--line-strong)] bg-transparent',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M2 6.5 4.5 9 10 3" />
          </svg>
        )}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
      <span className="text-[11px] leading-relaxed text-[var(--text-primary)]">
        {label}
        {description && <span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">{description}</span>}
      </span>
    </label>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder = 'ძიება…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="admin-input h-9 py-0 pl-9 text-[11px]"
        aria-label={placeholder}
      />
    </div>
  );
}

export function AdminChip({
  active,
  children,
  onClick,
  count,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-3 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--surface)]'
          : 'border-[var(--line)] text-[var(--text-secondary)] hover:border-[var(--line-strong)] hover:text-[var(--text-primary)]',
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] tabular-nums', active ? 'bg-black/15' : 'bg-[var(--surface-hover)]')}>
          {count}
        </span>
      )}
    </button>
  );
}

export function RangeSelector({
  value,
  onChange,
  options = [
    { value: '7d', label: '7 დღე' },
    { value: '30d', label: '30 დღე' },
    { value: '90d', label: '90 დღე' },
    { value: 'all', label: 'ყველა' },
  ],
}: {
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] p-0.5" role="group" aria-label="პერიოდი">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'h-7 rounded-md px-2.5 text-[10px] font-medium transition-colors',
            value === option.value
              ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
  total,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  total?: number;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] px-4 py-3">
      <p className="text-[10px] text-[var(--text-secondary)]">
        გვერდი {page} / {pageCount}
        {total !== undefined && <span className="ml-2">· სულ {total}</span>}
      </p>
      <div className="flex items-center gap-1.5">
        <AdminButton size="icon" variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="წინა გვერდი">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </AdminButton>
        <AdminButton size="icon" variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="შემდეგი გვერდი">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </AdminButton>
      </div>
    </div>
  );
}

/* --------------------------------- feedback -------------------------------- */

export function OrderStatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  const tones: Record<OrderStatus, string> = {
    new: 'border-[#c6aa82]/35 bg-[#c6aa82]/10 text-[var(--tone-accent-text)]',
    confirmed: 'border-[#6f96a6]/30 bg-[#6f96a6]/10 text-[var(--tone-info-text)]',
    processing: 'border-[#b88a43]/35 bg-[#b88a43]/10 text-[var(--tone-warning-text)]',
    shipped: 'border-[#7f8fc0]/30 bg-[#7f8fc0]/10 text-[var(--tone-info-text)]',
    completed: 'border-[#4d7a60]/35 bg-[#4d7a60]/12 text-[var(--tone-success-text)]',
    cancelled: 'border-[#a04a4a]/35 bg-[#a04a4a]/12 text-[var(--tone-danger-text)]',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em]', tones[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function ProductStatusPill({ status }: { status: 'active' | 'draft' | 'archived' }) {
  const map = {
    active: 'border-[#4d7a60]/35 bg-[#4d7a60]/12 text-[var(--tone-success-text)]',
    draft: 'border-[#b88a43]/35 bg-[#b88a43]/10 text-[var(--tone-warning-text)]',
    archived: 'border-[var(--line)] bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  };
  const labels = { active: 'აქტიური', draft: 'დრაფტი', archived: 'არქივი' };
  return <span className={cn('inline-flex rounded-md border px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em]', map[status])}>{labels[status]}</span>;
}

export function StatusToneDot({ status }: { status: OrderStatus }) {
  const tone = STATUS_TONES[status];
  const map = {
    neutral: 'bg-[var(--text-secondary)]',
    info: 'bg-[#7f8fc0]',
    accent: 'bg-[#c6aa82]',
    success: 'bg-[#4d7a60]',
    danger: 'bg-[#a04a4a]',
    warning: 'bg-[#b88a43]',
  };
  return <span className={cn('h-1.5 w-1.5 rounded-full', map[tone])} aria-hidden />;
}

export function AdminEmpty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-[var(--text-secondary)]">
        {icon ?? <Search className="h-4 w-4" aria-hidden />}
      </span>
      <div>
        <p className="text-[12px] font-medium text-[var(--text-primary)]">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-[var(--text-secondary)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="admin-card flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-5 w-5 text-[var(--tone-warning-text)]" aria-hidden />
      <p className="text-[12px] text-[var(--text-primary)]">{message}</p>
      {onRetry && <AdminButton size="sm" variant="secondary" onClick={onRetry}>ხელახლა ცდა</AdminButton>}
    </div>
  );
}

export function PermissionDenied({ message = 'ამ განყოფილებაზე წვდომა შეზღუდულია.' }: { message?: string }) {
  return (
    <div className="admin-card flex flex-col items-center gap-3 p-10 text-center">
      <ShieldAlert className="h-6 w-6 text-[var(--tone-danger-text)]" aria-hidden />
      <p className="text-[14px] font-medium text-[var(--text-primary)]">წვდომა შეზღუდულია</p>
      <p className="max-w-md text-[11px] leading-relaxed text-[var(--text-secondary)]">{message}</p>
    </div>
  );
}

export function AdminSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="იტვირთება">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="admin-skeleton h-10 rounded-lg" />
      ))}
    </div>
  );
}

/* ---------------------------------- modal ---------------------------------- */

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus(), 60);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="დახურვა" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} tabIndex={-1} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-2xl sm:rounded-2xl',
              widths[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-medium text-[var(--text-primary)]">{title}</h2>
                {description && <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">{description}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="დახურვა" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="border-t border-[var(--line)] bg-[var(--surface-raised)] px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* --------------------------------- helpers --------------------------------- */

export function AdminStat({
  label,
  value,
  sub,
  delta,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const accentColor = {
    default: 'text-[var(--tone-accent-text)]',
    success: 'text-[var(--tone-success-text)]',
    warning: 'text-[var(--tone-warning-text)]',
    danger: 'text-[var(--tone-danger-text)]',
  }[accent ?? 'default'];
  return (
    <div className="admin-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-[var(--text-secondary)]">{label}</p>
        {icon && <span className={cn('opacity-80', accentColor)}>{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)] tabular-nums sm:text-[27px]">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta !== undefined && (
          <span className={cn('text-[10px] font-medium tabular-nums', delta >= 0 ? 'text-[var(--tone-success-text)]' : 'text-[var(--tone-danger-text)]')}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
        {sub && <span className="text-[9px] text-[var(--text-secondary)]">{sub}</span>}
      </div>
    </div>
  );
}

export function MoneyText({ value, className }: { value: number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatMoney(value)}</span>;
}

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>;
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-primary)]">{children}</code>;
}
