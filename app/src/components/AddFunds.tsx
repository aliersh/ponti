import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { fetchUsdcBalance } from '../lib/settle'

type Props = {
  smartAccount: Address
  onRefreshed?: (bal: bigint) => void
}

export function AddFunds({ smartAccount, onRefreshed }: Props) {
  const [showFaucet, setShowFaucet] = useState(false)

  const truncated = smartAccount.slice(0, 6) + '…' + smartAccount.slice(-4)

  useEffect(() => {
    if (!showFaucet) return
    const id = setInterval(() => {
      fetchUsdcBalance(smartAccount)
        .then(bal => onRefreshed?.(bal))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [showFaucet, smartAccount, onRefreshed])

  async function onCopyAddress() {
    try {
      await navigator.clipboard.writeText(smartAccount)
    } catch {
      window.prompt('Copy your address:', smartAccount)
    }
  }

  return (
    <>
      <button onClick={() => setShowFaucet((v) => !v)}>
        {showFaucet ? 'Hide' : 'Add funds ▸'}
      </button>
      {showFaucet && (
        <div style={{ marginTop: '0.75rem' }}>
          <p>
            On the faucet: select <strong>USDC</strong>, set Network to{' '}
            <strong>Base Sepolia</strong>, paste your address in the{' '}
            <strong>Send to</strong> field. Limit: 20 USDC every 2 hours.
          </p>
          <p>
            Your address:{' '}
            <code>{truncated}</code>{' '}
            <button onClick={onCopyAddress}>Copy</button>
          </p>
          <p>
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
              Open faucet ↗
            </a>
          </p>
          <p>
            Waiting for your funds…{' '}
            <button onClick={() => fetchUsdcBalance(smartAccount).then(bal => onRefreshed?.(bal)).catch(() => {})}>
              Check now
            </button>
          </p>
        </div>
      )}
    </>
  )
}
