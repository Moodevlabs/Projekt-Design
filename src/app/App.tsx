import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';

export function App() {
  return (
    // Granica na SAMEJ GORZE, nad providerami: blad w konfiguracji zapytan
    // albo w dostawcy sesji tez ma dac ekran z komunikatem, a nie bialy.
    <AppErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </AppErrorBoundary>
  );
}
