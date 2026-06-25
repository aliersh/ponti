// @vitest-environment node
// Tests for resolveInvite — address extraction from raw strings and Ponti URLs.
import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import { resolveInvite } from './inviteResolver'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
const CHECKSUMMED = getAddress(ADDR)

describe('resolveInvite', () => {
  it('raw checksummed address → same address back', () => {
    expect(resolveInvite(ADDR)).toBe(CHECKSUMMED)
  })

  it('lowercase address → checksummed version', () => {
    expect(resolveInvite(ADDR.toLowerCase())).toBe(CHECKSUMMED)
  })

  it('ponti.money/c/<addr> → addr', () => {
    expect(resolveInvite(`ponti.money/c/${ADDR}`)).toBe(CHECKSUMMED)
  })

  it('https://ponti.money/c/<addr> → addr', () => {
    expect(resolveInvite(`https://ponti.money/c/${ADDR}`)).toBe(CHECKSUMMED)
  })

  it('https://ponti.money/c/<addr>/ trailing slash → addr', () => {
    expect(resolveInvite(`https://ponti.money/c/${ADDR}/`)).toBe(CHECKSUMMED)
  })

  it('https://ponti.money/c/<addr>?foo=bar query string → addr', () => {
    expect(resolveInvite(`https://ponti.money/c/${ADDR}?foo=bar`)).toBe(CHECKSUMMED)
  })

  it('https://ponti.money/c/<addr>#section fragment → addr', () => {
    expect(resolveInvite(`https://ponti.money/c/${ADDR}#section`)).toBe(CHECKSUMMED)
  })

  it('whitespace-padded address → checksummed', () => {
    expect(resolveInvite(`  ${ADDR}  `)).toBe(CHECKSUMMED)
  })

  it('"garbage" → null', () => {
    expect(resolveInvite('garbage')).toBeNull()
  })

  it('"" → null', () => {
    expect(resolveInvite('')).toBeNull()
  })

  it('/c/notanaddress → null', () => {
    expect(resolveInvite('/c/notanaddress')).toBeNull()
  })
})
