// YourPonti.tsx — Account screen: identity, email, wallet, theme, advanced details, logout.
// Self-contained: owns the USDC fetch, AddFundsPanel state, and all six sections.

import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { usePrivy } from '@privy-io/react-auth'
import { getIdentity, getNickname, setNickname } from '../lib/identity'
import type { Identity } from '../lib/identity'
import { fetchUsdcBalance } from '../lib/settle'
import { useTheme } from '../theme/ThemeProvider'
import { CHAIN } from '../config'
import { Avatar, Button, Field, Input, Left, Copy, External, Sun, Moon, Logout, SectionLabel } from '../ui'
import { WalletCard } from './WalletCard'
import { AddFundsPanel } from './AddFundsPanel'

type Props = {
  smartAccount: Address
  onBack: () => void
}

// Truncated display label: first 6 chars + ellipsis + last 4.
function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Account screen — name, email, wallet, theme toggle, advanced details, logout. */
export function YourPonti({ smartAccount, onBack }: Props) {
  const { logout, user } = usePrivy()
  const { theme, setTheme } = useTheme()

  // Identity and editable display name.
  const [identity, setIdentity] = useState<Identity>(() => getIdentity(smartAccount))
  const [name, setName] = useState(getNickname(smartAccount) ?? '')

  // USDC balance and AddFundsPanel visibility.
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [fundsOpen, setFundsOpen] = useState(false)

  // Advanced details section visibility.
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Copy-to-clipboard confirmation state.
  const [copied, setCopied] = useState(false)

  // Fetch USDC balance once on mount.
  useEffect(() => {
    fetchUsdcBalance(smartAccount).then(setUsdc).catch(() => {})
  }, [smartAccount])

  // Save name on blur: persist to localStorage, re-derive identity for avatar.
  function handleNameBlur() {
    setNickname(smartAccount, name)
    setIdentity(getIdentity(smartAccount))
  }

  // Copy the FULL smartAccount address to clipboard; show transient confirmation.
  function handleCopy() {
    navigator.clipboard.writeText(smartAccount).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  const email = user?.email?.address
  const explorerUrl = `${CHAIN.blockExplorers?.default.url}/address/${smartAccount}`

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '0 18px 30px' }}>

      {/* Shell: Back affordance */}
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
        Your Ponti
      </h1>
      <p
        className="font-ui"
        style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}
      >
        Your name, your funds, your account.
      </p>

      {/* Sections body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Section 1 — Identity: avatar + editable display name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initial={identity.initial} tone={identity.tone} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label="Display name">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
              />
            </Field>
          </div>
        </div>

        {/* Section 2 — Email: read-only display row */}
        {email && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SectionLabel>Email</SectionLabel>
            <p
              className="font-ui"
              style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}
            >
              {email}
            </p>
          </div>
        )}

        {/* Section 3 — WalletCard + AddFundsPanel */}
        <WalletCard usdc={usdc} onAddFunds={() => setFundsOpen(true)} />

        {/* Section 4 — Theme toggle: segmented Light / Dark control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>Appearance</SectionLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Light segment */}
            <button
              onClick={() => setTheme('light')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: theme === 'light' ? 'var(--accent-soft)' : 'var(--surface)',
                color: theme === 'light' ? 'var(--accent)' : 'var(--muted)',
                boxShadow: theme === 'light' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--border)',
              }}
            >
              <Sun color="currentColor" size={16} />
              Light
            </button>
            {/* Dark segment */}
            <button
              onClick={() => setTheme('dark')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: theme === 'dark' ? 'var(--accent-soft)' : 'var(--surface)',
                color: theme === 'dark' ? 'var(--accent)' : 'var(--muted)',
                boxShadow: theme === 'dark' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--border)',
              }}
            >
              <Moon color="currentColor" size={16} />
              Dark
            </button>
          </div>
        </div>

        {/* Section 5 — Advanced details: collapsible disclosure */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
            }}
          >
            <SectionLabel>Advanced</SectionLabel>
            <span
              className="font-ui text-muted"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {advancedOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {advancedOpen && (
            <div
              style={{
                display: 'flex', flexDirection: 'column', gap: 14,
                padding: '10px 14px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {/* Account address — truncated display, full value copied */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <SectionLabel>Account address</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="font-ui"
                    style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', flex: 1, minWidth: 0 }}
                  >
                    {truncateAddress(smartAccount)}
                  </span>
                  {/* Copy button writes the FULL address — this is the staging share path */}
                  <button
                    onClick={handleCopy}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent)',
                      fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <Copy color="var(--accent)" size={14} />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Network */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <SectionLabel>Network</SectionLabel>
                <p className="font-ui" style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                  Base — where USDC settles
                </p>
              </div>

              {/* Account type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <SectionLabel>Account type</SectionLabel>
                <p className="font-ui" style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                  Smart account · non-custodial
                </p>
              </div>

              {/* Explorer link */}
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                <External color="var(--accent)" size={14} />
                View on explorer
              </a>
            </div>
          )}
        </div>

        {/* Section 6 — Log out */}
        <Button variant="soft" full onClick={() => void logout()}>
          <Logout color="var(--accent)" size={16} />
          Log out
        </Button>

      </div>

      {/* AddFundsPanel — opened by WalletCard's onAddFunds */}
      <AddFundsPanel
        open={fundsOpen}
        onOpenChange={setFundsOpen}
        smartAccount={smartAccount}
        onBalance={(b) => setUsdc(b)}
      />

    </div>
  )
}
