import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/data/queries/useProjects';
import { useMoveQuoteToProject } from '@/data/queries/useProjects';
import { useClients } from '@/data/queries/useClients';
import { pl } from '@/i18n/pl';

/** Radix Select nie przyjmuje pustego stringa jako wartości pozycji. */
const NO_PROJECT = '__none__';

export interface MoveToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  /** Klient wyceny. `null` = „szybka wycena" bez kartoteki. */
  clientId: string | null;
  currentProjectId: string | null;
}

/**
 * „Przenieś do projektu" z menu wiersza wyceny.
 *
 * Wycena, która ma klienta, widzi **wyłącznie jego** projekty — przeniesienie
 * zmienia wtedy tylko `project_id` i nic poza tym. Wycena bez klienta widzi
 * wszystkie i razem z teczką dostaje jej właściciela; dialog mówi o tym
 * wprost, zamiast po cichu przypisywać komuś cudzą ofertę.
 */
export function MoveToProjectDialog({
  open,
  onOpenChange,
  quoteId,
  clientId,
  currentProjectId,
}: MoveToProjectDialogProps) {
  const [selected, setSelected] = useState<string>(currentProjectId ?? NO_PROJECT);
  const projects = useProjects(clientId ? { clientId } : {});
  const clients = useClients({ status: 'all', sort: 'name_asc' });
  const move = useMoveQuoteToProject();

  const rows = projects.data ?? [];
  const clientName = (id: string) => clients.data?.find((client) => client.id === id)?.name ?? '';

  const confirm = () => {
    const projectId = selected === NO_PROJECT ? null : selected;
    const target = rows.find((project) => project.id === projectId);

    move.mutate(
      {
        quoteId,
        projectId,
        // Klienta dopinamy TYLKO wtedy, gdy wycena go nie miała — inaczej
        // przeniesienie zmieniałoby właściciela oferty bez pytania.
        ...(clientId || !target ? {} : { attachClientId: target.clientId }),
      },
      {
        onSuccess: () => {
          toast.success(target ? pl.projects.moved(target.name) : pl.projects.movedOut);
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.projects.moveTitle}</DialogTitle>
          <DialogDescription>
            {pl.projects.moveDescription}
            {clientId ? null : ` ${pl.projects.moveAttachesClient}`}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && !projects.isLoading ? (
          <p className="text-ink-soft text-sm">{pl.projects.moveEmpty}</p>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger aria-label={pl.projects.moveTitle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>{pl.projects.moveNone}</SelectItem>
              {rows.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {clientId ? project.name : `${clientName(project.clientId)} · ${project.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button onClick={confirm} disabled={move.isPending}>
            {pl.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
