import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class MerchantType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  apiKey: string;

  @Field()
  status: string;

  @Field(() => [TransactionType], { nullable: true })
  transactions?: TransactionType[];

  @Field(() => [AuthorizationType], { nullable: true })
  authorizations?: AuthorizationType[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class TransactionType {
  @Field(() => ID)
  id: string;

  @Field(() => MerchantType)
  merchant: MerchantType;

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

  @Field(() => [AuthorizationType], { nullable: true })
  authorizations?: AuthorizationType[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class AuthorizationType {
  @Field(() => ID)
  id: string;

  @Field(() => TransactionType)
  transaction: TransactionType;

  @Field(() => MerchantType)
  merchant: MerchantType;

  @Field({ nullable: true })
  acquirerReference?: string;

  @Field()
  status: string;

  @Field(() => String, { nullable: true })
  requestPayload?: Record<string, any>;

  @Field(() => String, { nullable: true })
  responsePayload?: Record<string, any>;

  @Field({ nullable: true })
  errorCode?: string;

  @Field()
  createdAt: Date;
}
