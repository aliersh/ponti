import { SUBGRAPH_URL } from '../config'
import { publicClient, withRetry } from './client'

// Base Sepolia ~2s blocks; healthy indexers trail by single-digit blocks.
// 25 blocks (~50s) is a generous margin that only trips on a genuine stall.
const HEAD_LAG_THRESHOLD = 25

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`)
    const json = await res.json()
    if (json.errors) throw new Error(json.errors[0].message)
    return json.data as T
  })
}

/**
 * Probes the subgraph for two complementary degradation signals:
 * - hasIndexingErrors: mapping failure (schema/handler crash).
 * - head-lag: frozen-block stall that the error flag misses (indexer alive but not advancing).
 * Never throws — returns {degraded:false, reason:null} on any fetch or parse failure
 * so the UI never false-alarms when health is simply undetermined.
 */
export async function checkSubgraphHealth(): Promise<{
  degraded: boolean
  reason: 'errors' | 'stalled' | null
}> {
  const HEALTH_QUERY = `{ _meta { block { number } hasIndexingErrors } }`
  try {
    // Single direct fetch (no withRetry) — a degraded indexer would make retries slow,
    // and the catch already handles failure gracefully.
    const [res, head] = await Promise.all([
      fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: HEALTH_QUERY }),
      }),
      publicClient.getBlockNumber(),
    ])

    if (!res.ok) return { degraded: false, reason: null }
    const json = await res.json()
    const meta = json?.data?._meta
    if (!meta || meta.block?.number == null) return { degraded: false, reason: null }

    const { hasIndexingErrors } = meta
    const headLag = head - BigInt(meta.block.number)

    if (hasIndexingErrors) return { degraded: true, reason: 'errors' }
    if (headLag > BigInt(HEAD_LAG_THRESHOLD)) return { degraded: true, reason: 'stalled' }
    return { degraded: false, reason: null }
  } catch {
    return { degraded: false, reason: null }
  }
}

// Polls _meta until the indexed block reaches minBlock, or 8 attempts are exhausted.
// Returns true if the indexed block reached minBlock within the 8-attempt budget,
// false if exhausted without reaching. Never throws.
export async function waitForSubgraphBlock(minBlock: bigint): Promise<boolean> {
  const QUERY = `{ _meta { block { number } } }`
  for (let i = 0; i < 8; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1000))
    try {
      const data = await querySubgraph<{ _meta: { block: { number: number } } }>(QUERY)
      // _meta.block.number is a GraphQL Int — convert to bigint for safe comparison.
      if (BigInt(data._meta.block.number) >= minBlock) return true
    } catch {
      // Ignore individual poll errors; exhaust the budget or succeed next attempt.
    }
  }
  return false
}
