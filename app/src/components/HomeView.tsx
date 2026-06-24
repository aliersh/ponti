// HomeView.tsx — Home screen: rosa appbar front door, net headline, tie-spine group list,
// account zone. Four states: normal / loading / empty / error.
//
// Money rule: net hero → <Num display> in --ink, no sign; DirChip carries direction.
// WalletStrip amount and group row amounts → tabular --ink (handled in their components).
//
// Balances are fetched in App.tsx and threaded down so the desktop rail reuses the
// same data without a separate fetch.

import { useState } from 'react'
import { AddFundsPanel } from './AddFundsPanel'
import type { Address } from 'viem'
import type { GroupItem } from '../lib/fetchGroups'
import type { HomeBalances } from '../lib/homeBalances'
import { getIdentity } from '../lib/identity'
import {
  Num, money, DirChip,
  Skeleton, SectionLabel, Button, Spinner,
} from '../ui'
import { WalletStrip } from './WalletStrip'
import { GroupRow } from './GroupRow'
import { EmptyState } from './EmptyState'

// ── AppHeader ──────────────────────────────────────────────────────────────────
// Rosa accent plane — the Home front door.
// Navigation affordance: semantic raw button, not a CTA Button primitive.
// Mark and avatar are white-tinted inline — they can't inherit the plane via currentColor.
function AppHeader({ smartAccount, onOpenAccount }: { smartAccount: Address; onOpenAccount: () => void }) {
  const me = getIdentity(smartAccount)
  const initial = me.initial.toUpperCase()
  return (
    <div
      className="flex items-center justify-between flex-none"
      style={{ background: 'var(--accent)', padding: '16px 18px' }}
    >
      {/* Left: white mark + "Ponti" wordmark */}
      <div className="flex items-center" style={{ gap: 9 }}>
        {/* Inline white mark — left circle full white, right at 55% opacity */}
        <svg width="34" height="12" viewBox="0 0 34 12" fill="none" aria-hidden="true">
          <line x1="4" y1="6" x2="30" y2="6" stroke="#fff" strokeWidth="2" />
          <circle cx="4" cy="6" r="3" fill="#fff" />
          <circle cx="30" cy="6" r="3" fill="#fff" fillOpacity=".55" />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: '-0.01em',
            color: '#fff',
            lineHeight: 1,
          }}
        >
          ponti
        </span>
      </div>

      {/* Right: "Your Ponti" label + white-tinted avatar — navigation tap */}
      <button
        type="button"
        aria-label="Your Ponti"
        onClick={onOpenAccount}
        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}
      >
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: '#fff',
            opacity: 0.95,
          }}
        >
          Your Ponti
        </span>
        {/* White-tinted avatar circle — rgba bg on the rosa plane */}
        <span
          className="inline-flex items-center justify-center rounded-full font-ui font-bold shrink-0"
          style={{
            width: 28,
            height: 28,
            fontSize: 11,
            background: 'rgba(255,255,255,.2)',
            color: '#fff',
          }}
        >
          {initial}
        </span>
      </button>
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
  balances: HomeBalances | null
  balancesLoading: boolean
  balancesError: boolean
  usdc: bigint | null
  usdcError: boolean
  onSelectGroup: (group: GroupItem) => void
  onRetry: () => void
  onOpenAccount: () => void
  onAddSomeone: () => void
  onUsdcBalance: (b: bigint) => void
}

export function HomeView({
  smartAccount,
  groups,
  loadingGroups,
  groupsInitialized,
  groupsError,
  balances,
  balancesLoading,
  balancesError,
  usdc,
  usdcError,
  onSelectGroup,
  onRetry,
  onOpenAccount,
  onAddSomeone,
  onUsdcBalance,
}: HomeViewProps) {
  const [fundsOpen, setFundsOpen] = useState(false)

  // ── Derived display values ─────────────────────────────────────────────────
  const net = balances?.net ?? 0n

  // ── List-area state precedence: error → loading → empty → normal ──────────
  const hasError = groupsError || balancesError
  const isLoading = !groupsInitialized || loadingGroups || balancesLoading

  // ── Net headline chips ─────────────────────────────────────────────────────
  const netDir = net > 0n ? 'in' : net < 0n ? 'out' : 'settled'
  // Net hero chip is size="lg" — title case for the owed state per the contract net row.
  const netLabel = net > 0n ? "You're owed" : net < 0n ? 'you owe' : 'settled up'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* 1. AppHeader — rosa accent plane */}
      {smartAccount && <AppHeader smartAccount={smartAccount} onOpenAccount={onOpenAccount} />}

      {/* 2. Scrollable body */}
      <div className="flex flex-col flex-1" style={{ padding: '18px 18px 20px' }}>

        {/* Net headline block — .net eyebrow, hero amount, .netrow chip + caption */}
        <div style={{ marginBottom: 18 }}>
          {/* "Net" eyebrow */}
          <span
            className="font-ui font-semibold uppercase text-ink-3"
            style={{ fontSize: 11, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}
          >
            Net
          </span>

          {/* Hero amount — display font, proportional figures, --ink, no sign */}
          <div className="flex items-baseline" style={{ gap: 6 }}>
            {balancesLoading ? (
              <Skeleton w={160} h={42} r={6} />
            ) : balancesError ? (
              <span
                className="font-display font-bold text-ink"
                style={{ fontSize: 46, lineHeight: 0.92, letterSpacing: '-0.025em' }}
              >
                —
              </span>
            ) : (
              <>
                <Num display size={46}>{money(net)}</Num>
                <span className="font-ui font-semibold text-ink-3" style={{ fontSize: 13, marginBottom: 6 }}>
                  USDC
                </span>
              </>
            )}
          </div>

          {/* .netrow — DirChip + "across everyone" caption */}
          <div className="flex items-center" style={{ gap: 10, marginTop: 9 }}>
            {balancesLoading ? (
              <Skeleton w={130} h={18} r={9} />
            ) : (
              <>
                <DirChip dir={netDir} size="lg" label={netLabel} />
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>across everyone</span>
              </>
            )}
          </div>
        </div>

        {/* Relblock — section label + tie-spine group list */}
        <div style={{ marginTop: 4 }}>
          <SectionLabel>People you share with</SectionLabel>

          {/* 4-state list: error → loading → empty → normal */}
          <div style={{ marginTop: 16 }}>
            {hasError ? (
              /* Error state — broken-line icon, warm reassurance copy, ghost CTA */
              <EmptyState
                icon={
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                    <line x1="3" y1="5" x2="10" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" />
                    <line x1="13" y1="5" x2="19" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" strokeDasharray="2 2" />
                    <circle cx="3" cy="5" r="2.4" fill="var(--ink-3)" />
                  </svg>
                }
                title="Couldn't load this right now"
                body="Nothing's lost — your money is where it was. This is a display hiccup, not a funds issue."
                cta="Try again"
                onCta={onRetry}
                tone="error"
              />
            ) : isLoading ? (
              /* Loading state — .grow skeleton rows on the tie-spine (get node circles) + loading banner */
              <>
                <div className="glist">
                  {[0, 1].map((i) => (
                    <div key={i} className="grow">
                      <Skeleton w={36} h={36} r={18} />
                      <div className="flex-1 flex flex-col" style={{ gap: 6 }}>
                        <Skeleton w="60%" h={13} />
                        <Skeleton w="40%" h={10} />
                      </div>
                      <Skeleton w={48} h={14} />
                    </div>
                  ))}
                </div>
                <div className="home-banner">
                  <Spinner size={13} />
                  Loading your tabs…
                </div>
              </>
            ) : groups.length === 0 ? (
              /* Empty state — dashed-open-pair icon, primary CTA */
              <EmptyState
                icon={
                  <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                    <line x1="3" y1="5" x2="19" y2="5" stroke="var(--accent-strong)" strokeWidth="1.8" strokeDasharray="3 3" />
                    <circle cx="3" cy="5" r="2.6" fill="var(--accent-strong)" />
                    <circle cx="19" cy="5" r="2.6" fill="none" stroke="var(--accent-strong)" strokeWidth="1.6" />
                  </svg>
                }
                title="No shared tabs yet"
                body="Add someone and start keeping the count — Ponti does the math."
                cta="Add someone"
                onCta={onAddSomeone}
              />
            ) : (
              /* Normal state — group rows hung on the tie-spine */
              <div className="glist">
                {groups.map((group) => (
                  <GroupRow
                    key={group.address}
                    group={group}
                    balance={balances?.byGroup[group.address]}
                    onClick={() => onSelectGroup(group)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account zone — hairline-separated utility, never reads as a third balance */}
        <div style={{ marginTop: 18, borderTop: '1px solid var(--hairline)', paddingTop: 15 }}>
          <SectionLabel>Your account</SectionLabel>
          <div style={{ marginTop: 7 }}>
            <WalletStrip usdc={usdcError ? null : usdc} onAddFunds={() => setFundsOpen(true)} />
          </div>
        </div>

        {/* Normal-state footer: primary "Add someone" CTA + wink line */}
        {!hasError && !isLoading && groups.length > 0 && (
          <>
            <div style={{ marginTop: 18 }}>
              <Button variant="primary" full onClick={onAddSomeone}>
                Add someone
              </Button>
            </div>
            <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
              Two people, one balance, wherever you live.
            </div>
          </>
        )}
      </div>

      {/* AddFundsPanel — guarded: only rendered when smartAccount is defined */}
      {smartAccount && (
        <AddFundsPanel
          open={fundsOpen}
          onOpenChange={setFundsOpen}
          smartAccount={smartAccount}
          onBalance={onUsdcBalance}
        />
      )}
    </div>
  )
}
