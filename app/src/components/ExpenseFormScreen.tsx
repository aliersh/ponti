// ExpenseFormScreen.tsx — Full-screen add/edit expense form.
// mode="add" starts with empty fields; mode="edit" prefills from `initial`.
// Shell (backbar + subtitle) and body (amount-field + stack) are delineated —
// body wraps into a modal shell in a later desktop phase.

import { useState } from 'react'
import { formatUnits, getAddress, parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { submitAddExpense } from '../lib/addExpense'
import { submitEditExpense } from '../lib/editExpense'
import { submitDeleteExpense } from '../lib/deleteExpense'
import { getIdentity } from '../lib/identity'
import type { ExpenseEntry } from '../lib/fetchGroup'
import { Avatar, Button, Field, Input, Seg, money } from '../ui'
import { useFlow } from '../flow/FlowContext'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  mode: 'add' | 'edit'
  initial?: ExpenseEntry       // required when mode === 'edit', undefined for add
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onBack: () => void           // Back: returns to detail without any write
  onComplete: () => Promise<void>  // fires after successful write; caller clears formState
}

export function ExpenseFormScreen({
  mode,
  initial,
  send,
  groupAddress,
  smartAccount,
  counterparty,
  onBack,
  onComplete,
}: Props) {
  const flow = useFlow()
  const editing = mode === 'edit'
  const identity = getIdentity(counterparty)

  // Field initialisation from initial (edit) or defaults (add).
  const [payer, setPayer] = useState<'me' | 'counterparty'>(
    initial
      ? getAddress(initial.payer) === getAddress(smartAccount) ? 'me' : 'counterparty'
      : 'me',
  )
  const [amount, setAmount] = useState(initial ? formatUnits(initial.amount, 6) : '')
  const [description, setDescription] = useState(initial ? initial.description : '')
  // Validation error — only for the parseUnits edge case; muted, never red.
  const [formError, setFormError] = useState<string | null>(null)

  // Validation: primary disabled until amount > 0 and description filled.
  const ok = parseFloat(amount) > 0 && description.trim().length > 0

  // Edit-mode only: primary also disabled until at least one field differs from initial.
  const dirty = (() => {
    if (!editing || !initial) return true
    const initialPayer = getAddress(initial.payer) === getAddress(smartAccount) ? 'me' : 'counterparty'
    const payerChanged = payer !== initialPayer
    const descChanged = description.trim() !== initial.description.trim()
    let amountChanged = true
    try { amountChanged = parseUnits(amount, 6) !== initial.amount } catch { /* invalid amount counts as changed */ }
    return payerChanged || descChanged || amountChanged
  })()

  function onSubmit() {
    if (!send) return
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(amount, 6)
    } catch {
      setFormError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setFormError('Amount must be greater than 0.')
      return
    }
    const trimmed = description.trim()
    if (!trimmed) {
      setFormError('Description is required.')
      return
    }
    setFormError(null)
    const payerAddress = payer === 'me' ? smartAccount : counterparty
    const payerLabel = payer === 'me' ? 'You' : identity.label

    if (editing && initial) {
      const id = initial.id
      flow.start({
        kind: 'edit',
        title: 'Edit expense',
        confirmLabel: 'Save changes',
        rows: [
          { label: 'Who paid', value: payerLabel },
          { label: 'Amount', value: `${money(parsedAmount)} USDC`, strong: true },
          { label: 'For', value: trimmed },
        ],
        prevValue: money(initial.amount),
        submit: () => submitEditExpense(send, groupAddress, id, payerAddress, parsedAmount, trimmed),
        onComplete: async () => { await onComplete() },
      })
    } else {
      flow.start({
        kind: 'add',
        title: 'Add expense',
        confirmLabel: 'Add expense',
        rows: [
          { label: 'Who paid', value: payerLabel },
          { label: 'Amount', value: `${money(parsedAmount)} USDC`, strong: true },
          { label: 'For', value: trimmed },
        ],
        submit: () => submitAddExpense(send, groupAddress, payerAddress, parsedAmount, trimmed),
        onComplete: async () => { await onComplete() },
      })
    }
  }

  // Delete is self-contained: same flow.start pattern, kind='delete', targets initial.id.
  function onDelete() {
    if (!send || !initial) return
    flow.start({
      kind: 'delete',
      title: 'Delete expense',
      confirmLabel: 'Delete expense',
      rows: [
        { label: 'For', value: initial.description },
        { label: 'Amount', value: `${money(initial.amount)} USDC`, strong: true },
      ],
      submit: () => submitDeleteExpense(send, groupAddress, initial.id),
      onComplete: async () => { await onComplete() },
    })
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface)', padding: '0 18px 30px' }}>

      {/* Shell: backbar affordance (raw button) + display-font title */}
      <div className="backbar" style={{ padding: '16px 0' }}>
        <button className="x" onClick={onBack}>‹</button>
        <span className="ttl">{editing ? 'Edit expense' : 'Add an expense'}</span>
      </div>

      <div className="subtitle font-ui">
        {editing
          ? 'Fix the details — the balance updates to match.'
          : 'Add what you paid for — Ponti keeps the count.'}
      </div>

      {/* Form body — self-contained; wrappable by a modal shell in a later desktop phase */}

      {/* Amount: boxed centered card — eyebrow label, 48px display input */}
      <div className="amount-field">
        <span className="l font-ui">Amount</span>
        <div className="amount-box">
          <input
            className="big"
            placeholder="0.00"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="u font-ui">USDC</span>
        </div>
      </div>

      <div className="stack">

        <Field label="What for?">
          <Input
            placeholder="e.g. Groceries"
            autoComplete="off"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        {/* Payer toggle: 'me' | 'counterparty' as Seg values — no address round-trip needed */}
        <div className="flex flex-col gap-[6px] payframe">
          <span className="font-ui font-semibold text-ink-2 text-[12px]">Who paid?</span>
          <Seg
            options={[
              { value: 'me', label: 'You' },
              { value: 'counterparty', label: identity.label,
                avatar: <Avatar initial={identity.initial} tone={identity.tone} size={18} /> },
            ]}
            selected={payer}
            onChange={(v) => setPayer(v as 'me' | 'counterparty')}
          />
        </div>

        {/* Primary disabled until amount > 0 and description filled; in edit mode also until a field changes */}
        <Button
          variant="primary"
          full
          disabled={editing ? (!ok || !dirty || !send) : (!ok || !send)}
          onClick={onSubmit}
          style={{ marginTop: 4 }}
        >
          {editing ? 'Review changes' : 'Review & add'}
        </Button>

        {editing && (
          <Button
            variant="quiet"
            onClick={onDelete}
            style={{ alignSelf: 'center' }}
          >
            Delete expense
          </Button>
        )}

        {/* Hint shown when amount is not yet valid and no parseUnits error is active */}
        {!formError && (!amount || parseFloat(amount) <= 0) && (
          <p className="font-ui" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', margin: '6px 0 0' }}>
            Enter an amount to continue.
          </p>
        )}

        {formError && (
          <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0 }}>
            {formError}
          </p>
        )}

      </div>
    </div>
  )
}
