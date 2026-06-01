// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {MendGroup} from "./MendGroup.sol";

/// @title MendFactory
/// @notice Deploys MendGroup contracts for two-member expense-sharing relationships.
contract MendFactory {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Thrown when the USDC address supplied to the constructor is zero.
    error InvalidUsdcAddress();

    /// @notice Thrown when a caller attempts to create a group with themselves.
    error CannotGroupWithSelf();

    /// @notice Thrown when the supplied other member address is zero.
    error InvalidMemberAddress();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new MendGroup is deployed.
    /// @param group  Address of the newly deployed MendGroup.
    /// @param memberA Address of the caller (first member).
    /// @param memberB Address of the other member (second member).
    event GroupCreated(address indexed group, address indexed memberA, address indexed memberB);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    // forge-lint: disable-next-line(screaming-snake-case-immutable)
    address public immutable usdc;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @notice Deploys the factory.
    /// @param _usdc USDC token address. Must be non-zero.
    constructor(address _usdc) {
        if (_usdc == address(0)) revert InvalidUsdcAddress();
        usdc = _usdc;
    }

    // -------------------------------------------------------------------------
    // External functions
    // -------------------------------------------------------------------------

    /// @notice Deploys a new MendGroup between msg.sender and otherMember.
    ///         Multiple groups per pair are allowed; no uniqueness check.
    /// @param otherMember The second member of the group. Must be non-zero and different from msg.sender.
    /// @return group Address of the deployed MendGroup.
    function createGroup(address otherMember) external returns (address group) {
        if (msg.sender == otherMember) revert CannotGroupWithSelf();
        if (otherMember == address(0)) revert InvalidMemberAddress();
        group = address(new MendGroup(msg.sender, otherMember, usdc));
        emit GroupCreated(group, msg.sender, otherMember);
    }
}
