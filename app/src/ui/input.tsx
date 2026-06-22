// input.tsx — Input + Field primitives
//
// Input: native input with Cal border, radius, and focus ring.
//   Base: font-ui 14.5px, bg-surface, 1.5px line border, rounded-md.
//   Focus: accent-strong border + 3px accent-soft ring (§202).
//
// Field: label + optional hint wrapper (§198–204).
//   Label: ink-2 12px/600. Hint: ink-3 11.5px.

import type { InputHTMLAttributes } from 'react'

// ── Input ──────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // All native input attributes; className is merged, not replaced.
}

export function Input({ className = '', style, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      // 1.5px border expressed as inline style — Tailwind can't emit fractional border-width
      style={{ border: '1.5px solid var(--line)', ...style }}
      className={[
        'font-ui text-[14.5px] text-ink bg-surface',
        'rounded-md w-full outline-none',
        'px-[14px] py-3', /* 12px vertical — §200 */
        'placeholder:text-ink-3',
        // focus: accent-strong border + 3px accent-soft ring (§202)
        'focus-visible:[border-color:var(--accent-strong)] focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

// ── Field ──────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  hint?: string
  children: React.ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-[6px]"> {/* 6px — §199 */}
      <span className="font-ui font-semibold text-ink-2 text-[12px]"> {/* §199 */}
        {label}
      </span>
      {children}
      {hint && (
        <span className="font-ui text-ink-3 text-[11.5px]"> {/* §203 */}
          {hint}
        </span>
      )}
    </label>
  )
}
