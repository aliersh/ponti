import {
  encodeFunctionData,
  parseEventLogs,
  type Address,
  type Hex,
} from 'viem'
import { FACTORY_ADDRESS, factoryAbi } from '../config'
import { publicClient } from './client'

// Privy's SmartWallets client is already bound to a single chain, so `chain` is redundant.
// Also: Privy pins its own viem copy; the `Chain` type from both cannot unify — omitting it avoids the type mismatch.
type SendUserOperation = (request: {
  to: Address
  data: Hex
}) => Promise<Hex>

// Send the createGroup call and return the hash as soon as it is available. The
// first write from a counterfactual account also deploys it; the paymaster
// sponsors both. The returned hash is the proof the sponsored write went out —
// resolving the new group address (below) is a separate, best-effort step.
export async function submitCreateGroup(
  send: SendUserOperation,
  counterparty: Address,
): Promise<Hex> {
  const data = encodeFunctionData({
    abi: factoryAbi,
    functionName: 'createGroup',
    args: [counterparty],
  })
  return send({ to: FACTORY_ADDRESS, data })
}

// Resolve the deployed group address and the receipt block from the GroupCreated log.
// Kept separate from submission so a receipt/parse failure never masks a write that
// actually landed on-chain. blockNumber is the chain head at the moment the factory
// deployed — used by callers to gate a subgraph freshness check.
export async function fetchGroupAddress(txHash: Hex): Promise<{ group: Address; blockNumber: bigint }> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  const [event] = parseEventLogs({
    abi: factoryAbi,
    eventName: 'GroupCreated',
    logs: receipt.logs,
  })
  if (!event) {
    throw new Error('Transaction confirmed but no GroupCreated event was found.')
  }
  return { group: event.args.group, blockNumber: receipt.blockNumber }
}
