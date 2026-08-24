import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared';
import { useDeleteProject } from '@/data/queries/useProjects';
import type { ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function ProjectRowMenu({
  project,
  onEdit,
}: {
  project: ProjectOverview;
  onEdit: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const remove = useDeleteProject();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${pl.projects.rowActions}: ${project.name}`}
            className="size-8"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link to={routes.project(project.clientId, project.id)}>
              <FolderOpen className="size-4" aria-hidden />
              {pl.projects.open}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit()}>
            <Pencil className="size-4" aria-hidden />
            {pl.common.edit}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {pl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog mówi wprost, ile wycen wisi na tej teczce — „czy na pewno?"
          bez liczby zmusza do zgadywania. */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={pl.projects.deleteConfirmTitle}
        description={pl.projects.deleteConfirmDescription(project.quotesCount)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          remove.mutate(project.id, {
            onSuccess: () => toast.success(pl.projects.deleted),
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </>
  );
}
