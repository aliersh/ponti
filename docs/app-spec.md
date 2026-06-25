# Ponti — Application Spec

**Status:** Complete on Base Sepolia testnet (frozen proof-of-concept). Covers onboarding, group creation, expense entry (add, edit, delete), reads, and settlement.
**Companions:** [`design.md`](design.md) (the *why*), [`contract-spec.md`](contract-spec.md) (the contract interface).

---

## Scope

What the app does:

- **Onboarding.** Email/social login (Privy) that provisions a Kernel smart account.
- **Create a group** with a counterparty — gasless `createGroup`.
- **Add an expense** to a group — gasless `addExpense`.
- **Edit and delete expenses**, gasless: `editExpense` / `deleteExpense`.
- **List groups** and **view a group's balance + expense history** — reads.
- **Settle** the balance, gasless: approve the exact debt, then call `settle()`.

Out of scope (not pursued):

- Group naming, friendlier counterparty discovery (ENS / contacts / QR), visual polish, and automated frontend tests.

## Stack and layout

- Frontend lives in `app/` within the ponti monorepo: Vite + React SPA.
- Auth + embedded wallet: **Privy**. Smart account: **Kernel** (ZeroDev), via Privy. Bundler + paymaster: **Pimlico**. Contract reads/writes: **viem**.
- Target chain: **Base Sepolia** (chain id 84532). Factory: `0x17463e06C303e30044609a9a412d7DB4746Cb210`. USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.
- Config via Vite env vars (`VITE_`-prefixed, client-side). No backend, no server secrets.

## Flows

Writes go through the account-abstraction stack (UserOperation → Pimlico paymaster sponsors gas → Pimlico bundler → EntryPoint → user's Kernel smart account → contract). Reads are direct viem calls and event-log queries — they do not touch the AA stack.

### 1. Onboarding / login

The user logs in with email or social (Privy), which provisions a Kernel smart account. That smart account's address is the user's identity in Ponti (it is what gets registered as a group member). The account is counterfactual until its first write, which deploys it — sponsored, so onboarding costs the user nothing.

### 2. Groups list (home)

Read-only. Query the subgraph for groups where `memberA` or `memberB` equals the user's smart-account address, and render the list (group + counterparty). The empty state offers the create-group action.

### 3. Create group

- Input: the counterparty's address (manual entry for now; friendlier discovery is deferred).
- Write (gasless): `factory.createGroup(counterparty)`. This is the user's first UserOperation, so it also deploys their smart account.
- Validate client-side before sending — non-zero address, not the user's own address — to avoid a (sponsored) revert (`InvalidMemberAddress`, `CannotGroupWithSelf`).
- On success, navigate to the new group.

### 4. Group detail

Read-only. Show the current `balance` (direct `readContract` call) and the expense history (served by the subgraph, already folded: edits and deletes reflected). The signed `int256` balance is interpreted for display: positive → the counterparty owes the user; negative → the user owes; zero → settled. Show direction + absolute amount in USDC.

### 5. Add expense

- Input: payer (the user or the counterparty), amount (USDC), description.
- Write (gasless): `group.addExpense(payer, amount, description)`.
- Validate client-side: amount > 0, description non-empty, payer is a member.
- On success, refresh the balance and expense list.

### 6. Settle

- Shown in group detail only when `balance != 0` and the user is the debtor (per the sign convention). `settle()` is debtor-only on-chain, so the creditor sees no Settle action.
- Pre-checks before enabling the action: the user is the debtor, and their smart account's USDC balance covers the debt. If the balance is short, surface the amount needed and the Circle Base Sepolia faucet (testnet funding is manual; a real onramp is out of scope, see `design.md`).
- Write flow (both gasless): approve the **exact** amount owed to the `PontiGroup` contract, then call `settle()`. No standing budget; the allowance returns to zero once settle consumes it.
- On success, the balance is zero (settled) and USDC has moved debtor to creditor; refresh the balance.
- Both writes are sponsored: the paymaster policy covers the approve to the USDC contract as well as the `PontiGroup` call (confirmed on Base Sepolia).

## Reads and state

No backend. Lists come from the subgraph (GraphQL); current balance from a direct `readContract` call. After a write confirms, the affected reads are refetched. The app holds the authenticated session and the selected group in client state only.

## Config and secrets

- `VITE_PRIVY_APP_ID` — public Privy app id (safe client-side by design).
- `VITE_PIMLICO_SPONSORSHIP_POLICY_ID` (optional) — a non-secret Pimlico policy identifier.
- The Pimlico bundler + paymaster URLs (which embed the API key) are registered in the **Privy dashboard**, not in the frontend — so no Pimlico key ever reaches the app code or env. Privy routes sponsored sends through them automatically.
- No private keys and no server secrets in the frontend.

## Verification

- **Manual end-to-end checklist** on Base Sepolia: fresh email login → smart account provisioned → `createGroup` (confirm on Basescan that the transaction is sponsored and the user paid no gas) → `addExpense` (gasless) → balance reflects it → logging in as the counterparty shows the same group. The first sponsored write is also what confirms the paymaster works for a Kernel account on this chain.
- Automated frontend tests are out of scope for this POC.
