import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationRepository } from './authorization.repository.interface';
import { Authorization } from './entities/authorization.entity';

@Injectable()
export class AuthorizationRepository implements IAuthorizationRepository {
  constructor(
    @InjectRepository(Authorization)
    private readonly repo: Repository<Authorization>,
  ) {}

  findById(id: string): Promise<Authorization | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['transaction', 'merchant'],
    });
  }

  findByTransactionId(transactionId: string): Promise<Authorization[]> {
    return this.repo.find({
      where: { transactionId },
      order: { createdAt: 'DESC' },
    });
  }

  findLatestByTransaction(
    transactionId: string,
  ): Promise<Authorization | null> {
    return this.repo.findOne({
      where: { transactionId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Authorization>): Promise<Authorization> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    data: Partial<Authorization>,
  ): Promise<Authorization> {
    await this.repo.update(id, data);
    const result = await this.repo.findOne({
      where: { id },
      relations: ['transaction', 'merchant'],
    });
    if (!result) throw new Error(`Authorization ${id} not found after update`);
    return result;
  }
}
