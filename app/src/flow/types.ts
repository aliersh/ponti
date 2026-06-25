// flow/types.ts — Public API types for the write-flow controller.
// Call sites construct a PendingFlow and hand it to useFlow().start(); the
// controller owns the overlay, receipt wait, and error recovery from there.

import type { Hex } from 'viem'

/** All on-chain write kinds the flow controller can gate. */
export type FlowKind = 'create' | 'add' | 'edit' | 'delete' | 'settle'

/**
 * Display identity for an avatar in the create confirm pair.
 * Extends the lib/identity tone set to include 'lilac' (self avatar per design contract).
 */
export interface FlowAvatar {
  label: string
  initial: string
  tone: 'accent' | 'neutral' | 'lilac'
}

/** A single row in the consent grid shown on the confirm screen. */
export interface ConsentRow {
  label: string
  value: string
  /** When true, renders the value at a heavier weight and larger size. */
  strong?: boolean
}

/**
 * Everything the flow controller needs to display consent, execute the write,
 * and hand back control once done.
 *
 * Critical split: `submit` executes ONLY the send/sendBatch call and returns
 * the tx hash. The controller owns `waitForTransactionReceipt`. This is what
 * enables correct error-recovery branching (no-hash vs. hash-known).
 *
 * For add/edit flows, `submit` starts absent and is materialized at confirm-time
 * via `buildSubmit`. For all other kinds, `submit` is pre-built at call sites
 * exactly as before.
 */
export interface PendingFlow {
  kind: FlowKind
  /** Overlay title shown on all phases, e.g. "Settle up". */
  title: string
  /** Explicit CTA label on the confirm button, e.g. "Settle 28.00 USDC". */
  confirmLabel: string
  /** Rows shown in the consent grid, in display order. */
  rows: ConsentRow[]
  /** Counterparty nickname — used in the settle safety-line copy AND in the per-action doneSub copy ({name} token). */
  who?: string
  /**
   * Executes ONLY the send/sendBatch call. Returns the tx hash.
   * Must NOT call waitForTransactionReceipt — the controller owns that step.
   *
   * Optional for add/edit: absent until buildSubmit() fires at confirm-time.
   * Present and required for create/delete/settle (pre-built at call sites).
   */
  submit?: () => Promise<Hex>
  /**
   * Called after the receipt is confirmed (phase transitions to done).
   * Typically triggers a screen refetch. May be async; the controller awaits it.
   */
  onComplete: () => void | Promise<void>
  /**
   * Display-only: old amount string for the edit before→after delta (e.g. "40.00").
   * Read only by FlowWidget. Never used by submit, onComplete, or balance math.
   */
  prevValue?: string
  /**
   * Display-only: avatar identities for the create confirm pair.
   * Read only by FlowWidget. Never used by submit, onComplete, or balance math.
   */
  pair?: { self: FlowAvatar; other: FlowAvatar }

  // ── add/edit input-phase fields ───────────────────────────────────────────

  /**
   * Present for add and edit flows only. When set, FlowWidget opens at the
   * `input` phase; submit is absent until buildSubmit() fires at confirm-time.
   */
  inputInitial?: {
    mode: 'add' | 'edit'
    amount: string        // pre-filled display string (edit) or '' (add)
    description: string   // pre-filled (edit) or '' (add)
    payer: 'me' | 'counterparty'
    prevValue?: string    // edit: original amount string for the before→after chip
  }

  /**
   * Called with validated input values when the user taps Review.
   * Returns the submit closure and the consent rows for the confirm summary card.
   * The controller stores submit on pending.submit and rows on pending.rows.
   * Pure construction only — must not make any network calls.
   *
   * payer is 'me' | 'counterparty'; call-site closures resolve actual on-chain
   * addresses from their captured smartAccount/counterparty.
   */
  buildSubmit?: (vals: { amount: bigint; description: string; payer: 'me' | 'counterparty' }) => { submit: () => Promise<Hex>; rows: ConsentRow[] }

  /**
   * Present for edit flows only. Pre-built delete PendingFlow for the
   * "Delete expense" affordance in the input phase. Built at call sites where
   * the expense id is known — FlowWidget never reconstructs it from inputInitial.
   */
  deleteFlow?: PendingFlow
}
