import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("Verification Checklist Flows", function () {
  let admin: any, manufacturer: any, dealer: any, buyer: any, workshop: any, finance: any;
  let vehicleNFT: any, vehicleLifecycle: any, vehicleConsent: any, vehicleLien: any;
  let tokenId: number;
  let tokenIdEscrow: number;

  before(async function () {
    [admin, manufacturer, dealer, buyer, workshop, finance] = await ethers.getSigners();

    // Deploy VehicleNFT
    const VehicleNFT = await ethers.getContractFactory("VehicleNFT");
    vehicleNFT = await VehicleNFT.deploy();
    await vehicleNFT.waitForDeployment();

    // Grant Roles in NFT
    await vehicleNFT.grantRole(await vehicleNFT.MANUFACTURER_ROLE(), manufacturer.address);
    // Grant Registry / Lien Roles to admin just to simulate
    await vehicleNFT.grantRole(await vehicleNFT.REGISTRY_ROLE(), admin.address);
    await vehicleNFT.grantRole(await vehicleNFT.LIEN_ROLE(), admin.address);

    // Deploy Lifecycle
    const VehicleLifecycle = await ethers.getContractFactory("VehicleLifecycle");
    vehicleLifecycle = await VehicleLifecycle.deploy(await vehicleNFT.getAddress());
    await vehicleLifecycle.waitForDeployment();
    await vehicleLifecycle.grantRole(await vehicleLifecycle.DEALER_ROLE(), dealer.address);
    await vehicleLifecycle.grantRole(await vehicleLifecycle.WORKSHOP_ROLE(), workshop.address);

    // Deploy Consent
    const VehicleConsent = await ethers.getContractFactory("VehicleConsent");
    vehicleConsent = await VehicleConsent.deploy(await vehicleNFT.getAddress());
    await vehicleConsent.waitForDeployment();

    // Deploy Lien (Escrow)
    const VehicleLien = await ethers.getContractFactory("VehicleLien");
    vehicleLien = await VehicleLien.deploy(await vehicleNFT.getAddress());
    await vehicleLien.waitForDeployment();
    await vehicleLien.grantRole(await vehicleLien.FINANCE_ROLE(), finance.address);

    // Grant Lien role in NFT so Lien contract can lock transfers
    await vehicleNFT.grantRole(await vehicleNFT.LIEN_ROLE(), await vehicleLien.getAddress());
  });

  describe("1. Roles Submitting Transactions Separately", function () {
    it("Manufacturer should be able to mint NFT with their own wallet", async function () {
      const vinHash = ethers.id("VIN1234567890ROLE");
      const tx = await vehicleNFT.connect(manufacturer).mintVehicle(
        manufacturer.address,
        vinHash,
        Math.floor(Date.now() / 1000),
        ethers.id("MODEL_JSON"),
        ethers.id("SPEC_JSON")
      );
      const receipt = await tx.wait();
      expect(receipt).to.not.be.undefined;

      const event = receipt.logs.find((event: any) => event.fragment?.name === 'VehicleMinted');
      tokenId = Number(event.args[0]);

      expect(await vehicleNFT.ownerOf(tokenId)).to.equal(manufacturer.address);
    });
  });

  describe("2 & 3. Ownership Transfer (No longer stuck in Admin)", function () {
    it("Should successfully transfer NFT from manufacturer to buyer and update ownerOf", async function () {
      // Manufacturer approves buyer or directly transfers
      await vehicleNFT.connect(manufacturer).approve(buyer.address, tokenId);
      await vehicleNFT.connect(manufacturer).transferFrom(manufacturer.address, buyer.address, tokenId);

      // Verify owner is buyer, not admin
      const currentOwner = await vehicleNFT.ownerOf(tokenId);
      expect(currentOwner).to.equal(buyer.address);
      expect(currentOwner).to.not.equal(admin.address);
    });
  });

  describe("4. Consent Management (Read/Write Separation)", function () {
    it("Workshop WITHOUT Write Consent should fail to log maintenance", async function () {
      const ts = Math.floor(Date.now() / 1000);
      await expect(
        vehicleLifecycle.connect(workshop).logMaintenance(
          tokenId,
          ethers.id("REF"),
          10000,
          ethers.id("MAINTENANCE"),
          ethers.id("PARTS"),
          0,
          ts
        )
      ).to.be.revertedWith("No write consent");
    });

    it("Owner grants Write Consent to Workshop and allows logging maintenance", async function () {
      // 1. Owner gives consent 
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      await vehicleLifecycle.connect(buyer).grantWriteConsent(
        tokenId,
        workshop.address,
        1, // scopeMask
        expiresAt,
        true,
        1 // nonce
      );

      // 2. Workshop logs maintenance successfully
      const ts = Math.floor(Date.now() / 1000);
      const tx = await vehicleLifecycle.connect(workshop).logMaintenance(
        tokenId,
        ethers.id("REF_SUCCESS"),
        15000,
        ethers.id("MAINTENANCE_2"),
        ethers.id("PARTS_2"),
        0,
        ts
      );
      await tx.wait();
      expect(tx).to.not.be.undefined;
    });

    it("Owner can grant Read Consent via VehicleConsent contract (DB checks this)", async function () {
       // This checks read consent on-chain logic
       const expiresAt = Math.floor(Date.now() / 1000) + 3600;
       const granteeDid = ethers.id("DID_WORKSHOP");
       const tx = await vehicleConsent.connect(buyer).grantConsent(
         tokenId,
         granteeDid,
         1, // scope
         expiresAt,
         true,
         1 // nonce
       );
       const receipt = await tx.wait();
       const event = receipt.logs.find((e: any) => e.fragment?.name === 'ConsentGranted');
       const grantHash = event.args[event.args.length - 1]; // grantHash is the last arg

       // Verify
       const [valid, scope] = await vehicleConsent.verifyConsent.staticCall(tokenId, grantHash);
       expect(valid).to.be.true;
       expect(scope).to.equal(1n);

       // Using Read consent doesn't give write permission to VehicleLifecycle
       // because VehicleLifecycle strictly checks `writeConsents` mapping.
    });
  });

  describe("5. Escrow Flow Complete", function () {
    let escToken: number;

    it("Create, Fund, and Release Escrow successfully", async function () {
      // Setup second NFT for Escrow testing
      const vinHash = ethers.id("VIN_ESCROW_TEST");
      const mintTx = await vehicleNFT.connect(manufacturer).mintVehicle(
        manufacturer.address,
        vinHash,
        Math.floor(Date.now() / 1000),
        ethers.id("MODEL_JSON"),
        ethers.id("SPEC_JSON")
      );
      const receipt = await mintTx.wait();
      const event = receipt.logs.find((e: any) => e.fragment?.name === 'VehicleMinted');
      escToken = Number(event.args[0]);

      // Manufacturer transfers it to seller (dealer)
      await vehicleNFT.connect(manufacturer).approve(dealer.address, escToken);
      await vehicleNFT.connect(manufacturer).transferFrom(manufacturer.address, dealer.address, escToken);
      
      const escrowId = ethers.id("ESCROW_123");
      const depositAmount = ethers.parseEther("1.0");

      await vehicleLien.connect(dealer).createEscrow(
        escrowId,
        escToken,
        buyer.address,                 // Buyer
        1,                             // COND_PAYMENT_CONFIRMED
        ethers.ZeroAddress,            // Native Coin
        depositAmount
      );

      let escrowDesc = await vehicleLien.getEscrow(escrowId);
      expect(escrowDesc.state).to.equal(0n); // Created

      await vehicleLien.connect(buyer).fundEscrowNative(escrowId, { value: depositAmount });
      escrowDesc = await vehicleLien.getEscrow(escrowId);
      expect(escrowDesc.state).to.equal(1n); // Funded

      const sellerBalanceBefore = await ethers.provider.getBalance(dealer.address);
      await vehicleLien.connect(finance).fulfillCondition(escrowId, 1);
      
      escrowDesc = await vehicleLien.getEscrow(escrowId);
      expect(escrowDesc.state).to.equal(2n); // Released

      const sellerBalanceAfter = await ethers.provider.getBalance(dealer.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(depositAmount);
    });

    it("Create, Fund, and Cancel Escrow successfully", async function () {
      const escrowId = ethers.id("ESCROW_CANCEL_TEST");
      const depositAmount = ethers.parseEther("0.5");

      // 1. Create Escrow from Seller (Dealer)
      await vehicleLien.connect(dealer).createEscrow(
        escrowId,
        escToken,
        buyer.address,                 // Buyer
        1,                             // COND_PAYMENT_CONFIRMED
        ethers.ZeroAddress,            // Native Coin
        depositAmount
      );

      // 2. Fund Escrow from Buyer
      await vehicleLien.connect(buyer).fundEscrowNative(escrowId, { value: depositAmount });

      // 3. Cancel Escrow (refunding buyer)
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const cancelTx = await vehicleLien.connect(buyer).cancelEscrow(escrowId);
      const cancelReceipt = await cancelTx.wait();
      const gasUsed = BigInt(cancelReceipt.gasUsed) * BigInt(cancelReceipt.gasPrice);

      const escrowDesc = await vehicleLien.getEscrow(escrowId);
      expect(escrowDesc.state).to.equal(3n); // Cancelled

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      const expectedRefund = buyerBalanceBefore - gasUsed + depositAmount;
      expect(buyerBalanceAfter).to.equal(expectedRefund);
    });
  });
});
