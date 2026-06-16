// flow/FlowWidget.tsx — Three-phase (confirm / in-flight / done) write-flow overlay.
// Rendered once at the FlowProvider level; all write-flow UI funnels through here.
// Reuses Sheet for the overlay shell; owns all phase-specific content.

import { useRef } from 'react'
import type { Hex } from 'viem'
import { CHAIN } from '../config'
import { Sheet } from '../ui/sheet'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Shield, Check } from '../ui/icons'
import type { PendingFlow, ConsentRow } from './types'

// ── Wink copy — rotate one pick per flow open, stable via ref ─────────────────

const WINK = {
  confirmSub: [
    'Just the two of you and the math. Your money, not ours.',
    'You, them, and the numbers. We never hold a cent.',
    "One approval and it's logged. Ponti never touches the money.",
    "You're in control — one tap, and we keep the count.",
  ],
  runningNote: [
    'Hang tight — this only takes a moment.',
    'One sec — putting it where it belongs.',
    'Almost there — you can keep this open.',
  ],
  doneTitle: ['Squared away', 'Sorted', 'All set', 'Done'],
  // Per-action doneSub pools; {name} is substituted with pending.who at pick time.
  doneSub: {
    create: [
      'Your shared tab with {name} is ready.',
      'You and {name} are connected — start adding what you spend.',
    ],
    add: [
      'On the tab — the balance just updated.',
      'Added. Future-you will thank present-you.',
    ],
    edit: [
      'Updated — the balance recalculated to match.',
      'Fixed. The tab remembers the new details.',
    ],
    delete: [
      'Removed — the history still notes it was there.',
      'Gone from the balance; the trail keeps the record.',
    ],
    settle: [
      'You and {name} are even again.',
      'Balance back to zero — nothing owed either way.',
    ],
  },
} as const

function rotPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── ConsentRow ────────────────────────────────────────────────────────────────

function ConsentRowItem({ label, value, strong }: ConsentRow) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        padding: '11px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        className="font-ui"
        style={{ fontSize: 14, color: 'var(--muted)', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      <span
        className="font-ui"
        style={{
          fontSize: strong ? 16 : 14,
          fontWeight: strong ? 700 : 600,
          color: 'var(--ink)',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Indeterminate progress bar ────────────────────────────────────────────────
// Driven by the real submit→receipt promise; the bar oscillates until done.
// CSS keyframe (flow-bar-slide) defined inline so no index.css edit needed.

function BarIndeterminate() {
  return (
    <>
      <style>{`
        @keyframes flow-bar-slide {
          0%   { left: -40%; width: 40%; }
          50%  { left: 40%;  width: 50%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--surface-2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 999,
            animation: 'flow-bar-slide 1.4s cubic-bezier(.4,0,.6,1) infinite',
          }}
        />
      </div>
    </>
  )
}

// ── FlowWidget ────────────────────────────────────────────────────────────────

interface FlowWidgetProps {
  pending: PendingFlow
  phase: 'confirm' | 'inflight' | 'done' | 'error'
  txHash: Hex | null
  /** True = submit() threw (nothing on-chain). False = receipt wait failed (write is on-chain). */
  submitFailed: boolean
  onConfirm: () => void
  onRetry: () => void
  /** fireComplete=true: close AND call onComplete. Used for done phase and receipt-failed cancel. */
  onClose: (fireComplete: boolean) => void
}

/**
 * Full-screen write-flow overlay. Phases: confirm → inflight → done (or error).
 * Rendered once at FlowProvider level; do not mount directly in call sites.
 */
export function FlowWidget({
  pending,
  phase,
  txHash,
  submitFailed,
  onConfirm,
  onRetry,
  onClose,
}: FlowWidgetProps) {
  // Rotation is picked once per widget mount and held stable across re-renders.
  const picked = useRef<{
    confirmSub: string
    runningNote: string
    doneTitle: string
    doneSub: string
  } | null>(null)
  if (!picked.current) {
    const rawDoneSub = rotPick(WINK.doneSub[pending.kind])
    picked.current = {
      confirmSub: rotPick(WINK.confirmSub),
      runningNote: rotPick(WINK.runningNote),
      doneTitle: rotPick(WINK.doneTitle),
      doneSub: rawDoneSub.replace('{name}', pending.who ?? 'them'),
    }
  }

  // Sheet placement: modal on viewport ≥ 440 px, sheet on mobile.
  // Evaluated once on mount (matchMedia is synchronous).
  const placement = useRef<'modal' | 'sheet'>(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 440px)').matches
      ? 'modal'
      : 'sheet',
  )

  // In-flight: block all dismiss paths so nothing interrupts the write.
  const dismissible = phase !== 'inflight'

  // Title for the Sheet a11y role — matches the visible heading.
  const a11yTitle =
    phase === 'done'
      ? picked.current.doneTitle
      : phase === 'error'
      ? (submitFailed ? "That didn't go through" : "It's saved — just catching up")
      : pending.title

  // Block explorer URL for the "View receipt" link.
  const explorerBase = CHAIN.blockExplorers?.default?.url
  const receiptUrl = explorerBase && txHash ? `${explorerBase}/tx/${txHash}` : null

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose(phase === 'done' || (phase === 'error' && !submitFailed))
      }}
      placement={placement.current}
      dismissible={dismissible}
      title={a11yTitle}
    >
      <div style={{ padding: '20px 22px 28px' }}>

        {/* ── Confirm phase ── */}
        {phase === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              className="font-display"
              style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              {pending.title}
            </span>
            <span
              className="font-ui"
              style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 8 }}
            >
              {picked.current.confirmSub}
            </span>

            {/* Consent grid */}
            <div style={{ margin: '4px 0 6px' }}>
              {pending.rows.map((row, i) => (
                <ConsentRowItem key={i} {...row} />
              ))}
            </div>

            {/* Safety line — settle-specific vs. generic */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: 'var(--muted)',
                margin: '4px 0 14px',
              }}
            >
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <Shield color="var(--accent)" size={14} />
              </span>
              <span className="font-ui" style={{ fontSize: 12.5 }}>
                {pending.kind === 'settle'
                  ? `The money goes straight to ${pending.who ?? 'them'}. Ponti never holds it.`
                  : 'Free to record. Nothing moves until you choose to settle.'}
              </span>
            </div>

            <Button variant="primary" full onClick={onConfirm}>
              {pending.confirmLabel}
            </Button>
            <Button variant="quiet" full onClick={() => onClose(false)} style={{ marginTop: 2 }}>
              Cancel
            </Button>
          </div>
        )}

        {/* ── In-flight phase ── */}
        {phase === 'inflight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 6 }}>
            <span
              className="font-display"
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              {pending.title}
            </span>

            <BarIndeterminate />

            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Spinner size={15} />
              <span className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {picked.current.runningNote}
              </span>
            </div>
          </div>
        )}

        {/* ── Done phase ── */}
        {phase === 'done' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0 2px',
            }}
          >
            {/* Accent check circle — pop animation from index.css */}
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: 'var(--accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'ponti-pop .4s cubic-bezier(.3,1.5,.5,1)',
              }}
            >
              <Check color="var(--accent)" size={26} />
            </div>

            <span
              className="font-display"
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              {picked.current.doneTitle}
            </span>
            <span
              className="font-ui"
              style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}
            >
              {picked.current.doneSub}
            </span>

            {/* Block-explorer receipt link — omitted if explorer URL is unknown */}
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-ui"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', marginTop: 2 }}
              >
                View receipt ↗
              </a>
            )}

            <Button variant="primary" full onClick={() => onClose(true)} style={{ marginTop: 8 }}>
              Done
            </Button>
          </div>
        )}

        {/* ── Error phase (neutral, never red) ── */}
        {/* Two error worlds: send-failed (nothing on-chain, retry safe) vs. receipt-failed (write succeeded, re-send risks duplicate). */}
        {phase === 'error' && submitFailed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              className="font-display"
              style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              That didn&apos;t go through
            </span>
            <span
              className="font-ui"
              style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}
            >
              Nothing moved and nothing&apos;s lost — give it another go.
            </span>

            <Button variant="primary" full onClick={onRetry}>
              Try again
            </Button>
            <Button variant="quiet" full onClick={() => onClose(false)} style={{ marginTop: 2 }}>
              Cancel
            </Button>
          </div>
        )}
        {phase === 'error' && !submitFailed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              className="font-display"
              style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              It&apos;s saved — just catching up
            </span>
            <span
              className="font-ui"
              style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}
            >
              Your change went through. We&apos;re still waiting on the confirmation to show — it&apos;ll appear on its own.
            </span>

            {/* Done fires onComplete so the screen drops to its grey "Saved — updating…" state. */}
            <Button variant="primary" full onClick={() => onClose(true)}>
              Done
            </Button>
            {/* Manual-refresh escape hatch — matches the group screen's lagging-index copy. */}
            <Button variant="quiet" full onClick={() => window.location.reload()} style={{ marginTop: 2 }}>
              Reload to see the latest
            </Button>
          </div>
        )}

      </div>
    </Sheet>
  )
}
