// AddExpenseForm.tsx — Inline add-expense form (interim styling).
//
// Light UI-kit pass over the raw-input version: Field/Input primitives, Button
// for the submit action, muted error note. All logic and the name="payer" radio
// group are unchanged. The form will be replaced by a FlowWidget sheet in a
// later phase; this is just enough polish to not clash with the restyled screen.

import { useState } from 'react'
import { parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { publicClient } from '../lib/client'
import { submitAddExpense } from '../lib/addExpense'
import { Button, Field, Input } from '../ui'

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
    <div
      className="bg-surface border border-border"
      style={{ borderRadius: 'var(--radius)', padding: '18px 18px 20px', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <span
        className="font-ui"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}
      >
        Add expense
      </span>

      {/* Payer radios — name="payer" intentionally distinct from edit form's name="edit-payer" */}
      <div style={{ display: 'flex', gap: 18 }}>
        <label
          className="font-ui"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="payer"
            value="me"
            checked={addPayer === 'me'}
            onChange={() => setAddPayer('me')}
          />
          I paid
        </label>
        <label
          className="font-ui"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer' }}
        >
          <input
            type="radio"
            name="payer"
            value="counterparty"
            checked={addPayer === 'counterparty'}
            onChange={() => setAddPayer('counterparty')}
          />
          Counterparty paid
        </label>
      </div>

      <Field label="Amount">
        <Input
          placeholder="e.g. 12.50"
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          inputMode="decimal"
        />
      </Field>

      <Field label="Description">
        <Input
          placeholder="What was this for?"
          value={addDescription}
          onChange={(e) => setAddDescription(e.target.value)}
        />
      </Field>

      <Button
        variant="primary"
        full
        onClick={onAddExpense}
        disabled={addSubmitting || !send}
      >
        {addSubmitting ? 'Sending…' : 'Add expense'}
      </Button>

      {/* Add error — muted note, never crimson */}
      {addError && (
        <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          {addError}
        </p>
      )}
    </div>
  )
}
