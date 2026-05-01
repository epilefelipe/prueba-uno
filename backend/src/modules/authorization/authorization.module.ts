import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Authorization } from './entities/authorization.entity';
import { IAuthorizationRepository } from './authorization.repository.interface';
import { AuthorizationRepository } from './authorization.repository';
import { AuthorizationService } from './authorization.service';
import { AuthorizationResolver } from './authorization.resolver';
import { TransactionModule } from '../transaction/transaction.module';
import { MerchantModule } from '../merchant/merchant.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Authorization]),
    TransactionModule,
    MerchantModule,
    AuditModule,
  ],
  providers: [
    { provide: IAuthorizationRepository, useClass: AuthorizationRepository },
    AuthorizationService,
    AuthorizationResolver,
  ],
  exports: [IAuthorizationRepository, AuthorizationService],
})
export class AuthorizationModule {}
