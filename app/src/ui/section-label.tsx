// section-label.tsx — Eyebrow section header
//
// Cal: font-ui 11px/600, .12em tracking, uppercase, ink-3 (§214).
// Optional right slot for a count or action button.

import type { ReactNode } from 'react'

interface SectionLabelProps {
  children: ReactNode
  right?: ReactNode
}

export function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <div className="flex items-center justify-between px-[2px] pb-[2px]">
      <span
        className={[
          'font-ui font-semibold uppercase text-ink-3',
          'text-[11px]',        /* §214 */
          'tracking-[.12em]',   /* §214 */
        ].join(' ')}
      >
        {children}
      </span>
      {right}
    </div>
  )
}
