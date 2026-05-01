import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class TransactionEventObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  transactionId: string;

  @Field()
  eventType: string;

  @Field(() => String, { nullable: true })
  previousStatus: string | null;

  @Field(() => String, { nullable: true })
  newStatus: string | null;

  @Field(() => String, { nullable: true })
  payload: string | null;

  @Field()
  createdAt: Date;
}
