// YourPonti.tsx — Account screen: identity, wallet, invite ID, theme, advanced, logout.
// Owns the USDC fetch, AddFundsPanel state, and name-edit persistence.

import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { usePrivy } from '@privy-io/react-auth'
import { getIdentity, getNickname, setNickname } from '../lib/identity'
import type { Identity } from '../lib/identity'
import { fetchUsdcBalance } from '../lib/settle'
import { useTheme } from '../theme/ThemeProvider'
import { CHAIN } from '../config'
import { Avatar, Button, Input, Copy, External, Sun, Moon, Pencil, Logout, SectionLabel } from '../ui'
import { WalletCard } from './WalletCard'
import { AddFundsPanel } from './AddFundsPanel'

type Props = {
  smartAccount: Address
  onBack: () => void
  /** True when rendered inside a desktop Sheet modal — replaces the backbar with a close button. */
  asModal?: boolean
}

// Truncated display label: first 6 chars + ellipsis + last 4.
function truncateAddress(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Account screen — identity, wallet, invite ID, theme toggle, advanced details, logout. */
export function YourPonti({ smartAccount, onBack, asModal }: Props) {
  const { logout, user } = usePrivy()
  const { theme, setTheme } = useTheme()

  // Identity and editable display name.
  const [identity, setIdentity] = useState<Identity>(() => getIdentity(smartAccount))
  const [name, setName] = useState(getNickname(smartAccount) ?? '')
  // Inline name-edit toggle: pencil enters edit mode; blur/Enter saves; Esc cancels.
  const [editing, setEditing] = useState(false)

  // USDC balance and AddFundsPanel visibility.
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [fundsOpen, setFundsOpen] = useState(false)

  // Advanced details section visibility.
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Copy-to-clipboard confirmation state (shared by idbox and advanced copy).
  const [copied, setCopied] = useState(false)

  // Fetch USDC balance once on mount.
  useEffect(() => {
    fetchUsdcBalance(smartAccount).then(setUsdc).catch(() => {})
  }, [smartAccount])

  // Save name: persist to localStorage, re-derive identity for avatar, exit edit mode.
  function handleNameSave() {
    setNickname(smartAccount, name)
    setIdentity(getIdentity(smartAccount))
    setEditing(false)
  }

  // Cancel edit: discard draft, restore persisted value, exit edit mode.
  function handleNameCancel() {
    setName(getNickname(smartAccount) ?? '')
    setEditing(false)
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
    <div style={{ minHeight: '100%', background: 'var(--surface)' }}>

      {/* Modal close button replaces the backbar when rendered inside a Sheet. */}
      {asModal ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
          <button
            onClick={onBack}
            aria-label="Close"
            style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="backbar" style={{ padding: '16px 18px' }}>
          <button className="x" onClick={onBack} aria-label="Back">‹</button>
          <span className="ttl">Your Ponti</span>
        </div>
      )}

      <div style={{ padding: '0 18px 36px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* .profile-top — centered column: lilac avatar, display name + pen, email */}
        <div className="profile-top">
          <Avatar initial={identity.initial} tone="lilac" size={64} />
          <div className="nm font-display">
            {editing ? (
              <Input
                autoFocus
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.currentTarget.blur() }
                  if (e.key === 'Escape') { e.preventDefault(); handleNameCancel() }
                }}
                style={{ fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' }}
              />
            ) : (
              <>
                {name || 'Your name'}
                <button
                  className="pen"
                  onClick={() => setEditing(true)}
                  style={{ all: 'unset', cursor: 'pointer' }}
                  aria-label="Edit name"
                >
                  <Pencil color="var(--ink-3)" size={13} />
                </button>
              </>
            )}
          </div>
          {email && (
            <div className="em font-ui">{email}</div>
          )}
        </div>

        {/* WalletCard — USDC balance + AddFundsPanel trigger */}
        <div style={{ marginTop: 18 }}>
          <WalletCard usdc={usdc} onAddFunds={() => setFundsOpen(true)} />
        </div>

        {/* .invite — Ponti ID (address) + Copy; no Share/QR */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Your Ponti ID</SectionLabel>
          <p
            className="it font-ui"
            style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '8px 0 10px', lineHeight: 1.5 }}
          >
            Share it so someone can start a shared tab with you.
          </p>
          <div className="idbox">
            <span className="id font-ui">{truncateAddress(smartAccount)}</span>
            <button
              onClick={handleCopy}
              className="cp font-ui"
              style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Copy color="var(--ink-3)" size={13} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Appearance — segmented Light / Dark toggle (staging boundary #1: kept) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <SectionLabel>Appearance</SectionLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTheme('light')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: theme === 'light' ? 'var(--accent-soft)' : 'var(--surface)',
                color: theme === 'light' ? 'var(--accent)' : 'var(--ink-3)',
                boxShadow: theme === 'light' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--hairline)',
              }}
            >
              <Sun color="currentColor" size={16} />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '13px 0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
                background: theme === 'dark' ? 'var(--accent-soft)' : 'var(--surface)',
                color: theme === 'dark' ? 'var(--accent)' : 'var(--ink-3)',
                boxShadow: theme === 'dark' ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--hairline)',
              }}
            >
              <Moon color="currentColor" size={16} />
              Dark
            </button>
          </div>
        </div>

        {/* .adv — Advanced details: hairline-top, collapsible row disclosure */}
        <div className="adv">
          <button
            className="ah font-ui"
            onClick={() => setAdvancedOpen((v) => !v)}
            style={{ appearance: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            Advanced details
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{advancedOpen ? '▾' : '▸'}</span>
          </button>

          {advancedOpen && (
            <div className="reveal">
              {/* Account address — truncated; copy icon reuses handleCopy (no extra state) */}
              <div className="arow">
                <span className="ak font-ui">Account address</span>
                <span className="av font-ui" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {truncateAddress(smartAccount)}
                  <button
                    onClick={handleCopy}
                    style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    aria-label="Copy address"
                  >
                    <Copy color="var(--ink-3)" size={12} />
                  </button>
                </span>
              </div>

              <div className="arow">
                <span className="ak font-ui">Network</span>
                <span className="av font-ui">Base — where USDC settles</span>
              </div>

              <div className="arow">
                <span className="ak font-ui">Account type</span>
                <span className="av font-ui">Smart account · non-custodial</span>
              </div>

              {/* Explorer link — lilac-ink per contract */}
              <div className="arow">
                <span className="ak font-ui">Explorer</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="av font-ui"
                  style={{ color: 'var(--lilac-ink)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  View on explorer
                  <External color="var(--lilac-ink)" size={12} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Log out — quiet text-action through Button */}
        <div className="logout">
          <Button variant="quiet" onClick={() => void logout()}>
            <Logout color="var(--ink-3)" size={15} />
            Log out
          </Button>
        </div>

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
