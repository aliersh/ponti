// HomeView.tsx — Home screen (§8.2). Full-height column, bg-bg, px-18, pb-28.
//
// Structure: AppHeader → net summary → WalletStrip → SectionLabel → group list.
//
// Data: fetches homeBalances + USDC in parallel on mount and on retry.
// State precedence for list area: error → loading → empty → normal.
//
// Money rule (§5.3):
//   net hero → <Num display> proportional, --ink; no +/− sign (DirChip carries direction)
//   WalletStrip amount + group row amounts → <Num> tabular (default), --ink
//
// Stubs (wired in later phases):
//   avatar button → profile (F5)
//   "New" affordance → create group (F5)
//   empty CTA "Create a group" → create group (F5)
//   WalletStrip "Add funds" → AddFundsPanel (F3)

import { useEffect, useState, useCallback } from 'react'
import { AddFundsPanel } from './AddFundsPanel'
import type { Address } from 'viem'
import type { GroupItem } from '../lib/fetchGroups'
import { fetchHomeBalances } from '../lib/homeBalances'
import type { HomeBalances } from '../lib/homeBalances'
import { fetchUsdcBalance } from '../lib/settle'
import { getIdentity } from '../lib/identity'
import {
  Mark, Wordmark, Avatar, Num, money, DirChip,
  Skeleton, SectionLabel, Plus, Globe, Logout,
} from '../ui'
import { WalletStrip } from './WalletStrip'
import { GroupRow } from './GroupRow'
import { EmptyState } from './EmptyState'

// ── AppHeader ─────────────────────────────────────────────────────────────────
// Local component — may be promoted to its own file for desktop reuse later.
// Avatar button is a non-navigable stub; F5 wires it to the profile screen.
function AppHeader({ smartAccount, onLogout }: { smartAccount: Address; onLogout: () => void }) {
  const me = getIdentity(smartAccount)
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '8px 4px 16px' }} /* prototype screens.jsx AppHeader */
    >
      {/* Left: mark + wordmark */}
      <div className="flex items-center" style={{ gap: 9 }}>
        <Mark s={22} />
        <Wordmark size={21} />
      </div>

      {/* Right: avatar stub + discreet logout */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {/* interim logout until the profile screen ships */}
        <button
          type="button"
          aria-label="Sign out"
          onClick={onLogout}
          className="text-muted flex items-center"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, gap: 4, fontFamily: 'var(--font-ui)', fontSize: 12 }}
        >
          <Logout color="var(--muted)" size={14} />
          <span>Sign out</span>
        </button>

        {/* viewer avatar — stub; F5 wires navigation */}
        <button
          type="button"
          aria-label="Your Ponti"
          aria-disabled="true"
          style={{ all: 'unset', cursor: 'default', display: 'inline-flex' }}
        >
          <Avatar initial={me.initial} tone="neutral" size={34} />
        </button>
      </div>
    </div>
  )
}

// ── HomeView ───────────────────────────────────────────────────────────────────

interface HomeViewProps {
  smartAccount: Address | undefined
  groups: GroupItem[]
  loadingGroups: boolean
  groupsInitialized: boolean
  groupsError: boolean
  onSelectGroup: (group: GroupItem) => void
  onRetry: () => void
  onLogout: () => void
}

export function HomeView({
  smartAccount,
  groups,
  loadingGroups,
  groupsInitialized,
  groupsError,
  onSelectGroup,
  onRetry,
  onLogout,
}: HomeViewProps) {
  const [balances, setBalances] = useState<HomeBalances | null>(null)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [balancesError, setBalancesError] = useState(false)

  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [usdcError, setUsdcError] = useState(false)
  const [fundsOpen, setFundsOpen] = useState(false)

  // fetchBalances: callable from the mount effect AND retry handler.
  const fetchBalances = useCallback(async (account: Address, groupList: GroupItem[]) => {
    setBalancesLoading(true)
    setBalancesError(false)
    setUsdcError(false)
    try {
      const [homeBalancesResult, usdcResult] = await Promise.all([
        fetchHomeBalances(groupList, account),
        fetchUsdcBalance(account),
      ])
      setBalances(homeBalancesResult)
      setUsdc(usdcResult)
    } catch {
      setBalancesError(true)
      setUsdcError(true)
    } finally {
      setBalancesLoading(false)
    }
  }, [])

  // Re-fetch whenever groups or smartAccount changes.
  useEffect(() => {
    if (!smartAccount) return
    void fetchBalances(smartAccount, groups)
  }, [groups, smartAccount, fetchBalances])

  function handleRetry() {
    onRetry()
    if (smartAccount) void fetchBalances(smartAccount, groups)
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const net = balances?.net ?? 0n

  // ── List-area state precedence ─────────────────────────────────────────────
  // error → loading → empty → normal
  const hasError = groupsError || balancesError
  const isLoading = !groupsInitialized || loadingGroups || balancesLoading

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-bg flex flex-col"
      style={{ padding: '0 18px 28px' }} /* prototype screens.jsx Home */
    >
      {/* 1. AppHeader */}
      {smartAccount && <AppHeader smartAccount={smartAccount} onLogout={onLogout} />}

      {/* 2. Net summary — chip row (direction + "net" label) above the hero amount */}
      <div style={{ padding: '2px 2px 20px' }}> {/* prototype screens.jsx */}
        <div className="flex items-center" style={{ gap: 8, marginBottom: 9 }}>
          <DirChip
            dir={net > 0n ? 'in' : net < 0n ? 'out' : 'settled'}
            label={net > 0n ? "You're owed" : net < 0n ? 'You owe' : 'Settled up'}
          />
          {/* "net" mini-label — uppercase, tight tracking, muted; prototype screens.jsx */}
          <span
            className="font-ui text-muted"
            style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            net
          </span>
        </div>
        {/* Hero amount: unsigned (direction is in chip above); loading/error branches preserved */}
        <div className="flex items-baseline" style={{ gap: 4 }}>
          {balancesLoading ? (
            <Skeleton w={120} h={38} r={6} />
          ) : balancesError ? (
            <span className="font-ui text-muted" style={{ fontSize: 38 }}>—</span>
          ) : (
            <>
              <Num display size={38}>{money(net)}</Num>
              <span
                className="font-ui font-semibold text-muted"
                style={{ fontSize: 16, letterSpacing: '0.02em', marginLeft: 1 }} /* prototype screens.jsx */
              >
                USDC
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. WalletStrip */}
      <div style={{ marginBottom: 22 }}> {/* prototype screens.jsx */}
        <WalletStrip usdc={usdcError ? null : usdc} onAddFunds={() => setFundsOpen(true)} />
      </div>

      {/* 4. SectionLabel */}
      <SectionLabel
        right={
          /* "New" affordance — stub for F2; create path is F5 */
          <button
            type="button"
            style={{
              all: 'unset',
              cursor: 'default', /* non-navigable stub */
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--accent)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 700,
            }}
            aria-disabled="true"
          >
            <Plus color="var(--accent)" size={13} />
            New
          </button>
        }
      >
        Your groups
      </SectionLabel>

      {/* 5. Group list — 4-state precedence: error → loading → empty → normal */}
      <div className="flex flex-col" style={{ gap: 9, marginTop: 8 }}>
        {hasError ? (
          /* Error state */
          <EmptyState
            icon={<Globe color="var(--accent)" size={40} />}
            title="Couldn't reach the network"
            body="We couldn't load your groups just now. This is a connection hiccup, not a lost balance — nothing was lost, and your money is exactly where it was."
            cta="Try again"
            onCta={handleRetry}
            tone="error"
          />
        ) : isLoading ? (
          /* Loading state — 3 skeleton rows matching prototype dimensions */
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center bg-surface border border-border rounded-sm"
                style={{ gap: 13, padding: '13px 14px' }} /* prototype screens.jsx */
              >
                <Skeleton w={44} h={44} r={22} />
                <div className="flex-1 flex flex-col" style={{ gap: 7 }}>
                  <Skeleton w="55%" h={13} />
                  <Skeleton w="35%" h={11} />
                </div>
                <Skeleton w={56} h={16} />
              </div>
            ))}
          </>
        ) : groups.length === 0 ? (
          /* Empty state — "Create a group" is a stub (no-op); create path is F5 */
          <EmptyState
            icon={<Mark s={40} />}
            title="No groups yet"
            body="A group is one shared account between two people. Start one and add your first expense."
            cta="Create a group"
            onCta={undefined} /* stub: no-op so button looks active, not dimmed */
          />
        ) : (
          /* Normal state */
          groups.map((group) => (
            <GroupRow
              key={group.address}
              group={group}
              balance={balances?.byGroup[group.address]}
              onClick={() => onSelectGroup(group)}
            />
          ))
        )}
      </div>

      {/* AddFundsPanel — guarded: only rendered when smartAccount is defined */}
      {smartAccount && (
        <AddFundsPanel
          open={fundsOpen}
          onOpenChange={setFundsOpen}
          smartAccount={smartAccount}
          onBalance={(b) => setUsdc(b)}
        />
      )}
    </div>
  )
}
