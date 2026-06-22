// AddSomeone.tsx — "Add someone" screen: paste-address invite form that creates a
// new shared group via the write-flow controller. One createGroup call per submit.

import { useState } from 'react'
import type { Address, Hex } from 'viem'
import { submitCreateGroup, fetchGroupAddress } from '../lib/createGroup'
import { resolveInvite } from '../lib/inviteResolver'
import { setNickname, getIdentity } from '../lib/identity'
import { Button, Field, Input, Avatar, Pair } from '../ui'
import { useFlow } from '../flow/FlowContext'

// Narrow type: only the call shape this component makes, not the full Privy SDK type.
type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  send: SendUserOperation | undefined
  smartAccount: Address | undefined
  onBack: () => void                    // leave the screen without any write
  onCreated: (group: Address) => void   // called with the new group address after confirm
}

export function AddSomeone({ send, smartAccount, onBack, onCreated }: Props) {
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

    // Self identity: real identity from smartAccount with tone forced to lilac (create-confirm pair).
    const selfIdentity = smartAccount
      ? { ...getIdentity(smartAccount), tone: 'lilac' as const }
      : { label: 'You', initial: '', tone: 'lilac' as const }

    flow.start({
      kind: 'create',
      title: 'Start a shared tab',
      confirmLabel: 'Start tab',
      rows: [{ label: 'With', value: displayName }],
      who: nickname.trim() || undefined,
      pair: {
        self: selfIdentity,
        other: getIdentity(resolved),
      },
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
    <div style={{ minHeight: '100%', background: 'var(--surface)', padding: '0 18px 30px' }}>

      {/* Backbar: ‹ affordance + screen title in display font */}
      <div className="backbar" style={{ padding: '16px 0' }}>
        <button className="x" onClick={onBack}>‹</button>
        <span className="ttl">Add someone</span>
      </div>

      <div>
        <p className="subtitle">Paste the person's Ponti ID to start a shared tab.</p>

        {/* Dashed pair: self (lilac) → counterparty avatar once a name is entered, else open node */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0 22px' }}>
          <Pair
            left={<Avatar tone="lilac" initial="" size={36} />}
            right={
              nickname
                ? <Avatar
                    initial={nickname[0]}
                    tone={resolved ? getIdentity(resolved).tone : 'neutral'}
                    size={36}
                  />
                : 'open'
            }
            line="dash"
            lineWidth={64}
          />
        </div>

        {/* Form body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <Field label="Name">
            <Input
              placeholder="What do you call them?"
              value={nickname}
              onChange={(e) => setNicknameField(e.target.value)}
            />
          </Field>

          <Field label="Their Ponti ID">
            <Input
              placeholder="0x7a3f…9C2e"
              value={id}
              onChange={(e) => {
                const v = e.target.value
                setId(v)
                // Show the muted hint as soon as input is non-empty but unresolvable.
                if (v.trim() && !resolveInvite(v)) {
                  setFormError("That doesn't look like a full Ponti ID yet — paste it complete.")
                } else {
                  setFormError(null)
                }
              }}
            />
          </Field>

          {/* Muted, never-red: unresolved hint when input fails validation; default helper otherwise */}
          <p className="font-ui text-ink-3 text-[11.5px]" style={{ margin: '-8px 0 0' }}>
            {formError ?? "They'll find their Ponti ID in their own Your Ponti screen."}
          </p>

          <Button
            variant="primary"
            full
            disabled={!ok}
            onClick={onSubmit}
          >
            Add someone
          </Button>

        </div>
      </div>
    </div>
  )
}
