import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AccidentSeverity } from './enums';
import { PartReplacement } from './part-replacement.entity';
import { Vehicle } from './vehicle.entity';

/**
 * Maintenance Log – บันทึกประวัติซ่อม/บำรุง
 *
 * On-chain: workshop, writeConsentRefHash, mileageKm, maintenanceHash,
 *           partsHash, accidentSeverity, occurredAt
 * Off-chain: งานทั้งหมด, ค่าแรง, อะไหล่, รูปก่อน/หลัง
 */
@Entity('maintenance_logs')
@Index(['tokenId', 'occurredAt'])
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address อู่/ศูนย์บริการ */
  @Column({ length: 100 })
  workshopAddress: string;

  /** hash ของ consent อ้างอิง – ตรงกับ on-chain */
  @Column({ length: 66 })
  writeConsentRefHash: string;

  /** เลขไมล์ ณ เวลาซ่อม (km) */
  @Column({ type: 'int' })
  mileageKm: number;

  /** Unix timestamp วันที่ซ่อม */
  @Column({ type: 'bigint' })
  occurredAt: string;

  /** อาการที่แจ้ง */
  @Column({ type: 'text', nullable: true })
  symptoms: string | null;

  /** รายการงานที่ทำ */
  @Column({ type: 'simple-array' })
  jobs: string[];

  /** ค่าแรง (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  laborCost: string | null;

  /** hash(maintenance details) – ตรงกับ on-chain maintenanceHash */
  @Column({ length: 66 })
  maintenanceHash: string;

  /** hash(parts list) – ตรงกับ on-chain partsHash */
  @Column({ length: 66 })
  partsHash: string;

  /** ระดับความเสียหาย (ถ้าเกี่ยวกับอุบัติเหตุ) */
  @Column({ type: 'enum', enum: AccidentSeverity, default: AccidentSeverity.NONE })
  accidentSeverity: AccidentSeverity;

  /** CID/URL ใบแจ้งหนี้ */
  @Column({ type: 'text', nullable: true })
  invoiceUrl: string | null;

  /** hash ใบแจ้งหนี้ */
  @Column({ type: 'varchar', length: 66, nullable: true })
  invoiceHash: string | null;

  /** รหัสช่างผู้ทำงาน */
  @Column({ type: 'varchar', length: 50, nullable: true })
  technicianId: string | null;

  /** รูปก่อน/หลังซ่อม */
  @Column({ type: 'json', nullable: true })
  photos: Array<{
    type: 'before' | 'after';
    cid?: string;
    url?: string;
    hash: string;
  }> | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.maintenanceLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;

  @OneToMany(() => PartReplacement, (p) => p.maintenanceLog)
  parts: PartReplacement[];
}
