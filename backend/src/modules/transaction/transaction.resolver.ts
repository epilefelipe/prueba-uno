import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TransactionService } from './transaction.service';
import { TransactionObjectType } from './transaction.types';
import { CreateTransactionInput } from './dto/create-transaction.input';

@Resolver(() => TransactionObjectType)
export class TransactionResolver {
  constructor(private readonly service: TransactionService) {}

  @Mutation(() => TransactionObjectType)
  async createTransaction(
    @Args('input') input: CreateTransactionInput,
  ): Promise<TransactionObjectType> {
    return this.service.create(input);
  }

  @Query(() => [TransactionObjectType])
  async transactions(
    @Args('merchantId', { nullable: true }) merchantId?: string,
  ): Promise<TransactionObjectType[]> {
    if (merchantId) {
      return this.service.findByMerchantId(merchantId);
    }
    return this.service.findAll();
  }

  @Query(() => TransactionObjectType, { nullable: true })
  async transaction(
    @Args('id', { type: () => String }) id: string,
  ): Promise<TransactionObjectType | null> {
    return this.service.findById(id);
  }

  @Query(() => TransactionObjectType, { nullable: true })
  async transactionByIdempotencyKey(
    @Args('idempotencyKey', { type: () => String }) idempotencyKey: string,
  ): Promise<TransactionObjectType | null> {
    return this.service.findByIdempotencyKey(idempotencyKey);
  }
}
