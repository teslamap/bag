import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'champagne' | 'outline' | 'ghost' | 'light' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-ivory border border-ink hover:bg-inkhover disabled:hover:bg-ink',
  champagne:
    'bg-champagne text-ink border border-champagne hover:bg-champagnehover disabled:hover:bg-champagne',
  outline:
    'border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-ivory',
  ghost: 'border border-transparent bg-transparent text-ink hover:bg-ink/[0.055]',
  light:
    'border border-white/25 bg-ivory text-ink hover:bg-warmwhite disabled:bg-ivory',
  danger: 'border border-[#8F3F3F] bg-[#8F3F3F] text-white hover:bg-[#7b3434]',
  success: 'border border-[#345544] bg-[#345544] text-white hover:bg-[#284335]',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[11px] tracking-[0.1em]',
  md: 'h-11 px-6 text-[11px] tracking-[0.12em]',
  lg: 'h-14 px-8 text-[11px] tracking-[0.16em]',
  icon: 'h-11 w-11 p-0',
};

export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'btn-sheen inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-medium uppercase transition-all duration-500 ease-editorial active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'მუშავდება…',
    leftIcon,
    rightIcon,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      <span>{loading ? loadingLabel : children}</span>
      {!loading && rightIcon}
    </button>
  );
});
