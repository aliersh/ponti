import { useEffect, useMemo, useState } from 'react'
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
import { fetchMyGroups } from './lib/fetchGroups'
import type { GroupItem } from './lib/fetchGroups'
import { FlowProvider } from './flow/FlowContext'

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

function GroupDetailWrapper({
  smartAccount,
  send,
  sendBatch,
}: {
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  sendBatch: SendBatch | undefined
}) {
  const { address } = useParams<{ address: string }>()
  if (!address || !isAddress(address)) return <Navigate to="/" replace />
  if (!smartAccount) return <main style={page}><p>Loading…</p></main>
  // key forces remount on address change, preserving the mount-only useEffect invariant
  return <GroupDetail key={address} address={address} smartAccount={smartAccount} send={send} sendBatch={sendBatch} />
}

export function App() {
  const { ready, authenticated } = usePrivy()
  const { client } = useSmartWallets()
  const smartAccount = useSmartAccountAddress()
  const navigate = useNavigate()

  // groups state lives here so it persists across home/detail navigation and
  // loads exactly once when smartAccount first becomes available.
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupsInitialized, setGroupsInitialized] = useState(false)
  const [groupsError, setGroupsError] = useState(false)

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

  useEffect(() => {
    if (!smartAccount) return
    loadGroups(smartAccount)
  }, [smartAccount])


  if (!ready) return <main style={page}><p>Loading…</p></main>

  if (!authenticated) {
    return <SignIn />
  }

  return (
    <FlowProvider>
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
              onSelectGroup={(group) =>
                navigate('/group/' + group.address, { state: { group } })
              }
              onRetry={() => smartAccount && void loadGroups(smartAccount)}
              onOpenAccount={() => navigate('/you')}
              onAddSomeone={() => navigate('/add')}
            />
          }
        />
        <Route
          path="/group/:address"
          element={<GroupDetailWrapper smartAccount={smartAccount} send={send} sendBatch={sendBatch} />}
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
          element={<AddSomeone send={send} onBack={() => navigate('/')} onCreated={(group) => navigate('/group/' + group)} />}
        />
      </Routes>
    </FlowProvider>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}
