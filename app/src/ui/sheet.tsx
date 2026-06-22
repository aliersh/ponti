// sheet.tsx — Shared overlay shell built on @radix-ui/react-dialog.
// Reused by AddFundsPanel (placement="sheet") and later the write-flow FlowWidget.
// Provides overlay, focus-trap, escape + scroll-lock — all Radix-native.

import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

/**
 * Thin Radix Dialog wrapper that renders either a bottom sheet (mobile) or a
 * centered modal. All visible content — headers, phases, actions — comes from
 * children; this component owns only the overlay shell.
 */
export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sheet slides up from the bottom; modal is centered. Default: 'sheet'. */
  placement?: 'sheet' | 'modal'
  /**
   * When false, escape + outside-click do NOT close.
   * The content must provide its own close affordance.
   * Default: true.
   */
  dismissible?: boolean
  /** Visually hidden — required by Radix for a11y. Describes the panel purpose. */
  title: string
  children: ReactNode
}

// Visually-hidden helper — hides from view while remaining accessible to AT.
// Defined inline to avoid an extra dep; matches the SR-only pattern in WAI-ARIA.
const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}

export function Sheet({
  open,
  onOpenChange,
  placement = 'sheet',
  dismissible = true,
  title,
  children,
}: SheetProps) {
  // Dismissible lock: prevent all ambient-dismiss paths when dismissible=false.
  // The content owns its own close affordance in that case (e.g. "Close — keep watching").
  const lockHandlers = dismissible
    ? {}
    : {
        onEscapeKeyDown: (e: Event) => e.preventDefault(),
        onPointerDownOutside: (e: Event) => e.preventDefault(),
        onInteractOutside: (e: Event) => e.preventDefault(),
      }

  // Sheet content style — anchored to bottom, slides up/down via @keyframes.
  const sheetContentStyle: React.CSSProperties =
    placement === 'sheet'
      ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--raised)',        /* Cal: raised surface for sheets (§391) */
          borderRadius: '24px 24px 0 0',     /* Cal: 24px top radius (§391) */
          boxShadow: 'var(--shadow-overlay)', /* Cal: warm overlay shadow token */
          outline: 'none',
          // Enter/exit animations reference @keyframes in index.css so Radix's
          // Presence can defer unmount until the exit animation completes (~300ms).
        }
      : {
          position: 'fixed',
          top: '50%',
          left: '50%',
          // transform set by modal-in/out @keyframes; base needed for exit start
          transform: 'translate(-50%, -50%)',
          width: 'min(440px, calc(100% - 48px))',
          maxHeight: 'calc(100% - 60px)',
          overflowY: 'auto',
          background: 'var(--raised)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-overlay)',
          outline: 'none',
        }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay — dimmed backdrop with blur. @keyframes drive enter/exit so
            Radix defers unmount until animation completes. */}
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,14,18,.46)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 80,
          }}
          className="data-[state=open]:animate-[sheet-overlay-in_300ms_ease] data-[state=closed]:animate-[sheet-overlay-out_250ms_ease]"
        />

        {/* Content shell — sheet or modal; children fill the interior. */}
        <Dialog.Content
          {...lockHandlers}
          aria-describedby={undefined}
          style={{ ...sheetContentStyle, zIndex: 81 }}
          className={
            placement === 'sheet'
              ? 'data-[state=open]:animate-[sheet-slide-up_300ms_cubic-bezier(.32,.72,0,1)] data-[state=closed]:animate-[sheet-slide-down_250ms_ease]'
              : 'data-[state=open]:animate-[modal-in_280ms_cubic-bezier(.32,.72,0,1)] data-[state=closed]:animate-[modal-out_220ms_ease]'
          }
        >
          {/* Visually-hidden title — required for a11y; Radix warns if absent.
              Must live inside Dialog.Content (not a Portal sibling). */}
          <Dialog.Title asChild>
            <span style={srOnlyStyle}>{title}</span>
          </Dialog.Title>

          {/* Grab handle — sheet only; visual affordance for drag-to-dismiss (UX hint). */}
          {placement === 'sheet' && (
            <div
              aria-hidden
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: 'var(--line-2)', /* Cal: line-2 grab handle (§392) */
                margin: '12px auto 0',
              }}
            />
          )}

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
