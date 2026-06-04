import { encodeFunctionData, type Address, type Hex } from 'viem'
import { groupAbi, usdcAbi, USDC_ADDRESS } from '../config'
import { publicClient } from './client'

// Encodes both settle calls — approve USDC allowance then settle — as a single
// array for submission as one batched UserOp. Approve executes before the
// settle's transferFrom within the same atomic execution, eliminating the
// cross-tx allowance race present in sequential UserOps.
export function buildSettleCalls(
  usdcAddress: Address,
  spender: Address,
  amount: bigint,
  groupAddress: Address,
): { to: Address; data: Hex }[] {
  const approveData = encodeFunctionData({
    abi: usdcAbi,
    functionName: 'approve',
    args: [spender, amount],
  })
  const settleData = encodeFunctionData({
    abi: groupAbi,
    functionName: 'settle',
  })
  return [
    { to: usdcAddress, data: approveData },
    { to: groupAddress, data: settleData },
  ]
}

// Read the debtor's USDC balance to gate the settle button before submission.
export async function fetchUsdcBalance(account: Address): Promise<bigint> {
  return publicClient.readContract({
    address: USDC_ADDRESS,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: [account],
  })
}
