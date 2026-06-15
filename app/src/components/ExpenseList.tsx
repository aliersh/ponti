// ExpenseList.tsx — Activity timeline for the Group-detail screen.
//
// Renders a vertical timeline where settlements act as dividers and the
// expenses before each settle collapse into an expandable segment. Uses
// buildTimeline() (pure, from fetchGroup.ts) to partition expenses into an
// open window and closed segments; sub-components are defined at module scope
// (not nested) to prevent remounting on every edit-state update, which would
// drop input focus and reset each row's local `open` state.

import { useState, useMemo } from 'react'
import { formatUnits, getAddress, parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { publicClient } from '../lib/client'
import { submitEditExpense } from '../lib/editExpense'
import { submitDeleteExpense } from '../lib/deleteExpense'
import { buildTimeline } from '../lib/fetchGroup'
import type { ExpenseEntry, SettlementEntry } from '../lib/fetchGroup'
import { getIdentity } from '../lib/identity'
import {
  Button, Num, money, Field, Input, Pill, Skeleton,
  Pencil, Trash, Check, Right,
} from '../ui'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

// ── Shared types ───────────────────────────────────────────────────────────────

// EditProps threads all edit/delete state and callbacks from ExpenseList down
// into ExpenseRowWrap and InlineEditForm — necessary because those components
// live at module scope and cannot close over ExpenseList's state directly.
type EditProps = {
  editingId: bigint | null
  editPayer: 'me' | 'counterparty'
  editAmount: string
  editDescription: string
  editSubmitting: boolean
  editError: string | null
  setEditPayer: (v: 'me' | 'counterparty') => void
  setEditAmount: (v: string) => void
  setEditDescription: (v: string) => void
  onStartEdit: (e: ExpenseEntry) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  deleteSubmitting: boolean
  onDeleteExpense: (id: bigint) => void
}

type Props = {
  expenses: ExpenseEntry[]
  settlements: SettlementEntry[]
  loadingDetail: boolean
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onMutated: () => Promise<void>
}

// ── Date helper ────────────────────────────────────────────────────────────────

// Converts a unix-seconds timestamp to a compact locale string: "Jun 12".
function fmtDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ── InlineEditForm ─────────────────────────────────────────────────────────────

// Rendered by ExpenseRowWrap in place of the row when editingId === e.id.
//
// RADIO NAME GOTCHA: edit-payer radios use name="edit-payer", not name="payer".
// Both this form and AddExpenseForm can be in the DOM simultaneously (add panel
// is toggled independently of edit). A shared name would silently merge them
// into one selection group, making one payer radio clear the other form's state.
function InlineEditForm({
  ep,
  send,
}: {
  ep: EditProps
  send: SendUserOperation | undefined
}) {
  return (
    <div
      className="bg-surface-2 rounded-sm"
      style={{ padding: '12px 10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {/* Payer radios — name="edit-payer" intentionally distinct from Add form's name="payer" */}
      <div style={{ display: 'flex', gap: 18 }}>
        <label
          className="font-ui"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="edit-payer"
            value="me"
            checked={ep.editPayer === 'me'}
            onChange={() => ep.setEditPayer('me')}
          />
          I paid
        </label>
        <label
          className="font-ui"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="edit-payer"
            value="counterparty"
            checked={ep.editPayer === 'counterparty'}
            onChange={() => ep.setEditPayer('counterparty')}
          />
          Counterparty paid
        </label>
      </div>

      <Field label="Amount">
        <Input
          placeholder="e.g. 12.50"
          value={ep.editAmount}
          onChange={(ev) => ep.setEditAmount(ev.target.value)}
          inputMode="decimal"
        />
      </Field>

      <Field label="Description">
        <Input
          placeholder="What was this for?"
          value={ep.editDescription}
          onChange={(ev) => ep.setEditDescription(ev.target.value)}
        />
      </Field>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <Button
          onClick={ep.onSaveEdit}
          disabled={ep.editSubmitting || !send}
        >
          {ep.editSubmitting ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="quiet" onClick={ep.onCancelEdit} disabled={ep.editSubmitting}>
          Cancel
        </Button>
      </div>

      {/* Edit error — muted note, never crimson */}
      {ep.editError && (
        <p
          className="font-ui"
          style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}
        >
          {ep.editError}
        </p>
      )}
    </div>
  )
}

// ── ExpenseRow ─────────────────────────────────────────────────────────────────

// Pure display row — no local state, no interactions.
// Amount always in --ink (money rule §5.3), tabular figures.
function ExpenseRow({
  e,
  smartAccount,
  counterparty,
}: {
  e: ExpenseEntry
  smartAccount: Address
  counterparty: Address
}) {
  const mine = getAddress(e.payer) === getAddress(smartAccount)
  const identity = getIdentity(counterparty)
  const initial = mine ? 'Y' : identity.initial

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px' }}>
      {/* Payer avatar circle — 34px */}
      <div
        style={{
          width: 34, height: 34, borderRadius: '50%',
          flex: '0 0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: mine ? 'var(--accent-soft)' : 'var(--surface-2)',
          color: mine ? 'var(--accent)' : 'var(--muted)',
          fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
        }}
      >
        {initial}
      </div>

      {/* Description + sub-line */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            className="font-ui"
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {e.description}
          </span>
          {e.edited && (
            <Pill tone="neutral">
              <Pencil color="var(--muted)" size={11} /> edited
            </Pill>
          )}
        </div>
        <span className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {mine ? 'You paid' : `${identity.label} paid`} · {fmtDate(e.createdAt)}
        </span>
      </div>

      {/* Amount — tabular figures, always ink */}
      <Num size={15} weight={700}>{money(e.amount)}</Num>
    </div>
  )
}

// ── ExpenseRowWrap ─────────────────────────────────────────────────────────────

// Tappable wrapper around ExpenseRow. Click toggles the local `open` state,
// which lifts the row background and reveals Edit / Delete actions.
// When editingId === e.id, renders InlineEditForm in place of the row + actions.
// muted prop → opacity 0.92 for collapsed-segment items.
function ExpenseRowWrap({
  e,
  smartAccount,
  counterparty,
  muted,
  ep,
  send,
}: {
  e: ExpenseEntry
  smartAccount: Address
  counterparty: Address
  muted?: boolean
  ep: EditProps
  send: SendUserOperation | undefined
}) {
  const [open, setOpen] = useState(false)
  const isEditing = ep.editingId === e.id

  // When editing, show the inline form in place of the row entirely.
  if (isEditing) {
    return <InlineEditForm ep={ep} send={send} />
  }

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        opacity: muted ? 0.92 : 1,
        background: open ? 'var(--surface-2)' : 'transparent',
        borderRadius: open ? 'var(--radius-sm)' : 0,
        transition: 'background .15s',
      }}
    >
      {/* Row — click toggles action strip */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: 'pointer', padding: open ? '0 8px' : 0 }}
      >
        <ExpenseRow e={e} smartAccount={smartAccount} counterparty={counterparty} />
      </div>

      {/* Action strip — Edit + Delete, revealed on tap */}
      {open && (
        <div style={{ display: 'flex', gap: 8, padding: '2px 10px 12px' }}>
          <Button
            variant="soft"
            onClick={() => ep.onStartEdit(e)}
            style={{ padding: '8px 12px', fontSize: 13 }}
          >
            <Pencil color="var(--accent)" size={14} /> Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => ep.onDeleteExpense(e.id)}
            disabled={ep.deleteSubmitting}
            style={{ padding: '8px 12px', fontSize: 13 }}
          >
            <Trash color="var(--muted)" size={14} /> Delete
          </Button>
        </div>
      )}
    </div>
  )
}

// ── SettleDivider ──────────────────────────────────────────────────────────────

// Collapsed-by-default segment header. Click toggles the segment open/closed.
// Chevron rotates 0°→90° on expand. whoSettled = "You" when the smart account
// initiated the settlement, else the counterparty's identity label.
function SettleDivider({
  s,
  smartAccount,
  counterparty,
  collapsed,
  onToggle,
  count,
}: {
  s: SettlementEntry
  smartAccount: Address
  counterparty: Address
  collapsed: boolean
  onToggle: () => void
  count: number
}) {
  const whoSettled =
    getAddress(s.payer) === getAddress(smartAccount)
      ? 'You'
      : getIdentity(counterparty).label

  return (
    <button
      onClick={onToggle}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        gap: 10, padding: '10px 2px',
        width: '100%', boxSizing: 'border-box',
      }}
    >
      {/* Check circle — 26px, muted */}
      <div style={{ width: 34, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Check color="var(--muted)" size={14} />
        </div>
      </div>

      {/* Labels */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span className="font-ui" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--muted)' }}>
          Settled up · {fmtDate(s.timestamp)}
        </span>
        <span className="font-ui" style={{ fontSize: 12, color: 'var(--muted)' }}>
          {whoSettled} settled {money(s.amount)} USDC · {count} item{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Chevron — rotates 90° when expanded */}
      <span
        style={{
          color: 'var(--muted)',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          transition: 'transform .2s',
          display: 'inline-flex',
        }}
      >
        <Right color="var(--muted)" size={16} />
      </span>
    </button>
  )
}

// ── ExpenseList ────────────────────────────────────────────────────────────────

export function ExpenseList({
  expenses,
  settlements,
  loadingDetail,
  send,
  groupAddress,
  smartAccount,
  counterparty,
  onMutated,
}: Props) {
  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<bigint | null>(null)
  const [editPayer, setEditPayer] = useState<'me' | 'counterparty'>('me')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function onStartEdit(expense: ExpenseEntry) {
    setEditingId(expense.id)
    setEditPayer(getAddress(expense.payer) === getAddress(smartAccount) ? 'me' : 'counterparty')
    setEditAmount(formatUnits(expense.amount, 6))
    setEditDescription(expense.description)
    setEditError(null)
  }

  function onCancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function onSaveEdit() {
    if (!send || editingId === null) return
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(editAmount, 6)
    } catch {
      setEditError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setEditError('Amount must be greater than 0.')
      return
    }
    if (!editDescription.trim()) {
      setEditError('Description is required.')
      return
    }
    const payer = editPayer === 'me' ? smartAccount : counterparty
    setEditSubmitting(true)
    setEditError(null)
    try {
      const hash = await submitEditExpense(
        send, groupAddress, editingId, payer, parsedAmount, editDescription.trim(),
      )
      await publicClient.waitForTransactionReceipt({ hash })
      await onMutated()
      setEditingId(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function onDeleteExpense(expenseId: bigint) {
    if (!send) return
    // window.confirm is the interim delete gate; TODO: replace with a modal confirmation.
    if (!window.confirm('Delete this expense?')) return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const hash = await submitDeleteExpense(send, groupAddress, expenseId)
      await publicClient.waitForTransactionReceipt({ hash })
      await onMutated()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Timeline build ──────────────────────────────────────────────────────────
  // buildTimeline excludes deleted expenses and partitions the rest into an open
  // window (since last settle) and closed segments. Result is oldest-first;
  // display reverses both the open list and the segments array.
  const { open, segments } = useMemo(
    () => buildTimeline(expenses, settlements),
    [expenses, settlements],
  )

  // Segment expand state — keyed by settlement timestamp (SettlementEntry has no id).
  const [openSeg, setOpenSeg] = useState<Record<number, boolean>>({})

  // Prop bag threaded into module-scope sub-components so they can reach edit state.
  const ep: EditProps = {
    editingId, editPayer, editAmount, editDescription,
    editSubmitting, editError,
    setEditPayer, setEditAmount, setEditDescription,
    onStartEdit, onCancelEdit, onSaveEdit,
    deleteSubmitting, onDeleteExpense,
  }

  const isEmpty = open.length === 0 && segments.length === 0

  return (
    <div style={{ marginTop: 6 }}>
      {/* Delete error — muted note, not crimson */}
      {deleteError && (
        <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)', padding: '4px 2px' }}>
          {deleteError}
        </p>
      )}

      {/* Loading skeletons — two rows while initial fetch is in flight */}
      {loadingDetail && isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
          <Skeleton w="90%" h={14} r={7} />
          <Skeleton w="70%" h={14} r={7} />
        </div>
      )}

      {/* Empty state — only after load completes */}
      {!loadingDetail && isEmpty && (
        <p className="font-ui" style={{ fontSize: 14, color: 'var(--muted)', padding: '8px 2px' }}>
          No expenses yet.
        </p>
      )}

      {/* Open (active) expenses — newest-first */}
      {open.slice().reverse().map((e) => (
        <ExpenseRowWrap
          key={String(e.id)}
          e={e}
          smartAccount={smartAccount}
          counterparty={counterparty}
          ep={ep}
          send={send}
        />
      ))}

      {/* Closed segments — newest-first; each starts with a SettleDivider.
          Items within a segment are muted (opacity 0.92) to signal they're settled. */}
      {segments.slice().reverse().map((seg) => {
        const isOpen = !!openSeg[seg.settle.timestamp]
        return (
          <div
            key={seg.settle.timestamp}
            style={{ borderTop: '1px solid var(--border)', marginTop: 6 }}
          >
            <SettleDivider
              s={seg.settle}
              smartAccount={smartAccount}
              counterparty={counterparty}
              collapsed={!isOpen}
              count={seg.items.length}
              onToggle={() =>
                setOpenSeg((o) => ({ ...o, [seg.settle.timestamp]: !o[seg.settle.timestamp] }))
              }
            />
            {isOpen && (
              <div style={{ paddingLeft: 6, opacity: 0.85 }}>
                {seg.items.slice().reverse().map((e) => (
                  <ExpenseRowWrap
                    key={String(e.id)}
                    e={e}
                    smartAccount={smartAccount}
                    counterparty={counterparty}
                    muted
                    ep={ep}
                    send={send}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
