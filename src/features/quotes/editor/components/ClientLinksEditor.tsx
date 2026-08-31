import { useState } from 'react';
import { ExternalLink as ExternalLinkIcon, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink } from '@/components/shared';
import { MAX_QUOTE_LINKS, normalizeLinkUrl, type QuoteLink } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { useEditorStore } from '../editor.store';

/**
 * Odnośniki do materiałów u projektanta — jeden edytor, dwa miejsca (T-116).
 *
 * ## Skąd to się wzięło
 *
 * Klient dostaje link do oferty, ale wizualizacje leżą na Dysku Google
 * projektanta. Do tej pory szły osobnym mailem — czyli inwestor akceptował
 * zakres, patrząc na coś, czego nie było widać obok. Odnośniki dołączone do
 * oferty zamykają to w jednym adresie.
 *
 * ## Dlaczego to jest w DOKUMENCIE, a nie przy tokenie
 *
 * Rozważane były dwa miejsca: pole przy tworzeniu magic linka (czyli przy
 * `quote_shares`) albo w treści wyceny (`body.links`). Wybrane jest drugie
 * i to nie jest wybór techniczny:
 *
 *  - **Linków bywa kilka.** Pierwszy wygasa, drugi się odwołuje, trzeci idzie
 *    do współmałżonka inwestora. Adresy przy tokenie znaczyłyby przepisywanie
 *    ich za każdym razem i realne ryzyko, że dwa żywe linki pokazują dwa różne
 *    zestawy materiałów.
 *  - **To jest treść oferty, nie sposób jej dostarczenia.** „Wizualizacje
 *    salonu" są tym, za co klient płaci — należą do dokumentu tak samo jak
 *    harmonogram. Dzięki temu wchodzą też do snapshotu akceptacji i do wersji
 *    wyceny: za pół roku widać, co inwestor miał przed oczami, klikając
 *    „Akceptuję".
 *
 * Ten sam komponent stoi więc **w prawej kolumnie edytora** (bo to treść) i
 * **w oknie „Udostępnij"** (bo to moment, w którym się o nich myśli). Jedno
 * źródło, dwa wejścia — a nie dwie listy do pogodzenia.
 */
export function ClientLinksEditor({ disabled = false }: { disabled?: boolean }) {
  const { links, addLink, updateLink, removeLink } = useEditorStore(
    useShallow((state) => ({
      links: state.body?.links ?? [],
      addLink: state.addLink,
      updateLink: state.updateLink,
      removeLink: state.removeLink,
    })),
  );

  const full = links.length >= MAX_QUOTE_LINKS;

  return (
    <div className="space-y-3">
      {links.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.quoteLinks.empty}</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              disabled={disabled}
              onPatch={(patch) => updateLink(link.id, patch)}
              onRemove={() => removeLink(link.id)}
            />
          ))}
        </ul>
      )}

      {disabled ? null : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={full}
          title={full ? pl.quoteLinks.limitReached : undefined}
          onClick={() => addLink()}
        >
          <Plus className="size-3.5" aria-hidden />
          {pl.quoteLinks.add}
        </Button>
      )}
    </div>
  );
}

function LinkRow({
  link,
  disabled,
  onPatch,
  onRemove,
}: {
  link: QuoteLink;
  disabled: boolean;
  onPatch: (patch: Partial<QuoteLink>) => void;
  onRemove: () => void;
}) {
  /*
   * Błąd trzymamy w stanie WIERSZA, a nie w dokumencie. Adres z literówką
   * ma zostać w polu, żeby dało się go poprawić — a nie zniknąć razem
   * z komunikatem przy następnym renderze.
   */
  const [invalid, setInvalid] = useState(false);

  /**
   * Normalizacja przy wyjściu z pola, nie przy każdym znaku: „d" wpisane jako
   * pierwsza litera nie jest jeszcze adresem, a doklejanie do niego `https://`
   * w trakcie pisania przestawiałoby kursor.
   */
  const commitUrl = (raw: string) => {
    if (raw.trim() === '') {
      setInvalid(false);
      onPatch({ url: '' });
      return;
    }
    const normalized = normalizeLinkUrl(raw);
    setInvalid(normalized === null);
    if (normalized !== null) onPatch({ url: normalized });
  };

  const usable = link.url !== '' && !invalid;

  return (
    <li className="border-hair-strong bg-surface space-y-2 rounded-[var(--radius-control)] border p-2.5">
      <div className="flex items-center gap-2">
        <LinkIcon className="text-ink-soft size-3.5 shrink-0" aria-hidden />
        <Input
          value={link.label}
          disabled={disabled}
          placeholder={pl.quoteLinks.labelPlaceholder}
          aria-label={pl.quoteLinks.labelLabel}
          onChange={(event) => onPatch({ label: event.target.value })}
          className="h-8 flex-1 text-sm"
        />
        {disabled ? null : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label={pl.quoteLinks.remove}
            title={pl.quoteLinks.remove}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>

      <Input
        defaultValue={link.url}
        key={link.url}
        disabled={disabled}
        inputMode="url"
        aria-invalid={invalid}
        placeholder={pl.quoteLinks.urlPlaceholder}
        aria-label={pl.quoteLinks.urlLabel}
        onBlur={(event) => commitUrl(event.target.value)}
        className={cn('h-8 font-mono text-xs', invalid && 'border-destructive')}
      />

      {invalid ? <p className="text-danger text-xs">{pl.quoteLinks.invalidUrl}</p> : null}

      <Input
        value={link.note}
        disabled={disabled}
        placeholder={pl.quoteLinks.notePlaceholder}
        aria-label={pl.quoteLinks.noteLabel}
        onChange={(event) => onPatch({ note: event.target.value })}
        className="h-8 text-xs"
      />

      {/* Sprawdzenie, że adres prowadzi tam, gdzie ma — jednym kliknięciem,
          zanim link pójdzie do inwestora. */}
      {usable ? (
        <ExternalLink
          href={link.url}
          className="text-ink-soft hover:text-ink inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
        >
          <ExternalLinkIcon className="size-3" aria-hidden />
          {pl.quoteLinks.test}
        </ExternalLink>
      ) : null}
    </li>
  );
}
