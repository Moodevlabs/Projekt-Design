import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Library, Plus, Users } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClients } from '@/data/queries/useClients';
import { useProjects } from '@/data/queries/useProjects';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useLibraryItems } from '@/data/queries/useLibrary';
import { showsVersion, versionLabel } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Ile pozycji z każdej grupy. Paleta ma prowadzić do celu, a nie być listą. */
const LIMIT = 5;

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Paleta ⌘K (K3, T-58).
 *
 * Szuka po **kliencie, projekcie, wycenie i usłudze** — czyli po wszystkim,
 * co ma własny adres. Filtruje BAZA, nie `cmdk`: lista klientów ma rosnąć do
 * setek i ściąganie jej w całości po to, żeby odsiać w przeglądarce, byłoby
 * tym samym błędem co liczenie totali w komponencie.
 *
 * Zapytania ruszają dopiero po otwarciu (`enabled`), bo paleta wisi
 * zamontowana w powłoce przez cały czas życia aplikacji.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const term = search.trim();

  // Czyścimy frazę przy zamknięciu — otwarcie palety ma zaczynać od zera,
  // a nie od tego, czego ktoś szukał kwadrans temu.
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const clients = useClients(open ? { search: term || undefined, status: 'all' } : {});
  const projects = useProjects(open ? { search: term || undefined, limit: LIMIT } : {});
  const quotes = useQuotesList(open ? { search: term || undefined, status: 'all' } : {});
  const library = useLibraryItems(open ? { search: term || undefined } : {});

  const go = (to: string) => {
    onOpenChange(false);
    void navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{pl.search.title}</DialogTitle>
          <DialogDescription>{pl.search.description}</DialogDescription>
        </DialogHeader>
        {/*
          `Command` skladamy sami zamiast uzyc `CommandDialog` z shadcn:
          tamten nie przepuszcza `shouldFilter` do `cmdk` (spread leci do
          `Dialog`), a my MUSIMY je wylaczyc — filtruje Postgres, a drugie
          sito po `value` ukrywaloby wyniki, ktore serwer wlasnie znalazl.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={pl.search.placeholder}
          />
          <CommandList>
            <CommandEmpty>{pl.search.empty}</CommandEmpty>

            <CommandGroup heading={pl.search.actions}>
              <CommandItem value="__new-client__" onSelect={() => go(routes.clients)}>
                <Plus className="size-4" aria-hidden />
                {pl.clients.new}
              </CommandItem>
              <CommandItem value="__new-quote__" onSelect={() => go(routes.quoteNew)}>
                <Plus className="size-4" aria-hidden />
                {pl.quotes.new}
              </CommandItem>
            </CommandGroup>

            {(clients.data ?? []).length > 0 ? (
              <CommandGroup heading={pl.nav.clients}>
                {(clients.data ?? []).slice(0, LIMIT).map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.id}`}
                    onSelect={() => go(routes.client(client.id))}
                  >
                    <Users className="size-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{client.name}</span>
                    {client.city ? (
                      <span className="text-ink-soft text-xs">{client.city}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {(projects.data ?? []).length > 0 ? (
              <CommandGroup heading={pl.projects.title}>
                {(projects.data ?? []).map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => go(routes.project(project.clientId, project.id))}
                  >
                    <FolderOpen className="size-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    <span className="text-ink-soft truncate text-xs">{project.clientName}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {(quotes.data ?? []).length > 0 ? (
              <CommandGroup heading={pl.nav.quotes}>
                {(quotes.data ?? []).slice(0, LIMIT).map((quote) => (
                  <CommandItem
                    key={quote.id}
                    value={`quote-${quote.id}`}
                    onSelect={() => go(routes.quote(quote.id))}
                  >
                    <FileText className="size-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{quote.title}</span>
                    <span className="text-ink-soft text-xs whitespace-nowrap">
                      {quote.number ?? pl.quotes.noNumber}
                      {showsVersion(quote.version) ? ` · ${versionLabel(quote.version)}` : ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            {(library.data ?? []).length > 0 ? (
              <CommandGroup heading={pl.library.title}>
                {(library.data ?? []).slice(0, LIMIT).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`library-${item.id}`}
                    onSelect={() => go(routes.library)}
                  >
                    <Library className="size-4" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
