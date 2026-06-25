// FreshnessBanner — steady-state notice when the subgraph indexer is behind.
// Distinct from the post-write banner: no CTA, no spinner — a pulsing dot and degraded-state copy.
interface Props {
  /** 'settled' swaps to the last-synced-view copy for zero-balance / empty timeline views. */
  variant?: 'active' | 'settled'
}

const COPY = {
  active:  "The network's catching up — numbers may be a moment behind.",
  settled: "Showing the last synced view — the network's catching up.",
}

export function FreshnessBanner({ variant = 'active' }: Props) {
  return (
    <div className="fbar">
      <span className="fdot" />
      {COPY[variant]}
    </div>
  )
}
