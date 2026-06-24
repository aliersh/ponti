import { SUBGRAPH_URL } from '../config'
import { withRetry } from './client'

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
