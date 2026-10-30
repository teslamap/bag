import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Rating({
  value,
  count,
  size = 'sm',
  showValue = false,
  className,
}: {
  value: number;
  count?: number;
  size?: 'xs' | 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const starSize = size === 'md' ? 'h-4 w-4' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-3 w-3';
  return (
    <span
      role="img"
      className={cn('inline-flex items-center gap-2', className)}
      aria-label={`შეფასება ${value.toFixed(1)} 5-დან${typeof count === 'number' ? `, ${count} მიმოხილვა` : ''}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.min(1, Math.max(0, value - (star - 1)));
          return (
            <span key={star} className="relative inline-flex">
              <Star className={cn(starSize, 'text-ink/20')} strokeWidth={1.25} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(starSize, 'fill-champagne text-champagne')} strokeWidth={1.25} />
              </span>
            </span>
          );
        })}
      </span>
      {showValue && <span className="text-[10px] text-ink/65">{value.toFixed(1)}</span>}
      {typeof count === 'number' && (
        <span className="text-[10px] text-ink/65">({count})</span>
      )}
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="აირჩიეთ შეფასება">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ვარსკვლავი`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="rounded-sm p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={cn('h-6 w-6', star <= value ? 'fill-champagne text-champagne' : 'text-ink/25')}
            strokeWidth={1.25}
          />
        </button>
      ))}
      <span className="ml-2 text-[11px] text-ink/65">{value || '—'} / 5</span>
    </div>
  );
}
