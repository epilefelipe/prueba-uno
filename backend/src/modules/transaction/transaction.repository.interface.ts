import { Transaction, TransactionStatus } from './entities/transaction.entity';

export abstract class ITransactionRepository {
  abstract findById(id: string): Promise<Transaction | null>;
  abstract findByIdempotencyKey(key: string): Promise<Transaction | null>;
  abstract findByExternalOrderId(
    merchantId: string,
    externalOrderId: string,
  ): Promise<Transaction | null>;
  abstract findByStatus(status: TransactionStatus): Promise<Transaction[]>;
  abstract findAll(): Promise<Transaction[]>;
  abstract findByMerchantId(merchantId: string): Promise<Transaction[]>;
  abstract create(data: Partial<Transaction>): Promise<Transaction>;
  abstract update(id: string, data: Partial<Transaction>): Promise<Transaction>;
}
