import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  disabled,
  size = 'md',
  label = 'რაოდენობა',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const height = size === 'sm' ? 'h-9' : 'h-12';
  const button = size === 'sm' ? 'w-8' : 'w-11';
  return (
    <div
      className={cn(
        'inline-flex items-center border border-ink/15 bg-transparent',
        height,
        disabled && 'opacity-50',
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn('flex h-full items-center justify-center text-ink/65 transition-colors hover:text-ink disabled:opacity-30', button)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="რაოდენობის შემცირება"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <input
        type="number"
        className="h-full w-10 border-0 bg-transparent p-0 text-center text-[12px] font-medium text-ink focus:outline-none focus:ring-0"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
        }}
      />
      <button
        type="button"
        className={cn('flex h-full items-center justify-center text-ink/65 transition-colors hover:text-ink disabled:opacity-30', button)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="რაოდენობის გაზრდა"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
