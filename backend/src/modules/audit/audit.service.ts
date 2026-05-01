import { Injectable } from '@nestjs/common';
import { ITransactionEventRepository } from './transaction-event.repository.interface';
import {
  TransactionEvent,
  TransactionEventType,
} from './entities/transaction-event.entity';

@Injectable()
export class AuditService {
  constructor(
    private readonly eventRepo: ITransactionEventRepository,
  ) {}

  async logEvent(
    transactionId: string,
    eventType: TransactionEventType,
    options?: {
      previousStatus?: string | null;
      newStatus?: string | null;
      payload?: Record<string, any>;
    },
  ): Promise<TransactionEvent> {
    return this.eventRepo.create({
      transactionId,
      eventType,
      previousStatus: options?.previousStatus || null,
      newStatus: options?.newStatus || null,
      payload: options?.payload || {},
    });
  }

  findByTransactionId(transactionId: string): Promise<TransactionEvent[]> {
    return this.eventRepo.findByTransactionId(transactionId);
  }

  findAll(): Promise<TransactionEvent[]> {
    return this.eventRepo.findAll();
  }
}
