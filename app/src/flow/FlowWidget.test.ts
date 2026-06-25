// @vitest-environment node
// Tests for sanitizeAmount — locale-comma handling, fractional cap, non-digit strip.
import { describe, it, expect } from 'vitest'
import { sanitizeAmount } from './FlowWidget'

describe('sanitizeAmount', () => {
  it('"12" → "12"', () => {
    expect(sanitizeAmount('12')).toBe('12')
  })

  it('"12.345" → "12.34" (cap 2 decimal places)', () => {
    expect(sanitizeAmount('12.345')).toBe('12.34')
  })

  it('"1,5" → "1.5" (comma→dot)', () => {
    expect(sanitizeAmount('1,5')).toBe('1.5')
  })

  it('"abc12.3x" → "12.3" (strip non-digit/dot)', () => {
    expect(sanitizeAmount('abc12.3x')).toBe('12.3')
  })

  it('"1.2.3" → "1.23" (only first dot kept; subsequent dots stripped from fraction)', () => {
    expect(sanitizeAmount('1.2.3')).toBe('1.23')
  })

  it('".5" → ".5" (leading dot fine)', () => {
    expect(sanitizeAmount('.5')).toBe('.5')
  })

  it('"" → ""', () => {
    expect(sanitizeAmount('')).toBe('')
  })

  it('"1,2,3" → "1.23" (only first comma replaced, second comma stripped)', () => {
    // raw.replace(',', '.') replaces first comma only → "1.2,3"
    // then /[^\d.]/ strips the remaining comma → "1.23"
    expect(sanitizeAmount('1,2,3')).toBe('1.23')
  })
})
