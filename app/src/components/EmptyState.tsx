// EmptyState.tsx — Centered estate block: icon in a rounded box, title, body, optional CTA.
// Reused for the "no groups yet" empty state and the "network error" state (design contract §312–316).

import type { ReactNode } from 'react'
import { Button } from '../ui'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  body: string
  cta?: string
  onCta?: () => void
  /** 'error' → ghost button; icon box uses bg/hairline instead of accent-soft */
  tone?: 'error' | 'default'
}

export function EmptyState({ icon, title, body, cta, onCta, tone = 'default' }: EmptyStateProps) {
  const isError = tone === 'error'

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: 10, padding: '38px 22px' }}
    >
      {/* Icon in a rounded square; error gets a neutral box, empty gets accent-soft */}
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: isError ? 'var(--bg)' : 'var(--accent-soft)',
          border: isError ? '1px solid var(--hairline)' : 'none',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 4,
        }}
      >
        {icon}
      </div>

      <span
        className="font-display font-bold text-ink"
        style={{ fontSize: 18, letterSpacing: '-0.02em' }}
      >
        {title}
      </span>

      <span
        style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: '30ch', lineHeight: 1.5 }}
      >
        {body}
      </span>

      {cta && (
        <div style={{ marginTop: 6 }}>
          <Button variant={isError ? 'ghost' : 'primary'} onClick={onCta}>
            {cta}
          </Button>
        </div>
      )}
    </div>
  )
}
