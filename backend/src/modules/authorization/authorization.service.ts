import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IAuthorizationRepository } from './authorization.repository.interface';
import { ITransactionRepository } from '../transaction/transaction.repository.interface';
import { IMerchantRepository } from '../merchant/merchant.repository.interface';
import { AuditService } from '../audit/audit.service';
import { AuthorizeTransactionInput } from './dto/authorize-transaction.input';
import {
  TransactionEventType,
} from '../audit/entities/transaction-event.entity';
import {
  Authorization,
  AuthorizationStatus,
} from './entities/authorization.entity';
import { TransactionStatus } from '../transaction/entities/transaction.entity';

function validateCardToken(cardToken: string): void {
  if (!cardToken || cardToken.trim().length === 0) {
    throw new BadRequestException('Card token is required');
  }
  if (!cardToken.startsWith('tok_')) {
    throw new BadRequestException(
      'Invalid card token format. Must start with "tok_"',
    );
  }
  if (cardToken.length < 8) {
    throw new BadRequestException(
      'Card token is too short. Must be at least 8 characters',
    );
  }
}

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly authRepo: IAuthorizationRepository,
    private readonly transactionRepo: ITransactionRepository,
    private readonly merchantRepo: IMerchantRepository,
    private readonly auditService: AuditService,
  ) {}

  async authorize(input: AuthorizeTransactionInput): Promise<Authorization> {
    validateCardToken(input.cardToken);
    const transaction = await this.transactionRepo.findById(
      input.transactionId,
    );
    if (!transaction) throw new NotFoundException('Transaction not found');

    if (transaction.status === TransactionStatus.APPROVED) {
      const existingAuth = await this.authRepo.findLatestByTransaction(
        transaction.id,
      );
      await this.auditService.logEvent(transaction.id, TransactionEventType.AUTHORIZATION_STARTED, {
        previousStatus: transaction.status,
        newStatus: transaction.status,
        payload: { idempotent: true, reason: 'already_approved', authId: existingAuth?.id },
      });
      if (existingAuth) return existingAuth;
      throw new BadRequestException('Transaction already approved');
    }

    if (transaction.status === TransactionStatus.PROCESSING) {
      const processingAuth = await this.authRepo.findLatestByTransaction(
        transaction.id,
      );
      if (processingAuth?.status === AuthorizationStatus.PROCESSING) {
        await this.auditService.logEvent(transaction.id, TransactionEventType.AUTHORIZATION_STARTED, {
          previousStatus: transaction.status,
          newStatus: transaction.status,
          payload: { idempotent: true, reason: 'in_progress', authId: processingAuth.id },
        });
        return processingAuth;
      }
    }

    if (
      ![
        TransactionStatus.PENDING,
        TransactionStatus.DECLINED,
        TransactionStatus.FAILED,
      ].includes(transaction.status)
    ) {
      throw new BadRequestException(
        `Cannot authorize ${transaction.status} transaction`,
      );
    }

    await this.auditService.logEvent(transaction.id, TransactionEventType.AUTHORIZATION_STARTED, {
      previousStatus: transaction.status,
      payload: {
        cardToken: input.cardToken,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    return this.executeAuthorization(transaction, input.cardToken);
  }

  async retryAuthorization(
    transactionId: string,
    cardToken: string,
  ): Promise<Authorization> {
    validateCardToken(cardToken);
    const transaction = await this.transactionRepo.findById(transactionId);
    if (!transaction) throw new NotFoundException('Transaction not found');

    if (transaction.status === TransactionStatus.APPROVED) {
      const existingAuth = await this.authRepo.findLatestByTransaction(
        transaction.id,
      );
      await this.auditService.logEvent(transaction.id, TransactionEventType.RETRY_ATTEMPTED, {
        previousStatus: transaction.status,
        newStatus: transaction.status,
        payload: { idempotent: true, reason: 'already_approved', authId: existingAuth?.id },
      });
      if (existingAuth) return existingAuth;
      throw new BadRequestException('Transaction already approved');
    }

    if (transaction.status === TransactionStatus.PROCESSING) {
      const processingAuth = await this.authRepo.findLatestByTransaction(
        transaction.id,
      );
      if (processingAuth?.status === AuthorizationStatus.PROCESSING) {
        await this.auditService.logEvent(transaction.id, TransactionEventType.RETRY_ATTEMPTED, {
          previousStatus: transaction.status,
          newStatus: transaction.status,
          payload: { idempotent: true, reason: 'in_progress', authId: processingAuth.id },
        });
        return processingAuth;
      }
    }

    if (
      ![TransactionStatus.DECLINED, TransactionStatus.FAILED].includes(
        transaction.status,
      )
    ) {
      throw new BadRequestException(
        `Can only retry DECLINED or FAILED transactions, current status: ${transaction.status}`,
      );
    }

    await this.auditService.logEvent(transaction.id, TransactionEventType.RETRY_ATTEMPTED, {
      previousStatus: transaction.status,
      payload: {
        cardToken,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    return this.executeAuthorization(transaction, cardToken);
  }

  private async executeAuthorization(
    transaction: any,
    cardToken: string,
    maxRetries: number = 3,
  ): Promise<Authorization> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (attempt > 1) {
        await this.auditService.logEvent(transaction.id, TransactionEventType.RETRY_ATTEMPTED, {
          previousStatus: transaction.status,
          payload: { attempt, reason: lastError?.message || 'unknown' },
        });

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt - 1) * 500),
        );
      }

      try {
        const result = await this.attemptAuth(transaction, cardToken, attempt);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) {
          await this.auditService.logEvent(transaction.id, TransactionEventType.TRANSACTION_FAILED, {
            previousStatus: transaction.status,
            newStatus: TransactionStatus.FAILED,
            payload: { attempt, error: lastError.message },
          });

          await this.transactionRepo.update(transaction.id, {
            status: TransactionStatus.FAILED,
          });
          const auth = await this.authRepo.create({
            transactionId: transaction.id,
            merchantId: transaction.merchantId,
            status: AuthorizationStatus.FAILED,
            requestPayload: {
              amount: transaction.amount,
              currency: transaction.currency,
              cardToken,
              merchantId: transaction.merchantId,
              retryAttempt: attempt,
            },
            responsePayload: { error: lastError.message },
            errorCode: 'MAX_RETRIES_EXCEEDED',
          });
          return auth;
        }
      }
    }

    throw new Error('Unexpected: all retries exhausted without returning');
  }

  private async attemptAuth(
    transaction: any,
    cardToken: string,
    attempt: number = 1,
  ): Promise<Authorization> {
    await this.auditService.logEvent(transaction.id, TransactionEventType.ACQUIRER_REQUEST_SENT, {
      previousStatus: TransactionStatus.PROCESSING,
      payload: {
        attempt,
        amount: transaction.amount,
        currency: transaction.currency,
        cardToken,
      },
    });

    await this.transactionRepo.update(transaction.id, {
      status: TransactionStatus.PROCESSING,
    });

    const requestPayload = {
      amount: transaction.amount,
      currency: transaction.currency,
      cardToken,
      merchantId: transaction.merchantId,
    };

    const auth = await this.authRepo.create({
      transactionId: transaction.id,
      merchantId: transaction.merchantId,
      status: AuthorizationStatus.PROCESSING,
      requestPayload,
    });

    const response = await this.mockAcquirerCall(requestPayload);
    const isSuccess = response.approved;

    await this.auditService.logEvent(transaction.id, TransactionEventType.ACQUIRER_RESPONSE_RECEIVED, {
      previousStatus: TransactionStatus.PROCESSING,
      newStatus: isSuccess ? TransactionStatus.APPROVED : TransactionStatus.DECLINED,
      payload: {
        attempt,
        acquirerReference: response.acquirerReference,
        approved: response.approved,
        errorCode: response.errorCode,
        message: response.message,
      },
    });

    await this.transactionRepo.update(transaction.id, {
      status: isSuccess
        ? TransactionStatus.APPROVED
        : TransactionStatus.DECLINED,
    });

    if (isSuccess) {
      await this.auditService.logEvent(transaction.id, TransactionEventType.TRANSACTION_APPROVED, {
        previousStatus: TransactionStatus.PROCESSING,
        newStatus: TransactionStatus.APPROVED,
        payload: {
          acquirerReference: response.acquirerReference,
          authId: auth.id,
        },
      });
    } else {
      await this.auditService.logEvent(transaction.id, TransactionEventType.TRANSACTION_DECLINED, {
        previousStatus: TransactionStatus.PROCESSING,
        newStatus: TransactionStatus.DECLINED,
        payload: {
          errorCode: response.errorCode,
          message: response.message,
          authId: auth.id,
        },
      });
    }

    return this.authRepo.update(auth.id, {
      status: isSuccess
        ? AuthorizationStatus.APPROVED
        : AuthorizationStatus.DECLINED,
      acquirerReference: response.acquirerReference,
      responsePayload: response,
      errorCode: isSuccess ? null : response.errorCode,
    });
  }

  private async mockAcquirerCall(
    payload: Record<string, any>,
  ): Promise<Record<string, any>> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const approved = Math.random() > 0.3;
    const acquirerReference = `acq_${crypto.randomUUID().slice(0, 12)}`;

    return {
      approved,
      acquirerReference,
      errorCode: approved ? null : 'INSUFFICIENT_FUNDS',
      message: approved ? 'Approved' : 'Card declined',
      timestamp: new Date().toISOString(),
    };
  }

  findByTransactionId(transactionId: string): Promise<Authorization[]> {
    return this.authRepo.findByTransactionId(transactionId);
  }

  findById(id: string): Promise<Authorization | null> {
    return this.authRepo.findById(id);
  }
}
