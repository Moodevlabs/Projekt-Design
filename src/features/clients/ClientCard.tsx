import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsOf, Money } from '@/components/shared';
import { useClientAvatarUrl } from '@/data/queries/useClientAvatar';
import { ClientRowMenu } from './ClientRowMenu';
import { ClientStatusBadge } from './ClientStatusBadge';
import type { ClientOverview } from '@/domain/client/schema';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Karta klienta (poprawka 5, 2026-08-27).
 *
 * Zastępuje wiersz tabeli. Tabela jest dobra, gdy porównuje się liczby
 * w kolumnach — a listy klientów się nie porównuje, tylko **odnajduje na niej
 * osobę**. Stąd zdjęcie, nazwa i kontakt jako blok, a liczby (wyceny, wartość)
 * jako stopka karty, nie jako kolumny.
 *
 * Cała karta jest odnośnikiem do teczki. Menu z akcjami stoi POZA nim —
 * inaczej „Archiwizuj" wchodziłoby w klienta zamiast go archiwizować.
 */
export function ClientCard({
  client,
  onEdit,
}: {
  client: ClientOverview;
  onEdit: () => void;
}) {
  const avatar = useClientAvatarUrl(client.avatarPath);
  const contact = [client.phone, client.email].filter(Boolean).join(' · ');

  return (
    <article
      data-testid="client-card"
      className={cn(
        'card-surface relative flex flex-col gap-3 p-4 transition-colors',
        'hover:border-ink/20',
        client.status === 'archived' && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-11 shrink-0">
          {avatar.data ? <AvatarImage src={avatar.data} alt={client.name} /> : null}
          <AvatarFallback className="bg-surface-2 text-ink-soft text-xs font-medium">
            {initialsOf(client.name, '??')}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/*
            `after:absolute after:inset-0` rozciąga cel kliknięcia na całą
            kartę, zostawiając odnośnikowi jego tekst. Opakowanie karty
            w `<a>` wsadziłoby menu akcji do środka odnośnika — a przycisk
            w odnośniku to zawsze kłopot z klawiaturą i czytnikiem ekranu.
          */}
          <Link
            to={routes.client(client.id)}
            className="text-ink block truncate text-sm font-medium underline-offset-4 after:absolute after:inset-0 hover:underline"
          >
            {client.name}
          </Link>
          <p className="text-ink-soft truncate text-xs">{contact || pl.clients.noContact}</p>
          <p className="text-ink-soft truncate text-xs">{client.city || pl.clients.noCity}</p>
        </div>

        {/* `relative z-10` — menu musi stać NAD warstwą kliknięcia karty. */}
        <div className="relative z-10 shrink-0">
          <ClientRowMenu client={client} onEdit={onEdit} />
        </div>
      </div>

      <dl className="border-hair text-ink-soft grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <div className="min-w-0">
          <dt className="truncate">{pl.clients.quotesCount}</dt>
          <dd className="text-ink tabular mt-0.5 text-sm">{client.quotesCount}</dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate">{pl.clients.acceptedValue}</dt>
          <dd className="text-ink mt-0.5 text-sm">
            {client.acceptedNetCents > 0 ? (
              <Money cents={client.acceptedNetCents} />
            ) : (
              <span className="text-ink-soft">{pl.clients.noValue}</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate">{pl.clients.lastActivity}</dt>
          <dd className="text-ink mt-0.5 text-sm">{formatRelativeDay(client.lastActivityAt)}</dd>
        </div>
      </dl>

      {/*
        Pigułkę statusu pokazujemy TYLKO dla zarchiwizowanych. „Aktywny"
        na każdej karcie to szum: to stan domyślny i widać go po tym, że
        klient w ogóle jest na liście aktywnych.
      */}
      {client.status === 'archived' ? (
        <div className="relative z-10 self-start">
          <ClientStatusBadge status={client.status} />
        </div>
      ) : null}
    </article>
  );
}
