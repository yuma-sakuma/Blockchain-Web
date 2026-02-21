import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleFlag } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Vehicle Flag Record – ธงสถานะรถ (หาย/อายัด/ชนหนัก/น้ำท่วม/ซาก ฯลฯ)
 *
 * On-chain: flags (uint64 bitmask), flagSource, refHash, transferLocked
 * Off-chain: เอกสาร, รายละเอียด, timeline
 */
@Entity('vehicle_flags')
@Index(['tokenId'])
export class VehicleFlagRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** ประเภท flag */
  @Column({ type: 'enum', enum: VehicleFlag })
  flag: VehicleFlag;

  /** เปิด/ปิด flag */
  @Column()
  active: boolean;

  /** Wallet address แหล่งที่มาของ flag (ตำรวจ/DLT/ศาล ฯลฯ) */
  @Column({ length: 100 })
  sourceAddress: string;

  /** hash เอกสารอ้างอิง – ตรงกับ on-chain refHash */
  @Column({ length: 66 })
  refHash: string;

  /** CID/URL เอกสาร (รายงานตำรวจ/คำสั่งศาล) */
  @Column({ type: 'text', nullable: true })
  caseDocUrl: string | null;

  /** รายละเอียดเพิ่มเติม */
  @Column({ type: 'json', nullable: true })
  details: Record<string, any> | null;

  /** Timeline ของสถานะ */
  @Column({ type: 'json', nullable: true })
  statusTimeline: Array<{
    status: string;
    at: string;
    note?: string;
  }>;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.flagRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
