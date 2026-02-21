import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { PlateEventType } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Plate Record – ประวัติป้ายทะเบียน
 *
 * On-chain: plateNoHash, provinceCode, plateEventType, plateEventDocHash, effectiveAt
 * Off-chain: เลขป้ายเต็ม, เอกสาร, เหตุผล
 */
@Entity('plate_records')
@Index(['tokenId', 'effectiveAt'])
export class PlateRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** เลขป้ายทะเบียน (plain text – เฉพาะ off-chain) */
  @Column({ length: 20 })
  plateNo: string;

  /** hash(plateNo) – ตรงกับ on-chain */
  @Column({ length: 66 })
  plateNoHash: string;

  /** รหัสจังหวัด */
  @Column({ type: 'smallint' })
  provinceCode: number;

  /** ประเภท event: ออกป้าย/เปลี่ยน/หาย */
  @Column({ type: 'enum', enum: PlateEventType })
  eventType: PlateEventType;

  /** Unix timestamp วันมีผล */
  @Column({ type: 'bigint' })
  effectiveAt: string;

  /** hash เอกสาร – ตรงกับ on-chain */
  @Column({ length: 66 })
  plateEventDocHash: string;

  /** CID/URL ใบแจ้งความ (กรณีป้ายหาย) */
  @Column({ type: 'text', nullable: true })
  policeReportUrl: string | null;

  /** เหตุผล */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.plateRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
