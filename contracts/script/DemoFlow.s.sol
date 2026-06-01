// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MendFactory} from "../src/MendFactory.sol";
import {MendGroup} from "../src/MendGroup.sol";

/// @notice End-to-end simulation of the Mend M1 system on a forked Optimism Sepolia.
///         Never broadcasts — the `console` output is the demo.
///         Invocation: `forge script script/DemoFlow.s.sol -vv` (with `.env` present).
contract DemoFlow is Script, StdCheats {
    /// @notice Pinned to match `test/MendGroup.fork.t.sol`.
    uint256 internal constant FORK_BLOCK = 42_329_000;

    /// @notice 1,000 USDC per member.
    uint256 internal constant FUND_AMOUNT = 1_000_000_000;

    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        vm.createSelectFork(vm.envString("OP_SEPOLIA_RPC_URL"), FORK_BLOCK);

        address alice = makeAddr("alice");
        address bob = makeAddr("bob");
        vm.label(usdc, "USDC");

        deal(usdc, alice, FUND_AMOUNT, true);
        deal(usdc, bob, FUND_AMOUNT, true);

        console.log("=== Mend demo: alice & bob's shared expenses ===");
        console.log("");

        MendFactory factory = new MendFactory(usdc);
        console.log("MendFactory deployed at:", address(factory));

        vm.prank(alice);
        address groupAddr = factory.createGroup(bob);
        MendGroup group = MendGroup(groupAddr);
        console.log("MendGroup   deployed at:", groupAddr);
        console.log("");

        console.log(string.concat("alice starts with ", _fmtUsdc(IERC20(usdc).balanceOf(alice)), " USDC"));
        console.log(string.concat("bob   starts with ", _fmtUsdc(IERC20(usdc).balanceOf(bob)), " USDC"));
        console.log(string.concat("Initial group balance: ", _fmtBalance(group.balance())));
        console.log("");

        vm.prank(alice);
        group.addExpense(alice, 120_000_000, "dinner");
        console.log("[#0] alice paid 120 USDC for 'dinner'");
        console.log(string.concat("     -> bob now owes alice. balance = ", _fmtBalance(group.balance())));
        console.log("");

        vm.prank(bob);
        uint256 groceriesId = group.addExpense(bob, 50_000_000, "groceries");
        console.log("[#1] bob paid 50 USDC for 'groceries'");
        console.log(string.concat("     -> offsets partially. balance = ", _fmtBalance(group.balance())));
        console.log("");

        vm.prank(alice);
        uint256 concertId = group.addExpense(alice, 80_000_000, "concert tickets");
        console.log("[#2] alice paid 80 USDC for 'concert tickets'");
        console.log(string.concat("     -> bob owes more. balance = ", _fmtBalance(group.balance())));
        console.log("");

        vm.prank(bob);
        group.editExpense(groceriesId, bob, 70_000_000, "groceries (corrected)");
        console.log("[edit #1] bob corrects groceries: 50 -> 70 USDC");
        console.log(string.concat("          -> balance rebalances to ", _fmtBalance(group.balance())));
        console.log("");

        vm.prank(alice);
        group.deleteExpense(concertId);
        console.log("[delete #2] concert cancelled, alice removes the expense");
        console.log(string.concat("            -> balance rewinds to ", _fmtBalance(group.balance())));
        console.log("");

        _narrateSettlement(group, alice, bob, usdc, groupAddr);
    }

    function _narrateSettlement(MendGroup group, address alice, address bob, address usdc, address groupAddr) internal {
        int256 b = group.balance();
        address debtor;
        address creditor;
        if (b > 0) {
            debtor = bob;
            creditor = alice;
        } else {
            debtor = alice;
            creditor = bob;
        }
        uint256 owed = _abs(b);
        string memory debtorName = debtor == alice ? "alice" : "bob";
        string memory creditorName = creditor == alice ? "alice" : "bob";

        console.log("=== Settlement ===");
        console.log(string.concat(debtorName, " owes ", creditorName, " ", _fmtUsdc(owed), " USDC"));

        uint256 debtorBefore = IERC20(usdc).balanceOf(debtor);
        uint256 creditorBefore = IERC20(usdc).balanceOf(creditor);

        vm.startPrank(debtor);
        IERC20(usdc).approve(groupAddr, owed);
        group.settle();
        vm.stopPrank();

        console.log("");
        console.log("=== After settle() ===");
        console.log(string.concat("group.balance(): ", _fmtBalance(group.balance())));
        console.log(_fmtDeltaLine(usdc, debtor, debtorName, debtorBefore));
        console.log(_fmtDeltaLine(usdc, creditor, creditorName, creditorBefore));
        console.log(
            string.concat("MendGroup USDC balance: ", _fmtUsdc(IERC20(usdc).balanceOf(groupAddr)), " (non-custodial)")
        );
    }

    /// @notice Render `"<name> USDC: <before> -> <current>"`.
    function _fmtDeltaLine(address usdc, address who, string memory name, uint256 before)
        internal
        view
        returns (string memory)
    {
        return string.concat(name, " USDC: ", _fmtUsdc(before), " -> ", _fmtUsdc(IERC20(usdc).balanceOf(who)));
    }

    /// @notice Format a USDC base-unit amount (6 decimals) as a readable decimal
    ///         string with trailing zeros trimmed. Examples:
    ///         `25_000_000` -> `"25"`, `25_500_000` -> `"25.5"`,
    ///         `25_123_456` -> `"25.123456"`, `0` -> `"0"`.
    function _fmtUsdc(uint256 amount) internal pure returns (string memory) {
        uint256 whole = amount / 1_000_000;
        uint256 frac = amount % 1_000_000;
        if (frac == 0) return vm.toString(whole);

        bytes memory digits = new bytes(6);
        for (uint256 i = 0; i < 6; i++) {
            digits[5 - i] = bytes1(uint8(48 + (frac % 10)));
            frac /= 10;
        }
        uint256 len = 6;
        while (len > 0 && digits[len - 1] == "0") len--;
        bytes memory trimmed = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            trimmed[i] = digits[i];
        }

        return string.concat(vm.toString(whole), ".", string(trimmed));
    }

    /// @notice Format a signed balance as `"<abs> USDC"`, prefixing `-` for
    ///         negative values. Interpretive context (who owes whom) is added by
    ///         the caller; this helper only renders the magnitude.
    function _fmtBalance(int256 balance) internal pure returns (string memory) {
        if (balance < 0) return string.concat("-", _fmtUsdc(_abs(balance)), " USDC");
        return string.concat(_fmtUsdc(_abs(balance)), " USDC");
    }

    function _abs(int256 x) internal pure returns (uint256) {
        // Safe: `group.balance()` magnitude is bounded by expense arithmetic, cannot approach int256.min.
        if (x >= 0) {
            // forge-lint: disable-next-line(unsafe-typecast)
            return uint256(x);
        }
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(-x);
    }
}
