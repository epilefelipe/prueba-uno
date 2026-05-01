import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AuthorizeTransactionInput {
  @Field()
  transactionId: string;

  @Field()
  cardToken: string;
}
