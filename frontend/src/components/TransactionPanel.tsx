import { useState, useEffect } from 'react';
import {
  useCreateTransaction,
  useAuthorize,
  useRetryAuthorization,
  useAuthorizations,
  useMerchants,
  useTransactions,
  useTransaction,
  useTransactionEvents,
} from '../hooks/usePayment';
import type { TransactionEvent } from '../types';

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded font-bold ${
        status === 'APPROVED'
          ? 'bg-green-100 text-green-800'
          : status === 'DECLINED' || status === 'FAILED'
          ? 'bg-red-100 text-red-800'
          : status === 'PROCESSING'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {status}
    </span>
  );
}

const EVENT_LABELS: Record<string, string> = {
  TRANSACTION_CREATED: 'Transaction created',
  AUTHORIZATION_STARTED: 'Authorization started',
  ACQUIRER_REQUEST_SENT: 'Request sent to acquirer',
  ACQUIRER_RESPONSE_RECEIVED: 'Acquirer response received',
  STATUS_UPDATED: 'Status changed',
  RETRY_ATTEMPTED: 'Retry attempted',
  TRANSACTION_DECLINED: 'Transaction declined',
  TRANSACTION_FAILED: 'Transaction failed',
  TRANSACTION_APPROVED: 'Transaction approved',
};

function EventTimeline({ events }: { events: TransactionEvent[] }) {
  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                event.eventType.includes('APPROVED')
                  ? 'bg-green-500'
                  : event.eventType.includes('DECLINED') || event.eventType.includes('FAILED')
                  ? 'bg-red-500'
                  : 'bg-blue-500'
              }`}
            />
            {index < events.length - 1 && (
              <div className="w-px h-full bg-gray-200 flex-1" />
            )}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-800">
                {EVENT_LABELS[event.eventType] || event.eventType}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(event.createdAt).toLocaleTimeString()}
              </span>
            </div>
            {event.previousStatus && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-gray-500">
                  {event.previousStatus} → {event.newStatus || '?'}
                </span>
              </div>
            )}
            {event.payload && (() => {
              try {
                const parsed = JSON.parse(event.payload);
                return Object.keys(parsed).length > 0 ? (
                  <pre className="text-xs text-gray-400 mt-1 font-mono bg-gray-50 rounded px-2 py-1 overflow-x-auto">
                    {JSON.stringify(parsed, null, 2)}
                  </pre>
                ) : null;
              } catch {
                return null;
              }
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}


export function TransactionPanel() {
  const [merchantId, setMerchantId] = useState('');
  const [externalOrderId, setExternalOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [cardToken, setCardToken] = useState('tok_test_123');
  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [searchTxId, setSearchTxId] = useState('');

  const { data: merchants } = useMerchants();
  const { data: transactions, refetch: refetchTransactions } = useTransactions(
    merchantId || null,
  );
  const { data: searchedTx } = useTransaction(searchTxId || null);
  const createTx = useCreateTransaction();
  const authorize = useAuthorize();
  const retryAuth = useRetryAuthorization();
  const { data: authorizations, refetch: refetchAuths } =
    useAuthorizations(activeTxId);
  const { data: activeTransaction } = useTransaction(activeTxId);
  const { data: auditEvents, refetch: refetchEvents } =
    useTransactionEvents(activeTxId);
  const canRetry =
    activeTransaction &&
    ['DECLINED', 'FAILED'].includes(activeTransaction.status);

  useEffect(() => {
    if (!activeTransaction) return;
    if (activeTransaction.status === 'PROCESSING') {
      const timer = setTimeout(() => refetchTransactions(), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeTransaction?.status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId || !externalOrderId || !amount) return;
    const tx = await createTx.mutateAsync({
      merchantId,
      externalOrderId,
      amount: parseFloat(amount),
      currency,
    });
    setActiveTxId(tx.id);
    setExternalOrderId('');
    setAmount('');
    refetchTransactions();
  };

  const handleAuthorize = async () => {
    if (!activeTxId) return;
    const result = await authorize.mutateAsync({
      transactionId: activeTxId,
      cardToken,
    });
    refetchAuths();
    refetchTransactions();
    refetchEvents();
    alert(result.success ? 'Approved!' : `Declined: ${result.message}`);
  };

  const handleRetry = async () => {
    if (!activeTxId) return;
    const result = await retryAuth.mutateAsync({
      transactionId: activeTxId,
      cardToken,
    });
    refetchAuths();
    refetchTransactions();
    refetchEvents();
    alert(
      result.success ? 'Approved on retry!' : `Still declined: ${result.message}`,
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Create Transaction</h2>

      <form onSubmit={handleCreate} className="grid grid-cols-3 gap-2">
        <select
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
          className="border rounded px-3 py-2"
          required
        >
          <option value="">Select merchant</option>
          {merchants?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={externalOrderId}
          onChange={(e) => setExternalOrderId(e.target.value)}
          placeholder="Order ID"
          className="border rounded px-3 py-2"
          required
        />

        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="border rounded px-3 py-2 flex-1"
            required
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="MXN">MXN</option>
            <option value="BRL">BRL</option>
            <option value="ARS">ARS</option>
            <option value="COP">COP</option>
          </select>
          <button
            type="submit"
            disabled={createTx.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>

      {activeTxId && (
        <div className="border rounded p-4 bg-indigo-50">
          <div className="flex justify-between items-start mb-2">
            <p className="font-mono text-sm">Tx: {activeTxId}</p>
            {activeTransaction && (
              <StatusBadge status={activeTransaction.status} />
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={cardToken}
              onChange={(e) => setCardToken(e.target.value)}
              placeholder="Card token"
              className="border rounded px-3 py-2 flex-1"
            />
            {canRetry ? (
              <button
                onClick={handleRetry}
                disabled={retryAuth.isPending}
                className="bg-amber-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-amber-700"
              >
                {retryAuth.isPending ? 'Retrying...' : 'Retry Authorization'}
              </button>
            ) : activeTransaction?.status === 'APPROVED' ? (
              <span className="text-green-700 font-bold px-4 py-2">
                Approved ✓
              </span>
            ) : (
              <button
                onClick={handleAuthorize}
                disabled={authorize.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authorize.isPending ? 'Processing...' : 'Authorize'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <h2 className="text-xl font-bold mb-3">Search by Transaction ID</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTxId}
            onChange={(e) => setSearchTxId(e.target.value)}
            placeholder="Enter transaction ID..."
            className="border rounded px-3 py-2 flex-1 font-mono text-sm"
          />
        </div>
        {searchedTx && (
          <div className="mt-3 border rounded p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-500">ID</span>
              <span className="font-mono text-xs">{searchedTx.id}</span>
              <span className="text-gray-500">Status</span>
              <StatusBadge status={searchedTx.status} />
              <span className="text-gray-500">Amount</span>
              <span>
                {searchedTx.amount} {searchedTx.currency}
              </span>
              <span className="text-gray-500">Order ID</span>
              <span className="font-mono text-xs">
                {searchedTx.externalOrderId}
              </span>
              <span className="text-gray-500">Created</span>
              <span className="text-xs">
                {new Date(searchedTx.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h2 className="text-xl font-bold mb-3">
          Transactions {merchantId ? `(filtered by merchant)` : '(all)'}
        </h2>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`border rounded p-3 transition-colors ${
                  tx.id === activeTxId
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    <span
                      className="font-mono text-xs text-gray-500 cursor-pointer hover:text-gray-800"
                      onClick={() => setActiveTxId(tx.id)}
                    >
                      {tx.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {tx.amount} {tx.currency}
                    </span>
                    {tx.status === 'PENDING' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setActiveTxId(tx.id);
                          const result = await authorize.mutateAsync({
                            transactionId: tx.id,
                            cardToken,
                          });
                          refetchAuths();
                          refetchTransactions();
                          alert(
                            result.success
                              ? 'Approved!'
                              : `Declined: ${result.message}`,
                          );
                        }}
                        disabled={authorize.isPending}
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        Continue
                      </button>
                    )}
                    {['DECLINED', 'FAILED'].includes(tx.status) && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setActiveTxId(tx.id);
                          const result = await retryAuth.mutateAsync({
                            transactionId: tx.id,
                            cardToken,
                          });
                          refetchAuths();
                          refetchTransactions();
                          alert(
                            result.success
                              ? 'Approved on retry!'
                              : `Still declined: ${result.message}`,
                          );
                        }}
                        disabled={retryAuth.isPending}
                        className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Order: {tx.externalOrderId} &middot;{' '}
                  {new Date(tx.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No transactions found.</p>
        )}
      </div>

      {auditEvents && auditEvents.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-bold mb-3">Audit Trail</h3>
          <div className="bg-gray-50 rounded p-4">
            <EventTimeline events={auditEvents} />
          </div>
        </div>
      )}

      {authorizations && authorizations.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-bold mb-2">Authorization History</h3>
          <div className="space-y-2">
            {authorizations.map((a) => (
              <div key={a.id} className="border rounded p-3 bg-white">
                <div className="flex justify-between items-center">
                  <StatusBadge status={a.status} />
                  {a.errorCode && (
                    <span className="text-xs text-red-500">{a.errorCode}</span>
                  )}
                  {a.acquirerReference && (
                    <span className="text-xs font-mono text-gray-400">
                      {a.acquirerReference}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
