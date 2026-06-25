// @vitest-environment node
// Tests for fetchHomeBalances — signed balance aggregation across groups.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getAddress } from 'viem'
import type { Address } from 'viem'
import { fetchHomeBalances } from './homeBalances'
import type { GroupItem } from './fetchGroups'

vi.mock('./fetchGroup', () => ({ fetchBalance: vi.fn() }))

import { fetchBalance } from './fetchGroup'
const mockFetchBalance = fetchBalance as ReturnType<typeof vi.fn>

const VIEWER = getAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
const ADDR_B = getAddress('0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF')
const GROUP1 = getAddress('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')
const GROUP2 = getAddress('0x90F79bf6EB2c4f870365E785982E1f101E93b906')

function makeGroup(address: Address, memberA: Address, memberB: Address): GroupItem {
  return {
    address,
    memberA,
    memberB,
    counterparty: memberA === getAddress(VIEWER) ? memberB : memberA,
    createdBlock: 1n,
  }
}

describe('fetchHomeBalances', () => {
  beforeEach(() => {
    mockFetchBalance.mockReset()
  })

  it('empty groups → {byGroup:{}, net:0n}, fetchBalance never called', async () => {
    const result = await fetchHomeBalances([], VIEWER)
    expect(result).toEqual({ byGroup: {}, net: 0n })
    expect(mockFetchBalance).not.toHaveBeenCalled()
  })

  it('viewer=memberA → signed=raw (positive stays positive)', async () => {
    mockFetchBalance.mockResolvedValueOnce(5_000_000n)
    const group = makeGroup(GROUP1, VIEWER, ADDR_B)
    const result = await fetchHomeBalances([group], VIEWER)
    expect(result.byGroup[GROUP1]).toBe(5_000_000n)
    expect(result.net).toBe(5_000_000n)
  })

  it('viewer=memberB → signed=-raw (positive becomes negative)', async () => {
    mockFetchBalance.mockResolvedValueOnce(3_000_000n)
    const group = makeGroup(GROUP1, ADDR_B, VIEWER)
    const result = await fetchHomeBalances([group], VIEWER)
    expect(result.byGroup[GROUP1]).toBe(-3_000_000n)
    expect(result.net).toBe(-3_000_000n)
  })

  it('net = sum across mixed-direction groups', async () => {
    mockFetchBalance
      .mockResolvedValueOnce(4_000_000n)
      .mockResolvedValueOnce(1_000_000n)
    const g1 = makeGroup(GROUP1, VIEWER, ADDR_B)
    const g2 = makeGroup(GROUP2, ADDR_B, VIEWER)
    const result = await fetchHomeBalances([g1, g2], VIEWER)
    // g1: +4, g2: -1 (viewer is memberB so -raw)
    expect(result.net).toBe(3_000_000n)
  })

  it('byGroup keyed by checksummed group address', async () => {
    mockFetchBalance.mockResolvedValueOnce(1_000_000n)
    const group = makeGroup(GROUP1, VIEWER, ADDR_B)
    const result = await fetchHomeBalances([group], VIEWER)
    expect(Object.keys(result.byGroup)).toContain(GROUP1)
  })

  it('fetchBalance called with correct group addresses in order', async () => {
    mockFetchBalance.mockResolvedValue(0n)
    const g1 = makeGroup(GROUP1, VIEWER, ADDR_B)
    const g2 = makeGroup(GROUP2, VIEWER, ADDR_B)
    await fetchHomeBalances([g1, g2], VIEWER)
    expect(mockFetchBalance).toHaveBeenNthCalledWith(1, GROUP1)
    expect(mockFetchBalance).toHaveBeenNthCalledWith(2, GROUP2)
  })
})
