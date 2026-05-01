import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class TransactionObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  merchantId: string;

  @Field()
  externalOrderId: string;

  @Field()
  amount: number;

  @Field()
  currency: string;

  @Field()
  status: string;

  @Field()
  idempotencyKey: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
