import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { LienStatus } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Loan Account – สินเชื่อ/เช่าซื้อผูกกับ NFT
 *
 * On-chain: lender, lienStatus, transferLocked, loanContractHash,
 *           startedAt, releaseConditionHash
 * Off-chain: รายละเอียดสินเชื่อ, KYC, เอกสาร
 */
@Entity('loan_accounts')
@Index(['tokenId', 'lienStatus'])
export class LoanAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address ผู้ให้สินเชื่อ */
  @Column({ length: 42 })
  lenderAddress: string;

  /** สถานะภาระผูกพัน */
  @Column({ type: 'enum', enum: LienStatus })
  lienStatus: LienStatus;

  /** เลขบัญชีสินเชื่อ (off-chain only) */
  @Column({ length: 50 })
  loanAccountNo: string;

  /** เงินต้น (หน่วยสตางค์) */
  @Column({ type: 'bigint' })
  principal: string;

  /** อัตราดอกเบี้ย (basis points, เช่น 350 = 3.50%) */
  @Column({ type: 'smallint' })
  interestRateBps: number;

  /** ระยะเวลาผ่อน (เดือน) */
  @Column({ type: 'smallint' })
  termMonths: number;

  /** hash สัญญาสินเชื่อ – ตรงกับ on-chain loanContractHash */
  @Column({ length: 66 })
  loanContractHash: string;

  /** CID/URL เอกสารสัญญา */
  @Column({ type: 'text', nullable: true })
  contractDocUrl: string | null;

  /** Unix timestamp วันเริ่มสัญญา */
  @Column({ type: 'bigint' })
  startedAt: string;

  /** hash เงื่อนไขปลดล็อก – ตรงกับ on-chain */
  @Column({ type: 'varchar', length: 66, nullable: true })
  releaseConditionHash: string | null;

  /** อ้างอิง KYC ผู้กู้ */
  @Column({ type: 'varchar', length: 100, nullable: true })
  borrowerKycRef: string | null;

  /** Transaction hash ที่สร้าง lien */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.loanAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
