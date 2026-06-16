// ExpenseFormScreen.tsx — Full-screen add/edit expense form (mobile).
// mode="add" starts with empty fields; mode="edit" prefills from `initial`.
// Shell (Back + title + subtitle) and body (fields + button) are delineated — body wraps into ModalShell in a later desktop phase.

import { useState } from 'react'
import { formatUnits, getAddress, parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { submitAddExpense } from '../lib/addExpense'
import { submitEditExpense } from '../lib/editExpense'
import { getIdentity } from '../lib/identity'
import type { ExpenseEntry } from '../lib/fetchGroup'
import { Avatar, Button, Field, Input, Left, money } from '../ui'
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

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '0 18px 30px' }}>

      {/* Shell: Back affordance, title, subtitle */}
      <div style={{ padding: '6px 0 14px' }}>
        <button
          onClick={onBack}
          style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
          className="font-ui"
        >
          <span style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Left color="var(--ink)" size={18} /> Back
          </span>
        </button>
      </div>
      <h1
        className="font-display"
        style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}
      >
        {editing ? 'Edit expense' : 'Add expense'}
      </h1>
      <p
        className="font-ui"
        style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}
      >
        {editing
          ? 'Fix the details — the balance updates to match.'
          : 'Add what you paid for — Ponti keeps the count.'}
      </p>

      {/* Form body — self-contained; wrappable by ModalShell in a later desktop phase */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <Field label="Amount">
          {/* Amount: display font, tabular, ink — money rule §5.3 */}
          <div style={{ position: 'relative' }}>
            <Input
              placeholder="0.00"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                paddingRight: 72,
              }}
            />
            <span
              className="font-ui"
              style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                fontSize: 15, fontWeight: 600, color: 'var(--muted)',
              }}
            >
              USDC
            </span>
          </div>
        </Field>

        <Field label="What for?">
          <Input
            placeholder="e.g. Groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Who paid?">
          {/* Payer toggles: selected = accent-soft bg + accent border; unselected = surface + border */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPayer('me')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                textAlign: 'center', padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: payer === 'me' ? 'var(--accent-soft)' : 'var(--surface)',
                color: payer === 'me' ? 'var(--accent)' : 'var(--muted)',
                boxShadow: payer === 'me' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--border)',
              }}
            >
              You
            </button>
            <button
              onClick={() => setPayer('counterparty')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                textAlign: 'center', padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: payer === 'counterparty' ? 'var(--accent-soft)' : 'var(--surface)',
                color: payer === 'counterparty' ? 'var(--accent)' : 'var(--muted)',
                boxShadow: payer === 'counterparty' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--border)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Avatar initial={identity.initial} tone={identity.tone} size={18} />
                {identity.label}
              </span>
            </button>
          </div>
        </Field>

        {/* Primary disabled until amount > 0 and description filled; parseUnits error shows as muted note */}
        <Button
          variant="primary"
          full
          disabled={!ok || !send}
          onClick={onSubmit}
          style={{ marginTop: 6 }}
        >
          {editing ? 'Review changes' : 'Review & add'}
        </Button>

        {formError && (
          <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
            {formError}
          </p>
        )}

      </div>
    </div>
  )
}
