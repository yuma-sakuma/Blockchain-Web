import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { RegistrationStatus } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Registration – เล่มเขียวดิจิทัล (กรมการขนส่ง)
 *
 * On-chain: isRegistered, registeredAt, dltOfficer, greenBookNoHash,
 *           registrationDocHash, registrationStatus
 * Off-chain: ข้อมูลเต็ม + PII เจ้าของ
 */
@Entity('registrations')
@Index(['tokenId'])
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** สถานะการจดทะเบียน */
  @Column({ type: 'enum', enum: RegistrationStatus })
  status: RegistrationStatus;

  /** Unix timestamp วันจดทะเบียน */
  @Column({ type: 'bigint' })
  registeredAt: string;

  /** Wallet address เจ้าหน้าที่ DLT */
  @Column({ length: 42 })
  dltOfficerAddress: string;

  /** เลขเล่มเขียว (plain text – เฉพาะ off-chain) */
  @Column({ length: 50 })
  greenBookNo: string;

  /** hash(greenBookNo) – ตรงกับ on-chain */
  @Column({ length: 66 })
  greenBookNoHash: string;

  /** CID/URL เอกสารจดทะเบียน */
  @Column({ type: 'text', nullable: true })
  registrationDocUrl: string | null;

  /** hash เอกสาร – ตรงกับ on-chain */
  @Column({ length: 66 })
  registrationDocHash: string;

  /** ข้อมูล PII เจ้าของ ณ เวลาจดทะเบียน */
  @Column({ type: 'json', nullable: true })
  ownerIdentityAtReg: Record<string, any> | null;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
