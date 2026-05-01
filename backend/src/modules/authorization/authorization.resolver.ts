import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { AuthorizationService } from './authorization.service';
import {
  AuthorizationObjectType,
  AuthorizeResponse,
} from './authorization.types';
import { AuthorizeTransactionInput } from './dto/authorize-transaction.input';

@Resolver(() => AuthorizationObjectType)
export class AuthorizationResolver {
  constructor(private readonly service: AuthorizationService) {}

  @Mutation(() => AuthorizeResponse)
  async authorizeTransaction(
    @Args('input') input: AuthorizeTransactionInput,
  ): Promise<AuthorizeResponse> {
    const auth = await this.service.authorize(input);
    const isSuccess = auth.status === 'APPROVED';

    return {
      success: isSuccess,
      authorizationId: auth.id,
      message: isSuccess
        ? 'Transaction approved'
        : auth.errorCode || 'Transaction declined',
    };
  }

  @Mutation(() => AuthorizeResponse)
  async retryAuthorization(
    @Args('input') input: AuthorizeTransactionInput,
  ): Promise<AuthorizeResponse> {
    const auth = await this.service.retryAuthorization(
      input.transactionId,
      input.cardToken,
    );
    const isSuccess = auth.status === 'APPROVED';

    return {
      success: isSuccess,
      authorizationId: auth.id,
      message: isSuccess
        ? 'Transaction approved on retry'
        : auth.errorCode || 'Transaction declined',
    };
  }

  @Query(() => [AuthorizationObjectType])
  async authorizationsByTransaction(
    @Args('transactionId', { type: () => String }) transactionId: string,
  ): Promise<AuthorizationObjectType[]> {
    return this.service.findByTransactionId(transactionId);
  }
}
