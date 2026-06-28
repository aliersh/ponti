import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import { usePrivy, useCreateWallet, useWallets, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { isAddress } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import { EmptyState } from './components/EmptyState'
import { Spinner } from './ui'
import { HomeView } from './components/HomeView'
import { GroupDetail } from './components/GroupDetail'
import { SignIn } from './components/SignIn'
import { YourPonti } from './components/YourPonti'
import { AddSomeone } from './components/AddSomeone'
import { DesktopLayout } from './components/DesktopLayout'
import { Sheet } from './ui/sheet'
import { fetchMyGroups } from './lib/fetchGroups'
import type { GroupItem } from './lib/fetchGroups'
import { fetchHomeBalances } from './lib/homeBalances'
import type { HomeBalances } from './lib/homeBalances'
import { fetchUsdcBalance } from './lib/settle'
import { waitForSubgraphBlock, checkSubgraphHealth } from './lib/subgraph'
import { FlowProvider } from './flow/FlowContext'
import { useDesktop } from './lib/useDesktop'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

// The smart account's address is the user's identity in Ponti (the member that
// gets registered). Privy exposes it as a linked account of type smart_wallet.
function useSmartAccountAddress(): Address | undefined {
  const { user } = usePrivy()
  return useMemo(() => {
    const sw = user?.linkedAccounts.find((a) => a.type === 'smart_wallet')
    return sw && 'address' in sw ? (sw.address as Address) : undefined
  }, [user])
}

// Mobile-only: renders GroupDetail full-screen; GroupDetailWrapper is not used on desktop.
function GroupDetailWrapper({
  smartAccount,
  send,
  sendBatch,
  subgraphDegraded,
  onBalancesStale,
}: {
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
  subgraphDegraded: boolean
  onBalancesStale: () => void
}) {
  const { address } = useParams<{ address: string }>()
  if (!address || !isAddress(address)) return <Navigate to="/" replace />
  if (!smartAccount) return <main style={page}><p>Loading…</p></main>
  // key forces remount on address change, preserving the mount-only useEffect invariant
  return <GroupDetail key={address} address={address} smartAccount={smartAccount} send={send} sendBatch={sendBatch} subgraphDegraded={subgraphDegraded} onBalancesStale={onBalancesStale} />
}

// Desktop-only: reads :address param and renders DesktopLayout with selectedAddress.
function DesktopLayoutWrapper({
  smartAccount,
  send,
  sendBatch,
  groups,
  balances,
  balancesLoading,
  balancesError,
  usdc,
  usdcError,
  subgraphDegraded,
  onOpenAccount,
  onAddSomeone,
  onUsdcBalance,
  onBalancesStale,
}: {
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
  groups: GroupItem[]
  balances: HomeBalances | null
  balancesLoading: boolean
  balancesError: boolean
  usdc: bigint | null
  usdcError: boolean
  subgraphDegraded: boolean
  onOpenAccount: () => void
  onAddSomeone: () => void
  onUsdcBalance: (b: bigint) => void
  onBalancesStale: () => void
}) {
  const { address } = useParams<{ address?: string }>()
  return (
    <DesktopLayout
      selectedAddress={address}
      smartAccount={smartAccount}
      send={send}
      sendBatch={sendBatch}
      groups={groups}
      balances={balances}
      balancesLoading={balancesLoading}
      balancesError={balancesError}
      usdc={usdc}
      usdcError={usdcError}
      subgraphDegraded={subgraphDegraded}
      onOpenAccount={onOpenAccount}
      onAddSomeone={onAddSomeone}
      onUsdcBalance={onUsdcBalance}
      onBalancesStale={onBalancesStale}
    />
  )
}

export function App() {
  const { ready, authenticated } = usePrivy()
  const { client } = useSmartWallets()
  const smartAccount = useSmartAccountAddress()
  const navigate = useNavigate()
  const location = useLocation()
  const prevAuthenticated = useRef<boolean | null>(null)
  const isDesktop = useDesktop()

  // Wallet provisioning — needed for email sign-ins that arrive without an embedded wallet.
  const { createWallet } = useCreateWallet()
  const { wallets } = useWallets()
  const [provisioningError, setProvisioningError] = useState(false)
  // provisionAttempt is bumped by "Try again"; handledAttempt guards StrictMode double-invocation.
  const [provisionAttempt, setProvisionAttempt] = useState(0)
  const handledAttempt = useRef(-1)

  // groups state lives here so it persists across home/detail navigation and
  // loads exactly once when smartAccount first becomes available.
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupsInitialized, setGroupsInitialized] = useState(false)
  const [groupsError, setGroupsError] = useState(false)

  // Home balances lifted here so DesktopLayout's rail can read them without
  // re-fetching. HomeView receives them as props in both mobile and desktop paths.
  const [balances, setBalances] = useState<HomeBalances | null>(null)
  const [balancesLoading, setBalancesLoading] = useState(false)
  const [balancesError, setBalancesError] = useState(false)
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [usdcError, setUsdcError] = useState(false)
  const [subgraphDegraded, setSubgraphDegraded] = useState(false)

  const send: SendUserOperation | undefined = client
    ? async (req) => (await client.sendTransaction(req)) as Hex
    : undefined

  const sendBatch: SendBatch | undefined = client
    ? async (calls) => (await client.sendTransaction({ calls })) as Hex
    : undefined

  async function loadGroups(account: Address) {
    setGroupsError(false)
    setLoadingGroups(true)
    try {
      setGroups(await fetchMyGroups(account))
    } catch {
      setGroupsError(true)
    } finally {
      setLoadingGroups(false)
      setGroupsInitialized(true)
    }
  }

  // fetchBalances: re-runs whenever groups or smartAccount changes.
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
      // Health check runs in parallel with the balance fetch and never blocks it.
      void checkSubgraphHealth().then((r) => setSubgraphDegraded(r.degraded))
    } catch {
      setBalancesError(true)
      setUsdcError(true)
    } finally {
      setBalancesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!smartAccount) return
    void fetchBalances(smartAccount, groups)
  }, [groups, smartAccount, fetchBalances])

  // Waits for the subgraph to index past minBlock, then silently replaces the
  // groups list. App.tsx is the routing root and does not unmount on navigation,
  // so setGroups always updates live state — no unmount-safety concern.
  // All failures are swallowed: a stale list is the acceptable fallback.
  async function backgroundRefreshGroups(minBlock: bigint) {
    if (!smartAccount) return
    try {
      await waitForSubgraphBlock(minBlock)
      setGroups(await fetchMyGroups(smartAccount))
    } catch {
      // Subgraph lag or outage — stale list is fine; never surface to UI
    }
  }

  useEffect(() => {
    if (!smartAccount) return
    loadGroups(smartAccount)
  }, [smartAccount])

  // Navigate to Home on login transition (false → true); null means first mount,
  // so we skip to avoid stomping a deep link on an authenticated page refresh.
  useEffect(() => {
    if (prevAuthenticated.current === false && authenticated) {
      navigate('/', { replace: true })
    }
    prevAuthenticated.current = authenticated
  }, [authenticated, navigate])

  // Triggered by GroupDetail after any confirmed write so the rail and NET stay in sync.
  const handleBalancesStale = useCallback(() => {
    if (smartAccount) void fetchBalances(smartAccount, groups)
  }, [smartAccount, groups, fetchBalances])

  // Effect 1 — Trigger: create an embedded wallet when authenticated without one.
  // handledAttempt guards against StrictMode's double-invocation per attempt.
  useEffect(() => {
    if (!ready || !authenticated || smartAccount) return
    if (getEmbeddedConnectedWallet(wallets)) return  // embedded exists; wait for smart wallet
    if (handledAttempt.current === provisionAttempt) return
    handledAttempt.current = provisionAttempt
    setProvisioningError(false)
    createWallet().catch((err: unknown) => {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      if (msg.includes('already') || msg.includes('exists')) return
      setProvisioningError(true)
    })
  }, [ready, authenticated, smartAccount, wallets, createWallet, provisionAttempt])

  // Effect 2 — Watchdog: surfaces an error if the smart wallet never arrives.
  // Deps exclude wallets/createWallet so wallet-list churn can't cancel the timer.
  // Bumping provisionAttempt re-arms it for retries.
  useEffect(() => {
    if (!ready || !authenticated || smartAccount) return
    const timer = setTimeout(() => {
      setProvisioningError(true)
    }, 25000)
    return () => clearTimeout(timer)
  }, [ready, authenticated, smartAccount, provisionAttempt])

  // Effect 3 — Clear provisioning error once the smart wallet is delivered.
  useEffect(() => {
    if (smartAccount) setProvisioningError(false)
  }, [smartAccount])

  if (!ready) return <main style={page}><p>Loading…</p></main>

  if (!authenticated) {
    return <SignIn />
  }

  if (authenticated && !smartAccount) {
    if (provisioningError) {
      return (
        <main style={page}>
          <EmptyState
            icon={
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
                <line x1="3" y1="5" x2="10" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" />
                <line x1="13" y1="5" x2="19" y2="5" stroke="var(--ink-3)" strokeWidth="1.8" strokeDasharray="2 2" />
                <circle cx="3" cy="5" r="2.4" fill="var(--ink-3)" />
              </svg>
            }
            title="Couldn't set up your account"
            body="Something went wrong creating your wallet. Nothing's lost — try again."
            cta="Try again"
            onCta={() => {
              setProvisioningError(false)
              setProvisionAttempt((a) => a + 1)
            }}
            tone="error"
          />
        </main>
      )
    }
    return (
      <main style={page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px' }}>
          <Spinner size={20} />
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>Setting up your account…</span>
        </div>
      </main>
    )
  }

  const handleRetry = () => {
    if (smartAccount) void loadGroups(smartAccount)
  }

  const desktopSharedProps = {
    smartAccount,
    send,
    sendBatch,
    groups,
    balances,
    balancesLoading,
    balancesError,
    usdc,
    usdcError,
    subgraphDegraded,
    onOpenAccount: () => navigate('/you'),
    onAddSomeone: () => navigate('/add'),
    onUsdcBalance: (b: bigint) => setUsdc(b),
    onBalancesStale: handleBalancesStale,
  }

  // Desktop (≥1024px): persistent split shell across / and /group/:address.
  // /you and /add render the split underneath + a centered Sheet modal on top.
  // Mobile (<1024px): existing full-screen route stack, byte-identical to before.
  return (
    <FlowProvider>
      {isDesktop ? (
        <Routes>
          <Route
            path="/"
            element={<DesktopLayoutWrapper {...desktopSharedProps} />}
          />
          <Route
            path="/group/:address"
            element={<DesktopLayoutWrapper {...desktopSharedProps} />}
          />
          <Route
            path="/you"
            element={
              // Split renders behind the scrim; modal is driven by the URL.
              // navigate('/') on close is deep-link-safe (no prior history required).
              <>
                <DesktopLayoutWrapper {...desktopSharedProps} />
                <Sheet
                  open={true}
                  onOpenChange={(open) => { if (!open) navigate('/') }}
                  placement="modal"
                  maxWidth={460}
                  title="Your Ponti"
                >
                  {!smartAccount
                    ? <div style={{ padding: '40px 24px' }}><p>Loading…</p></div>
                    : <YourPonti smartAccount={smartAccount} onBack={() => navigate('/')} asModal />
                  }
                </Sheet>
              </>
            }
          />
          <Route
            path="/add"
            element={
              // Split renders behind the scrim; modal is driven by the URL.
              <>
                <DesktopLayoutWrapper {...desktopSharedProps} />
                <Sheet
                  open={true}
                  onOpenChange={(open) => { if (!open) navigate('/') }}
                  placement="modal"
                  maxWidth={380}
                  title="Add someone"
                >
                  <AddSomeone
                    send={send}
                    smartAccount={smartAccount}
                    onBack={() => navigate('/')}
                    onCreated={(group, blockNumber) => {
                      navigate('/group/' + group)
                      void backgroundRefreshGroups(blockNumber)
                    }}
                    asModal
                  />
                </Sheet>
              </>
            }
          />
        </Routes>
      ) : (
        // key on pathname remounts the subtree on each navigation, replaying .screenin.
        <div key={location.pathname} className="screenin">
        <Routes>
          <Route
            path="/"
            element={
              <HomeView
                smartAccount={smartAccount}
                groups={groups}
                loadingGroups={loadingGroups}
                groupsInitialized={groupsInitialized}
                groupsError={groupsError}
                balances={balances}
                balancesLoading={balancesLoading}
                balancesError={balancesError}
                usdc={usdc}
                usdcError={usdcError}
                subgraphDegraded={subgraphDegraded}
                onSelectGroup={(group) =>
                  navigate('/group/' + group.address, { state: { group } })
                }
                onRetry={handleRetry}
                onOpenAccount={() => navigate('/you')}
                onAddSomeone={() => navigate('/add')}
                onUsdcBalance={(b) => setUsdc(b)}
              />
            }
          />
          <Route
            path="/group/:address"
            element={<GroupDetailWrapper smartAccount={smartAccount} send={send} sendBatch={sendBatch} subgraphDegraded={subgraphDegraded} onBalancesStale={handleBalancesStale} />}
          />
          <Route
            path="/you"
            element={
              !smartAccount
                ? <main style={page}><p>Loading…</p></main>
                : <YourPonti smartAccount={smartAccount} onBack={() => navigate('/')} />
            }
          />
          <Route
            path="/add"
            element={
              <AddSomeone
                send={send}
                smartAccount={smartAccount}
                onBack={() => navigate('/')}
                onCreated={(group, blockNumber) => {
                  navigate('/group/' + group)
                  void backgroundRefreshGroups(blockNumber)
                }}
              />
            }
          />
        </Routes>
        </div>
      )}
    </FlowProvider>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}
