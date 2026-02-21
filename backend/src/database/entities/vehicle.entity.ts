import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ConsentGrant } from './consent-grant.entity';
import { Disclosure } from './disclosure.entity';
import { RegistrationStatus, VehicleFlag } from './enums';
import { EventLog } from './event-log.entity';
import { Inspection } from './inspection.entity';
import { InsuranceClaim } from './insurance-claim.entity';
import { InsurancePolicy } from './insurance-policy.entity';
import { LoanAccount } from './loan-account.entity';
import { MaintenanceLog } from './maintenance-log.entity';
import { OwnershipTransfer } from './ownership-transfer.entity';
import { PlateRecord } from './plate-record.entity';
import { Registration } from './registration.entity';
import { TaxPayment } from './tax-payment.entity';
import { TradeInEvaluation } from './trade-in-evaluation.entity';
import { VehicleFlagRecord } from './vehicle-flag.entity';

@Entity('vehicles')
export class Vehicle {
  /** ตรงกับ tokenId บน smart contract */
  @PrimaryColumn({ type: 'bigint' })
  tokenId: string;

  /** VIN เต็ม (encrypt at rest) – ห้ามเก็บ on-chain */
  @Column({ length: 17 })
  vinNumber: string;

  /** keccak256(vin) – ตรงกับ on-chain vinHash */
  @Column({ length: 66 })
  vinHash: string;

  /** Wallet address ของผู้ผลิต */
  @Column({ length: 100 })
  manufacturerAddress: string;

  /** Unix timestamp วันผลิต */
  @Column({ type: 'bigint' })
  manufacturedAt: string;

  /** ข้อมูลรุ่น */
  @Column({ type: 'json' })
  modelJson: { model: string; year: number };

  /** hash(modelJson) – ตรงกับ on-chain */
  @Column({ length: 66 })
  modelHash: string;

  /** สเปกรถฉบับเต็ม (สี, แบตเตอรี่, options ฯลฯ) */
  @Column({ type: 'json' })
  specJson: Record<string, any>;

  /** hash(specJson) – ตรงกับ on-chain */
  @Column({ length: 66 })
  specHash: string;

  /** ลายเซ็นผู้ผลิต (ถ้าเซ็นนอกเชน) */
  @Column({ type: 'text', nullable: true })
  manufacturerSignature: string | null;

  /** Transaction hash ตอน mint */
  @Column({ type: 'varchar', length: 66, nullable: true })
  mintTxHash: string | null;

  /** สถานะการจดทะเบียนปัจจุบัน (cache จาก on-chain) */
  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.UNREGISTERED })
  registrationStatus: RegistrationStatus;

  /** ล็อกการโอน (cache จาก on-chain) */
  @Column({ default: false })
  transferLocked: boolean;

  /** ธงสถานะรถที่ active อยู่ */
  @Column({ type: 'simple-array', nullable: true })
  activeFlags: VehicleFlag[] | null;

  /** Wallet address เจ้าของปัจจุบัน */
  @Column({ type: 'varchar', length: 100, nullable: true })
  currentOwnerAddress: string | null;

  /** จำนวนเจ้าของทั้งหมด */
  @Column({ type: 'int', default: 0 })
  ownerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Relations ──

  @OneToMany(() => EventLog, (e) => e.vehicle)
  events: EventLog[];

  @OneToMany(() => ConsentGrant, (c) => c.vehicle)
  consents: ConsentGrant[];

  @OneToMany(() => Registration, (r) => r.vehicle)
  registrations: Registration[];

  @OneToMany(() => PlateRecord, (p) => p.vehicle)
  plateRecords: PlateRecord[];

  @OneToMany(() => TaxPayment, (t) => t.vehicle)
  taxPayments: TaxPayment[];

  @OneToMany(() => Inspection, (i) => i.vehicle)
  inspections: Inspection[];

  @OneToMany(() => MaintenanceLog, (m) => m.vehicle)
  maintenanceLogs: MaintenanceLog[];

  @OneToMany(() => InsurancePolicy, (p) => p.vehicle)
  insurancePolicies: InsurancePolicy[];

  @OneToMany(() => InsuranceClaim, (c) => c.vehicle)
  insuranceClaims: InsuranceClaim[];

  @OneToMany(() => LoanAccount, (l) => l.vehicle)
  loanAccounts: LoanAccount[];

  @OneToMany(() => OwnershipTransfer, (o) => o.vehicle)
  ownershipTransfers: OwnershipTransfer[];

  @OneToMany(() => Disclosure, (d) => d.vehicle)
  disclosures: Disclosure[];

  @OneToMany(() => TradeInEvaluation, (t) => t.vehicle)
  tradeInEvaluations: TradeInEvaluation[];

  @OneToMany(() => VehicleFlagRecord, (f) => f.vehicle)
  flagRecords: VehicleFlagRecord[];
}
