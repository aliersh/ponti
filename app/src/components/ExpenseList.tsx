// ExpenseList.tsx — Activity timeline for the Group-detail screen.
//
// The timeline IS a vertical line (.tl): each expense is an open node (.exp),
// each settlement is a filled sage knot (.knot) that closes the thread above it.
// buildTimeline() partitions expenses into an open window and closed segments;
// sub-components are at module scope to prevent remounting on parent state updates.

import { useState, useMemo } from 'react'
import { formatUnits, getAddress } from 'viem'
import type { Address, Hex } from 'viem'
import { submitDeleteExpense } from '../lib/deleteExpense'
import { submitEditExpense } from '../lib/editExpense'
import { buildTimeline } from '../lib/fetchGroup'
import type { ExpenseEntry, SettlementEntry } from '../lib/fetchGroup'
import { getIdentity } from '../lib/identity'
import {
  money, Pill,
  Pencil, Trash, Skeleton,
} from '../ui'
import { useFlow } from '../flow/FlowContext'
import { EmptyState } from './EmptyState'

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
  /** Locks edit and delete while the post-write subgraph refresh is pending. */
  isRefreshing: boolean
}

// ── Date helper ────────────────────────────────────────────────────────────────

function fmtDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ── ExpenseRow ─────────────────────────────────────────────────────────────────

// Inner row content — description, edited pill, amount, and meta line.
// .exp and position:relative live on the outer ExpenseRowWrap so the action strip
// sits inside the same border-bottom boundary.
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

  return (
    <>
      <div className="top">
        <span className="for">
          {e.description}
          {e.edited && (
            <span style={{ marginLeft: 6 }}>
              <Pill>edited</Pill>
            </span>
          )}
        </span>
        <span className="amt">{money(e.amount)}</span>
      </div>
      <div className="meta">
        {mine ? 'You paid' : (identity.named ? `${identity.label} paid` : 'They paid')} · {fmtDate(e.createdAt)}
      </div>
    </>
  )
}

// ── ExpenseRowWrap ─────────────────────────────────────────────────────────────

// .exp is on this wrapper so the border-bottom and the open hollow axis node
// enclose both the row content and the action strip — the strip sits inside
// the row boundary, not floating between two hairlines.
// muted prop → opacity 0.85 for collapsed-segment items.
function ExpenseRowWrap({
  e,
  smartAccount,
  counterparty,
  muted,
  isRefreshing,
  send,
  onEdit,
  onDeleteExpense,
}: {
  e: ExpenseEntry
  smartAccount: Address
  counterparty: Address
  muted?: boolean
  isRefreshing: boolean
  send: SendUserOperation | undefined
  onEdit: (e: ExpenseEntry) => void
  onDeleteExpense: (e: ExpenseEntry) => void
}) {
  const [open, setOpen] = useState(false)
  const disabled = isRefreshing || !send

  return (
    <div
      className={`exp${open ? ' exp--open' : ''}`}
      style={{ opacity: muted ? 0.85 : 1 }}
    >
      {/* Row tap target — toggles the action tray; blocked while list is known-stale */}
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          cursor: disabled ? 'default' : 'pointer',
          pointerEvents: disabled ? 'none' : undefined,
        }}
      >
        <ExpenseRow e={e} smartAccount={smartAccount} counterparty={counterparty} />
      </div>

      {/* Action tray — Edit + Delete; revealed non-directionally via .reveal */}
      {open && (
        <div className="reveal exp-tray">
          <button
            className="exp-action"
            disabled={disabled}
            onClick={() => onEdit(e)}
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            className="exp-action"
            disabled={disabled}
            onClick={() => onDeleteExpense(e)}
          >
            <Trash size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── SettleDivider ──────────────────────────────────────────────────────────────

// Settlement knot (.knot): a filled sage node that closes the thread above it.
// The .row strips browser button defaults with all:unset; layout props added back explicitly.
// Chevron rotates 0°→90° when the segment expands.
function SettleDivider({
  s,
  collapsed,
  onToggle,
  count,
}: {
  s: SettlementEntry
  collapsed: boolean
  onToggle: () => void
  count: number
}) {
  return (
    <div className="knot">
      <button
        onClick={onToggle}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          width: '100%',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        <span className="lbl">Settled up · {fmtDate(s.timestamp)}</span>
        <span className="cnt">
          {count} expense{count !== 1 ? 's' : ''} squared away{' '}
          <span
            className="chev"
            style={{
              display: 'inline-block',
              transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform .2s',
            }}
          >
            ›
          </span>
        </span>
      </button>
    </div>
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
  isRefreshing,
}: Props) {
  const flow = useFlow()
  const identity = getIdentity(counterparty)
  const cpLabel = identity.named ? identity.label : 'them'

  function onDeleteExpense(expense: ExpenseEntry) {
    if (!send) return
    // FlowWidget confirm screen is the consent gate — no window.confirm needed.
    flow.start({
      kind: 'delete',
      title: 'Remove this expense?',
      confirmLabel: 'Remove expense',
      who: cpLabel,
      rows: [
        { label: 'For', value: expense.description },
        { label: 'Amount', value: `${money(expense.amount)} USDC` },
      ],
      submit: () => submitDeleteExpense(send, groupAddress, expense.id),
      onComplete: onMutated,
    })
  }

  // Edit opens the flow at the input phase with pre-filled values from the expense.
  // The deleteFlow is built here where the expense id is known — FlowWidget never
  // reconstructs it from inputInitial (which has no id).
  function onEdit(expense: ExpenseEntry) {
    if (!send) return

    const initialPayer: 'me' | 'counterparty' =
      getAddress(expense.payer) === getAddress(smartAccount) ? 'me' : 'counterparty'
    const payerLabel = initialPayer === 'me' ? 'You' : cpLabel

    const deleteFlow = {
      kind: 'delete' as const,
      title: 'Delete expense',
      confirmLabel: 'Delete expense',
      who: cpLabel,
      rows: [
        { label: 'For', value: expense.description },
        { label: 'Amount', value: `${money(expense.amount)} USDC`, strong: true },
      ],
      submit: () => submitDeleteExpense(send, groupAddress, expense.id),
      onComplete: onMutated,
    }

    flow.start({
      kind: 'edit',
      title: 'Edit expense',
      confirmLabel: 'Save changes',
      who: cpLabel,
      rows: [
        { label: 'Who paid', value: payerLabel },
        { label: 'Amount', value: `${money(expense.amount)} USDC`, strong: true },
        { label: 'For', value: expense.description },
      ],
      prevValue: money(expense.amount),
      inputInitial: {
        mode: 'edit',
        amount: formatUnits(expense.amount, 6),
        description: expense.description,
        payer: initialPayer,
        prevValue: money(expense.amount),
      },
      buildSubmit: ({ amount, description, payer }) => {
        const payerAddress = payer === 'me' ? smartAccount : counterparty
        const payerLbl = payer === 'me' ? 'You' : cpLabel
        return {
          submit: () => submitEditExpense(send, groupAddress, expense.id, payerAddress, amount, description),
          rows: [
            { label: 'Who paid', value: payerLbl },
            { label: 'Amount', value: `${money(amount)} USDC`, strong: true },
            { label: 'For', value: description },
          ],
        }
      },
      deleteFlow,
      onComplete: onMutated,
    })
  }

  const { open, segments } = useMemo(
    () => buildTimeline(expenses, settlements),
    [expenses, settlements],
  )

  // Segment expand state — keyed by settlement timestamp (SettlementEntry has no id).
  const [openSeg, setOpenSeg] = useState<Record<number, boolean>>({})

  const isEmpty = open.length === 0 && segments.length === 0

  // Empty after load — estate block stands alone, outside the timeline spine
  if (!loadingDetail && isEmpty) {
    return (
      <EmptyState
        icon={
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
            <line x1="3" y1="5" x2="19" y2="5" stroke="var(--accent-strong)" strokeWidth="1.8" />
            <circle cx="3" cy="5" r="2.6" fill="var(--accent-strong)" />
            <circle cx="19" cy="5" r="2.6" fill="var(--accent-strong)" />
          </svg>
        }
        title="No expenses yet"
        body="Add the first thing you two split and Ponti starts keeping the count."
      />
    )
  }

  return (
    <div className="tl">
      {/* Loading skeletons — two rows while initial fetch is in flight */}
      {loadingDetail && isEmpty && (
        <>
          <div className="exp">
            <Skeleton w="90%" h={14} r={7} />
          </div>
          <div className="exp">
            <Skeleton w="70%" h={14} r={7} />
          </div>
        </>
      )}

      {/* Open (active) expenses — newest-first */}
      {open.slice().reverse().map((e) => (
        <ExpenseRowWrap
          key={String(e.id)}
          e={e}
          smartAccount={smartAccount}
          counterparty={counterparty}
          isRefreshing={isRefreshing}
          send={send}
          onEdit={onEdit}
          onDeleteExpense={onDeleteExpense}
        />
      ))}

      {/* Closed segments — newest-first; each starts with a knot divider.
          Items within a segment are muted (opacity 0.85) to signal they're settled. */}
      {segments.slice().reverse().map((seg) => {
        const isOpen = !!openSeg[seg.settle.timestamp]
        return (
          <div key={seg.settle.timestamp}>
            <SettleDivider
              s={seg.settle}
              collapsed={!isOpen}
              count={seg.items.length}
              onToggle={() =>
                setOpenSeg((o) => ({ ...o, [seg.settle.timestamp]: !o[seg.settle.timestamp] }))
              }
            />
            {isOpen && (
              <div className="reveal" style={{ paddingLeft: 6 }}>
                {seg.items.slice().reverse().map((e) => (
                  <ExpenseRowWrap
                    key={String(e.id)}
                    e={e}
                    smartAccount={smartAccount}
                    counterparty={counterparty}
                    muted
                    isRefreshing={isRefreshing}
                    send={send}
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
