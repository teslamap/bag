import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-4">
          {label && (
            <label
              htmlFor={htmlFor}
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink/65"
            >
              {label}
              {required && <span className="ml-1 text-champagne">*</span>}
            </label>
          )}
          {hint && <span className="text-right text-[10px] text-ink/65">{hint}</span>}
        </div>
      )}
      {children}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="text-[11px] leading-relaxed text-[#8F3F3F]">
          {error}
        </p>
      )}
    </div>
  );
}

const baseInput =
  'w-full rounded-none border-0 border-b border-ink/20 bg-transparent px-0 pb-2.5 pt-1 text-[15px] font-normal text-ink placeholder:text-ink/65 transition-colors duration-300 focus:border-ink focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[#8F3F3F]';

const boxedInput =
  'w-full rounded-xl border border-ink/15 bg-warmwhite px-4 py-3 text-sm text-ink placeholder:text-ink/65 transition-colors focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[#8F3F3F]';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  boxed?: boolean;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, boxed = false, leadingIcon, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink/65">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(boxed ? boxedInput : baseInput, leadingIcon && !boxed && 'pl-7', boxed && leadingIcon && 'pl-10', className)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required={required}
          {...props}
        />
      </div>
    </Field>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  boxed?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, boxed = false, required, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={cn(
          boxed
            ? cn(boxedInput, 'resize-y')
            : cn(baseInput, 'resize-y leading-relaxed'),
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        required={required}
        {...props}
      />
    </Field>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  boxed?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, boxed = false, required, options, placeholder, children, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn(
            boxed ? boxedInput : baseInput,
            'cursor-pointer appearance-none pr-8',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/65"
          aria-hidden
        />
      </div>
    </Field>
  );
});

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: string;
  error?: string;
}

export function Checkbox({ label, description, className, error, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="group flex cursor-pointer items-start gap-3">
        <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
        <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-ink/30 bg-transparent transition-colors duration-200 peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-champagne peer-checked:[&_svg]:scale-100 peer-checked:[&_svg]:opacity-100">
          <Check className="h-3 w-3 scale-75 text-ivory opacity-0 transition-all" strokeWidth={2.5} />
        </span>
        <span className="text-[12px] leading-relaxed text-ink/70">
          {label}
          {description && <span className="mt-0.5 block text-[11px] text-ink/65">{description}</span>}
        </span>
      </label>
      {error && <p className="text-[11px] text-[#8F3F3F]">{error}</p>}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-10 rounded-full border transition-colors duration-300 disabled:opacity-40',
          checked ? 'border-ink bg-ink' : 'border-ink/25 bg-transparent',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] h-4 w-4 rounded-full transition-all duration-300',
            checked ? 'left-[21px] bg-ivory' : 'left-[3px] bg-ink/35',
          )}
        />
      </button>
      {label && <span className="text-[12px] text-ink/70">{label}</span>}
    </label>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#8F3F3F]/20 bg-[#8F3F3F]/[0.06] px-4 py-3 text-[12px] leading-relaxed text-[#7c3434]"
    >
      {children}
    </div>
  );
}
