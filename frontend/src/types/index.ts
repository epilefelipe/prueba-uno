export interface Merchant {
  id: string;
  name: string;
  apiKey: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  merchantId: string;
  externalOrderId: string;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface Authorization {
  id: string;
  transactionId: string;
  merchantId: string;
  acquirerReference: string | null;
  status: string;
  requestPayload: Record<string, any> | null;
  responsePayload: Record<string, any> | null;
  errorCode: string | null;
  createdAt: string;
}

export interface AuthorizeResponse {
  success: boolean;
  authorizationId: string;
  message: string;
}

export interface TransactionEvent {
  id: string;
  transactionId: string;
  eventType: string;
  previousStatus: string | null;
  newStatus: string | null;
  payload: string | null;
  createdAt: string;
}
