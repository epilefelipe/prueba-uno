import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Transaction } from '../../transaction/entities/transaction.entity';

export enum TransactionEventType {
  TRANSACTION_CREATED = 'TRANSACTION_CREATED',
  AUTHORIZATION_STARTED = 'AUTHORIZATION_STARTED',
  ACQUIRER_REQUEST_SENT = 'ACQUIRER_REQUEST_SENT',
  ACQUIRER_RESPONSE_RECEIVED = 'ACQUIRER_RESPONSE_RECEIVED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  RETRY_ATTEMPTED = 'RETRY_ATTEMPTED',
  TRANSACTION_DECLINED = 'TRANSACTION_DECLINED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_APPROVED = 'TRANSACTION_APPROVED',
}

@Entity('transaction_event')
export class TransactionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({
    type: 'enum',
    enum: TransactionEventType,
    name: 'event_type',
  })
  eventType: TransactionEventType;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'APPROVED', 'DECLINED', 'FAILED'],
    nullable: true,
    name: 'previous_status',
  })
  previousStatus: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'APPROVED', 'DECLINED', 'FAILED'],
    nullable: true,
    name: 'new_status',
  })
  newStatus: string | null;

  @Column({ name: 'event_payload', type: 'json', nullable: true })
  payload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
