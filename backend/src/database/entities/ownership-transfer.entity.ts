import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod, TransferReason } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Ownership Transfer – บันทึกการโอนกรรมสิทธิ์
 *
 * On-chain: from, to, transferReason, docHash, saleContractHash,
 *           buyerOwnerId, deliveryAt, paymentRefHash / escrow data
 * Off-chain: PII ผู้ซื้อ/ผู้ขาย, ราคา, เอกสาร
 */
@Entity('ownership_transfers')
@Index(['tokenId', 'transferredAt'])
export class OwnershipTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address ผู้โอน */
  @Column({ length: 42 })
  fromAddress: string;

  /** Wallet address ผู้รับโอน */
  @Column({ length: 42 })
  toAddress: string;

  /** เหตุผลการโอน */
  @Column({ type: 'enum', enum: TransferReason })
  reason: TransferReason;

  /** Unix timestamp วันโอน */
  @Column({ type: 'bigint' })
  transferredAt: string;

  /** hash สัญญาซื้อขาย – ตรงกับ on-chain saleContractHash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  saleContractHash: string | null;

  /** hash(buyerDID) – ตรงกับ on-chain buyerOwnerId */
  @Column({ type: 'varchar', length: 66, nullable: true })
  buyerOwnerIdHash: string | null;

  /** hash เอกสารส่งมอบ – ตรงกับ on-chain docHash */
  @Column({ length: 66 })
  docHash: string;

  /** hash หลักฐานการชำระเงิน */
  @Column({ type: 'varchar', length: 66, nullable: true })
  paymentRefHash: string | null;

  // ── Off-chain only ──

  /** ข้อมูลผู้ซื้อ (PII) */
  @Column({ type: 'json', nullable: true })
  buyerProfile: Record<string, any> | null;

  /** ข้อมูลผู้ขาย (PII) */
  @Column({ type: 'json', nullable: true })
  sellerProfile: Record<string, any> | null;

  /** ราคาขาย (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  salePrice: string | null;

  /** สกุลเงิน */
  @Column({ length: 10, default: 'THB' })
  currency: string;

  /** วิธีการชำระเงิน */
  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod | null;

  /** CID/URL สัญญาซื้อขาย */
  @Column({ type: 'text', nullable: true })
  contractDocUrl: string | null;

  /** CID/URL checklist ส่งมอบ */
  @Column({ type: 'text', nullable: true })
  deliveryChecklistUrl: string | null;

  /** CID/URL ใบเสร็จ */
  @Column({ type: 'text', nullable: true })
  receiptUrl: string | null;

  // ── Escrow (กรณี crypto) ──

  /** Address ของ escrow contract (ถ้ามี) */
  @Column({ type: 'varchar', length: 42, nullable: true })
  escrowContract: string | null;

  /** Payment tx hash on-chain */
  @Column({ type: 'varchar', length: 66, nullable: true })
  paymentTxHash: string | null;

  /** CID/URL ข้อตกลง */
  @Column({ type: 'text', nullable: true })
  dealTermsDocUrl: string | null;

  // ── Dealer-specific (inventory transfer) ──

  /** รหัสสาขาดีลเลอร์ */
  @Column({ type: 'varchar', length: 50, nullable: true })
  dealerBranchId: string | null;

  /** เลข lot สินค้า */
  @Column({ type: 'varchar', length: 50, nullable: true })
  inventoryLotNo: string | null;

  /** สภาพรถตอนรับ */
  @Column({ type: 'json', nullable: true })
  vehicleConditionAtReceive: Record<string, any> | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.ownershipTransfers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
