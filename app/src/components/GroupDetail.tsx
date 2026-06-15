// GroupDetail.tsx — Group detail screen: header, person hero, balance hero, activity.

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAddress } from 'viem'
import type { Address, Hex } from 'viem'
import { fetchBalance, fetchExpenseHistory, interpretBalance, fetchGroupMembers, fetchSettlements } from '../lib/fetchGroup'
import type { ExpenseEntry, BalanceDisplay, SettlementEntry } from '../lib/fetchGroup'
import { fetchUsdcBalance } from '../lib/settle'
import type { GroupItem } from '../lib/fetchGroups'
import { FACTORY_DEPLOY_BLOCK } from '../config'
import { publicClient } from '../lib/client'
import { waitForSubgraphBlock } from '../lib/subgraph'
import { getIdentity } from '../lib/identity'
import {
  Avatar, Button, Num, money, DirChip, SectionLabel, Skeleton, Spinner,
  Left, Right, Dots, Plus,
} from '../ui'
import { SettleSection } from './SettleSection'
import { AddExpenseForm } from './AddExpenseForm'
import { ExpenseList } from './ExpenseList'
import { AddFundsPanel } from './AddFundsPanel'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

type Props = {
  address: string
  smartAccount: Address
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
}

// Fetches all four reads concurrently, committing whichever succeed.
// Uses allSettled so one failing read (e.g. subgraph overload) never blanks
// the others. anyFailed=true means callers should retry or show an error.
async function fetchDetail(
  groupAddress: Parameters<typeof fetchBalance>[0],
  smartAccount: Parameters<typeof fetchUsdcBalance>[0],
) {
  const [balR, expR, usdcR, settR] = await Promise.allSettled([
    fetchBalance(groupAddress),
    fetchExpenseHistory(groupAddress),
    fetchUsdcBalance(smartAccount),
    fetchSettlements(groupAddress),
  ])
  return {
    bal:         balR.status  === 'fulfilled' ? balR.value  : null,
    expenses:    expR.status  === 'fulfilled' ? expR.value  : null,
    usdc:        usdcR.status === 'fulfilled' ? usdcR.value : null,
    settlements: settR.status === 'fulfilled' ? settR.value : null,
    anyFailed: [balR, expR, usdcR, settR].some((r) => r.status === 'rejected'),
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
  const [settlements, setSettlements] = useState<SettlementEntry[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  const [postWriteStatus, setPostWriteStatus] = useState<string | null>(null)
  // Controls Add expense form visibility; toggled by the hero "Add expense" button.
  const [showAdd, setShowAdd] = useState(false)
  const [fundsOpen, setFundsOpen] = useState(false)

  async function loadDetail(opts?: { silent?: boolean }) {
    if (!resolvedGroup) return
    if (!opts?.silent) {
      setBalance(null)
      setExpenses([])
      setSettlements([])
      setDetailError(null)
      setUsdcBalance(null)
      setLoadingDetail(true)
    }
    const { bal, expenses, usdc, settlements, anyFailed } = await fetchDetail(resolvedGroup.address, smartAccount)
    if (bal !== null) setBalance(bal)
    if (expenses !== null) setExpenses(expenses)
    if (settlements !== null) setSettlements(settlements)
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
      const { bal, expenses, usdc, settlements, anyFailed } = await fetchDetail(resolvedGroup.address, smartAccount)
      if (bal !== null) setBalance(bal)
      if (expenses !== null) setExpenses(expenses)
      if (settlements !== null) setSettlements(settlements)
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

  if (groupError) {
    return (
      <main style={{ background: 'var(--bg)', padding: '0 18px 30px', minHeight: '100%' }}>
        <p className="font-ui" style={{ color: 'var(--muted)', fontSize: 14 }}>Group not found.</p>
      </main>
    )
  }
  if (!resolvedGroup) {
    return (
      <main style={{ background: 'var(--bg)', padding: '0 18px 30px', minHeight: '100%' }}>
        <p className="font-ui" style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
      </main>
    )
  }

  const display: BalanceDisplay | null =
    balance !== null ? interpretBalance(balance, smartAccount, resolvedGroup.memberA) : null

  const reload = () => pollUntilChanged()

  // Counterparty identity — nickname (if set) or truncated address.
  const identity = getIdentity(resolvedGroup.counterparty)

  // DirChip label mapped from display direction and counterparty name.
  function chipLabel(): string {
    if (!display) return 'All settled up'
    if (display.direction === 'settled') return 'All settled up'
    if (display.direction === 'counterparty_owes_me') return `${identity.label} owes you`
    return `You owe ${identity.label}`
  }
  function chipDir(): 'in' | 'out' | 'settled' {
    if (!display) return 'settled'
    if (display.direction === 'counterparty_owes_me') return 'in'
    if (display.direction === 'i_owe_counterparty') return 'out'
    return 'settled'
  }

  return (
    <main style={{ background: 'var(--bg)', padding: '0 18px 30px', minHeight: '100%' }}>

      {/* Header row — back nav + overflow stub */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
          className="font-ui"
          aria-label="Back to groups"
        >
          <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Left color="var(--ink)" size={18} /> Groups
          </span>
        </button>
        {/* Dots menu — not yet functional */}
        <button
          style={{ all: 'unset', cursor: 'pointer', color: 'var(--muted)', padding: 6 }}
          aria-label="More options"
        >
          <Dots color="var(--muted)" size={20} />
        </button>
      </div>

      {/* Person hero — avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '2px 0 18px' }}>
        <Avatar initial={identity.initial} tone={identity.tone} size={48} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            className="font-display"
            style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            {identity.label}
          </span>
          {/* Details disclosure — not yet functional; TODO: wire the details disclosure */}
          <button
            style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
            className="font-ui"
          >
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Shared account · details
            </span>
            <Right color="var(--muted)" size={13} />
          </button>
        </div>
      </div>

      {/* Balance hero card — balance direction, amount, post-write status, action row */}
      <div
        className="bg-surface border border-border"
        style={{ borderRadius: 'var(--radius)', padding: '20px 18px', boxShadow: 'var(--shadow)' }}
      >
        {/* Loading skeletons while initial fetch is in flight */}
        {balance === null && loadingDetail ? (
          <>
            <div style={{ marginBottom: 11 }}><Skeleton w={100} h={22} r={11} /></div>
            <Skeleton w={160} h={44} r={8} />
          </>
        ) : (
          <>
            {/* Direction chip — lg, personalized label */}
            {display && (
              <div style={{ marginBottom: 11 }}>
                <DirChip dir={chipDir()} size="lg" label={chipLabel()} />
              </div>
            )}

            {/* Amount — absolute value, no sign; "Settled" text when balance is zero */}
            {display && (
              balance === 0n
                ? (
                  <span
                    className="pnum font-display"
                    style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.045em', color: 'var(--ink)', lineHeight: 1.05 }}
                  >
                    Settled
                  </span>
                )
                : (
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                    <Num display size={44}>{money(balance!)}</Num>
                    <span
                      className="font-ui"
                      style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.02em' }}
                    >
                      USDC
                    </span>
                  </span>
                )
            )}

            {/* Detail error — cold-load failure note, muted not red (§5.7) */}
            {detailError && (
              <p
                className="font-ui"
                style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}
              >
                {detailError}
              </p>
            )}

            {/* Post-write reassurance — spinner + status text, grey never red */}
            {postWriteStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--muted)' }}>
                <Spinner size={15} />
                <span className="font-ui" style={{ fontSize: 12.5 }}>{postWriteStatus}</span>
              </div>
            )}
          </>
        )}

        {/* Action row + low-USDC callout — rendered by SettleSection render prop.
            SettleSection owns the settle button and callout; GroupDetail owns the row.
            SettleSection.renderLayout is always called (even for non-debtor) so Add
            expense always appears. balance !== null gates render so the row appears
            only after the initial load. */}
        {balance !== null && display && (
          <SettleSection
            balance={balance}
            usdcBalance={usdcBalance}
            display={display}
            sendBatch={sendBatch}
            groupAddress={resolvedGroup.address}
            smartAccount={smartAccount}
            onSettled={reload}
            onAddFunds={() => setFundsOpen(true)}
            renderLayout={(settleBtn, callout) => (
              <>
                {/* Two-up action row: Add expense always present; Settle when debtor */}
                <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Button
                      variant="primary"
                      full
                      onClick={() => setShowAdd((v) => !v)}
                    >
                      <Plus color="var(--accent-ink)" size={16} /> Add expense
                    </Button>
                  </div>
                  {settleBtn && <div style={{ flex: 1 }}>{settleBtn}</div>}
                </div>
                {/* Low-USDC callout — full-width below the action row */}
                {callout}
              </>
            )}
          />
        )}
      </div>

      {/* Activity section — SectionLabel + existing ExpenseList (rebuilt later) */}
      <div style={{ marginTop: 22 }}>
        <SectionLabel>Activity</SectionLabel>
        <ExpenseList
          expenses={expenses}
          settlements={settlements}
          loadingDetail={loadingDetail}
          send={send}
          groupAddress={resolvedGroup.address}
          smartAccount={smartAccount}
          counterparty={resolvedGroup.counterparty}
          onMutated={reload}
        />
      </div>

      {/* Add expense form — gated by showAdd; props/callbacks unchanged */}
      {showAdd && (
        <AddExpenseForm
          send={send}
          groupAddress={resolvedGroup.address}
          smartAccount={smartAccount}
          counterparty={resolvedGroup.counterparty}
          onAdded={reload}
        />
      )}

      {/* AddFundsPanel — opened by SettleSection's onAddFunds; onBalance updates the
          low-USDC gate so the callout clears reactively once funded. */}
      <AddFundsPanel
        open={fundsOpen}
        onOpenChange={setFundsOpen}
        smartAccount={smartAccount}
        onBalance={(b) => setUsdcBalance(b)}
      />
    </main>
  )
}
