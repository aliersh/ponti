// brand.tsx — Ponti brand primitives
//
// Wordmark: "ponti" in Cabinet Grotesk 800, tight tracking (§96).
// Mark:     two points + one line SVG — the product's structural grammar (§428–433).
//   Left circle + line: currentColor (inherits container color, flips in dark).
//   Right circle: #D1486A — the rosa accent point, hardcoded per contract.

// ── Wordmark ───────────────────────────────────────────────────────────────────
interface WordmarkProps {
  size?: number
  color?: string
}

export function Wordmark({ size = 22, color = 'var(--ink)' }: WordmarkProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,          /* §96: weight 800 in brandline */
        fontSize: size,
        letterSpacing: '-0.02em', /* §96 */
        color,
        lineHeight: 1,
      }}
    >
      ponti
    </span>
  )
}

// ── Mark ───────────────────────────────────────────────────────────────────────
// viewBox: 0 0 40 14 (aspect ratio ~2.86:1). s prop drives width; height scales.
// Left circle + connecting line: currentColor — adapts to light/dark context.
// Right circle: #D1486A — the active/accent endpoint, always rosa (§428).

interface MarkProps {
  s?: number
}

export function Mark({ s = 40 }: MarkProps) {
  return (
    <svg
      width={s}
      height={Math.round(s * (14 / 40))}
      viewBox="0 0 40 14"
      fill="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <line x1="5" y1="7" x2="35" y2="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="5"  cy="7" r="3.4" fill="currentColor" />
      <circle cx="35" cy="7" r="3.4" fill="#D1486A" />
    </svg>
  )
}
