// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

import {MendGroup} from "../src/MendGroup.sol";

/// @notice Bounded handler that drives random add/edit/delete sequences against
///         a single MendGroup. Each action is wrapped in try/catch so a revert
///         doesn't sink the fuzz run. `settle()` is intentionally excluded — if
///         it were included, ghost-state cleanup would be required to keep the
///         recomputed sum-of-contributions in sync with the zeroed contract
///         balance. Settle has dedicated unit + reentrancy coverage.
contract MendGroupHandler is Test {
    MendGroup internal immutable GROUP;
    address internal immutable MEMBER_A;
    address internal immutable MEMBER_B;

    uint256 public addedCount;

    constructor(MendGroup _group, address _memberA, address _memberB) {
        GROUP = _group;
        MEMBER_A = _memberA;
        MEMBER_B = _memberB;
    }

    function _pick(bool flag) internal view returns (address) {
        return flag ? MEMBER_A : MEMBER_B;
    }

    function handlerAddExpense(uint256 amountSeed, bool payerIsA, bool callerIsA) external {
        uint256 amount = bound(amountSeed, 1, 1e24);
        vm.prank(_pick(callerIsA));
        try GROUP.addExpense(_pick(payerIsA), amount, "x") {
            addedCount++;
        } catch {}
    }

    function handlerEditExpense(uint256 idSeed, uint256 amountSeed, bool payerIsA, bool callerIsA) external {
        uint256 n = GROUP.nextExpenseId();
        if (n == 0) return;
        uint256 id = bound(idSeed, 0, n - 1);

        MendGroup.Expense memory e = GROUP.getExpense(id);
        if (e.deleted) return;

        uint256 amount = bound(amountSeed, 1, 1e24);
        vm.prank(_pick(callerIsA));
        try GROUP.editExpense(id, _pick(payerIsA), amount, "e") {} catch {}
    }

    function handlerDeleteExpense(uint256 idSeed, bool callerIsA) external {
        uint256 n = GROUP.nextExpenseId();
        if (n == 0) return;
        uint256 id = bound(idSeed, 0, n - 1);

        MendGroup.Expense memory e = GROUP.getExpense(id);
        if (e.deleted) return;

        vm.prank(_pick(callerIsA));
        try GROUP.deleteExpense(id) {} catch {}
    }

    function handlerWarp(uint32 secs) external {
        vm.warp(block.timestamp + secs);
    }
}

contract MendGroupInvariantTest is StdInvariant, Test {
    ERC20Mock internal usdc;
    MendGroup internal group;
    MendGroupHandler internal handler;

    address internal memberA;
    address internal memberB;

    // Immutability snapshots.
    address internal snapMemberA;
    address internal snapMemberB;
    address internal snapUsdc;

    function setUp() public {
        usdc = new ERC20Mock();
        memberA = makeAddr("memberA");
        memberB = makeAddr("memberB");

        group = new MendGroup(memberA, memberB, address(usdc));
        handler = new MendGroupHandler(group, memberA, memberB);

        snapMemberA = group.memberA();
        snapMemberB = group.memberB();
        snapUsdc = group.usdc();

        // Restrict fuzzer to the four bounded handler entry points. Without a
        // selector list the fuzzer would also call inherited Test functions.
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = MendGroupHandler.handlerAddExpense.selector;
        selectors[1] = MendGroupHandler.handlerEditExpense.selector;
        selectors[2] = MendGroupHandler.handlerDeleteExpense.selector;
        selectors[3] = MendGroupHandler.handlerWarp.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
        targetContract(address(handler));
    }

    /// iMG-001: balance equals sum of contributions from non-deleted expenses.
    /// forge-config: default.invariant.fail-on-revert = false
    function invariant_BalanceEqualsSumOfContributions() public view {
        int256 expected;
        uint256 n = group.nextExpenseId();
        for (uint256 i = 0; i < n; i++) {
            MendGroup.Expense memory e = group.getExpense(i);
            if (e.deleted) continue;
            int256 half = int256(e.amount / 2);
            expected += (e.payer == memberA) ? half : -half;
        }
        assertEq(group.balance(), expected);
    }

    /// iMG-005: expense IDs are monotonically assigned and never reused.
    /// forge-config: default.invariant.fail-on-revert = false
    function invariant_NextExpenseIdMatchesHandlerAdds() public view {
        assertEq(group.nextExpenseId(), handler.addedCount());
    }

    /// iMG-007: memberA, memberB, usdc are immutable.
    /// forge-config: default.invariant.fail-on-revert = false
    function invariant_MembersImmutable() public view {
        assertEq(group.memberA(), snapMemberA);
        assertEq(group.memberB(), snapMemberB);
        assertEq(group.usdc(), snapUsdc);
    }

    /// iMG-002: the contract holds no USDC during normal operation.
    /// forge-config: default.invariant.fail-on-revert = false
    function invariant_NonCustodial_NoUsdcHeld() public view {
        assertEq(usdc.balanceOf(address(group)), 0);
    }
}
