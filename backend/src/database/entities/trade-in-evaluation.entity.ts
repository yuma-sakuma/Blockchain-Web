import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from './vehicle.entity';

/**
 * Trade-In Evaluation – รายงานประเมินรถเก่า (Trade-in / Buyback)
 *
 * On-chain: evaluationHash, mileageAtEval, transfer event (ถ้าซื้อจริง)
 * Off-chain: คะแนน, ราคาเสนอ, signals, รูป
 */
@Entity('trade_in_evaluations')
@Index(['tokenId'])
export class TradeInEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint' })
  tokenId: string;

  /** Wallet address ผู้ประเมิน (ดีลเลอร์) */
  @Column({ length: 42 })
  evaluatorAddress: string;

  /** hash รายงานประเมิน – ตรงกับ on-chain evaluationHash */
  @Column({ length: 66 })
  evaluationHash: string;

  /** เลขไมล์ ณ เวลาประเมิน */
  @Column({ type: 'int', nullable: true })
  mileageAtEval: number | null;

  // ── Off-chain only ──

  /** คะแนนประเมิน (0-100) */
  @Column({ type: 'smallint' })
  score: number;

  /** ราคาเสนอ (หน่วยสตางค์) */
  @Column({ type: 'bigint' })
  offerPrice: string;

  /** หมายเหตุ */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** ข้อมูลที่ใช้ประกอบการตัดสินใจ */
  @Column({ type: 'simple-array', nullable: true })
  signalsUsed: string[] | null;

  /** รูปถ่ายประเมิน */
  @Column({ type: 'json', nullable: true })
  photos: Array<{
    cid?: string;
    url?: string;
    hash: string;
  }> | null;

  /** ตกลงซื้อหรือไม่ */
  @Column({ default: false })
  accepted: boolean;

  /** Transaction hash */
  @Column({ type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // ── Relations ──

  @ManyToOne(() => Vehicle, (v) => v.tradeInEvaluations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tokenId', referencedColumnName: 'tokenId' })
  vehicle: Vehicle;
}
