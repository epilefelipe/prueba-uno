import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { ITransactionRepository } from './transaction.repository.interface';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';
import { TransactionResolver } from './transaction.resolver';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), AuditModule],
  providers: [
    { provide: ITransactionRepository, useClass: TransactionRepository },
    TransactionService,
    TransactionResolver,
  ],
  exports: [ITransactionRepository, TransactionService],
})
export class TransactionModule {}
