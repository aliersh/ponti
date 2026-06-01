// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {MendGroup} from "../src/MendGroup.sol";
import {ReentrantToken} from "./mocks/ReentrantToken.sol";

/// @notice Reverts on `receive()` to force `ETHTransferFailed`.
contract ETHRejector {
    receive() external payable {
        revert("nope");
    }
}

contract MendGroupTest is Test {
    // For vm.expectEmit topic matching.
    event ExpenseAdded(
        uint256 indexed expenseId, address indexed payer, uint256 amount, string description, uint64 createdAt
    );
    event ExpenseEdited(uint256 indexed expenseId, address indexed payer, uint256 amount, string description);
    event ExpenseDeleted(uint256 indexed expenseId, address indexed deletedBy);
    event Settled(address indexed payer, address indexed payee, uint256 amount);
    event ETHRescued(address indexed to, uint256 amount);
    event ERC20Rescued(address indexed token, address indexed to, uint256 amount);

    ERC20Mock internal usdc;
    MendGroup internal group;

    address internal memberA;
    address internal memberB;
    address internal stranger;

    uint256 internal constant MINT = 1e24;

    function setUp() public {
        usdc = new ERC20Mock();
        memberA = makeAddr("memberA");
        memberB = makeAddr("memberB");
        stranger = makeAddr("stranger");

        group = new MendGroup(memberA, memberB, address(usdc));

        usdc.mint(memberA, MINT);
        usdc.mint(memberB, MINT);
    }

    // ---------------------------------------------------------------------
    // constructor
    // ---------------------------------------------------------------------

    function test_Constructor_RevertsOnZeroMemberA() public {
        vm.expectRevert(MendGroup.InvalidMemberAddress.selector);
        new MendGroup(address(0), memberB, address(usdc));
    }

    function test_Constructor_RevertsOnZeroMemberB() public {
        vm.expectRevert(MendGroup.InvalidMemberAddress.selector);
        new MendGroup(memberA, address(0), address(usdc));
    }

    function test_Constructor_RevertsOnSameMembers() public {
        vm.expectRevert(MendGroup.CannotGroupWithSelf.selector);
        new MendGroup(memberA, memberA, address(usdc));
    }

    function test_Constructor_RevertsOnZeroUsdc() public {
        vm.expectRevert(MendGroup.InvalidUsdcAddress.selector);
        new MendGroup(memberA, memberB, address(0));
    }

    function test_Constructor_SetsImmutables() public view {
        assertEq(group.memberA(), memberA);
        assertEq(group.memberB(), memberB);
        assertEq(group.usdc(), address(usdc));
        assertEq(group.balance(), 0);
        assertEq(group.nextExpenseId(), 0);
    }

    // ---------------------------------------------------------------------
    // addExpense
    // ---------------------------------------------------------------------

    function test_AddExpense_RevertsIfNotMember() public {
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotAMember.selector);
        group.addExpense(memberA, 100, "groceries");
    }

    function test_AddExpense_RevertsOnZeroAmount() public {
        vm.prank(memberA);
        vm.expectRevert(MendGroup.AmountMustBePositive.selector);
        group.addExpense(memberA, 0, "groceries");
    }

    function test_AddExpense_RevertsOnInvalidPayer() public {
        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.InvalidPayer.selector, stranger));
        group.addExpense(stranger, 100, "groceries");
    }

    function test_AddExpense_RevertsOnEmptyDescription() public {
        vm.prank(memberA);
        vm.expectRevert(MendGroup.DescriptionRequired.selector);
        group.addExpense(memberA, 100, "");
    }

    function test_AddExpense_StoresExpenseFields() public {
        vm.warp(1_700_000_000);
        vm.prank(memberA);
        uint256 id = group.addExpense(memberA, 100, "groceries");
        assertEq(id, 0);

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.payer, memberA);
        assertEq(e.amount, 100);
        assertEq(e.description, "groceries");
        assertEq(e.deleted, false);
        assertEq(e.createdAt, 1_700_000_000);

        // Auto-generated tuple getter returns fields in declaration order.
        (address payer, uint64 createdAt, bool deleted, uint256 amount, string memory description) = group.expenses(id);
        assertEq(payer, memberA);
        assertEq(createdAt, 1_700_000_000);
        assertEq(deleted, false);
        assertEq(amount, 100);
        assertEq(description, "groceries");
    }

    function test_AddExpense_UpdatesBalance_PayerA() public {
        vm.prank(memberA);
        group.addExpense(memberA, 100, "groceries");
        assertEq(group.balance(), 50);
    }

    function test_AddExpense_UpdatesBalance_PayerB() public {
        vm.prank(memberA);
        group.addExpense(memberB, 100, "groceries");
        assertEq(group.balance(), -50);
    }

    function test_AddExpense_MonotonicIds() public {
        vm.startPrank(memberA);
        uint256 id0 = group.addExpense(memberA, 100, "a");
        uint256 id1 = group.addExpense(memberB, 100, "b");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(group.nextExpenseId(), 2);
    }

    function test_AddExpense_OddAmountLosesDust() public {
        vm.prank(memberA);
        group.addExpense(memberA, 5, "odd");
        // 5 / 2 = 2 (integer division), sign positive because payer is memberA.
        assertEq(group.balance(), 2);
    }

    function test_AddExpense_EmitsEvent() public {
        vm.warp(1_700_000_000);
        vm.expectEmit(true, true, false, true, address(group));
        emit ExpenseAdded(0, memberA, 100, "groceries", uint64(1_700_000_000));

        vm.prank(memberA);
        group.addExpense(memberA, 100, "groceries");
    }

    function testFuzz_AddExpense_BalanceMath(uint128 amount, bool payerIsA) public {
        vm.assume(amount > 0);
        address payer = payerIsA ? memberA : memberB;

        vm.prank(memberA);
        group.addExpense(payer, amount, "x");

        int256 expected = payerIsA ? int256(uint256(amount) / 2) : -int256(uint256(amount) / 2);
        assertEq(group.balance(), expected);
    }

    // ---------------------------------------------------------------------
    // editExpense
    // ---------------------------------------------------------------------

    function _seed(address payer, uint256 amount) internal returns (uint256 id) {
        vm.prank(memberA);
        id = group.addExpense(payer, amount, "seed");
    }

    function test_EditExpense_RevertsIfNotMember() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotAMember.selector);
        group.editExpense(id, memberB, 50, "new");
    }

    function test_EditExpense_RevertsOnNonexistentId() public {
        uint256 missing = group.nextExpenseId();
        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.ExpenseDoesNotExist.selector, missing));
        group.editExpense(missing, memberA, 50, "new");
    }

    function test_EditExpense_RevertsOnDeletedId() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        group.deleteExpense(id);

        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.ExpenseIsDeleted.selector, id));
        group.editExpense(id, memberA, 50, "new");
    }

    function test_EditExpense_RevertsOnZeroAmount() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        vm.expectRevert(MendGroup.AmountMustBePositive.selector);
        group.editExpense(id, memberA, 0, "new");
    }

    function test_EditExpense_RevertsOnInvalidPayer() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.InvalidPayer.selector, stranger));
        group.editExpense(id, stranger, 50, "new");
    }

    function test_EditExpense_RevertsOnEmptyDescription() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        vm.expectRevert(MendGroup.DescriptionRequired.selector);
        group.editExpense(id, memberA, 50, "");
    }

    function test_EditExpense_PreservesCreatedAt() public {
        vm.warp(1_700_000_000);
        uint256 id = _seed(memberA, 100);
        vm.warp(1_700_099_999);

        vm.prank(memberA);
        group.editExpense(id, memberB, 200, "updated");

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.createdAt, 1_700_000_000);
    }

    function test_EditExpense_SamePayer_DifferentAmount() public {
        uint256 id = _seed(memberA, 100); // balance = +50
        vm.prank(memberA);
        group.editExpense(id, memberA, 300, "bigger"); // balance should become +150
        assertEq(group.balance(), 150);
    }

    function test_EditExpense_DifferentPayer() public {
        uint256 id = _seed(memberA, 100); // balance = +50
        vm.prank(memberA);
        group.editExpense(id, memberB, 100, "flip"); // balance should become -50
        assertEq(group.balance(), -50);
    }

    function test_EditExpense_DescriptionReplaced() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        group.editExpense(id, memberA, 100, "replaced");

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.description, "replaced");
    }

    function test_EditExpense_EmitsEvent() public {
        uint256 id = _seed(memberA, 100);
        vm.expectEmit(true, true, false, true, address(group));
        emit ExpenseEdited(id, memberB, 200, "updated");

        vm.prank(memberA);
        group.editExpense(id, memberB, 200, "updated");
    }

    // ---------------------------------------------------------------------
    // deleteExpense
    // ---------------------------------------------------------------------

    function test_DeleteExpense_RevertsIfNotMember() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotAMember.selector);
        group.deleteExpense(id);
    }

    function test_DeleteExpense_RevertsOnNonexistentId() public {
        uint256 missing = group.nextExpenseId();
        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.ExpenseDoesNotExist.selector, missing));
        group.deleteExpense(missing);
    }

    function test_DeleteExpense_RevertsOnAlreadyDeleted() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        group.deleteExpense(id);

        vm.prank(memberA);
        vm.expectRevert(abi.encodeWithSelector(MendGroup.ExpenseIsDeleted.selector, id));
        group.deleteExpense(id);
    }

    function test_DeleteExpense_SetsDeletedFlag() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        group.deleteExpense(id);

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.deleted, true);
    }

    function test_DeleteExpense_PreservesOtherFields() public {
        vm.warp(1_700_000_000);
        uint256 id = _seed(memberA, 100);
        vm.warp(1_700_050_000);

        vm.prank(memberB);
        group.deleteExpense(id);

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.payer, memberA);
        assertEq(e.amount, 100);
        assertEq(e.description, "seed");
        assertEq(e.createdAt, 1_700_000_000);
    }

    function test_DeleteExpense_ReversesBalance() public {
        uint256 id = _seed(memberA, 100); // balance +50
        vm.prank(memberA);
        group.deleteExpense(id);
        assertEq(group.balance(), 0);
    }

    function test_DeleteExpense_EmitsEventWithCallerNotOriginalPayer() public {
        uint256 id = _seed(memberA, 100);
        // memberB deletes an expense originally paid by memberA.
        vm.expectEmit(true, true, false, true, address(group));
        emit ExpenseDeleted(id, memberB);

        vm.prank(memberB);
        group.deleteExpense(id);
    }

    // ---------------------------------------------------------------------
    // settle
    // ---------------------------------------------------------------------

    /// Reminder: payer=memberA, amount=100 → balance=+50 → B owes A → B is debtor.
    function test_Settle_RevertsIfAlreadySettled() public {
        vm.prank(memberA);
        vm.expectRevert(MendGroup.AlreadySettled.selector);
        group.settle();
    }

    function test_Settle_RevertsIfNotDebtor_BalancePositive() public {
        _seed(memberA, 100); // balance +50, debtor = memberB
        vm.prank(memberA);
        vm.expectRevert(MendGroup.NotDebtor.selector);
        group.settle();
    }

    function test_Settle_RevertsIfNotDebtor_BalanceNegative() public {
        _seed(memberB, 100); // balance -50, debtor = memberA
        vm.prank(memberB);
        vm.expectRevert(MendGroup.NotDebtor.selector);
        group.settle();
    }

    function test_Settle_RevertsIfStrangerCalls() public {
        _seed(memberA, 100);
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotDebtor.selector);
        group.settle();
    }

    function test_Settle_RevertsIfDebtorHasInsufficientAllowance() public {
        _seed(memberA, 100); // debtor = memberB, amount owed = 50
        // memberB approves 0 (default) — safeTransferFrom should revert via ERC20InsufficientAllowance.
        vm.prank(memberB);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(group), 0, 50));
        group.settle();
    }

    function test_Settle_RevertsIfDebtorHasInsufficientBalance() public {
        _seed(memberA, 100); // debtor = memberB, owes 50
        // Drain memberB's balance but still approve enough so the allowance check passes.
        vm.startPrank(memberB);
        require(usdc.transfer(stranger, MINT), "drain");
        usdc.approve(address(group), 50);
        vm.stopPrank();

        vm.prank(memberB);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, memberB, 0, 50));
        group.settle();
    }

    function test_Settle_TransfersUsdc_BalancePositive() public {
        _seed(memberA, 100); // debtor=B, amount=50
        uint256 aBefore = usdc.balanceOf(memberA);
        uint256 bBefore = usdc.balanceOf(memberB);

        vm.prank(memberB);
        usdc.approve(address(group), 50);
        vm.prank(memberB);
        group.settle();

        assertEq(usdc.balanceOf(memberA), aBefore + 50);
        assertEq(usdc.balanceOf(memberB), bBefore - 50);
        assertEq(usdc.balanceOf(address(group)), 0);
    }

    function test_Settle_TransfersUsdc_BalanceNegative() public {
        _seed(memberB, 100); // debtor=A, amount=50
        uint256 aBefore = usdc.balanceOf(memberA);
        uint256 bBefore = usdc.balanceOf(memberB);

        vm.prank(memberA);
        usdc.approve(address(group), 50);
        vm.prank(memberA);
        group.settle();

        assertEq(usdc.balanceOf(memberA), aBefore - 50);
        assertEq(usdc.balanceOf(memberB), bBefore + 50);
    }

    function test_Settle_ZeroesBalance() public {
        _seed(memberA, 100);
        vm.prank(memberB);
        usdc.approve(address(group), 50);
        vm.prank(memberB);
        group.settle();
        assertEq(group.balance(), 0);
    }

    function test_Settle_EmitsSettledEvent() public {
        _seed(memberA, 100); // debtor=B, creditor=A, amount=50
        vm.prank(memberB);
        usdc.approve(address(group), 50);

        vm.expectEmit(true, true, false, true, address(group));
        emit Settled(memberB, memberA, 50);

        vm.prank(memberB);
        group.settle();
    }

    function test_Settle_RejectsReentrancy() public {
        // Deploy a fresh group backed by a token that reenters settle() on transferFrom.
        ReentrantToken evil = new ReentrantToken();
        MendGroup evilGroup = new MendGroup(memberA, memberB, address(evil));

        vm.prank(memberA);
        evilGroup.addExpense(memberA, 100, "bait"); // balance = +50, debtor = memberB

        vm.prank(memberB);
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        evilGroup.settle();
    }

    // ---------------------------------------------------------------------
    // getExpense
    // ---------------------------------------------------------------------

    function test_GetExpense_RevertsOnNonexistent() public {
        uint256 missing = group.nextExpenseId();
        vm.expectRevert(abi.encodeWithSelector(MendGroup.ExpenseDoesNotExist.selector, missing));
        group.getExpense(missing);
    }

    function test_GetExpense_ReturnsFullStruct() public {
        vm.warp(1_700_000_000);
        uint256 id = _seed(memberA, 123);

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.payer, memberA);
        assertEq(e.amount, 123);
        assertEq(e.description, "seed");
        assertEq(e.deleted, false);
        assertEq(e.createdAt, 1_700_000_000);
    }

    function test_GetExpense_ReturnsDeletedFlagAfterDelete() public {
        uint256 id = _seed(memberA, 100);
        vm.prank(memberA);
        group.deleteExpense(id);

        MendGroup.Expense memory e = group.getExpense(id);
        assertEq(e.deleted, true);
        assertEq(e.payer, memberA);
        assertEq(e.amount, 100);
    }

    // ---------------------------------------------------------------------
    // rescueETH
    // ---------------------------------------------------------------------

    function test_RescueETH_RevertsIfNotMember() public {
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotAMember.selector);
        group.rescueETH(memberA);
    }

    function test_RescueETH_TransfersFullBalance() public {
        vm.deal(address(group), 1 ether);
        uint256 before = memberA.balance;

        vm.prank(memberA);
        group.rescueETH(memberA);

        assertEq(address(group).balance, 0);
        assertEq(memberA.balance, before + 1 ether);
    }

    function test_RescueETH_WorksWithZeroBalance() public {
        vm.expectEmit(true, false, false, true, address(group));
        emit ETHRescued(memberA, 0);

        vm.prank(memberA);
        group.rescueETH(memberA);
    }

    function test_RescueETH_RevertsOnRejectingRecipient() public {
        vm.deal(address(group), 1 ether);
        ETHRejector rejector = new ETHRejector();

        vm.prank(memberA);
        vm.expectRevert(MendGroup.ETHTransferFailed.selector);
        group.rescueETH(address(rejector));
    }

    function test_RescueETH_EmitsEvent() public {
        vm.deal(address(group), 0.5 ether);
        vm.expectEmit(true, false, false, true, address(group));
        emit ETHRescued(memberA, 0.5 ether);

        vm.prank(memberA);
        group.rescueETH(memberA);
    }

    // ---------------------------------------------------------------------
    // rescueERC20
    // ---------------------------------------------------------------------

    function test_RescueERC20_RevertsIfNotMember() public {
        vm.prank(stranger);
        vm.expectRevert(MendGroup.NotAMember.selector);
        group.rescueERC20(address(usdc), memberA);
    }

    function test_RescueERC20_TransfersFullBalance() public {
        ERC20Mock other = new ERC20Mock();
        other.mint(address(group), 777);

        vm.prank(memberA);
        group.rescueERC20(address(other), memberB);

        assertEq(other.balanceOf(address(group)), 0);
        assertEq(other.balanceOf(memberB), 777);
    }

    function test_RescueERC20_WorksForUsdcItself() public {
        usdc.mint(address(group), 1_000);

        vm.prank(memberA);
        group.rescueERC20(address(usdc), memberA);

        assertEq(usdc.balanceOf(address(group)), 0);
    }

    function test_RescueERC20_EmitsEvent() public {
        ERC20Mock other = new ERC20Mock();
        other.mint(address(group), 42);

        vm.expectEmit(true, true, false, true, address(group));
        emit ERC20Rescued(address(other), memberA, 42);

        vm.prank(memberA);
        group.rescueERC20(address(other), memberA);
    }

    // ---------------------------------------------------------------------
    // Sequence fuzz — balance = sum(non-deleted contributions).
    // ---------------------------------------------------------------------

    function testFuzz_SequenceOfOperations(uint256 seed) public {
        uint256 steps = 20;

        for (uint256 i = 0; i < steps; i++) {
            seed = uint256(keccak256(abi.encode(seed, i)));

            uint256 op = seed % 3; // 0=add, 1=edit, 2=delete
            uint256 nextId = group.nextExpenseId();
            address caller = (seed & 1 == 0) ? memberA : memberB;

            if (op == 0 || nextId == 0) {
                address payer = (seed & 2 == 0) ? memberA : memberB;
                uint256 amount = bound(uint256(keccak256(abi.encode(seed, "amt"))), 1, 1e18);
                vm.prank(caller);
                group.addExpense(payer, amount, "f");
            } else if (op == 1) {
                uint256 id = seed % nextId;
                if (group.getExpense(id).deleted) continue;
                address payer = (seed & 2 == 0) ? memberA : memberB;
                uint256 amount = bound(uint256(keccak256(abi.encode(seed, "amt"))), 1, 1e18);
                vm.prank(caller);
                group.editExpense(id, payer, amount, "e");
            } else {
                uint256 id = seed % nextId;
                if (group.getExpense(id).deleted) continue;
                vm.prank(caller);
                group.deleteExpense(id);
            }

            assertEq(group.balance(), _expectedBalance());
        }
    }

    function _expectedBalance() internal view returns (int256 expected) {
        uint256 n = group.nextExpenseId();
        for (uint256 i = 0; i < n; i++) {
            MendGroup.Expense memory e = group.getExpense(i);
            if (e.deleted) continue;
            int256 half = int256(e.amount / 2);
            expected += (e.payer == memberA) ? half : -half;
        }
    }
}
