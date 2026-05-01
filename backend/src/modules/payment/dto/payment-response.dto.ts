export class PaymentResponse {
  id: string;
  merchantId: string;
  externalOrderId: string;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string;
  authorizationId: string | null;
  acquirerReference: string | null;
  errorCode: string | null;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
