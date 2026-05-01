import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { TransactionModule } from '../transaction/transaction.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TransactionModule, AuthorizationModule],
  controllers: [PaymentController],
})
export class PaymentModule {}
