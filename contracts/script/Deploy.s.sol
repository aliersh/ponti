// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Script, console} from "forge-std/Script.sol";

import {MendFactory} from "../src/MendFactory.sol";

contract Deploy is Script {
    function run() external {
        address usdc;
        if (block.chainid == 84532) {
            // Circle native USDC on Base Sepolia (https://developers.circle.com/stablecoins/usdc-on-test-networks)
            usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        } else {
            usdc = vm.envAddress("USDC_ADDRESS");
        }

        vm.startBroadcast();
        MendFactory factory = new MendFactory(usdc);
        vm.stopBroadcast();

        console.log("Chain ID:       ", block.chainid);
        console.log("MendFactory at: ", address(factory));
        console.log("USDC address:   ", usdc);
    }
}
