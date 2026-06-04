import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePrivy } from '@privy-io/react-auth'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import { getAddress, isAddress } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import { HomeView } from './components/HomeView'
import { GroupDetail } from './components/GroupDetail'
import { fetchMyGroups } from './lib/fetchGroups'
import type { GroupItem } from './lib/fetchGroups'
import { submitCreateGroup, fetchGroupAddress } from './lib/createGroup'
import { publicClient } from './lib/client'
import { waitForSubgraphBlock } from './lib/subgraph'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>
type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

// The smart account's address is the user's identity in Mend (the member that
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
  const { ready, authenticated, login, logout } = usePrivy()
  const { client } = useSmartWallets()
  const smartAccount = useSmartAccountAddress()
  const navigate = useNavigate()

  // groups state lives here so it persists across home/detail navigation and
  // loads exactly once when smartAccount first becomes available.
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupsInitialized, setGroupsInitialized] = useState(false)

  // create-group state lives here so it survives home/detail/home round-trips.
  const [counterparty, setCounterparty] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<Hex | null>(null)
  const [createdGroup, setCreatedGroup] = useState<Address | null>(null)
  const [groupNote, setGroupNote] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const send: SendUserOperation | undefined = client
    ? async (req) => (await client.sendTransaction(req)) as Hex
    : undefined

  const sendBatch: SendBatch | undefined = client
    ? async (calls) => (await client.sendTransaction({ calls })) as Hex
    : undefined

  async function loadGroups(account: Address) {
    setLoadingGroups(true)
    try {
      setGroups(await fetchMyGroups(account))
    } finally {
      setLoadingGroups(false)
      setGroupsInitialized(true)
    }
  }

  // Waits for the subgraph to index at least the chain head at call time, then
  // fetches the full groups list once. The _meta gate guarantees the new group
  // is visible without polling for a specific address.
  async function loadGroupsUntilNew(account: Address, _expectedAddress: Address) {
    setLoadingGroups(true)
    try {
      const target = await publicClient.getBlockNumber()
      await waitForSubgraphBlock(target)
      setGroups(await fetchMyGroups(account))
    } finally {
      setLoadingGroups(false)
      setGroupsInitialized(true)
    }
  }

  useEffect(() => {
    if (!smartAccount) return
    loadGroups(smartAccount)
  }, [smartAccount])

  async function onCreate() {
    if (!send || !isAddress(counterparty) || !smartAccount) return
    setSubmitting(true)
    setCreateError(null)
    setTxHash(null)
    setCreatedGroup(null)
    setGroupNote(null)
    try {
      // The hash is the proof the sponsored write went out; surface it first.
      const hash = await submitCreateGroup(send, counterparty)
      setTxHash(hash)
      // Best-effort: a receipt/parse failure here does not mean the transaction
      // failed (the Basescan link is the proof of that).
      try {
        const newGroupAddress = await fetchGroupAddress(hash)
        setCreatedGroup(newGroupAddress)
        await loadGroupsUntilNew(smartAccount, newGroupAddress)
      } catch (e) {
        setGroupNote(e instanceof Error ? e.message : String(e))
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const validationError = useMemo(() => {
    if (!counterparty) return null
    if (!isAddress(counterparty)) return 'Not a valid address.'
    if (smartAccount && getAddress(counterparty) === getAddress(smartAccount)) {
      return 'Cannot create a group with yourself.'
    }
    return null
  }, [counterparty, smartAccount])

  if (!ready) return <main style={page}><p>Loading…</p></main>

  if (!authenticated) {
    return (
      <main style={page}>
        <h1>Mend</h1>
        <button onClick={login}>Log in</button>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeView
            smartAccount={smartAccount}
            send={send}
            groups={groups}
            loadingGroups={loadingGroups}
            groupsInitialized={groupsInitialized}
            onSelectGroup={(group) =>
              navigate('/group/' + group.address, { state: { group } })
            }
            logout={logout}
            counterparty={counterparty}
            onCounterpartyChange={setCounterparty}
            submitting={submitting}
            txHash={txHash}
            createdGroup={createdGroup}
            groupNote={groupNote}
            createError={createError}
            validationError={validationError}
            onCreate={onCreate}
          />
        }
      />
      <Route
        path="/group/:address"
        element={<GroupDetailWrapper smartAccount={smartAccount} send={send} sendBatch={sendBatch} />}
      />
    </Routes>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}
