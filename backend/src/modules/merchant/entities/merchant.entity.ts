import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { Authorization } from '../../authorization/entities/authorization.entity';

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

@Entity()
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({
    type: 'enum',
    enum: MerchantStatus,
    default: MerchantStatus.ACTIVE,
  })
  status: MerchantStatus;

  @OneToMany(() => Transaction, (tx: Transaction) => tx.merchant)
  transactions: Transaction[];

  @OneToMany(() => Authorization, (auth: Authorization) => auth.merchant)
  authorizations: Authorization[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
