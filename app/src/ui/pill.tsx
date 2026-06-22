// pill.tsx — Label pill primitive
//
// Cal: single flavor — lilac-soft bg / lilac-ink text, 10px uppercase (§187).
// The tone prop is kept for API stability; all tones render as lilac in Cal.

import type { ReactNode } from 'react'

interface PillProps {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'ok'
}

export function Pill({ children }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-ui font-semibold',
        'text-[10px] uppercase tracking-[.04em]', /* §187 */
        'px-[7px] py-[2px]',                      /* §187 */
        'bg-lilac-soft text-lilac-ink',
      ].join(' ')}
      style={{ borderRadius: 6 }}
    >
      {children}
    </span>
  )
}
