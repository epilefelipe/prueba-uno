import { TransactionEvent } from './entities/transaction-event.entity';

export abstract class ITransactionEventRepository {
  abstract create(data: Partial<TransactionEvent>): Promise<TransactionEvent>;
  abstract findByTransactionId(
    transactionId: string,
  ): Promise<TransactionEvent[]>;
  abstract findAll(): Promise<TransactionEvent[]>;
}
