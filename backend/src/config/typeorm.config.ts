import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TransactionEvent } from '../modules/audit/entities/transaction-event.entity';
import { Merchant } from '../modules/merchant/entities/merchant.entity';
import { Transaction } from '../modules/transaction/entities/transaction.entity';
import { Authorization } from '../modules/authorization/entities/authorization.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'payment_platform',
    entities: [Merchant, Transaction, Authorization, TransactionEvent],
    synchronize: true,
    logging: process.env.NODE_ENV !== 'production',
  }),
);
