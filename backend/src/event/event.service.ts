import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async findAll(): Promise<EventLog[]> {
    return this.eventLogRepository.find({
      order: { occurredAt: 'DESC' },
    });
  }

  async create(createEventDto: any): Promise<EventLog> {
    let vehicle = await this.vehicleRepository.findOne({ where: { tokenId: createEventDto.tokenId } });
    
    if (createEventDto.type === 'MANUFACTURER_MINTED') {
      if (!vehicle) {
        const payload = createEventDto.payload;
        vehicle = this.vehicleRepository.create({
          tokenId: createEventDto.tokenId,
          vinNumber: payload.vin,
          vinHash: payload.vin, // MOCK hashing for prototype
          manufacturerAddress: createEventDto.actor,
          manufacturedAt: new Date(payload.production?.manufacturedAt || Date.now()).getTime().toString(),
          modelJson: { model: payload.makeModelTrim, year: new Date().getFullYear() },
          modelHash: 'mockHash',
          specJson: payload.spec || {},
          specHash: 'mockHash',
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
              fromAddress: payload.from || createEventDto.actor,
              toAddress: payload.to,
              reason: 'RESALE' as any, // Mock default reason
              transferredAt: new Date(payload.date || Date.now()).getTime().toString(),
              docHash: 'mockHash',
              salePrice: payload.price ? (payload.price * 100).toString() : null,
              currency: 'THB'
            });
            await this.ownershipTransferRepository.save(transfer);
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
             greenBookNo: payload.bookNo || `BOOK-${Date.now()}`,
             greenBookNoHash: 'mockHash',
             registeredAt: Date.now().toString(),
             registrationDocHash: 'mockHash',
             dltOfficerAddress: createEventDto.actor
          });
          await this.registrationRepository.save(reg);
          break;
        case 'PLATE_EVENT_RECORDED':
          const plate = this.plateRecordRepository.create({
             tokenId: vehicle.tokenId,
             eventType: payload.type === 'issue' ? 'ISSUE' : payload.type === 'change' ? 'CHANGE' : 'LOST' as any,
             plateNo: payload.plateNo,
             plateNoHash: 'mockHash',
             provinceCode: 10, // Mock for Bangkok
             effectiveAt: Date.now().toString(),
             plateEventDocHash: 'mockHash'
          });
          await this.plateRecordRepository.save(plate);
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
          }
          break;
        case 'LIEN_CREATED':
          vehicle.transferLocked = true;
          vehicleUpdated = true;
          break;
        case 'LIEN_RELEASED':
          vehicle.transferLocked = false;
          vehicleUpdated = true;
          break;
        case 'REPOSSESSION_RECORDED':
          vehicle.transferLocked = true;
          const repossessionFlagsSet = new Set(vehicle.activeFlags || []);
          repossessionFlagsSet.add('SEIZED' as any);
          vehicle.activeFlags = Array.from(repossessionFlagsSet);
          vehicleUpdated = true;
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
          }
          break;
        case 'CONSENT_REVOKED':
          if (payload.revokeFrom) {
            const grants = await this.consentGrantRepository.find({ where: { tokenId: vehicle.tokenId, granteeDid: payload.revokeFrom }, order: { createdAt: 'DESC' } });
            if (grants.length > 0) {
               grants[0].revoked = true;
               await this.consentGrantRepository.save(grants[0]);
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
          break;
        case 'ODOMETER_SNAPSHOT':
           // Could save a mini maintenance log or just an event. The event handles it for now.
          break;
        case 'CRITICAL_PART_REPLACED':
          // Mock structure for part replacements inside Maintenance Log or as pure Event
          break;
        case 'SPECIFICATION_UPDATED':
          // E.g., engine swapped or color changed
          if (payload.changes) {
              vehicle.specJson = { ...vehicle.specJson, ...payload.changes };
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
      actorRole: createEventDto.actor?.startsWith('MANUFACTURER') ? 'MANUFACTURER' : 'CONSUMER',
      occurredAt: createEventDto.occurredAt || Date.now().toString(),
      payloadHash: 'mockHash', 
    }) as any;
    
    return this.eventLogRepository.save(event);
  }
}

