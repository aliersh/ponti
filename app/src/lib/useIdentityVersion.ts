// useIdentityVersion.ts — Bumps a counter on every 'ponti:identity' event.
// Use to re-render components that call getIdentity after a setNickname write.

import { useState, useEffect } from 'react'
import { IDENTITY_EVENT } from './identity'

export function useIdentityVersion(): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    const bump = () => setV((n) => n + 1)
    window.addEventListener(IDENTITY_EVENT, bump)
    return () => window.removeEventListener(IDENTITY_EVENT, bump)
  }, [])
  return v
}
