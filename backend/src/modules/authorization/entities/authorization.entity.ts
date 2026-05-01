import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from '../../merchant/entities/merchant.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';

export enum AuthorizationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  FAILED = 'FAILED',
}

@Entity()
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'merchant_id' })
  merchantId: string;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'acquirer_reference', nullable: true })
  acquirerReference: string;

  @Column({
    type: 'enum',
    enum: AuthorizationStatus,
    default: AuthorizationStatus.PENDING,
  })
  status: AuthorizationStatus;

  @Column({ name: 'request_payload', type: 'json', nullable: true })
  requestPayload: Record<string, any>;

  @Column({ name: 'response_payload', type: 'json', nullable: true })
  responsePayload: Record<string, any>;

  @Column({ name: 'error_code', nullable: true })
  errorCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
