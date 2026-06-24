// FreshnessBanner — steady-state notice when the subgraph indexer is behind.
// Distinct from F8's post-write catching-up banner: no spinner, no CTA — just a calm line.
export function FreshnessBanner() {
  // Copy is a repo-default pending the Claude Design degraded-state pass.
  return (
    <div className="home-banner">
      Catching up — this may be a moment behind.
    </div>
  )
}
