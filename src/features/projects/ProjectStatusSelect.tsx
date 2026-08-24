import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSetProjectStatus } from '@/data/queries/useProjects';
import { PROJECT_STATUSES, type ProjectStatus } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Status projektu przestawiany **w wierszu**, bez wchodzenia w edycję
 * (05-UI §3a.3). Status jest jedyną rzeczą, którą zmienia się w projekcie
 * regularnie — otwieranie formularza za każdym razem byłoby karą za używanie
 * aplikacji zgodnie z przeznaczeniem.
 */
export function ProjectStatusSelect({
  projectId,
  status,
  className,
}: {
  projectId: string;
  status: ProjectStatus;
  className?: string;
}) {
  const setStatus = useSetProjectStatus();

  return (
    <Select
      value={status}
      onValueChange={(next) => {
        setStatus.mutate(
          { id: projectId, status: next as ProjectStatus },
          {
            onSuccess: () => toast.success(pl.projects.statusChanged),
            onError: (error) => toast.error(error.message),
          },
        );
      }}
    >
      <SelectTrigger
        className={cn('h-8 w-40 text-sm', className)}
        aria-label={pl.projects.statusLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {pl.projects.status[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
