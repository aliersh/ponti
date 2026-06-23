// AddSomeone.tsx — "Add someone" screen: paste-address invite form that creates a
// new shared group via the write-flow controller. One createGroup call per submit.

import { useState } from 'react'
import type { Address, Hex } from 'viem'
import { submitCreateGroup, fetchGroupAddress } from '../lib/createGroup'
import { resolveInvite } from '../lib/inviteResolver'
import { setNickname, getIdentity } from '../lib/identity'
import { Button, Input, Avatar, Pair, Field } from '../ui'
import { useFlow } from '../flow/FlowContext'

// Narrow type: only the call shape this component makes, not the full Privy SDK type.
type SendUserOperation = (req: { to: Address; data: Hex }) => Promise<Hex>

type Props = {
  send: SendUserOperation | undefined
  smartAccount: Address | undefined
  onBack: () => void                                          // leave the screen without any write
  onCreated: (group: Address, blockNumber: bigint) => void   // called with new group + receipt block after confirm
  /** True when rendered inside a desktop Sheet modal — replaces the backbar with a close button. */
  asModal?: boolean
}

export function AddSomeone({ send, smartAccount, onBack, onCreated, asModal }: Props) {
  const flow = useFlow()

  const [nickname, setNicknameField] = useState('')
  const [id, setId] = useState('')
  const [idError, setIdError] = useState<string | null>(null)

  // Live-derived: pure + cheap, no memoization needed.
  const resolved = resolveInvite(id)
  const nameReady = nickname.trim().length > 0
  const ok = nameReady && resolved !== null && send !== undefined

  // Hint line — precedence: name missing → id invalid → ready → default helper.
  let hint: string
  if (!nameReady) {
    hint = 'Add a name to continue.'
  } else if (idError) {
    hint = idError
  } else if (ok) {
    hint = `You’ll see them as “${nickname.trim()}” — just on this device.`
  } else {
    hint = 'They’ll find their Ponti ID in their own Your Ponti screen.'
  }

  function onSubmit() {
    if (!send || !resolved || !nameReady) return

    // Persist nickname before the flow starts.
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
        const { group, blockNumber } = await fetchGroupAddress(createdHash)
        onCreated(group, blockNumber)
      },
    })
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface)', padding: '0 18px 30px' }}>

      {/* Modal close button replaces the backbar when rendered inside a Sheet. */}
      {asModal ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 2px 0' }}>
          <button
            onClick={onBack}
            aria-label="Close"
            style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 22, lineHeight: 1, padding: '2px 4px' }}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="backbar" style={{ padding: '16px 0' }}>
          <button className="x" onClick={onBack}>‹</button>
          <span className="ttl">Add someone</span>
        </div>
      )}

      <div>
        <p className="subtitle">Name them and paste their Ponti ID to start a shared tab.</p>

        {/* Dashed pair while unconnected; solid once both a name and valid ID are in. */}
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
            line={ok ? 'solid' : 'dash'}
            lineWidth={64}
          />
        </div>

        {/* Form body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Name field — label rendered inline to support the styled "· required" treatment. */}
          <label className="flex flex-col gap-[6px]">
            <span className="font-ui text-[12px] font-semibold text-ink-2">
              Name <span style={{ color: 'var(--accent-strong)' }}>·</span>{' '}
              <span className="font-medium text-ink-3">required</span>
            </span>
            <Input
              placeholder="What do you call them?"
              value={nickname}
              onChange={(e) => setNicknameField(e.target.value)}
            />
          </label>

          <Field label="Their Ponti ID">
            <Input
              placeholder="0x7a3f…9C2e"
              value={id}
              onChange={(e) => {
                const v = e.target.value
                setId(v)
                // Show the muted hint as soon as input is non-empty but unresolvable.
                if (v.trim() && !resolveInvite(v)) {
                  setIdError("That doesn’t look like a full Ponti ID yet — paste it complete.")
                } else {
                  setIdError(null)
                }
              }}
            />
          </Field>

          {/* Single muted hint line — never red; precedence handled above. */}
          <p className="font-ui text-ink-3 text-[11.5px]" style={{ margin: '-8px 0 0' }}>
            {hint}
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
