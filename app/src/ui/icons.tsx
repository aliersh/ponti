// icons.tsx — Ponti icon set (inline SVG components)
//
// Each icon is a named React component with consistent props:
//   color? — defaults to "currentColor"; pass a var(--…) token or "currentColor"
//   size?  — scales the icon; see per-icon notes on non-square defaults
//
// Non-square icons preserve their intrinsic aspect ratio:
//   - Dots:   intrinsic 18 × 5  (size drives width; height = size * 5/18)
//   - Shield: intrinsic 15 × 17 (size drives width; height = size * 17/15)
//   - Camera: intrinsic 13 × 13 (square; but renders over 15×15 viewBox)
//
// Stroke vs fill: icons that use fill (Dots) are marked; do NOT apply blanket
// stroke overrides. SVG internals are verbatim from prototype components.jsx.

interface IconProps {
  color?: string
  size?: number
}

// ── Plus ───────────────────────────────────────────────────────────────────────
export function Plus({ color = 'currentColor', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 3v12M3 9h12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Check ──────────────────────────────────────────────────────────────────────
export function Check({ color = 'currentColor', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M3.5 9.5l3.5 3.5 7.5-8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Shield ─────────────────────────────────────────────────────────────────────
// Intrinsic: 15 × 17. size drives width; height = size × 17/15.
export function Shield({ color = 'currentColor', size = 15 }: IconProps) {
  return (
    <svg
      width={size}
      height={size * (17 / 15)}
      viewBox="0 0 15 17"
      fill="none"
    >
      <path
        d="M7.5 1l6 2.2v4.3c0 4-2.6 7-6 8.4C4.1 14.5 1.5 11.5 1.5 7.5V3.2L7.5 1z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5 8.3l1.8 1.8L10.2 6.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Globe ──────────────────────────────────────────────────────────────────────
export function Globe({ color = 'currentColor', size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5.6" stroke={color} strokeWidth="1.1" />
      <path
        d="M.9 6.5h11.2M6.5.9c1.7 1.6 2.6 3.6 2.6 5.6S8.2 10.9 6.5 12.1C4.8 10.5 3.9 8.5 3.9 6.5S4.8 2.1 6.5.9z"
        stroke={color}
        strokeWidth="1.1"
      />
    </svg>
  )
}

// ── Left ───────────────────────────────────────────────────────────────────────
export function Left({ color = 'currentColor', size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M12 4l-6 6 6 6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Right ──────────────────────────────────────────────────────────────────────
export function Right({ color = 'currentColor', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M6 3l5 5-5 5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Dots ───────────────────────────────────────────────────────────────────────
// Intrinsic: 18 × 5 (NOT square). Uses fill, not stroke.
// size drives width; height = size × 5/18.
export function Dots({ color = 'currentColor', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size * (5 / 18)} viewBox="0 0 18 5">
      <circle cx="2.5" cy="2.5" r="2" fill={color} />
      <circle cx="9" cy="2.5" r="2" fill={color} />
      <circle cx="15.5" cy="2.5" r="2" fill={color} />
    </svg>
  )
}

// ── Copy ───────────────────────────────────────────────────────────────────────
export function Copy({ color = 'currentColor', size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <rect x="4.5" y="4.5" width="8" height="8" rx="2" stroke={color} strokeWidth="1.3" />
      <path
        d="M2.5 9.5V3a1.5 1.5 0 011.5-1.5h6"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Share ──────────────────────────────────────────────────────────────────────
export function Share({ color = 'currentColor', size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 1.5v8M4.5 4l3-3 3 3"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 7.5v4.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V7.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Scan ───────────────────────────────────────────────────────────────────────
export function Scan({ color = 'currentColor', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 5V3.5A1.5 1.5 0 013.5 2H5M11 2h1.5A1.5 1.5 0 0114 3.5V5M14 11v1.5a1.5 1.5 0 01-1.5 1.5H11M5 14H3.5A1.5 1.5 0 012 12.5V11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── External ───────────────────────────────────────────────────────────────────
export function External({ color = 'currentColor', size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <path
        d="M6.5 3H3.5A1.5 1.5 0 002 4.5v7A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5v-3M9 2.5h3.5V6M12.5 2.5L7 8"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Camera ─────────────────────────────────────────────────────────────────────
// Prototype renders 13×13 but uses a 15×15 viewBox — keep both as-is.
export function Camera({ color = 'currentColor', size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <path
        d="M2 5.2A1.2 1.2 0 013.2 4h1.4l.9-1.2h4l.9 1.2h1.4A1.2 1.2 0 0113 5.2v5.6A1.2 1.2 0 0111.8 12H3.2A1.2 1.2 0 012 10.8V5.2z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="8" r="2.1" stroke={color} strokeWidth="1.3" />
    </svg>
  )
}

// ── Lock ───────────────────────────────────────────────────────────────────────
export function Lock({ color = 'currentColor', size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <rect x="3" y="6.4" width="9" height="6.2" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path
        d="M5 6.4V5a2.5 2.5 0 015 0v1.4"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Sun ────────────────────────────────────────────────────────────────────────
export function Sun({ color = 'currentColor', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3.4" stroke={color} strokeWidth="1.5" />
      <path
        d="M9 1.6v1.9M9 14.5v1.9M1.6 9h1.9M14.5 9h1.9M3.8 3.8l1.3 1.3M12.9 12.9l1.3 1.3M14.2 3.8l-1.3 1.3M5.1 12.9l-1.3 1.3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Moon ───────────────────────────────────────────────────────────────────────
export function Moon({ color = 'currentColor', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M15 10.6A6.6 6.6 0 117.4 3 5.1 5.1 0 0015 10.6z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Pencil ─────────────────────────────────────────────────────────────────────
export function Pencil({ color = 'currentColor', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M9.5 1.8l2.7 2.7M2 12l1-3.2 6.8-6.8 2.2 2.2L5.2 11 2 12z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Trash ──────────────────────────────────────────────────────────────────────
export function Trash({ color = 'currentColor', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5h9M5 3.5V2.2h4v1.3M3.6 3.5l.5 8h5.8l.5-8"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Logout ─────────────────────────────────────────────────────────────────────
export function Logout({ color = 'currentColor', size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <path
        d="M6 2.5H3.5A1.5 1.5 0 002 4a1.5 1.5 0 000 .5v7a1.5 1.5 0 001.5 1.5H6M9.5 4.5L12.5 7.5l-3 3M12.5 7.5H6"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── ArrowIn ────────────────────────────────────────────────────────────────────
// Downward arrow — "owes you" (money flowing in to viewer). 18×18 viewBox.
export function ArrowIn({ color = 'currentColor', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M9 3.2V12.6M4.6 8.1L9 12.8 13.4 8.1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── ArrowOut ───────────────────────────────────────────────────────────────────
// Upward arrow — "you owe" (money flowing out from viewer). 18×18 viewBox.
export function ArrowOut({ color = 'currentColor', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M9 14.8V5.4M4.6 9.9L9 5.2 13.4 9.9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Icons record (convenience map) ────────────────────────────────────────────
export const Icons = {
  Plus,
  Check,
  Shield,
  Globe,
  Left,
  Right,
  Dots,
  Copy,
  Share,
  Scan,
  External,
  Camera,
  Lock,
  Sun,
  Moon,
  Pencil,
  Trash,
  Logout,
  ArrowIn,
  ArrowOut,
} as const
