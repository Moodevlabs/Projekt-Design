import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';

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
 * Karta klienta (poprawka 5, powiększona 2026-08-27).
 *
 * ## Dlaczego karta, a nie wiersz tabeli
 *
 * Tabela jest dobra, gdy porównuje się liczby w kolumnach. Listy klientów się
 * nie porównuje — na niej się **odnajduje osobę**. Stąd zdjęcie, nazwa
 * i kontakt jako blok, a liczby jako stopka.
 *
 * ## Dlaczego duża
 *
 * Pierwsza wersja miała 280 px i zdjęcie 44 px — kafelek, na którym twarz była
 * znaczkiem, a trzy liczby ściskały się w kolumnach po 60 px. Karta, która jest
 * mniejsza od wiersza tabeli, traci jedyną przewagę, dla której powstała.
 * Teraz: 340 px minimum, zdjęcie 56 px, nazwa w stopniu nagłówka, a kontakt
 * z ikonami — telefon i e-mail dają się przeczytać, a nie tylko rozpoznać.
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

  return (
    <article
      data-testid="client-card"
      className={cn(
        'card-surface group relative flex flex-col gap-4 p-5 transition-colors',
        'hover:border-ink/20',
        client.status === 'archived' && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-4">
        <Avatar className="size-14 shrink-0">
          {avatar.data ? <AvatarImage src={avatar.data} alt={client.name} /> : null}
          <AvatarFallback className="bg-surface-2 text-ink-soft text-sm font-medium">
            {initialsOf(client.name, '??')}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {/*
            `after:absolute after:inset-0` rozciąga cel kliknięcia na całą
            kartę, zostawiając odnośnikowi jego tekst. Opakowanie karty w `<a>`
            wsadziłoby menu akcji do środka odnośnika — a przycisk w odnośniku
            to zawsze kłopot z klawiaturą i czytnikiem ekranu.
          */}
          <Link
            to={routes.client(client.id)}
            className="text-ink block truncate text-[15px] font-medium underline-offset-4 after:absolute after:inset-0 hover:underline"
          >
            {client.name}
          </Link>

          {/*
            Kontakt z ikonami, każdy w swoim wierszu. Wcześniej telefon i e-mail
            stały sklejone kropką w jednej linijce `text-xs` i przy dłuższym
            adresie znikały pod wielokropkiem — czyli dokładnie to, po co się
            na kartę patrzy, było nieczytelne.
          */}
          <dl className="text-ink-soft mt-1.5 space-y-0.5 text-[13px]">
            {client.phone ? (
              <ContactLine icon={Phone} label={pl.clients.phone} value={client.phone} />
            ) : null}
            {client.email ? (
              <ContactLine icon={Mail} label={pl.clients.email} value={client.email} />
            ) : null}
            {client.city ? (
              <ContactLine icon={MapPin} label={pl.clients.city} value={client.city} />
            ) : null}
            {!client.phone && !client.email && !client.city ? (
              <div className="text-ink-faint">{pl.clients.noContact}</div>
            ) : null}
          </dl>
        </div>

        {/* `relative z-10` — menu musi stać NAD warstwą kliknięcia karty. */}
        <div className="relative z-10 shrink-0">
          <ClientRowMenu client={client} onEdit={onEdit} />
        </div>
      </div>

      {/*
        Trzy liczby, każda z podpisem nad wartością. „Teczki" doszły przy
        powiększeniu karty: klient z pięcioma projektami i klient z jednym to
        zupełnie inna relacja, a wcześniej nie dało się ich odróżnić bez wejścia.
      */}
      <dl className="border-hair grid grid-cols-3 gap-3 border-t pt-3.5">
        <Stat label={pl.clients.cardProjects} value={String(client.projectsCount)} />
        <Stat label={pl.clients.cardQuotes} value={String(client.quotesCount)} />
        <Stat
          label={pl.clients.cardAccepted}
          value={
            client.acceptedNetCents > 0 ? (
              <Money cents={client.acceptedNetCents} />
            ) : (
              <span className="text-ink-faint">{pl.clients.noValue}</span>
            )
          }
        />
      </dl>

      <footer className="flex items-center justify-between gap-3">
        <span className="text-ink-faint truncate text-xs">
          {pl.clients.cardActivity(formatRelativeDay(client.lastActivityAt))}
        </span>

        {/*
          Pigułkę statusu pokazujemy TYLKO dla zarchiwizowanych. „Aktywny" na
          każdej karcie to szum: to stan domyślny i widać go po tym, że klient
          w ogóle jest na liście aktywnych.

          Strzałka na hover zastępuje ją jako sygnał „to się otwiera" — karta
          i tak jest w całości klikalna, więc przycisk byłby drugim celem
          w tym samym miejscu.
        */}
        {client.status === 'archived' ? (
          <div className="relative z-10 shrink-0">
            <ClientStatusBadge status={client.status} />
          </div>
        ) : (
          <ArrowRight
            aria-hidden
            className="text-ink-faint size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
      </footer>
    </article>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="text-ink-faint size-3.5 shrink-0" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-faint truncate text-[11px] tracking-[0.06em] uppercase">{label}</dt>
      <dd className="text-ink tabular mt-1 truncate text-sm">{value}</dd>
    </div>
  );
}
