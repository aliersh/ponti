// flow/FlowWidget.tsx — Five-state (confirm / running / done / error×2) write-flow overlay.
// Rendered once at the FlowProvider level; all write-flow UI funnels through here.
// Reuses Sheet for the overlay shell; owns all phase-specific content.

import { useRef } from 'react'
import type { Hex } from 'viem'
import { CHAIN } from '../config'
import { Sheet } from '../ui/sheet'
import { Button } from '../ui/button'
import { Avatar } from '../ui/avatar'
import { Pair, DrawLine, GapLine, KnotDone } from '../ui/line'
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

// ── ConsentRow — supplementary detail rows below the primary amount card ──────

function ConsentRowItem({ label, value }: ConsentRow) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        padding: '11px 0',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <span className="font-ui" style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span
        className="font-ui"
        style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textAlign: 'right', whiteSpace: 'nowrap' }}
      >
        {value}
      </span>
    </div>
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

  // Primary amount row (strong) drives the consent card; extras render as a divider list.
  const primaryRow = pending.rows.find((r) => r.strong)
  const extraRows = pending.rows.filter((r) => !r.strong)

  // ── Row lookups used by per-kind confirm layouts ───────────────────────────
  const rowBy = (label: string) => pending.rows.find((r) => r.label === label)

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

        {/* ── Confirm phase — per-kind layouts ── */}
        {phase === 'confirm' && (() => {
          // Delete: no amount, destructive-neutral layout.
          if (pending.kind === 'delete') {
            const descRow = rowBy('For')
            const amtRow = rowBy('Amount')
            // Amount value is "{num} USDC" — strip the USDC suffix for the sub box.
            const amtDisplay = amtRow ? amtRow.value : ''
            return (
              <div>
                <div className="flow-kind">Delete expense</div>
                <div className="consent" style={{ flexDirection: 'column', gap: 10 }}>
                  {/* Top row: description + broken-line motif */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div className="ck">Removing from your tab with {pending.who}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginTop: 4 }}>
                        {descRow?.value}
                      </div>
                    </div>
                    {/* Broken-line: dot — solid — dashed — faded dot. Destructive signal, not red. */}
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink)' }} />
                      <span style={{ width: 14, height: 1.5, background: 'var(--line-2)', display: 'block' }} />
                      <span style={{ width: 14, height: 0, borderTop: '1.5px dashed var(--ink-3)', display: 'block' }} />
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', opacity: 0.4 }} />
                    </div>
                  </div>
                  {/* Full-width sub box: amount impact */}
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', width: '100%' }}>
                    {amtDisplay} comes off the count between you
                  </div>
                </div>
                <div className="reassure">{picked.current.confirmSub}</div>
                <div className="flow-actions">
                  <Button variant="primary" full onClick={onConfirm}>
                    {pending.confirmLabel}
                  </Button>
                  <Button variant="ghost" full onClick={() => onClose(false)}>
                    Keep it
                  </Button>
                </div>
              </div>
            )
          }

          // Add: left block with description + payer sub, right amount.
          if (pending.kind === 'add') {
            const descRow = rowBy('For')
            const payerRow = rowBy('Who paid')
            const amtRow = rowBy('Amount')
            // Amount value is "{num} USDC" — split to isolate the number for camt display.
            const amtParts = amtRow?.value.split(' ') ?? []
            const amtNum = amtParts[0] ?? ''
            return (
              <div>
                <div className="flow-kind">Add expense</div>
                <div className="consent">
                  <div>
                    <div className="ck">Adding to your tab with {pending.who}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginTop: 4 }}>
                      {descRow?.value}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      {payerRow?.value === 'You' ? 'You paid' : `${payerRow?.value} paid`}
                    </div>
                  </div>
                  <div className="camt">{amtNum}<span className="u">USDC</span></div>
                </div>
                <div className="reassure">{picked.current.confirmSub}</div>
                <div className="flow-actions">
                  <Button variant="primary" full onClick={onConfirm}>
                    {pending.confirmLabel}
                  </Button>
                  <Button variant="ghost" full onClick={() => onClose(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )
          }

          // Edit: left block with delta row, right column with amount + delta chip.
          if (pending.kind === 'edit') {
            const descRow = rowBy('For')
            const payerRow = rowBy('Who paid')
            const amtRow = rowBy('Amount')
            const amtParts = amtRow?.value.split(' ') ?? []
            const amtNum = amtParts[0] ?? ''
            // Delta: new amount minus old (prevValue). Both are 2dp strings.
            const newVal = parseFloat(amtNum)
            const oldVal = parseFloat(pending.prevValue ?? '0')
            const delta = newVal - oldVal
            const deltaLabel = (delta >= 0 ? '+' : '') + delta.toFixed(2)
            return (
              <div>
                <div className="flow-kind">Save changes</div>
                <div className="consent">
                  <div>
                    <div className="ck">Editing {descRow?.value} · {payerRow?.value} paid</div>
                    {/* Before → after delta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'line-through', fontFeatureSettings: '"tnum" 1' }}>
                        {pending.prevValue}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>→</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFeatureSettings: '"tnum" 1' }}>
                        {amtNum}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>USDC</span>
                    </div>
                  </div>
                  {/* Right: large amount + sage delta chip — text-only, no check glyph (.consent right column) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div className="camt" style={{ fontSize: 18 }}>{amtNum}<span className="u">USDC</span></div>
                    <span className="font-ui" style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', background: 'var(--sage-soft)', color: 'var(--sage)', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                      {deltaLabel}
                    </span>
                  </div>
                </div>
                <div className="reassure">{picked.current.confirmSub}</div>
                <div className="flow-actions">
                  <Button variant="primary" full onClick={onConfirm}>
                    {pending.confirmLabel}
                  </Button>
                  <Button variant="ghost" full onClick={() => onClose(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )
          }

          // Create: centered avatar pair + relational copy, no amount.
          if (pending.kind === 'create') {
            const selfId = pending.pair?.self
            const otherId = pending.pair?.other
            return (
              <div>
                <div className="flow-kind">Add someone</div>
                <div className="consent" style={{ flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                  <Pair
                    left={selfId ? <Avatar initial={selfId.initial} tone={selfId.tone} size={36} /> : <Avatar tone="lilac" initial="" size={36} />}
                    right={otherId ? <Avatar initial={otherId.initial} tone={otherId.tone} size={36} /> : 'mut'}
                    line="solid"
                    lineWidth={56}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                      Start a shared tab with {pending.who}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>
                      They&apos;ll see you in their connections too.
                    </div>
                  </div>
                </div>
                <div className="reassure">{picked.current.confirmSub}</div>
                <div className="flow-actions">
                  <Button variant="primary" full onClick={onConfirm}>
                    Connect
                  </Button>
                  <Button variant="ghost" full onClick={() => onClose(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )
          }

          // Settle (and any default): generic consent card.
          return (
            <div>
              <div className="flow-kind">{pending.title}</div>
              {primaryRow && (
                <div className="consent">
                  <div className="ck">{primaryRow.label}</div>
                  <div className="camt">{primaryRow.value}</div>
                </div>
              )}
              {extraRows.length > 0 && (
                <div style={{ margin: '4px 0 6px' }}>
                  {extraRows.map((row, i) => (
                    <ConsentRowItem key={i} {...row} />
                  ))}
                </div>
              )}
              <div className="reassure">{picked.current.confirmSub}</div>
              <div className="flow-actions">
                <Button variant="primary" full onClick={onConfirm}>
                  {pending.confirmLabel}
                </Button>
                <Button variant="ghost" full onClick={() => onClose(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )
        })()}

        {/* ── In-flight phase — dismiss-locked; DrawLine runner sweeps the track ── */}
        {phase === 'inflight' && (
          <div className="flow-center">
            <DrawLine />
            <div className="flow-title">{picked.current.runningNote}</div>
            <div className="flow-sub">You can keep this open.</div>
            <div className="note">This view can&apos;t be dismissed while it runs.</div>
          </div>
        )}

        {/* ── Done phase — KnotDone closes the thread ── */}
        {phase === 'done' && (
          <div>
            <div className="flow-center">
              <KnotDone />
              <div className="flow-title">{picked.current.doneTitle}</div>
              <div className="flow-sub">{picked.current.doneSub}</div>

              {/* Block-explorer receipt link — omitted if explorer URL is unknown */}
              {receiptUrl && (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="receipt"
                >
                  View receipt ↗
                </a>
              )}
            </div>

            <div className="flow-actions" style={{ marginTop: 18 }}>
              <Button variant="primary" full onClick={() => onClose(true)}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ── Error phase (neutral, never red) ── */}
        {/* Two error worlds: send-failed (nothing on-chain, retry safe) vs. receipt-failed (write succeeded, re-send risks duplicate). */}

        {phase === 'error' && submitFailed && (
          <div>
            <div className="flow-center">
              {/* reached=false: muted right dot — write never sent */}
              <GapLine reached={false} />
              <div className="flow-title">That didn&apos;t go through</div>
              <div className="flow-sub">Nothing moved and nothing&apos;s lost — give it another go.</div>
            </div>
            <div className="flow-actions" style={{ marginTop: 18 }}>
              <Button variant="primary" full onClick={onRetry}>
                Try again
              </Button>
              <Button variant="ghost" full onClick={() => onClose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {phase === 'error' && !submitFailed && (
          <div>
            <div className="flow-center">
              {/* reached=true (default): accent halo — write landed, confirmation signal lagging */}
              <GapLine />
              <div className="flow-title">It&apos;s saved — just catching up</div>
              <div className="flow-sub">
                Your change went through. We&apos;re still waiting on the confirmation to show — it&apos;ll appear on its own.
              </div>
            </div>
            {/* Done fires onComplete so the screen drops to its grey "Saved — updating…" state. */}
            <div className="flow-actions" style={{ marginTop: 18 }}>
              <Button variant="primary" full onClick={() => onClose(true)}>
                Done
              </Button>
              {/* Manual-refresh escape hatch — matches the group screen's lagging-index copy. */}
              <Button variant="quiet" full onClick={() => window.location.reload()}>
                Reload to see the latest
              </Button>
            </div>
          </div>
        )}

      </div>
    </Sheet>
  )
}
