// SPDX-License-Identifier: MIT License
// @author github.com/alakise
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PaymentManager
 * @dev A contract for managing payments with security features and ownership control.
 */
contract PaymentManager is ReentrancyGuard, Ownable, Pausable {
    address public paymentAddress;
    mapping(address => bool) public acceptedCryptocurrencies;

    event PaymentReceived(address indexed donor, address indexed cryptocurrency, uint256 amount, string uniqueIdentifier);
    event CryptocurrencyStatusChanged(address indexed cryptocurrency, bool status);

    /**
     * @dev Constructor to initialize the contract.
     * @param _paymentAddress Address to receive payments.
     * @param _acceptedCryptocurrencies List of accepted cryptocurrency addresses.
     * @param _owner Address of the contract owner.
     */
    constructor(address _paymentAddress, address[] memory _acceptedCryptocurrencies, address _owner) ReentrancyGuard() Ownable(_owner) Pausable() {
        require(_paymentAddress != address(0), "Payment address cannot be zero address");
        paymentAddress = _paymentAddress;
        for (uint i = 0; i < _acceptedCryptocurrencies.length; i++) {
            acceptedCryptocurrencies[_acceptedCryptocurrencies[i]] = true;
            emit CryptocurrencyStatusChanged(_acceptedCryptocurrencies[i], true);
        }
    }

    /**
     * @dev Change the payment address.
     * @param _newAddress New payment address.
     */
    function changePaymentAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "New address cannot be zero address");
        paymentAddress = _newAddress;
    }

    /**
     * @dev Toggle the acceptance status of a cryptocurrency.
     * @param _cryptocurrency Address of the cryptocurrency.
     * @param _status Acceptance status.
     */
    function toggleAcceptedCryptocurrency(address _cryptocurrency, bool _status) external onlyOwner {
        acceptedCryptocurrencies[_cryptocurrency] = _status;
        emit CryptocurrencyStatusChanged(_cryptocurrency, _status);
    }

    /**
     * @dev Pay to the contract.
     * @param _cryptocurrency Address of the cryptocurrency used for payment.
     * @param uniqueIdentifier Unique identifier for the transaction.
     */
    function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable whenNotPaused nonReentrant {
        require(acceptedCryptocurrencies[_cryptocurrency], "Cryptocurrency not accepted");
        require(msg.value > 0, "Payment must be greater than zero");

        emit PaymentReceived(msg.sender, _cryptocurrency, msg.value, uniqueIdentifier);

        (bool success, ) = paymentAddress.call{value: msg.value}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Pause the payment function.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the payment function.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw stuck funds.
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }

    // Fallback function to receive ETH
    receive() external payable {}
}