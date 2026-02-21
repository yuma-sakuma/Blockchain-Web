import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod, TaxStatus } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Tax Payment – การชำระภาษีประจำปี / ต่อทะเบียน
 *
 * On-chain: taxYear, paidAt, validUntil, receiptHash, status
 * Off-chain: จำนวนเงิน, ช่องทาง, ใบเสร็จ
 */
@Entity('tax_payments')
@Index(['tokenId', 'taxYear'])
export class TaxPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** ปีภาษี (พ.ศ.) */
  @Column({ type: 'smallint' })
  taxYear: number;

  /** Unix timestamp วันชำระ */
  @Column({ type: 'bigint' })
  paidAt: string;

  /** Unix timestamp วันหมดอายุ */
  @Column({ type: 'bigint' })
  validUntil: string;

  /** สถานะ */
  @Column({ type: 'enum', enum: TaxStatus })
  status: TaxStatus;

  /** hash ใบเสร็จ – ตรงกับ on-chain */
  @Column({ length: 66 })
  receiptHash: string;

  /** CID/URL ใบเสร็จ */
  @Column({ type: 'text', nullable: true })
  receiptUrl: string | null;

  /** จำนวนเงินที่ชำระ (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  amount: string | null;

  /** ช่องทางชำระเงิน */
  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentChannel: PaymentMethod | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.taxPayments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
