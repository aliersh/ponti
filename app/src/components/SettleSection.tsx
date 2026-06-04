import { useState } from 'react'
import { formatUnits } from 'viem'
import type { Address, Hex } from 'viem'
import { USDC_ADDRESS } from '../config'
import { publicClient } from '../lib/client'
import { buildSettleCalls } from '../lib/settle'
import type { BalanceDisplay } from '../lib/fetchGroup'

type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

type Props = {
  balance: bigint
  usdcBalance: bigint | null
  display: BalanceDisplay
  sendBatch: SendBatch | undefined
  groupAddress: Address
  onSettled: () => Promise<void>
}

export function SettleSection({ balance, usdcBalance, display, sendBatch, groupAddress, onSettled }: Props) {
  const [settleSubmitting, setSettleSubmitting] = useState(false)
  const [settleError, setSettleError] = useState<string | null>(null)

  const debt = balance < 0n ? -balance : balance

  async function onSettle() {
    if (!sendBatch) return
    setSettleSubmitting(true)
    setSettleError(null)
    try {
      const hash = await sendBatch(buildSettleCalls(USDC_ADDRESS, groupAddress, debt, groupAddress))
      await publicClient.waitForTransactionReceipt({ hash })
      await onSettled()
    } catch (e) {
      setSettleError(e instanceof Error ? e.message : String(e))
    } finally {
      setSettleSubmitting(false)
    }
  }

  return (
    <>
      <h3>Settle</h3>
      {usdcBalance !== null && usdcBalance < debt ? (
        <p>
          You need{' '}
          <strong>{formatUnits(debt - usdcBalance, 6)} more USDC</strong>
          {' '}to settle.{' '}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
            Get testnet USDC
          </a>
        </p>
      ) : (
        <div>
          <button onClick={onSettle} disabled={settleSubmitting || !sendBatch}>
            {settleSubmitting ? 'Settling…' : `Settle ${display.amount} USDC`}
          </button>
          {settleError && <p style={{ color: 'crimson' }}>{settleError}</p>}
        </div>
      )}
    </>
  )
}
