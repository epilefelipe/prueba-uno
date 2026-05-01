import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateTransactionInput {
  @Field()
  merchantId: string;

  @Field()
  externalOrderId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field({ nullable: true })
  idempotencyKey?: string;
}
