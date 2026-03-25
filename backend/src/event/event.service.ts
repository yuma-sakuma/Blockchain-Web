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
import { VehicleFlagRecord } from '../database/entities/vehicle-flag.entity';

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
    @InjectRepository(VehicleFlagRecord)
    private vehicleFlagRepository: Repository<VehicleFlagRecord>,
    private blockchainService: BlockchainService,
  ) { }

  async findAll(): Promise<EventLog[]> {
    return this.eventLogRepository.find({
      order: { occurredAt: 'DESC' },
    });
  }

  async checkPlateExists(plateNo: string): Promise<{ exists: boolean }> {
    const existing = await this.plateRecordRepository.findOne({ where: { plateNo } });
    return { exists: !!existing };
  }

  async create(createEventDto: any): Promise<EventLog> {
    console.log('\n╔══════════════════════════════════════════════════════════════');
    console.log('║ 📥 [EventService] NEW EVENT RECEIVED');
    console.log('╠══════════════════════════════════════════════════════════════');
    console.log('║ Type      :', createEventDto.type);
    console.log('║ TokenID   :', createEventDto.tokenId);
    console.log('║ Actor     :', createEventDto.actor);
    console.log('║ ActorRole :', createEventDto.actorRole);
    console.log('║ txHash (from Frontend):', createEventDto.txHash || '(none - Backend will handle)');
    console.log('║ Payload   :', JSON.stringify(createEventDto.payload, null, 2));
    console.log('╚══════════════════════════════════════════════════════════════\n');

    let vehicle = await this.vehicleRepository.findOne({ where: { tokenId: createEventDto.tokenId } });

    let txHash = createEventDto.txHash || null;
    const payloadHash = ethers.id(JSON.stringify(createEventDto.payload));
    console.log(`[EventService] 🔑 payloadHash = ${payloadHash}`);

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
        if (!createEventDto.txHash) {
          try {
            // Prepare hashes for blockchain
            const vinHash = ethers.id(payload.vin);
            const modelHash = ethers.id(payload.makeModelTrim);
            const specHash = ethers.id(JSON.stringify(payload.spec));
            const manufacturedAt = Math.floor(new Date(payload.production?.manufacturedAt || Date.now()).getTime() / 1000);
            console.log('[EventService] 🏭 MANUFACTURER_MINTED - Preparing Blockchain Tx...');
            console.log('  vinHash       :', vinHash);
            console.log('  modelHash     :', modelHash);
            console.log('  specHash      :', specHash);
            console.log('  manufacturedAt:', manufacturedAt);

            // 3. On-chain Uniqueness Check (Prevent "missing revert data" error)
            const isVinUsed = await this.blockchainService.vehicleNFTContract.isVinUsed(vinHash);
            if (isVinUsed) {
              throw new Error(`VIN ${payload.vin} is already registered on the blockchain.`);
            }

            // Use the admin wallet to mint
            const tx = await this.blockchainService.vehicleNFTContract.mintVehicle(
              process.env.ADMIN_WALLET_ADDRESS || this.blockchainService.walletAddress,
              vinHash,
              manufacturedAt,
              modelHash,
              specHash
            );
            const receipt = await tx.wait();
            txHash = receipt.hash;
            console.log('[EventService] ✅ MINT Transaction Confirmed!');
            console.log('  txHash     :', txHash);
            console.log('  blockNumber:', receipt.blockNumber);
            console.log('  gasUsed    :', receipt.gasUsed?.toString());

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

          } catch (err) {
            console.error('Blockchain Minting Failed:', err);
            // Still save to DB for prototype fallback
          }
        } else {
          // กรณี Frontend ทำกำร Mint บนเชน เรียบร้อยแล้วส่ง txHash กับ tokenId มา
          // Backend ควรตรวจสอบหรือนำ Receipt นั้นมายืนยัน (ในโปรเจคอัปเดตนี้นำ Token ID ที่ Frontend ได้มาใช้เลย)
          // หรือถ้า Frontend ไม่ได้ส่ง TokenID มา (กรณีลืม) ให้ลองดึงจากเชน (แต่นี่ Frontend ส่งมาแล้วในโค้ดใหม่)
          if (!createEventDto.tokenId) {
            try {
              const receipt = await this.blockchainService.vehicleNFTContract.runner?.provider?.getTransactionReceipt(createEventDto.txHash);
              if (receipt) {
                const transferEvent = receipt.logs.find((log: any) => {
                  try { return this.blockchainService.vehicleNFTContract.interface.parseLog(log)?.name === 'Transfer'; } catch (e) { return false; }
                });
                if (transferEvent) {
                  const parsed = this.blockchainService.vehicleNFTContract.interface.parseLog(transferEvent);
                  createEventDto.tokenId = parsed?.args.tokenId.toString();
                }
              }
            } catch (e) {
              console.error(`Failed to retrieve real Token ID from txHash ${createEventDto.txHash}:`, e);
            }
          }
        } // end if (!createEventDto.txHash)

        if (!createEventDto.tokenId) {
          throw new Error("Cannot save vehicle without a valid Token ID from Blockchain.");
        }

        const checksumActor = ethers.isAddress(createEventDto.actor) ? ethers.getAddress(createEventDto.actor) : createEventDto.actor;

        vehicle = this.vehicleRepository.create({
          tokenId: createEventDto.tokenId,
          vinNumber: payload.vin,
          vinHash: ethers.id(payload.vin),
          manufacturerAddress: checksumActor,
          manufacturedAt: new Date(payload.production?.manufacturedAt || Date.now()).getTime().toString(),
          modelJson: { model: payload.makeModelTrim, year: new Date().getFullYear() },
          modelHash: ethers.id(payload.makeModelTrim),
          specJson: payload.spec || {},
          specHash: ethers.id(JSON.stringify(payload.spec)),
          manufacturerSignature: payload.manufacturerSignature || null,
          currentOwnerAddress: checksumActor,
          ownerCount: 0,
        });
        await this.vehicleRepository.save(vehicle);
        console.log(`[EventService] 💾 Vehicle saved to DB: tokenId=${createEventDto.tokenId}, VIN=${payload.vin}`);
        console.log('  DB vinHash  :', ethers.id(payload.vin));
        console.log('  DB modelHash:', ethers.id(payload.makeModelTrim));
        console.log('  DB specHash :', ethers.id(JSON.stringify(payload.spec)));
      }
    } else {
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with tokenId ${createEventDto.tokenId} not found`);
      }

      // Handle state changes for existing vehicles based on Event Type
      let vehicleUpdated = false;
      const payload = createEventDto.payload;

      console.log(`[EventService] 🔄 Processing event type: ${createEventDto.type} for tokenId: ${createEventDto.tokenId}`);
      switch (createEventDto.type) {
        case 'OWNERSHIP_TRANSFERRED': {
          console.log('[EventService] 🔀 OWNERSHIP_TRANSFERRED event');
          if (payload.to) {
            // Ethers getAddress normalizes to correct checksum casing
            const checksumAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : payload.to;
            vehicle.currentOwnerAddress = checksumAddress;
            vehicle.ownerCount = (vehicle.ownerCount || 0) + 1;
            vehicleUpdated = true;

            // Convert ETH price to Wei for storage (1 ETH = 10^18 Wei)
            const priceInWei = payload.price ? BigInt(Math.floor(payload.price * 1e18)).toString() : null;

            const transfer = this.ownershipTransferRepository.create({
              tokenId: vehicle.tokenId,
              fromAddress: payload.from || createEventDto.actor,
              toAddress: payload.to,
              reason: 'RESALE' as any,
              transferredAt: new Date(payload.date || Date.now()).getTime().toString(),
              docHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, from: payload.from, to: payload.to, date: payload.date })),
              salePrice: priceInWei,
              currency: 'ETH',
              paymentMethod: 'CRYPTO' as any,
            });
            // Blockchain Interaction (wrapped in withTxLock)
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                try {
                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                  console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Transfer.`);
                  throw new Error('STOP_SYNC');
                }

                txHash = await this.blockchainService.withTxLock(async () => {
                  const reasonMap = { 'inventory_transfer': 0, 'first_sale': 1, 'resale': 2, 'trade_in': 3 };
                  const toAddress = ethers.isAddress(payload.to) ? ethers.getAddress(payload.to) : ethers.ZeroAddress;

                  // 1. Record transfer in VehicleLifecycle FIRST (while caller is still owner → passes auth)
                  const tx = await this.blockchainService.vehicleLifecycleContract.recordTransfer(
                    createEventDto.tokenId, toAddress,
                    reasonMap[payload.reason] || 2,
                    ethers.id(payload.docRef || 'none'),
                    ethers.id(payload.to),
                    ethers.id('payment-ref')
                  );
                  const receipt = await tx.wait();
                  console.log('[EventService] ✅ OWNERSHIP_TRANSFERRED Transaction Confirmed!');

                  // 2. THEN transfer NFT on-chain
                  const currentOwner = await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                  if (toAddress !== ethers.ZeroAddress && currentOwner.toLowerCase() !== toAddress.toLowerCase()) {
                    const transferTx = await this.blockchainService.vehicleNFTContract.transferFrom(
                      currentOwner, toAddress, createEventDto.tokenId
                    );
                    await transferTx.wait();
                    console.log(`[EventService] ✅ NFT ${createEventDto.tokenId} transferred from ${currentOwner} to ${toAddress}`);
                  }

                  return receipt.hash;
                });
              } catch (err) {
                if (err.message !== 'STOP_SYNC') {
                  console.warn(`[EventService] Blockchain Transfer Sync failed: ${err.message || err}`);
                  throw err;
                }
              }
            } // end if (!createEventDto.txHash)
            await this.ownershipTransferRepository.save(transfer);
          }
          break;
        }
        case 'SALE_CONTRACT_CREATED':
          // Logic handled off-chain mostly, but could map to ownership transfer prep
          break;
        case 'WARRANTY_DEFINED': {
          if (payload.terms) {
            vehicle.warrantyJson = {
              startPolicy: payload.startPolicy || 'at_first_registration',
              terms: payload.terms
            };
            vehicleUpdated = true;
          }
          break;
        }
        case 'DLT_REGISTRATION_UPDATED': {
          console.log('[EventService] 📋 DLT_REGISTRATION_UPDATED event');
          vehicle.registrationStatus = 'REGISTERED' as any;
          vehicleUpdated = true;

          const assignedBookNo = payload.bookNo || `BOOK-${Date.now()}`;
          payload.bookNo = assignedBookNo;

          const reg = this.registrationRepository.create({
            tokenId: vehicle.tokenId,
            status: 'REGISTERED' as any,
            greenBookNo: payload.bookNo || `BOOK-${Date.now()}`,
            greenBookNoHash: ethers.id(assignedBookNo),
            registeredAt: Date.now().toString(),
            registrationDocHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, bookNo: assignedBookNo, actor: createEventDto.actor })),
            dltOfficerAddress: createEventDto.actor
          });

          // Blockchain Interaction (wrapped in withTxLock)
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] \u2139\ufe0f Token ${createEventDto.tokenId} not on-chain. Skipping sync for DLT Registration.`);
                throw new Error('STOP_SYNC');
              }

              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleRegistryContract.registerVehicle(
                  createEventDto.tokenId,
                  ethers.id(payload.bookNo || 'none'),
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, bookNo: assignedBookNo, registeredAt: Date.now() }))
                );
                const receipt = await tx.wait();
                console.log('[EventService] \u2705 DLT_REGISTRATION Transaction Confirmed!');
                console.log('  txHash     :', receipt.hash);
                console.log('  blockNumber:', receipt.blockNumber);
                console.log('  gasUsed    :', receipt.gasUsed?.toString());
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Registration sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.registrationRepository.save(reg);
          break;
        }
        case 'PLATE_EVENT_RECORDED': {
          console.log('[EventService] 🚗 PLATE_EVENT_RECORDED event');
          const assignedPlateNo = payload.plateNo;
          if (!assignedPlateNo) {
            throw new Error('plateNo is required. Frontend must generate and validate the plate number before sending.');
          }

          const existingPlate = await this.plateRecordRepository.findOne({ where: { plateNo: assignedPlateNo } });
          if (existingPlate && existingPlate.tokenId !== vehicle.tokenId) {
            throw new Error(`License Plate ${assignedPlateNo} is already in use by another vehicle.`);
          }

          payload.plateNo = assignedPlateNo;
          vehicle.specJson = { ...(vehicle.specJson || {}), plateNo: assignedPlateNo };
          vehicle.specHash = ethers.id(JSON.stringify(vehicle.specJson));
          vehicleUpdated = true;

          const plate = this.plateRecordRepository.create({
            tokenId: vehicle.tokenId,
            eventType: payload.action === 'issue' ? 'ISSUE' : payload.action === 'change' ? 'CHANGE' : 'LOST' as any,
            plateNo: assignedPlateNo,
            plateNoHash: ethers.id(assignedPlateNo || 'no-plate'),
            provinceCode: 10,
            effectiveAt: Date.now().toString(),
            plateEventDocHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, plateNo: assignedPlateNo, action: payload.action }))
          });

          // Blockchain Interaction (wrapped in withTxLock)
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] \u2139\ufe0f Token ${createEventDto.tokenId} not on-chain. Skipping sync for Plate Event.`);
                throw new Error('STOP_SYNC');
              }

              const typeMap = { 'issue': 0, 'change': 1, 'lost': 2 };
              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleRegistryContract.recordPlateEvent(
                  createEventDto.tokenId,
                  ethers.id(assignedPlateNo || 'no-plate'),
                  10,
                  typeMap[payload.action] || 0,
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, plateNo: assignedPlateNo, action: payload.action })),
                  Math.floor(Date.now() / 1000)
                );
                const receipt = await tx.wait();
                console.log('[EventService] \u2705 PLATE_EVENT Transaction Confirmed!');
                console.log('  txHash     :', receipt.hash);
                console.log('  blockNumber:', receipt.blockNumber);
                console.log('  gasUsed    :', receipt.gasUsed?.toString());
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Plate Event sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.plateRecordRepository.save(plate);
          break;
        }
        case 'TAX_STATUS_UPDATED': {
          console.log('[EventService] 💰 TAX_STATUS_UPDATED event');
          const tax = this.taxPaymentRepository.create({
            tokenId: vehicle.tokenId,
            taxYear: new Date().getFullYear(),
            receiptHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, taxYear: new Date().getFullYear(), amount: payload.amount })),
            paidAt: Date.now().toString(),
            validUntil: new Date(payload.validUntil).getTime().toString(),
            status: 'PAID' as any,
            amount: payload.amount ? (payload.amount * 100).toString() : '200000',
          });

          // Blockchain Interaction (wrapped in withTxLock)
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Tax Payment.`);
                throw new Error('STOP_SYNC');
              }

              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleRegistryContract.recordTaxPayment(
                  createEventDto.tokenId,
                  new Date().getFullYear(),
                  Math.floor(new Date(payload.validUntil).getTime() / 1000),
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, taxYear: new Date().getFullYear(), amount: payload.amount }))
                );
                const receipt = await tx.wait();
                console.log('[EventService] ✅ TAX_STATUS Transaction Confirmed!');
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Tax sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.taxPaymentRepository.save(tax);
          break;
        }
        case 'FLAG_UPDATED': {
          console.log('[EventService] 🚩 FLAG_UPDATED event');
          if (payload.flag && payload.value !== undefined) {
            const flagKey = payload.flag.toUpperCase();
            const flagsSet = new Set(vehicle.activeFlags || []);
            if (payload.value) {
              flagsSet.add(flagKey as any);
              vehicle.activeFlags = Array.from(flagsSet);
              vehicle.transferLocked = true;
              vehicleUpdated = true;

              // Create a new VehicleFlagRecord row
              const flagRecord = this.vehicleFlagRepository.create({
                tokenId: vehicle.tokenId,
                flag: flagKey as any,
                active: true,
                sourceAddress: createEventDto.actor || 'SYSTEM',
                refHash: '',
                caseDocUrl: payload.caseDocUrl || payload.reason || null,
                details: null,
                statusTimeline: [],
                txHash: null,
              });
              // Blockchain Interaction (wrapped in withTxLock)
              if (!createEventDto.txHash) {
                try {
                  await Promise.race([
                    this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                  ]);

                  const flagMap = { 'stolen': 1 << 0, 'seized': 1 << 1, 'major_accident': 1 << 2, 'flood': 1 << 3, 'total_loss': 1 << 4 };
                  if (flagMap[payload.flag]) {
                    txHash = await this.blockchainService.withTxLock(async () => {
                      const tx = await this.blockchainService.vehicleRegistryContract.setFlag(
                        createEventDto.tokenId,
                        flagMap[payload.flag],
                        payload.value,
                        ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, flag: payload.flag, value: payload.value, actor: createEventDto.actor }))
                      );
                      const receipt = await tx.wait();
                      console.log('[EventService] ✅ FLAG_UPDATED (set) Transaction Confirmed!');
                      return receipt.hash;
                    });
                  }
                } catch (err) {
                  console.warn(`[EventService] Blockchain Flag Update sync failed: ${err.message || err}`);
                  throw err;
                }
              } // end if (!createEventDto.txHash)
              await this.vehicleFlagRepository.save(flagRecord);
            } else {
              // ── Scenario 3: Return to Owner ──
              flagsSet.delete(flagKey as any);
              vehicle.activeFlags = Array.from(flagsSet);
              // Only unlock transfer if no more active flags
              if (flagsSet.size === 0) {
                vehicle.transferLocked = false;
              }
              vehicleUpdated = true;

              // Find and deactivate the active flag record
              const activeFlagRecord = await this.vehicleFlagRepository.findOne({
                where: { tokenId: vehicle.tokenId, flag: flagKey as any, active: true }
              });
              // Blockchain Interaction (wrapped in withTxLock)
              if (!createEventDto.txHash) {
                try {
                  await Promise.race([
                    this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                  ]);

                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

                  const flagMap = { 'STOLEN': 1 << 0, 'SEIZED': 1 << 1, 'MAJOR_ACCIDENT': 1 << 2, 'FLOOD': 1 << 3, 'TOTAL_LOSS': 1 << 4 };
                  if (flagMap[flagKey]) {
                    txHash = await this.blockchainService.withTxLock(async () => {
                      const tx = await this.blockchainService.vehicleRegistryContract.setFlag(
                        createEventDto.tokenId,
                        flagMap[flagKey],
                        false,
                        ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, flag: flagKey, value: false, actor: createEventDto.actor }))
                      );
                      const receipt = await tx.wait();
                      console.log('[EventService] ✅ FLAG_UPDATED (clear) Transaction Confirmed!');
                      return receipt.hash;
                    });
                  }
                } catch (err) {
                  console.warn(`[EventService] Blockchain Flag Update sync failed: ${err.message || err}`);
                  throw err;
                }
              } // end if (!createEventDto.txHash)
              if (activeFlagRecord) {
                activeFlagRecord.active = false;
                await this.vehicleFlagRepository.save(activeFlagRecord);
              }
            }
          }
          break;
        }
        case 'LIEN_CREATED': {
          console.log('[EventService] 🔒 LIEN_CREATED event');
          vehicle.transferLocked = true;
          vehicleUpdated = true;

          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleLienContract.createLien(
                  createEventDto.tokenId,
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, lender: payload.lender, startDate: payload.startDate })),
                  ethers.id(JSON.stringify({ rules: payload.rules, contractHash: payload.contractHash }))
                );
                const receipt = await tx.wait();
                console.log('[EventService] ✅ LIEN_CREATED Transaction Confirmed!');
                console.log('  txHash     :', receipt.hash);
                console.log('  blockNumber:', receipt.blockNumber);
                console.log('  gasUsed    :', receipt.gasUsed?.toString());
                return receipt.hash;
              });
            } catch (err) {
              console.warn(`[EventService] Blockchain Lien Creation sync failed: ${err.message || err}`);
              throw err;
            }
          } // end if (!createEventDto.txHash)
          break;
        }
        case 'LIEN_RELEASED': {
          console.log('[EventService] 🔓 LIEN_RELEASED event');
          vehicle.transferLocked = false;
          vehicleUpdated = true;

          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleLienContract.releaseLien(
                  createEventDto.tokenId
                );
                const receipt = await tx.wait();
                console.log('[EventService] ✅ LIEN_RELEASED Transaction Confirmed!');
                console.log('  txHash     :', receipt.hash);
                console.log('  blockNumber:', receipt.blockNumber);
                console.log('  gasUsed    :', receipt.gasUsed?.toString());
                return receipt.hash;
              });
            } catch (err) {
              console.warn(`[EventService] Blockchain Lien Release sync failed: ${err.message || err}`);
              throw err;
            }
          } // end if (!createEventDto.txHash)
          break;
        }
        case 'REPOSSESSION_RECORDED': {
          console.log('[EventService] ⚠️ REPOSSESSION_RECORDED event');
          vehicle.transferLocked = true;
          const repossessionFlagsSet = new Set(vehicle.activeFlags || []);
          repossessionFlagsSet.add('SEIZED' as any);
          vehicle.activeFlags = Array.from(repossessionFlagsSet);
          vehicleUpdated = true;

          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

              const FLAG_SEIZED = 1 << 1;
              const tx = await this.blockchainService.vehicleRegistryContract.setFlag(
                createEventDto.tokenId,
                FLAG_SEIZED,
                true,
                ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, date: payload.date, actor: createEventDto.actor }))
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
              console.log('[EventService] ✅ REPOSSESSION Transaction Confirmed!');
              console.log('  txHash     :', txHash);
              console.log('  blockNumber:', receipt.blockNumber);
              console.log('  gasUsed    :', receipt.gasUsed?.toString());
            } catch (err) {
              console.warn(`[EventService] Blockchain Repossession sync failed: ${err.message || err}`);
            }
          } // end if (!createEventDto.txHash)
          break;
        }
        case 'INSTALLMENT_MILESTONE_RECORDED': {
          console.log('[EventService] 💳 INSTALLMENT_MILESTONE_RECORDED event');
          // §3.1 Fix: เปลี่ยนจาก No-Op เป็นบันทึกข้อมูลการผ่อนจริง
          const installmentNo = payload.installmentNo || 1;
          const installmentAmount = payload.amount || 0;
          console.log(`  Installment #${installmentNo}, Amount: ${installmentAmount}`);
          // Record payment progress in vehicle specJson
          vehicle.specJson = {
            ...vehicle.specJson,
            lienPayments: {
              lastInstallment: installmentNo,
              lastPaymentDate: new Date().toISOString(),
              totalPaid: ((vehicle.specJson as any)?.lienPayments?.totalPaid || 0) + installmentAmount
            }
          };
          await this.vehicleRepository.save(vehicle);
          break;
        }
        case 'CONSENT_UPDATED': {
          console.log('[EventService] 📝 CONSENT_UPDATED event');
          if (payload.grantTo) {
            const grant = this.consentGrantRepository.create({
              tokenId: vehicle.tokenId,
              ownerAddress: payload.owner,
              granteeDid: payload.grantTo,
              scopes: ['PII' as any],
              scopeMask: '1',
              expiresAt: new Date(payload.expiresAt).getTime().toString(),
              grantHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, grantTo: payload.grantTo, expiresAt: payload.expiresAt })),
              nonce: Date.now().toString()
            });
            await this.consentGrantRepository.save(grant);

            // Blockchain Interaction
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

                txHash = await this.blockchainService.withTxLock(async () => {
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
                  console.log('[EventService] ✅ CONSENT_UPDATED Transaction Confirmed!');
                  console.log('  txHash     :', receipt.hash);
                  console.log('  blockNumber:', receipt.blockNumber);
                  console.log('  gasUsed    :', receipt.gasUsed?.toString());
                  return receipt.hash;
                });
              } catch (err) {
                console.warn(`[EventService] Blockchain Consent Update sync failed: ${err.message || err}`);
              }
            } // end if (!createEventDto.txHash)
          }
          break;
        }
        case 'CONSENT_REVOKED': {
          console.log('[EventService] ❌ CONSENT_REVOKED event');
          if (payload.revokeFrom) {
            const grants = await this.consentGrantRepository.find({
              where: { tokenId: vehicle.tokenId, granteeDid: payload.revokeFrom },
              order: { createdAt: 'DESC' }
            });
            if (grants.length > 0) {
              grants[0].revoked = true;

              // Blockchain Interaction (wrapped in withTxLock)
              if (!createEventDto.txHash) {
                try {
                  await Promise.race([
                    this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                  ]);

                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

                  txHash = await this.blockchainService.withTxLock(async () => {
                    const tx = await this.blockchainService.vehicleLifecycleContract.revokeWriteConsent(
                      createEventDto.tokenId,
                      ethers.isAddress(payload.revokeFrom) ? ethers.getAddress(payload.revokeFrom) : ethers.ZeroAddress
                    );
                    const receipt = await tx.wait();
                    console.log('[EventService] ✅ CONSENT_REVOKED Transaction Confirmed!');
                    return receipt.hash;
                  });
                } catch (err) {
                  console.warn(`[EventService] Blockchain Consent Revocation sync failed: ${err.message || err}`);
                  throw err;
                }
              } // end if (!createEventDto.txHash)
              await this.consentGrantRepository.save(grants[0]);
            }
          }
          break;
        }

        // --- Read Consent: routes to VehicleConsent.sol (read-only access) ---
        case 'READ_CONSENT_GRANTED': {
          console.log('[EventService] 👁️ READ_CONSENT_GRANTED event');
          if (payload.grantTo) {
            const grant = this.consentGrantRepository.create({
              tokenId: vehicle.tokenId,
              ownerAddress: payload.owner,
              granteeDid: payload.grantTo,
              scopes: payload.scopes || ['VEHICLE_IDENTITY' as any],
              scopeMask: payload.scopeMask || '1',
              expiresAt: new Date(payload.expiresAt).getTime().toString(),
              grantHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, grantTo: payload.grantTo, scopes: payload.scopes })),
              nonce: Date.now().toString()
            });
            await this.consentGrantRepository.save(grant);

            // Blockchain Interaction → VehicleConsent.sol (READ)
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleConsentContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

                const granteeDid = ethers.id(payload.grantTo);
                const scopeMask = payload.scopeMask || 1;
                const expiresAt = Math.floor(new Date(payload.expiresAt).getTime() / 1000);
                const nonce = Date.now();

                const tx = await this.blockchainService.vehicleConsentContract.grantConsent(
                  createEventDto.tokenId,
                  granteeDid,
                  scopeMask,
                  expiresAt,
                  payload.singleUse || false,
                  nonce
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;
                console.log(`[EventService] ✅ Read Consent granted via VehicleConsent.sol: ${txHash}`);
              } catch (err) {
                console.warn(`[EventService] Blockchain Read Consent sync failed: ${err.message || err}`);
              }
            } // end if (!createEventDto.txHash)
          }
          break;
        }

        case 'READ_CONSENT_REVOKED': {
          console.log('[EventService] 🚫 READ_CONSENT_REVOKED event');
          if (payload.grantHash) {
            const grants = await this.consentGrantRepository.find({
              where: { tokenId: vehicle.tokenId, granteeDid: payload.revokeFrom },
              order: { createdAt: 'DESC' }
            });
            if (grants.length > 0) {
              grants[0].revoked = true;
              await this.consentGrantRepository.save(grants[0]);

              // Blockchain Interaction → VehicleConsent.sol (READ)
              if (!createEventDto.txHash) {
                try {
                  await Promise.race([
                    this.blockchainService.vehicleConsentContract.runner?.provider?.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                  ]);

                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

                  const tx = await this.blockchainService.vehicleConsentContract.revokeConsent(
                    createEventDto.tokenId,
                    payload.grantHash
                  );
                  const receipt = await tx.wait();
                  txHash = receipt.hash;
                  console.log(`[EventService] ✅ Read Consent revoked via VehicleConsent.sol: ${txHash}`);
                } catch (err) {
                  console.warn(`[EventService] Blockchain Read Consent Revocation sync failed: ${err.message || err}`);
                }
              } // end if (!createEventDto.txHash)
            }
          }
          break;
        }

        case 'INSURANCE_POLICY_UPDATED': {
          console.log('[EventService] 🛡️ INSURANCE_POLICY_UPDATED event');
          const policyNumber = payload.policyNo || payload.policyNumber;
          if (policyNumber) {
            const policy = this.insurancePolicyRepository.create({
              tokenId: vehicle.tokenId,
              insurerAddress: createEventDto.actor,
              policyNo: policyNumber,
              policyNoHash: ethers.id(policyNumber),
              action: 'NEW' as any,
              validFrom: new Date(payload.validFrom || Date.now()).getTime().toString(),
              validTo: new Date(payload.validUntil || payload.endDate || Date.now()).getTime().toString(),
              coverageDetails: { type: payload.coverageType || payload.type, class: '1', coverageItems: [] },
              coverageHash: ethers.id(JSON.stringify({ type: payload.coverageType || payload.type, policyNo: policyNumber })),
              // §4.3 Fix: Map evidence URL + premium/deductible from payload
              policyDocUrl: createEventDto.evidence?.[0]?.url || null,
              premiumAmount: payload.premiumAmount ? (payload.premiumAmount * 100).toString() : null,
              deductible: payload.deductible ? (payload.deductible * 100).toString() : null,
            });
            await this.insurancePolicyRepository.save(policy);

            // Blockchain Interaction
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                try {
                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                  console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Insurance Policy.`);
                  throw new Error('STOP_SYNC');
                }

                txHash = await this.blockchainService.withTxLock(async () => {
                  const actionMap = { 'new': 0, 'renew': 1, 'change': 2, 'cancel': 3 };
                  const tx = await this.blockchainService.vehicleLifecycleContract.recordInsurancePolicy(
                    createEventDto.tokenId,
                    ethers.id(policyNumber),
                    actionMap[payload.type?.toLowerCase()] || 0,
                    Math.floor(new Date(payload.startDate || payload.validFrom || Date.now()).getTime() / 1000),
                    Math.floor(new Date(payload.validUntil || payload.endDate || Date.now()).getTime() / 1000),
                    ethers.id(JSON.stringify({ policyNo: policyNumber, coverageType: payload.coverageType || payload.type }))
                  );
                  const receipt = await tx.wait();
                  console.log('[EventService] \u2705 INSURANCE_POLICY Transaction Confirmed!');
                  return receipt.hash;
                });
              } catch (err) {
                if (err.message !== 'STOP_SYNC') {
                  console.warn(`[EventService] Blockchain Insurance sync failed: ${err.message || err}`);
                  throw err;
                }
              }
            } // end if (!createEventDto.txHash)
          }
          break;
        }

        case 'CLAIM_FILED': {
          console.log('[EventService] 📄 CLAIM_FILED event');
          const claim = this.insuranceClaimRepository.create({
            tokenId: vehicle.tokenId,
            claimNo: payload.claimId || `CLM-${Date.now()}`,
            claimNoHash: ethers.id(payload.claimId || 'none'),
            filedAt: new Date(payload.date || Date.now()).getTime().toString(),
            status: 'FILED' as any,
            severity: (payload.severity?.toUpperCase() || 'MINOR') as any,
            // §4.1 Fix: Map evidence files & hashes from Frontend instead of hardcoding []
            evidenceFiles: (createEventDto.evidence || []).map((e: any) => ({
              type: e.mime?.startsWith('image/') ? 'photo' : 'other',
              url: e.url,
              hash: e.hash,
              mime: e.mime,
            })),
            evidenceHashes: (createEventDto.evidence || []).map((e: any) => e.hash),
            // Map the estimate document URL if any non-image evidence was uploaded
            estimateDocUrl: (createEventDto.evidence || []).find((e: any) => !e.mime?.startsWith('image/'))?.url || null,
          });
          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Claim.`);
                throw new Error('STOP_SYNC');
              }

              txHash = await this.blockchainService.withTxLock(async () => {
                const evidenceHashes = createEventDto.evidence && createEventDto.evidence.length > 0
                  ? [createEventDto.evidence[0].hash]
                  : [];
                const severityMap = { 'minor': 0, 'major': 1, 'structural': 2, 'total_loss': 3 };
                const tx = await this.blockchainService.vehicleLifecycleContract.fileClaim(
                  createEventDto.tokenId,
                  ethers.id(payload.claimId || 'none'),
                  evidenceHashes,
                  severityMap[payload.severity?.toLowerCase()] || 0
                );
                const receipt = await tx.wait();
                console.log('[EventService] ✅ CLAIM_FILED Transaction Confirmed!');
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Claim sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.insuranceClaimRepository.save(claim);

          // §3.2 Fix: TOTAL_LOSS Auto-Flag
          if (payload.severity?.toLowerCase() === 'total_loss') {
            console.log('[EventService] 💀 TOTAL_LOSS detected! Auto-flagging vehicle...');
            vehicle.activeFlags = vehicle.activeFlags || [];
            const flagsSet = new Set<any>(vehicle.activeFlags);
            if (!flagsSet.has('TOTAL_LOSS')) {
              flagsSet.add('TOTAL_LOSS');
              vehicle.activeFlags = Array.from(flagsSet);
              vehicle.transferLocked = true;
              await this.vehicleRepository.save(vehicle);

              // Save flag record
              const flagRecord = this.vehicleFlagRepository.create({
                tokenId: vehicle.tokenId,
                flag: 'TOTAL_LOSS' as any,
                active: true,
                sourceAddress: createEventDto.actor,
                refHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, reason: 'TOTAL_LOSS_CLAIM', claimId: payload.claimId })),
                details: { autoFlagged: true, claimId: payload.claimId, severity: 'total_loss' },
                statusTimeline: [{ status: 'SET', at: new Date().toISOString(), note: 'Auto-flagged from CLAIM_FILED severity=total_loss' }],
              });
              await this.vehicleFlagRepository.save(flagRecord);
            }
            // Sync flag to blockchain
            if (!createEventDto.txHash) {
              try {
                const FLAG_TOTAL_LOSS = 1 << 4;
                const flagTx = await this.blockchainService.vehicleRegistryContract.setFlag(
                  createEventDto.tokenId,
                  FLAG_TOTAL_LOSS,
                  true,
                  ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, reason: 'TOTAL_LOSS_CLAIM', claimId: payload.claimId }))
                );
                await flagTx.wait();
                console.log('[EventService] ✅ TOTAL_LOSS flag set on chain');
              } catch (flagErr) {
                console.warn(`[EventService] TOTAL_LOSS flag sync failed: ${flagErr.message}`);
              }
            }
          }
          break;
        }

        case 'INSURER_APPROVED_ESTIMATE': {
          // §3.3 Fix: อัปเดต claim status เป็น APPROVED
          console.log('[EventService] ✅ INSURER_APPROVED_ESTIMATE event');
          if (payload.estimateId) {
            const claims = await this.insuranceClaimRepository.find({ where: { tokenId: vehicle.tokenId } });
            const latestClaim = claims.sort((a, b) => Number(b.filedAt) - Number(a.filedAt))[0];
            if (latestClaim) {
              latestClaim.status = 'APPROVED' as any;
              await this.insuranceClaimRepository.save(latestClaim);
              console.log(`  Claim ${latestClaim.claimNo} approved, amount: ${payload.amount}`);
            }
          }
          break;
        }

        case 'INSPECTION_RESULT_RECORDED': {
          console.log('[EventService] 🔍 INSPECTION_RESULT_RECORDED event');
          const inspMetrics = payload.metrics || {};
          const inspection = this.inspectionRepository.create({
            tokenId: vehicle.tokenId,
            stationAddress: createEventDto.actor,
            // §4.4 Fix: Use stationId from payload instead of hardcoding
            stationName: payload.stationId || 'Authorized Station',
            vinVerified: true,
            result: payload.passed ? 'PASS' as any : 'FAIL' as any,
            metrics: payload.metrics || {},
            metricsHash: ethers.id(JSON.stringify(payload.metrics || {})),
            certHash: payload.certHash || ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, passed: payload.passed, inspectedAt: Date.now() })),
            issuedAt: Date.now().toString(),
            // §4.4 Fix: Map inspection certificate URL from uploaded evidence
            certUrl: createEventDto.evidence?.[0]?.url || null,
          });
          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleRegistryContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Inspection.`);
                throw new Error('STOP_SYNC');
              }

              txHash = await this.blockchainService.withTxLock(async () => {
                const tx = await this.blockchainService.vehicleRegistryContract.recordInspection(
                  createEventDto.tokenId,
                  payload.passed ? 1 : 0,
                  ethers.id(JSON.stringify(payload.metrics || {})),
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, passed: payload.passed, inspectedAt: Date.now() }))
                );
                const receipt = await tx.wait();
                console.log('[EventService] ✅ INSPECTION Transaction Confirmed!');
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Inspection sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.inspectionRepository.save(inspection);
          break;
        }

        case 'MAINTENANCE_RECORDED': {
          console.log('[EventService] 🔧 MAINTENANCE_RECORDED event');
          // §4.2 Fix: Use payload.jobs (FE field name) instead of payload.parts
          const maintJobs = payload.jobs || payload.parts || [];
          const maintenance = this.maintenanceLogRepository.create({
            tokenId: vehicle.tokenId,
            workshopAddress: createEventDto.actor,
            writeConsentRefHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, workshop: createEventDto.actor })),
            occurredAt: payload.date ? new Date(payload.date).getTime().toString() : Date.now().toString(),
            mileageKm: payload.mileageKm || 0,
            // BUG-DATA-01 Fix: FE sends 'jobs' not 'parts'
            jobs: maintJobs,
            // BUG-DATA-02 Fix: Map jobs description as symptoms (FE doesn't send 'description')
            symptoms: maintJobs.length > 0 ? maintJobs.join(', ') : (payload.description || null),
            maintenanceHash: ethers.id(JSON.stringify({ tokenId: vehicle.tokenId, mileageKm: payload.mileageKm, jobs: maintJobs })),
            // BUG-DATA-01 Fix: Hash actual jobs data, not empty parts
            partsHash: ethers.id(JSON.stringify(maintJobs)),
            // BUG-DATA-03 Fix: Map evidence URL/hash to invoiceUrl, photos, and laborCost
            invoiceUrl: createEventDto.evidence?.[0]?.url || null,
            invoiceHash: createEventDto.evidence?.[0]?.hash || null,
            photos: createEventDto.evidence
              ? createEventDto.evidence.map((e: any) => ({
                  type: 'after' as const,
                  url: e.url,
                  hash: e.hash,
                }))
              : null,
            laborCost: payload.cost?.total ? (payload.cost.total * 100).toString() : null,
          });
          // §3.3 Fix: Backend Mileage Validation — ห้ามไมล์ถอยหลัง
          if (payload.mileageKm) {
            const currentMileage = vehicle.specJson?.mileageKm || 0;
            if (payload.mileageKm < currentMileage) {
              throw new Error(`Mileage rollback rejected! New: ${payload.mileageKm} < Current: ${currentMileage}`);
            }
            vehicle.specJson = {
              ...vehicle.specJson,
              mileageKm: payload.mileageKm,
              lastOdometerUpdate: new Date().toISOString()
            };
            await this.vehicleRepository.save(vehicle);
            console.log(`[EventService] 📏 Mileage updated: ${currentMileage} → ${payload.mileageKm}`);
          }

          // Blockchain Interaction
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              try {
                await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
              } catch (e) {
                console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Maintenance.`);
                throw new Error('STOP_SYNC');
              }

              txHash = await this.blockchainService.withTxLock(async () => {
                // Auto-grant write consent if needed
                const adminAddress = this.blockchainService.walletAddress;
                const hasConsent = await this.blockchainService.vehicleLifecycleContract.writeConsents(createEventDto.tokenId, adminAddress);
                if (hasConsent === 0n) {
                  const owner = await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                  if (owner.toLowerCase() === adminAddress.toLowerCase()) {
                    console.log(`[EventService] Auto-granting write consent for Token ${createEventDto.tokenId} to Admin...`);
                    const consentTx = await this.blockchainService.vehicleLifecycleContract.grantWriteConsent(
                      createEventDto.tokenId, adminAddress, 1,
                      Math.floor(Date.now() / 1000) + (365 * 24 * 3600), false, Date.now()
                    );
                    await consentTx.wait();
                  }
                }

                const tx = await this.blockchainService.vehicleLifecycleContract.logMaintenance(
                  createEventDto.tokenId,
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, workshop: createEventDto.actor })),
                  payload.mileageKm || 0,
                  ethers.id(JSON.stringify({ tokenId: vehicle!.tokenId, mileageKm: payload.mileageKm, jobs: maintJobs })),
                  ethers.id(JSON.stringify(maintJobs)),
                  0,
                  Math.floor(Date.now() / 1000)
                );
                const receipt = await tx.wait();
                console.log('[EventService] \u2705 MAINTENANCE Transaction Confirmed!');
                return receipt.hash;
              });
            } catch (err) {
              if (err.message !== 'STOP_SYNC') {
                console.warn(`[EventService] Blockchain Maintenance sync failed: ${err.message || err}`);
                throw err;
              }
            }
          } // end if (!createEventDto.txHash)
          await this.maintenanceLogRepository.save(maintenance);
          break;
        }

        case 'ODOMETER_SNAPSHOT': {
          // §3.3 Fix: Monotonic mileage check + update specJson
          console.log('[EventService] 📏 ODOMETER_SNAPSHOT event');
          const newMileage = payload.mileageKm || 0;
          const currentMileage = vehicle.specJson?.mileageKm || 0;
          if (newMileage < currentMileage) {
            throw new Error(`Odometer rollback detected! New: ${newMileage} < Current: ${currentMileage}. Rejecting.`);
          }
          vehicle.specJson = {
            ...vehicle.specJson,
            mileageKm: newMileage,
            lastOdometerUpdate: new Date().toISOString()
          };
          await this.vehicleRepository.save(vehicle);
          console.log(`  Mileage updated: ${currentMileage} → ${newMileage}`);
          break;
        }
        case 'CRITICAL_PART_REPLACED': {
          console.log('[EventService] ⚙️ CRITICAL_PART_REPLACED event');
          if (payload.partType && payload.newPartNo) {
            // Update DB specification
            const spec = vehicle.specJson || {};
            spec[payload.partType.toLowerCase()] = payload.newPartNo;
            vehicle.specJson = spec;
            vehicleUpdated = true;

            // Blockchain Interaction
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                try {
                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                  console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Part Certification.`);
                  throw new Error('STOP_SYNC');
                }

                // Use logEvent (Generic) to record the part certification
                const PART_CERTIFICATION_EVENT_TYPE = 200;
                const tx = await this.blockchainService.vehicleLifecycleContract.logEvent(
                  createEventDto.tokenId,
                  PART_CERTIFICATION_EVENT_TYPE,
                  Math.floor(Date.now() / 1000),
                  ethers.id(JSON.stringify({ type: payload.partType, sn: payload.newPartNo })),
                  ethers.id(payload.reason || 'Certification')
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;
                console.log(`[EventService] ✅ Critical Part Certification synced: ${txHash}`);
              } catch (err) {
                if (err.message !== 'STOP_SYNC') {
                  console.warn(`[EventService] Blockchain Part Certification sync failed: ${err.message || err}`);
                }
              }
            } // end if (!createEventDto.txHash)
          }
          break;
        }
        case 'WORKSHOP_ESTIMATE_SUBMITTED': {
          console.log('[EventService] 💵 WORKSHOP_ESTIMATE_SUBMITTED event');
          if (payload.total) {
            // Blockchain Interaction
            if (!createEventDto.txHash) {
              try {
                await Promise.race([
                  this.blockchainService.vehicleLifecycleContract.runner?.provider?.getNetwork(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
                ]);

                try {
                  await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);
                } catch (e) {
                  console.info(`[EventService] ℹ️ Token ${createEventDto.tokenId} not on-chain. Skipping sync for Appraisal.`);
                  throw new Error('STOP_SYNC');
                }

                // Use logEvent (Generic) to record the appraisal/estimate
                const APPRAISAL_EVENT_TYPE = 201;
                const tx = await this.blockchainService.vehicleLifecycleContract.logEvent(
                  createEventDto.tokenId,
                  APPRAISAL_EVENT_TYPE,
                  Math.floor(Date.now() / 1000),
                  ethers.id(JSON.stringify({ total: payload.total, jobs: payload.jobs })),
                  ethers.id(payload.id || 'Estimating')
                );
                const receipt = await tx.wait();
                txHash = receipt.hash;
                console.log(`[EventService] ✅ Repair Appraisal synced: ${txHash}`);
              } catch (err) {
                if (err.message !== 'STOP_SYNC') {
                  console.warn(`[EventService] Blockchain Appraisal sync failed: ${err.message || err}`);
                }
              }
            } // end if (!createEventDto.txHash)
          }
          break;
        }
        case 'SPECIFICATION_UPDATED':
          if (payload.changes) {
            vehicle.specJson = { ...vehicle.specJson, ...payload.changes };
            vehicleUpdated = true;
          }
          break;

        // --- Escrow: routes to VehicleLien.sol ---
        case 'ESCROW_CREATED': {
          console.log('[EventService] 🏦 ESCROW_CREATED event');
          if (!createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              await this.blockchainService.vehicleNFTContract.ownerOf(createEventDto.tokenId);

              const escrowId = ethers.id(`escrow-${createEventDto.tokenId}-${Date.now()}`);
              const buyerAddress = ethers.isAddress(payload.buyer) ? ethers.getAddress(payload.buyer) : ethers.ZeroAddress;
              const conditionsMask = payload.conditionsMask || 3; // payment + lien_released
              const depositAmount = ethers.parseEther(payload.depositAmount?.toString() || '0');

              const tx = await this.blockchainService.vehicleLienContract.createEscrow(
                escrowId,
                createEventDto.tokenId,
                buyerAddress,
                conditionsMask,
                ethers.ZeroAddress, // native coin
                depositAmount
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
              console.log('[EventService] ✅ ESCROW_CREATED Transaction Confirmed!');
              console.log('  txHash     :', txHash);
              console.log('  blockNumber:', receipt.blockNumber);
              console.log('  gasUsed    :', receipt.gasUsed?.toString());
              console.log(`[EventService] ✅ Escrow created: ${txHash}`);
            } catch (err) {
              console.warn(`[EventService] Blockchain Escrow creation failed: ${err.message || err}`);
            }
          } // end if (!createEventDto.txHash)
          break;
        }

        case 'ESCROW_FUNDED': {
          console.log('[EventService] 💸 ESCROW_FUNDED event');
          if (payload.escrowId && !createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              const tx = await this.blockchainService.vehicleLienContract.fundEscrowNative(
                payload.escrowId,
                { value: ethers.parseEther(payload.amount?.toString() || '0') }
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
              console.log('[EventService] ✅ ESCROW_FUNDED Transaction Confirmed!');
              console.log('  txHash     :', txHash);
              console.log('  blockNumber:', receipt.blockNumber);
              console.log('  gasUsed    :', receipt.gasUsed?.toString());
              console.log(`[EventService] ✅ Escrow funded: ${txHash}`);
            } catch (err) {
              console.warn(`[EventService] Blockchain Escrow funding failed: ${err.message || err}`);
            }
          } // end if
          break;
        }

        case 'ESCROW_RELEASED': {
          console.log('[EventService] 🎁 ESCROW_RELEASED event');
          if (payload.escrowId && payload.condition && !createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              const tx = await this.blockchainService.vehicleLienContract.fulfillCondition(
                payload.escrowId,
                payload.condition
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
              console.log('[EventService] ✅ ESCROW_RELEASED Transaction Confirmed!');
              console.log('  txHash     :', txHash);
              console.log('  blockNumber:', receipt.blockNumber);
              console.log('  gasUsed    :', receipt.gasUsed?.toString());
              console.log(`[EventService] ✅ Escrow condition fulfilled: ${txHash}`);
            } catch (err) {
              console.warn(`[EventService] Blockchain Escrow release failed: ${err.message || err}`);
            }
          } // end if
          break;
        }

        case 'ESCROW_CANCELLED': {
          console.log('[EventService] 🚫 ESCROW_CANCELLED event');
          if (payload.escrowId && !createEventDto.txHash) {
            try {
              await Promise.race([
                this.blockchainService.vehicleLienContract.runner?.provider?.getNetwork(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Blockchain unreachable')), 2000))
              ]);

              const tx = await this.blockchainService.vehicleLienContract.cancelEscrow(
                payload.escrowId
              );
              const receipt = await tx.wait();
              txHash = receipt.hash;
              console.log('[EventService] ✅ ESCROW_CANCELLED Transaction Confirmed!');
              console.log('  txHash     :', txHash);
              console.log('  blockNumber:', receipt.blockNumber);
              console.log('  gasUsed    :', receipt.gasUsed?.toString());
              console.log(`[EventService] ✅ Escrow cancelled: ${txHash}`);
            } catch (err) {
              console.warn(`[EventService] Blockchain Escrow cancellation failed: ${err.message || err}`);
            }
          } // end if
          break;
        }

        case 'DISCLOSURE_SIGNED': {
          console.log('[EventService] 📝 DISCLOSURE_SIGNED event');
          if (vehicle) {
            const spec = vehicle.specJson || {};
            spec.disclosures = spec.disclosures || [];
            spec.disclosures.push({
              signedAt: payload.signedAt || new Date().toISOString(),
              signedBy: payload.signedBy || createEventDto.actor,
              disclosureType: payload.disclosureType || 'CONDITION_REPORT',
              notes: payload.notes || '',
            });
            vehicle.specJson = spec;
            vehicleUpdated = true;
            console.log(`  ✅ Disclosure recorded: ${payload.disclosureType || 'CONDITION_REPORT'}`);
          }
          break;
        }

        case 'TRADEIN_EVALUATED': {
          console.log('[EventService] 🏷️ TRADEIN_EVALUATED event');
          if (vehicle) {
            const spec = vehicle.specJson || {};
            spec.tradeInEvaluations = spec.tradeInEvaluations || [];
            spec.tradeInEvaluations.push({
              evaluatedAt: payload.evaluatedAt || new Date().toISOString(),
              evaluatedBy: payload.evaluatedBy || createEventDto.actor,
              evaluationPrice: payload.evaluationPrice || 0,
              condition: payload.condition || 'FAIR',
              notes: payload.notes || '',
            });
            vehicle.specJson = spec;
            vehicleUpdated = true;
            console.log(`  ✅ Trade-in evaluated at: ${payload.evaluationPrice} THB`);
          }
          break;
        }
      }

      if (vehicleUpdated) {
        await this.vehicleRepository.save(vehicle);
      }
    } // end else (non-MANUFACTURER_MINTED)

    const finalTxHash = createEventDto.txHash || txHash;

    console.log('\n╔══════════════════════════════════════════════════════════════');
    console.log('║ 💾 [EventService] SAVING EVENT TO DATABASE');
    console.log('╠══════════════════════════════════════════════════════════════');
    console.log('║ Type         :', createEventDto.type);
    console.log('║ TokenID      :', createEventDto.tokenId);
    console.log('║ payloadHash  :', payloadHash);
    console.log('║ txHash (final):', finalTxHash || '(none)');
    console.log('║   └─ source  :', createEventDto.txHash ? 'Frontend' : (txHash ? 'Backend' : 'N/A'));
    console.log('╚══════════════════════════════════════════════════════════════\n');

    const event = this.eventLogRepository.create({
      ...createEventDto,
      actorAddress: createEventDto.actor || '0x00',
      actorRole: (createEventDto.actorRole === 'DLT_OFFICER' ? 'DLT' :
        createEventDto.actorRole === 'LENDER' ? 'FINANCE' :
          createEventDto.actorRole === 'SERVICE_PROVIDER' ? 'WORKSHOP' :
            createEventDto.actorRole === 'INSPECTOR' ? 'INSPECT' :
              createEventDto.actorRole === 'CONSUMER' ? 'OWNER' :
                createEventDto.actorRole) || 'OWNER',
      occurredAt: createEventDto.occurredAt || Date.now().toString(),
      payloadHash: payloadHash,
      evidence: createEventDto.evidence || null,
      evidenceHash: createEventDto.evidence && createEventDto.evidence.length > 0 ? createEventDto.evidence[0].hash : null,
      txHash: finalTxHash,
    }) as any;

    const savedEvent = await this.eventLogRepository.save(event);
    console.log(`[EventService] ✅ Event saved to DB with ID: ${savedEvent.eventId}`);
    console.log('-------------------------------------------------------------------------------\n');
    return savedEvent;
  }
}
