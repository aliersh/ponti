// SignIn.tsx — Email + OTP sign-in via Privy (headless useLoginWithEmail).
// Two views: email entry (idle) → code entry (code). Auth logic drives forward;
// "Use a different email" resets to idle locally without fighting Privy's state.

import { useState, useEffect, useRef, CSSProperties } from 'react'
import { useLoginWithEmail } from '@privy-io/react-auth'
import { Mark, Wordmark, Input, Button } from '../ui'

// Simple email sanity check — not RFC-exhaustive, enough to gate the button.
function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

const RESEND_COOLDOWN_S = 30

// Six individual refs for OTP cell focus management.
type CellRefs = React.RefObject<HTMLInputElement | null>[]

// --- OTP cell styles (contract `.cell`, `.cell.on`, `.cell.err`; --radius-md maps --r-md) ---

const cellBase: CSSProperties = {
  width: 42,
  height: 54,
  border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface)',
  display: 'grid',
  placeItems: 'center',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 23,
  color: 'var(--ink)',
  fontFeatureSettings: '"tnum" 1',
  outline: 'none',
  textAlign: 'center',
  cursor: 'text',
}

// Focused: accent-strong border + accent-soft ring (contract `.cell.on`)
const cellOn: CSSProperties = {
  borderColor: 'var(--accent-strong)',
  boxShadow: '0 0 0 3px var(--accent-soft)',
}

// Error: accent-soft-ink border + accent-soft fill (contract `.cell.err`)
const cellErr: CSSProperties = {
  borderColor: 'var(--accent-soft-ink)',
  background: 'var(--accent-soft)',
}

// Button-loading spinner: animate-spin (Tailwind built-in, no custom keyframe needed).
function ButtonSpinner() {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 shrink-0 opacity-60"
      style={{
        width: 14,
        height: 14,
        borderColor: 'currentColor',
        borderTopColor: 'transparent',
      }}
      aria-hidden="true"
    />
  )
}

export function SignIn() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail()

  // Local view state: we drive off `state.status` for the primary gate,
  // but keep `view` so "Use a different email" can force-return to idle
  // without fighting Privy's state (which may still be 'awaiting-code-input').
  const [view, setView] = useState<'idle' | 'code'>('idle')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  // Tracks which OTP cell index has focus — drives the .on visual state.
  const [focusedCell, setFocusedCell] = useState<number | null>(null)

  // Resend cooldown: seconds remaining; 0 = resend enabled.
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Rate-limit error from resend (separate from Privy's state.error so it
  // persists across state transitions without touching the main error slot).
  const [resendError, setResendError] = useState(false)

  // One ref per OTP cell for programmatic focus control.
  const cellRefs: CellRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Sync view with Privy status on forward transitions (Privy drives forward;
  // backward is local via "Use a different email").
  useEffect(() => {
    if (
      state.status === 'awaiting-code-input' ||
      state.status === 'submitting-code'
    ) {
      setView('code')
    }
  }, [state.status])

  // --- helpers ----------------------------------------------------------------

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_S)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!)
          cooldownRef.current = null
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function handleSendCode() {
    if (!looksLikeEmail(email)) return
    setResendError(false)
    try {
      await sendCode({ email: email.trim() })
      startCooldown()
    } catch {
      // sendCode failure stays quiet; state.status will flip to 'error' if Privy
      // surfaces it. We only need to catch unexpected throws here.
    }
  }

  async function handleConfirmCode() {
    if (code.length !== 6) return
    try {
      await loginWithCode({ code })
    } catch {
      // Privy surfaces the error via state.status === 'error'; no separate catch needed.
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !looksLikeEmail(email)) return
    setResendError(false)
    try {
      await sendCode({ email: email.trim() })
      startCooldown()
    } catch {
      // Rate-limit or network error: show calm inline message, keep resend disabled.
      setResendError(true)
    }
  }

  function handleUseDifferentEmail() {
    setView('idle')
    setCode('')
    setResendError(false)
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current)
      cooldownRef.current = null
    }
    setCooldown(0)
  }

  // --- derived flags ---------------------------------------------------------

  const isSending = state.status === 'sending-code'
  const isSubmitting = state.status === 'submitting-code'
  const hasError = state.status === 'error'

  // --- OTP cell handlers -----------------------------------------------------

  // Splices one digit into `code` at position i; returns the updated string.
  function spliceDigit(current: string, i: number, digit: string): string {
    const chars = current.padEnd(6, '').split('')
    chars[i] = digit
    // Trim trailing empty slots so code.length reflects actual entry.
    const joined = chars.join('').replace(/\s+$/, '')
    return joined.slice(0, 6)
  }

  function handleCellChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    const next = spliceDigit(code, i, digit)
    setCode(next)
    // Auto-advance to the next empty cell.
    if (i < 5) cellRefs[i + 1].current?.focus()
  }

  function handleCellKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleConfirmCode()
      return
    }
    if (e.key === 'Backspace') {
      if (code[i]) {
        // Clear this cell's digit.
        const chars = code.padEnd(6, '').split('')
        chars[i] = ''
        setCode(chars.join('').trimEnd())
      } else if (i > 0) {
        // Cell already empty — move focus back and clear previous.
        const chars = code.padEnd(6, '').split('')
        chars[i - 1] = ''
        setCode(chars.join('').trimEnd())
        cellRefs[i - 1].current?.focus()
      }
      e.preventDefault()
    }
  }

  // Paste on the first cell splits a 6-digit string across all cells.
  function handleCellPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    setCode(text)
    const focusIndex = Math.min(text.length, 5)
    cellRefs[focusIndex].current?.focus()
  }

  // --- cooldown display ------------------------------------------------------

  // Formats remaining seconds as m:ss (e.g. 30 → "0:30", 9 → "0:09").
  function fmtCooldown(s: number): string {
    const m = Math.floor(s / 60)
    const sec = String(s % 60).padStart(2, '0')
    return `${m}:${sec}`
  }

  // --- render ----------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-surface px-[22px]">
      {/* Centered content column */}
      <div className="flex-1 flex flex-col justify-center gap-[22px]">

        {view === 'idle' ? (
          /* State: email / sending */
          <>
            {/* Brand block: mark + wordmark */}
            <div className="flex flex-col items-center gap-[11px]">
              <Mark s={48} />
              <Wordmark size={25} />
            </div>

            <div className="flex flex-col items-center gap-[8px]">
              <h2
                className="m-0 font-display text-ink text-center"
                style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.015em' }}
              >
                Two people, one balance, wherever you live
              </h2>
              <p
                className="m-0 font-ui text-ink-2 text-center"
                style={{ fontSize: 13, lineHeight: 1.5, maxWidth: '32ch' }}
              >
                Sign in with your email — we'll send you a code. No password to remember.
              </p>
            </div>

            {/* Email field + CTA */}
            <div className="flex flex-col gap-[10px]">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                disabled={isSending}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSendCode()
                }}
                style={isSending ? { opacity: 0.6 } : undefined}
              />
              <Button
                variant="primary"
                full
                disabled={!looksLikeEmail(email) || isSending}
                onClick={() => void handleSendCode()}
                style={{ marginTop: 16 }}
              >
                {isSending ? <><ButtonSpinner /> Sending…</> : 'Send me a code'}
              </Button>

              {/* Reassurance line — never an alarm, just trust-building copy */}
              <p
                className="m-0 font-ui text-ink-3 text-center"
                style={{ fontSize: 11.5, marginTop: 16 }}
              >
                We'll never post anything or share your email.
              </p>
            </div>
          </>
        ) : (
          /* State: code / confirming / error */
          <>
            {/* Brand block */}
            <div className="flex flex-col items-center gap-[11px]">
              <Mark s={48} />
              <Wordmark size={25} />
            </div>

            <div className="flex flex-col items-center gap-[8px]">
              <h2
                className="m-0 font-display text-ink text-center"
                style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.015em' }}
              >
                Enter your code
              </h2>

              {/* Sub shown in code + confirming; omitted in error (callout replaces it) */}
              {!hasError && (
                <p
                  className="m-0 font-ui text-ink-2 text-center"
                  style={{ fontSize: 13, lineHeight: 1.5, maxWidth: '32ch' }}
                >
                  We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
                </p>
              )}
            </div>

            {/* Error callout — accent-soft two-part callout (contract `.callout` + `.ct`/`.cs`) */}
            {hasError && (
              <div
                className="flex flex-col gap-[10px] rounded-md"
                style={{
                  background: 'var(--accent-soft)',
                  padding: '13px 14px',
                  margin: '4px 0 0',
                }}
              >
                <span
                  className="font-ui font-semibold"
                  style={{ fontSize: 13, color: 'var(--accent-soft-ink)' }}
                >
                  That code didn't match
                </span>
                <span
                  className="font-ui"
                  style={{ fontSize: 11.5, color: 'var(--ink-2)' }}
                >
                  Check the 6 digits, or get a fresh code — they expire after 10 minutes.
                </span>
              </div>
            )}

            {/* 6-cell OTP: assembles into `code` string; opacity dims while confirming */}
            <div
              style={{
                display: 'flex', gap: 8, justifyContent: 'center',
                opacity: isSubmitting ? 0.65 : 1,
                marginBottom: 6,
              }}
            >
              {Array.from({ length: 6 }, (_, i) => {
                const isFocused = focusedCell === i
                const isErr = hasError

                return (
                  <input
                    key={i}
                    ref={cellRefs[i]}
                    type="text"
                    inputMode="numeric"
                    // iOS OTP autofill targets the first field with one-time-code.
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={code[i] ?? ''}
                    disabled={isSubmitting}
                    style={{
                      ...cellBase,
                      ...(isFocused && !isErr ? cellOn : {}),
                      ...(isErr ? cellErr : {}),
                    }}
                    onChange={(e) => handleCellChange(i, e.target.value)}
                    onKeyDown={(e) => handleCellKeyDown(i, e)}
                    onPaste={i === 0 ? handleCellPaste : undefined}
                    onFocus={() => setFocusedCell(i)}
                    onBlur={() => setFocusedCell(null)}
                    aria-label={`Code digit ${i + 1}`}
                  />
                )
              })}
            </div>

            {/* Resend row — copy and right-side action differ by error state */}
            <div
              className="flex items-center justify-between font-ui"
              style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-3)' }}
            >
              {hasError ? (
                // Error resend row: "Need a new one?" + "Resend code" button
                <>
                  <span>Need a new one?</span>
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    disabled={cooldown > 0}
                    className="font-ui font-medium"
                    style={{
                      fontSize: 12.5, background: 'none', border: 'none',
                      padding: 0, cursor: cooldown > 0 ? 'default' : 'pointer',
                      color: 'var(--accent-soft-ink)',
                      opacity: cooldown > 0 ? 0.5 : 1,
                    }}
                  >
                    {cooldown > 0 ? `Resend in ${fmtCooldown(cooldown)}` : 'Resend code'}
                  </button>
                </>
              ) : cooldown > 0 ? (
                // Cooldown active: "Didn't get it? / Resend in m:ss"
                <>
                  <span>Didn't get it?</span>
                  <span>Resend in {fmtCooldown(cooldown)}</span>
                </>
              ) : (
                // Cooldown expired: "Didn't get it? / Resend code" button
                <>
                  <span>Didn't get it?</span>
                  <button
                    type="button"
                    onClick={() => void handleResend()}
                    className="font-ui font-medium"
                    style={{
                      fontSize: 12.5, background: 'none', border: 'none',
                      padding: 0, cursor: 'pointer',
                      color: 'var(--accent-soft-ink)',
                    }}
                  >
                    Resend code
                  </button>
                </>
              )}
            </div>

            {/* Rate-limit / network calm message — never alarm-red */}
            {resendError && (
              <span
                className="font-ui text-ink-2 text-center"
                style={{ fontSize: 12 }}
              >
                Give it a moment, then try again.
              </span>
            )}

            {/* Confirm / Try again button */}
            <Button
              variant="primary"
              full
              disabled={code.length !== 6 || isSubmitting}
              onClick={() => void handleConfirmCode()}
              style={{ marginTop: 18 }}
            >
              {isSubmitting ? <><ButtonSpinner /> Confirming…</> : hasError ? 'Try again' : 'Confirm'}
            </Button>

            {/* Use a different email — disabled while confirming */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button
                variant="quiet"
                disabled={isSubmitting}
                onClick={handleUseDifferentEmail}
                style={isSubmitting ? { opacity: 0.5 } : undefined}
              >
                Use a different email
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
