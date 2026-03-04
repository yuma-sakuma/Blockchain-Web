import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers } from 'ethers';
import { Repository } from 'typeorm';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConsentGrant } from '../database/entities/consent-grant.entity';
import { EventLog } from '../database/entities/event-log.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { InsuranceClaim } from '../database/entities/insurance-claim.entity';
import { InsurancePolicy } from '../database/entities/insurance-policy.entity';
import { MaintenanceLog } from '../database/entities/maintenance-log.entity';
import { OwnershipTransfer } from '../database/entities/ownership-transfer.entity';
import { PlateRecord } from '../database/entities/plate-record.entity';
import { Registration } from '../database/entities/registration.entity';
import { TaxPayment } from '../database/entities/tax-payment.entity';
import { Vehicle } from '../database/entities/vehicle.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventLog)
    private eventLogRepository: Repository<EventLog>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(ConsentGrant)
    private consentGrantRepository: Repository<ConsentGrant>,
    @InjectRepository(InsurancePolicy)
    private insurancePolicyRepository: Repository<InsurancePolicy>,
    @InjectRepository(InsuranceClaim)
    private insuranceClaimRepository: Repository<InsuranceClaim>,
    @InjectRepository(Inspection)
    private inspectionRepository: Repository<Inspection>,
    @InjectRepository(OwnershipTransfer)
    private ownershipTransferRepository: Repository<OwnershipTransfer>,
    @InjectRepository(Registration)
    private registrationRepository: Repository<Registration>,
    @InjectRepository(PlateRecord)
    private plateRecordRepository: Repository<PlateRecord>,
    @InjectRepository(TaxPayment)
    private taxPaymentRepository: Repository<TaxPayment>,
    @InjectRepository(MaintenanceLog)
    private maintenanceLogRepository: Repository<MaintenanceLog>,
    private blockchainService: BlockchainService,
  ) { }

  async findAll(): Promise<EventLog[]> {
    return this.eventLogRepository.find({
      order: { occurredAt: 'DESC' },
    });
  }

  async create(createEventDto: any): Promise<EventLog> {
    let vehicle = await this.vehicleRepository.findOne({ where: { tokenId: createEventDto.tokenId } });

    let txHash = null;
    const payloadHash = ethers.id(JSON.stringify(createEventDto.payload));

    if (createEventDto.type === 'MANUFACTURER_MINTED') {
      if (!vehicle) {
        const payload = createEventDto.payload;

        // 1. VIN Uniqueness Check
        const existingVin = await this.vehicleRepository.findOne({ where: { vinNumber: payload.vin } });
        if (existingVin) {
           throw new Error(`VIN ${payload.vin} already exists in the database.`);
        }

        // 2. Engine/Motor Serial Uniqueness Check
        if (payload.spec && payload.spec.engine) {
            // Find all vehicles and check inside specJson.
            // (Using pure JS for cross-db compatibility since specJson is a simple object)
            const allVehicles = await this.vehicleRepository.find({ select: ['tokenId', 'specJson'] });
            for (const v of allVehicles) {
                if (v.specJson && v.specJson.engine === payload.spec.engine) {
                    throw new Error(`Engine/Motor Serial ${payload.spec.engine} already belongs to another vehicle.`);
                }
            }
        }

        // Blockchain Interaction
        try {
          // Prepare hashes for blockchain
          const vinHash = ethers.id(payload.vin);
          const modelHash = ethers.id(payload.makeModelTrim);
          const specHash = ethers.id(JSON.stringify(payload.spec));
          const manufacturedAt = Math.floor(new Date(payload.production?.manufacturedAt || Date.now()).getTime() / 1000);

          // 3. On-chain Uniqueness Check (Prevent "missing revert data" error)
          const isVinUsed = await this.blockchainService.vehicleNFTContract.isVinUsed(vinHash);
          if (isVinUsed) {
             throw new Error(`VIN ${payload.vin} is already registered on the blockchain.`);
          }

          // Use the admin wallet to mint
          const tx = await this.blockchainService.vehicleNFTContract.mintVehicle(
            process.env.ADMIN_WALLET_ADDRESS || this.blockchainService.wallet.address, 
            vinHash,
            manufacturedAt,
            modelHash,
            specHash
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;

          // Get Token ID from event
          const transferEvent = receipt.logs.find((log: any) => {
            try {
              return this.blockchainService.vehicleNFTContract.interface.parseLog(log)?.name === 'Transfer';
            } catch (e) { return false; }
          });

          if (transferEvent) {
            const parsed = this.blockchainService.vehicleNFTContract.interface.parseLog(transferEvent);
            createEventDto.tokenId = parsed?.args.tokenId.toString();
          }

          if (!createEventDto.tokenId) {
            throw new Error('Failed to retrieve Token ID from blockchain transaction.');
          }

        } catch (err) {
          console.error('Blockchain Minting Failed:', err);
          throw err; // Stop process if blockchain fails
        }

        vehicle = this.vehicleRepository.create({
          tokenId: createEventDto.tokenId,
          vinNumber: payload.vin,
          vinHash: ethers.id(payload.vin),
          manufacturerAddress: createEventDto.actor,
          manufacturedAt: new Date(payload.production?.manufacturedAt || Date.now()).getTime().toString(),
          modelJson: { model: payload.makeModelTrim, year: new Date().getFullYear() },
          modelHash: ethers.id(payload.makeModelTrim),
          specJson: payload.spec || {},
          specHash: ethers.id(JSON.stringify(payload.spec)),
          manufacturerSignature: payload.manufacturerSignature || null,
          currentOwnerAddress: createEventDto.actor,
          ownerCount: 0,
        });
        await this.vehicleRepository.save(vehicle);
      }
    } else {
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with tokenId ${createEventDto.tokenId} not found`);
      }

      // Handle state changes for existing vehicles based on Event Type
      let vehicleUpdated = false;
      const payload = createEventDto.payload;

      switch (createEventDto.type) {
        case 'OWNERSHIP_TRANSFERRED':
          if (payload.to) {
            vehicle.currentOwnerAddress = payload.to;
            vehicle.ownerCount = (vehicle.ownerCount || 0) + 1;
            vehicleUpdated = true;

            const transfer = this.ownershipTransferRepository.create({
              tokenId: vehicle.tokenId,
              fromAddress: payload.from || createEventDto.actor,
              toAddress: payload.to,
              reason: 'RESALE' as any, // Mock default reason
              transferredAt: new Date(payload.date || Date.now()).getTime().toString(),
              docHash: ethers.id(payload.docRef || 'none'),
              salePrice: payload.price ? (payload.price * 100).toString() : null,
              currency: 'THB'
            });
             await this.ownershipTransferRepository.save(transfer);

             // Save vehicle state immediately before blockchain interaction
             await this.vehicleRepository.save(vehicle);
             vehicleUpdated = false;

              // Blockchain Interaction
              try {
                // Quick check if provider is reachable
                await Promise.race([
                this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                // 2. On-chain Token Existence Check
                try {
                    await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                    throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
                }

                const reasonMap = { 'inventory_transfer': 0, 'first_sale': 1, 'resale': 2, 'trade_in': 3 };
                const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;
                const tx = await this.blockchainService.vehicleLifecycleContract.recordTransfer(
                  createEventDto.tokenId,
                  toAddress,
                  reasonMap[payload.reason] || 2,
                  ethers.id(payload.docRef || 'none'),
                  ethers.id(payload.to),
                  ethers.id('payment-ref')
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;
              } catch (err) {
                console.error('Blockchain Transfer Recording Failed:', err.message || err);
              }
          }
          break;
        case 'SALE_CONTRACT_CREATED':
          // Logic handled off-chain mostly, but could map to ownership transfer prep
          break;
        case 'DLT_REGISTRATION_UPDATED':
          vehicle.registrationStatus = 'REGISTERED' as any;
          vehicleUpdated = true;

          const reg = this.registrationRepository.create({
            tokenId: vehicle.tokenId,
            status: 'REGISTERED' as any,
            greenBookNo: payload.bookNo || `GB-${Math.floor(Math.random() * 1000000)}`,
            greenBookNoHash: ethers.id(payload.bookNo || 'none'),
            registeredAt: Date.now().toString(),
            registrationDocHash: ethers.id('reg-doc-hash'),
            dltOfficerAddress: createEventDto.actor
          });
          await this.registrationRepository.save(reg);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false; // Reset to avoid double save at the end

          // Blockchain Interaction (Registration)
          try {
            // Quick check if provider is reachable to avoid long ethers hang
            await Promise.race([
              this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const tx = await this.blockchainService.vehicleRegistryContract.registerVehicle(
              createEventDto.tokenId,
              ethers.id(payload.bookNo || 'none'),
              ethers.id('reg-doc-hash')
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Registration Failed or Timed out:', err.message || err);
          }
          break;
        case 'PLATE_EVENT_RECORDED':
          let assignedPlateNo = payload.plateNo;

          if (payload.action === 'issue') {
            // 3. License Plate Randomizer (Issue new plate)
            let isUnique = false;
            while (!isUnique) {
              const prefix = Math.floor(Math.random() * 9) + 1;
              const lettersTh = "กขคฆงจฉชซญฎฏฐฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ";
              const char1 = lettersTh.charAt(Math.floor(Math.random() * lettersTh.length));
              const char2 = lettersTh.charAt(Math.floor(Math.random() * lettersTh.length));
              const digits = Math.floor(Math.random() * 9000) + 1000;
              assignedPlateNo = `${prefix}${char1}${char2}-${digits}`;
              
              // ตรวจสอบว่าป้ายซ้ำหรือไม่ ถ้าซ้ำ (เจอ existingPlate) loop จะทำงานต่อและ gen ใหม่
              const existingPlate = await this.plateRecordRepository.findOne({ where: { plateNo: assignedPlateNo } });
              if (!existingPlate) {
                isUnique = true; // ไม่ซ้ำ ออกจาก loop ได้
              }
            }
          } else if (payload.action === 'change') {
             // 4. Check for duplicate if manually changing
             const existingPlate = await this.plateRecordRepository.findOne({ where: { plateNo: assignedPlateNo, eventType: 'ISSUE' as any } });
             if (existingPlate && existingPlate.tokenId !== vehicle.tokenId) {
                throw new Error(`License Plate ${assignedPlateNo} is already in use by another vehicle.`);
             }
          }
          
          payload.plateNo = assignedPlateNo; // Update the payload so it's returned to frontend
          vehicle.specJson = { ...(vehicle.specJson || {}), plateNo: assignedPlateNo }; // Robust update
          vehicle.specHash = ethers.id(JSON.stringify(vehicle.specJson)); // Sync Hash
          vehicleUpdated = true;

          const plate = this.plateRecordRepository.create({
            tokenId: vehicle.tokenId,
            eventType: payload.action === 'issue' ? 'ISSUE' : payload.action === 'change' ? 'CHANGE' : 'LOST' as any,
            plateNo: assignedPlateNo,
            plateNoHash: ethers.id(assignedPlateNo || 'no-plate'),
            provinceCode: 10, // Mock for Bangkok
            effectiveAt: Date.now().toString(),
            plateEventDocHash: ethers.id('plate-doc-hash')
          });
          await this.plateRecordRepository.save(plate);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;

          // Blockchain Interaction
          try {
            // Quick check if provider is reachable
            await Promise.race([
              this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const typeMap = { 'issue': 0, 'change': 1, 'lost': 2 };
            const tx = await this.blockchainService.vehicleRegistryContract.recordPlateEvent(
              createEventDto.tokenId,
              ethers.id(assignedPlateNo || 'no-plate'),
              10,
              typeMap[payload.action] || 0,
              ethers.id('plate-doc-hash'),
              Math.floor(Date.now() / 1000)
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Plate Event Failed or Timed out:', err.message || err);
          }
          break;
        case 'TAX_STATUS_UPDATED':
          const tax = this.taxPaymentRepository.create({
            tokenId: vehicle.tokenId,
            taxYear: new Date().getFullYear(),
            receiptHash: 'mockHash',
            paidAt: Date.now().toString(),
            validUntil: new Date(payload.validUntil).getTime().toString(),
            status: 'PAID' as any,
            amount: payload.amount ? (payload.amount * 100).toString() : '200000',
          });
           await this.taxPaymentRepository.save(tax);

           // Save vehicle state (though not much changed here, good for consistency)
           await this.vehicleRepository.save(vehicle);
           vehicleUpdated = false;

           // Blockchain Interaction
           try {
             // Quick check
             await Promise.race([
               this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
               new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
             ]);

             // 2. On-chain Token Existence Check
             try {
                 await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
             } catch (e) {
                 throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
             }

             const tx = await this.blockchainService.vehicleRegistryContract.recordTaxPayment(
              createEventDto.tokenId,
              new Date().getFullYear(),
              Math.floor(new Date(payload.validUntil).getTime() / 1000),
              ethers.id('tax-receipt-hash')
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Tax Payment Failed:', err);
          }
          break;
        case 'FLAG_UPDATED':
          if (payload.flag && payload.value !== undefined) {
            const flagsSet = new Set(vehicle.activeFlags || []);
            const flagKey = payload.flag.toUpperCase();
            if (payload.value) {
              flagsSet.add(flagKey as any);
            } else {
              flagsSet.delete(flagKey as any);
            }
             vehicle.activeFlags = Array.from(flagsSet);
             vehicleUpdated = true;

             // Save vehicle state immediately before blockchain interaction
             await this.vehicleRepository.save(vehicle);
             vehicleUpdated = false;

              // Blockchain Interaction
              try {
                // Quick check
                await Promise.race([
                  this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);
 
                // 2. On-chain Token Existence Check
                try {
                    await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                    throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
                }
 
                const flagMap = { 'stolen': 1 << 0, 'seized': 1 << 1, 'major_accident': 1 << 2, 'flood': 1 << 3, 'total_loss': 1 << 4 };
               if (flagMap[payload.flag]) {
                 const tx = await this.blockchainService.vehicleRegistryContract.setFlag(
                   createEventDto.tokenId,
                   flagMap[payload.flag],
                   payload.value,
                   ethers.id('flag-ref-hash')
                 );
                 const receipt = await tx.wait();
                 txHash = receipt.hash;
               }
             } catch (err) {
               console.error('Blockchain Flag Update Failed:', err.message || err);
             }
          }
          break;
        case 'LIEN_CREATED':
          vehicle.transferLocked = true;
          vehicleUpdated = true;

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;
 
          // Blockchain Interaction
          try {
            // Quick check
            await Promise.race([
              this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);
 
            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }
 
            const tx = await this.blockchainService.vehicleLienContract.createLien(
              createEventDto.tokenId,
              ethers.id('loan-contract-hash'),
              ethers.id('release-condition-hash')
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Lien Creation Failed:', err.message || err);
          }
          break;
        case 'LIEN_RELEASED':
          vehicle.transferLocked = false;
           await this.vehicleRepository.save(vehicle);
           vehicleUpdated = false;

           // Blockchain Interaction
           try {
             // Quick check
             await Promise.race([
               this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
               new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
             ]);

             // 2. On-chain Token Existence Check
             try {
                 await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
             } catch (e) {
                 throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
             }
 
             const tx = await this.blockchainService.vehicleLienContract.releaseLien(
               createEventDto.tokenId
             );
             const receipt = await tx.wait();
             txHash = receipt.hash;
           } catch (err) {
             console.error('Blockchain Lien Release Failed or Timed out:', err.message || err);
           }
          break;
        case 'REPOSSESSION_RECORDED':
          vehicle.transferLocked = true;
          const repossessionFlagsSet = new Set(vehicle.activeFlags || []);
          repossessionFlagsSet.add('SEIZED' as any);
          vehicle.activeFlags = Array.from(repossessionFlagsSet);
           vehicleUpdated = true;

           // Save vehicle state immediately before blockchain interaction
           await this.vehicleRepository.save(vehicle);
           vehicleUpdated = false;

           // Blockchain Interaction
           try {
             // Quick check
             await Promise.race([
               this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
               new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
             ]);

             // 2. On-chain Token Existence Check
             try {
                 await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
             } catch (e) {
                 throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
             }
 
             const FLAG_SEIZED = 1 << 1;
             const tx = await this.blockchainService.vehicleRegistryContract.setFlag(
               createEventDto.tokenId,
               FLAG_SEIZED,
               true,
               ethers.id('repossession-ref-hash')
             );
             const receipt = await tx.wait();
             txHash = receipt.hash;
           } catch (err) {
             console.error('Blockchain Repocession Recording Failed or Timed out:', err.message || err);
           }
          break;
        case 'INSTALLMENT_MILESTONE_RECORDED':
          // Specific handling could be adding to Financial log
          break;
        case 'CONSENT_UPDATED':
          if (payload.grantTo) {
            const grant = this.consentGrantRepository.create({
              tokenId: vehicle.tokenId,
              ownerAddress: payload.owner,
              granteeDid: payload.grantTo,
              scopes: ['PII' as any], // Mock mapping
              scopeMask: '1',
              expiresAt: new Date(payload.expiresAt).getTime().toString(),
              grantHash: 'mockHash',
              nonce: Date.now().toString()
            });
             await this.consentGrantRepository.save(grant);

             // Save vehicle state immediately before blockchain interaction
             await this.vehicleRepository.save(vehicle);
             vehicleUpdated = false;

             // Blockchain Interaction
             try {
               // Quick check
               await Promise.race([
                 this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                 new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
               ]);

               // 2. On-chain Token Existence Check
               try {
                   await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
               } catch (e) {
                   throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
               }

               const scopeMask = 1;
              const tx = await this.blockchainService.vehicleLifecycleContract.grantWriteConsent(
                createEventDto.tokenId,
                ethers.isAddress(payload.grantTo) ? ethers.getAddress(payload.grantTo) : ethers.ZeroAddress,
                scopeMask,
                Math.floor(new Date(payload.expiresAt).getTime() / 1000),
                false,
                Date.now()
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
            } catch (err) {
              console.error('Blockchain Consent Grant Failed:', err);
            }
          }
          break;
        case 'CONSENT_REVOKED':
          if (payload.revokeFrom) {
            const grants = await this.consentGrantRepository.find({
              where: { tokenId: vehicle.tokenId, granteeDid: payload.revokeFrom },
              order: { createdAt: 'DESC' }
            });
            if (grants.length > 0) {
              grants[0].revoked = true;
              await this.consentGrantRepository.save(grants[0]);

              // Save vehicle state (not strictly necessary for consent but good for pattern)
              await this.vehicleRepository.save(vehicle);
              vehicleUpdated = false;

              // Blockchain Interaction
              try {
                // Quick check
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                // 2. On-chain Token Existence Check
                try {
                    await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                    throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
                }

                const tx = await this.blockchainService.vehicleLifecycleContract.revokeWriteConsent(
                  createEventDto.tokenId,
                  ethers.isAddress(payload.revokeFrom) ? ethers.getAddress(payload.revokeFrom) : ethers.ZeroAddress
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;
              } catch (err) {
                console.error('Blockchain Consent Revoke Failed:', err);
              }
            }
          }
          break;

        case 'INSURANCE_POLICY_UPDATED':
          const policy = this.insurancePolicyRepository.create({
            tokenId: vehicle.tokenId,
            insurerAddress: createEventDto.actor,
            policyNo: payload.policyNumber || `POL-${Date.now()}`,
            policyNoHash: 'mockHash',
            action: 'NEW' as any,
            validFrom: Date.now().toString(),
            validTo: new Date(payload.validUntil).getTime().toString(),
            coverageDetails: { type: payload.coverageType, class: '1', coverageItems: [] },
            coverageHash: 'mockHash',
          });
          await this.insurancePolicyRepository.save(policy);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;

          // Blockchain Interaction
          try {
            // Quick check
            await Promise.race([
              this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const actionMap = { 'new': 0, 'renew': 1, 'change': 2, 'cancel': 3 };
            const tx = await this.blockchainService.vehicleLifecycleContract.recordInsurancePolicy(
              createEventDto.tokenId,
              ethers.id(payload.policyNumber || 'none'),
              actionMap[payload.action] || 0,
              Math.floor(Date.now() / 1000),
              Math.floor(new Date(payload.validUntil).getTime() / 1000),
              ethers.id('coverage-hash')
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Insurance Policy Failed:', err);
          }
          break;

        case 'CLAIM_FILED':
          const claim = this.insuranceClaimRepository.create({
            tokenId: vehicle.tokenId,
            claimNo: payload.claimId,
            claimNoHash: 'mockHash',
            filedAt: new Date(payload.date || Date.now()).getTime().toString(),
            status: 'FILED' as any,
            severity: 'MINOR' as any, // Mock mapping
            evidenceFiles: [],
            evidenceHashes: []
          });
          await this.insuranceClaimRepository.save(claim);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;

          // Blockchain Interaction
          try {
            // Quick check
            await Promise.race([
              this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const severityMap = { 'minor': 0, 'major': 1, 'structural': 2, 'total_loss': 3 };
            const tx = await this.blockchainService.vehicleLifecycleContract.fileClaim(
              createEventDto.tokenId,
              ethers.id(payload.claimId || 'none'),
              [], // evidence hashes
              severityMap[payload.severity] || 0
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Claim Filing Failed:', err);
          }
          break;

        case 'INSPECTION_RESULT_RECORDED':
          const inspection = this.inspectionRepository.create({
            tokenId: vehicle.tokenId,
            stationAddress: createEventDto.actor,
            stationName: 'Authorized Station',
            vinVerified: true,
            result: payload.passed ? 'PASS' as any : 'FAIL' as any,
            metrics: payload.metrics || {},
            metricsHash: 'mockHash',
            certHash: 'mockHash',
            issuedAt: Date.now().toString(),
          });
          await this.inspectionRepository.save(inspection);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;

          // Blockchain Interaction
          try {
            // Quick check
            await Promise.race([
              this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const tx = await this.blockchainService.vehicleRegistryContract.recordInspection(
              createEventDto.tokenId,
              payload.passed ? 1 : 0,
              ethers.id(JSON.stringify(payload.metrics || {})),
              ethers.id('cert-hash')
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Inspection Record Failed:', err);
          }
          break;

        case 'MAINTENANCE_RECORDED':
          const maintenance = this.maintenanceLogRepository.create({
            tokenId: vehicle.tokenId,
            workshopAddress: createEventDto.actor,
            writeConsentRefHash: 'mockHash',
            occurredAt: Date.now().toString(),
            mileageKm: payload.mileageKm || 0,
            jobs: payload.parts || [],
            symptoms: payload.description,
            maintenanceHash: 'mockHash',
            partsHash: 'mockHash'
          });
          await this.maintenanceLogRepository.save(maintenance);

          // Save vehicle state immediately before blockchain interaction
          await this.vehicleRepository.save(vehicle);
          vehicleUpdated = false;

          // Blockchain Interaction
          try {
            // Quick check
            await Promise.race([
              this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
            ]);

            // 2. On-chain Token Existence Check
            try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
            } catch (e) {
                throw new Error(`Vehicle Token ${createEventDto.tokenId} does not exist on-chain. Database may be desynchronized with Blockchain.`);
            }

            const tx = await this.blockchainService.vehicleLifecycleContract.logMaintenance(
              createEventDto.tokenId,
              ethers.id('consent-ref-hash'),
              payload.mileageKm || 0,
              ethers.id('maintenance-hash'),
              ethers.id(JSON.stringify(payload.parts || [])),
              0, // accident severity
              Math.floor(Date.now() / 1000)
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
          } catch (err) {
            console.error('Blockchain Maintenance Log Failed:', err);
          }
          break;

        case 'ODOMETER_SNAPSHOT':
          // Could save a mini maintenance log or just an event. The event handles it for now.
          break;
        case 'CRITICAL_PART_REPLACED':
          // Mock structure for part replacements inside Maintenance Log or as pure Event
          break;
        case 'SPECIFICATION_UPDATED':
          if (payload.changes) {
            vehicle.specJson = { ...vehicle.specJson, ...payload.changes };
            vehicle.specHash = ethers.id(JSON.stringify(vehicle.specJson));
            vehicleUpdated = true;
          }
          break;
      }

      if (vehicleUpdated) {
        await this.vehicleRepository.save(vehicle);
      }
    }

    const event = this.eventLogRepository.create({
      ...createEventDto,
      actorAddress: createEventDto.actor || '0x00',
      actorRole: createEventDto.actorRole ||
        (createEventDto.actor?.startsWith('MANUFACTURER') ? 'MANUFACTURER' :
          createEventDto.actor?.startsWith('DLT') ? 'REGULATORY' :
            createEventDto.actor?.startsWith('WORKSHOP') ? 'SERVICE' :
              createEventDto.actor?.startsWith('INSURER') ? 'INSURANCE' :
                createEventDto.actor?.startsWith('FINANCE') ? 'FINANCIAL' : 'CONSUMER'),
      occurredAt: createEventDto.occurredAt || Date.now().toString(),
      payloadHash: payloadHash,
      txHash: txHash,
    }) as any;

    return this.eventLogRepository.save(event);
  }
}
