import { Injectable } from '@nestjs/common';
import { IMerchantRepository } from './merchant.repository.interface';
import { Merchant } from './entities/merchant.entity';

@Injectable()
export class MerchantService {
  constructor(private readonly repo: IMerchantRepository) {}

  async create(name: string): Promise<Merchant> {
    const apiKey = `mk_${crypto.randomUUID().replace(/-/g, '')}`;
    return this.repo.create({ name, apiKey });
  }

  findById(id: string): Promise<Merchant | null> {
    return this.repo.findById(id);
  }

  findByApiKey(apiKey: string): Promise<Merchant | null> {
    return this.repo.findByApiKey(apiKey);
  }

  findAll(): Promise<Merchant[]> {
    return this.repo.findAll();
  }

  findTransactions(merchantId: string): Promise<any[]> {
    return this.repo.findTransactions(merchantId);
  }

  findAuthorizations(merchantId: string): Promise<any[]> {
    return this.repo.findAuthorizations(merchantId);
  }
}
