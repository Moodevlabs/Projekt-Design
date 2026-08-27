import { useState } from 'react';

interface Props {
  onAccept: (signerName: string) => Promise<void>;
  onReject: (signerName: string, reason: string) => Promise<void>;
  onComment: (authorName: string, message: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}

type Mode = 'idle' | 'accept' | 'reject' | 'comment';

/**
 * Trzy drogi wyjścia: akceptacja, uwagi, odmowa.
 *
 * ## Dlaczego odmowa jednak jest (poprawka 7a, 2026-08-27)
 *
 * Do tej pory były dwie, świadomie: założenie brzmiało, że klient, któremu coś
 * nie pasuje, prawie nigdy nie chce zerwać rozmowy — chce powiedzieć, co
 * zmienić. Założenie jest prawdziwe w większości przypadków i dlatego „Mam
 * uwagi" stoi wyżej niż odmowa. Ale gdy klient **naprawdę** rezygnuje, brak tej
 * drogi nie sprawiał, że rezygnacji nie było: sprawiał, że status `rejected`
 * ustawiał ręcznie projektant. System zapisywał więc jego domysł zamiast
 * odpowiedzi klienta, a data „odrzucenia" znaczyła „dzień, w którym projektant
 * stracił nadzieję".
 *
 * Odmowa jest wizualnie najcichsza z trzech — bez wypełnienia, bez koloru
 * ostrzeżenia. Ma być dostępna, nie zachęcająca.
 */
export function DecisionPanel({ onAccept, onReject, onComment, busy, error }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  if (mode === 'idle') {
    return (
      <div className="no-print mt-8 space-y-3">
        <button
          type="button"
          onClick={() => setMode('accept')}
          className="bg-accent w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90"
        >
          Akceptuję ofertę
        </button>
        <button
          type="button"
          onClick={() => setMode('comment')}
          className="border-ink-faint/40 text-ink w-full rounded-lg border bg-transparent px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
        >
          Mam uwagi
        </button>
        <button
          type="button"
          onClick={() => setMode('reject')}
          className="text-ink-soft hover:text-ink w-full px-4 py-2 text-sm transition-colors"
        >
          Nie skorzystam z tej oferty
        </button>
        {error ? <p className="text-discount text-sm">{error}</p> : null}
      </div>
    );
  }

  if (mode === 'accept') {
    return (
      <form
        className="no-print mt-8 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onAccept(name);
        }}
      >
        <label className="block">
          <span className="text-ink-soft text-xs font-semibold tracking-[0.12em] uppercase">
            Imię i nazwisko
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            maxLength={200}
            className="border-hair mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <p className="text-ink-soft text-xs leading-relaxed">
          Akceptacja rejestruje wybrany zakres pozycji, podane imię i nazwisko oraz datę i godzinę.
          Nie stanowi ona podpisu elektronicznego, lecz potwierdzenie uzgodnionego zakresu prac.
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-accent flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Zapisywanie…' : 'Potwierdzam akceptację'}
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="text-ink-soft px-4 py-3 text-sm"
          >
            Wróć
          </button>
        </div>
        {error ? <p className="text-discount text-sm">{error}</p> : null}
      </form>
    );
  }

  if (mode === 'reject') {
    return (
      <form
        className="no-print mt-8 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onReject(name, message);
        }}
      >
        <label className="block">
          <span className="text-ink-soft text-xs font-semibold tracking-[0.12em] uppercase">
            Imię i nazwisko
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
            maxLength={200}
            className="border-hair mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <label className="block">
          <span className="text-ink-soft text-xs font-semibold tracking-[0.12em] uppercase">
            Powód (opcjonalnie)
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Przykładowo: wybór innej pracowni projektowej."
            className="border-hair mt-1 w-full resize-y rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>
        <p className="text-ink-soft text-xs leading-relaxed">
          Decyzja ta zamyka postępowanie ofertowe — późniejsza akceptacja nie będzie możliwa. W
          przypadku oczekiwanych korekt właściwą ścieżką jest przekazanie uwag.
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="border-ink-faint/40 text-ink flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {busy ? 'Zapisywanie…' : 'Potwierdzam odmowę'}
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="text-ink-soft px-4 py-3 text-sm"
          >
            Wróć
          </button>
        </div>
        {error ? <p className="text-discount text-sm">{error}</p> : null}
      </form>
    );
  }

  return (
    <form
      className="no-print mt-8 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void onComment(name, message);
      }}
    >
      <label className="block">
        <span className="text-ink-soft text-xs font-semibold tracking-[0.12em] uppercase">
          Imię (opcjonalnie)
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          className="border-hair mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <label className="block">
        <span className="text-ink-soft text-xs font-semibold tracking-[0.12em] uppercase">
          Uwagi
        </span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          autoFocus
          required
          rows={5}
          maxLength={4000}
          placeholder="Przykładowo: prosimy o wariant bez wizualizacji łazienki."
          className="border-hair mt-1 w-full resize-y rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-accent flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Wysyłanie…' : 'Wyślij uwagi'}
        </button>
        <button
          type="button"
          onClick={() => setMode('idle')}
          className="text-ink-soft px-4 py-3 text-sm"
        >
          Wróć
        </button>
      </div>
      {error ? <p className="text-discount text-sm">{error}</p> : null}
    </form>
  );
}
