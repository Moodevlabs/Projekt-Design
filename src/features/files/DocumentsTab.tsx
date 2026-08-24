import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { FileRowMenu } from './FileRowMenu';
import { FilePreviewDialog } from './FilePreviewDialog';
import { useFileDownload } from './useFileDownload';
import { useFiles } from '@/data/queries/useFiles';
import { docTypeLabel } from './doc-type-label';
import { formatBytes, type StoredFile } from '@/domain/files/schema';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Zakładka „Dokumenty" — PDF-y wygenerowane przez aplikację (P2, T-56).
 *
 * Osobna od „Plików", bo to inne dane i inne pytanie: tu chodzi o **to, co
 * poszło do inwestora**, a nie o materiały robocze. „Otwórz" pobiera zapisany
 * plik i **nie renderuje go ponownie** — dokument sprzed miesiąca ma wyglądać
 * tak, jak wtedy wyglądał, mimo późniejszych zmian w brand kicie i bibliotece
 * (koncepcja §3 reguła 7).
 */
export function DocumentsTab({
  clientId,
  projectId = null,
}: {
  clientId: string;
  projectId?: string | null;
}) {
  const documents = useFiles(
    projectId ? { projectId, kind: 'generated' } : { clientId, kind: 'generated' },
  );
  const [preview, setPreview] = useState<StoredFile | null>(null);
  const rows = documents.data ?? [];

  if (documents.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.files.loadError}{' '}
          <button
            type="button"
            onClick={() => void documents.refetch()}
            className="underline underline-offset-4"
          >
            {pl.common.retry}
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!documents.isLoading && rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={pl.documents.emptyTitle}
        description={pl.documents.emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-surface overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{pl.files.name}</TableHead>
              <TableHead className="w-32">{pl.documents.docType}</TableHead>
              <TableHead className="w-28 text-right">{pl.files.size}</TableHead>
              <TableHead className="w-36">{pl.documents.created}</TableHead>
              <TableHead className="w-28" />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.isLoading ? (
              <LoadingRows />
            ) : (
              rows.map((doc) => <DocumentRow key={doc.id} doc={doc} onPreview={setPreview} />)
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-ink-soft text-xs">{pl.documents.hint}</p>

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function DocumentRow({
  doc,
  onPreview,
}: {
  doc: StoredFile;
  onPreview: (file: StoredFile) => void;
}) {
  const { download, busy } = useFileDownload();

  return (
    <TableRow>
      <TableCell className="max-w-0">
        <span className="block truncate font-medium">{doc.name}</span>
        {doc.quoteVersion === null ? null : (
          <span className="text-ink-soft text-xs">v{doc.quoteVersion}</span>
        )}
      </TableCell>
      <TableCell className="text-ink-soft text-sm">{docTypeLabel(doc.docType)}</TableCell>
      <TableCell className="text-right tabular-nums">{formatBytes(doc.sizeBytes)}</TableCell>
      <TableCell className="text-ink-soft text-sm">{formatRelativeDay(doc.createdAt)}</TableCell>
      <TableCell>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void download(doc)}>
          {pl.documents.open}
        </Button>
      </TableCell>
      <TableCell>
        <FileRowMenu file={doc} onPreview={() => onPreview(doc)} />
      </TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={6}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
