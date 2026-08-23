import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('app.error');

interface State {
  error: Error | null;
}

/**
 * Ostatnia siatka pod aplikacją (T-17).
 *
 * Bez niej wyjątek w renderze daje **biały ekran** — użytkownik nie wie, czy
 * aplikacja się zawiesiła, czy zniknęły jego dane, i nie ma czego zgłosić.
 * To nie jest hipoteza: dokładnie tak wyglądał błąd podwójnego montowania
 * edytora w trybie deweloperskim, zanim znaleźliśmy przyczynę.
 *
 * Ekran mówi trzy rzeczy w tej kolejności: **dane są bezpieczne** (zapisane
 * w chmurze), co się stało (treść błędu — do skopiowania w zgłoszeniu),
 * i co można zrobić (przeładuj / wróć). Klasa, a nie hook, bo React nie ma
 * hookowego odpowiednika `componentDidCatch`.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    log.error('Nieobsluzony blad renderowania', { error, componentStack: info.componentStack });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="card-surface w-full max-w-lg px-8 py-10 text-center">
          <AlertTriangle className="text-ink-soft mx-auto size-8" aria-hidden />

          <h1 className="text-ink mt-4 text-xl font-semibold tracking-tight">
            {pl.errors.crashTitle}
          </h1>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">{pl.errors.crashLead}</p>

          {/*
            Tresc bledu pokazujemy WPROST, a nie chowamy za „szczegoly
            techniczne": to jedyna rzecz, ktora uzytkownik moze wkleic
            w zgloszeniu, a bez niej diagnoza zaczyna sie od zera.
          */}
          <pre className="bg-surface text-ink-soft mt-5 max-h-32 overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap">
            {error.message}
          </pre>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>{pl.errors.crashReload}</Button>
            <Button variant="outline" onClick={this.reset}>
              {pl.errors.crashBack}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
