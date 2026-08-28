import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileRowMenu } from './FileRowMenu';
import { docTypeLabel } from './doc-type-label';
import { formatBytes, isPreviewableImage, type StoredFile } from '@/domain/files/schema';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const COLUMNS = 6;

export function FilesTable({
  rows,
  loading,
  showScope,
  onPreview,
}: {
  rows: StoredFile[];
  loading: boolean;
  /** Na karcie klienta pokazujemy, czy plik należy do teczki, czy do niego. */
  showScope: boolean;
  onPreview: (file: StoredFile) => void;
}) {
  return (
    <div className="card-surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{pl.files.name}</TableHead>
            <TableHead className="w-36">{pl.files.typeColumn}</TableHead>
            {showScope ? <TableHead className="w-32">{pl.files.scope}</TableHead> : null}
            <TableHead className="w-32 text-right">{pl.files.size}</TableHead>
            <TableHead className="w-36">{pl.files.added}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows columns={showScope ? COLUMNS : COLUMNS - 1} />
          ) : (
            rows.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="max-w-0">
                  {isPreviewableImage(file.mime, file.name) ? (
                    <button
                      type="button"
                      onClick={() => onPreview(file)}
                      className="block max-w-full truncate text-left font-medium underline-offset-4 hover:underline"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="block truncate font-medium">{file.name}</span>
                  )}
                </TableCell>
                {/* Wygenerowany PDF mowi, czym jest (Wycena / Termin / …) i z ktorej
                    wersji — od T-110 lezy w tej samej liscie co pliki wgrane. */}
                <TableCell className="text-ink-soft text-sm">
                  {file.kind === 'generated' ? docTypeLabel(file.docType) : pl.files.typeUpload}
                  {file.kind === 'generated' && file.quoteVersion !== null ? (
                    <span className="ml-1 text-xs">v{file.quoteVersion}</span>
                  ) : null}
                </TableCell>
                {showScope ? (
                  <TableCell className="text-ink-soft text-sm">
                    {file.projectId ? pl.files.scopeProject : pl.files.scopeClient}
                  </TableCell>
                ) : null}
                <TableCell className="text-right tabular-nums">
                  {formatBytes(file.sizeBytes)}
                </TableCell>
                <TableCell className="text-ink-soft text-sm">
                  {formatRelativeDay(file.createdAt)}
                </TableCell>
                <TableCell>
                  <FileRowMenu file={file} onPreview={() => onPreview(file)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={columns}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
