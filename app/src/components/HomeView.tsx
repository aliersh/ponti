import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import type { GroupItem } from '../lib/fetchGroups'
import { fetchUsdcBalance } from '../lib/settle'
import { AddFunds } from './AddFunds'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  smartAccount: Address | undefined
  send: SendUserOperation | undefined
  groups: GroupItem[]
  loadingGroups: boolean
  groupsInitialized: boolean
  onSelectGroup: (group: GroupItem) => void
  logout: () => void
  // create-group state (owned by App for persistence across navigation)
  counterparty: string
  onCounterpartyChange: (v: string) => void
  submitting: boolean
  txHash: Hex | null
  createdGroup: Address | null
  groupNote: string | null
  createError: string | null
  validationError: string | null
  onCreate: () => void
}

export function HomeView({
  smartAccount,
  send,
  groups,
  loadingGroups,
  groupsInitialized,
  onSelectGroup,
  logout,
  counterparty,
  onCounterpartyChange,
  submitting,
  txHash,
  createdGroup,
  groupNote,
  createError,
  validationError,
  onCreate,
}: Props) {
  const canSubmit = !!send && !!counterparty && !validationError && !submitting

  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)
  useEffect(() => {
    if (!smartAccount) return
    fetchUsdcBalance(smartAccount).then(setUsdcBalance).catch(() => {})
  }, [smartAccount])

  return (
    <main style={page}>
      <h1>Ponti</h1>
      <p>
        Smart account: <code>{smartAccount ?? 'provisioning…'}</code>{' '}
        <button onClick={logout}>Log out</button>
      </p>
      {smartAccount && (
        <>
          {usdcBalance !== null && (
            <p>
              Wallet:{' '}
              <a
                href={`https://sepolia.basescan.org/address/${smartAccount}`}
                target="_blank"
                rel="noreferrer"
              >
                {formatUnits(usdcBalance, 6)} USDC
              </a>
            </p>
          )}
          <AddFunds smartAccount={smartAccount} onRefreshed={setUsdcBalance} />
        </>
      )}

      <h2>Your groups</h2>
      {loadingGroups && <p>Loading…</p>}
      {groupsInitialized && !loadingGroups && groups.length === 0 && (
        <p style={{ color: 'grey' }}>No groups yet. Create one below.</p>
      )}
      {groups.map((g) => (
        <div
          key={g.address}
          style={groupRow}
          onClick={() => onSelectGroup(g)}
        >
          <code style={{ fontSize: '0.85em' }}>{g.address}</code>
          <span style={{ color: 'grey', fontSize: '0.85em' }}>
            with <code>{g.counterparty}</code>
          </span>
        </div>
      ))}

      <h2>Create group</h2>
      <input
        placeholder="Counterparty address (0x…)"
        value={counterparty}
        onChange={(e) => onCounterpartyChange(e.target.value.trim())}
        style={{ width: 440, fontFamily: 'monospace' }}
      />
      <div>
        <button onClick={onCreate} disabled={!canSubmit}>
          {submitting ? 'Sending (sponsored)…' : 'Create group'}
        </button>
      </div>
      {validationError && <p style={{ color: 'crimson' }}>{validationError}</p>}

      {txHash && (
        <div>
          <p>
            Transaction submitted (sponsored):{' '}
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              view on Basescan
            </a>
          </p>
          {createdGroup && (
            <p>
              Group created: <code>{createdGroup}</code>
            </p>
          )}
          {groupNote && (
            <p style={{ color: 'darkorange' }}>
              Submitted, but could not read the group address yet: {groupNote}
            </p>
          )}
        </div>
      )}
      {createError && <p style={{ color: 'crimson' }}>Error: {createError}</p>}
    </main>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}

const groupRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '0.5rem',
  marginBottom: '0.5rem',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
}
