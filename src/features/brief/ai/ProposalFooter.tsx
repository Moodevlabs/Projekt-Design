import { useState } from 'react';
import { FilePlus2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/data/queries/useProjects';
import { AiUsageHint } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { NEW_PROJECT } from './useCreateQuoteFromProposal';

/**
 * Stopka arkusza: gdzie ma powstać wycena.
 *
 * Wycena żyje w projekcie (CLAUDE.md: KLIENT → PROJEKT → wyceny), więc bez
 * wskazania teczki nie da się jej założyć. Klient bez projektów dostaje od
 * razu „Nowy projekt" jako jedyną i domyślnie wybraną opcję — nie ma co
 * pytać o wybór z pustej listy.
 */
export function ProposalFooter({
  clientId,
  proposalTitle,
  disabled,
  pending,
  onCreate,
}: {
  clientId: string;
  proposalTitle: string;
  disabled: boolean;
  pending: boolean;
  onCreate: (projectId: string) => void;
}) {
  const projects = useProjects({ clientId, status: 'all' });
  const rows = projects.data ?? [];
  const [projectId, setProjectId] = useState<string>(NEW_PROJECT);

  const chosen = projectId === NEW_PROJECT ? null : rows.find((row) => row.id === projectId);
  const newName = proposalTitle.trim() || pl.ai.brief.title;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="brief-proposal-project">{pl.ai.brief.project}</Label>
        <Select value={projectId} onValueChange={setProjectId} disabled={disabled}>
          <SelectTrigger id="brief-proposal-project" className="w-full">
            <SelectValue placeholder={pl.ai.brief.chooseProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_PROJECT}>{pl.ai.brief.newProject}</SelectItem>
            {rows.length > 0 ? <SelectSeparator /> : null}
            {rows.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!chosen ? (
          <p className="text-ink-soft text-xs">{pl.ai.brief.newProjectHint(newName)}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AiUsageHint />
        <Button
          type="button"
          disabled={disabled || pending}
          onClick={() => onCreate(projectId)}
          className="transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <FilePlus2 className="size-4" aria-hidden />
          {pending ? pl.ai.brief.creating : pl.ai.brief.create}
        </Button>
      </div>
    </div>
  );
}
