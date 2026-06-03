# Mend — Subgraph Spec

**Status:** Planned. A The Graph subgraph that indexes Mend's on-chain events on Base Sepolia, so the app reads groups and expense history from a GraphQL API instead of scanning `eth_getLogs` over the full chain history on every load.
**Companions:** [`design.md`](design.md) (the why), [`app-spec.md`](app-spec.md) (the app), [`contract-spec.md`](contract-spec.md) (the contract interface).

---

## Goal

Decouple read cost from chain-block growth. Today `fetchMyGroups` and `fetchExpenseHistory` scan `getLogs` over `[FACTORY_DEPLOY_BLOCK, head]` on every load; that range grows with the chain and free RPCs throttle it (Alchemy free caps getLogs at 10 blocks, drpc free times out). A subgraph ingests each event once as it is mined and serves cheap GraphQL queries whose cost scales with results, not block range. The free, persistent path is Subgraph Studio.

## Scope

What the subgraph serves (replaces the `getLogs` scans):
- **Groups list** for a user (replaces `fetchMyGroups`).
- **Expense history** for a group, already folded (replaces `fetchExpenseHistory` + the client-side `reconstructExpenses`).
- **Settlements** for a group (new; powers the future timeline view).

What stays a direct `readContract` (NOT in the subgraph):
- **`balance`** (the signed `int256`). It is the contract's source of truth, an O(1) call, and putting it in the subgraph would mean re-implementing the contract's balance math (50/50 split, edit/delete reversals) in the mapping, which risks drift. Read it directly; the subgraph never owns balance.

## Architecture (the factory pattern)

`MendGroup` contracts are deployed dynamically (one per `createGroup`), so their addresses are not known up front. The Graph handles this with **dynamic data sources (templates)**:
- A **static data source** for `MendFactory` (known address) handles `GroupCreated`.
- Its handler spawns a **`MendGroup` template** instance for the new group's address, which then indexes that group's events.

```
GroupCreated (factory) --> handler: create Group entity + MendGroup.create(groupAddress)
                                                              |
                              new template instance indexes that group's:
                              ExpenseAdded / ExpenseEdited / ExpenseDeleted / Settled
```

## Entities (`schema.graphql`)

- **Group**: `id` (group contract address), `memberA` (Bytes), `memberB` (Bytes), `createdAt` (BigInt, block timestamp), `createdBlock` (BigInt), `expenses` (derived from Expense), `settlements` (derived from Settlement).
- **Expense**: `id` (`<groupAddress>-<expenseId>`), `group` (Group relation), `expenseId` (BigInt), `payer` (Bytes), `amount` (BigInt, USDC base units), `description` (String), `createdAt` (BigInt), `deleted` (Boolean), `edited` (Boolean). The fold lives here: the entity always reflects the current state.
- **Settlement**: `id` (`<txHash>-<logIndex>`), `group` (Group relation), `payer` (Bytes), `payee` (Bytes), `amount` (BigInt), `timestamp` (BigInt).

## Mappings (event handlers)

- `GroupCreated(group, memberA, memberB)` -> create `Group`; instantiate the `MendGroup` template for `group`.
- `ExpenseAdded(expenseId, payer, amount, description, createdAt)` -> create `Expense` (`deleted=false`, `edited=false`).
- `ExpenseEdited(expenseId, payer, amount, description)` -> load the `Expense`, update payer/amount/description, set `edited=true`.
- `ExpenseDeleted(expenseId, deletedBy)` -> load the `Expense`, set `deleted=true`.
- `Settled(payer, payee, amount)` -> create `Settlement` (timestamp from the block).

Mappings are AssemblyScript (the TS-like language graph-cli compiles to WASM).

## Data sources and start block

- Factory data source: address `0x7C6c933B036fCe0d6663ab4F3866ACdC2A5091Da`, `startBlock` = `42151193` (`FACTORY_DEPLOY_BLOCK`).
- `MendGroup` template: no fixed address; instances start at their creation block automatically.
- Network: `base-sepolia` (confirmed deployable via Subgraph Studio).
- ABIs: imported from `contracts/out` (the same compiled artifacts the app codegen uses).

## App query layer (what changes in `app/`)

- `fetchMyGroups` and `fetchExpenseHistory` are rewritten to query the subgraph over GraphQL with a minimal `fetch` (no Apollo or other client dependency).
- `reconstructExpenses` is removed (the subgraph does the fold).
- `interpretBalance` stays; `fetchBalance` stays a direct `readContract`.
- The subgraph query URL (from Studio after deploy) lives in `config.ts` via an env var (e.g. `VITE_SUBGRAPH_URL`).
- The chunked `getLogs` / `collectInWindows` read path is retired for these reads (writes still go through the AA stack unchanged).

## Deploy

- Built and deployed with `graph-cli` to **Subgraph Studio** (`graph deploy`). The free Studio tier is persistent and sufficient for testnet.
- Ops prerequisite (Ariel): create the subgraph in Studio and obtain the **deploy key**. The deployed subgraph exposes a query URL used by the app.
- A `Makefile` recipe wraps codegen/build/deploy.

## Repo layout

A new top-level `subgraph/` directory in the monorepo, beside `contracts/` and `app/`: `schema.graphql`, `subgraph.yaml` (manifest), `src/` (mappings), plus graph-cli config.

## Out of scope / deferred

- Maintaining `balance` in the subgraph (drift risk; stays `readContract`).
- Publishing to the decentralized network (Studio dev tier is enough until mainnet / real users).
- Mainnet indexing (Base Sepolia only, matching the deployment).

## Verification

- The subgraph syncs on Base Sepolia from the factory deploy block with no mapping errors.
- A GraphQL query returns the known test group (counterparty `0xB5EA...`) for the test smart account, and its expenses folded correctly (edited/deleted reflected), plus any settlements.
- In the app: groups list and expense history load via GraphQL (no `getLogs`); `balance` still loads via `readContract`; full E2E (create / add / edit / delete / settle) reflects in the subgraph within a block or two.
