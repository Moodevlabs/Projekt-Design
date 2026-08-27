import type { ReactNode } from 'react';

import { parseQuoteBody } from '@/domain/quote/schema';
import { selectionDiff, type Acceptance } from '@/domain/share/schema';
import { formatDate, formatTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Zapis akceptacji — jeden wygląd, używany we wszystkich trzech miejscach
 * (okno „Udostępnij", prawa kolumna edytora, karta projektu).
 *
 * ## Dlaczego tak, a nie zielone pudełko
 *
 * Pierwsza wersja była kolorową plamą z ikoną i nagłówkiem — czyli dokładnie
 * tym, czego ten system wizualny unika. Zasada z `StatusMark`: **informację
 * niesie struktura, barwa ją tylko wzmacnia**. Zielone tło pod całą kartą
 * robi z faktu ozdobę i niczego nie porządkuje.
 *
 * Tutaj hierarchia idzie przez stopień pisma i światło, tak jak w całej
 * aplikacji (08-REDESIGN §2):
 *
 *  - **oczko wersalikowe** mówi, CO to jest — jak główki tabel i etykiety
 *    nad listami;
 *  - **imię jest nagłówkiem**, krojem display, bo to jest treść: kto przyjął
 *    ofertę. Wcześniej tonęło w środku akapitu;
 *  - **kreska pod imieniem** to linia podpisu. Jedyne miejsce, w którym
 *    pojawia się zieleń — cienki akcent, nie tło;
 *  - data i zakres schodzą w `--ink-soft`, bo są przypisem do imienia.
 *
 * ⚠️ Krój display ma **jedną wagę** i nie wolno łączyć go z klasą wagi
 * (globals.css §typografia) — stąd sam `font-display` bez `font-semibold`.
 */
export function AcceptanceBlock({
  acceptance,
  quoteLabel,
  action,
}: {
  acceptance: Acceptance;
  /** Numer i tytuł wyceny — pokazywane tam, gdzie nie wiadomo, o którą chodzi. */
  quoteLabel?: string;
  /** Np. odnośnik „Otwórz wycenę" na karcie projektu. */
  action?: ReactNode;
}) {
  const parsed = parseQuoteBody(acceptance.acceptedBody);
  const diff = parsed.ok ? selectionDiff(parsed.body, acceptance.enabledItemIds) : null;

  const changes = diff
    ? [
        diff.turnedOff.length > 0 ? pl.share.turnedOff(diff.turnedOff.length) : null,
        diff.turnedOn.length > 0 ? pl.share.turnedOn(diff.turnedOn.length) : null,
      ].filter(Boolean)
    : [];

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <p className="label-caps text-ink-soft">{pl.share.acceptedEyebrow}</p>
        {action}
      </div>

      <p className="font-display text-ink mt-2.5 text-[20px] leading-tight">
        {acceptance.signerName ?? pl.share.acceptedAnonymously}
      </p>

      {/*
        Linia podpisu. Krótka i przyklejona do imienia — pełna szerokość
        czytałaby się jak separator sekcji, a to jest część nagłówka.
      */}
      <span
        aria-hidden
        className="mt-1.5 block h-[2px] w-14 rounded-full"
        style={{ background: 'var(--status-accepted)' }}
      />

      <p className="text-ink-soft tabular mt-2 text-[13px]">
        {pl.share.acceptedOn(formatDate(acceptance.acceptedAt), formatTime(acceptance.acceptedAt))}
      </p>

      {quoteLabel ? <p className="text-ink-faint mt-0.5 text-[13px]">{quoteLabel}</p> : null}

      {/*
        Co klient zmienił w zakresie. „Bez zmian" też jest informacją —
        i to dobrą, więc nie chowamy jej za brakiem tekstu.
      */}
      <p className="text-ink-soft mt-3 border-t border-[var(--hair)] pt-3 text-[13px]">
        {changes.length > 0 ? changes.join(' · ') : pl.share.noChanges}
      </p>
    </div>
  );
}
