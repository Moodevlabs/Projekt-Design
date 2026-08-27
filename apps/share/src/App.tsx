import { useCallback, useEffect, useMemo, useState } from 'react';

import { applyEnabledIds, enabledItemIds, type SharedQuotePayload } from '@/domain/share/schema';
import { parseQuoteBody, type QuoteBody } from '@/domain/quote/schema';

import {
  acceptSharedQuote,
  commentSharedQuote,
  fetchSharedQuote,
  isConfigured,
  signedLogoUrl,
  tokenFromPath,
} from './api';
import { DecisionPanel } from './components/DecisionPanel';
import { REJECTION_TEXT } from './messages';
import { QuoteDocument } from './components/QuoteDocument';
import { Summary } from './components/Summary';

type Screen =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'quote'; payload: Extract<SharedQuotePayload, { ok: true }>; body: QuoteBody }
  | { kind: 'done'; title: string; message: string };

export function App() {
  const token = useMemo(() => tokenFromPath(window.location.pathname), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) {
      setScreen({ kind: 'error', message: 'Strona nie jest skonfigurowana.' });
      return;
    }
    if (!token) {
      setScreen({ kind: 'error', message: REJECTION_TEXT.not_found });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchSharedQuote(token);
        if (cancelled) return;

        if (!payload.ok) {
          setScreen({ kind: 'error', message: REJECTION_TEXT[payload.reason] });
          return;
        }

        // Migracja + walidacja dokumentu. Baza trzyma też starsze
        // `bodyVersion`, a `parseQuoteBody` jest jedynym wejściem, które je
        // podnosi do bieżącej wersji — tą samą drogą idzie edytor.
        const parsed = parseQuoteBody(payload.quote.body);
        if (!parsed.ok) {
          setScreen({
            kind: 'error',
            message: 'Nie udało się otworzyć tej oferty. Poproś projektanta o nowy link.',
          });
          return;
        }

        setEnabled(new Set(enabledItemIds(parsed.body)));
        setScreen({ kind: 'quote', payload, body: parsed.body });

        // Logo dociągamy osobno i po cichu: brak logo nie może wywrócić oferty,
        // a czekanie na nie opóźniałoby to, po co klient tu przyszedł.
        const url = await signedLogoUrl(payload.brand.logoPath);
        if (!cancelled) setLogo(url);
      } catch (error) {
        if (cancelled) return;
        setScreen({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Nie udało się wczytać oferty.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggle = useCallback((id: string) => {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAccept = useCallback(
    async (signerName: string) => {
      if (!token) return;
      setBusy(true);
      setActionError(null);
      try {
        const result = await acceptSharedQuote(token, [...enabled], signerName);
        if (result.ok) {
          setScreen({
            kind: 'done',
            title: 'Dziękujemy — oferta zaakceptowana.',
            message: 'Projektant dostał powiadomienie. Odezwie się z kolejnymi krokami.',
          });
        } else {
          setActionError(REJECTION_TEXT[result.reason]);
        }
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Nie udało się zapisać akceptacji.',
        );
      } finally {
        setBusy(false);
      }
    },
    [enabled, token],
  );

  const handleComment = useCallback(
    async (authorName: string, message: string) => {
      if (!token) return;
      setBusy(true);
      setActionError(null);
      try {
        const result = await commentSharedQuote(token, authorName, message);
        if (result.ok) {
          setScreen({
            kind: 'done',
            title: 'Uwagi wysłane.',
            message: 'Projektant je zobaczy i wróci do Ciebie z poprawioną ofertą.',
          });
        } else {
          setActionError(REJECTION_TEXT[result.reason]);
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Nie udało się wysłać uwag.');
      } finally {
        setBusy(false);
      }
    },
    [token],
  );

  if (screen.kind === 'loading') {
    return <Centered>Wczytywanie oferty…</Centered>;
  }

  if (screen.kind === 'error') {
    return <Centered>{screen.message}</Centered>;
  }

  if (screen.kind === 'done') {
    return (
      <Centered>
        <span className="font-display block text-xl">{screen.title}</span>
        <span className="text-ink-soft mt-2 block text-sm">{screen.message}</span>
      </Centered>
    );
  }

  const { quote, brand, acceptance } = screen.payload;
  const body = screen.body;
  const chosen = applyEnabledIds(body, [...enabled]);
  const closed = acceptance !== null;

  return (
    <div
      className="min-h-dvh px-4 py-8 sm:py-14"
      style={{ ['--accent' as string]: brand.accentColor }}
    >
      <main className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          {logo ? (
            <img src={logo} alt={brand.companyName} className="max-h-12 w-auto" />
          ) : (
            <span className="font-display text-lg tracking-tight">{brand.companyName}</span>
          )}
          {quote.number ? (
            <span className="text-ink-faint tabular text-xs">{quote.number}</span>
          ) : null}
        </header>

        <article className="rounded-2xl bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(51,37,30,0.06),0_8px_24px_-12px_rgba(51,37,30,0.18)] sm:p-10">
          <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
            {body.title || quote.title}
          </h1>
          {body.subtitle ? <p className="text-ink-soft mt-1 text-sm">{body.subtitle}</p> : null}
          {body.intro ? (
            <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{body.intro}</p>
          ) : null}

          {closed ? (
            <p className="border-accent/25 bg-accent/5 mt-6 rounded-lg border px-4 py-3 text-sm">
              Oferta została zaakceptowana
              {acceptance.signerName ? ` przez: ${acceptance.signerName}` : ''}. Zakres poniżej
              pokazujemy w formie, w jakiej został przyjęty.
            </p>
          ) : (
            <p className="text-ink-soft border-hair mt-6 rounded-lg border border-dashed px-4 py-3 text-sm">
              Zaznacz pozycje, które mają wejść do zakresu. Kwota przelicza się na bieżąco.
            </p>
          )}

          <div className="mt-8">
            <QuoteDocument
              body={body}
              currency={quote.currency}
              enabled={enabled}
              onToggle={toggle}
              readOnly={closed}
            />
          </div>

          <div className="mt-8">
            <Summary body={chosen} currency={quote.currency} />
          </div>

          {closed ? null : (
            <DecisionPanel
              onAccept={handleAccept}
              onComment={handleComment}
              busy={busy}
              error={actionError}
            />
          )}
        </article>

        <footer className="text-ink-faint mt-6 space-y-1 text-center text-xs">
          {brand.address ? <p>{brand.address}</p> : null}
          {brand.footerText ? <p>{brand.footerText}</p> : null}
          <p className="pt-2">Oferta przygotowana w Toolier</p>
        </footer>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <p className="text-ink-soft max-w-sm text-sm">{children}</p>
    </div>
  );
}
