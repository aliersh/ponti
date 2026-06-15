// AddExpenseForm.tsx — Inline add-expense form.
// Validates fields then hands the write to the flow controller via useFlow().start();
// the controller owns the confirm overlay, receipt wait, and error recovery.

import { useState } from 'react'
import { parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { submitAddExpense } from '../lib/addExpense'
import { getIdentity } from '../lib/identity'
import { Button, Field, Input, money } from '../ui'
import { useFlow } from '../flow/FlowContext'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onAdded: () => Promise<void>
}

export function AddExpenseForm({ send, groupAddress, smartAccount, counterparty, onAdded }: Props) {
  const flow = useFlow()
  const [addPayer, setAddPayer] = useState<'me' | 'counterparty'>('me')
  const [addAmount, setAddAmount] = useState('')
  const [addDescription, setAddDescription] = useState('')
  // Validation-only error — write errors are owned by the flow controller.
  const [formError, setFormError] = useState<string | null>(null)

  function onAddExpense() {
    if (!send) return
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(addAmount, 6)
    } catch {
      setFormError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setFormError('Amount must be greater than 0.')
      return
    }
    const trimmed = addDescription.trim()
    if (!trimmed) {
      setFormError('Description is required.')
      return
    }
    setFormError(null)
    const payer = addPayer === 'me' ? smartAccount : counterparty
    const payerLabel = addPayer === 'me' ? 'You' : getIdentity(counterparty).label
    flow.start({
      kind: 'add',
      title: 'Add expense',
      confirmLabel: 'Add expense',
      rows: [
        { label: 'Who paid', value: payerLabel },
        { label: 'Amount', value: `${money(parsedAmount)} USDC`, strong: true },
        { label: 'For', value: trimmed },
      ],
      submit: () => submitAddExpense(send, groupAddress, payer, parsedAmount, trimmed),
      // Form fields reset only on completion — cancelled flow preserves the user's input.
      onComplete: async () => { await onAdded(); setAddAmount(''); setAddDescription('') },
    })
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
        disabled={!send}
      >
        Add expense
      </Button>

      {/* Validation error — muted note, never crimson */}
      {formError && (
        <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          {formError}
        </p>
      )}
    </div>
  )
}
