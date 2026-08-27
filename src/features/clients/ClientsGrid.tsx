import { Skeleton } from '@/components/ui/skeleton';
import { ClientCard } from './ClientCard';
import type { ClientOverview } from '@/domain/client/schema';

/**
 * Siatka kart klientów (poprawka 5, 2026-08-27) — następca `ClientsTable`.
 *
 * Kolumny dobierają się z dostępnej szerokości, a nie z progów `sm/md/lg`:
 * karta ma sensowne minimum (340 px) i tyle ich w rzędzie, ile się mieści.
 * Progi w px liczyłyby się od szerokości OKNA, a nie od miejsca, jakie
 * zostaje obok rozwiniętej szyny nawigacji — i przy wąskim oknie dawałyby
 * trzy kolumny tam, gdzie mieszczą się dwie (poprawka 1).
 *
 * 340 px, a nie 280: przy węższej karcie kontakt (telefon, e-mail, miasto)
 * i trzy liczby w stopce zaczynają się chować pod wielokropkiem — czyli
 * dokładnie to, po co się na kartę patrzy (2026-08-27).
 */
export function ClientsGrid({
  rows,
  loading,
  onEdit,
}: {
  rows: ClientOverview[];
  loading: boolean;
  onEdit: (client: ClientOverview) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
      {loading
        ? [0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-[244px] rounded-[var(--radius-card)]" />
          ))
        : rows.map((client) => (
            <ClientCard key={client.id} client={client} onEdit={() => onEdit(client)} />
          ))}
    </div>
  );
}
