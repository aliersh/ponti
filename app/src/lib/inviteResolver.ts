// Resolves a pasted invite string — raw address or ponti.money/c/<address> URL — to a checksummed address.
import { getAddress, type Address } from 'viem'

/**
 * Accepts a raw Ethereum address or a Ponti invite URL of the form
 * `ponti.money/c/<address>` (with or without scheme, trailing slash, or query).
 * Returns a checksummed address, or null if the input is not a valid Ponti ID.
 */
export function resolveInvite(raw: string): Address | null {
  const trimmed = raw.trim()

  // Extract the address segment after the last /c/ when a URL is pasted.
  let candidate: string
  if (trimmed.includes('/c/')) {
    const parts = trimmed.split('/c/')
    const tail = parts[parts.length - 1]
    // Strip trailing slash, query string, or fragment.
    candidate = tail.split(/[/?#]/)[0]
  } else {
    candidate = trimmed
  }

  try {
    return getAddress(candidate)
  } catch {
    return null
  }
}
