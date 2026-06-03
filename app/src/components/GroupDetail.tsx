import { useEffect, useState } from 'react'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import { fetchBalance, fetchExpenseHistory, reconstructExpenses, interpretBalance } from '../lib/fetchGroup'
import type { ExpenseEntry, BalanceDisplay } from '../lib/fetchGroup'
import { fetchUsdcBalance } from '../lib/settle'
import type { GroupItem } from '../lib/fetchGroups'
import { SettleSection } from './SettleSection'
import { AddExpenseForm } from './AddExpenseForm'
import { ExpenseList } from './ExpenseList'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  group: GroupItem
  smartAccount: Address
  send: SendUserOperation | undefined
  onBack: () => void
}

export function GroupDetail({ group, smartAccount, send, onBack }: Props) {
  const [balance, setBalance] = useState<bigint | null>(null)
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null)

  async function loadDetail(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setBalance(null)
      setExpenses([])
      setDetailError(null)
      setUsdcBalance(null)
      setLoadingDetail(true)
    }
    try {
      const [bal, logs, usdc] = await Promise.all([
        fetchBalance(group.address),
        fetchExpenseHistory(group.address, group.createdBlock),
        fetchUsdcBalance(smartAccount),
      ])
      setBalance(bal)
      setExpenses(reconstructExpenses(logs))
      setUsdcBalance(usdc)
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : String(e))
    } finally {
      if (!opts?.silent) setLoadingDetail(false)
    }
  }

  // Fires once on mount. GroupDetail is unmounted and remounted whenever the
  // selected group changes, so this is equivalent to the original
  // useEffect([selectedGroup, smartAccount]) in the parent.
  useEffect(() => {
    loadDetail()
  }, [])

  const display: BalanceDisplay | null =
    balance !== null ? interpretBalance(balance, smartAccount, group.memberA) : null

  const reload = () => loadDetail({ silent: true })

  return (
    <main style={page}>
      <button onClick={onBack}>← Back</button>
      <h1>Mend</h1>
      <h2>Group with <code style={{ fontSize: '0.85em' }}>{group.counterparty}</code></h2>
      <p style={{ color: 'grey', fontSize: '0.8em' }}>
        Contract: <code>{group.address}</code>
      </p>

      <h3>Balance</h3>
      {loadingDetail && <p>Loading…</p>}
      {detailError && <p style={{ color: 'crimson' }}>Error: {detailError}</p>}
      {display && (
        <p>
          {display.direction === 'settled' && 'Settled'}
          {display.direction === 'counterparty_owes_me' && (
            <>Counterparty owes you <strong>{display.amount} USDC</strong></>
          )}
          {display.direction === 'i_owe_counterparty' && (
            <>You owe counterparty <strong>{display.amount} USDC</strong></>
          )}
        </p>
      )}

      {display?.direction === 'i_owe_counterparty' && balance !== null && (
        <SettleSection
          balance={balance}
          usdcBalance={usdcBalance}
          display={display}
          send={send}
          groupAddress={group.address}
          onSettled={reload}
        />
      )}

      <ExpenseList
        expenses={expenses}
        loadingDetail={loadingDetail}
        send={send}
        groupAddress={group.address}
        smartAccount={smartAccount}
        counterparty={group.counterparty}
        onMutated={reload}
      />

      <AddExpenseForm
        send={send}
        groupAddress={group.address}
        smartAccount={smartAccount}
        counterparty={group.counterparty}
        onAdded={reload}
      />
    </main>
  )
}

const page: CSSProperties = {
  maxWidth: 640,
  margin: '2rem auto',
  padding: '0 1rem',
  fontFamily: 'system-ui, sans-serif',
}
