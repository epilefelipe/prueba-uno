import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEvent } from './entities/transaction-event.entity';
import { ITransactionEventRepository } from './transaction-event.repository.interface';
import { TransactionEventRepository } from './transaction-event.repository';
import { AuditService } from './audit.service';
import { AuditResolver } from './audit.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEvent])],
  providers: [
    {
      provide: ITransactionEventRepository,
      useClass: TransactionEventRepository,
    },
    AuditService,
    AuditResolver,
  ],
  exports: [AuditService],
})
export class AuditModule {}
