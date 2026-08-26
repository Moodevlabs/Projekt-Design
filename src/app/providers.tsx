import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useClientActivity } from '@/data/queries/useClientActivity';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Subskrypcja Realtime na ruch klienta pod linkiem (T-26).
 *
 * Osobny komponent, a nie hook w `Providers`, bo musi stać WEWNĄTRZ
 * `QueryClientProvider` — unieważnia zapytania. I nie w `AppShell`: to jest
 * sprawa całej aplikacji, a nie układu ekranu.
 */
function ClientActivityWatcher() {
  useClientActivity();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient tworzony raz na cykl życia aplikacji, ale w stanie — żeby HMR go nie gubił.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <ClientActivityWatcher />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
