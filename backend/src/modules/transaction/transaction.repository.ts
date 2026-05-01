import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITransactionRepository } from './transaction.repository.interface';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  findById(id: string): Promise<Transaction | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['merchant', 'authorizations'],
    });
  }

  findByIdempotencyKey(key: string): Promise<Transaction | null> {
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  findByExternalOrderId(
    merchantId: string,
    externalOrderId: string,
  ): Promise<Transaction | null> {
    return this.repo.findOne({
      where: { merchantId, externalOrderId },
      order: { createdAt: 'DESC' },
    });
  }

  findByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return this.repo.find({ where: { status } });
  }

  findAll(): Promise<Transaction[]> {
    return this.repo.find({
      relations: ['merchant', 'authorizations'],
      order: { createdAt: 'DESC' },
    });
  }

  findByMerchantId(merchantId: string): Promise<Transaction[]> {
    return this.repo.find({
      where: { merchantId },
      relations: ['merchant', 'authorizations'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    await this.repo.update(id, data);
    const result = await this.repo.findOne({
      where: { id },
      relations: ['merchant', 'authorizations'],
    });
    if (!result) throw new Error(`Transaction ${id} not found after update`);
    return result;
  }
}
