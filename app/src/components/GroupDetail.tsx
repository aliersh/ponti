// GroupDetail.tsx — Group detail screen: backbar, balance hero, timeline, settle gate.

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAddress } from 'viem'
import type { Address, Hex } from 'viem'
import { fetchBalance, fetchExpenseHistory, interpretBalance, fetchGroupMembers, fetchSettlements } from '../lib/fetchGroup'
import type { BalanceDisplay, SettlementEntry, ExpenseEntry } from '../lib/fetchGroup'
import { fetchUsdcBalance } from '../lib/settle'
import { submitAddExpense } from '../lib/addExpense'
import type { GroupItem } from '../lib/fetchGroups'
import { FACTORY_DEPLOY_BLOCK } from '../config'
import { publicClient } from '../lib/client'
import { waitForSubgraphBlock } from '../lib/subgraph'
import { getIdentity } from '../lib/identity'
import {
  Avatar, Button, money, DirChip, Skeleton, Spinner,
} from '../ui'
import { useFlow } from '../flow/FlowContext'
import { SettleSection } from './SettleSection'
import { ExpenseList } from './ExpenseList'
import { AddFundsPanel } from './AddFundsPanel'
import { EmptyState } from './EmptyState'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

type Props = {
  address: string
  smartAccount: Address
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
  /** Desktop split: suppresses the mobile backbar (rail is always visible instead). */
  inPane?: boolean
}

// Broken-line SVG used for the cold-load error estate — mirrors HomeView's error icon.
const BrokenLineIcon = (
  <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
    <line x1="3" y1="5" x2="10" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" />
    <line x1="13" y1="5" x2="19" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" strokeDasharray="2 2" />
    <circle cx="3" cy="5" r="2.4" fill="var(--ink-3)" />
  </svg>
)

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

export function GroupDetail({ address, smartAccount, send, sendBatch, inPane }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const flow = useFlow()

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
    setPostWriteStatus('Saved — reload to see the latest.')
  }

  // Waits for the subgraph to index at least the chain head at call time, then
  // fetches fresh state in one shot. The _meta gate replaces the old snapshot-diff
  // poll — freshness is guaranteed by block number, not by diffing prior state.
  // First attempt is awaited (so write forms resolve and revert promptly on the
  // happy path); any retries run in the background.
  async function pollUntilChanged() {
    if (!resolvedGroup) return
    setPostWriteStatus('Saved — updating the list…')
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

  // ── Cold-load error: group address unresolvable ───────────────────────────
  if (groupError) {
    return (
      <main style={{ background: 'var(--surface)', minHeight: '100%' }}>
        {!inPane && (
          <div className="backbar">
            <button
              onClick={() => navigate('/')}
              aria-label="Back to groups"
              style={{ all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 9, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 16, background: 'var(--surface)', flexShrink: 0, boxSizing: 'border-box' }}
            >
              ‹
            </button>
          </div>
        )}
        <EmptyState
          icon={BrokenLineIcon}
          title="Couldn't load this tab"
          body="Nothing's lost — the balance is safe. This is a display hiccup, not a funds issue."
          cta="Try again"
          onCta={() => navigate('/')}
          tone="error"
        />
      </main>
    )
  }

  // Group address resolved; still bootstrapping member data.
  if (!resolvedGroup) {
    return (
      <main style={{ background: 'var(--surface)', minHeight: '100%' }}>
        {!inPane && (
          <div className="backbar">
            <button
              onClick={() => navigate('/')}
              aria-label="Back to groups"
              style={{ all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 9, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 16, background: 'var(--surface)', flexShrink: 0, boxSizing: 'border-box' }}
            >
              ‹
            </button>
          </div>
        )}
      </main>
    )
  }

  const reload = () => pollUntilChanged()

  const display: BalanceDisplay | null =
    balance !== null ? interpretBalance(balance, smartAccount, resolvedGroup.memberA) : null

  // Counterparty identity — nickname (if set) or truncated address.
  const identity = getIdentity(resolvedGroup.counterparty)

  // Self identity — own nickname or truncated; lilac tone per contract for self.
  const selfIdentity = getIdentity(smartAccount)

  // isDebtor and isCreditor drive action zone emphasis.
  const isDebtor   = display?.direction === 'i_owe_counterparty'
  const isCreditor = display?.direction === 'counterparty_owes_me'

  // ── Cold-load error: balance never arrived after loads completed ──────────
  const isHardError = balance === null && !loadingDetail && detailError !== null

  // ── Hero render helpers ───────────────────────────────────────────────────

  // Avatar column used in you-owe / you're-owed heroes.
  function AvatarCol({ initial, tone, label }: { initial: string; tone: 'lilac' | 'accent' | 'neutral' | 's'; label: string }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 56 }}>
        <Avatar initial={initial} tone={tone} size={36} />
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{label}</span>
      </div>
    )
  }

  // Amount row shared by you-owe and you're-owed: 30px display font per contract.
  function AmountRow({ bal }: { bal: bigint }) {
    return (
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-.02em', color: 'var(--ink)', fontFeatureSettings: '"tnum" 1,"lnum" 1' }}>
          {money(bal)}
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginLeft: 5, fontFamily: 'var(--font-ui)' }}>USDC</span>
        </span>
      </div>
    )
  }

  // ── Hero variants ─────────────────────────────────────────────────────────

  function renderHero() {
    // Loading: two avatar-column skeletons flanking a line skeleton, amount below.
    if (balance === null && loadingDetail) {
      return (
        <div className="balhero">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0, padding: '26px 0 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 56 }}>
              <Skeleton w={36} h={36} r={18} />
              <Skeleton w={26} h={9} r={4} />
            </div>
            <Skeleton w={96} h={6} r={3} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, width: 56 }}>
              <Skeleton w={36} h={36} r={18} />
              <Skeleton w={26} h={9} r={4} />
            </div>
          </div>
          <Skeleton w={130} h={14} r={5} />
        </div>
      )
    }

    // Hard error: balance never arrived — full estate card replaces hero.
    if (isHardError) {
      return (
        <EmptyState
          icon={BrokenLineIcon}
          title="Couldn't load this tab"
          body="Nothing's lost — the balance is safe. This is a display hiccup, not a funds issue."
          cta="Try again"
          onCta={reload}
          tone="error"
        />
      )
    }

    if (!display) return null

    // You-owe: gradient line with right arrowhead; chip floats on the line.
    if (display.direction === 'i_owe_counterparty') {
      return (
        <div className="balhero">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              <AvatarCol initial={selfIdentity.initial} tone="lilac" label="You" />
              {/* 160px line container: gradient + right arrowhead + chip halo */}
              <div style={{ position: 'relative', width: 160, height: 36, display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1, height: 1.5, borderRadius: 2, background: 'linear-gradient(90deg,var(--ink),var(--accent-strong))', display: 'block' }} />
                {/* Right-pointing arrowhead (border triangle) */}
                <span style={{ position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '6px solid var(--accent-strong)' }} />
                {/* Chip centered on the line; surface halo punches it out of the line */}
                <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 1px 0 var(--surface),0 0 0 4px var(--surface)' }}>
                  <DirChip dir="out" size="lg" label={`You owe ${identity.label}`} />
                </span>
              </div>
              <AvatarCol initial={identity.initial} tone={identity.tone} label={identity.label} />
            </div>
          </div>
          <AmountRow bal={balance!} />
          {/* Partial-read note: balance loaded but some reads failed — muted, not alarming */}
          {detailError && (
            <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10, textAlign: 'center' }}>
              {detailError}
            </p>
          )}
        </div>
      )
    }

    // You're-owed: mirror — left arrowhead, chip between two line segments.
    if (display.direction === 'counterparty_owes_me') {
      return (
        <div className="balhero">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
              <AvatarCol initial={selfIdentity.initial} tone="lilac" label="You" />
              {/* 196px line container: left arrowhead + two segments flanking the chip */}
              <div style={{ width: 196, height: 36, display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* Left-pointing arrowhead */}
                <span style={{ flexShrink: 0, width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '6px solid var(--accent-strong)' }} />
                <span style={{ flex: 1, minWidth: 8, height: 1.5, borderRadius: 2, background: 'linear-gradient(90deg,var(--accent-strong),var(--ink))', display: 'block' }} />
                {/* Chip sits between the two segments; raised bg per contract */}
                <span style={{ flexShrink: 0, margin: '0 3px', background: 'var(--raised)', borderRadius: 999 }}>
                  <DirChip dir="in" size="lg" label={`${identity.label} owes you`} />
                </span>
                <span style={{ flex: 1, minWidth: 8, height: 1.5, borderRadius: 2, background: 'var(--ink)', display: 'block' }} />
              </div>
              <AvatarCol initial={identity.initial} tone={identity.tone} label={identity.label} />
            </div>
          </div>
          <AmountRow bal={balance!} />
          {detailError && (
            <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10, textAlign: 'center' }}>
              {detailError}
            </p>
          )}
        </div>
      )
    }

    // Settled / empty — both have direction === 'settled'.
    // Distinguish by expenses.length: zero = connected but no activity yet.
    if (display.direction === 'settled') {
      if (expenses.length === 0) {
        // Empty: plain line-2 line connecting the two avatars; no chip.
        return (
          <div className="balhero">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <Avatar initial={selfIdentity.initial} tone="lilac" size={36} />
                <span style={{ width: 48, height: 1.5, background: 'var(--line-2)', display: 'block' }} />
                <Avatar initial={identity.initial} tone={identity.tone} size={36} />
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
              You're connected with {identity.label}
            </div>
          </div>
        )
      }

      // Settled with history: sage lines + knot circle + chip + sub copy.
      return (
        <div className="balhero">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <Avatar initial={selfIdentity.initial} tone="lilac" size={36} />
              <span style={{ width: 38, height: 1.5, background: 'var(--sage)', display: 'block' }} />
              {/* Knot circle: sage check that visually closes the thread */}
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--sage-soft)', border: '1.5px solid var(--sage)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 22 22" fill="none">
                  <path d="M5 11.5l4 4 8-9" stroke="var(--sage)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span style={{ width: 38, height: 1.5, background: 'var(--sage)', display: 'block' }} />
              <Avatar initial={identity.initial} tone={identity.tone} size={36} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <DirChip dir="settled" size="lg" label="All settled up" />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 12 }}>
            Nothing owed either way. The thread's tied.
          </div>
        </div>
      )
    }

    return null
  }

  // isUpdating: the "Saved — updating the list…" top banner (transient, blocks renders behind it).
  // isExhausted: the "Saved — reload to see the latest." bottom banner (persistent prompt).
  const isUpdating  = postWriteStatus === 'Saved — updating the list…'
  const isExhausted = postWriteStatus === 'Saved — reload to see the latest.'

  // inPane: join the .detail flex column (fills pane, scrolls internally).
  // Mobile: narrow surface card, full viewport height.
  return (
    <main className={inPane ? 'detail' : undefined} style={inPane ? {} : { background: 'var(--surface)', minHeight: '100%' }}>

      {/* Backbar — mobile only; rail replaces it on desktop */}
      {!inPane && (
        <div className="backbar">
          <button
            onClick={() => navigate('/')}
            aria-label="Back to groups"
            style={{ all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 9, border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 16, background: 'var(--surface)', flexShrink: 0, boxSizing: 'border-box' }}
          >
            ‹
          </button>
          <span className="ttl">{identity.label}</span>
        </div>
      )}

      {/* Top post-write banner: "Saved — updating the list…" — above hero while indexer catches up */}
      {isUpdating && (
        <div className="home-banner" style={{ margin: '0 18px' }}>
          <Spinner size={13} />
          Saved — updating the list…
        </div>
      )}

      {/* Body: centered column on desktop (max 600px per contract), mobile padding on narrow */}
      <div style={inPane ? { maxWidth: 600, margin: '0 auto', padding: '26px 30px 40px' } : { padding: '0 18px 30px' }}>

        {/* Balance hero — varies by state (loading / error / empty / settled / you-owe / you're-owed) */}
        {renderHero()}

        {/* Activity timeline */}
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

        {/* Bottom post-write banner: exhausted retry — quiet "Reload" CTA */}
        {isExhausted && (
          <div className="home-banner" style={{ marginTop: 18, justifyContent: 'space-between' }}>
            <span>Saved — reload to see the latest.</span>
            <Button variant="quiet" onClick={reload}>Reload</Button>
          </div>
        )}

        {/* Action zone — settle gate (debtor-only) + Add expense.
            One primary at most: settle takes primary when debtor; creditor gets a note instead;
            settled/empty shows Add expense as primary. */}
        {balance !== null && display && !isHardError && (
          <div className="settle">
            <SettleSection
              balance={balance}
              usdcBalance={usdcBalance}
              display={display}
              sendBatch={sendBatch}
              groupAddress={resolvedGroup.address}
              smartAccount={smartAccount}
              counterparty={resolvedGroup.counterparty}
              onSettled={reload}
              onAddFunds={() => setFundsOpen(true)}
              renderLayout={(settleBtn, callout) => (
                <>
                  {callout}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {settleBtn}
                    {/* Creditor note: settle is debtor-only; creditor sees a passive reassurance */}
                    {isCreditor && !settleBtn && (
                      <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
                        {identity.label} settles from their side — it'll land here on its own.
                      </div>
                    )}
                    <Button
                      variant={isDebtor ? 'outline' : 'primary'}
                      full
                      onClick={() => {
                        if (!send) return
                        const cpIdentity = getIdentity(resolvedGroup.counterparty)
                        flow.start({
                          kind: 'add',
                          title: 'Add an expense',
                          confirmLabel: 'Add expense',
                          who: cpIdentity.label,
                          rows: [],
                          inputInitial: { mode: 'add', amount: '', description: '', payer: 'me' },
                          buildSubmit: ({ amount, description, payer }) => {
                            const payerAddress = payer === 'me' ? smartAccount : resolvedGroup.counterparty
                            const payerLabel = payer === 'me' ? 'You' : cpIdentity.label
                            return {
                              submit: () => submitAddExpense(send, resolvedGroup.address, payerAddress, amount, description),
                              rows: [
                                { label: 'Who paid', value: payerLabel },
                                { label: 'Amount', value: `${money(amount)} USDC`, strong: true },
                                { label: 'For', value: description },
                              ],
                            }
                          },
                          onComplete: async () => { await reload() },
                        })
                      }}
                    >
                      Add {isDebtor ? 'expense' : 'an expense'}
                    </Button>
                  </div>
                </>
              )}
            />
          </div>
        )}

      </div>

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
