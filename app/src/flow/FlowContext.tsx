// flow/FlowContext.tsx — App-level write-flow controller.
// Holds the pending flow state machine and renders one FlowWidget at the
// provider level so any component can call useFlow().start() without
// mounting its own overlay.

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Hex } from 'viem'
import { publicClient } from '../lib/client'
import type { PendingFlow } from './types'
import { FlowWidget } from './FlowWidget'

// ── Internal state ────────────────────────────────────────────────────────────

type Phase = 'confirm' | 'inflight' | 'done' | 'error'

interface FlowState {
  pending: PendingFlow
  phase: Phase
  txHash: Hex | null
  // True when submit() itself threw (no tx was ever sent).
  // False in error state means submit succeeded but waitForTransactionReceipt failed.
  submitFailed: boolean
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface FlowContextValue {
  /** Open the confirm overlay for a pending write. Replaces any current flow. */
  start: (flow: PendingFlow) => void
}

const FlowContext = createContext<FlowContextValue | null>(null)

/**
 * Returns the flow controller handle. Must be called inside FlowProvider.
 * Call `flow.start(pendingFlow)` to open the confirm overlay before any write.
 */
export function useFlow(): FlowContextValue {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used inside FlowProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Wraps the app's route tree. Renders one FlowWidget that reads from context
 * so any descendant can trigger a write-flow without mounting its own overlay.
 */
export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlowState | null>(null)

  // Kick off the write sequence after the user confirms. Owned entirely by the
  // controller so call sites never touch receipt-waiting or error handling.
  const runWrite = useCallback(async (pending: PendingFlow) => {
    setState((s) => s ? { ...s, phase: 'inflight' } : null)

    let hash: Hex
    try {
      hash = await pending.submit()
    } catch {
      // submit() threw — nothing reached the chain.
      setState((s) => s ? { ...s, phase: 'error', submitFailed: true } : null)
      return
    }

    setState((s) => s ? { ...s, txHash: hash } : null)

    try {
      await publicClient.waitForTransactionReceipt({ hash })
    } catch {
      // submit() succeeded but receipt wait failed — write IS on-chain.
      // submitFailed=false signals that "Cancel" must still fire onComplete.
      setState((s) => s ? { ...s, phase: 'error', submitFailed: false } : null)
      return
    }

    setState((s) => s ? { ...s, phase: 'done' } : null)
  }, [])

  // Re-entry point for the "Try again" button. Branches on submitFailed:
  //   submitFailed=true  → re-run full submit+receipt (nothing is on-chain)
  //   submitFailed=false → re-await receipt only using the known hash (never re-send)
  const retry = useCallback(async () => {
    if (!state) return
    const { pending, txHash, submitFailed } = state

    if (submitFailed) {
      // Nothing on-chain — safe to re-send.
      await runWrite(pending)
      return
    }

    // Hash is known; only re-await the receipt.
    if (!txHash) return
    setState((s) => s ? { ...s, phase: 'inflight' } : null)
    try {
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      setState((s) => s ? { ...s, phase: 'done' } : null)
    } catch {
      setState((s) => s ? { ...s, phase: 'error', submitFailed: false } : null)
    }
  }, [state, runWrite])

  // Close the overlay. When onComplete is needed (done phase, or receipt-failed
  // error where the write is confirmed on-chain), it fires before unmounting.
  const close = useCallback(async (fireComplete: boolean) => {
    if (!state) return
    const { pending } = state
    setState(null)
    if (fireComplete) {
      await Promise.resolve(pending.onComplete()).catch(() => { /* refetch failure is non-fatal */ })
    }
  }, [state])

  const start = useCallback((flow: PendingFlow) => {
    setState({ pending: flow, phase: 'confirm', txHash: null, submitFailed: false })
  }, [])

  const value: FlowContextValue = { start }

  return (
    <FlowContext.Provider value={value}>
      {children}
      {state && (
        <FlowWidget
          pending={state.pending}
          phase={state.phase}
          txHash={state.txHash}
          submitFailed={state.submitFailed}
          onConfirm={() => runWrite(state.pending)}
          onRetry={retry}
          onClose={close}
        />
      )}
    </FlowContext.Provider>
  )
}
