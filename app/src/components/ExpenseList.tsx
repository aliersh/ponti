// ExpenseList.tsx — Activity timeline for the Group-detail screen.
//
// Renders a vertical timeline where settlements act as dividers and the
// expenses before each settle collapse into an expandable segment. Uses
// buildTimeline() (pure, from fetchGroup.ts) to partition expenses into an
// open window and closed segments; sub-components are defined at module scope
// (not nested) to prevent remounting on every parent state update, which would
// drop each row's local `open` state.

import { useState, useMemo } from 'react'
import { getAddress } from 'viem'
import type { Address, Hex } from 'viem'
import { submitDeleteExpense } from '../lib/deleteExpense'
import { buildTimeline } from '../lib/fetchGroup'
import type { ExpenseEntry, SettlementEntry } from '../lib/fetchGroup'
import { getIdentity } from '../lib/identity'
import {
  Button, Num, money, Pill, Skeleton,
  Pencil, Trash, Check, Right,
} from '../ui'
import { useFlow } from '../flow/FlowContext'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  expenses: ExpenseEntry[]
  settlements: SettlementEntry[]
  loadingDetail: boolean
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onMutated: () => Promise<void>
  onEdit: (expense: ExpenseEntry) => void
}

// ── Date helper ────────────────────────────────────────────────────────────────

// Converts a unix-seconds timestamp to a compact locale string: "Jun 12".
function fmtDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
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
// muted prop → opacity 0.92 for collapsed-segment items.
function ExpenseRowWrap({
  e,
  smartAccount,
  counterparty,
  muted,
  onEdit,
  onDeleteExpense,
}: {
  e: ExpenseEntry
  smartAccount: Address
  counterparty: Address
  muted?: boolean
  onEdit: (e: ExpenseEntry) => void
  onDeleteExpense: (e: ExpenseEntry) => void
}) {
  const [open, setOpen] = useState(false)

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
            // bubbles to GroupDetail — edit opens FormScreen
            onClick={() => onEdit(e)}
            style={{ padding: '8px 12px', fontSize: 13 }}
          >
            <Pencil color="var(--accent)" size={14} /> Edit
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDeleteExpense(e)}
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
  onEdit,
}: Props) {
  const flow = useFlow()

  function onDeleteExpense(expense: ExpenseEntry) {
    if (!send) return
    // FlowWidget confirm screen is the consent gate — no window.confirm needed.
    flow.start({
      kind: 'delete',
      title: 'Remove this expense?',
      confirmLabel: 'Remove expense',
      rows: [
        { label: 'Removing', value: expense.description },
        { label: 'Amount', value: `${money(expense.amount)} USDC` },
      ],
      submit: () => submitDeleteExpense(send, groupAddress, expense.id),
      onComplete: onMutated,
    })
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

  const isEmpty = open.length === 0 && segments.length === 0

  return (
    <div style={{ marginTop: 6 }}>
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
          onEdit={onEdit}
          onDeleteExpense={onDeleteExpense}
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
                    onEdit={onEdit}
                    onDeleteExpense={onDeleteExpense}
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
