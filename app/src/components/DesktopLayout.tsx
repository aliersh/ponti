// DesktopLayout.tsx — Desktop master-detail shell (≥1024px).
// Rail: net summary + group list + account footer.
// Detail: GroupDetail in-pane (backbar suppressed) or empty state when nothing is selected.
// URL is the sole source of selection truth — no parallel selection state.

import { useNavigate } from 'react-router-dom'
import { isAddress } from 'viem'
import type { Address, Hex } from 'viem'
import type { GroupItem } from '../lib/fetchGroups'
import type { HomeBalances } from '../lib/homeBalances'
import { Num, money, DirChip, Skeleton, Button, SectionLabel } from '../ui'
import { Pair } from '../ui/line'
import { WalletStrip } from './WalletStrip'
import { GroupRow } from './GroupRow'
import { GroupDetail } from './GroupDetail'
import { AddFundsPanel } from './AddFundsPanel'
import { EmptyState } from './EmptyState'
import { getIdentity } from '../lib/identity'
import { useIdentityVersion } from '../lib/useIdentityVersion'
import { useState } from 'react'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

// ── AppHeader ──────────────────────────────────────────────────────────────────
// Rosa accent top bar spanning the full split width.
function AppHeader({
  smartAccount,
  onOpenAccount,
}: {
  smartAccount: Address
  onOpenAccount: () => void
}) {
  const me = getIdentity(smartAccount)
  const initial = me.initial.toUpperCase()
  return (
    <div
      className="flex items-center justify-between flex-none"
      style={{ background: 'var(--accent)', padding: '15px 22px' }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <svg width="34" height="12" viewBox="0 0 34 12" fill="none" aria-hidden="true">
          <line x1="4" y1="6" x2="30" y2="6" stroke="#fff" strokeWidth="2" />
          <circle cx="4" cy="6" r="3" fill="#fff" />
          <circle cx="30" cy="6" r="3" fill="#fff" fillOpacity=".55" />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.01em',
            color: '#fff',
            lineHeight: 1,
          }}
        >
          ponti
        </span>
      </div>
      <button
        type="button"
        aria-label="Your Ponti"
        onClick={onOpenAccount}
        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9 }}
      >
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: '#fff', opacity: 0.97 }}>
          Your Ponti
        </span>
        <span
          className="inline-flex items-center justify-center rounded-full font-ui font-bold shrink-0"
          style={{ width: 28, height: 28, fontSize: 11, background: 'rgba(255,255,255,.2)', color: '#fff' }}
        >
          {initial}
        </span>
      </button>
    </div>
  )
}

// ── DesktopRail ────────────────────────────────────────────────────────────────
// Left panel: net summary (scrollable body) + account footer (pinned).
// Known minor debt: net summary markup is duplicated from HomeView's mobile render.
// Tolerating per project rule — a shared extract would couple mobile/desktop rendering.
function DesktopRail({
  groups,
  balances,
  balancesLoading,
  balancesError,
  usdc,
  usdcError,
  selectedAddress,
  onAddFunds,
  onAddSomeone,
}: {
  groups: GroupItem[]
  balances: HomeBalances | null
  balancesLoading: boolean
  balancesError: boolean
  usdc: bigint | null
  usdcError: boolean
  selectedAddress: Address | undefined
  onAddFunds: () => void
  onAddSomeone: () => void
}) {
  const navigate = useNavigate()
  const net = balances?.net ?? 0n
  const netDir = net > 0n ? 'in' : net < 0n ? 'out' : 'settled'
  const netLabel = net > 0n ? "You're owed" : net < 0n ? 'you owe' : 'settled up'

  return (
    <div className="rail">
      {/* Scrollable section: net summary + group list */}
      <div className="rail-scroll">
        {/* Net headline */}
        <span
          className="font-ui font-semibold uppercase text-ink-3"
          style={{ fontSize: 11, letterSpacing: '.12em', display: 'block', marginBottom: 6 }}
        >
          Net
        </span>
        <div className="flex items-baseline" style={{ gap: 6 }}>
          {balancesLoading ? (
            <Skeleton w={140} h={38} r={6} />
          ) : balancesError ? (
            <span
              className="font-display font-bold text-ink"
              style={{ fontSize: 40, lineHeight: 0.92, letterSpacing: '-0.025em' }}
            >
              —
            </span>
          ) : (
            <>
              <Num display size={40}>{money(net)}</Num>
              <span className="font-ui font-semibold text-ink-3" style={{ fontSize: 13 }}>USDC</span>
            </>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 10, marginTop: 9 }}>
          {balancesLoading ? (
            <Skeleton w={120} h={18} r={9} />
          ) : (
            <>
              <DirChip dir={netDir} size="lg" label={netLabel} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>across everyone</span>
            </>
          )}
        </div>

        {/* Group list */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel>People you share with</SectionLabel>
          <div className="glist" style={{ marginTop: 8 }}>
            {groups.map((group) => (
              <GroupRow
                key={group.address}
                group={group}
                balance={balances?.byGroup[group.address]}
                selected={group.address === selectedAddress}
                onClick={() => navigate('/group/' + group.address)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pinned account footer */}
      <div className="rail-foot">
        <SectionLabel>Your account</SectionLabel>
        <div style={{ marginTop: 7 }}>
          <WalletStrip usdc={usdcError ? null : usdc} onAddFunds={onAddFunds} />
        </div>
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" full onClick={onAddSomeone}>Add someone</Button>
        </div>
      </div>
    </div>
  )
}

// ── DetailEmpty ────────────────────────────────────────────────────────────────
// Placeholder when no group is selected — dashed open-pair line, invitation copy.
// Icon flagged for visual pass: using Pair primitive (dash + open endpoints).
function DetailEmpty() {
  return (
    <div className="detail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState
        icon={<Pair left="out" right="open" line="dash" lineWidth={26} />}
        title="Pick someone to see the line"
        body="Choose a person on the left — their balance, the activity between you, and what's owed open here. Or add someone new to start a tab."
      />
    </div>
  )
}

// ── DesktopLayout ──────────────────────────────────────────────────────────────

interface DesktopLayoutProps {
  selectedAddress: string | undefined
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
  groups: GroupItem[]
  balances: HomeBalances | null
  balancesLoading: boolean
  balancesError: boolean
  usdc: bigint | null
  usdcError: boolean
  onOpenAccount: () => void
  onAddSomeone: () => void
  onUsdcBalance: (b: bigint) => void
}

export function DesktopLayout({
  selectedAddress,
  smartAccount,
  send,
  sendBatch,
  groups,
  balances,
  balancesLoading,
  balancesError,
  usdc,
  usdcError,
  onOpenAccount,
  onAddSomeone,
  onUsdcBalance,
}: DesktopLayoutProps) {
  const [fundsOpen, setFundsOpen] = useState(false)
  // Re-renders the rail (GroupRow labels, AppHeader initial) when a counterparty is named.
  const v = useIdentityVersion()
  void v

  // Validate the address string from the URL before passing to GroupDetail.
  const validAddress: Address | undefined =
    selectedAddress && isAddress(selectedAddress) ? selectedAddress : undefined

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--surface)' }}
    >
      {/* Full-width rosa top bar */}
      {smartAccount && (
        <AppHeader smartAccount={smartAccount} onOpenAccount={onOpenAccount} />
      )}

      {/* Split: rail (fixed 380px) + detail (flex 1) */}
      <div className="split" style={{ flex: 1, minHeight: 0 }}>
        {smartAccount ? (
          <DesktopRail
            groups={groups}
            balances={balances}
            balancesLoading={balancesLoading}
            balancesError={balancesError}
            usdc={usdc}
            usdcError={usdcError}
            selectedAddress={validAddress}
            onAddFunds={() => setFundsOpen(true)}
            onAddSomeone={onAddSomeone}
          />
        ) : (
          // Skeleton rail while smartAccount resolves on cold load
          <div className="rail">
            <div className="rail-scroll">
              <Skeleton w={120} h={38} r={6} />
              <div style={{ marginTop: 10 }}>
                <Skeleton w={140} h={18} r={9} />
              </div>
            </div>
          </div>
        )}

        {/* Detail pane: GroupDetail in-pane, or loading skeleton, or empty state */}
        {validAddress ? (
          smartAccount ? (
            <GroupDetail
              key={validAddress}
              address={validAddress}
              smartAccount={smartAccount}
              send={send}
              sendBatch={sendBatch}
              inPane
            />
          ) : (
            // smartAccount not yet resolved — skeleton while bootstrapping
            <div className="detail" style={{ padding: '26px 30px' }}>
              <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
                <Skeleton w={36} h={36} r={18} />
                <Skeleton w={120} h={16} r={6} />
              </div>
              <Skeleton w="100%" h={14} r={5} />
              <div style={{ marginTop: 8 }}>
                <Skeleton w="80%" h={14} r={5} />
              </div>
            </div>
          )
        ) : (
          <DetailEmpty />
        )}
      </div>

      {smartAccount && (
        <AddFundsPanel
          open={fundsOpen}
          onOpenChange={setFundsOpen}
          smartAccount={smartAccount}
          onBalance={onUsdcBalance}
          placement="modal"
        />
      )}
    </div>
  )
}
