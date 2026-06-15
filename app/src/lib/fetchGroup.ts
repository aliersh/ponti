// Reads group state from both the on-chain contract (balance, members) and the
// subgraph (expense history, settlements). Also exports pure utilities for
// interpreting the balance and building the activity timeline.

import { formatUnits, getAddress, type Address } from 'viem'
import { groupAbi } from '../config'
import { publicClient } from './client'
import { querySubgraph } from './subgraph'

/** A single expense event as returned by the subgraph, normalized for UI use. */
export type ExpenseEntry = {
  id: bigint
  payer: Address
  amount: bigint
  description: string
  createdAt: number
  deleted: boolean
  /** True when the expense was edited after creation; original createdAt is preserved. */
  edited: boolean
}

export type BalanceDisplay = {
  direction: 'counterparty_owes_me' | 'i_owe_counterparty' | 'settled'
  amount: string
}

/** A single settlement event recorded on the group contract. */
export type SettlementEntry = {
  payer: Address
  payee: Address
  amount: bigint
  /** Unix seconds — matches the block timestamp of the settle() call. */
  timestamp: number
}

export async function fetchBalance(groupAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: groupAddress,
    abi: groupAbi,
    functionName: 'balance',
  })
}

const EXPENSES_QUERY = `
  query Expenses($group: ID!) {
    group(id: $group) {
      expenses(orderBy: expenseId, orderDirection: asc) {
        expenseId
        payer
        amount
        description
        createdAt
        deleted
        edited
      }
    }
  }
`

type SubgraphExpense = {
  expenseId: string
  payer: string
  amount: string
  description: string
  createdAt: string
  deleted: boolean
  edited: boolean
}

export async function fetchExpenseHistory(groupAddress: Address): Promise<ExpenseEntry[]> {
  // Lowercase: Group.id is stored as toHexString() (lowercase) in the subgraph.
  const group = groupAddress.toLowerCase()
  const data = await querySubgraph<{ group: { expenses: SubgraphExpense[] } | null }>(
    EXPENSES_QUERY,
    { group },
  )
  return (data.group?.expenses ?? []).map((e) => ({
    id: BigInt(e.expenseId),
    payer: getAddress(e.payer),
    amount: BigInt(e.amount),
    description: e.description,
    createdAt: Number(e.createdAt),
    deleted: e.deleted,
    edited: e.edited,
  }))
}

// Fetches all settlement events for the group, ordered oldest-first.
// orderDirection: asc matches buildTimeline's ascending walk expectation.
const SETTLEMENTS_QUERY = `
  query Settlements($group: ID!) {
    group(id: $group) {
      settlements(orderBy: timestamp, orderDirection: asc) {
        payer
        payee
        amount
        timestamp
      }
    }
  }
`

type SubgraphSettlement = {
  payer: string
  payee: string
  amount: string
  timestamp: string
}

/**
 * Fetches all settlement events for a group from the subgraph.
 * Returns an empty array when the group has no settlements or is not yet indexed.
 */
export async function fetchSettlements(groupAddress: Address): Promise<SettlementEntry[]> {
  // Lowercase: Group.id is stored as toHexString() (lowercase) in the subgraph.
  const group = groupAddress.toLowerCase()
  const data = await querySubgraph<{ group: { settlements: SubgraphSettlement[] } | null }>(
    SETTLEMENTS_QUERY,
    { group },
  )
  return (data.group?.settlements ?? []).map((s) => ({
    payer: getAddress(s.payer),
    payee: getAddress(s.payee),
    amount: BigInt(s.amount),
    timestamp: Number(s.timestamp),
  }))
}

/** The return type of buildTimeline. */
export type Timeline = {
  /** Expenses since the most recent settlement (or all expenses if never settled). */
  open: ExpenseEntry[]
  /** Closed segments, each bounded on the right by a settlement. Oldest first. */
  segments: { settle: SettlementEntry; items: ExpenseEntry[] }[]
}

/**
 * Builds a chronological activity timeline from a group's expense and settlement history.
 *
 * Deleted expenses are excluded entirely. Surviving expenses and settlements are merged
 * onto a single time axis (createdAt / timestamp, both unix seconds) and walked in
 * ascending order. Each settlement closes the accumulated expenses before it into a
 * segment; the remainder after the last settlement is the open (active) window.
 *
 * Tie-break: an expense with the same timestamp as a settlement sorts before it — the
 * expense belongs to the segment that settlement closes, not the one it opens.
 *
 * The result is oldest-first; the UI is responsible for reversing order for display.
 *
 * Pure function — no side effects, no fetching.
 */
export function buildTimeline(
  expenses: ExpenseEntry[],
  settlements: SettlementEntry[],
): Timeline {
  // Exclude deleted expenses; they never appear in the activity view.
  const active = expenses.filter((e) => !e.deleted)

  // Tag each item with its time coordinate and kind, then sort.
  type MergedItem =
    | { kind: 'expense'; t: number; e: ExpenseEntry }
    | { kind: 'settle'; t: number; s: SettlementEntry }

  const merged: MergedItem[] = [
    ...active.map((e): MergedItem => ({ kind: 'expense', t: e.createdAt, e })),
    ...settlements.map((s): MergedItem => ({ kind: 'settle', t: s.timestamp, s })),
  ]

  // Sort ascending by time; on equal timestamps, 'expense' sorts before 'settle'.
  merged.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t
    // Explicit tie-break: expense before settle.
    if (a.kind === b.kind) return 0
    return a.kind === 'expense' ? -1 : 1
  })

  // Walk in order: accumulate expenses; each settlement closes the current window.
  const segments: Timeline['segments'] = []
  let cur: ExpenseEntry[] = []

  for (const item of merged) {
    if (item.kind === 'expense') {
      cur.push(item.e)
    } else {
      segments.push({ settle: item.s, items: cur })
      cur = []
    }
  }

  return { open: cur, segments }
}

export async function fetchGroupMembers(
  address: Address,
): Promise<{ memberA: Address; memberB: Address }> {
  const [memberA, memberB] = await Promise.all([
    publicClient.readContract({ address, abi: groupAbi, functionName: 'memberA' }),
    publicClient.readContract({ address, abi: groupAbi, functionName: 'memberB' }),
  ])
  return { memberA, memberB }
}

// Sign convention: balance > 0 means memberB owes memberA; < 0 means memberA owes memberB.
// memberB not needed: two members only, so "not memberA" == memberB.
export function interpretBalance(
  balance: bigint,
  smartAccount: Address,
  memberA: Address,
): BalanceDisplay {
  const abs = balance < 0n ? -balance : balance
  const amount = formatUnits(abs, 6)

  if (balance === 0n) return { direction: 'settled', amount }

  const isMemberA = getAddress(smartAccount) === getAddress(memberA)
  const positiveOwesMe = isMemberA ? balance > 0n : balance < 0n

  return {
    direction: positiveOwesMe ? 'counterparty_owes_me' : 'i_owe_counterparty',
    amount,
  }
}
