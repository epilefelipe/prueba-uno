import { Authorization } from './entities/authorization.entity';

export abstract class IAuthorizationRepository {
  abstract findById(id: string): Promise<Authorization | null>;
  abstract findByTransactionId(transactionId: string): Promise<Authorization[]>;
  abstract create(data: Partial<Authorization>): Promise<Authorization>;
  abstract update(
    id: string,
    data: Partial<Authorization>,
  ): Promise<Authorization>;
  abstract findLatestByTransaction(
    transactionId: string,
  ): Promise<Authorization | null>;
}
