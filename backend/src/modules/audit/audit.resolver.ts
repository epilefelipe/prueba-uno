import { Resolver, Query, Args } from '@nestjs/graphql';
import { AuditService } from './audit.service';
import { TransactionEventObjectType } from './audit.types';

@Resolver(() => TransactionEventObjectType)
export class AuditResolver {
  constructor(private readonly service: AuditService) {}

  @Query(() => [TransactionEventObjectType])
  async transactionEvents(
    @Args('transactionId', { type: () => String }) transactionId: string,
  ): Promise<TransactionEventObjectType[]> {
    const events = await this.service.findByTransactionId(transactionId);
    return events.map((e) => ({
      ...e,
      payload: e.payload ? JSON.stringify(e.payload) : null,
    }));
  }

  @Query(() => [TransactionEventObjectType])
  async allTransactionEvents(): Promise<TransactionEventObjectType[]> {
    const events = await this.service.findAll();
    return events.map((e) => ({
      ...e,
      payload: e.payload ? JSON.stringify(e.payload) : null,
    }));
  }
}
