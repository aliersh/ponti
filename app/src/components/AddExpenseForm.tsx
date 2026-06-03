import { useState } from 'react'
import { parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { publicClient } from '../lib/client'
import { submitAddExpense } from '../lib/addExpense'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onAdded: () => Promise<void>
}

export function AddExpenseForm({ send, groupAddress, smartAccount, counterparty, onAdded }: Props) {
  const [addPayer, setAddPayer] = useState<'me' | 'counterparty'>('me')
  const [addAmount, setAddAmount] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function onAddExpense() {
    if (!send) return
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(addAmount, 6)
    } catch {
      setAddError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setAddError('Amount must be greater than 0.')
      return
    }
    if (!addDescription.trim()) {
      setAddError('Description is required.')
      return
    }
    const payer = addPayer === 'me' ? smartAccount : counterparty
    setAddSubmitting(true)
    setAddError(null)
    try {
      const hash = await submitAddExpense(send, groupAddress, payer, parsedAmount, addDescription.trim())
      await publicClient.waitForTransactionReceipt({ hash })
      await onAdded()
      setAddAmount('')
      setAddDescription('')
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e))
    } finally {
      setAddSubmitting(false)
    }
  }

  return (
    <>
      <h3>Add expense</h3>
      <div>
        <label>
          <input
            type="radio" name="payer" value="me"
            checked={addPayer === 'me'}
            onChange={() => setAddPayer('me')}
          /> I paid
        </label>
        {' '}
        <label>
          <input
            type="radio" name="payer" value="counterparty"
            checked={addPayer === 'counterparty'}
            onChange={() => setAddPayer('counterparty')}
          /> Counterparty paid
        </label>
      </div>
      <input
        placeholder="Amount (USDC, e.g. 12.50)"
        value={addAmount}
        onChange={(e) => setAddAmount(e.target.value)}
      />
      <input
        placeholder="Description"
        value={addDescription}
        onChange={(e) => setAddDescription(e.target.value)}
      />
      <div>
        <button onClick={onAddExpense} disabled={addSubmitting || !send}>
          {addSubmitting ? 'Sending (sponsored)…' : 'Add expense'}
        </button>
      </div>
      {addError && <p style={{ color: 'crimson' }}>{addError}</p>}
    </>
  )
}
