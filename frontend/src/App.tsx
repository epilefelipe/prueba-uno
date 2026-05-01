import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantForm, MerchantList } from './components/MerchantSection';
import { TransactionPanel } from './components/TransactionPanel';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">Payment Processing Service</h1>

        <section>
          <h2 className="text-lg font-semibold mb-2">Merchants</h2>
          <MerchantForm />
          <MerchantList />
        </section>

        <hr />

        <TransactionPanel />
      </div>
    </QueryClientProvider>
  );
}
