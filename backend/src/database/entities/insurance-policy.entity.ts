import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { InsuranceAction } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Insurance Policy – กรมธรรม์ประกันภัย
 *
 * On-chain: insurer, policyNoHash, action, validFrom, validTo, coverageHash
 * Off-chain: รายละเอียดกรมธรรม์, เบี้ย, ผู้ขับขี่
 */
@Entity('insurance_policies')
@Index(['tokenId', 'validTo'])
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address บริษัทประกัน */
  @Column({ length: 100 })
  insurerAddress: string;

  /** เลขกรมธรรม์ (plain text – off-chain) */
  @Column({ length: 50 })
  policyNo: string;

  /** hash(policyNo) – ตรงกับ on-chain */
  @Column({ length: 66 })
  policyNoHash: string;

  /** ประเภทการดำเนินการ: ใหม่/ต่อ/เปลี่ยน/ยกเลิก */
  @Column({ type: 'enum', enum: InsuranceAction })
  action: InsuranceAction;

  /** Unix timestamp เริ่มคุ้มครอง */
  @Column({ type: 'bigint' })
  validFrom: string;

  /** Unix timestamp สิ้นสุดคุ้มครอง */
  @Column({ type: 'bigint' })
  validTo: string;

  /** รายละเอียดความคุ้มครอง */
  @Column({ type: 'json' })
  coverageDetails: {
    type: string;
    class: string;
    primaryDriver?: string;
    coverageItems: string[];
    [key: string]: any;
  };

  /** hash(coverageDetails) – ตรงกับ on-chain coverageHash */
  @Column({ length: 66 })
  coverageHash: string;

  /** เบี้ยประกัน (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  premiumAmount: string | null;

  /** ค่าเสียหายส่วนแรก (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  deductible: string | null;

  /** CID/URL เอกสารกรมธรรม์ */
  @Column({ type: 'text', nullable: true })
  policyDocUrl: string | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.insurancePolicies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
