// SettleSection.tsx — Settle gate: all settle logic lives here.
//
// Receives a renderLayout render prop so GroupDetail can place the settle button
// and low-USDC callout in the action zone without pulling logic out of this component.
// When the viewer is NOT the debtor, renderLayout is called with (null, null) so
// GroupDetail still renders its unconditional "Add expense" button.

import { useEffect, useState, type ReactNode } from 'react'
import type { Address, Hex } from 'viem'
import { USDC_ADDRESS } from '../config'
import { buildSettleCalls } from '../lib/settle'
import { getIdentity } from '../lib/identity'
import { Button, Plus, money } from '../ui'
import type { BalanceDisplay } from '../lib/fetchGroup'
import { useFlow } from '../flow/FlowContext'

type SendBatch = (calls: { to: Address; data: Hex }[]) => Promise<Hex>

type Props = {
  balance: bigint
  usdcBalance: bigint | null
  display: BalanceDisplay
  sendBatch: SendBatch | undefined
  groupAddress: Address
  smartAccount: Address
  /** Counterparty address — used for the consent-row "To" label. */
  counterparty: Address
  onSettled: () => Promise<void>
  onAddFunds?: () => void
  renderLayout: (button: ReactNode, callout: ReactNode | null) => ReactNode
}

export function SettleSection({
  balance,
  usdcBalance,
  display,
  sendBatch,
  groupAddress,
  counterparty,
  onSettled,
  onAddFunds,
  renderLayout,
}: Props) {
  const flow = useFlow()

  // Mirrors the parent prop so we can update on manual refresh without a full
  // GroupDetail reload. useEffect syncs back when the parent resets (e.g. post-settle).
  const [localUsdcBalance, setLocalUsdcBalance] = useState<bigint | null>(usdcBalance)
  useEffect(() => { setLocalUsdcBalance(usdcBalance) }, [usdcBalance])

  const debt = balance < 0n ? -balance : balance

  function onSettle() {
    if (!sendBatch) return
    const cp = getIdentity(counterparty)
    const counterpartyLabel = cp.named ? cp.label : 'them'
    flow.start({
      kind: 'settle',
      title: 'Settle up',
      confirmLabel: 'Settle up',
      rows: [
        { label: `You're paying ${counterpartyLabel}`, value: `${money(debt)} USDC`, strong: true },
      ],
      who: counterpartyLabel,
      submit: () => sendBatch(buildSettleCalls(USDC_ADDRESS, groupAddress, debt, groupAddress)),
      onComplete: onSettled,
    })
  }

  // Not the debtor: pass empty slots so GroupDetail still renders Add expense.
  if (display.direction !== 'i_owe_counterparty') {
    return <>{renderLayout(null, null)}</>
  }

  // Short on USDC: disabled settle button + warm callout.
  const isShort = localUsdcBalance !== null && localUsdcBalance < debt

  // Settle button — primary when funded, disabled when short or no sendBatch.
  const settleButton = (
    <Button
      variant="primary"
      full
      disabled={isShort || !sendBatch}
      onClick={onSettle}
    >
      Settle up
    </Button>
  )

  // Low-USDC callout — accent-soft background, never red (§5.7).
  const callout = isShort ? (
    <div className="callout callout--funds">
      <span className="ic">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9h-3.2a3 3 0 0 0 0 6H19v1.5A2.5 2.5 0 0 1 16.5 19h-11A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="15.6" cy="12" r="1.15" fill="currentColor" />
        </svg>
      </span>
      <div className="body">
        <span className="ct">You need {money(debt - (localUsdcBalance ?? 0n))} more USDC</span>
        <span className="cs">Add funds and the settle button unlocks on its own.</span>
        {onAddFunds && (
          <button className="add" onClick={onAddFunds}>
            <Plus color="currentColor" size={13} /> Add funds
          </button>
        )}
      </div>
    </div>
  ) : null

  return (
    <>
      {renderLayout(settleButton, callout)}
    </>
  )
}
