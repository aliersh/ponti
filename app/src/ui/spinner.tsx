// spinner.tsx — Rotating progress indicator
// Ring in line-2; top arc in ink-3 — the muted Cal banner spinner (§308).
// Rotation via Tailwind's built-in animate-spin (no custom keyframe needed).

/** Compact circular spinner. Default size 13px; used in banners and status rows. */
export function Spinner({ size = 13 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 shrink-0"
      style={{
        width: size,
        height: size,
        borderColor: 'var(--line-2)',
        borderTopColor: 'var(--ink-3)',
      }}
      aria-hidden="true"
    />
  )
}
