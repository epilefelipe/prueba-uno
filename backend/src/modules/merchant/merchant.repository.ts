import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IMerchantRepository } from './merchant.repository.interface';
import { Merchant } from './entities/merchant.entity';

@Injectable()
export class MerchantRepository implements IMerchantRepository {
  constructor(
    @InjectRepository(Merchant)
    private readonly repo: Repository<Merchant>,
  ) {}

  findById(id: string): Promise<Merchant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByApiKey(apiKey: string): Promise<Merchant | null> {
    return this.repo.findOne({ where: { apiKey } });
  }

  async create(data: Partial<Merchant>): Promise<Merchant> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAll(): Promise<Merchant[]> {
    return this.repo.find();
  }

  findTransactions(merchantId: string): Promise<any[]> {
    return this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.transactions', 'transaction')
      .where('merchant.id = :id', { id: merchantId })
      .orderBy('transaction.createdAt', 'DESC')
      .getMany()
      .then((merchants) => merchants[0]?.transactions || []);
  }

  findAuthorizations(merchantId: string): Promise<any[]> {
    return this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.authorizations', 'authorization')
      .where('merchant.id = :id', { id: merchantId })
      .orderBy('authorization.createdAt', 'DESC')
      .getMany()
      .then((merchants) => merchants[0]?.authorizations || []);
  }
}
