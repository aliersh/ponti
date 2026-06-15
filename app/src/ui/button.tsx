// button.tsx — Button primitive
//
// Variants:
//   primary  → bg-accent-strong / text-accent-ink (default)
//   ghost    → bg-surface-2 / text-ink + inset 1px border ring
//   outline  → transparent / text-ink + inset 1.5px accent ring
//   soft     → bg-accent-soft / text-accent
//   quiet    → transparent / text-muted + tighter padding
//
// Extra beyond prototype: focus-visible accent ring for keyboard a11y.
// onMouseDown preventDefault prevents focus-flash on click (per prototype).

import type { CSSProperties, ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'outline' | 'soft' | 'quiet'
  full?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  /** Inline style — wins over equal-specificity padding utilities for tight-padding overrides. */
  style?: CSSProperties
}

// Variant-specific Tailwind classes (background + text + optional ring).
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent-strong text-accent-ink',
  ghost:
    'bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--border)]',
  outline:
    'bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--accent)]',
  soft: 'bg-accent-soft text-accent',
  quiet: 'bg-transparent text-muted',
}

// quiet gets tighter padding; all others use the standard 14px/18px.
const paddingClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'px-18 py-[14px]', /* 14px vertical — prototype components.jsx */
  ghost:   'px-18 py-[14px]', /* 14px vertical — prototype components.jsx */
  outline: 'px-18 py-[14px]', /* 14px vertical — prototype components.jsx */
  soft:    'px-18 py-[14px]', /* 14px vertical — prototype components.jsx */
  quiet:   'px-[12px] py-[10px]', /* tighter quiet — prototype components.jsx */
}

export function Button({
  children,
  variant = 'primary',
  full = false,
  disabled = false,
  onClick,
  className = '',
  style,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      style={style}
      className={[
        // Base
        'font-ui font-semibold text-base rounded-sm',
        'inline-flex items-center justify-center gap-2 whitespace-nowrap',
        'transition-[filter,opacity] duration-150',
        // Hover
        'hover:brightness-95',
        // Focus-visible a11y ring (beyond prototype — keyboard users)
        // ring-offset intentionally omitted: Tailwind's ring-offset-color defaults to white,
        // which breaks dark mode. The accent ring hugs the element edge instead.
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        // Disabled
        disabled ? 'opacity-50 cursor-default pointer-events-none' : 'cursor-pointer',
        // Full width
        full ? 'w-full' : '',
        // Variant
        variantClasses[variant],
        paddingClasses[variant],
        // Caller override (e.g. tighter padding for strip context)
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
