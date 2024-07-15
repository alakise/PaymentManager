// Mock Attacker Contract
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPaymentManager {
    function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable;
}

contract MockAttacker {
    IPaymentManager public paymentManager;
    uint256 public attackCount;

    function setPaymentManager(address _paymentManager) external {
        paymentManager = IPaymentManager(_paymentManager);
    }

    function attack() external payable {
        paymentManager.pay{value: 1 ether}(address(this), "attack");
    }

    receive() external payable {
        if (attackCount < 5) {
            attackCount++;
            paymentManager.pay{value: 1 ether}(address(this), "attack");
        }
    }
}
