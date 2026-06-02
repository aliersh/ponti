import { formatUnits, getAbiItem, getAddress, type Address } from 'viem'
import { groupAbi } from '../config'
import { publicClient, collectInWindows } from './client'

const abiExpenseAdded   = getAbiItem({ abi: groupAbi, name: 'ExpenseAdded' })
const abiExpenseEdited  = getAbiItem({ abi: groupAbi, name: 'ExpenseEdited' })
const abiExpenseDeleted = getAbiItem({ abi: groupAbi, name: 'ExpenseDeleted' })

export type ExpenseEntry = {
  id: bigint
  payer: Address
  amount: bigint
  description: string
  createdAt: number
  deleted: boolean
}

export type BalanceDisplay = {
  direction: 'counterparty_owes_me' | 'i_owe_counterparty' | 'settled'
  amount: string
}

// Single-window fetchers — also the source of the log types below.
function addedWindow(address: Address, from: bigint, to: bigint) {
  return publicClient.getLogs({ address, event: abiExpenseAdded, fromBlock: from, toBlock: to })
}
function editedWindow(address: Address, from: bigint, to: bigint) {
  return publicClient.getLogs({ address, event: abiExpenseEdited, fromBlock: from, toBlock: to })
}
function deletedWindow(address: Address, from: bigint, to: bigint) {
  return publicClient.getLogs({ address, event: abiExpenseDeleted, fromBlock: from, toBlock: to })
}

type ExpenseHistoryLogs = {
  added: Awaited<ReturnType<typeof addedWindow>>
  edited: Awaited<ReturnType<typeof editedWindow>>
  deleted: Awaited<ReturnType<typeof deletedWindow>>
}

export async function fetchBalance(groupAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: groupAddress,
    abi: groupAbi,
    functionName: 'balance',
  })
}

export async function fetchExpenseHistory(
  groupAddress: Address,
  fromBlock: bigint,
): Promise<ExpenseHistoryLogs> {
  const head = await publicClient.getBlockNumber()
  const [added, edited, deleted] = await Promise.all([
    collectInWindows(fromBlock, head, (from, to) => addedWindow(groupAddress, from, to)),
    collectInWindows(fromBlock, head, (from, to) => editedWindow(groupAddress, from, to)),
    collectInWindows(fromBlock, head, (from, to) => deletedWindow(groupAddress, from, to)),
  ])
  return { added, edited, deleted }
}

export function reconstructExpenses(logs: ExpenseHistoryLogs): ExpenseEntry[] {
  const map = new Map<bigint, ExpenseEntry>()

  for (const log of logs.added) {
    const { expenseId, payer, amount, description, createdAt } = log.args
    map.set(expenseId!, {
      id: expenseId!,
      payer: payer!,
      amount: amount!,
      description: description!,
      createdAt: Number(createdAt!),
      deleted: false,
    })
  }

  for (const log of logs.edited) {
    const { expenseId, payer, amount, description } = log.args
    const entry = map.get(expenseId!)
    if (entry) {
      map.set(expenseId!, { ...entry, payer: payer!, amount: amount!, description: description! })
    }
  }

  for (const log of logs.deleted) {
    const entry = map.get(log.args.expenseId!)
    if (entry) map.set(log.args.expenseId!, { ...entry, deleted: true })
  }

  return [...map.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
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
