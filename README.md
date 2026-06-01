# Mend

> Settle up, on-chain.

[![CI](https://img.shields.io/github/actions/workflow/status/aliersh/mend/test.yml?branch=main&label=CI)](https://github.com/aliersh/mend/actions/workflows/test.yml)
[![Solidity](https://img.shields.io/badge/solidity-0.8.34-363636)](contracts/foundry.toml)
[![Built with Foundry](https://img.shields.io/badge/built%20with-Foundry-black)](https://getfoundry.sh)
[![Network](https://img.shields.io/badge/network-Base%20Sepolia-0052FF)](https://sepolia.basescan.org)
[![MendFactory](https://img.shields.io/badge/MendFactory-0x7C6c…091Da-0052FF)](https://sepolia.basescan.org/address/0x7C6c933B036fCe0d6663ab4F3866ACdC2A5091Da)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#license)

<!--
  Badges to add later, when the supporting infrastructure exists:
  - Test coverage — once `forge coverage` is wired into CI (e.g., Codecov)
  - Audit / formal verification badge — if and when an audit is completed
  - Gas snapshot — once a reproducible gas baseline is tracked
-->

Mend is a non-custodial primitive for shared expenses. Members deploy a group, record expenses against it, and settle the running balance in USDC directly between their wallets — atomically, on-chain, with no third party in the middle.

Existing trackers like Splitwise get the tracking right, but settlement lives in a separate system: a debt is marked "settled" because someone tapped a button, not because money provably moved. Mend keeps balances and settlement in the same place, so the payment is the proof.

**Status:** M1 (the contract) is deployed to Base Sepolia — `MendFactory` at [`0x7C6c…091Da`](https://sepolia.basescan.org/address/0x7C6c933B036fCe0d6663ab4F3866ACdC2A5091Da). M2 (onboarding) is in design; see the [roadmap](#roadmap).

---

## How it works

1. Two people deploy a Mend group together — one smart contract, one address, just for them.
2. Each person does a one-time USDC approval, granting the contract permission to move up to a chosen amount from their wallet (e.g., 1,000 USDC).
3. Either person can record a shared expense at any time. The contract updates a single net balance. No money moves yet.
4. Expenses can be edited or deleted. The contract recomputes the balance accordingly. A full audit trail is preserved on-chain.
5. When the debtor wants to settle up, they call `settle()`. The contract pulls the owed amount from the debtor's wallet to the creditor's wallet in a single transaction, and resets the balance to zero.

## Getting started

Mend is built with [Foundry](https://getfoundry.sh).

```bash
git clone https://github.com/aliersh/mend.git
cd mend/contracts
forge install   # fetches the forge-std and openzeppelin-contracts submodules
forge build
forge test
```

Most of the suite (unit, fuzz, and invariant tests) runs with no configuration. The fork tests run against Base Sepolia and read the `BASE_SEPOLIA_RPC_URL` environment variable — set it in a `contracts/.env` file (Foundry loads it automatically) to run them.

## Documentation

- [`docs/design.md`](docs/design.md) — design rationale (the *why*)
- [`docs/contract-spec.md`](docs/contract-spec.md) — contract specification (the *what*)

## Security

Mend is deployed to testnet (Base Sepolia) only and has not been audited. **Do not use it with real funds.** The contract is non-custodial by design — it never holds funds, and settlement moves USDC directly between members' wallets — but that property has not been independently reviewed.

## Roadmap

Directional, not committed. Everything beyond M1 is exploratory and may change, be reordered, or be dropped.

| Milestone | Theme                                                            | Status                      |
| --------- | ---------------------------------------------------------------- | --------------------------- |
| **M1**    | Two-party non-custodial IOU contract                             | Deployed (Base Sepolia)     |
| **M2**    | Onboarding — embedded smart-account auth, gasless UX, on Base Sepolia | In progress            |
| **M3**    | Multi-party groups and debt-graph simplification                 | Exploratory                 |
| **M4**    | Off-chain integration — bank-feed ingestion, auto-classification | Speculative                 |

See [`docs/design.md`](docs/design.md) for the reasoning behind the milestone ordering.

## About

Built by [Ariel Diaz](https://github.com/aliersh), formerly Smart Contract Engineer at OP Labs (Optimism).

## License

MIT
