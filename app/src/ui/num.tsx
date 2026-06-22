// num.tsx — Money formatting + numeric figure primitive
//
// money(): converts a USDC bigint (6 decimals) to a locale-formatted string.
// Returns the absolute value; the caller prepends the sign (e.g. "+12.50").
//
// <Num>: renders a monetary or numeric value with the correct figure style
// per §5.3 (locked money rule):
//   - display=true  → proportional lining figures (big hero amounts; pnum utility)
//   - display=false → tabular lining figures (lists, rows; tnum utility — default)
// Color is always var(--ink) by default; the accent NEVER colors a number (§5.3).

import { formatUnits } from 'viem'
import type { ReactNode } from 'react'

// ── money ──────────────────────────────────────────────────────────────────────
// Input: bigint in USDC base units (6 decimals). Returns the absolute value
// formatted as "X,XXX.XX" (en-US locale, always 2 decimal places). The caller
// is responsible for prepending a sign character if needed.
export function money(base: bigint): string {
  const n = Math.abs(Number(formatUnits(base, 6)))
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Num ────────────────────────────────────────────────────────────────────────
// Props:
//   children  — the formatted string to render (e.g. money(x) or a sign+amount)
//   size      — font-size in px; applied as inline style (dynamic, not a Tailwind scale)
//   weight    — font-weight; defaults to 700
//   color     — CSS color value; defaults to var(--ink). Do NOT pass a hex literal —
//               always pass a design token (var(--ink), var(--ink-2), etc.).
//   display   — when true, uses proportional figures + the display font (big hero
//               amounts); when false (default), tabular figures + the UI font (rows)

interface NumProps {
  children: ReactNode
  size?: number
  weight?: number
  color?: string
  display?: boolean
}

export function Num({
  children,
  size = 16,
  weight = 700,
  color = 'var(--ink)',
  display = false,
}: NumProps) {
  return (
    <span
      className={display ? 'pnum' : 'tnum'}
      style={{
        fontFamily: display ? 'var(--font-display)' : 'var(--font-ui)',
        fontWeight: weight,
        fontSize: size,
        color,
        letterSpacing: display ? '-0.025em' : '-0.012em',
        ...(display && { lineHeight: 0.92 }),
      }}
    >
      {children}
    </span>
  )
}
