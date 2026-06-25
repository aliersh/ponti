// @vitest-environment node
// Tests for fetchMyGroups — subgraph group mapping and address checksumming.
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getAddress } from 'viem'
import { fetchMyGroups } from './fetchGroups'

vi.mock('./subgraph', () => ({ querySubgraph: vi.fn() }))

import { querySubgraph } from './subgraph'
const mockQuerySubgraph = querySubgraph as ReturnType<typeof vi.fn>

const VIEWER = getAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
const ADDR_B = getAddress('0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF')
const GROUP_ADDR = getAddress('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')

function subgraphGroup(id: string, memberA: string, memberB: string, createdBlock = '100') {
  return { id, memberA, memberB, createdBlock }
}

describe('fetchMyGroups', () => {
  beforeEach(() => {
    mockQuerySubgraph.mockReset()
  })

  it('viewer=memberA → counterparty=memberB', async () => {
    mockQuerySubgraph.mockResolvedValueOnce({
      groups: [subgraphGroup(GROUP_ADDR.toLowerCase(), VIEWER.toLowerCase(), ADDR_B.toLowerCase())],
    })
    const result = await fetchMyGroups(VIEWER)
    expect(result).toHaveLength(1)
    expect(result[0].counterparty).toBe(ADDR_B)
  })

  it('viewer=memberB → counterparty=memberA', async () => {
    mockQuerySubgraph.mockResolvedValueOnce({
      groups: [subgraphGroup(GROUP_ADDR.toLowerCase(), ADDR_B.toLowerCase(), VIEWER.toLowerCase())],
    })
    const result = await fetchMyGroups(VIEWER)
    expect(result[0].counterparty).toBe(ADDR_B)
  })

  it('address checksumming: subgraph returns lowercase, result has checksummed addresses', async () => {
    mockQuerySubgraph.mockResolvedValueOnce({
      groups: [subgraphGroup(GROUP_ADDR.toLowerCase(), VIEWER.toLowerCase(), ADDR_B.toLowerCase())],
    })
    const result = await fetchMyGroups(VIEWER)
    expect(result[0].address).toBe(GROUP_ADDR)
    expect(result[0].memberA).toBe(VIEWER)
    expect(result[0].memberB).toBe(ADDR_B)
  })

  it('empty groups array → returns []', async () => {
    mockQuerySubgraph.mockResolvedValueOnce({ groups: [] })
    const result = await fetchMyGroups(VIEWER)
    expect(result).toEqual([])
  })
})
