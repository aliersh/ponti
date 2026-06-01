# Mend — Contract Specification

**Status:** Implemented, tested, and deployed to Base Sepolia
**Authoritative source for:** function signatures, storage layout, validation rules, events, errors
**Companion doc:** `docs/design.md` explains the *why*; this document specifies the *what*.

---

## 1. Scope

This document specifies the public interface and internal behavior of two contracts:

- `MendFactory` — deploys `MendGroup` instances.
- `MendGroup` — a two-party IOU contract that tracks shared expenses and settles in USDC.

Implementation-level decisions (helper function structure, internal naming, gas micro-optimizations, test organization) are NOT specified here; they are left to the implementer. Anything that would change the behavior documented below is an architectural change and must be reflected in this spec before being implemented.

---

## 2. Conventions

### 2.1 Units

All USDC amounts throughout the contracts are expressed in **base units** (6 decimals). A value of `50_000_000` represents 50 USDC. No fiat denomination, no oracle, no conversion.

### 2.2 Balance directionality

The `MendGroup` stores a single `int256 balance`. The sign convention is:

- `balance > 0` → **memberB owes memberA**. memberB is the debtor, memberA is the creditor.
- `balance < 0` → **memberA owes memberB**. memberA is the debtor, memberB is the creditor.
- `balance == 0` → settled. Neither member owes the other.

### 2.3 Member roles

- **memberA** is, by convention, the wallet that called `createGroup` on the factory. The factory passes `msg.sender` as the first constructor argument.
- **memberB** is the counterparty wallet passed by memberA as an argument to `createGroup`.

This is a convention, not a role asymmetry. Both members have identical permissions within the contract. Only the ordering is fixed.

### 2.4 Error reporting

All reverts use **custom errors** (Solidity 0.8.4+) rather than require strings. Custom errors are declared at the contract level and reverted via `revert ErrorName(params)`.

---

## 3. Assumptions and Invariants

This section defines the trust boundary of the contracts (what they assume to be true without verifying) and the properties they guarantee (what they enforce regardless of inputs or operation order). Function-level behavior elsewhere in this spec exists to satisfy these invariants.

### 3.1 Assumptions

The contracts assume the following are true. If any of these is violated, the contracts' guarantees do not hold.

- **aMG-001:** The USDC contract at the address provided to the factory implements ERC-20 correctly, including `transferFrom` semantics. Mend does not validate USDC's behavior.
- **aMG-002:** The MendFactory validates its inputs before calling `new MendGroup(...)`. The MendGroup constructor performs equivalent checks as defense in depth, but the factory is the expected deployer.
- **aMG-003:** Members retain control of their wallets across the lifetime of the group. Lost-key recovery, wallet migration, and similar concerns are out of scope.
- **aMG-004:** The deployment chain (Base Sepolia) is operational and finalizing blocks normally. Reorg behavior beyond standard L2 finality is out of scope.

### 3.2 Invariants

The contracts guarantee the following properties at all times. Violations are bugs.

#### Critical

- **iMG-001 (Balance integrity):** At any moment, `balance` equals the sum of contributions from all non-deleted expenses, where each expense contributes `+amount/2` if `payer == memberA` and `-amount/2` if `payer == memberB`.
- **iMG-002 (Non-custodial):** In normal operation, the MendGroup contract holds no USDC or other assets. All settlements route directly from debtor to creditor via `safeTransferFrom`. If funds are sent to the contract by mistake (an external violation of this property), they can be recovered via rescue functions — but the contract itself never initiates custody of funds.
- **iMG-003 (Settle authorization):** When `balance != 0`, only the wallet identified as the debtor (per the sign convention in section 2.2) can successfully execute `settle()`.
- **iMG-004 (Settle atomicity):** A successful `settle()` call sets `balance` to exactly `0` and transfers exactly `abs(balance_before)` USDC. There are no partial settlements.

#### High

- **iMG-005 (ID monotonicity):** Expense IDs are assigned monotonically starting from 0 and are never reused, even after deletion. `nextExpenseId` only increases.
- **iMG-006 (Soft delete preserves history):** A deleted expense retains all its original fields (`payer`, `amount`, `description`, `createdAt`); only the `deleted` flag changes. The audit trail is preserved indefinitely.
- **iMG-007 (Member immutability):** `memberA`, `memberB`, and `usdc` are set at construction and cannot be changed.

#### Medium

- **iMG-008 (Edit equivalence):** After `editExpense(id, newPayer, newAmount, newDescription)`, the contract state is equivalent to having created the expense originally with the new values (modulo `createdAt`, which is preserved from original creation).
- **iMG-009 (Fund recovery):** Any ETH or ERC-20 tokens accidentally sent to the contract can be recovered by either group member via the rescue functions. The contract should never permanently hold funds.

### 3.3 Factory invariants

- **iMF-001 (Single USDC per factory):** All MendGroup instances deployed by a given MendFactory share the same `usdc` address, fixed at factory construction.
- **iMF-002 (Unrestricted deployment):** The factory imposes no policy on how many groups can exist between the same pair of members, beyond the input validation in `createGroup`.

---

## 4. Data types

### 4.1 Expense struct

```solidity
struct Expense {
    address payer;
    uint64 createdAt;
    bool deleted;
    uint256 amount;
    string description;
}
```

Field semantics:

- `payer` — the wallet that paid for the expense. Must be `memberA` or `memberB` at the time of creation or edit.
- `amount` — amount paid in USDC base units (6 decimals). Must be greater than zero at creation and at every edit.
- `description` — human-readable label (e.g., "groceries"). Variable length. Must be non-empty at creation and at every edit.
- `deleted` — soft-delete flag. When `true`, the expense no longer contributes to the balance but remains in storage for audit trail.
- `createdAt` — Unix timestamp at which the expense was first created. NOT updated on edit.

**Storage layout rationale:** The field order is chosen to enable single-slot packing of the small fields. `payer` (20 bytes), `createdAt` (8 bytes), and `deleted` (1 byte) total 29 bytes and pack into a single 32-byte storage slot. `amount` occupies its own slot. `description`, being a variable-length string, occupies additional slots as needed.

**Field order is load-bearing.** Reordering this struct will silently break the packing and increase storage cost per expense by ~3 slots. If new fields are ever added, they must be placed either within the first slot (if they fit with the existing small fields) or after `description`. Never insert a field that doesn't fit in the current packed slot between `payer` and `amount`.

## 5. `MendGroup` — state

### 5.1 Immutable state

Set once at construction, never modified:

```solidity
address public immutable memberA;
address public immutable memberB;
address public immutable usdc;
```

### 5.2 Mutable state

```solidity
int256 public balance;
mapping(uint256 => Expense) public expenses;
uint256 public nextExpenseId;
```

- `balance` starts at `0`.
- `expenses` is a mapping from expense ID to `Expense`. Unused IDs return a zero-valued struct (mapping default behavior).
- `nextExpenseId` starts at `0`. Every `addExpense` call assigns the current value as the new expense's ID, then increments. IDs are monotonic and never reused, even after deletion.

---

## 6. `MendGroup` — constructor

### Signature

```solidity
constructor(address _memberA, address _memberB, address _usdc)
```

### Reverts

- `InvalidMemberAddress()` if `_memberA == address(0)` or `_memberB == address(0)`.
- `CannotGroupWithSelf()` if `_memberA == _memberB`.
- `InvalidUsdcAddress()` if `_usdc == address(0)`.

### Effects

1. Assign `memberA`, `memberB`, `usdc` immutables.

### Notes

- `MendFactory` enforces equivalent checks before deploying; the duplication ensures `MendGroup` cannot be deployed in an invalid state through a non-standard deployment path.

---

## 7. `MendGroup` — modifiers

```solidity
modifier onlyMember() {
    if (msg.sender != memberA && msg.sender != memberB) revert NotAMember();
    _;
}
```

Applied to `addExpense`, `editExpense`, `deleteExpense`. `settle` performs its debtor check inline.

---

## 8. `MendGroup` — functions

### 8.1 `addExpense`

#### Signature

```solidity
function addExpense(
    address payer,
    uint256 amount,
    string calldata description
) external onlyMember returns (uint256 expenseId)
```

#### Reverts

- `NotAMember()` if `msg.sender` is not `memberA` or `memberB`.
- `AmountMustBePositive()` if `amount == 0`.
- `InvalidPayer(address provided)` if `payer` is not `memberA` or `memberB`.
- `DescriptionRequired()` if `bytes(description).length == 0`.

#### Effects

1. `expenseId = nextExpenseId`.
2. `expenses[expenseId] = Expense({ payer, amount, description, deleted: false, createdAt: uint64(block.timestamp) })`.
3. `nextExpenseId += 1`.
4. Apply contribution to balance:
   - If `payer == memberA`: `balance += int256(amount / 2)`.
   - If `payer == memberB`: `balance -= int256(amount / 2)`.
5. Emit `ExpenseAdded(expenseId, payer, amount, description, createdAt)`.

#### Returns

The assigned `expenseId`.

#### Notes

- `payer` is explicit — any member can log an expense paid by the other.
- Integer division means odd `amount` values lose 1 micro-USDC of precision; the payer absorbs the dust.

---

### 8.2 `editExpense`

#### Signature

```solidity
function editExpense(
    uint256 expenseId,
    address newPayer,
    uint256 newAmount,
    string calldata newDescription
) external onlyMember
```

#### Reverts

- `NotAMember()` if caller is not a member.
- `ExpenseDoesNotExist(uint256 id)` if `expenseId >= nextExpenseId`.
- `ExpenseIsDeleted(uint256 id)` if `expenses[expenseId].deleted == true`.
- `AmountMustBePositive()` if `newAmount == 0`.
- `InvalidPayer(address provided)` if `newPayer` is not `memberA` or `memberB`.
- `DescriptionRequired()` if `bytes(newDescription).length == 0`.

#### Effects

1. Load old expense into memory for the reversal computation.
2. Reverse old contribution:
   - If old `payer == memberA`: `balance -= int256(oldAmount / 2)`.
   - If old `payer == memberB`: `balance += int256(oldAmount / 2)`.
3. Update the expense struct in storage:
   - `expenses[expenseId].payer = newPayer`.
   - `expenses[expenseId].amount = newAmount`.
   - `expenses[expenseId].description = newDescription`.
4. Apply new contribution:
   - If `newPayer == memberA`: `balance += int256(newAmount / 2)`.
   - If `newPayer == memberB`: `balance -= int256(newAmount / 2)`.
5. Emit `ExpenseEdited(expenseId, newPayer, newAmount, newDescription)`.

#### Notes

- Any member can edit any expense, including one paid by the other.
- Edit is a full replacement: `newPayer`, `newAmount`, and `newDescription` must all be provided. To preserve a field, pass its current value.
- `createdAt` is not modified on edit.

---

### 8.3 `deleteExpense`

#### Signature

```solidity
function deleteExpense(uint256 expenseId) external onlyMember
```

#### Reverts

- `NotAMember()` if caller is not a member.
- `ExpenseDoesNotExist(uint256 id)` if `expenseId >= nextExpenseId`.
- `ExpenseIsDeleted(uint256 id)` if `expenses[expenseId].deleted == true`.

#### Effects

1. Reverse the expense's contribution to balance:
   - If `payer == memberA`: `balance -= int256(expense.amount / 2)`.
   - If `payer == memberB`: `balance += int256(expense.amount / 2)`.
2. `expenses[expenseId].deleted = true`.
3. Emit `ExpenseDeleted(expenseId, msg.sender)`.

#### Notes

- Any member can delete any expense.
- Soft delete: only the `deleted` flag changes; other fields are preserved for the audit trail.
- `ExpenseDeleted` carries `msg.sender`, which may differ from the original payer.
- There is no un-delete operation. To restore a deleted expense, call `addExpense` with the same values to create a new entry.

---

### 8.4 `settle`

#### Signature

```solidity
function settle() external nonReentrant
```

#### Reverts

- `AlreadySettled()` if `balance == 0`.
- `NotDebtor()` if `msg.sender` is not the current debtor.
- Any revert propagated from the USDC contract during `safeTransferFrom` (e.g., insufficient balance or allowance). The full transaction rolls back atomically.

#### Effects

1. Resolve debtor, creditor, and amount from `balance`:
   - If `balance > 0`: `debtor = memberB`, `creditor = memberA`, `amount = uint256(balance)`.
   - If `balance < 0`: `debtor = memberA`, `creditor = memberB`, `amount = uint256(-balance)`.
2. `balance = 0`.
3. `SafeERC20.safeTransferFrom(IERC20(usdc), debtor, creditor, amount)`.
4. Emit `Settled(debtor, creditor, amount)`.

#### Notes

- `AlreadySettled` is checked before the debtor is resolved; `NotDebtor` is checked after. This ordering produces the correct error when a non-debtor calls a settled group.
- Defense in depth: CEI ordering (balance zeroed before the external call) plus `nonReentrant` modifier.
- No partial settlement — `settle()` always clears the full balance. There is no `settle(amount)` variant in M1.
- If the debtor's USDC balance or allowance is below `amount`, `safeTransferFrom` reverts and the whole transaction rolls back. Frontends should check both before offering the Settle action.

---

### 8.5 Read functions

Auto-generated by Solidity from `public` state variables (no explicit implementation required):

```solidity
function balance() external view returns (int256);
function memberA() external view returns (address);
function memberB() external view returns (address);
function usdc() external view returns (address);
function nextExpenseId() external view returns (uint256);
function expenses(uint256 id) external view returns (
    address payer,
    uint64 createdAt,
    bool deleted,
    uint256 amount,
    string memory description
);
```

Explicit read function returning the full struct:

```solidity
function getExpense(uint256 expenseId) external view returns (Expense memory)
```

#### Reverts

- `ExpenseDoesNotExist(uint256 id)` if `expenseId >= nextExpenseId`.

#### Notes

- Returns the same data as the auto-generated `expenses(id)` tuple, packaged as a struct for callers that prefer struct ergonomics.
- No bulk-read functions are provided. Listing expenses, counting non-deleted ones, filtering by payer, or aggregating by date are off-chain concerns resolved by reading events (see §9).

---

### 8.6 Rescue functions

#### `rescueETH`

##### Signature

```solidity
function rescueETH(address to) external onlyMember
```

##### Reverts

- `NotAMember()` if caller is not a member.
- Any revert propagated from the ETH transfer (e.g., recipient is a contract that rejects ETH).

##### Effects

1. Transfer the contract's entire ETH balance to `to` via `to.call{value: amount}("")`; revert if the call returns `false`.
2. Emit `ETHRescued(to, amount)`.

#### `rescueERC20`

##### Signature

```solidity
function rescueERC20(address token, address to) external onlyMember
```

##### Reverts

- `NotAMember()` if caller is not a member.
- Any revert propagated from `token.transfer` via `SafeERC20.safeTransfer`.

##### Effects

1. Transfer the contract's entire balance of `token` to `to` using `SafeERC20.safeTransfer`.
2. Emit `ERC20Rescued(token, to, amount)`.

#### Notes

- The `to` parameter lets the caller choose the destination. This is intentional: ERC-20 transfers don't notify the recipient contract, so the contract cannot know who sent the stuck funds. The caller decides where to send them.
- `rescueERC20` accepts any `address token`, not just USDC. Any ERC-20 — including USDC itself — can end up in the contract by mistake and is rescuable.
- Access control is `onlyMember`, consistent with all other state-changing functions. Both members already trust each other (they can add/edit/delete each other's expenses), so rescue access does not introduce new trust assumptions.
- This is a standard pattern in production DeFi contracts (Aave, Compound, OpenZeppelin-based vaults).

---

## 9. `MendGroup` — events

```solidity
event ExpenseAdded(
    uint256 indexed expenseId,
    address indexed payer,
    uint256 amount,
    string description,
    uint64 createdAt
);

event ExpenseEdited(
    uint256 indexed expenseId,
    address indexed payer,
    uint256 amount,
    string description
);

event ExpenseDeleted(
    uint256 indexed expenseId,
    address indexed deletedBy
);

event Settled(
    address indexed payer,
    address indexed payee,
    uint256 amount
);

event ETHRescued(address indexed to, uint256 amount);

event ERC20Rescued(address indexed token, address indexed to, uint256 amount);
```

Notes:

- Events are the primary read path. Off-chain clients reconstruct group history by reading logs; the contract provides no bulk-read helpers.
- `ExpenseEdited` omits `createdAt` because it never changes after creation.
- `ExpenseDeleted.deletedBy` captures `msg.sender` at delete time, which may differ from the original payer since any member can delete any expense.
- `Settled` uses `payer`/`payee` rather than `debtor`/`creditor` to match conventional payment vocabulary.
- `ETHRescued` and `ERC20Rescued` capture rescue operations for the audit trail. Either member may emit these; `to` is unconstrained.

---

## 10. `MendGroup` — errors

```solidity
// Access control
error NotAMember();
error NotDebtor();

// State-related
error AlreadySettled();
error ExpenseDoesNotExist(uint256 expenseId);
error ExpenseIsDeleted(uint256 expenseId);

// Input validation
error AmountMustBePositive();
error InvalidPayer(address providedAddress);
error DescriptionRequired();

// Constructor validation
error CannotGroupWithSelf();
error InvalidMemberAddress();
error InvalidUsdcAddress();

// Rescue
error ETHTransferFailed();
```

Notes:

- `InvalidPayer` carries the invalid address to distinguish `address(0)` from the wrong member without string parsing.
- `ExpenseDoesNotExist` and `ExpenseIsDeleted` carry the offending ID so callers see exactly which expense failed the check — useful when a batch of operations fails partway.
- Rescue functions (§8.6) add `ETHTransferFailed()` for low-level ETH transfer failures; all other reverts reuse `NotAMember()`.

---

## 11. `MendFactory` — state

```solidity
address public immutable usdc;
```

No other state. The factory does not maintain a registry of deployed groups, does not track groups by member, and does not enforce uniqueness of member pairs. These are deliberate non-features; see `design.md` and `future-notes.md`.

---

## 12. `MendFactory` — constructor

### Signature

```solidity
constructor(address _usdc)
```

### Reverts

- `InvalidUsdcAddress()` if `_usdc == address(0)`.

### Effects

1. Assign `usdc` immutable.

### Notes

- All `MendGroup`s deployed by a given factory share its `usdc` address.

---

## 13. `MendFactory` — functions

### 13.1 `createGroup`

#### Signature

```solidity
function createGroup(address otherMember) external returns (address group)
```

#### Reverts

- `CannotGroupWithSelf()` if `msg.sender == otherMember`.
- `InvalidMemberAddress()` if `otherMember == address(0)`.

#### Effects

1. Deploy a new `MendGroup` via `new MendGroup(msg.sender, otherMember, usdc)`.
2. Emit `GroupCreated(address(group), msg.sender, otherMember)`.

#### Returns

The address of the newly deployed `MendGroup`.

#### Notes

- No duplicate checks. Multiple groups with the same counterparty are allowed (e.g., different purposes such as "shared apartment" and "trips"). Off-chain clients that want to prevent accidental duplicates should check existing groups via events before calling `createGroup`.

---

## 14. `MendFactory` — events and errors

### 14.1 Events

```solidity
event GroupCreated(
    address indexed group,
    address indexed memberA,
    address indexed memberB
);
```

Notes:

- All three fields are indexed so frontends can discover "my groups" by filtering logs, without the factory holding an on-chain registry.

### 14.2 Errors

```solidity
error InvalidUsdcAddress();
error CannotGroupWithSelf();
error InvalidMemberAddress();
```

---

## 15. Non-functional requirements

### 15.1 Test coverage targets

- **Line coverage:** ≥ 90% on `MendGroup.sol`.
- **Branch coverage:** ≥ 95% on `MendGroup.sol`; document any uncovered branch with rationale (e.g., unreachable in practice, dependent on third-party revert).
- **Factory coverage:** ≥ 90% line coverage on `MendFactory.sol`; branch coverage expected to reach 100% given the factory's simplicity.

### 15.2 Required test categories

- **Unit tests:** one per function, covering the happy path plus every revert condition listed in this spec.
- **Fuzz tests:** property-based tests on the balance math. For any random sequence of `addExpense`, `editExpense`, and `deleteExpense` operations, the contract's `balance` must equal the sum of contributions from all non-deleted expenses, recomputed from scratch. This implicitly covers the property that an edit is equivalent to having created the expense with the new values originally.
- **Invariant tests:** Foundry invariant suite running random sequences of calls from random actors, asserting the balance-equals-sum-of-non-deleted-contributions property holds after every state-changing call.
- **Fork tests:** a subset of tests runs against a forked Base Sepolia with real USDC, verifying that `safeTransferFrom` interactions work end-to-end.
- **Reentrancy tests:** an explicit test that attempts to re-enter `settle()` via a malicious token or receiver and verifies the contract correctly rejects the re-entry.

### 15.3 NatSpec requirements

- All external and public functions, events, errors, and state variables require complete NatSpec: `@notice`, `@param`, `@return`, and `@dev` for revert conditions. Internal helpers are encouraged but optional.

### 15.4 Dependencies

- Solidity: latest stable at implementation time, pinned in `contracts/foundry.toml`.
- OpenZeppelin Contracts: `SafeERC20` and `ReentrancyGuard` only. No other OZ modules are to be pulled in for M1.
- forge-std: for test utilities.

No other dependencies. Resist the temptation to pull in additional libraries; M1's scope is small enough that they are unnecessary.

### 15.5 Deployment

- `contracts/script/Deploy.s.sol`: deploys `MendFactory` to Base Sepolia using the canonical USDC address hardcoded per chain ID (`84532` → `0x036CbD53842c5426634e7929541eC2318f3dCF7e`; other chains fall back to `USDC_ADDRESS` env var). Verifies the factory on Basescan. The deployed factory address is recorded in `README.md`.
- `contracts/script/DemoFlow.s.sol`: end-to-end demonstration script. Deploys the factory, creates a group, performs USDC approvals, adds expenses, edits one, deletes one, and settles. Used as the canonical executable proof that the system works.

---

## 16. Out-of-scope behaviors (explicit non-requirements)

The following are intentionally NOT part of M1 and are listed here to prevent scope creep during implementation:

- **Pausability.** The contract cannot be paused. There is no admin role.
- **Upgradeability.** No proxy pattern. A deployed `MendGroup` runs the code it was deployed with, forever.
- **Fee collection.** No protocol fees on settlement.
- **Group closing / archiving.** A group has no concept of being "closed". It simply stops being used. The state remains accessible and auditable forever.
- **Member removal or substitution.** Not supported; members are `immutable`.
- **Partial settlement.** `settle()` always settles the full balance.
- **Multi-token support.** USDC only, fixed at factory construction.
- **Cross-chain functionality.** Single chain per factory deployment.

Anything listed here that is proposed during implementation must be escalated to the design phase (update `design.md` and this spec) before code is written.
