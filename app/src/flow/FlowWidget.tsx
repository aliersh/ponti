// flow/FlowWidget.tsx — Five-phase (input / confirm / inflight / done / error×2) write-flow overlay.
// Rendered once at the FlowProvider level; all write-flow UI funnels through here.
// Reuses Sheet for the overlay shell; owns all phase-specific content.

import { useRef, useState, useEffect } from 'react'
import { parseUnits } from 'viem'
import type { Hex } from 'viem'
import { CHAIN } from '../config'
import { Sheet } from '../ui/sheet'
import { Button } from '../ui/button'
import { Avatar } from '../ui/avatar'
import { Pair, DrawLine, GapLine, KnotDone, NodePop, NodePulse, NodeFade } from '../ui/line'
import { Field, Input } from '../ui/input'
import { Seg } from '../ui/seg'
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

// Accepts raw input (including locale commas) and returns a valid decimal string
// with at most one dot and at most 6 fractional digits (USDC precision).
function sanitizeAmount(raw: string): string {
  const normalized = raw.replace(',', '.')
  const digitsAndDots = normalized.replace(/[^\d.]/g, '')
  const firstDot = digitsAndDots.indexOf('.')
  if (firstDot === -1) return digitsAndDots
  const integer = digitsAndDots.slice(0, firstDot)
  const fraction = digitsAndDots.slice(firstDot + 1).replace(/\./g, '').slice(0, 6)
  return `${integer}.${fraction}`
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

// ── AddEditCard — single persistent card spanning input and confirm for add/edit flows.
//
// Stays mounted across both phases; styles are driven by isConfirm so the browser
// runs CSS transitions instead of remounting. Form state lives here so it survives
// the input→confirm flip.

const TR = 'all .55s cubic-bezier(.4,0,.2,1)'

interface AddEditCardProps {
  pending: PendingFlow
  phase: 'input' | 'confirm'
  confirmSub: string
  onAdvance: (vals: { amount: bigint; description: string; payer: 'me' | 'counterparty' }) => void
  onConfirm: () => void
  onBack: () => void
  onDelete: ((deleteFlow: PendingFlow) => void) | undefined
  onClose: (fireComplete: boolean) => void
}

function AddEditCard({
  pending,
  phase,
  confirmSub,
  onAdvance,
  onConfirm,
  onBack,
  onDelete,
  onClose,
}: AddEditCardProps) {
  const init = pending.inputInitial!
  const editing = init.mode === 'edit'
  const isConfirm = phase === 'confirm'

  const [amount, setAmount] = useState(init.amount)
  const [description, setDescription] = useState(init.description)
  const [payer, setPayer] = useState<'me' | 'counterparty'>(init.payer)
  const [formError, setFormError] = useState<string | null>(null)

  // isConfirm drives all animated properties; effect clears form errors when
  // the user backs out so stale errors don't show on the re-opened form.
  useEffect(() => {
    if (!isConfirm) setFormError(null)
  }, [isConfirm])

  // Validation: primary disabled until amount > 0 and description filled.
  const ok = parseFloat(amount) > 0 && description.trim().length > 0

  // Edit-mode only: also disabled until at least one field differs from init.
  const dirty = (() => {
    if (!editing) return true
    const payerChanged = payer !== init.payer
    const descChanged = description.trim() !== init.description.trim()
    let amountChanged = true
    try { amountChanged = parseUnits(amount, 6) !== parseUnits(init.amount || '0', 6) } catch { /* invalid counts as changed */ }
    return payerChanged || descChanged || amountChanged
  })()

  function onReview() {
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(amount, 6)
    } catch {
      setFormError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setFormError('Amount must be greater than 0.')
      return
    }
    const trimmed = description.trim()
    if (!trimmed) {
      setFormError('Description is required.')
      return
    }
    setFormError(null)
    // payer 'me'|'counterparty' is passed to buildSubmit; the call-site closure
    // resolves the actual on-chain address from its captured smartAccount/counterparty.
    onAdvance({ amount: parsedAmount, description: trimmed, payer })
  }

  const whoLabel = pending.who ?? ''
  const counterpartyInitial = whoLabel.charAt(0).toUpperCase()

  // Summary line shown in confirm phase inside the docked summary card.
  const payerLabel = payer === 'me' ? 'you paid' : whoLabel === 'them' ? 'they paid' : `${whoLabel} paid`
  const summaryLine = `${description.trim() || '…'} · ${payerLabel}`

  const contextLabel = editing
    ? `You'll update your tab with ${whoLabel || 'them'}`
    : `You'll add to your tab with ${whoLabel || 'them'}`

  // Display value for the docked amount — shows what the user typed.
  const amtDisplay = parseFloat(amount) > 0 ? amount : '0.00'

  // Delta chip values (edit only): compare typed amount to the prefilled prev value.
  const oldVal = parseFloat(init.prevValue ?? '0')
  const newVal = parseFloat(amtDisplay)
  const delta = newVal - oldVal
  const deltaLabel = (delta >= 0 ? '+' : '') + delta.toFixed(2)

  return (
    <div style={{ padding: '4px 22px 28px' }}>
      {/* Header: title + close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
          {pending.title}
        </span>
        <button
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20, lineHeight: 1, padding: '2px 4px' }}
          onClick={() => onClose(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Subtitle fades out on confirm */}
      <p style={{
        fontSize: 13,
        color: 'var(--ink-2)',
        margin: '2px 0 16px',
        maxHeight: isConfirm ? 0 : 24,
        opacity: isConfirm ? 0 : 1,
        overflow: 'hidden',
        transition: TR,
      }}>
        {editing ? 'Fix the details — the balance updates to match.' : 'Add what you paid for — Ponti keeps the count.'}
      </p>

      {/* Amount card — input shows the editable amount centered; confirm docks it
          beside a one-line summary. Content is conditionally rendered per phase
          (not max-height-toggled) so the confirm side always paints; the card
          container itself morphs padding + direction for the reflow. */}
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--hairline)',
        borderRadius: 16,
        padding: isConfirm ? '14px 16px' : '22px 18px 20px',
        display: 'flex',
        flexDirection: isConfirm ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: isConfirm ? 'space-between' : 'center',
        textAlign: isConfirm ? 'left' : 'center',
        gap: 12,
        marginBottom: 16,
        transition: TR,
      }}>
        {isConfirm ? (
          <>
            {/* Confirm: context + one-line summary (left), docked amount (right). */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{contextLabel}</span>
              <span style={{
                fontSize: 13,
                color: 'var(--ink-2)',
                marginTop: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {summaryLine}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 4 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 30,
                color: 'var(--ink)',
                fontFeatureSettings: '"tnum" 1',
                letterSpacing: '-.025em',
                whiteSpace: 'nowrap',
              }}>
                {amtDisplay}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginLeft: 5 }}>USDC</span>
              </span>
              {/* Delta chip (edit mode): the signed change vs the prior amount. */}
              {editing && init.prevValue && (
                <span className="font-ui" style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: '3px 8px',
                  background: 'var(--sage-soft)',
                  color: 'var(--sage)',
                  borderRadius: 'var(--radius-pill)',
                  whiteSpace: 'nowrap',
                }}>
                  {deltaLabel}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Input: large editable amount, with the before→after chip when editing. */}
            <span style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.12em',
              textTransform: 'uppercase' as const,
              color: 'var(--ink-3)',
              marginBottom: 14,
            }}>
              Amount
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, width: '100%' }}>
              <input
                placeholder="0.00"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 48,
                  letterSpacing: '-.025em',
                  color: parseFloat(amount) > 0 ? 'var(--ink)' : 'var(--ink-3)',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  textAlign: 'center',
                  fontFeatureSettings: '"tnum" 1',
                  ...(parseFloat(amount) > 0 ? { borderBottom: '2px solid var(--accent-strong)', paddingBottom: 2 } : {}),
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-3)' }}>USDC</span>
            </div>
            {editing && init.prevValue && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 999,
                padding: '4px 11px',
                marginTop: 14,
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFeatureSettings: '"tnum" 1', textDecoration: 'line-through', textDecorationColor: 'var(--line-2)' }}>
                  {init.prevValue}
                </span>
                <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>→</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFeatureSettings: '"tnum" 1' }}>
                  {parseFloat(amount) > 0 ? amount : '…'}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* What for + Who paid — fold away on confirm */}
      {/* TODO: desktop two-column input layout — amount card left, fields right */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        marginBottom: 18,
        maxHeight: isConfirm ? 0 : 280,
        opacity: isConfirm ? 0 : 1,
        overflow: 'hidden',
        transition: TR,
      }}>
        <Field label="What for?">
          <Input
            placeholder="e.g. Groceries"
            autoComplete="off"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            tabIndex={isConfirm ? -1 : 0}
            aria-hidden={isConfirm}
          />
        </Field>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="font-ui" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>Who paid?</span>
          <Seg
            options={[
              { value: 'me', label: 'You' },
              {
                value: 'counterparty',
                label: whoLabel,
                avatar: <Avatar initial={counterpartyInitial} tone="accent" size={18} />,
              },
            ]}
            selected={payer}
            onChange={(v) => setPayer(v as 'me' | 'counterparty')}
          />
        </div>
      </div>

      {/* Reassurance copy — fades in on confirm */}
      <div className="reassure" style={{
        maxHeight: isConfirm ? 40 : 0,
        opacity: isConfirm ? 1 : 0,
        overflow: 'hidden',
        transition: TR,
      }}>
        {confirmSub}
      </div>

      {/* CTAs: Review only in input, Confirm + Back only in confirm.
          Conditional render — Confirm must not be present in the DOM during input. */}
      {!isConfirm && (
        <Button
          variant="primary"
          full
          disabled={editing ? (!ok || !dirty) : !ok}
          onClick={onReview}
        >
          {editing ? 'Review changes' : 'Review'}
        </Button>
      )}
      {isConfirm && (
        <div className="flow-actions">
          <Button variant="primary" full onClick={onConfirm}>
            Confirm
          </Button>
          <Button variant="ghost" full onClick={onBack}>
            Back to edit
          </Button>
        </div>
      )}

      {/* Delete affordance (edit mode only, input phase only) */}
      {editing && pending.deleteFlow && !isConfirm && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 12.5, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}
            onClick={() => onDelete?.(pending.deleteFlow!)}
          >
            Delete expense
          </button>
        </div>
      )}

      {formError && !isConfirm && (
        <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '8px 0 0' }}>
          {formError}
        </p>
      )}

      {!formError && !isConfirm && (!amount || parseFloat(amount) <= 0) && (
        <p className="font-ui" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', margin: '8px 0 0' }}>
          Enter an amount to continue.
        </p>
      )}
    </div>
  )
}

// ── FlowWidget ────────────────────────────────────────────────────────────────

interface FlowWidgetProps {
  pending: PendingFlow
  phase: 'input' | 'confirm' | 'inflight' | 'done' | 'error'
  txHash: Hex | null
  /** True = submit() threw (nothing on-chain). False = receipt wait failed (write is on-chain). */
  submitFailed: boolean
  onAdvance: (vals: { amount: bigint; description: string; payer: 'me' | 'counterparty' }) => void
  onConfirm: () => void
  /** confirm → input. Structurally guarded in the controller to be a no-op post-consent. */
  onBack: () => void
  onDelete: (deleteFlow: PendingFlow) => void
  onRetry: () => void
  /** fireComplete=true: close AND call onComplete. Used for done phase and receipt-failed cancel. */
  onClose: (fireComplete: boolean) => void
}

/**
 * Full-screen write-flow overlay. Phases: input (add/edit only) → confirm → inflight → done (or error).
 * Rendered once at FlowProvider level; do not mount directly in call sites.
 */
export function FlowWidget({
  pending,
  phase,
  txHash,
  submitFailed,
  onAdvance,
  onConfirm,
  onBack,
  onDelete,
  onRetry,
  onClose,
}: FlowWidgetProps) {
  // Rotation is picked once per widget mount and held stable across re-renders.
  // Settle done uses verbatim design copy, not the rotated pool.
  const picked = useRef<{
    confirmSub: string
    runningNote: string
    doneTitle: string
    doneSub: string
  } | null>(null)
  if (!picked.current) {
    const isSettle = pending.kind === 'settle'
    const settleAmt = isSettle
      ? (pending.rows.find((r) => r.strong)?.value ?? '').replace(' USDC', '')
      : ''
    const settleName = pending.who && pending.who !== 'them' ? pending.who : null
    const rawDoneSub = isSettle
      ? settleName
        ? `${settleName} has your ${settleAmt} — straight to them. Nothing left to do.`
        : `They have your ${settleAmt} — straight to them. Nothing left to do.`
      : rotPick(WINK.doneSub[pending.kind]).replace('{name}', pending.who ?? 'them')
    picked.current = {
      confirmSub: rotPick(WINK.confirmSub),
      runningNote: rotPick(WINK.runningNote),
      doneTitle: isSettle ? 'Squared away' : rotPick(WINK.doneTitle),
      doneSub: rawDoneSub,
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

  // ── Row lookup used by non-add/edit confirm layouts ────────────────────────
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
      {/* ── Add/edit: single persistent card spans input and confirm phases ── */}
      {(phase === 'input' || phase === 'confirm') && pending.inputInitial && (
        <AddEditCard
          pending={pending}
          phase={phase}
          confirmSub={picked.current.confirmSub}
          onAdvance={onAdvance}
          onConfirm={onConfirm}
          onBack={onBack}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}

      {/* ── Non-input phases (including confirm for non-add/edit flows) ── */}
      {phase !== 'input' && !(pending.inputInitial && phase === 'confirm') && (
        <div style={{ padding: '20px 22px 28px' }}>

          {/* ── Confirm phase — per-kind layouts (delete / create / settle) ── */}
          {phase === 'confirm' && (() => {
            // Delete: no amount, destructive-neutral layout.
            if (pending.kind === 'delete') {
              const descRow = rowBy('For')
              const amtRow = rowBy('Amount')
              const amtDisplay = amtRow ? amtRow.value : ''
              return (
                <div>
                  <div className="flow-kind">Delete expense</div>
                  <div className="consent" style={{ flexDirection: 'column', gap: 10 }}>
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
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', width: '100%' }}>
                      {amtDisplay} comes off the count between you
                    </div>
                  </div>
                  <div className="reassure">{picked.current!.confirmSub}</div>
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

            // Settle: directional avatar pair (You→counterparty), consent row, safety line.
            if (pending.kind === 'settle') {
              const name = pending.who ?? 'them'
              const nameInitial = name.charAt(0).toUpperCase()
              const selfId = pending.pair?.self
              return (
                <div>
                  <div className="flow-kind">Settle up</div>

                  {/* Directional pair: lilac (You) → accent (counterparty), gradient line + arrowhead */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 11, margin: '16px 0 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      {selfId
                        ? <Avatar initial={selfId.initial} tone={selfId.tone} size={32} />
                        : <Avatar initial="Y" tone="lilac" size={32} />}
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>You</span>
                    </div>
                    {/* Gradient line + right-arrowhead — the directional signal */}
                    <div style={{ position: 'relative', width: 64, height: 32, display: 'flex', alignItems: 'center' }}>
                      <span style={{ flex: 1, height: 1.5, background: 'linear-gradient(90deg,var(--ink),var(--accent-strong))' }} />
                      <span style={{ position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--accent-strong)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <Avatar initial={nameInitial} tone="accent" size={32} />
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600 }}>{name}</span>
                    </div>
                  </div>

                  {/* Consent row: left label + right strong amount */}
                  {primaryRow && (
                    <div className="consent">
                      <div className="ck">{primaryRow.label}</div>
                      <div className="camt">
                        {primaryRow.value.replace(' USDC', '')}
                        <span className="u">USDC</span>
                      </div>
                    </div>
                  )}

                  {/* Safety line — settle-specific, not the rotated wink copy */}
                  <div className="reassure">
                    {`Goes straight to ${name} — Ponti never touches it. One tap and you're square.`}
                  </div>

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
                  <div className="reassure">{picked.current!.confirmSub}</div>
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
                <div className="reassure">{picked.current!.confirmSub}</div>
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

          {/* ── In-flight phase — dismiss-locked
               Settle: directional DrawLine sweep. Others: non-directional node motion. ── */}
          {phase === 'inflight' && (
            <div className="flow-center">
              {pending.kind === 'settle' && <DrawLine />}
              {(pending.kind === 'add' || pending.kind === 'create') && <NodePop />}
              {pending.kind === 'edit' && <NodePulse />}
              {pending.kind === 'delete' && <NodeFade />}
              <div className="flow-title">{picked.current!.runningNote}</div>
              <div className="flow-sub">You can keep this open.</div>
              <div className="note">This view can&apos;t be dismissed while it runs.</div>
            </div>
          )}

          {/* ── Done phase — KnotDone closes the thread ── */}
          {phase === 'done' && (
            <div>
              <div className="flow-center">
                <KnotDone />
                <div className="flow-title">{picked.current!.doneTitle}</div>
                <div className="flow-sub">{picked.current!.doneSub}</div>

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
      )}
    </Sheet>
  )
}
