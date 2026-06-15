// dir-chip.tsx — Direction pill primitive (arrow + word, sits beside a money amount)
//
// Dir → appearance map:
//   out     → accent:  bg-accent-soft, var(--accent)  icon/text, ArrowOut  (you owe — pending action)
//   in      → neutral: bg-surface-2,   var(--muted)   icon/text, ArrowIn   (owes you — no urgency)
//   settled → neutral: bg-surface-2,   var(--muted)   icon/text, Check     (all square)
//
// The chip carries direction only — it never contains a number, and the accent
// never colors a number (§5.3). Call sites drop the +/− sign from amounts.

import { ArrowIn, ArrowOut, Check } from './icons'

// ── DirChip ────────────────────────────────────────────────────────────────────
/**
 * Direction indicator pill: arrow icon + label word in a rounded pill.
 *
 * @param dir     - 'in' (owes you), 'out' (you owe), or 'settled'.
 * @param size    - 'sm' | 'md' | 'lg'; controls font-size, padding, icon size.
 * @param label   - Override the default word. Defaults: in→"owes you",
 *                  out→"you owe", settled→"settled up".
 */

interface DirChipProps {
  dir: 'in' | 'out' | 'settled'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

// Appearance lookup — background as utility class; color as a CSS var fed to
// both the container text and the icon prop (one source of truth).
const dirAppearance = {
  out:     { bg: 'bg-accent-soft', color: 'var(--accent)' },
  in:      { bg: 'bg-surface-2',   color: 'var(--muted)'  },
  settled: { bg: 'bg-surface-2',   color: 'var(--muted)'  },
} as const

// Size table — from prototype DirChip. Non-standard px values → inline style.
const sizeTokens = {
  sm: { fontSize: 11.5, padding: '3px 8px 3px 6px' },
  md: { fontSize: 12.5, padding: '5px 11px 5px 8px' },
  lg: { fontSize: 13,   padding: '5px 11px 5px 8px' },
} as const

const defaultLabels = { in: 'owes you', out: 'you owe', settled: 'settled up' } as const

export function DirChip({ dir, size = 'md', label }: DirChipProps) {
  const { bg, color } = dirAppearance[dir]
  const { fontSize, padding } = sizeTokens[size]
  const word = label ?? defaultLabels[dir]

  // Icon size: arrows = fontSize+3, check = fontSize+1 (prototype DirChip).
  const iconSize = dir === 'settled' ? fontSize + 1 : fontSize + 3
  const icon =
    dir === 'in'      ? <ArrowIn  color={color} size={iconSize} /> :
    dir === 'out'     ? <ArrowOut color={color} size={iconSize} /> :
                        <Check    color={color} size={iconSize} />

  return (
    <span
      className={`inline-flex items-center rounded-pill font-ui whitespace-nowrap ${bg}`}
      style={{ fontSize, fontWeight: 600, padding, color, gap: 5 }}
    >
      {icon}
      {word}
    </span>
  )
}
