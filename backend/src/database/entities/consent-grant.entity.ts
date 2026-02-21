import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConsentScope } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Consent Grant – การให้สิทธิ์เข้าถึงข้อมูล
 *
 * On-chain: grantTo (hash DID), scopeMask, expiresAt, grantNonce, grantHash
 * Off-chain: รายละเอียดทั้งหมดรวม PII
 */
@Entity('consent_grants')
@Index(['tokenId', 'revoked'])
export class ConsentGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address เจ้าของที่ให้ consent */
  @Column({ length: 42 })
  ownerAddress: string;

  /** DID ของผู้ได้รับสิทธิ์ */
  @Column({ length: 255 })
  granteeDid: string;

  /** ยืนยัน DID แล้วหรือไม่ */
  @Column({ default: false })
  granteeVerified: boolean;

  /** Email (ถ้ามี) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  granteeEmail: string | null;

  /** ขอบเขตสิทธิ์ที่อนุญาต */
  @Column({ type: 'simple-array' })
  scopes: ConsentScope[];

  /** scopeMask ที่ใช้ on-chain (uint64 bitmask) */
  @Column({ type: 'bigint' })
  scopeMask: string;

  /** วันหมดอายุ (unix timestamp) */
  @Column({ type: 'bigint' })
  expiresAt: string;

  /** ใช้ได้ครั้งเดียว */
  @Column({ default: false })
  singleUse: boolean;

  /** Nonce สำหรับป้องกัน replay */
  @Column({ type: 'bigint' })
  nonce: string;

  /** hash(policy) – ตรงกับ on-chain grantHash */
  @Column({ length: 66 })
  grantHash: string;

  /** ถูก revoke แล้วหรือไม่ */
  @Column({ default: false })
  revoked: boolean;

  /** Audit log การเข้าถึง */
  @Column({ type: 'json', nullable: true })
  auditLog: Array<{
    accessedBy: string;
    accessedAt: string;
    scope: string;
  }>;

  /** Transaction hash ที่บันทึก grant บน chain */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.consents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
