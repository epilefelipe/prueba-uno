import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponse } from './dto/payment-response.dto';
import { Transaction } from '../transaction/entities/transaction.entity';
import { Authorization } from '../authorization/entities/authorization.entity';

@Controller('payments')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<PaymentResponse> {
    const correlationId = requestId || crypto.randomUUID();
    this.logger.log(`[${correlationId}] Creating payment for order ${createPaymentDto.externalOrderId}`);

    const transaction = await this.transactionService.create({
      merchantId: createPaymentDto.merchantId,
      externalOrderId: createPaymentDto.externalOrderId,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      idempotencyKey: createPaymentDto.idempotencyKey,
    });

    if (transaction.status === 'PENDING') {
      this.logger.log(`[${correlationId}] Authorizing transaction ${transaction.id}`);
      const authorization = await this.authorizationService.authorize({
        transactionId: transaction.id,
        cardToken: createPaymentDto.cardToken,
      });

      return this.buildPaymentResponse(transaction, authorization);
    }

    const latestAuth = await this.authorizationService.findByTransactionId(transaction.id);
    const authorization = latestAuth.length > 0 ? latestAuth[latestAuth.length - 1] : null;

    return this.buildPaymentResponse(transaction, authorization);
  }

  @Get()
  async listPayments(
    @Query('merchant_id') merchantId?: string,
    @Query('status') status?: string,
  ): Promise<PaymentResponse[]> {
    let transactions: Transaction[];

    if (merchantId) {
      transactions = await this.transactionService.findByMerchantId(merchantId);
    } else {
      transactions = (await this.transactionService.findAll()) || [];
    }

    if (status) {
      transactions = transactions.filter((t) => t.status === status.toUpperCase());
    }

    const results: PaymentResponse[] = [];
    for (const tx of transactions) {
      const auths = await this.authorizationService.findByTransactionId(tx.id);
      const latestAuth = auths.length > 0 ? auths[auths.length - 1] : null;
      results.push(this.buildPaymentResponse(tx, latestAuth));
    }

    return results;
  }

  @Get(':id')
  async getPaymentById(
    @Param('id') id: string,
  ): Promise<PaymentResponse | null> {
    const transaction = await this.transactionService.findById(id);
    if (!transaction) return null;

    const auths = await this.authorizationService.findByTransactionId(transaction.id);
    const latestAuth = auths.length > 0 ? auths[auths.length - 1] : null;

    return this.buildPaymentResponse(transaction, latestAuth);
  }

  private buildPaymentResponse(
    transaction: Transaction,
    authorization: Authorization | null,
  ): PaymentResponse {
    return {
      id: transaction.id,
      merchantId: transaction.merchantId,
      externalOrderId: transaction.externalOrderId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      idempotencyKey: transaction.idempotencyKey,
      authorizationId: authorization?.id || null,
      acquirerReference: authorization?.acquirerReference || null,
      errorCode: authorization?.errorCode || null,
      message: authorization?.responsePayload?.message || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
