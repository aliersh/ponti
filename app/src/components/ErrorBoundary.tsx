// ErrorBoundary.tsx — Top-level React error boundary.
// Catches render-phase throws anywhere in the subtree and renders an on-brand
// fallback instead of leaving the screen blank.

import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { EmptyState } from './EmptyState'

// Inline alert icon — no equivalent exists in ui/icons.tsx.
function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 7v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="11" cy="15.5" r="1" fill="currentColor" />
    </svg>
  )
}

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        // Full-viewport centering so the fallback works outside any layout provider.
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
          }}
        >
          <EmptyState
            icon={<AlertIcon />}
            title="Something went wrong"
            body="This is on our end. Reloading usually fixes it."
            tone="error"
            cta="Reload"
            onCta={() => window.location.reload()}
          />
        </div>
      )
    }

    return this.props.children
  }
}
