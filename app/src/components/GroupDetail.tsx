import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAddress } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import { fetchBalance, fetchExpenseHistory, interpretBalance, fetchGroupMembers } from '../lib/fetchGroup'
import type { ExpenseEntry, BalanceDisplay } from '../lib/fetchGroup'
import { fetchUsdcBalance } from '../lib/settle'
import type { GroupItem } from '../lib/fetchGroups'
import { FACTORY_DEPLOY_BLOCK } from '../config'
import { publicClient } from '../lib/client'
import { waitForSubgraphBlock } from '../lib/subgraph'
import { SettleSection } from './SettleSection'
import { AddExpenseForm } from './AddExpenseForm'
import { ExpenseList } from './ExpenseList'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

type Props = {
  address: string
  smartAccount: Address
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
}

// Fetches all three reads concurrently, committing whichever succeed.
// Uses allSettled so one failing read (e.g. subgraph overload) never blanks
// the others. anyFailed=true means callers should retry or show an error.
async function fetchDetail(
  groupAddress: Parameters<typeof fetchBalance>[0],
  smartAccount: Parameters<typeof fetchUsdcBalance>[0],
) {
  const [balR, expR, usdcR] = await Promise.allSettled([
    fetchBalance(groupAddress),
    fetchExpenseHistory(groupAddress),
    fetchUsdcBalance(smartAccount),
  ])
  return {
    bal:      balR.status  === 'fulfilled' ? balR.value  : null,
    expenses: expR.status  === 'fulfilled' ? expR.value  : null,
    usdc:     usdcR.status === 'fulfilled' ? usdcR.value : null,
    anyFailed: [balR, expR, usdcR].some((r) => r.status === 'rejected'),
  }
}

export function GroupDetail({ address, smartAccount, send, sendBatch }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // Lazy initializer: warm-path navigation passes the full GroupItem via
  // location.state; cold-load (direct URL / reload) starts null and bootstraps.
  const [resolvedGroup, setResolvedGroup] = useState<GroupItem | null>(
    () => (location.state as { group?: GroupItem } | null)?.group ?? null,
  )
  const [groupError, setGroupError] = useState(false)

  const [balance, setBalance] = useState<bigint | null>(null)
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [postWriteStatus, setPostWriteStatus] = useState<string | null>(null)

  async function loadDetail(opts?: { silent?: boolean }) {
    if (!resolvedGroup) return
    if (!opts?.silent) {
      setBalance(null)
      setExpenses([])
      setDetailError(null)
      setUsdcBalance(null)
      setLoadingDetail(true)
    }
    const { bal, expenses, usdc, anyFailed } = await fetchDetail(resolvedGroup.address, smartAccount)
    if (bal !== null) setBalance(bal)
    if (expenses !== null) setExpenses(expenses)
    if (usdc !== null) setUsdcBalance(usdc)
    if (anyFailed) setDetailError('Failed to load some data — try refreshing')
    if (!opts?.silent) setLoadingDetail(false)
  }

  // Attempts one full refresh cycle. Returns true on complete success (all reads
  // fulfilled), false on any failure. Never throws, never touches detailError.
  async function attemptRefresh(): Promise<boolean> {
    if (!resolvedGroup) return false
    try {
      const target = await publicClient.getBlockNumber()
      await waitForSubgraphBlock(target)
      const { bal, expenses, usdc, anyFailed } = await fetchDetail(resolvedGroup.address, smartAccount)
      if (bal !== null) setBalance(bal)
      if (expenses !== null) setExpenses(expenses)
      if (usdc !== null) setUsdcBalance(usdc)
      if (!anyFailed) {
        setDetailError(null)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Retries attemptRefresh with increasing delays after the first attempt failed.
  // Not awaited by callers — runs detached so forms can resolve immediately.
  // On success clears postWriteStatus. On exhaust keeps a persistent reassurance
  // so a blank list never looks like a failed write.
  async function backgroundRetry() {
    for (const delay of [3000, 6000, 12000]) {
      await new Promise<void>((r) => setTimeout(r, delay))
      if (await attemptRefresh()) {
        setPostWriteStatus(null)
        return
      }
    }
    setPostWriteStatus("Confirmed on-chain — couldn't refresh the list, reload to see the latest.")
  }

  // Waits for the subgraph to index at least the chain head at call time, then
  // fetches fresh state in one shot. The _meta gate replaces the old snapshot-diff
  // poll — freshness is guaranteed by block number, not by diffing prior state.
  // First attempt is awaited (so write forms resolve and revert promptly on the
  // happy path); any retries run in the background.
  async function pollUntilChanged() {
    if (!resolvedGroup) return
    setPostWriteStatus('Confirmed on-chain — refreshing…')
    if (await attemptRefresh()) {
      setPostWriteStatus(null)
      return
    }
    void backgroundRetry()
  }

  // Cold-load bootstrap: fetches memberA/memberB from the group contract when
  // no GroupItem was passed via navigation state (direct URL or page reload).
  // The [] dependency is correct: GroupDetailWrapper's key={address} ensures
  // each address change produces a fresh component instance, so this fires once.
  useEffect(() => {
    if (resolvedGroup) return
    let cancelled = false
    ;(async () => {
      try {
        const { memberA, memberB } = await fetchGroupMembers(address as Address)
        if (cancelled) return
        const counterparty =
          getAddress(smartAccount) === getAddress(memberA)
            ? memberB
            : getAddress(smartAccount) === getAddress(memberB)
            ? memberA
            : memberB // non-member read: do not crash
        setResolvedGroup({
          address: address as Address,
          memberA,
          memberB,
          counterparty,
          createdBlock: FACTORY_DEPLOY_BLOCK,
        })
      } catch {
        if (!cancelled) setGroupError(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Fires once resolvedGroup is available. On the warm path resolvedGroup is
  // set by the useState initializer, so this runs on the first render. On the
  // cold path it runs after the bootstrap effect sets resolvedGroup.
  useEffect(() => {
    if (!resolvedGroup) return
    loadDetail()
  }, [resolvedGroup])

  if (groupError) return <main style={page}><p>Group not found.</p></main>
  if (!resolvedGroup) return <main style={page}><p>Loading…</p></main>

  const display: BalanceDisplay | null =
    balance !== null ? interpretBalance(balance, smartAccount, resolvedGroup.memberA) : null

  const reload = () => pollUntilChanged()

  return (
    <main style={page}>
      <button onClick={() => navigate('/')}>← Back</button>
      <h1>Ponti</h1>
      <h2>Group with <code style={{ fontSize: '0.85em' }}>{resolvedGroup.counterparty}</code></h2>
      <p style={{ color: 'grey', fontSize: '0.8em' }}>
        Contract: <code>{resolvedGroup.address}</code>
      </p>

      <h3>Balance</h3>
      {loadingDetail && <p>Loading…</p>}
      {detailError && <p style={{ color: 'crimson' }}>Error: {detailError}</p>}
      {postWriteStatus && <p style={{ color: 'grey' }}>{postWriteStatus}</p>}
      {display && (
        <p>
          {display.direction === 'settled' && 'Settled'}
          {display.direction === 'counterparty_owes_me' && (
            <>Counterparty owes you <strong>{display.amount} USDC</strong></>
          )}
          {display.direction === 'i_owe_counterparty' && (
            <>You owe counterparty <strong>{display.amount} USDC</strong></>
          )}
        </p>
      )}

      {display?.direction === 'i_owe_counterparty' && balance !== null && (
        <SettleSection
          balance={balance}
          usdcBalance={usdcBalance}
          display={display}
          sendBatch={sendBatch}
          groupAddress={resolvedGroup.address}
          smartAccount={smartAccount}
          onSettled={reload}
        />
      )}

      <ExpenseList
        expenses={expenses}
        loadingDetail={loadingDetail}
        send={send}
        groupAddress={resolvedGroup.address}
        smartAccount={smartAccount}
        counterparty={resolvedGroup.counterparty}
        onMutated={reload}
      />

      <AddExpenseForm
        send={send}
        groupAddress={resolvedGroup.address}
        smartAccount={smartAccount}
        counterparty={resolvedGroup.counterparty}
        onAdded={reload}
      />
    </main>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}
