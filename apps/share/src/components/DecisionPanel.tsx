import { useState } from 'react';

interface Props {
  onAccept: (signerName: string) => Promise<void>;
  onComment: (authorName: string, message: string) => Promise<void>;
  busy: boolean;
  error: string | null;
}

/**
 * Dwie drogi wyjścia: akceptacja albo uwagi. Świadomie **nie ma trzeciej**
 * („Odrzucam"): decyzję o zamknięciu oferty podejmuje projektant, a klient,
 * któremu coś nie pasuje, prawie nigdy nie chce zerwać rozmowy — chce
 * powiedzieć, co zmienić.
 */
export function DecisionPanel({ onAccept, onComment, busy, error }: Props) {
  const [mode, setMode] = useState<'idle' | 'accept' | 'comment'>('idle');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  if (mode === 'idle') {
    return (
      <div className="no-print mt-8 space-y-3">
        <button
          type="button"
          onClick={() => setMode('accept')}
          className="bg-accent w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
          Akceptacja zapisuje wybrane pozycje, Twoje imię oraz datę i godzinę. Nie jest to podpis
          elektroniczny — to potwierdzenie zakresu, na który się umawiacie.
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-accent flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
          placeholder="Np. prosimy o wariant bez wizualizacji łazienki."
          className="border-hair mt-1 w-full resize-y rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-accent flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
