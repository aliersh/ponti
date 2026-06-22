// avatar.tsx — Initial avatar primitive
//
// Circular avatar: letter initial or neutral-person fallback when initial is empty.
// Four Cal tones map to background/text pairs; lib/identity emits 'accent' | 'neutral'
// (the two primary tones). 's' and 'lilac' are available for screen-level use.

interface AvatarProps {
  initial: string
  tone?: 'accent' | 'neutral' | 's' | 'lilac'
  size?: number
}

// Cal tone → background/text token pair (§193–196)
const toneMap: Record<NonNullable<AvatarProps['tone']>, { bg: string; color: string }> = {
  accent: { bg: 'var(--accent-soft)',  color: 'var(--accent-soft-ink)' }, /* .ava--c */
  neutral:{ bg: 'var(--line)',         color: 'var(--ink-2)'           }, /* .ava--n */
  s:      { bg: 'var(--sage-soft)',    color: 'var(--sage)'            }, /* .ava--s */
  lilac:  { bg: 'var(--lilac-soft)',   color: 'var(--lilac-ink)'       }, /* .ava--lilac */
}

function PersonIcon({ size }: { size: number }) {
  const px = Math.round(size * 0.5)
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="9" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

export function Avatar({ initial, tone = 'accent', size = 44 }: AvatarProps) {
  const { bg, color } = toneMap[tone]
  return (
    <div
      className="inline-flex items-center justify-center rounded-full shrink-0 font-ui font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: bg,
        color,
      }}
    >
      {initial ? initial : <PersonIcon size={size} />}
    </div>
  )
}
