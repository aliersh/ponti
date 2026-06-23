// useDesktop.ts — Reactive 1024px breakpoint hook.
// Mirrors the matchMedia pattern used in FlowWidget for modal placement.

import { useState, useEffect } from 'react'

const QUERY = '(min-width: 1024px)'

export function useDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
