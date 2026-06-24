// NamingSheet.tsx — Bottom sheet for naming (or renaming) a counterparty.
// Reuses the Sheet primitive; name lives only in localStorage, never leaves the device.

import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { setNickname } from '../lib/identity'
import { Sheet } from '../ui/sheet'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Address whose nickname is being set or updated. */
  counterparty: Address
  /** Current nickname — prefills the field when renaming; undefined when first naming. */
  currentNickname: string | undefined
  /** Called after setNickname writes to localStorage. */
  onSaved?: () => void
  placement?: 'sheet' | 'modal'
}

export function NamingSheet({ open, onOpenChange, counterparty, currentNickname, onSaved, placement = 'sheet' }: Props) {
  const [value, setValue] = useState(currentNickname ?? '')

  // Sync field when the sheet opens — handles the rename case where currentNickname
  // may change between opens (e.g. user renames twice in the same session).
  useEffect(() => {
    if (open) setValue(currentNickname ?? '')
  }, [open, currentNickname])

  function handleSave() {
    if (!value.trim()) return
    setNickname(counterparty, value)
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Name this person" placement={placement}>
      <div style={{ padding: '4px 18px 28px' }}>

        {/* Visual heading + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          <span
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}
          >
            Who's this?
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            style={{
              all: 'unset', marginLeft: 'auto', cursor: 'pointer',
              color: 'var(--ink-3)', fontSize: 19, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: '2px 0 16px', lineHeight: 1.45 }}>
          Give them a name you'll recognise. Ponti can't see who they are — this name lives only on your phone.
        </p>

        {/* Name field */}
        <div style={{ marginBottom: 14 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
            Name
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="e.g. Cami"
            autoFocus
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box',
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 12, padding: '11px 13px',
              fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-strong)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--line)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Primary action */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!value.trim()}
          style={{
            width: '100%',
            background: value.trim() ? 'var(--accent-strong)' : 'var(--line)',
            color: value.trim() ? '#fff' : 'var(--ink-3)',
            padding: '12px 16px', borderRadius: 12,
            fontWeight: 600, fontSize: 13.5,
            border: 'none', cursor: value.trim() ? 'pointer' : 'default',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Save name
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', marginTop: 11 }}>
          You can change it any time.
        </p>

      </div>
    </Sheet>
  )
}
