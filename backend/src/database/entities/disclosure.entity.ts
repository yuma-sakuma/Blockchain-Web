import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

/**
 * Disclosure Record – บันทึกการเปิดเผยข้อมูลสำคัญ
 * (รถเคยชนหนัก/น้ำท่วม ฯลฯ ลดปัญหาย้อมแมว)
 *
 * On-chain: seller, buyerOwnerId, disclosedItemsMask, ackHash, signedAt
 * Off-chain: เอกสาร, ข้อความเต็ม, ลายเซ็นผู้ซื้อ
 */
@Entity('disclosures')
@Index(['tokenId'])
export class Disclosure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address ผู้ขาย */
  @Column({ length: 100 })
  sellerAddress: string;

  /** hash(buyerDID) – ตรงกับ on-chain buyerOwnerId */
  @Column({ length: 66 })
  buyerOwnerIdHash: string;

  /**
   * Bitmask รายการที่เปิดเผย – ตรงกับ on-chain disclosedItemsMask
   * bit 0 = flood, bit 1 = structural, bit 2 = majorAccident ฯลฯ
   */
  @Column({ type: 'bigint' })
  disclosedItemsMask: string;

  /** hash เอกสารยอมรับของผู้ซื้อ – ตรงกับ on-chain ackHash */
  @Column({ length: 66 })
  ackHash: string;

  /** Unix timestamp วันลงนาม */
  @Column({ type: 'bigint' })
  signedAt: string;

  // ── Off-chain only ──

  /** CID/URL เอกสาร disclosure */
  @Column({ type: 'text', nullable: true })
  disclosureDocUrl: string | null;

  /** ข้อความเปิดเผยฉบับเต็ม */
  @Column({ type: 'text', nullable: true })
  fullDisclosureText: string | null;

  /** CID/URL รูปลายเซ็นผู้ซื้อ */
  @Column({ type: 'text', nullable: true })
  buyerSignatureImageUrl: string | null;

  /** ข้อมูลพยาน (ถ้ามี) */
  @Column({ type: 'json', nullable: true })
  witness: {
    name?: string;
    idRef?: string;
    signatureUrl?: string;
  } | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.disclosures, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
