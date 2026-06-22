// dir-chip.tsx — Direction chip primitive (status + word, beside a money amount)
//
// Cal direction grammar: color encodes urgency, not glyphs.
//   out     → solid accent-strong bg / on-accent text (decisive, pending action — no icon)
//   in      → surface bg / ink-2 text / line border + small dot (passive)
//   settled → sage-soft bg / sage text + check glyph

import { Check } from './icons'

interface DirChipProps {
  dir: 'in' | 'out' | 'settled'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

// Size table per §183–184 (.chip.sm / default / .chip.lg).
const sizeTokens = {
  sm: { fontSize: 10.5, padding: '3px 8px' },
  md: { fontSize: 11.5, padding: '4px 9px' },
  lg: { fontSize: 13,   padding: '6px 12px' },
} as const

const defaultLabels = { in: 'owes you', out: 'you owe', settled: 'settled up' } as const

export function DirChip({ dir, size = 'md', label }: DirChipProps) {
  const { fontSize, padding } = sizeTokens[size]
  const word = label ?? defaultLabels[dir]

  // in: dot + word on muted surface with a hairline border
  if (dir === 'in') {
    return (
      <span
        className="inline-flex items-center rounded-pill font-ui whitespace-nowrap"
        style={{
          fontSize,
          fontWeight: 600,
          padding,
          background: 'var(--surface)',
          color: 'var(--ink-2)',
          border: '1px solid var(--line)',
          gap: 6,
          lineHeight: 1.2,
        }}
      >
        {/* Small dot at 0.6 opacity signals direction without urgency (§179) */}
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'currentColor',
            opacity: 0.6,
            flexShrink: 0,
          }}
        />
        {word}
      </span>
    )
  }

  // out: word only on solid accent-strong — no icon (§181)
  if (dir === 'out') {
    return (
      <span
        className="inline-flex items-center rounded-pill font-ui whitespace-nowrap"
        style={{
          fontSize,
          fontWeight: 600,
          padding,
          background: 'var(--accent-strong)',
          color: 'var(--on-accent)',
          lineHeight: 1.2,
        }}
      >
        {word}
      </span>
    )
  }

  // settled: check + word on sage-soft (§182)
  return (
    <span
      className="inline-flex items-center rounded-pill font-ui whitespace-nowrap"
      style={{
        fontSize,
        fontWeight: 600,
        padding,
        background: 'var(--sage-soft)',
        color: 'var(--sage)',
        gap: 6,
        lineHeight: 1.2,
      }}
    >
      <Check color="var(--sage)" size={fontSize + 1} />
      {word}
    </span>
  )
}
