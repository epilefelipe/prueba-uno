import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ITransactionRepository } from './transaction.repository.interface';
import { AuditService } from '../audit/audit.service';
import {
  TransactionEvent,
  TransactionEventType,
} from '../audit/entities/transaction-event.entity';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { Transaction, TransactionStatus } from './entities/transaction.entity';

const MAX_AMOUNT = 100000;
const MIN_AMOUNT = 0.01;

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    if (input.amount < MIN_AMOUNT) {
      throw new BadRequestException(
        `Amount must be at least ${MIN_AMOUNT}`,
      );
    }
    if (input.amount > MAX_AMOUNT) {
      throw new BadRequestException(
        `Amount exceeds maximum allowed (${MAX_AMOUNT})`,
      );
    }
    if (!['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'ARS', 'COP'].includes(input.currency)) {
      throw new BadRequestException(`Unsupported currency: ${input.currency}`);
    }

    const existing = await this.transactionRepo.findByExternalOrderId(
      input.merchantId,
      input.externalOrderId,
    );

    if (existing && existing.status === TransactionStatus.APPROVED) {
      await this.auditService.logEvent(existing.id, TransactionEventType.TRANSACTION_CREATED, {
        previousStatus: existing.status,
        newStatus: existing.status,
        payload: { idempotent: true, reason: 'already_approved' },
      });
      return existing;
    }

    if (
      existing &&
      [TransactionStatus.PENDING, TransactionStatus.PROCESSING].includes(
        existing.status,
      )
    ) {
      await this.auditService.logEvent(existing.id, TransactionEventType.TRANSACTION_CREATED, {
        previousStatus: existing.status,
        newStatus: existing.status,
        payload: { idempotent: true, reason: 'in_progress' },
      });
      return existing;
    }

    if (input.idempotencyKey) {
      const existingByKey = await this.transactionRepo.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (existingByKey) {
        await this.auditService.logEvent(existingByKey.id, TransactionEventType.TRANSACTION_CREATED, {
          previousStatus: existingByKey.status,
          newStatus: existingByKey.status,
          payload: { idempotent: true, reason: 'idempotency_key_match' },
        });
        return existingByKey;
      }
    }

    const idempotencyKey =
      input.idempotencyKey || `idem_${crypto.randomUUID()}`;

    const transaction = await this.transactionRepo.create({
      ...input,
      idempotencyKey,
      status: TransactionStatus.PENDING,
    });

    await this.auditService.logEvent(transaction.id, TransactionEventType.TRANSACTION_CREATED, {
      newStatus: TransactionStatus.PENDING,
      payload: {
        merchantId: input.merchantId,
        externalOrderId: input.externalOrderId,
        amount: input.amount,
        currency: input.currency,
        idempotencyKey,
      },
    });

    return transaction;
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
  ): Promise<Transaction> {
    const previous = await this.transactionRepo.findById(id);
    if (!previous) throw new NotFoundException(`Transaction ${id} not found`);

    const updated = await this.transactionRepo.update(id, { status });

    await this.auditService.logEvent(id, TransactionEventType.STATUS_UPDATED, {
      previousStatus: previous.status,
      newStatus: status,
      payload: { source: 'updateStatus' },
    });

    return updated;
  }

  findById(id: string): Promise<Transaction | null> {
    return this.transactionRepo.findById(id);
  }

  findAll(): Promise<Transaction[]> {
    return this.transactionRepo.findAll();
  }

  findByMerchantId(merchantId: string): Promise<Transaction[]> {
    return this.transactionRepo.findByMerchantId(merchantId);
  }

  findByIdempotencyKey(key: string): Promise<Transaction | null> {
    return this.transactionRepo.findByIdempotencyKey(key);
  }

  async validateActivePayment(idempotencyKey: string): Promise<Transaction> {
    const tx = await this.transactionRepo.findByIdempotencyKey(idempotencyKey);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (
      ![TransactionStatus.PENDING, TransactionStatus.PROCESSING].includes(
        tx.status,
      )
    ) {
      throw new BadRequestException(`Transaction is ${tx.status}`);
    }
    return tx;
  }
}
