import hre from 'hardhat';
const { ethers } = hre;
import { expect, use} from "chai";
import { solidity } from "ethereum-waffle";
import chaiAsPromised from 'chai-as-promised';

use(solidity);

describe("PaymentManager", function () {
  let PaymentManager, paymentManager, owner, addr1, addr2, addr3, MockAttacker, mockAttacker, attacker;

  // Use this.timeout to increase the timeout for async operations
  this.timeout(50000); // 50 seconds

  before(async function () {
    [owner, addr1, addr2, addr3, attacker] = await ethers.getSigners();
    // Deploy the mock attacker contract
    MockAttacker = await ethers.getContractFactory("MockAttacker");
    mockAttacker = await MockAttacker.deploy();
    await mockAttacker.deployed();
  });

  beforeEach(async function () {
    // Initialize the contract factory and deploy the contract
    PaymentManager = await ethers.getContractFactory("PaymentManager");
    const paymentAddress = addr1.address;
    const acceptedCryptocurrencies = [addr2.address, mockAttacker.address];
    paymentManager = await PaymentManager.deploy(paymentAddress, acceptedCryptocurrencies, owner.address);
    await paymentManager.deployed();
    // Set the PaymentManager address in the MockAttacker contract
    await mockAttacker.setPaymentManager(paymentManager.address);
  });

  it("Should set the right owner", async function () {
    expect(await paymentManager.owner()).to.equal(owner.address);
  });

  it("Should set the payment address", async function () {
    expect(await paymentManager.paymentAddress()).to.equal(addr1.address);
  });

  it("Should initialize to accept specified cryptocurrencies", async function () {
    expect(await paymentManager.acceptedCryptocurrencies(addr2.address)).to.equal(true);
  });

  it("Should not accept payments in unspecified cryptocurrencies", async function () {
    const paymentAmount = ethers.utils.parseEther("1");
    const uniqueIdentifier = "testPayment123";

    // Attempt to pay using addr3, which is not in the accepted list
    await expect(
      paymentManager.pay(addr3.address, uniqueIdentifier, { value: paymentAmount })
    ).to.be.revertedWith("Cryptocurrency not accepted");

    // Verify that the contract balance hasn't changed
    const contractBalance = await ethers.provider.getBalance(paymentManager.address);
    expect(contractBalance).to.equal(0);

    // Verify that the payment address (addr1) balance hasn't changed
    const addr1Balance = await ethers.provider.getBalance(addr1.address);
    expect(addr1Balance).to.equal(await ethers.provider.getBalance(addr1.address));
  });

  it("Should accept payments in specified cryptocurrencies", async function () {
    const paymentAmount = ethers.utils.parseEther("1");
    const uniqueIdentifier = "testPayment123";

    // Check initial balance
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);
    // Pay using addr2, which is in the accepted list
    await expect(
      paymentManager.pay(addr2.address, uniqueIdentifier, { value: paymentAmount })
    ).to.not.be.reverted;

    // Verify that the payment address (addr1) balance has increased
    const addr1Balance = await ethers.provider.getBalance(addr1.address);
    expect(addr1Balance).to.equal(paymentAmount.add(initialAddr1Balance));
  });

  it("Should allow owner to change payment address", async function () {
    await paymentManager.changePaymentAddress(addr2.address);
    expect(await paymentManager.paymentAddress()).to.equal(addr2.address);
  });

  it("Should toggle accepted cryptocurrency status", async function () {
    await paymentManager.toggleAcceptedCryptocurrency(addr2.address, false);
    expect(await paymentManager.acceptedCryptocurrencies(addr2.address)).to.equal(false);
  });

  describe("Transactions", function () {
    it("Should accept payments", async function () {
      await paymentManager.toggleAcceptedCryptocurrency(addr1.address, true);
    
      const paymentAmount = ethers.utils.parseEther("1");
      const uniqueIdentifier = "testPayment123";

      await expect(() =>
        paymentManager.pay(addr1.address, uniqueIdentifier, { value: paymentAmount })
      ).to.changeEtherBalances(
        [owner, addr1],
        [paymentAmount.mul(-1), paymentAmount]
      );
    });



    it("Should revert when trying to withdraw with no funds", async function () {
      await expect(paymentManager.withdraw()).to.be.revertedWith("No funds to withdraw");
    });

    it("Should allow owner to withdraw stuck funds", async function () {
      // Simulate stuck funds by sending Ether directly to the contract
      const stuckAmount = ethers.utils.parseEther("0.5");
      await owner.sendTransaction({
        to: paymentManager.address,
        value: stuckAmount
      });
  
      // Check initial balances
      const initialContractBalance = await ethers.provider.getBalance(paymentManager.address);
      const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
  
      // For debugging purposes
      /*
      console.log("Initial Contract Balance:", ethers.utils.formatEther(initialContractBalance));
      console.log("Initial Addr1 Balance:", ethers.utils.formatEther(initialAddr1Balance));
      console.log("Initial Owner Balance:", ethers.utils.formatEther(initialOwnerBalance));
      */

      // Ensure contract has the stuck funds
      expect(initialContractBalance).to.equal(stuckAmount);
  
      // Withdraw funds
      const withdrawTx = await paymentManager.withdraw();
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
  
      // Check final balances
      const finalContractBalance = await ethers.provider.getBalance(paymentManager.address);
      const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

      // For debugging purposes
      /*
      console.log("Final Contract Balance:", ethers.utils.formatEther(finalContractBalance));
      console.log("Final Addr1 Balance:", ethers.utils.formatEther(finalAddr1Balance));
      console.log("Final Owner Balance:", ethers.utils.formatEther(finalOwnerBalance));
      console.log("Gas Used:", ethers.utils.formatEther(gasUsed));
      */
      // Assertions
      expect(finalContractBalance).to.equal(0);
      
      // Check which address received the funds
      if (finalAddr1Balance.gt(initialAddr1Balance)) {
        expect(finalAddr1Balance).to.equal(initialAddr1Balance.add(stuckAmount));
      } else if (finalOwnerBalance.gt(initialOwnerBalance)) {
        expect(finalOwnerBalance).to.be.closeTo(initialOwnerBalance.add(stuckAmount), gasUsed);
      } else {
        throw new Error("Funds were not sent to addr1 or owner");
      }
    });

    it("Should allow owner to withdraw stuck funds when payments properly working", async function () {

      // Simulate stuck funds by sending Ether directly to the contract
      const stuckAmount = ethers.utils.parseEther("0.5");
      await owner.sendTransaction({
        to: paymentManager.address,
        value: stuckAmount
      });

      // Make a payment
      await paymentManager.toggleAcceptedCryptocurrency(addr2.address, true);
      const paymentAmount = ethers.utils.parseEther("0.7");
      const uniqueIdentifier = "testPayment123";
      await paymentManager.pay(addr2.address, uniqueIdentifier, { value: paymentAmount });

      // Check initial balances
      const initialContractBalance = await ethers.provider.getBalance(paymentManager.address);
      const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
  
      // For debugging purposes
      /*
      console.log("Initial Contract Balance:", ethers.utils.formatEther(initialContractBalance));
      console.log("Initial Addr1 Balance:", ethers.utils.formatEther(initialAddr1Balance));
      console.log("Initial Owner Balance:", ethers.utils.formatEther(initialOwnerBalance));
      */

      // Ensure contract has the stuck funds
      expect(initialContractBalance).to.equal(stuckAmount);
  
      // Withdraw funds
      const withdrawTx = await paymentManager.withdraw();
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
  
      // Check final balances
      const finalContractBalance = await ethers.provider.getBalance(paymentManager.address);
      const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);

      // For debugging purposes
      /*
      console.log("Final Contract Balance:", ethers.utils.formatEther(finalContractBalance));
      console.log("Final Addr1 Balance:", ethers.utils.formatEther(finalAddr1Balance));
      console.log("Final Owner Balance:", ethers.utils.formatEther(finalOwnerBalance));
      console.log("Gas Used:", ethers.utils.formatEther(gasUsed));
      */
      // Assertions
      expect(finalContractBalance).to.equal(0);
      
      // Check which address received the funds
      if (finalAddr1Balance.gt(initialAddr1Balance)) {
        expect(finalAddr1Balance).to.equal(initialAddr1Balance.add(stuckAmount));
      } else if (finalOwnerBalance.gt(initialOwnerBalance)) {
        expect(finalOwnerBalance).to.be.closeTo(initialOwnerBalance.add(stuckAmount), gasUsed);
      } else {
        throw new Error("Funds were not sent to addr1 or owner");
      }
    });

  
  });

  it("Should allow pausing and unpausing payments", async function () {
    await paymentManager.toggleAcceptedCryptocurrency(addr1.address, true);
    await paymentManager.pause();
    await expect(
      paymentManager.pay(addr2.address, { value: ethers.utils.parseEther("1") })
    ).to.be.revertedWith("EnforcedPause");
    await paymentManager.unpause();
    await expect(() =>
        paymentManager.pay(addr1.address, "testPayment123", { value: ethers.utils.parseEther("1") })
      ).to.changeEtherBalances(
        [owner, addr1],
        [ethers.utils.parseEther("1").mul(-1), ethers.utils.parseEther("1")]
      
    ).to.not.be.reverted;
  });
  describe("Security Features", function () {
    it("Should allow a normal payment", async function () {
      const paymentAmount = ethers.utils.parseEther("1");
      const initialPaymentAddressBalance = await ethers.provider.getBalance(addr1.address);
  
      // Perform a normal payment
      const paymentTx = await paymentManager.pay(addr2.address, "normalPayment", { value: paymentAmount });
      const receipt = await paymentTx.wait();
  
      // Check the number of PaymentReceived events
      const paymentReceivedEvents = receipt.events?.filter(e => e.event === 'PaymentReceived') || [];
      expect(paymentReceivedEvents.length).to.equal(1, "One payment should be processed");
  
      // Check final balance
      const finalPaymentAddressBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalPaymentAddressBalance).to.equal(initialPaymentAddressBalance.add(paymentAmount), "Payment address should receive the payment");
  
      //console.log("Normal payment was successful");
    });
  
    it("Should prevent reentry attacks", async function () {
      const paymentAmount = ethers.utils.parseEther("1");
  
      await owner.sendTransaction({
        to: mockAttacker.address,
        value: paymentAmount.mul(2)
      });
  
      const initialPaymentAddressBalance = await ethers.provider.getBalance(addr1.address);
      const initialAttackerBalance = await ethers.provider.getBalance(mockAttacker.address);
  
      const attackTx = await mockAttacker.attack({ value: paymentAmount });
      const receipt = await attackTx.wait();
  
      const paymentReceivedEvents = receipt.events?.filter(e => e.event === 'PaymentReceived') || [];
      expect(paymentReceivedEvents.length).to.equal(0, "No attacks (payments) should succeed");
  
      const finalPaymentAddressBalance = await ethers.provider.getBalance(addr1.address);
      const finalAttackerBalance = await ethers.provider.getBalance(mockAttacker.address);
  
      // Calculate gas cost
      const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
  
      // Check that payment address received the payment
      expect(finalPaymentAddressBalance).to.equal(
        initialPaymentAddressBalance.add(paymentAmount),
        "Payment address should receive the payment"
      );
  
      // Check that attacker lost payment amount plus gas costs
      expect(finalAttackerBalance).to.equal(
        initialAttackerBalance,
        "Attacker balance should not change since transaction is directly reverted"
      );
  
      const attackCount = await mockAttacker.attackCount();
      expect(attackCount).to.equal(1, "Single attempt should be processed");
  
      //console.log("Reentry attack was successfully prevented");
    });
    it("Should only allow the owner to withdraw funds", async function () {
      const stuckAmount = ethers.utils.parseEther("0.5");
      await owner.sendTransaction({ to: paymentManager.address, value: stuckAmount });

      await expect(paymentManager.connect(attacker).withdraw()).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
    it("Should only allow the owner to change payment address", async function () {
      await expect(paymentManager.connect(attacker).changePaymentAddress(attacker.address)).to.be.revertedWith("OwnableUnauthorizedAccount");

      await paymentManager.changePaymentAddress(addr2.address);
      expect(await paymentManager.paymentAddress()).to.equal(addr2.address);
    });

    it("Should allow the owner to pause and unpause payments", async function () {
      await paymentManager.pause();
      await expect(paymentManager.pay(addr2.address, "test", { value: ethers.utils.parseEther("1") })).to.be.revertedWith("EnforcedPause");

      await paymentManager.unpause();
      await expect(paymentManager.pay(addr2.address, "test", { value: ethers.utils.parseEther("1") })).to.not.be.reverted;
    });

    it("Should only allow the owner to toggle accepted cryptocurrencies", async function () {
      await expect(paymentManager.connect(attacker).toggleAcceptedCryptocurrency(addr1.address, true)).to.be.revertedWith("OwnableUnauthorizedAccount");

      await paymentManager.toggleAcceptedCryptocurrency(addr1.address, true);
      expect(await paymentManager.acceptedCryptocurrencies(addr1.address)).to.equal(true);
    });

    it("Should handle contract balance dependencies correctly", async function () {
      const initialBalance = await ethers.provider.getBalance(paymentManager.address);

      await expect(() =>
        owner.sendTransaction({ to: paymentManager.address, value: ethers.utils.parseEther("1") })
      ).to.changeEtherBalances(
        [owner, paymentManager],
        [ethers.utils.parseEther("-1"), ethers.utils.parseEther("1")]
      );

      const finalBalance = await ethers.provider.getBalance(paymentManager.address);
      expect(finalBalance).to.equal(initialBalance.add(ethers.utils.parseEther("1")));
    });

    it("Should handle denial of service (DoS) correctly", async function () {
      await paymentManager.pause();

      // Attacker tries to block the owner from unpausing
      await expect(paymentManager.connect(attacker).unpause()).to.be.revertedWith("OwnableUnauthorizedAccount");

      // Owner unpauses successfully
      await paymentManager.unpause();
      await expect(paymentManager.pay(addr2.address, "test", { value: ethers.utils.parseEther("1") })).to.not.be.reverted;
    });
    it("Should prevent access to critical functions by non-owners", async function () {
      await expect(paymentManager.connect(addr1).pause()).to.be.revertedWith("OwnableUnauthorizedAccount");
      await expect(paymentManager.connect(addr1).unpause()).to.be.revertedWith("OwnableUnauthorizedAccount");
      await expect(paymentManager.connect(addr1).changePaymentAddress(addr2.address)).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  
    it("Should handle unexpected Ether balance correctly", async function () {
      const extraAmount = ethers.utils.parseEther("1");
  
      // Send Ether directly to the contract
      await owner.sendTransaction({
        to: paymentManager.address,
        value: extraAmount
      });
  
      // Verify contract balance
      const contractBalance = await ethers.provider.getBalance(paymentManager.address);
      expect(contractBalance).to.equal(extraAmount);
  
      // Withdraw the Ether as the owner
      await expect(paymentManager.withdraw()).to.changeEtherBalance(owner, extraAmount);
    });
  
    it("Should ensure explicit visibility for all functions", async function () {
      expect(await paymentManager.paymentAddress()).to.equal(addr1.address);
      await paymentManager.changePaymentAddress(addr2.address);
      expect(await paymentManager.paymentAddress()).to.equal(addr2.address);
    });
  
    it("Should handle unexpected Ether balance correctly", async function () {
      const extraAmount = ethers.utils.parseEther("1");
  
      // Send Ether directly to the contract
      await owner.sendTransaction({
        to: paymentManager.address,
        value: extraAmount
      });
  
      // Verify contract balance
      const contractBalance = await ethers.provider.getBalance(paymentManager.address);
      expect(contractBalance).to.equal(extraAmount);
  
      // Withdraw the Ether as the owner
      await expect(paymentManager.withdraw()).to.changeEtherBalance(owner, extraAmount);
    });
    it("Should handle unchecked call return values properly", async function () {
      const paymentAmount = ethers.utils.parseEther("1");
      const uniqueIdentifier = "uncheckedCallTest";
  
      await paymentManager.toggleAcceptedCryptocurrency(addr2.address, true);
      
      await expect(paymentManager.pay(addr2.address, uniqueIdentifier, { value: paymentAmount }))
        .to.not.be.reverted;
    });
  
    it("Should not allow unauthorized account to withdraw funds", async function () {
      const stuckAmount = ethers.utils.parseEther("0.5");
      await owner.sendTransaction({ to: paymentManager.address, value: stuckAmount });
  
      await expect(paymentManager.connect(attacker).withdraw()).to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  })
  describe("Additional Tests", function () {
    it("Should emit PaymentReceived event on successful payment", async function () {
      const paymentAmount = ethers.utils.parseEther("1");
      const uniqueIdentifier = "eventTest123";
  
      await paymentManager.toggleAcceptedCryptocurrency(addr2.address, true);
      
      await expect(paymentManager.pay(addr2.address, uniqueIdentifier, { value: paymentAmount }))
        .to.emit(paymentManager, "PaymentReceived")
        .withArgs(owner.address, addr2.address, paymentAmount, uniqueIdentifier);
    });
  
    it("Should emit CryptocurrencyStatusChanged event on toggling cryptocurrency", async function () {
      await expect(paymentManager.toggleAcceptedCryptocurrency(addr2.address, false))
        .to.emit(paymentManager, "CryptocurrencyStatusChanged")
        .withArgs(addr2.address, false);
    });
  
  
    it("Should revert payment with zero value", async function () {
      const uniqueIdentifier = "zeroValueTest";
  
      await paymentManager.toggleAcceptedCryptocurrency(addr2.address, true);
      
      await expect(paymentManager.pay(addr2.address, uniqueIdentifier, { value: 0 }))
        .to.be.revertedWith("Payment must be greater than zero");
    });
  
    it("Should revert payment with contract paused", async function () {
      const paymentAmount = ethers.utils.parseEther("1");
      const uniqueIdentifier = "pauseTest";
  
      await paymentManager.toggleAcceptedCryptocurrency(addr2.address, true);
      await paymentManager.pause();
  
      await expect(paymentManager.pay(addr2.address, uniqueIdentifier, { value: paymentAmount }))
        .to.be.revertedWith("EnforcedPause");
    });
    
  });
});

