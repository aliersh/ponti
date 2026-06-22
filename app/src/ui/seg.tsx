// seg.tsx — Segmented toggle group primitive
//
// Renders a row of equal-width toggle buttons; one is selected at a time.
// Visual: 1.5px line border, surface bg; active = accent-strong bg / on-accent text.
// Avatar slot: when an option carries an avatar, selection tints it white (§209).

import type { ReactNode } from 'react'

export interface SegOption {
  value: string
  label: string
  /** Optional avatar or icon node displayed before the label. */
  avatar?: ReactNode
}

export interface SegProps {
  options: SegOption[]
  selected: string
  onChange: (value: string) => void
}

export function Seg({ options, selected, onChange }: SegProps) {
  return (
    <div className="seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === selected}
          aria-selected={opt.value === selected}
          onClick={() => onChange(opt.value)}
        >
          {opt.avatar && <span className="ava">{opt.avatar}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
