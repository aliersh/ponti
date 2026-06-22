// WalletStrip.tsx — Compact USDC balance strip for the Home screen (design contract §298–301).
// Reads as set-apart utility — never a third balance. Sits inside the .acct zone below groups.

import { Skeleton, Button, Plus } from '../ui'
import { formatUnits } from 'viem'

interface WalletStripProps {
  /** USDC balance in base units (6 decimals). null = still loading. */
  usdc: bigint | null
  onAddFunds?: () => void
}

// Formats a USDC bigint to a tabular display string (e.g. "320.00").
function fmtUsdc(base: bigint): string {
  return Number(formatUnits(base, 6)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function WalletStrip({ usdc, onAddFunds }: WalletStripProps) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '11px 13px',
      }}
    >
      {/* Eyebrow label + tabular amount */}
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--ink-3)',
          }}
        >
          Funds available
        </span>

        <span className="flex items-baseline" style={{ gap: 3 }}>
          {usdc === null ? (
            <Skeleton w={64} h={14} />
          ) : (
            <>
              {/* .fv: display font, tabular figures, ink */}
              <span
                className="tnum"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 17,
                  color: 'var(--ink)',
                }}
              >
                {fmtUsdc(usdc)}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>
                USDC
              </span>
            </>
          )}
        </span>
      </div>

      {/* Add funds — soft button, never reads as a balance action */}
      <Button variant="soft" onClick={onAddFunds}>
        <Plus color="var(--accent)" size={14} />
        Add funds
      </Button>
    </div>
  )
}
