import { forwardRef, useId } from 'react';
import clsx from 'clsx';
import { ChevronDown, Search } from 'lucide-react';

/**
 * Form controls.
 *
 * Every field is wired to its label through a generated id. This is not
 * box-ticking: an unlabelled weight input on a form that writes to a regulated
 * waste register is a field someone will eventually fill in wrong.
 */

const CONTROL =
  'w-full rounded-lg border border-line bg-surface text-sm text-ink placeholder:text-faint ' +
  'transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ' +
  'disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted';

export function Label({ htmlFor, children, hint, required = false, className }) {
  return (
    <div className={clsx('mb-1.5 flex items-baseline justify-between gap-3', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink">
        {children}
        {required ? (
          <span className="ml-0.5 text-state-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {hint ? <span className="text-[0.6875rem] text-faint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef(function Input(
  { label, hint, error, icon: Icon, required, size = 'md', className, containerClassName, ...rest },
  ref
) {
  const id = useId();
  const height = size === 'sm' ? 'h-9' : 'h-10';

  return (
    <div className={containerClassName}>
      {label ? (
        <Label htmlFor={id} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}

      <div className="relative">
        {Icon ? (
          <Icon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
        ) : null}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={clsx(
            CONTROL,
            height,
            Icon ? 'pl-9 pr-3' : 'px-3',
            error && 'border-state-danger focus:border-state-danger focus:ring-state-danger/20',
            className
          )}
          {...rest}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[0.6875rem] text-state-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, hint, error, options = [], placeholder, required, size = 'md', className, containerClassName, ...rest },
  ref
) {
  const id = useId();
  const height = size === 'sm' ? 'h-9' : 'h-10';

  return (
    <div className={containerClassName}>
      {label ? (
        <Label htmlFor={id} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          className={clsx(
            CONTROL,
            height,
            'appearance-none pl-3 pr-9',
            error && 'border-state-danger',
            className
          )}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const text = typeof option === 'string' ? option : option.label;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
      </div>

      {error ? <p className="mt-1 text-[0.6875rem] text-state-danger">{error}</p> : null}
    </div>
  );
});

export const TextArea = forwardRef(function TextArea(
  { label, hint, error, required, rows = 3, className, containerClassName, ...rest },
  ref
) {
  const id = useId();

  return (
    <div className={containerClassName}>
      {label ? (
        <Label htmlFor={id} hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        className={clsx(CONTROL, 'resize-y px-3 py-2 leading-relaxed', error && 'border-state-danger', className)}
        {...rest}
      />
      {error ? <p className="mt-1 text-[0.6875rem] text-state-danger">{error}</p> : null}
    </div>
  );
});

/** The search box above a table. Debouncing is the caller's job — see useDebounced. */
export function SearchInput({ value, onChange, placeholder = 'Search', className, ...rest }) {
  return (
    <div className={clsx('relative', className)}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={clsx(CONTROL, 'h-9 pl-9 pr-3')}
        {...rest}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false, className }) {
  const id = useId();

  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-pill transition disabled:cursor-not-allowed disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2',
          checked ? 'bg-brand' : 'bg-line'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
