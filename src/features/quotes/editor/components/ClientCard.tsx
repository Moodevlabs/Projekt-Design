import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronsUpDown, ExternalLink, Plus, RefreshCw, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/data/queries/useProjects';
import { useEditorStore } from '../editor.store';
import { useClient, useClients } from '@/data/queries/useClients';
import { clientSnapshot, clientSnapshotDiffers, type Client } from '@/domain/client/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Radix Select nie przyjmuje pustego stringa jako wartości pozycji. */
const NO_PROJECT = '__none__';

/**
 * Karta „Klient" w prawej kolumnie edytora (05-UI §3, T-53).
 *
 * Przypięcie do kartoteki i snapshot w dokumencie to **dwie różne rzeczy**:
 * `clientId` mówi, czyja to wycena, `body.client` — co poszło do inwestora.
 * Wybór klienta ustawia oba (jedna decyzja), późniejsza edycja kartoteki —
 * żadnego. Stąd osobny przycisk „Odśwież dane klienta": aktualizacja
 * dokumentu jest decyzją, a nie efektem ubocznym poprawki telefonu.
 */
export function ClientCard() {
  const { clientId, projectId, snapshot } = useEditorStore(
    useShallow((state) => ({
      clientId: state.clientId,
      projectId: state.projectId,
      snapshot: state.body?.client ?? null,
    })),
  );
  const setClient = useEditorStore((state) => state.setClient);
  const setProject = useEditorStore((state) => state.setProject);
  const patchClient = useEditorStore((state) => state.patchClient);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Lista do wyboru — filtruje Postgres, tak jak na `/klienci`. Zarchiwizowani
  // też są: stary klient wraca po latach i wtedy chodzi o TĘ SAMĄ teczkę.
  const clients = useClients({
    search: search.trim() || undefined,
    status: 'all',
    sort: 'name_asc',
  });
  const attached = useClient(clientId);
  // Projekty należą do klienta, więc bez klienta nie ma czego pokazywać —
  // `enabled` w hooku pilnuje, żeby zapytanie w ogóle nie poleciało.
  const projects = useProjects(clientId ? { clientId } : {});

  if (!snapshot) return null;

  const outdated = Boolean(attached.data && clientSnapshotDiffers(snapshot, attached.data));

  const pick = (client: Client) => {
    setClient(client.id, clientSnapshot(client));
    setPickerOpen(false);
    toast.success(pl.editor.clientAttached(client.name));
  };

  return (
    <>
      <section className="card-surface space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-ink text-sm font-semibold">{pl.editor.clientCard}</h2>
          {clientId ? (
            <Link
              to={routes.client(clientId)}
              aria-label={pl.editor.clientOpen}
              className="text-ink-soft hover:text-ink"
            >
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              aria-label={pl.editor.clientPick}
              className="w-full justify-between font-normal"
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserRound className="size-4 shrink-0" aria-hidden />
                <span className="truncate">
                  {attached.data?.name || snapshot.name || pl.editor.clientNone}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72 p-0" align="start">
            {/* `shouldFilter={false}` — filtruje baza, nie cmdk. Podwójne
                filtrowanie ukrywałoby wyniki, które serwer właśnie znalazł. */}
            <Command shouldFilter={false}>
              <CommandInput
                value={search}
                onValueChange={setSearch}
                placeholder={pl.editor.clientSearch}
              />
              <CommandList>
                <CommandEmpty>{pl.editor.clientEmpty}</CommandEmpty>
                <CommandGroup>
                  {(clients.data ?? []).map((client) => (
                    <CommandItem key={client.id} value={client.id} onSelect={() => pick(client)}>
                      <Check
                        className={cn(
                          'size-4',
                          client.id === clientId ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{client.name}</span>
                      {client.city ? (
                        <span className="text-ink-soft text-xs">{client.city}</span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem
                    value="__new__"
                    onSelect={() => {
                      setPickerOpen(false);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    {pl.editor.clientNew}
                  </CommandItem>
                  {clientId ? (
                    <CommandItem
                      value="__none__"
                      onSelect={() => {
                        // Snapshot zostaje: odpięcie od kartoteki nie ma prawa
                        // wyczyścić nagłówka gotowej oferty.
                        setClient(null);
                        setPickerOpen(false);
                        toast.success(pl.editor.clientDetached);
                      }}
                    >
                      {pl.editor.clientNone}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Projekt-teczka (T-54). Bez klienta nie ma go z czego wybrać —
            mówimy o tym wprost zamiast pokazywać pustą listę. */}
        <div className="space-y-1.5">
          <p className="text-ink-soft text-xs font-medium">{pl.editor.projectLabel}</p>
          {clientId ? (
            <div className="flex items-center gap-2">
              <Select
                value={projectId ?? NO_PROJECT}
                onValueChange={(next) => setProject(next === NO_PROJECT ? null : next)}
              >
                <SelectTrigger className="h-9 flex-1" aria-label={pl.editor.projectPick}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>{pl.editor.projectNone}</SelectItem>
                  {(projects.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectId ? (
                <Link
                  to={routes.project(clientId, projectId)}
                  aria-label={pl.editor.projectOpen}
                  className="text-ink-soft hover:text-ink"
                >
                  <ExternalLink className="size-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-ink-soft text-xs">{pl.editor.projectNeedsClient}</p>
          )}
        </div>

        {outdated ? (
          <div className="space-y-2">
            <p className="text-ink-soft text-xs">{pl.editor.clientOutdated}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!attached.data) return;
                patchClient(clientSnapshot(attached.data));
                toast.success(pl.editor.clientRefreshed);
              }}
            >
              <RefreshCw className="size-4" aria-hidden />
              {pl.editor.clientRefresh}
            </Button>
          </div>
        ) : (
          <p className="text-ink-soft text-xs">{pl.editor.clientSnapshotHint}</p>
        )}
      </section>

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={null} onSaved={pick} />
    </>
  );
}
