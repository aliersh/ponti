// AddFundsPanel.tsx — Three-phase wallet funding panel (guide → waiting → done).
// Rendered as a bottom sheet via the shared Sheet wrapper (ui/sheet.tsx).
// Drives phase transitions off a REAL fetchUsdcBalance poll — no mock timer.

import { useEffect, useRef, useState } from 'react'
import type { Address } from 'viem'
import { fetchUsdcBalance } from '../lib/settle'
import {
  Button, Check, Copy, External, Shield, Spinner, money,
} from '../ui'
import { Sheet } from '../ui/sheet'

// ── Constants ────────────────────────────────────────────────────────────────
// FAUCET ISOLATION BOUNDARY: everything below up to "End of faucet content" is
// the testnet-specific funding step. When a real fiat on-ramp replaces it,
// swap out Phase 1's content only — phases 2–3 (waiting + done) are flow-agnostic.

const FAUCET_URL = 'https://faucet.circle.com' // testnet USDC faucet — swap for on-ramp later
const FAUCET_GRANT = 20                         // display-only: max USDC per faucet request

// END of faucet content (Phase 1 only)

// ── Local helpers ─────────────────────────────────────────────────────────────

// AddressBlock — shows truncated address, Copy button that writes the FULL address.
// Stateless vis; copied confirmation is managed by local state inside.
function AddressBlock({ address }: { address: Address }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(address).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const truncated = `${address.slice(0, 6)}…${address.slice(-4)}`

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 13px',
        background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
      }}
    >
      <span
        className="tnum font-ui"
        style={{
          flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {truncated}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          all: 'unset', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          color: 'var(--accent)',
          fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {copied
          ? <><Check color="var(--accent)" size={14} /> Copied</>
          : <><Copy color="var(--accent)" size={14} /> Copy</>}
      </button>
    </div>
  )
}

// FaucetStep — numbered step with accent-soft circle badge.
function FaucetStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <span
        style={{
          flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, marginTop: 1,
        }}
      >
        {n}
      </span>
      <span
        className="font-ui"
        style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.45 }}
      >
        {children}
      </span>
    </div>
  )
}

// ── Shared panel header ───────────────────────────────────────────────────────

function PanelHeader({ onClose, showClose }: { onClose: () => void; showClose: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 20px 0', paddingBottom: 8 }}>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          className="font-display"
          style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
        >
          Add funds
        </span>
        {/* Testnet pill — visual indicator this is not real money */}
        <span
          className="font-ui"
          style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--muted)', background: 'var(--surface-2)',
            padding: '3px 7px', borderRadius: 999,
          }}
        >
          Testnet
        </span>
      </span>
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            all: 'unset', cursor: 'pointer', color: 'var(--muted)',
            padding: 4, display: 'inline-flex',
          }}
        >
          {/* Inline X icon — no icon dep needed for a single 17px close mark */}
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M4 4l10 10M14 4L4 14" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── AddFundsPanel ─────────────────────────────────────────────────────────────

interface AddFundsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The user's smart account address — shown/copied and used for balance reads. */
  smartAccount: Address
  /** Called with the new balance once funds land, so callers can update their USDC display. */
  onBalance?: (bal: bigint) => void
}

type Phase = 'guide' | 'waiting' | 'done'

/**
 * Three-phase funding panel: guide (faucet instructions) → waiting (real balance
 * poll, no mock timer) → done (received confirmation). Uses Sheet for the overlay shell.
 */
export function AddFundsPanel({ open, onOpenChange, smartAccount, onBalance }: AddFundsPanelProps) {
  const [phase, setPhase] = useState<Phase>('guide')
  const [newBal, setNewBal] = useState<bigint | null>(null)

  // baseline in both state (for done-phase display) and a ref (so the poll
  // interval closure always reads the current value, not the stale captured one).
  const [baseline, setBaseline] = useState<bigint | null>(null)
  const baselineRef = useRef<bigint | null>(null)

  // Keep ref in sync with state on every render.
  baselineRef.current = baseline

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearPoll() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Effect 1: On open → reset to 'guide', clear old state, read baseline balance.
  useEffect(() => {
    if (!open) return
    setPhase('guide')
    setNewBal(null)
    setBaseline(null)
    baselineRef.current = null
    clearPoll()
    // Read baseline — errors are swallowed (baseline stays null; poll guards handle this).
    fetchUsdcBalance(smartAccount)
      .then((bal) => {
        setBaseline(bal)
        baselineRef.current = bal
      })
      .catch(() => {})
  }, [open, smartAccount])

  // Effect 2: When phase flips to 'waiting', start the real balance poll.
  // Uses baselineRef (not the state closure) so it always sees the latest baseline,
  // even if baseline resolved after the phase transition.
  useEffect(() => {
    if (phase !== 'waiting') {
      clearPoll()
      return
    }
    intervalRef.current = setInterval(() => {
      fetchUsdcBalance(smartAccount)
        .then((bal) => {
          // Guard: only advance if baseline is known and balance has grown.
          // If baseline is still null (very slow drpc), keep waiting — never show false positive.
          if (baselineRef.current !== null && bal > baselineRef.current) {
            clearPoll()
            setNewBal(bal)
            onBalance?.(bal)
            setPhase('done')
          }
        })
        .catch(() => {
          // Swallow poll errors — never render red/error; keep waiting silently.
        })
    }, 5000)

    return clearPoll
  }, [phase, smartAccount, onBalance])

  // Unmount cleanup
  useEffect(() => clearPoll, [])

  const close = () => onOpenChange(false)

  // Derived: delta to show in done phase. Null-safe: if baseline was never read,
  // fall back to showing the new balance itself (no fabricated delta).
  const delta = newBal !== null ? newBal - (baseline ?? newBal) : null

  const innerPadding: React.CSSProperties = { padding: '0 20px 26px' }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      placement="sheet"
      dismissible={phase !== 'waiting'}
      title="Add funds"
    >
      {/* Header — X close shown in guide + done, hidden in waiting (panel is non-dismissible then) */}
      <PanelHeader onClose={close} showClose={phase !== 'waiting'} />

      {/* ── PHASE 1: GUIDE ─────────────────────────────────────────────────── */}
      {/* FAUCET CONTENT START — swap this block for a real on-ramp later */}
      {phase === 'guide' && (
        <div style={{ ...innerPadding, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <p
            className="font-ui"
            style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}
          >
            Add USDC to your balance so you're ready to settle up. For now it's free — you'll grab
            some test funds from a faucet. Takes about a minute.
          </p>

          {/* Address block */}
          <div>
            <span
              className="font-ui"
              style={{
                display: 'block', marginBottom: 7,
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.03em', textTransform: 'uppercase',
              }}
            >
              Your address
            </span>
            <AddressBlock address={smartAccount} />
          </div>

          {/* Faucet steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span
              className="font-ui"
              style={{
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.03em', textTransform: 'uppercase',
              }}
            >
              On the faucet
            </span>
            <FaucetStep n={1}>
              Choose <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>USDC</strong> on the{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>Base Sepolia</strong> network.
            </FaucetStep>
            <FaucetStep n={2}>Paste the address above.</FaucetStep>
            <FaucetStep n={3}>
              Request — you can get up to{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>
                {FAUCET_GRANT} USDC every 2 hours
              </strong>
              .
            </FaucetStep>
          </div>

          {/* Open faucet CTA */}
          <Button
            variant="primary"
            full
            onClick={() => {
              try { window.open(FAUCET_URL, '_blank', 'noopener,noreferrer') } catch {}
              setPhase('waiting')
            }}
          >
            <External color="var(--accent-ink)" size={15} /> Open faucet
          </Button>

          {/* Reassurance line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)', marginTop: -4 }}>
            <span style={{ display: 'inline-flex' }}>
              <Shield color="var(--muted)" size={14} />
            </span>
            <span className="font-ui" style={{ fontSize: 12 }}>
              No refresh needed — your balance updates here the moment it arrives.
            </span>
          </div>
        </div>
        // FAUCET CONTENT END
      )}

      {/* ── PHASE 2: WAITING ─────────────────────────────────────────────────
          Sheet is non-dismissible (escape/outside blocked); only explicit close works.
          Poll runs in the background — no error UI ever shown. */}
      {phase === 'waiting' && (
        <div style={{ ...innerPadding, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
          {/* Status heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Spinner size={20} />
            <span
              className="font-display"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
            >
              Waiting for your funds…
            </span>
          </div>

          <p
            className="font-ui"
            style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}
          >
            This usually lands in under a minute. You can close this — we'll keep watching, and
            your balance updates on its own.
          </p>

          {/* Address block — user may need to copy it again */}
          <div>
            <span
              className="font-ui"
              style={{
                display: 'block', marginBottom: 7,
                fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
                letterSpacing: '0.03em', textTransform: 'uppercase',
              }}
            >
              Your address
            </span>
            <AddressBlock address={smartAccount} />
          </div>

          {/* Open faucet again link */}
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              color: 'var(--accent)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
            }}
          >
            <External color="var(--accent)" size={14} /> Open faucet again
          </a>

          {/* Explicit close — only way to dismiss while waiting */}
          <Button variant="ghost" full onClick={close} style={{ marginTop: 2 }}>
            Close — keep watching
          </Button>
        </div>
      )}

      {/* ── PHASE 3: DONE ─────────────────────────────────────────────────── */}
      {phase === 'done' && (
        <div
          style={{
            ...innerPadding,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 10, paddingTop: 10,
          }}
        >
          {/* Accent check circle — ponti-pop entrance animation (index.css) */}
          <div
            style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'ponti-pop .4s cubic-bezier(.3,1.5,.5,1)',
            }}
          >
            <Check color="var(--accent)" size={26} />
          </div>

          <span
            className="font-display"
            style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Funds received
          </span>

          {/* Delta line — null-safe: if baseline was never read, show new balance only */}
          {newBal !== null && (
            <span
              className="tnum font-ui"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}
            >
              {delta !== null && delta > 0n
                ? `+${money(delta)} USDC added to your balance`
                : `${money(newBal)} USDC now in your balance`}
            </span>
          )}

          {/* New balance box */}
          {newBal !== null && (
            <div
              style={{
                marginTop: 4, padding: '10px 16px',
                background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'baseline', gap: 8,
              }}
            >
              <span className="font-ui" style={{ fontSize: 13, color: 'var(--muted)' }}>
                New balance
              </span>
              <span
                className="tnum font-display"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                {money(newBal)}{' '}
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>USDC</span>
              </span>
            </div>
          )}

          <Button variant="primary" full onClick={close} style={{ marginTop: 8 }}>
            Done
          </Button>
        </div>
      )}
    </Sheet>
  )
}
