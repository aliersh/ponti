// skeleton.tsx — Shimmer placeholder primitive
//
// Uses the `skel` utility defined in index.css (appended below the token block).
// The shimmer gradient and animation are purely CSS — no inline animation here.
// Props drive width/height/borderRadius inline so each skeleton can size freely.
//
// NOTE on shimmer: the `skel` @utility is appended to index.css; the keyframe
// sweeps var(--skel) → var(--skel-sheen) → var(--skel) so it flips correctly
// in light and dark. The animation itself requires a running app to visually confirm.

interface SkeletonProps {
  w?: string | number
  h?: number
  r?: number
}

export function Skeleton({ w = '100%', h = 16, r = 8 }: SkeletonProps) {
  return (
    <div
      className="skel"
      style={{
        width: w,
        height: h,
        borderRadius: r,
      }}
    />
  )
}
