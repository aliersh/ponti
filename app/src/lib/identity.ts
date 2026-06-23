import { getAddress, type Address } from 'viem'

export type Identity = { label: string; initial: string; tone: 'accent' | 'neutral'; named: boolean }

const STORAGE_KEY = 'ponti.nicknames.v1'

function loadStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Silently ignore write failures (private-mode / quota exceeded).
  }
}

export function getNickname(address: Address): string | undefined {
  const key = getAddress(address).toLowerCase()
  const store = loadStore()
  return store[key]
}

export function setNickname(address: Address, name: string): void {
  const key = getAddress(address).toLowerCase()
  const store = loadStore()
  const trimmed = name.trim()
  if (trimmed === '') {
    delete store[key]
  } else {
    store[key] = trimmed
  }
  saveStore(store)
}

/** First 6 chars + U+2026 + last 4 chars: e.g. `0x7C6c…b210`. */
function truncate(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Deterministic tone from address: sum of char codes → parity. */
function deriveTone(address: Address): 'accent' | 'neutral' {
  const sum = Array.from(address).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return sum % 2 === 0 ? 'accent' : 'neutral'
}

export function getIdentity(address: Address): Identity {
  const nickname = getNickname(address)
  const tone = deriveTone(getAddress(address))

  if (nickname) {
    // initial = first non-space char of nickname, uppercased.
    const firstChar = Array.from(nickname).find((ch) => ch.trim() !== '') ?? nickname[0]
    return {
      label: nickname,
      initial: firstChar.toUpperCase(),
      tone,
      named: true,
    }
  }

  // No nickname: use truncated address; initial = '' (no letter to derive honestly).
  const checksummed = getAddress(address)
  return {
    label: truncate(checksummed),
    initial: '',
    tone,
    named: false,
  }
}
