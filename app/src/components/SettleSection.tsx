// SettleSection.tsx — Settle gate: all settle logic lives here.
//
// Receives a renderLayout render prop so GroupDetail can place the Settle button
// inside the hero action row and the low-USDC callout below it as full-width —
// without pulling any settle logic out of this component.
//
// When the viewer is NOT the debtor, renderLayout is called with (null, null) so
// GroupDetail still renders its unconditional "Add expense" button.

import { useEffect, useState, type ReactNode } from 'react'
import type { Address, Hex } from 'viem'
import { USDC_ADDRESS } from '../config'
import { buildSettleCalls } from '../lib/settle'
import { getIdentity } from '../lib/identity'
import { money } from '../ui'
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
    const counterpartyLabel = getIdentity(counterparty).label
    flow.start({
      kind: 'settle',
      title: 'Settle up',
      confirmLabel: `Settle ${money(debt)} USDC`,
      rows: [
        { label: "You're paying", value: `${money(debt)} USDC`, strong: true },
        { label: 'To', value: counterpartyLabel },
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

  // Short on USDC: disabled button + callout; funded: outline button.
  const isShort = localUsdcBalance !== null && localUsdcBalance < debt

  // Settle button — ghost+disabled when short or no sendBatch, outline when funded.
  const settleButton = (
    <button
      type="button"
      onClick={isShort || !sendBatch ? undefined : onSettle}
      disabled={isShort || !sendBatch}
      className={[
        'font-ui font-semibold text-base rounded-sm w-full',
        'inline-flex items-center justify-center gap-2 whitespace-nowrap',
        'transition-[filter,opacity] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'px-18 py-[14px]',
        isShort || !sendBatch
          ? 'bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--border)] opacity-50 cursor-default pointer-events-none'
          : 'bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--accent)] cursor-pointer hover:brightness-95',
      ].filter(Boolean).join(' ')}
    >
      {`Settle ${money(debt)} USDC`}
    </button>
  )

  // Low-USDC callout box — full-width, accent-soft background, Add funds link.
  const callout = isShort ? (
    <div
      className="bg-accent-soft"
      style={{ marginTop: 12, padding: '11px 13px', borderRadius: 'var(--radius-sm)' }}
    >
      <span
        className="font-ui"
        style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}
      >
        You need {money(debt - (localUsdcBalance ?? 0n))} more USDC to settle.{' '}
        {onAddFunds && (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onAddFunds() }}
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            Add funds
          </a>
        )}
      </span>
    </div>
  ) : null

  return (
    <>
      {renderLayout(settleButton, callout)}
    </>
  )
}
