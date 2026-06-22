// GroupRow.tsx — Single group row hung on the Home tie-spine.
// Semantic tap-target button; layout controlled by .grow CSS, not the Button primitive.
//
// Money rule: unsigned amount in --ink; direction in DirChip. Settled rows: chip only.

import type { GroupItem } from '../lib/fetchGroups'
import { getIdentity } from '../lib/identity'
import { Avatar, Num, money, DirChip, Skeleton } from '../ui'

interface GroupRowProps {
  group: GroupItem
  /** Viewer-relative signed balance from homeBalances.byGroup. undefined = still loading. */
  balance: bigint | undefined
  onClick: () => void
}

// Gender-neutral sub-line copy — "she owes you" in the design HTML is illustrative only.
function subLine(balance: bigint): string {
  if (balance > 0n) return 'owes you'
  if (balance < 0n) return 'you owe'
  return 'all settled'
}

export function GroupRow({ group, balance, onClick }: GroupRowProps) {
  const identity = getIdentity(group.counterparty)

  // Raw reset button: .grow CSS owns padding, margin, position:relative, and the
  // ::before connector stub + hairline top border (with :first-child exception).
  // Use explicit resets (not all:unset) so the .grow class rules aren't wiped.
  return (
    <button
      type="button"
      onClick={onClick}
      className="grow w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{
        appearance: 'none',
        background: 'none',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Avatar initial={identity.initial} tone={identity.tone} size={36} />

      {/* Identity + neutral relationship sub-line */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 1 }}>
        <span
          className="font-ui font-semibold text-ink truncate"
          style={{ fontSize: 14 }}
        >
          {identity.label}
        </span>
        {balance !== undefined && (
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
            {subLine(balance)}
          </span>
        )}
      </div>

      {/* Balance column — amount above chip, or chip alone when settled */}
      <div className="flex flex-col items-end shrink-0" style={{ gap: 4 }}>
        {balance === undefined ? (
          <Skeleton w={48} h={14} />
        ) : balance === 0n ? (
          <DirChip dir="settled" size="sm" label="settled" />
        ) : (
          <>
            <Num size={14.5} weight={600}>{money(balance)}</Num>
            <DirChip dir={balance > 0n ? 'in' : 'out'} size="sm" />
          </>
        )}
      </div>
    </button>
  )
}
