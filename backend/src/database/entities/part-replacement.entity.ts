import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenanceLog } from './maintenance-log.entity';

/**
 * Part Replacement – บันทึกการเปลี่ยนอะไหล่สำคัญ
 * (แบต EV, ถุงลม, ECU ฯลฯ)
 *
 * เก็บ off-chain ทั้งหมด (hash รวมอยู่ใน maintenanceLog.partsHash)
 */
@Entity('part_replacements')
export class PartReplacement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  maintenanceLogId: string;

  /** ประเภทอะไหล่ */
  @Column({ length: 100 })
  partType: string;

  /** Part Number */
  @Column({ length: 50 })
  partNo: string;

  /** Serial Number (ถ้ามี) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNo: string | null;

  /** จำนวน */
  @Column({ type: 'smallint', default: 1 })
  qty: number;

  /** ราคาต่อชิ้น (หน่วยสตางค์) */
  @Column({ type: 'bigint', nullable: true })
  unitPrice: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => MaintenanceLog, (m) => m.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenanceLogId' })
  maintenanceLog: MaintenanceLog;
}
