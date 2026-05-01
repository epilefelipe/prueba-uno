import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class AuthorizationObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  transactionId: string;

  @Field()
  merchantId: string;

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

@ObjectType()
export class AuthorizeResponse {
  @Field()
  success: boolean;

  @Field(() => String, { nullable: true })
  authorizationId?: string;

  @Field({ nullable: true })
  message?: string;
}
