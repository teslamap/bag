import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  to?: string;
  className?: string;
  tone?: 'light' | 'dark';
  compact?: boolean;
}

export function BrandMark({ to = '/', className, tone = 'dark', compact = false }: BrandMarkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-baseline gap-2 transition-opacity hover:opacity-70',
        tone === 'light' ? 'text-ivory' : 'text-ink',
        className,
      )}
    >
      <span
        className={cn(
          'font-display font-medium leading-none tracking-[0.24em]',
          compact ? 'text-xl' : 'text-2xl md:text-[28px]',
        )}
      >
        MAKU
      </span>
      {!compact && (
        <span className="mb-[2px] flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-champagne" />
          <span className="text-[8px] uppercase tracking-[0.28em] opacity-60">ატელიე</span>
        </span>
      )}
      <span className="sr-only"> — მთავარი გვერდი</span>
    </Link>
  );
}
