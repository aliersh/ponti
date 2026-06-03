import { useState } from 'react'
import { formatUnits, getAddress, parseUnits } from 'viem'
import type { Address, Hex } from 'viem'
import type { CSSProperties } from 'react'
import { publicClient } from '../lib/client'
import { submitEditExpense } from '../lib/editExpense'
import { submitDeleteExpense } from '../lib/deleteExpense'
import type { ExpenseEntry } from '../lib/fetchGroup'

type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  expenses: ExpenseEntry[]
  loadingDetail: boolean
  send: SendUserOperation | undefined
  groupAddress: Address
  smartAccount: Address
  counterparty: Address
  onMutated: () => Promise<void>
}

export function ExpenseList({
  expenses, loadingDetail, send, groupAddress, smartAccount, counterparty, onMutated,
}: Props) {
  const [editingId, setEditingId] = useState<bigint | null>(null)
  const [editPayer, setEditPayer] = useState<'me' | 'counterparty'>('me')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function onStartEdit(expense: ExpenseEntry) {
    setEditingId(expense.id)
    setEditPayer(getAddress(expense.payer) === getAddress(smartAccount) ? 'me' : 'counterparty')
    setEditAmount(formatUnits(expense.amount, 6))
    setEditDescription(expense.description)
    setEditError(null)
  }

  function onCancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function onSaveEdit() {
    if (!send || editingId === null) return
    let parsedAmount: bigint
    try {
      parsedAmount = parseUnits(editAmount, 6)
    } catch {
      setEditError('Invalid amount.')
      return
    }
    if (parsedAmount <= 0n) {
      setEditError('Amount must be greater than 0.')
      return
    }
    if (!editDescription.trim()) {
      setEditError('Description is required.')
      return
    }
    const payer = editPayer === 'me' ? smartAccount : counterparty
    setEditSubmitting(true)
    setEditError(null)
    try {
      const hash = await submitEditExpense(
        send, groupAddress, editingId, payer, parsedAmount, editDescription.trim(),
      )
      await publicClient.waitForTransactionReceipt({ hash })
      await onMutated()
      setEditingId(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : String(e))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function onDeleteExpense(expenseId: bigint) {
    if (!send) return
    if (!window.confirm('Delete this expense?')) return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const hash = await submitDeleteExpense(send, groupAddress, expenseId)
      await publicClient.waitForTransactionReceipt({ hash })
      await onMutated()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <>
      <h3>Expenses</h3>
      {expenses.length === 0 && !loadingDetail && <p style={{ color: 'grey' }}>No expenses yet.</p>}
      {deleteError && <p style={{ color: 'crimson' }}>{deleteError}</p>}
      {expenses.filter((e) => !e.deleted).map((e) => (
        <div key={String(e.id)} style={expenseRow}>
          {editingId === e.id ? (
            <div>
              <div>
                <label>
                  <input
                    type="radio" name="edit-payer" value="me"
                    checked={editPayer === 'me'}
                    onChange={() => setEditPayer('me')}
                  /> I paid
                </label>
                {' '}
                <label>
                  <input
                    type="radio" name="edit-payer" value="counterparty"
                    checked={editPayer === 'counterparty'}
                    onChange={() => setEditPayer('counterparty')}
                  /> Counterparty paid
                </label>
              </div>
              <input
                placeholder="Amount (USDC)"
                value={editAmount}
                onChange={(ev) => setEditAmount(ev.target.value)}
              />
              <input
                placeholder="Description"
                value={editDescription}
                onChange={(ev) => setEditDescription(ev.target.value)}
              />
              <div>
                <button onClick={onSaveEdit} disabled={editSubmitting || !send}>
                  {editSubmitting ? 'Saving…' : 'Save'}
                </button>
                {' '}
                <button onClick={onCancelEdit} disabled={editSubmitting}>Cancel</button>
              </div>
              {editError && <p style={{ color: 'crimson' }}>{editError}</p>}
            </div>
          ) : (
            <div>
              <span><strong>{e.description}</strong></span>
              {' '}
              <span>{formatUnits(e.amount, 6)} USDC — paid by <code style={{ fontSize: '0.85em' }}>{e.payer}</code></span>
              {' '}
              <button onClick={() => onStartEdit(e)} disabled={deleteSubmitting || editingId !== null}>Edit</button>
              {' '}
              <button onClick={() => onDeleteExpense(e.id)} disabled={deleteSubmitting || editingId !== null}>
                {deleteSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

const expenseRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '0.5rem',
  marginBottom: '0.5rem',
  border: '1px solid #eee',
  borderRadius: 4,
}
