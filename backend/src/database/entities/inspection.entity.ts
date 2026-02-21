import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { InspectionResult } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Inspection – ผลตรวจสภาพรถ (ตรอ.)
 *
 * On-chain: station, vinVerified, result, metricsHash, certHash, issuedAt
 * Off-chain: ค่าเกณฑ์ละเอียด, ใบรับรอง PDF
 */
@Entity('inspections')
@Index(['tokenId', 'issuedAt'])
export class Inspection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address สถานตรวจสภาพ */
  @Column({ length: 100 })
  stationAddress: string;

  /** ชื่อ/รหัสสถานตรวจสภาพ */
  @Column({ type: 'varchar', length: 100, nullable: true })
  stationName: string | null;

  /** ยืนยัน VIN ตรงกับ NFT หรือไม่ */
  @Column({ default: true })
  vinVerified: boolean;

  /** ผลตรวจ: ผ่าน/ไม่ผ่าน */
  @Column({ type: 'enum', enum: InspectionResult })
  result: InspectionResult;

  /** ค่าเกณฑ์ผลตรวจละเอียด (ไอเสีย/เบรก/ไฟ/ช่วงล่าง) */
  @Column({ type: 'json' })
  metrics: {
    emission?: { value: number; unit: string; pass: boolean };
    brake?: { value: number; unit: string; pass: boolean };
    lights?: { pass: boolean; notes?: string };
    suspension?: { pass: boolean; notes?: string };
    [key: string]: any;
  };

  /** hash(metrics) – ตรงกับ on-chain metricsHash */
  @Column({ length: 66 })
  metricsHash: string;

  /** hash ใบรับรอง PDF – ตรงกับ on-chain certHash */
  @Column({ length: 66 })
  certHash: string;

  /** CID/URL ใบรับรอง PDF */
  @Column({ type: 'text', nullable: true })
  certUrl: string | null;

  /** Unix timestamp วันออกใบรับรอง */
  @Column({ type: 'bigint' })
  issuedAt: string;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.inspections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
