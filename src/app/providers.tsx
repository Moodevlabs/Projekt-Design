import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useClientActivity } from '@/data/queries/useClientActivity';
import { useUpdateCheckOnStart } from '@/features/settings/useAppUpdate';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { pl } from '@/i18n/pl';

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

/**
 * Ciche sprawdzenie aktualizacji przy starcie (T-19).
 *
 * Mówi tylko wtedy, gdy JEST nowa wersja, i nie instaluje niczego samo:
 * restart w środku przygotowywania oferty jest gorszy niż dzień zwłoki
 * z poprawką. Instalacja czeka w Ustawieniach.
 */
function UpdateWatcher() {
  useUpdateCheckOnStart(
    useCallback((version: string) => {
      toast.info(pl.update.foundOnStart(version), {
        description: pl.update.title + ' → ' + pl.app.name,
        duration: 12_000,
      });
    }, []),
  );
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
          <UpdateWatcher />
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
