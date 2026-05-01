import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { IMerchantRepository } from './merchant.repository.interface';
import { MerchantRepository } from './merchant.repository';
import { MerchantService } from './merchant.service';
import { MerchantResolver } from './merchant.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant])],
  providers: [
    { provide: IMerchantRepository, useClass: MerchantRepository },
    MerchantService,
    MerchantResolver,
  ],
  exports: [IMerchantRepository, MerchantService],
})
export class MerchantModule {}
