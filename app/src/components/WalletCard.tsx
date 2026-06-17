// WalletCard.tsx — Card-shaped USDC balance display for the YourPonti screen.
// Presentational sibling of WalletStrip; same prop pattern, card layout instead of strip.

import { Skeleton, Num, money, Button, Plus } from '../ui'

interface WalletCardProps {
  /** USDC balance in base units (6 decimals). null = still loading. */
  usdc: bigint | null
  onAddFunds?: () => void
}

/** Presentational USDC balance card: eyebrow, amount, reassurance caption, add-funds button. */
export function WalletCard({ usdc, onAddFunds }: WalletCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Eyebrow + amount */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          className="font-ui font-semibold text-muted"
          style={{ fontSize: 12 }}
        >
          Funds available
        </span>
        <span>
          {usdc === null ? (
            <Skeleton w={80} h={22} />
          ) : (
            <>
              <Num size={22}>{money(usdc)}</Num>{' '}
              <span className="font-ui font-semibold text-muted" style={{ fontSize: 13 }}>
                USDC
              </span>
            </>
          )}
        </span>
      </div>

      {/* Reassurance caption — §12 plain-truths voice */}
      <p
        className="font-ui text-muted"
        style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}
      >
        Yours to spend — Ponti never holds it.
      </p>

      <Button variant="soft" onClick={onAddFunds}>
        <Plus color="var(--accent)" size={14} />
        Add funds
      </Button>
    </div>
  )
}
