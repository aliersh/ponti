// WalletStrip.tsx — Compact USDC balance strip for the Home screen.
// Reused on desktop later. Port of prototype wallet.jsx WalletStrip.
//
// Money rule (§5.3): amount is tabular (<Num> default), always --ink.
// Coin badge: inline SVG ring+dot, colored via currentColor (text-muted context).

import { Skeleton, Num, money, Button, Plus } from '../ui'

// Inline SVG coin glyph — ring + center dot (port of wallet.jsx WI.coin).
// Colored via currentColor so the wrapping span's text color applies.
function CoinGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

interface WalletStripProps {
  /** USDC balance in base units (6 decimals). null = still loading. */
  usdc: bigint | null
  /** Stub handler for F2; AddFundsPanel wires in F3. */
  onAddFunds?: () => void
}

export function WalletStrip({ usdc, onAddFunds }: WalletStripProps) {
  return (
    <div
      className="flex items-center gap-3 bg-surface border border-border rounded-sm"
      style={{ padding: '11px 14px' }} /* prototype wallet.jsx WalletStrip */
    >
      {/* Coin badge */}
      <span
        className="text-muted bg-surface-2 rounded-full shrink-0 flex items-center justify-center"
        style={{ width: 34, height: 34 }} /* prototype wallet.jsx */
      >
        <CoinGlyph size={16} />
      </span>

      {/* Label + amount */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 1 }}>
        <span
          className="font-ui font-semibold text-muted"
          style={{ fontSize: 12 }} /* prototype wallet.jsx */
        >
          Funds available
        </span>
        <span>
          {usdc === null ? (
            <Skeleton w={64} h={14} />
          ) : (
            <>
              <Num size={16}>{money(usdc)}</Num>{' '}
              <span className="font-ui font-semibold text-muted" style={{ fontSize: 12 }}>
                USDC
              </span>
            </>
          )}
        </span>
      </div>

      {/* Add funds — stub for F2; AddFundsPanel lands in F3 */}
      <Button
        variant="soft"
        onClick={onAddFunds}
        className="px-[13px] py-[9px]" /* tighter strip padding — prototype wallet.jsx */
      >
        <Plus color="var(--accent)" size={14} />
        Add funds
      </Button>
    </div>
  )
}
