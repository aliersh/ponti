// line.tsx — Cal line-grammar primitives: node/pair atoms and FlowWidget states.
// All visual logic lives in index.css; these components emit the right classNames.

import type { ReactNode } from 'react'

// ── Pair ──────────────────────────────────────────────────────────────────────

// The five named node variants from the design contract.
const NODE_VARIANTS = ['ink', 'mut', 'out', 'sage', 'open'] as const
type NodeVariant = typeof NODE_VARIANTS[number]

function isNodeVariant(v: unknown): v is NodeVariant {
  return NODE_VARIANTS.includes(v as NodeVariant)
}

// An endpoint is either a named variant (renders as a node dot) or any React node (e.g., Avatar).
type Endpoint = NodeVariant | ReactNode

export interface PairProps {
  left: Endpoint
  right: Endpoint
  /** Line style: solid (default) / dashed / hot gradient */
  line?: 'solid' | 'dash' | 'hot'
  /** Width of the seg-line segment in px (default: 26) */
  lineWidth?: number | string
  className?: string
}

function EndpointSlot({ value }: { value: Endpoint }) {
  if (isNodeVariant(value)) {
    return <span className={`node node--${value}`} />
  }
  return <>{value}</>
}

export function Pair({ left, right, line = 'solid', lineWidth = 26, className }: PairProps) {
  const segClass = ['seg-line', line !== 'solid' ? line : ''].filter(Boolean).join(' ')
  const width = typeof lineWidth === 'number' ? `${lineWidth}px` : lineWidth

  return (
    <span className={['pair', className].filter(Boolean).join(' ')}>
      <EndpointSlot value={left} />
      <span className={segClass} style={{ width }} />
      <EndpointSlot value={right} />
    </span>
  )
}

// ── DrawLine ──────────────────────────────────────────────────────────────────
// Running-state animation: solid track + ink dots + rosa runner sweeping right.

export interface DrawLineProps {
  className?: string
}

export function DrawLine({ className }: DrawLineProps) {
  return (
    <div className={['drawline', className].filter(Boolean).join(' ')}>
      <div className="track" />
      <div className="dotL" />
      <div className="dotR" />
      <div className="runner" />
    </div>
  )
}

// ── GapLine ───────────────────────────────────────────────────────────────────
// Error-state dashed line. Two right-dot states:
//   reached=true  (default): accent-strong + accent-soft halo — write landed, confirmation lagging.
//   reached=false:           muted ink-3, no halo — write never sent.

export interface GapLineProps {
  /** Whether the write reached the chain. Defaults to true (saved, catching up). */
  reached?: boolean
  className?: string
}

export function GapLine({ reached = true, className }: GapLineProps) {
  const dotRClass = ['dotR', !reached ? 'dotR--muted' : ''].filter(Boolean).join(' ')

  return (
    <div className={['gapline', className].filter(Boolean).join(' ')}>
      <div className="track" />
      <div className="dotL" />
      <div className={dotRClass} />
    </div>
  )
}

// ── KnotDone ─────────────────────────────────────────────────────────────────
// Settled-state circle: sage-soft background, sage check mark.

export interface KnotDoneProps {
  className?: string
}

export function KnotDone({ className }: KnotDoneProps) {
  return (
    <div className={['knot-done', className].filter(Boolean).join(' ')}>
      {/* check path from design contract §941 */}
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 11.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
