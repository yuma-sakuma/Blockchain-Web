import { AppDataSource } from './data-source';
import {
  Vehicle,
  Registration,
  Inspection,
  MaintenanceLog,
  PartReplacement,
  TaxPayment,
  InsurancePolicy,
  InsuranceClaim,
  PlateRecord,
  EventLog,
  OwnershipTransfer,
  Disclosure,
  LoanAccount,
  ConsentGrant,
  TradeInEvaluation,
  VehicleFlagRecord,
} from './entities';
import {
  RegistrationStatus,
  InspectionResult,
  TaxStatus,
  PlateEventType,
  EventType,
  ActorRole,
  InsuranceAction,
  AccidentSeverity,
  ClaimStatus,
  ClaimSeverity,
  LienStatus,
  PaymentMethod,
  TransferReason,
  ConsentScope,
  VehicleFlag,
} from './entities/enums';
import * as fs from 'fs';
import * as path from 'path';

// ── Helper: สร้าง dummy hash ──
const dHash = (prefix: string) => `0x${prefix.repeat(32).substring(0, 64)}`;
const now = () => Math.floor(Date.now() / 1000).toString();
const addr = (hex: string) => `0x${hex.repeat(20).substring(0, 40)}`;

async function seedAndExport() {
  try {
    console.log('🚀 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Connected.');

    // ── Repositories ──
    const repos = {
      vehicle: AppDataSource.getRepository(Vehicle),
      registration: AppDataSource.getRepository(Registration),
      inspection: AppDataSource.getRepository(Inspection),
      maintenance: AppDataSource.getRepository(MaintenanceLog),
      part: AppDataSource.getRepository(PartReplacement),
      tax: AppDataSource.getRepository(TaxPayment),
      insurancePolicy: AppDataSource.getRepository(InsurancePolicy),
      insuranceClaim: AppDataSource.getRepository(InsuranceClaim),
      plate: AppDataSource.getRepository(PlateRecord),
      event: AppDataSource.getRepository(EventLog),
      transfer: AppDataSource.getRepository(OwnershipTransfer),
      disclosure: AppDataSource.getRepository(Disclosure),
      loan: AppDataSource.getRepository(LoanAccount),
      consent: AppDataSource.getRepository(ConsentGrant),
      tradeIn: AppDataSource.getRepository(TradeInEvaluation),
      flag: AppDataSource.getRepository(VehicleFlagRecord),
    };

    const models = ['Tesla Model Y', 'BMW i4', 'BYD Seal', 'Mercedes EQE', 'Porsche Taycan',
      'Audi Q8 e-tron', 'Hyundai Ioniq 5', 'Kia EV6', 'Volvo EX30', 'Nissan Ariya'];
    const colors = ['Pearl White', 'Space Grey', 'Portimao Blue', 'Obsidian Black', 'Racing Green',
      'Nardo Grey', 'Glacier White', 'Midnight Blue', 'Ruby Red', 'Champagne Gold'];
    const provinces = ['กรุงเทพ', 'เชียงใหม่', 'ภูเก็ต', 'ขอนแก่น', 'สงขลา',
      'นครราชสีมา', 'ชลบุรี', 'อุดรธานี', 'สุราษฎร์ธานี', 'ระยอง'];

    // ── Cleanup: ลบข้อมูล seed เก่า (tokenId 4001-4010) ──
    console.log('🧹 Cleaning up old seed data (tokenId 4001-4010)...');
    const seedTokenIds = Array.from({ length: 10 }, (_, i) => (4001 + i).toString());
    
    // ลบ child tables ก่อน (foreign key constraint)
    for (const tid of seedTokenIds) {
      await repos.part.createQueryBuilder().delete().where('maintenanceLogId IN (SELECT id FROM maintenance_logs WHERE tokenId = :tid)', { tid }).execute();
      await repos.event.delete({ tokenId: tid });
      await repos.consent.delete({ tokenId: tid });
      await repos.disclosure.delete({ tokenId: tid });
      await repos.transfer.delete({ tokenId: tid });
      await repos.tradeIn.delete({ tokenId: tid });
      await repos.flag.delete({ tokenId: tid });
      await repos.loan.delete({ tokenId: tid });
      await repos.insuranceClaim.delete({ tokenId: tid });
      await repos.insurancePolicy.delete({ tokenId: tid });
      await repos.tax.delete({ tokenId: tid });
      await repos.maintenance.delete({ tokenId: tid });
      await repos.inspection.delete({ tokenId: tid });
      await repos.plate.delete({ tokenId: tid });
      await repos.registration.delete({ tokenId: tid });
      await repos.vehicle.delete({ tokenId: tid });
    }
    // Fix vehicle_flags: ตาราง bigint auto_increment เสีย → สร้างใหม่
    await AppDataSource.query('DROP TABLE IF EXISTS vehicle_flags');
    await AppDataSource.query(`
      CREATE TABLE vehicle_flags (
        id BIGINT NOT NULL AUTO_INCREMENT,
        tokenId BIGINT NOT NULL,
        flag ENUM('STOLEN','SEIZED','MAJOR_ACCIDENT','FLOOD','TOTAL_LOSS','SCRAPPED','REG_CANCELLED') NOT NULL,
        active TINYINT NOT NULL,
        sourceAddress VARCHAR(100) NOT NULL,
        refHash VARCHAR(66) NOT NULL,
        caseDocUrl TEXT NULL,
        details JSON NULL,
        statusTimeline JSON NULL,
        txHash VARCHAR(66) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX IDX_vehicle_flags_tokenId (tokenId),
        CONSTRAINT FK_vehicle_flags_vehicle FOREIGN KEY (tokenId) REFERENCES vehicles(tokenId) ON DELETE CASCADE
      )
    `);
    console.log('✅ Cleanup done.\n');

    console.log('🌱 Seeding 10 records for ALL 16 entities...\n');

    for (let i = 1; i <= 10; i++) {
      const tokenId = (4000 + i).toString();
      const ts = now();

      // ── 1. Vehicle ──
      const v = new Vehicle();
      v.tokenId = tokenId;
      v.vinNumber = `VIN${2025000000 + i}`;
      v.vinHash = dHash(i.toString(16).padStart(2, '0'));
      v.manufacturerAddress = addr('aa');
      v.manufacturedAt = ts;
      v.currentOwnerAddress = addr(i.toString(16).padStart(2, '0'));
      v.modelJson = { model: models[i - 1], year: 2025 };
      v.modelHash = dHash('bb');
      v.warrantyJson = { startPolicy: '2025-01-01', terms: { durationYears: 5, maxKm: 100000 } };
      v.specJson = { color: colors[i - 1], battery: `${75 + i}kWh`, range: `${400 + i * 10}km` };
      v.specHash = dHash('cc');
      v.manufacturerSignature = `0xSIG_MANUFACTURER_${i}`;
      v.mintTxHash = dHash(i.toString(16).padStart(2, '0'));
      v.registrationStatus = RegistrationStatus.REGISTERED;
      v.transferLocked = i === 5; // ตัวอย่าง: token 4005 ถูกล็อก
      v.activeFlags = i === 3 ? [VehicleFlag.MAJOR_ACCIDENT] : null;
      v.ownerCount = i <= 5 ? 1 : 2;
      await repos.vehicle.save(v);

      // ── 2. Registration ──
      const reg = new Registration();
      reg.tokenId = tokenId;
      reg.status = RegistrationStatus.REGISTERED;
      reg.registeredAt = ts;
      reg.dltOfficerAddress = addr('dd');
      reg.greenBookNo = `GB-${5000 + i}`;
      reg.greenBookNoHash = dHash('ee');
      reg.registrationDocUrl = `https://storage.example.com/docs/reg_${tokenId}.pdf`;
      reg.registrationDocHash = dHash('ff');
      reg.ownerIdentityAtReg = { name: `Owner ${i}`, nationalId: `1234567890${i}`, address: `${i} Main St, BKK` };
      reg.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.registration.save(reg);

      // ── 3. Plate Record ──
      const plate = new PlateRecord();
      plate.tokenId = tokenId;
      plate.plateNo = `${i}กข ${1000 + i}`;
      plate.plateNoHash = dHash('00');
      plate.provinceCode = i;
      plate.eventType = PlateEventType.ISSUE;
      plate.effectiveAt = ts;
      plate.plateEventDocHash = dHash('01');
      plate.reason = 'ออกป้ายทะเบียนใหม่';
      plate.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.plate.save(plate);

      // ── 4. Inspection ──
      const insp = new Inspection();
      insp.tokenId = tokenId;
      insp.stationAddress = addr('11');
      insp.stationName = `ตรอ. สถานี ${provinces[i - 1]}`;
      insp.vinVerified = true;
      insp.result = i === 7 ? InspectionResult.FAIL : InspectionResult.PASS;
      insp.metrics = {
        emission: { value: 0.1 + i * 0.05, unit: 'g/km CO2', pass: i !== 7 },
        brake: { value: 85 + i, unit: '%', pass: true },
        lights: { pass: true, notes: 'All lights functional' },
        suspension: { pass: i !== 7, notes: i === 7 ? 'Left shock absorber worn' : 'Normal' },
      };
      insp.metricsHash = dHash('12');
      insp.certHash = dHash('13');
      insp.certUrl = `https://storage.example.com/certs/insp_${tokenId}.pdf`;
      insp.issuedAt = ts;
      insp.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.inspection.save(insp);

      // ── 5. Maintenance Log ──
      const maint = new MaintenanceLog();
      maint.tokenId = tokenId;
      maint.workshopAddress = addr('22');
      maint.writeConsentRefHash = dHash('21');
      maint.mileageKm = 5000 * i;
      maint.occurredAt = ts;
      maint.symptoms = i % 2 === 0 ? 'Engine warning light on' : null;
      maint.jobs = ['Oil Change', 'Tire Rotation', 'Brake Pad Inspection'];
      maint.laborCost = (150000 + i * 10000).toString();
      maint.maintenanceHash = dHash('23');
      maint.partsHash = dHash('24');
      maint.accidentSeverity = i === 3 ? AccidentSeverity.MAJOR : AccidentSeverity.NONE;
      maint.invoiceUrl = `https://storage.example.com/invoices/maint_${tokenId}.pdf`;
      maint.invoiceHash = dHash('25');
      maint.technicianId = `TECH-${100 + i}`;
      maint.photos = [
        { type: 'before', url: `https://storage.example.com/photos/b_${tokenId}.jpg`, hash: dHash('26') },
        { type: 'after', url: `https://storage.example.com/photos/a_${tokenId}.jpg`, hash: dHash('27') },
      ];
      maint.txHash = dHash(i.toString(16).padStart(2, '0'));
      const savedMaint = await repos.maintenance.save(maint);

      // ── 6. Part Replacement (child of MaintenanceLog) ──
      const part = new PartReplacement();
      part.maintenanceLogId = savedMaint.id;
      part.partType = i % 2 === 0 ? 'EV Battery Module' : 'Brake Pad Set';
      part.partNo = `P-${70000 + i}`;
      part.serialNo = `SN-${Date.now()}-${i}`;
      part.qty = i % 2 === 0 ? 1 : 4;
      part.unitPrice = (i % 2 === 0 ? 35000000 : 450000).toString();
      await repos.part.save(part);

      // ── 7. Tax Payment ──
      const tax = new TaxPayment();
      tax.tokenId = tokenId;
      tax.taxYear = 2568; // พ.ศ.
      tax.paidAt = ts;
      tax.validUntil = (parseInt(ts) + 31536000).toString();
      tax.status = TaxStatus.PAID;
      tax.receiptHash = dHash('30');
      tax.receiptUrl = `https://storage.example.com/receipts/tax_${tokenId}.pdf`;
      tax.amount = (120000 + i * 5000).toString();
      tax.paymentChannel = PaymentMethod.BANK;
      tax.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.tax.save(tax);

      // ── 8. Insurance Policy ──
      const ins = new InsurancePolicy();
      ins.tokenId = tokenId;
      ins.insurerAddress = addr('44');
      ins.policyNo = `POL-2025-${1000 + i}`;
      ins.policyNoHash = dHash('40');
      ins.action = InsuranceAction.NEW;
      ins.validFrom = ts;
      ins.validTo = (parseInt(ts) + 31536000).toString();
      ins.coverageDetails = {
        type: i % 2 === 0 ? 'First Class' : 'Second Class',
        class: 'Private',
        primaryDriver: `Owner ${i}`,
        coverageItems: ['Collision', 'Fire', 'Theft', 'Natural Disaster'],
      };
      ins.coverageHash = dHash('41');
      ins.premiumAmount = (1500000 + i * 100000).toString();
      ins.deductible = '500000';
      ins.policyDocUrl = `https://storage.example.com/policies/ins_${tokenId}.pdf`;
      ins.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.insurancePolicy.save(ins);

      // ── 9. Insurance Claim ──
      const claim = new InsuranceClaim();
      claim.tokenId = tokenId;
      claim.claimNo = `CLM-2025-${2000 + i}`;
      claim.claimNoHash = dHash('50');
      claim.filedAt = ts;
      claim.status = i <= 3 ? ClaimStatus.CLOSED : i <= 6 ? ClaimStatus.APPROVED : ClaimStatus.FILED;
      claim.severity = i <= 5 ? ClaimSeverity.MINOR : ClaimSeverity.MAJOR;
      claim.evidenceFiles = [
        { type: 'photo', url: `https://storage.example.com/claims/photo_${i}.jpg`, hash: dHash('51'), mime: 'image/jpeg' },
        { type: 'police_report', url: `https://storage.example.com/claims/report_${i}.pdf`, hash: dHash('52'), mime: 'application/pdf' },
      ];
      claim.evidenceHashes = [dHash('51'), dHash('52')];
      claim.estimateDocUrl = `https://storage.example.com/claims/estimate_${i}.pdf`;
      claim.fraudSignals = i === 8 ? { score: 0.7, flags: ['duplicate_claim'] } : null;
      claim.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.insuranceClaim.save(claim);

      // ── 10. Ownership Transfer ──
      const transfer = new OwnershipTransfer();
      transfer.tokenId = tokenId;
      transfer.fromAddress = addr('f' + i.toString());
      transfer.toAddress = addr(i.toString(16).padStart(2, '0'));
      transfer.reason = i <= 3 ? TransferReason.FIRST_SALE : i <= 6 ? TransferReason.RESALE : TransferReason.TRADE_IN;
      transfer.transferredAt = ts;
      transfer.saleContractHash = dHash('60');
      transfer.buyerOwnerIdHash = dHash('61');
      transfer.docHash = dHash('62');
      transfer.paymentRefHash = dHash('63');
      transfer.buyerProfile = { name: `Buyer ${i}`, phone: `08${i}1234567`, email: `buyer${i}@example.com` };
      transfer.sellerProfile = { name: `Seller ${i}`, phone: `09${i}7654321`, email: `seller${i}@example.com` };
      transfer.salePrice = (80000000 + i * 5000000).toString();
      transfer.currency = 'THB';
      transfer.paymentMethod = PaymentMethod.BANK;
      transfer.contractDocUrl = `https://storage.example.com/contracts/sale_${tokenId}.pdf`;
      transfer.deliveryChecklistUrl = `https://storage.example.com/checklists/delivery_${tokenId}.pdf`;
      transfer.receiptUrl = `https://storage.example.com/receipts/sale_${tokenId}.pdf`;
      transfer.escrowContract = i > 7 ? addr('e' + i.toString()) : null;
      transfer.paymentTxHash = dHash('64');
      transfer.dealTermsDocUrl = `https://storage.example.com/terms/deal_${tokenId}.pdf`;
      transfer.dealerBranchId = i <= 5 ? `BRANCH-${i}` : null;
      transfer.inventoryLotNo = i <= 5 ? `LOT-2025-${i}` : null;
      transfer.vehicleConditionAtReceive = { exterior: 'Good', interior: 'Excellent', mileage: 5000 * i };
      transfer.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.transfer.save(transfer);

      // ── 11. Disclosure ──
      const disc = new Disclosure();
      disc.tokenId = tokenId;
      disc.sellerAddress = addr('f' + i.toString());
      disc.buyerOwnerIdHash = dHash('70');
      disc.disclosedItemsMask = i === 3 ? '5' : '0'; // bit 0=flood, bit 2=majorAccident
      disc.ackHash = dHash('71');
      disc.signedAt = ts;
      disc.disclosureDocUrl = `https://storage.example.com/disclosures/disc_${tokenId}.pdf`;
      disc.fullDisclosureText = i === 3
        ? 'รถเคยประสบอุบัติเหตุหนักที่ด้านหน้า เปลี่ยนกันชนและไฟหน้า'
        : 'ไม่มีข้อมูลที่ต้องเปิดเผย ไม่เคยประสบอุบัติเหตุ น้ำท่วม หรือถูกขโมย';
      disc.buyerSignatureImageUrl = `https://storage.example.com/sigs/buyer_${i}.png`;
      disc.witness = { name: `Witness ${i}`, idRef: `WIT-${i}`, signatureUrl: `https://storage.example.com/sigs/wit_${i}.png` };
      disc.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.disclosure.save(disc);

      // ── 12. Loan Account ──
      const loan = new LoanAccount();
      loan.tokenId = tokenId;
      loan.lenderAddress = addr('55');
      loan.lienStatus = i <= 5 ? LienStatus.ACTIVE : LienStatus.RELEASED;
      loan.loanAccountNo = `LOAN-2025-${3000 + i}`;
      loan.principal = (50000000 + i * 3000000).toString();
      loan.interestRateBps = 350 + i * 10;
      loan.termMonths = 48 + (i % 3 === 0 ? 12 : 0);
      loan.loanContractHash = dHash('80');
      loan.contractDocUrl = `https://storage.example.com/loans/contract_${tokenId}.pdf`;
      loan.startedAt = ts;
      loan.releaseConditionHash = dHash('81');
      loan.borrowerKycRef = `KYC-${i}`;
      loan.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.loan.save(loan);

      // ── 13. Consent Grant ──
      const consent = new ConsentGrant();
      consent.tokenId = tokenId;
      consent.ownerAddress = addr(i.toString(16).padStart(2, '0'));
      consent.granteeDid = `did:example:grantee-${i}`;
      consent.granteeVerified = true;
      consent.granteeEmail = `grantee${i}@example.com`;
      consent.scopes = [ConsentScope.VEHICLE_IDENTITY, ConsentScope.MAINTENANCE_FULL];
      consent.scopeMask = '3'; // bits 0 & 1
      consent.expiresAt = (parseInt(ts) + 31536000).toString();
      consent.singleUse = false;
      consent.nonce = i.toString();
      consent.grantHash = dHash('90');
      consent.revoked = false;
      consent.auditLog = [
        { accessedBy: `did:example:auditor-${i}`, accessedAt: ts, scope: 'VEHICLE_IDENTITY' },
      ];
      consent.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.consent.save(consent);

      // ── 14. Trade-In Evaluation ──
      const tradeIn = new TradeInEvaluation();
      tradeIn.tokenId = tokenId;
      tradeIn.evaluatorAddress = addr('66');
      tradeIn.evaluationHash = dHash('a0');
      tradeIn.mileageAtEval = 5000 * i;
      tradeIn.score = 60 + i * 3;
      tradeIn.offerPrice = (40000000 + i * 2000000).toString();
      tradeIn.notes = `Vehicle in ${i <= 5 ? 'excellent' : 'good'} condition. Minor scratches on bumper.`;
      tradeIn.signalsUsed = ['maintenance_history', 'accident_record', 'mileage_trend'];
      tradeIn.photos = [
        { url: `https://storage.example.com/tradein/front_${i}.jpg`, hash: dHash('a1') },
        { url: `https://storage.example.com/tradein/rear_${i}.jpg`, hash: dHash('a2') },
      ];
      tradeIn.accepted = i <= 3;
      tradeIn.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.tradeIn.save(tradeIn);

      // ── 15. Vehicle Flag Record (use raw SQL for bigint auto-increment PK) ──
      const flagType = i === 3 ? VehicleFlag.MAJOR_ACCIDENT : i === 5 ? VehicleFlag.STOLEN : VehicleFlag.FLOOD;
      const flagActive = i <= 5 ? 1 : 0;
      const flagDetails = JSON.stringify({ reportedBy: `Police Station ${provinces[i - 1]}`, caseNo: `CS-2025-${i}` });
      const flagTimeline = JSON.stringify([
        { status: 'REPORTED', at: ts, note: 'ได้รับแจ้ง' },
        { status: i <= 5 ? 'ACTIVE' : 'RESOLVED', at: ts, note: i <= 5 ? 'อยู่ระหว่างดำเนินการ' : 'ปิดเคส' },
      ]);
      await AppDataSource.query(
        `INSERT INTO vehicle_flags (tokenId, flag, active, sourceAddress, refHash, caseDocUrl, details, statusTimeline, txHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tokenId, flagType, flagActive, addr('77'), dHash('b0'), `https://storage.example.com/flags/case_${tokenId}.pdf`, flagDetails, flagTimeline, dHash(i.toString(16).padStart(2, '0'))],
      );

      // ── 16. Event Log ──
      const ev = new EventLog();
      ev.tokenId = tokenId;
      ev.type = EventType.VEHICLE_MINTED;
      ev.actorAddress = addr('aa');
      ev.actorRole = ActorRole.MANUFACTURER;
      ev.occurredAt = ts;
      ev.payload = { model: models[i - 1], year: 2025, color: colors[i - 1] };
      ev.payloadHash = dHash('c0');
      ev.evidence = [
        { url: `https://storage.example.com/evidence/mint_${i}.pdf`, hash: dHash('c1'), mime: 'application/pdf', size: 1024 * i },
      ];
      ev.evidenceHash = dHash('c2');
      ev.txHash = dHash(i.toString(16).padStart(2, '0'));
      await repos.event.save(ev);

      console.log(`  ✅ [${i}/10] Token ${tokenId} — ${models[i - 1]} (${colors[i - 1]})`);
    }

    // ── Export ──
    console.log('\n📦 Exporting all entities to JSON...');
    const sampleDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir);

    for (const entity of AppDataSource.entityMetadatas) {
      const data = await AppDataSource.getRepository(entity.target).find({ take: 10 });
      const filePath = path.join(sampleDir, `${entity.tableName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  💾 ${entity.tableName}.json (${data.length} records)`);
    }

    await AppDataSource.destroy();
    console.log('\n🏁 ALL 16 entities seeded & exported! ✨');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedAndExport();
