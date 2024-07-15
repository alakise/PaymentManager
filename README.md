# Payment Manager

A Solidity smart contract for managing payments with security features and ownership control, developed using Hardhat.

## Contract Overview

The `PaymentManager` smart contract is designed to manage payments in various cryptocurrencies. It includes features to:
- Accept payments in specified cryptocurrencies.
- Emit events for each payment for server-side verification.
- Allow the owner to change the payment address and accepted cryptocurrencies.
- Enable pausing and unpausing of the payment function.
- Withdraw stuck funds by the owner.

## Deployed Contract

The `PaymentManager` contract has been already deployed on the Holesky network to the following address:

```plaintext
0xaDD20dfD083bDD5D08FE83a05553ad22687549F4
```

## Prerequisites
Main preqrequisities are as listed. For all dependencies and version information please refer to package.json
- Node.js and npm: [Download and install Node.js](https://nodejs.org/)
- Infura account: [Sign up for Infura](https://infura.io/) and create a new project to get your Infura project ID.
- Etherscan account: [Sign up for Etherscan](https://etherscan.io/) and obtain an API key.
- Solidity ^0.8.20
- OpenZeppelin Contracts

## Project Setup

1. Clone the repository:

   ```bash
   git clone <repository_url>
   cd payment-manager
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Infura project ID, mnemonic, and Etherscan API key:

   ```plaintext
   MNEMONIC="your twelve word mnemonic"
   INFURA_PROJECT_ID="your infura project id"
   ETHERSCAN_API_KEY="your etherscan api key"
   ```

## Project Structure

- `contracts/`: Contains the Solidity smart contract.
- `scripts/`: Contains the deployment script.
- `test/`: Contains the test scripts.
- `hardhat.config.js`: Hardhat configuration file.
- `package.json`: Project dependencies and scripts.

## Scripts

### Compile Contracts

To compile the Solidity contracts using Hardhat:

```bash
npm run compile
```

### Run Tests

To run the tests using Hardhat:

```bash
npm run test
```

### Deploy Contracts

To deploy the contract to the local Hardhat network:

```bash
npm run deploy
```

To deploy the contract to the Sepolia test network:

```bash
npm run deploy:sepolia
```

To deploy the contract to the Holesky test network:

```bash
npm run deploy:holesky
```

To deploy the contract to the Ethereum mainnet:

```bash
npm run deploy:mainnet
```

### Verify Contracts

To verify the contract on Etherscan for the Sepolia test network:

```bash
npm run verify:ropsten <deployed_contract_address> <constructor_arguments>
```

To verify the contract on Etherscan for the Holesky test network:

```bash
npm run verify:rinkeby <deployed_contract_address> <constructor_arguments>
```

To verify the contract on Etherscan for the Ethereum mainnet:

```bash
npm run verify:mainnet <deployed_contract_address> <constructor_arguments>
```

## Deployment Script

Please refer to (`scripts/deploy.js`):

## Test Script

Please refer to (`test/PaymentManager.test.mjs`):

## Contract Details

### Imports

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
```

### Contract Definition

```solidity
contract PaymentManager is ReentrancyGuard, Ownable, Pausable {
    // Contract code
}
```

### State Variables

- `address public paymentAddress`: Address to receive payments.
- `mapping(address => bool) public acceptedCryptocurrencies`: Mapping of accepted cryptocurrencies.

### Events

- `event PaymentReceived(address indexed donor, address indexed cryptocurrency, uint256 amount, string uniqueIdentifier)`: Emitted when a payment is received.
- `event CryptocurrencyStatusChanged(address indexed cryptocurrency, bool status)`: Emitted when the status of a cryptocurrency is changed.

### Constructor

Initializes the contract with the payment address and accepted cryptocurrencies.

```solidity
constructor(address _paymentAddress, address[] memory _acceptedCryptocurrencies) {
    require(_paymentAddress != address(0), "Payment address cannot be zero address");
    paymentAddress = _paymentAddress;
    for (uint i = 0; i < _acceptedCryptocurrencies.length; i++) {
        acceptedCryptocurrencies[_acceptedCryptocurrencies[i]] = true;
        emit CryptocurrencyStatusChanged(_acceptedCryptocurrencies[i], true);
    }
}
```

### Functions

#### `changePaymentAddress`

Changes the payment address. Only the owner can call this function.

```solidity
function changePaymentAddress(address _newAddress) external onlyOwner {
    require(_newAddress != address(0), "New address cannot be zero address");
    paymentAddress = _newAddress;
}
```

#### `toggleAcceptedCryptocurrency`

Toggles the acceptance status of a cryptocurrency. Only the owner can call this function.

```solidity
function toggleAcceptedCryptocurrency(address _cryptocurrency, bool _status) external onlyOwner {
    acceptedCryptocurrencies[_cryptocurrency] = _status;
    emit CryptocurrencyStatusChanged(_cryptocurrency, _status);
}
```

#### `pay`

Allows users to pay using specified cryptocurrencies. Emits a `PaymentReceived` event.

```solidity
function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable whenNotPaused nonReentrant {
    require(acceptedCryptocurrencies[_cryptocurrency], "Cryptocurrency not accepted");
    require(msg.value > 0, "Payment must be greater than zero");

    emit PaymentReceived(msg.sender, _cryptocurrency, msg.value, uniqueIdentifier);

    (bool success, ) = paymentAddress.call{value: msg.value}("");
    require(success, "Transfer failed");
}
```

#### `pause`

Pauses the payment function. Only the owner can call this function.

```solidity
function pause() external onlyOwner {
    _pause();
}
```

#### `unpause`

Unpauses the payment function. Only the owner can call this function.

```solidity
function unpause() external onlyOwner {
    _unpause();
}
```

#### `withdraw`

Allows the owner to withdraw stuck funds from the contract. Only the owner can call this function.

```solidity
function withdraw() external onlyOwner nonReentrant {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    (bool success, ) = owner().call{value: balance}("");
    require(success, "Withdraw failed");
}
```

#### Fallback Function

Receives ETH sent directly to the contract.

```solidity
receive() external payable {}
```

## Usage

### Deployment

Deploy the contract with the initial payment address and accepted cryptocurrencies.

```solidity
constructor(address _paymentAddress, address[] memory _acceptedCryptocurrencies)
```

### Changing Payment Address

Only the owner can change the payment address.

```solidity
function changePaymentAddress(address _newAddress) external onlyOwner
```

### Toggling Accepted Cryptocurrencies

Only the owner can toggle the acceptance status of a cryptocurrency.

```solidity
function toggleAcceptedCryptocurrency(address _cryptocurrency, bool _status) external onlyOwner
```

### Payment

Users can pay using the specified cryptocurrencies.

```solidity
function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable whenNotPaused nonReentrant
```

### Pausing and Unpausing

Only the owner can pause and unpause the payment function.

```solidity
function pause() external onlyOwner
function unpause() external onlyOwner
```

### Withdrawing Funds

Only the owner can withdraw stuck funds from the contract.

```solidity
function withdraw() external onlyOwner nonReentrant
```

## Event Listening

Listen for `PaymentReceived` events to verify transactions server-side.

## Security Features and Precautions

The `PaymentManager` smart contract incorporates several security features to ensure the safety and integrity of the payment process. Below is a detailed explanation of the security measures implemented:

### 1. Reentrancy Guard

The contract uses OpenZeppelin's `ReentrancyGuard` to protect against reentrancy attacks. Reentrancy attacks occur when an external contract makes a recursive call back into the target contract before the initial function execution is complete, potentially exploiting the contract's state.

**Implementation:**
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PaymentManager is ReentrancyGuard {
    // Functions using the nonReentrant modifier
    function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable whenNotPaused nonReentrant {
        // Function logic
    }

    function withdraw() external onlyOwner nonReentrant {
        // Function logic
    }
}
```

### 2. Ownership Control

The contract uses OpenZeppelin's `Ownable` to restrict access to sensitive functions to the contract owner. This ensures that only authorized personnel can perform critical operations such as changing the payment address or toggling accepted cryptocurrencies.

**Implementation:**
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentManager is Ownable {
    function changePaymentAddress(address _newAddress) external onlyOwner {
        // Function logic
    }

    function toggleAcceptedCryptocurrency(address _cryptocurrency, bool _status) external onlyOwner {
        // Function logic
    }
}
```

### 3. Pausable Contract

The contract uses OpenZeppelin's `Pausable` to provide the ability to pause and unpause the payment function. This feature is useful in emergency situations, allowing the owner to temporarily halt payments to address any issues or vulnerabilities.

**Implementation:**
```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract PaymentManager is Pausable {
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### 4. Checks-Effects-Interactions Pattern

The `pay` function follows the checks-effects-interactions pattern to prevent reentrancy attacks. By emitting the event before making an external call, the contract ensures that state changes are made before interacting with external addresses.

**Implementation:**
```solidity
function pay(address _cryptocurrency, string memory uniqueIdentifier) external payable whenNotPaused nonReentrant {
    require(acceptedCryptocurrencies[_cryptocurrency], "Cryptocurrency not accepted");
    require(msg.value > 0, "Payment must be greater than zero");

    emit PaymentReceived(msg.sender, _cryptocurrency, msg.value, uniqueIdentifier);

    (bool success, ) = paymentAddress.call{value: msg.value}("");
    require(success, "Transfer failed");
}
```

### 5. Withdrawal of Stuck Funds

The contract includes a `withdraw` function that allows the owner to recover any funds that might get stuck in the contract. This function ensures that the contract's balance can be safely transferred to the owner if needed.

**Implementation:**
```solidity
function withdraw() external onlyOwner nonReentrant {
    uint256 balance = address(this).balance;
    require(balance > 0, "No funds to withdraw");
    (bool success, ) = owner().call{value: balance}("");
    require(success, "Withdraw failed");
}
```

By implementing these security features, the `PaymentManager` contract ensures a high level of protection against common vulnerabilities and attacks, providing a secure platform for managing cryptocurrency payments.

## License

MIT License