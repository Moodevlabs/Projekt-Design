import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/shared';
import { ProjectStatusSelect } from './ProjectStatusSelect';
import { kindLabel } from './kind-label';
import { ProjectRowMenu } from './ProjectRowMenu';
import { formatArea, type ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const COLUMNS = 7;

export function ProjectsTable({
  rows,
  loading,
  onEdit,
}: {
  rows: ProjectOverview[];
  loading: boolean;
  onEdit: (project: ProjectOverview) => void;
}) {
  return (
    <div className="card-surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{pl.projects.name}</TableHead>
            <TableHead className="w-28 text-right">{pl.projects.area}</TableHead>
            <TableHead className="w-28 text-right">{pl.projects.quotesCount}</TableHead>
            <TableHead className="w-36 text-right">{pl.projects.acceptedValue}</TableHead>
            <TableHead className="w-36">{pl.projects.lastActivity}</TableHead>
            <TableHead className="w-44">{pl.projects.statusLabel}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : (
            rows.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="max-w-0">
                  <Link
                    to={routes.project(project.clientId, project.id)}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className="text-ink-soft block truncate text-sm">
                    {[project.kind ? kindLabel(project.kind) : '', project.address, project.city]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {project.areaM2 === null ? pl.projects.noArea : formatArea(project.areaM2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{project.quotesCount}</TableCell>
                <TableCell className="text-right">
                  {project.acceptedNetCents > 0 ? (
                    <Money cents={project.acceptedNetCents} />
                  ) : (
                    <span className="text-ink-soft">{pl.projects.noValue}</span>
                  )}
                </TableCell>
                <TableCell className="text-ink-soft text-sm">
                  {formatRelativeDay(project.lastActivityAt)}
                </TableCell>
                <TableCell>
                  {/* Status w wierszu (05-UI §3a.3) — bez wchodzenia w edycję. */}
                  <ProjectStatusSelect projectId={project.id} status={project.status} />
                </TableCell>
                <TableCell>
                  <ProjectRowMenu project={project} onEdit={() => onEdit(project)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={COLUMNS}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
