import { useCallback, useEffect, useMemo, useState } from 'react';

import { contrastText } from '@/domain/brand/color';
import {
  countAnswered,
  countQuestions,
  type BriefAnswers,
  type SharedBriefPayload,
} from '@/domain/brief';

import { fetchSharedBrief, isConfigured, signedLogoUrl, submitSharedBrief } from './api';
import { BRIEF_REJECTION_TEXT } from './messages';
import { BriefForm } from './components/BriefForm';

type Screen =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'form'; payload: Extract<SharedBriefPayload, { ok: true }> };

/**
 * Strona briefu dla klienta (T-93, poprawka 9).
 *
 * ## Dwie zasady, na których stoi
 *
 * 1. **Zapisuje się na raty.** Brief ma dwadzieścia pytań i wypełnia się go
 *    wieczorem, czasem po rozmowie z drugą połową. Formularz, który przyjmuje
 *    odpowiedzi tylko raz i w całości, zostaje niewypełniony w całości.
 *    Dlatego „Zapisz" wolno kliknąć wielokrotnie, a odpowiedzi wracają przy
 *    ponownym otwarciu linku.
 * 2. **Jest opatrzony znakiem pracowni.** Logo i kolor przychodzą z brand kitu
 *    (`get_shared_brief`), tak samo jak przy ofercie. Formularz bez nadawcy
 *    wygląda jak spam i tak jest traktowany.
 */
export function BriefApp({ token }: { token: string }) {
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [answers, setAnswers] = useState<BriefAnswers>({});
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) {
      setScreen({ kind: 'error', message: 'Strona nie jest skonfigurowana.' });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchSharedBrief(token);
        if (cancelled) return;

        if (!payload.ok) {
          setScreen({ kind: 'error', message: BRIEF_REJECTION_TEXT[payload.reason] });
          return;
        }

        setAnswers(payload.brief.answers);
        setSavedAt(payload.brief.submittedAt);
        setScreen({ kind: 'form', payload });

        const url = await signedLogoUrl(payload.brand.logoPath);
        if (!cancelled) setLogo(url);
      } catch (error) {
        if (cancelled) return;
        setScreen({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Nie udało się wczytać briefu.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = useCallback(async () => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await submitSharedBrief(token, answers);
      if (result.ok) {
        setSavedAt(result.submittedAt ?? new Date().toISOString());
      } else {
        setActionError(BRIEF_REJECTION_TEXT[result.reason]);
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Nie udało się zapisać odpowiedzi.',
      );
    } finally {
      setBusy(false);
    }
  }, [answers, token]);

  const progress = useMemo(() => {
    if (screen.kind !== 'form') return { answered: 0, total: 0 };
    return {
      answered: countAnswered(screen.payload.brief.template, answers),
      total: countQuestions(screen.payload.brief.template),
    };
  }, [answers, screen]);

  if (screen.kind === 'loading') return <Centered>Wczytywanie briefu…</Centered>;
  if (screen.kind === 'error') return <Centered>{screen.message}</Centered>;

  const { brand, brief } = screen.payload;

  return (
    <div
      className="min-h-dvh px-4 py-8 sm:py-14"
      // Jak w `App` — kolor marki plus kolor napisu na nim, dobrany kontrastem.
      style={{
        ['--accent' as string]: brand.accentColor,
        ['--accent-ink' as string]: contrastText(brand.accentColor),
      }}
    >
      <main className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          {logo ? (
            <img src={logo} alt={brand.companyName} className="max-h-12 w-auto" />
          ) : (
            <span className="font-display text-lg tracking-tight">{brand.companyName}</span>
          )}
        </header>

        <article className="rounded-2xl bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(51,37,30,0.06),0_8px_24px_-12px_rgba(51,37,30,0.18)] sm:p-10">
          <h1 className="font-display text-2xl tracking-tight sm:text-3xl">
            Brief przed rozpoczęciem projektu
          </h1>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            Odpowiedzi pomogą nam zaproponować rozwiązania dopasowane do Was, a nie do średniej.
            Nie trzeba wypełniać wszystkiego za jednym razem — wystarczy zapisać i wrócić później,
            tym samym linkiem.
          </p>

          {progress.total > 0 ? (
            <p className="text-ink-soft mt-4 text-xs">
              Wypełnione {progress.answered} z {progress.total}
              {savedAt ? ' · zapisano' : ''}
            </p>
          ) : null}

          <BriefForm template={brief.template} answers={answers} onChange={setAnswers} />

          <div className="no-print mt-8 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSubmit()}
              className="bg-accent w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Zapisywanie…' : 'Zapisz odpowiedzi'}
            </button>
            <p className="text-ink-soft text-center text-xs">
              Możesz zapisywać wielokrotnie — nadpisujemy poprzednią wersję.
            </p>
            {actionError ? <p className="text-discount text-sm">{actionError}</p> : null}
          </div>
        </article>

        <footer className="text-ink-faint mt-6 space-y-1 text-center text-xs">
          {brand.address ? <p>{brand.address}</p> : null}
          {brand.footerText ? <p>{brand.footerText}</p> : null}
          <p className="pt-2">Brief przygotowany w Toolier</p>
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
