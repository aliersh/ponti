// button.tsx — Button primitive
//
// Five emphases: primary / outline / soft / ghost / quiet.
// Full-width via `full` prop: inline-flex + w-full keeps justify-center working
// in both inline and block contexts (display:block kills flex centering).

import type { CSSProperties, ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'soft' | 'ghost' | 'quiet'
  full?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  /** Inline style escape hatch — wins over class-level padding for tight-context overrides. */
  style?: CSSProperties
}

// Per-variant classes: background + text only. Border and special cases handled below.
const variantBase: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent-strong text-on-accent',
  outline: 'bg-transparent text-ink',
  soft:    'bg-accent-soft text-accent-soft-ink',
  ghost:   'bg-transparent text-ink-2',
  quiet:   'bg-transparent text-ink-3',
}

// Per-variant padding (matches design contract §169–174).
const variantPad: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'py-[13px] px-18',   /* 13/18px — §169 */
  outline: 'py-[11.5px] px-18', /* compensates for 1.5px border — §171 */
  soft:    'py-2 px-[13px]',    /* 8/13px — §172 */
  ghost:   'py-2 px-3',         /* 8/12px — §173 */
  quiet:   'py-[6px] px-1',     /* tight — §174 */
}

// Per-variant font size (soft/ghost/quiet are 12.5px per §172–174).
const variantSize: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'text-[14px]',
  outline: 'text-[14px]',
  soft:    'text-[12.5px]',
  ghost:   'text-[12.5px]',
  quiet:   'text-[12.5px]',
}

// outline border is 1.5px solid line-2 (§171) — not a ring, not accent.
// Applied as inline style so the fractional border-width is exact.
const outlineBorderStyle: CSSProperties = { border: '1.5px solid var(--line-2)' }

// quiet gets an underline decoration (§174).
const quietExtra = 'underline underline-offset-2 font-medium'

export function Button({
  children,
  variant = 'primary',
  full = false,
  disabled = false,
  onClick,
  className = '',
  style,
}: ButtonProps) {
  const isOutline = variant === 'outline'
  const isQuiet   = variant === 'quiet'

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      style={{
        ...(isOutline ? outlineBorderStyle : {}),
        ...style,
      }}
      className={[
        // Base layout + typography
        'font-ui font-semibold rounded-md',
        'inline-flex items-center justify-center gap-2 whitespace-nowrap',
        'transition-[filter,transform] duration-150',
        // Active press — all variants (§168)
        'active:translate-y-px',
        // Primary hover only — brightness up, not down (§170)
        variant === 'primary' ? 'hover:brightness-[1.04]' : '',
        // Focus-visible a11y ring — accent but no offset (offset defaults to white, breaks dark)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        // Disabled (§176)
        disabled ? 'opacity-45 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        // Full width — w-full expands inline-flex; justify-center stays active
        full ? 'w-full' : '',
        // Variant specifics
        variantBase[variant],
        variantPad[variant],
        variantSize[variant],
        isQuiet ? quietExtra : '',
        // Caller override
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
