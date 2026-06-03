import { baseSepolia } from 'viem/chains'

export const CHAIN = baseSepolia

// Deployed MendFactory and Circle's native USDC on Base Sepolia.
export const FACTORY_ADDRESS = '0x7C6c933B036fCe0d6663ab4F3866ACdC2A5091Da' as const
export const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const

// Lower bound for factory log queries — never scan from genesis.
export const FACTORY_DEPLOY_BLOCK = 42151193n

export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID
export const SPONSORSHIP_POLICY_ID = import.meta.env.VITE_PIMLICO_SPONSORSHIP_POLICY_ID
// Reads RPC. The chain's canonical public endpoint caps getLogs ranges near 3k
// blocks and can't serve the factory's full history, so default to a public RPC
// that handles ~10k-block windows (verified). Override with VITE_RPC_URL.
export const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'https://base-sepolia.drpc.org'

// Minimal factory interface: the one write call (createGroup), the event we read
// back from the receipt, and the constructor-validation errors so viem can
// decode a sponsored revert into a named error instead of a raw selector.
export const factoryAbi = [
  {
    type: 'function',
    name: 'createGroup',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'otherMember', type: 'address' }],
    outputs: [{ name: 'group', type: 'address' }],
  },
  {
    type: 'event',
    name: 'GroupCreated',
    inputs: [
      { name: 'group', type: 'address', indexed: true },
      { name: 'memberA', type: 'address', indexed: true },
      { name: 'memberB', type: 'address', indexed: true },
    ],
  },
  { type: 'error', name: 'CannotGroupWithSelf', inputs: [] },
  { type: 'error', name: 'InvalidMemberAddress', inputs: [] },
] as const

// Minimal group interface: the signed balance getter and the three expense events.
export const groupAbi = [
  {
    type: 'function',
    name: 'balance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'int256' }], // signed — negative means memberA owes memberB
  },
  {
    type: 'event',
    name: 'ExpenseAdded',
    inputs: [
      { name: 'expenseId',   type: 'uint256', indexed: true },
      { name: 'payer',       type: 'address', indexed: true },
      { name: 'amount',      type: 'uint256', indexed: false },
      { name: 'description', type: 'string',  indexed: false },
      { name: 'createdAt',   type: 'uint64',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpenseEdited',
    inputs: [
      { name: 'expenseId',   type: 'uint256', indexed: true },
      { name: 'payer',       type: 'address', indexed: true },
      { name: 'amount',      type: 'uint256', indexed: false },
      { name: 'description', type: 'string',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ExpenseDeleted',
    inputs: [
      { name: 'expenseId', type: 'uint256', indexed: true },
      { name: 'deletedBy', type: 'address', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'addExpense',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'payer',       type: 'address' },
      { name: 'amount',      type: 'uint256' },
      { name: 'description', type: 'string'  },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  { type: 'error', name: 'AmountMustBePositive', inputs: [] },
  { type: 'error', name: 'InvalidPayer',         inputs: [{ name: 'payer', type: 'address' }] },
  { type: 'error', name: 'DescriptionRequired',  inputs: [] },
  { type: 'error', name: 'NotAMember',           inputs: [] },
  {
    type: 'function',
    name: 'settle',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  { type: 'error', name: 'AlreadySettled', inputs: [] },
  { type: 'error', name: 'NotDebtor',      inputs: [] },
  {
    type: 'function',
    name: 'editExpense',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'expenseId',      type: 'uint256' },
      { name: 'newPayer',       type: 'address' },
      { name: 'newAmount',      type: 'uint256' },
      { name: 'newDescription', type: 'string'  },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'deleteExpense',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'expenseId', type: 'uint256' }],
    outputs: [],
  },
  { type: 'error', name: 'ExpenseDoesNotExist', inputs: [{ name: 'expenseId', type: 'uint256' }] },
  { type: 'error', name: 'ExpenseIsDeleted',    inputs: [{ name: 'expenseId', type: 'uint256' }] },
] as const

// Minimal USDC interface: allowance approval and balance check for the settle flow.
export const usdcAbi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
