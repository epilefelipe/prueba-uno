import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createMerchant,
  getMerchants,
  createTransaction,
  getTransaction,
  getTransactions,
  authorizeTransaction,
  retryAuthorization,
  getAuthorizationsByTransaction,
  getTransactionEvents,
} from '../lib/api';

export function useMerchants() {
  return useQuery({
    queryKey: ['merchants'],
    queryFn: getMerchants,
  });
}

export function useCreateMerchant() {
  return useMutation({
    mutationFn: (name: string) => createMerchant(name),
  });
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: createTransaction,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => getTransaction(id!),
    enabled: !!id,
  });
}

export function useTransactions(merchantId?: string | null) {
  return useQuery({
    queryKey: ['transactions', merchantId],
    queryFn: () => getTransactions(merchantId || undefined),
  });
}

export function useAuthorize() {
  return useMutation({
    mutationFn: ({
      transactionId,
      cardToken,
    }: {
      transactionId: string;
      cardToken: string;
    }) => authorizeTransaction(transactionId, cardToken),
  });
}

export function useRetryAuthorization() {
  return useMutation({
    mutationFn: ({
      transactionId,
      cardToken,
    }: {
      transactionId: string;
      cardToken: string;
    }) => retryAuthorization(transactionId, cardToken),
  });
}

export function useAuthorizations(transactionId: string | null) {
  return useQuery({
    queryKey: ['authorizations', transactionId],
    queryFn: () => getAuthorizationsByTransaction(transactionId!),
    enabled: !!transactionId,
  });
}

export function useTransactionEvents(transactionId: string | null) {
  return useQuery({
    queryKey: ['transactionEvents', transactionId],
    queryFn: () => getTransactionEvents(transactionId!),
    enabled: !!transactionId,
  });
}
