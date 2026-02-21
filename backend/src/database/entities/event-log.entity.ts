import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ActorRole, EventType } from './enums';
import { Vehicle } from './vehicle.entity';

/**
 * Event Log – Off-chain event-sourcing record
 *
 * On-chain เก็บเฉพาะ: eventType, actor, occurredAt, payloadHash, evidenceHash
 * Off-chain เก็บรายละเอียดทั้งหมด
 */
@Entity('event_logs')
@Index(['tokenId', 'type'])
@Index(['tokenId', 'occurredAt'])
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  eventId: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  /** Wallet address ผู้กระทำ */
  @Column({ length: 42 })
  actorAddress: string;

  /** บทบาทของผู้กระทำ */
  @Column({ type: 'enum', enum: ActorRole })
  actorRole: ActorRole;

  /** เวลาที่เกิด event (unix timestamp) */
  @Column({ type: 'bigint' })
  occurredAt: string;

  /** ข้อมูลรายละเอียดของ event */
  @Column({ type: 'json' })
  payload: Record<string, any>;

  /** hash(payload) – ตรงกับ on-chain payloadHash */
  @Column({ length: 66 })
  payloadHash: string;

  /** เอกสาร/หลักฐานประกอบ */
  @Column({ type: 'json', nullable: true })
  evidence: Array<{
    cid?: string;
    url?: string;
    hash: string;
    mime: string;
    size: number;
  }> | null;

  /** hash รวมของ evidence – ตรงกับ on-chain evidenceHash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  evidenceHash: string | null;

  /** Transaction hash ที่บันทึก event บน chain */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
