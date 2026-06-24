import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { isAddress } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
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
}: {
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
  subgraphDegraded: boolean
}) {
  const { address } = useParams<{ address: string }>()
  if (!address || !isAddress(address)) return <Navigate to="/" replace />
  if (!smartAccount) return <main style={page}><p>Loading…</p></main>
  // key forces remount on address change, preserving the mount-only useEffect invariant
  return <GroupDetail key={address} address={address} smartAccount={smartAccount} send={send} sendBatch={sendBatch} subgraphDegraded={subgraphDegraded} />
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
    />
  )
}

export function App() {
  const { ready, authenticated } = usePrivy()
  const { client } = useSmartWallets()
  const smartAccount = useSmartAccountAddress()
  const navigate = useNavigate()
  const prevAuthenticated = useRef<boolean | null>(null)
  const isDesktop = useDesktop()

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

  if (!ready) return <main style={page}><p>Loading…</p></main>

  if (!authenticated) {
    return <SignIn />
  }

  // Handlers shared by both mobile and desktop paths.
  const handleRetry = () => {
    if (smartAccount) void loadGroups(smartAccount)
    if (smartAccount) void fetchBalances(smartAccount, groups)
  }

  // Shared props for DesktopLayoutWrapper — passed to all desktop routes including
  // the background split rendered under /you and /add modals.
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
            element={<GroupDetailWrapper smartAccount={smartAccount} send={send} sendBatch={sendBatch} subgraphDegraded={subgraphDegraded} />}
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
