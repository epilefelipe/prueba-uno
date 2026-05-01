import { useState } from 'react';
import { useCreateMerchant, useMerchants } from '../hooks/usePayment';

export function MerchantForm() {
  const [name, setName] = useState('');
  const createMerchant = useCreateMerchant();
  const { refetch } = useMerchants();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createMerchant.mutateAsync(name);
    setName('');
    refetch();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Merchant name"
        className="border rounded px-3 py-2 flex-1"
      />
      <button
        type="submit"
        disabled={createMerchant.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Create Merchant
      </button>
    </form>
  );
}

export function MerchantList() {
  const { data, isLoading } = useMerchants();

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!data?.length) return <p className="text-gray-400">No merchants yet</p>;

  return (
    <div className="space-y-2 mt-4">
      {data.map((m) => (
        <div key={m.id} className="border rounded p-3 bg-gray-50">
          <p className="font-medium">{m.name}</p>
          <p className="text-sm text-gray-500 font-mono">{m.apiKey}</p>
          <span
            className={`text-xs px-2 py-1 rounded ${
              m.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {m.status}
          </span>
        </div>
      ))}
    </div>
  );
}
