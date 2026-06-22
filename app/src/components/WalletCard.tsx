// WalletCard.tsx — Card-shaped USDC balance display for the YourPonti screen.
// Presentational: eyebrow, display-font amount, reassurance caption, add-funds CTA.

import { Skeleton, Num, money, Button, Plus } from '../ui'

interface WalletCardProps {
  /** USDC balance in base units (6 decimals). null = still loading. */
  usdc: bigint | null
  onAddFunds?: () => void
}

/** USDC balance card: eyebrow, amount, cap-line, add-funds button. */
export function WalletCard({ usdc, onAddFunds }: WalletCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Eyebrow + amount — .ce/.cv contract treatment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          className="font-ui font-semibold"
          style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}
        >
          Funds available
        </span>
        <span
          style={{
            display: 'flex', alignItems: 'baseline', gap: 4,
            marginTop: 6, marginBottom: 4, fontFeatureSettings: '"tnum" 1',
          }}
        >
          {usdc === null ? (
            <Skeleton w={150} h={30} />
          ) : (
            <>
              <Num size={26} display>{money(usdc)}</Num>
              <span className="font-ui font-semibold" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                USDC
              </span>
            </>
          )}
        </span>
      </div>

      {usdc === null ? (
        <>
          {/* Cap-line and button skeleton — shown while balance loads */}
          <div style={{ marginBottom: 12 }}><Skeleton w={210} h={11} /></div>
          <div style={{ display: 'flex' }}>
            <Skeleton w={96} h={32} r={10} />
          </div>
        </>
      ) : (
        <>
          {/* Reassurance caption — plain-truths voice */}
          <p
            className="font-ui"
            style={{ margin: '0 0 12px', fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-3)' }}
          >
            Your balance to settle with — Ponti never holds it.
          </p>

          {/* .crow — button row (space-between for future second action) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="soft" onClick={onAddFunds}>
              <Plus color="var(--accent)" size={14} />
              Add funds
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
