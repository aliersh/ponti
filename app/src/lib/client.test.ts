// @vitest-environment node
// Tests for withRetry — 4-attempt backoff with 300/600/1200ms delays.
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { withRetry } from './client'

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('succeeds first try → returns value, fn called once', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('fails twice then succeeds on 3rd → returns value', async () => {
    let calls = 0
    const fn = vi.fn().mockImplementation(async () => {
      calls++
      if (calls < 3) throw new Error('fail')
      return 'ok'
    })
    const promise = withRetry(fn)
    await vi.runAllTimersAsync()
    expect(await promise).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('fails all 4 → throws last error, fn called 4 times', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    // Attach rejection handler before advancing timers to avoid unhandled rejection
    const promise = withRetry(fn).catch((e) => e)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe('always fails')
    expect(fn).toHaveBeenCalledTimes(4)
  })

  it('uses 300/600/1200ms backoff', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    // Attach rejection handler immediately to prevent unhandled rejection
    const promise = withRetry(fn).catch(() => {})
    // Initial call fires synchronously before any timers
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(300)
    expect(fn).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(600)
    expect(fn).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1200)
    expect(fn).toHaveBeenCalledTimes(4)
    await promise
  })
})
