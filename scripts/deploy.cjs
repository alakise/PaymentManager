const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Set default values
  let paymentAddress = deployer.address;
  let acceptedCryptocurrencies = [];

  // Detect network and set values accordingly
  if (network.name === "mainnet") {
    console.log("Deploying to Ethereum Mainnet");
    acceptedCryptocurrencies = ["0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2"]; // WETH on mainnet
  } else if (network.name === "sepolia") {
    console.log("Deploying to Sepolia testnet");
    acceptedCryptocurrencies = ["0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"]; // WETH on Sepolia
  } else if (network.name === "holesky") {
    console.log("Deploying to Holesky testnet");
    acceptedCryptocurrencies = ["0x94373a4919B3240D86eA41593D5eBa789FEF3848"]; // WETH on Holesky
  } else {
    console.error("Unsupported network:", network.name);
    process.exit(1);
  }

  const PaymentManager = await ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(paymentAddress, acceptedCryptocurrencies, deployer.address);
  await paymentManager.deployed();

  console.log("PaymentManager deployed to:", paymentManager.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
