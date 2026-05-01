import { gqlFetch } from './graphql-client';
import type {
  Merchant,
  Transaction,
  Authorization,
  AuthorizeResponse,
  TransactionEvent,
} from '../types';

export async function createMerchant(name: string): Promise<Merchant> {
  const data = await gqlFetch<{ createMerchant: Merchant }>(
    `mutation CreateMerchant($name: String!) {
      createMerchant(input: { name: $name }) {
        id name apiKey status createdAt updatedAt
      }
    }`,
    { name },
  );
  return data.createMerchant;
}

export async function getMerchants(): Promise<Merchant[]> {
  const data = await gqlFetch<{ merchants: Merchant[] }>(
    `query GetMerchants {
      merchants {
        id name apiKey status createdAt updatedAt
      }
    }`,
  );
  return data.merchants;
}

export async function createTransaction(input: {
  merchantId: string;
  externalOrderId: string;
  amount: number;
  currency: string;
}): Promise<Transaction> {
  const data = await gqlFetch<{ createTransaction: Transaction }>(
    `mutation CreateTransaction($input: CreateTransactionInput!) {
      createTransaction(input: $input) {
        id merchantId externalOrderId amount currency status idempotencyKey createdAt updatedAt
      }
    }`,
    { input },
  );
  return data.createTransaction;
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const data = await gqlFetch<{ transaction: Transaction | null }>(
    `query GetTransaction($id: String!) {
      transaction(id: $id) {
        id merchantId externalOrderId amount currency status idempotencyKey createdAt updatedAt
      }
    }`,
    { id },
  );
  return data.transaction;
}

export async function getTransactions(
  merchantId?: string,
): Promise<Transaction[]> {
  const data = await gqlFetch<{ transactions: Transaction[] }>(
    `query GetTransactions($merchantId: String) {
      transactions(merchantId: $merchantId) {
        id merchantId externalOrderId amount currency status idempotencyKey createdAt updatedAt
      }
    }`,
    { merchantId: merchantId || null },
  );
  return data.transactions;
}

export async function authorizeTransaction(
  transactionId: string,
  cardToken: string,
): Promise<AuthorizeResponse> {
  const data = await gqlFetch<{ authorizeTransaction: AuthorizeResponse }>(
    `mutation AuthorizeTransaction($input: AuthorizeTransactionInput!) {
      authorizeTransaction(input: $input) {
        success authorizationId message
      }
    }`,
    { input: { transactionId, cardToken } },
  );
  return data.authorizeTransaction;
}

export async function retryAuthorization(
  transactionId: string,
  cardToken: string,
): Promise<AuthorizeResponse> {
  const data = await gqlFetch<{ retryAuthorization: AuthorizeResponse }>(
    `mutation RetryAuthorization($input: AuthorizeTransactionInput!) {
      retryAuthorization(input: $input) {
        success authorizationId message
      }
    }`,
    { input: { transactionId, cardToken } },
  );
  return data.retryAuthorization;
}

export async function getAuthorizationsByTransaction(
  transactionId: string,
): Promise<Authorization[]> {
  const data = await gqlFetch<{ authorizationsByTransaction: Authorization[] }>(
    `query GetAuthorizations($transactionId: String!) {
      authorizationsByTransaction(transactionId: $transactionId) {
        id transactionId merchantId acquirerReference status requestPayload responsePayload errorCode createdAt
      }
    }`,
    { transactionId },
  );
  return data.authorizationsByTransaction;
}

export async function getTransactionEvents(
  transactionId: string,
): Promise<TransactionEvent[]> {
  const data = await gqlFetch<{ transactionEvents: TransactionEvent[] }>(
    `query GetTransactionEvents($transactionId: String!) {
      transactionEvents(transactionId: $transactionId) {
        id transactionId eventType previousStatus newStatus payload createdAt
      }
    }`,
    { transactionId },
  );
  return data.transactionEvents;
}
