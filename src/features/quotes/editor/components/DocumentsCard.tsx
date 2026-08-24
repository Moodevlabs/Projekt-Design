import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../editor.store';
import { useFiles } from '@/data/queries/useFiles';
import { useFileDownload } from '@/features/files/useFileDownload';
import { docTypeLabel } from '@/features/files/doc-type-label';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/** Ile pozycji mieści się w karcie, zanim zacznie zasłaniać podsumowanie. */
const LIMIT = 3;

/**
 * Karta „Dokumenty" w prawej kolumnie edytora (05-UI §3, T-56).
 *
 * Skrót do archiwum, nie jego kopia: trzy ostatnie dokumenty i link do pełnej
 * listy na karcie klienta. Bez klienta karta się nie renderuje — nie ma
 * archiwum, do którego mogłaby prowadzić.
 */
export function DocumentsCard() {
  const { clientId, projectId } = useEditorStore(
    useShallow((state) => ({ clientId: state.clientId, projectId: state.projectId })),
  );
  const documents = useFiles(
    projectId ? { projectId, kind: 'generated' } : { clientId: clientId ?? '', kind: 'generated' },
  );
  const { download, busy } = useFileDownload();

  if (!clientId) return null;

  const rows = (documents.data ?? []).slice(0, LIMIT);

  return (
    <section className="card-surface space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-ink text-sm font-semibold">{pl.documents.recent}</h2>
        <Link
          to={routes.client(clientId)}
          className="text-ink-soft hover:text-ink text-xs underline-offset-4 hover:underline"
        >
          {pl.documents.seeAll}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.documents.recentEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((doc) => (
            <li key={doc.id} className="min-w-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => void download(doc)}
                className="flex w-full min-w-0 items-center gap-2 text-left"
              >
                <FileText className="text-ink-soft size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="text-ink block truncate text-sm underline-offset-4 hover:underline">
                    {doc.name}
                  </span>
                  <span className="text-ink-soft block text-xs">
                    {docTypeLabel(doc.docType)} · {formatRelativeDay(doc.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
