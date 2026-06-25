import { getAddress, type Address } from 'viem'
import { fetchBalance } from './fetchGroup'
import { type GroupItem } from './fetchGroups'

export type HomeBalances = {
  byGroup: Record<Address, bigint>
  net: bigint
}

/**
 * Fetches the signed balance for every group in parallel and converts each
 * from memberA-perspective (raw) to viewer-relative:
 *   signed > 0  → counterparty owes me
 *   signed < 0  → I owe counterparty
 *   signed = 0  → settled
 *
 * One failing group is skipped (absent from byGroup); net sums only fulfilled groups.
 */
export async function fetchHomeBalances(
  groups: GroupItem[],
  smartAccount: Address,
): Promise<HomeBalances> {
  if (groups.length === 0) return { byGroup: {} as Record<Address, bigint>, net: 0n }

  const results = await Promise.allSettled(groups.map((g) => fetchBalance(g.address)))

  const byGroup = {} as Record<Address, bigint>
  let net = 0n

  for (let i = 0; i < groups.length; i++) {
    const result = results[i]
    if (result.status !== 'fulfilled') continue
    const g = groups[i]
    const raw = result.value
    const isMemberA = getAddress(g.memberA) === getAddress(smartAccount)
    const signed = isMemberA ? raw : -raw
    byGroup[g.address] = signed
    net += signed
  }

  return { byGroup, net }
}
