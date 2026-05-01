import { Merchant } from './entities/merchant.entity';

export abstract class IMerchantRepository {
  abstract findById(id: string): Promise<Merchant | null>;
  abstract findByApiKey(apiKey: string): Promise<Merchant | null>;
  abstract findAll(): Promise<Merchant[]>;
  abstract create(data: Partial<Merchant>): Promise<Merchant>;
  abstract findTransactions(merchantId: string): Promise<any[]>;
  abstract findAuthorizations(merchantId: string): Promise<any[]>;
}
