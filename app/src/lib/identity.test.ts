// Tests for getIdentity — nickname lookup, label, initial, tone derivation.
import { describe, it, expect, beforeEach } from 'vitest'
import { getAddress } from 'viem'
import { getIdentity } from './identity'

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
const KEY = getAddress(ADDR).toLowerCase()

describe('getIdentity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('no nickname → named:false, label is truncated, initial is empty string', () => {
    const id = getIdentity(ADDR)
    expect(id.named).toBe(false)
    expect(id.label).toMatch(/^0x[0-9a-fA-F]{4}…[0-9a-fA-F]{4}$/)
    expect(id.initial).toBe('')
  })

  it('with nickname set → named:true, label=nickname, initial=first-char uppercased', () => {
    localStorage.setItem('ponti.nicknames.v1', JSON.stringify({ [KEY]: 'Alice' }))
    const id = getIdentity(ADDR)
    expect(id.named).toBe(true)
    expect(id.label).toBe('Alice')
    expect(id.initial).toBe('A')
  })

  it('nickname with leading space → initial is first non-space char uppercased', () => {
    localStorage.setItem('ponti.nicknames.v1', JSON.stringify({ [KEY]: ' alice' }))
    const id = getIdentity(ADDR)
    expect(id.initial).toBe('A')
  })

  it('tone is deterministic for the same address', () => {
    const t1 = getIdentity(ADDR).tone
    const t2 = getIdentity(ADDR).tone
    expect(t1).toBe(t2)
  })

  it('tone is accent or neutral', () => {
    const { tone } = getIdentity(ADDR)
    expect(['accent', 'neutral']).toContain(tone)
  })
})
