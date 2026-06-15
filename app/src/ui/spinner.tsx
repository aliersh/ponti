// spinner.tsx — Rotating progress indicator
// Single-ring circle: one arc in var(--accent), the rest in var(--border).
// Rotation via Tailwind's built-in animate-spin (no custom keyframe needed).

/** Compact circular spinner. Default size 15px; used in post-write status rows. */
export function Spinner({ size = 15 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-t-transparent shrink-0"
      style={{
        width: size,
        height: size,
        borderColor: 'var(--border)',
        borderTopColor: 'var(--accent)',
      }}
      aria-hidden="true"
    />
  )
}
