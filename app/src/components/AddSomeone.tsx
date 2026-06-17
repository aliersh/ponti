// AddSomeone.tsx — "Add someone" screen: paste-address invite form that creates a
// new shared group via the write-flow controller. One createGroup call per submit.

import { useState } from 'react'
import type { Address, Hex } from 'viem'
import { submitCreateGroup, fetchGroupAddress } from '../lib/createGroup'
import { resolveInvite } from '../lib/inviteResolver'
import { setNickname } from '../lib/identity'
import { Button, Field, Input, Left } from '../ui'
import { useFlow } from '../flow/FlowContext'

// Narrow type: only the call shape this component makes, not the full Privy SDK type.
type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  send: SendUserOperation | undefined
  onBack: () => void                    // leave the screen without any write
  onCreated: (group: Address) => void   // called with the new group address after confirm
}

export function AddSomeone({ send, onBack, onCreated }: Props) {
  const flow = useFlow()

  const [nickname, setNicknameField] = useState('')
  const [id, setId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Live-derived: pure + cheap, no memoization needed.
  const resolved = resolveInvite(id)
  const ok = resolved !== null && send !== undefined

  function onSubmit() {
    if (!send || !resolved) return

    // Persist nickname before the flow starts — deletes if empty (setNickname no-ops on '').
    setNickname(resolved, nickname)

    // Consent row: prefer the human-readable nickname; fall back to truncated address.
    const displayName = nickname.trim() || `${resolved.slice(0, 6)}…${resolved.slice(-4)}`

    // createdHash is captured in submit so onComplete can recover the deployed group
    // address. FlowContext calls submit, awaits the receipt, then calls onComplete —
    // onComplete receives no arguments, so the hash must travel via this closure.
    // fetchGroupAddress re-reads the receipt (already cached by the node) and parses
    // the GroupCreated log for the new PontiGroup address — the one write that yields
    // a fresh contract address rather than mutating an existing one.
    let createdHash: Hex | undefined

    flow.start({
      kind: 'create',
      title: 'Start a shared tab',
      confirmLabel: 'Start tab',
      rows: [{ label: 'With', value: displayName }],
      who: nickname.trim() || undefined,
      submit: async () => {
        const hash = await submitCreateGroup(send, resolved)
        createdHash = hash
        return hash
      },
      onComplete: async () => {
        if (!createdHash) return
        const group = await fetchGroupAddress(createdHash)
        onCreated(group)
      },
    })
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg)', padding: '0 18px 30px' }}>

      {/* Shell: Back affordance, title, subtitle */}
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
        Add someone
      </h1>
      <p
        className="font-ui"
        style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}
      >
        Start a shared tab and split as you go.
      </p>

      {/* Form body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <Field label="What will you call them?" hint="Only you see this.">
          <Input
            placeholder="e.g. Cami"
            value={nickname}
            onChange={(e) => setNicknameField(e.target.value)}
          />
        </Field>

        <Field label="Their Ponti ID">
          <Input
            placeholder="Paste their Ponti ID"
            value={id}
            onChange={(e) => {
              const v = e.target.value
              setId(v)
              // Show the muted hint as soon as input is non-empty but unresolvable.
              if (v.trim() && !resolveInvite(v)) {
                setFormError("That doesn't look like a valid Ponti ID yet.")
              } else {
                setFormError(null)
              }
            }}
          />
        </Field>

        <Button
          variant="primary"
          full
          disabled={!ok}
          onClick={onSubmit}
          style={{ marginTop: 6 }}
        >
          Start tab
        </Button>

        {formError && (
          <p className="font-ui" style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
            {formError}
          </p>
        )}

      </div>
    </div>
  )
}
