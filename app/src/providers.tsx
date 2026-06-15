import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets'
import { CHAIN, PRIVY_APP_ID, SPONSORSHIP_POLICY_ID } from './config'

// The Pimlico bundler + paymaster URLs live in the Privy dashboard, so every
// smart-wallet send is sponsored without a client-side key. paymasterContext is
// only needed if Pimlico requires an explicit sponsorship policy; when the env
// var is unset we pass nothing and Privy applies the dashboard default.
const smartWalletsConfig = SPONSORSHIP_POLICY_ID
  ? { paymasterContext: { sponsorshipPolicyId: SPONSORSHIP_POLICY_ID } }
  : undefined

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        defaultChain: CHAIN,
        supportedChains: [CHAIN],
        // Provision the embedded signer (which the Kernel smart account is built
        // on) for users who log in without an existing wallet.
        // showWalletUIs:false suppresses Privy's own confirm + success modals so
        // the app renders its own write-flow consent + progress surface; writes
        // still route through the SmartWallets client and stay sponsored.
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          showWalletUIs: false,
        },
      }}
    >
      <SmartWalletsProvider config={smartWalletsConfig}>
        {children}
      </SmartWalletsProvider>
    </PrivyProvider>
  )
}
