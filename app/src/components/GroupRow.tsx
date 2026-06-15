// GroupRow.tsx — Single group row for the Home screen group list.
// Reusable. Calls onSelectGroup when tapped.
//
// Money rule (§5.3): per-pair balance is tabular (<Num> default), always --ink.
// Direction is conveyed by <DirChip>; amounts are unsigned (no +/− prefix).

import type { GroupItem } from '../lib/fetchGroups'
import { getIdentity } from '../lib/identity'
import { Avatar, Num, money, DirChip, Skeleton } from '../ui'

interface GroupRowProps {
  group: GroupItem
  /** Viewer-relative signed balance from homeBalances.byGroup. undefined = still loading. */
  balance: bigint | undefined
  onClick: () => void
}

export function GroupRow({ group, balance, onClick }: GroupRowProps) {
  const identity = getIdentity(group.counterparty)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-[13px] bg-surface border border-border rounded-sm cursor-pointer hover:brightness-[0.97] transition-[filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ padding: '13px 14px' }} /* prototype screens.jsx */
    >
      {/* Avatar */}
      <Avatar initial={identity.initial} tone={identity.tone} size={44} />

      {/* Identity label */}
      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span
          className="font-ui font-semibold text-ink truncate"
          style={{ fontSize: 16 }} /* prototype components.jsx GroupRow */
        >
          {identity.label}
        </span>
        <span className="font-ui text-muted" style={{ fontSize: 12 }}>
          Shared account
        </span>
      </div>

      {/* Balance column — amount (unsigned) above direction chip, or chip alone when settled */}
      <div className="flex flex-col items-end gap-[4px] shrink-0">
        {balance === undefined ? (
          <Skeleton w={56} h={16} />
        ) : balance === 0n ? (
          <DirChip dir="settled" size="sm" />
        ) : (
          <>
            <Num size={16}>{money(balance)}</Num>
            <DirChip dir={balance > 0n ? 'in' : 'out'} size="sm" />
          </>
        )}
      </div>
    </button>
  )
}
