import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITransactionEventRepository } from './transaction-event.repository.interface';
import { TransactionEvent } from './entities/transaction-event.entity';

@Injectable()
export class TransactionEventRepository
  implements ITransactionEventRepository
{
  constructor(
    @InjectRepository(TransactionEvent)
    private readonly repo: Repository<TransactionEvent>,
  ) {}

  async create(data: Partial<TransactionEvent>): Promise<TransactionEvent> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findByTransactionId(transactionId: string): Promise<TransactionEvent[]> {
    return this.repo.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  findAll(): Promise<TransactionEvent[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
