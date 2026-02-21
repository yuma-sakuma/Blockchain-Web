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
import { ClaimSeverity, ClaimStatus } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Insurance Claim – เคลมประกัน / อุบัติเหตุ
 *
 * On-chain: claimNoHash, filedAt, evidenceHashes[], claimStatus, severity
 * Off-chain: รูป, รายงานตำรวจ, ใบเสนอราคาซ่อม, fraud signals
 */
@Entity('insurance_claims')
@Index(['tokenId', 'status'])
export class InsuranceClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** เลขเคลม (plain text) */
  @Column({ length: 50 })
  claimNo: string;

  /** hash(claimNo) – ตรงกับ on-chain */
  @Column({ length: 66 })
  claimNoHash: string;

  /** Unix timestamp วันเปิดเคลม */
  @Column({ type: 'bigint' })
  filedAt: string;

  /** สถานะเคลมปัจจุบัน */
  @Column({ type: 'enum', enum: ClaimStatus })
  status: ClaimStatus;

  /** ความรุนแรง */
  @Column({ type: 'enum', enum: ClaimSeverity })
  severity: ClaimSeverity;

  /** หลักฐาน */
  @Column({ type: 'json' })
  evidenceFiles: Array<{
    type: 'photo' | 'video' | 'police_report' | 'estimate' | 'other';
    cid?: string;
    url?: string;
    hash: string;
    mime: string;
  }>;

  /** hashes ของหลักฐาน – ตรงกับ on-chain evidenceHashes[] */
  @Column({ type: 'simple-array' })
  evidenceHashes: string[];

  /** ใบเสนอราคาซ่อม */
  @Column({ type: 'text', nullable: true })
  estimateDocUrl: string | null;

  /** Fraud signals (internal use) */
  @Column({ type: 'json', nullable: true })
  fraudSignals: Record<string, any> | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.insuranceClaims, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
