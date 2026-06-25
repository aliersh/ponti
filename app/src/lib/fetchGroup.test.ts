// @vitest-environment node
// Tests for buildTimeline and interpretBalance pure utilities.
import { describe, it, expect } from 'vitest'
import { formatUnits, getAddress } from 'viem'
import { buildTimeline, interpretBalance } from './fetchGroup'
import type { ExpenseEntry, SettlementEntry } from './fetchGroup'

const ADDR_A = getAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
const ADDR_B = getAddress('0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF')

function makeExpense(overrides: Partial<ExpenseEntry> & { id: bigint; createdAt: number }): ExpenseEntry {
  return {
    payer: ADDR_A,
    amount: 1_000_000n,
    description: 'test',
    deleted: false,
    edited: false,
    ...overrides,
  }
}

function makeSettle(timestamp: number): SettlementEntry {
  return { payer: ADDR_A, payee: ADDR_B, amount: 1_000_000n, timestamp }
}

describe('buildTimeline', () => {
  it('empty expenses + empty settlements → {open:[], segments:[]}', () => {
    const result = buildTimeline([], [])
    expect(result).toEqual({ open: [], segments: [] })
  })

  it('expenses only → all in open, segments empty', () => {
    const e1 = makeExpense({ id: 1n, createdAt: 100 })
    const e2 = makeExpense({ id: 2n, createdAt: 200 })
    const result = buildTimeline([e1, e2], [])
    expect(result.segments).toHaveLength(0)
    expect(result.open).toHaveLength(2)
  })

  it('one settlement: expenses before it in segment, expenses after in open', () => {
    const e1 = makeExpense({ id: 1n, createdAt: 100 })
    const e2 = makeExpense({ id: 2n, createdAt: 300 })
    const s = makeSettle(200)
    const result = buildTimeline([e1, e2], [s])
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].items).toHaveLength(1)
    expect(result.segments[0].items[0].id).toBe(1n)
    expect(result.open).toHaveLength(1)
    expect(result.open[0].id).toBe(2n)
  })

  it('tie-break: expense.createdAt === settle.timestamp → expense is in segment', () => {
    const e = makeExpense({ id: 1n, createdAt: 100 })
    const s = makeSettle(100)
    const result = buildTimeline([e], [s])
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].items).toHaveLength(1)
    expect(result.open).toHaveLength(0)
  })

  it('N settlements → N segments oldest-first + open remainder', () => {
    const e1 = makeExpense({ id: 1n, createdAt: 50 })
    const e2 = makeExpense({ id: 2n, createdAt: 150 })
    const e3 = makeExpense({ id: 3n, createdAt: 250 })
    const s1 = makeSettle(100)
    const s2 = makeSettle(200)
    const result = buildTimeline([e1, e2, e3], [s1, s2])
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].items[0].id).toBe(1n)
    expect(result.segments[1].items[0].id).toBe(2n)
    expect(result.open[0].id).toBe(3n)
  })

  it('deleted expenses excluded from both open and segments', () => {
    const live = makeExpense({ id: 1n, createdAt: 50 })
    const dead = makeExpense({ id: 2n, createdAt: 50, deleted: true })
    const s = makeSettle(100)
    const result = buildTimeline([live, dead], [s])
    expect(result.segments[0].items).toHaveLength(1)
    expect(result.segments[0].items[0].id).toBe(1n)
  })

  it('settlement with no preceding expenses → segment with items:[]', () => {
    const s = makeSettle(100)
    const result = buildTimeline([], [s])
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].items).toHaveLength(0)
  })

  it('shuffled input produces same result as sorted input', () => {
    const e1 = makeExpense({ id: 1n, createdAt: 50 })
    const e2 = makeExpense({ id: 2n, createdAt: 150 })
    const e3 = makeExpense({ id: 3n, createdAt: 250 })
    const s = makeSettle(200)
    const sorted = buildTimeline([e1, e2, e3], [s])
    const shuffled = buildTimeline([e3, e1, e2], [s])
    expect(shuffled.segments[0].items.map((e) => e.id)).toEqual(
      sorted.segments[0].items.map((e) => e.id),
    )
    expect(shuffled.open.map((e) => e.id)).toEqual(sorted.open.map((e) => e.id))
  })
})

describe('interpretBalance', () => {
  it('balance=0n → settled with amount 0.0', () => {
    const result = interpretBalance(0n, ADDR_A, ADDR_A)
    expect(result.direction).toBe('settled')
    expect(result.amount).toBe(formatUnits(0n, 6))
  })

  it('viewer=memberA, balance>0 → counterparty_owes_me', () => {
    const result = interpretBalance(1_000_000n, ADDR_A, ADDR_A)
    expect(result.direction).toBe('counterparty_owes_me')
  })

  it('viewer=memberA, balance<0 → i_owe_counterparty', () => {
    const result = interpretBalance(-1_000_000n, ADDR_A, ADDR_A)
    expect(result.direction).toBe('i_owe_counterparty')
  })

  it('viewer=memberB, balance>0 → i_owe_counterparty (flipped)', () => {
    const result = interpretBalance(1_000_000n, ADDR_B, ADDR_A)
    expect(result.direction).toBe('i_owe_counterparty')
  })

  it('viewer=memberB, balance<0 → counterparty_owes_me (flipped)', () => {
    const result = interpretBalance(-1_000_000n, ADDR_B, ADDR_A)
    expect(result.direction).toBe('counterparty_owes_me')
  })

  it('amount = formatUnits(abs(balance), 6)', () => {
    const result = interpretBalance(1_000_000n, ADDR_A, ADDR_A)
    expect(result.amount).toBe(formatUnits(1_000_000n, 6))
  })

  it('checksummed vs lowercase viewer/memberA still match', () => {
    const lower = ADDR_A.toLowerCase() as typeof ADDR_A
    const result = interpretBalance(1_000_000n, lower, ADDR_A)
    expect(result.direction).toBe('counterparty_owes_me')
  })
})
