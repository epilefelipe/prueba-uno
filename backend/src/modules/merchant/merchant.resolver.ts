import { Resolver, Query, Mutation, Args, ResolveField } from '@nestjs/graphql';
import { MerchantService } from './merchant.service';
import {
  MerchantType,
  TransactionType,
  AuthorizationType,
} from './merchant.types';
import { CreateMerchantInput } from './dto/create-merchant.input';
import { Merchant } from './entities/merchant.entity';

@Resolver(() => MerchantType)
export class MerchantResolver {
  constructor(private readonly service: MerchantService) {}

  @Mutation(() => MerchantType)
  async createMerchant(
    @Args('input') input: CreateMerchantInput,
  ): Promise<MerchantType> {
    return this.service.create(input.name);
  }

  @Query(() => [MerchantType])
  async merchants(): Promise<MerchantType[]> {
    return this.service.findAll();
  }

  @Query(() => MerchantType, { nullable: true })
  async merchant(
    @Args('id', { type: () => String }) id: string,
  ): Promise<MerchantType | null> {
    return this.service.findById(id);
  }

  @Query(() => [TransactionType], { nullable: true })
  async merchantTransactions(
    @Args('merchantId', { type: () => String }) merchantId: string,
  ): Promise<TransactionType[]> {
    return this.service.findTransactions(merchantId);
  }

  @Query(() => [AuthorizationType], { nullable: true })
  async merchantAuthorizations(
    @Args('merchantId', { type: () => String }) merchantId: string,
  ): Promise<AuthorizationType[]> {
    return this.service.findAuthorizations(merchantId);
  }

  @ResolveField(() => [AuthorizationType], { nullable: true })
  async authorizations(parent: Merchant): Promise<any[]> {
    return parent.authorizations || [];
  }
}
