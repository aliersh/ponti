// @vitest-environment node
// Tests for checkSubgraphHealth and waitForSubgraphBlock.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('./client', () => ({
  publicClient: { getBlockNumber: vi.fn() },
  withRetry: async (fn: () => Promise<unknown>) => fn(),
}))

import { checkSubgraphHealth, waitForSubgraphBlock } from './subgraph'
import { publicClient } from './client'

const mockGetBlockNumber = publicClient.getBlockNumber as ReturnType<typeof vi.fn>

function stubFetch(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: async () => body,
    }),
  )
}

function metaResponse(blockNumber: number, hasIndexingErrors = false) {
  return {
    data: { _meta: { block: { number: blockNumber }, hasIndexingErrors } },
  }
}

describe('checkSubgraphHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    mockGetBlockNumber.mockReset()
  })

  it('hasIndexingErrors:true → {degraded:true, reason:"errors"}', async () => {
    stubFetch(metaResponse(90, true))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: true, reason: 'errors' })
  })

  it('headLag > 25 → {degraded:true, reason:"stalled"}', async () => {
    // head=100, meta.block=74 → lag=26
    stubFetch(metaResponse(74, false))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: true, reason: 'stalled' })
  })

  it('headLag == 25 (boundary) → not degraded', async () => {
    // head=100, meta.block=75 → lag=25 (not > 25)
    stubFetch(metaResponse(75, false))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('headLag < 25 and no errors → not degraded', async () => {
    stubFetch(metaResponse(99, false))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('res.ok=false → {degraded:false, reason:null}', async () => {
    stubFetch({}, false)
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('missing _meta in json → {degraded:false, reason:null}', async () => {
    stubFetch({ data: {} })
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('fetch rejects → {degraded:false, reason:null}', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('getBlockNumber rejects → {degraded:false, reason:null}', async () => {
    stubFetch(metaResponse(90, false))
    mockGetBlockNumber.mockRejectedValue(new Error('rpc error'))
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: false, reason: null })
  })

  it('both errors-flag AND headLag>25 → errors wins', async () => {
    stubFetch(metaResponse(50, true))
    mockGetBlockNumber.mockResolvedValue(100n)
    const result = await checkSubgraphHealth()
    expect(result).toEqual({ degraded: true, reason: 'errors' })
  })
})

describe('waitForSubgraphBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reaches on first poll → true (no timer advance needed)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { _meta: { block: { number: 100 } } } }),
      }),
    )
    const result = await waitForSubgraphBlock(50n)
    expect(result).toBe(true)
  })

  it('block.number >= minBlock boundary: equal → true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { _meta: { block: { number: 50 } } } }),
      }),
    )
    const result = await waitForSubgraphBlock(50n)
    expect(result).toBe(true)
  })

  it('reaches on attempt 3 → true', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        calls++
        const number = calls >= 3 ? 100 : 0
        return { ok: true, json: async () => ({ data: { _meta: { block: { number } } } }) }
      }),
    )
    const promise = waitForSubgraphBlock(50n)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe(true)
    expect(calls).toBe(3)
  })

  it('never reaches in 8 → false, fetch called exactly 8 times', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        calls++
        return { ok: true, json: async () => ({ data: { _meta: { block: { number: 0 } } } }) }
      }),
    )
    const promise = waitForSubgraphBlock(50n)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe(false)
    expect(calls).toBe(8)
  })

  it('one poll throws then succeeds → true', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        calls++
        if (calls === 1) throw new Error('fail')
        return { ok: true, json: async () => ({ data: { _meta: { block: { number: 100 } } } }) }
      }),
    )
    const promise = waitForSubgraphBlock(50n)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe(true)
  })

  it('all 8 throws → false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('always fails')))
    const promise = waitForSubgraphBlock(50n)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBe(false)
  })

  it('≤8 fetch calls total when reaching on attempt 3', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => {
        calls++
        const number = calls >= 3 ? 100 : 0
        return { ok: true, json: async () => ({ data: { _meta: { block: { number } } } }) }
      }),
    )
    const promise = waitForSubgraphBlock(50n)
    await vi.runAllTimersAsync()
    await promise
    expect(calls).toBeLessThanOrEqual(8)
  })
})
