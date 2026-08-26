import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog, PageSection } from '@/components/shared';
import {
  useDeleteFilePermanently,
  usePurgeExpiredTrash,
  useRestoreFile,
  useTrash,
} from '@/data/queries/useFiles';
import { daysLeftInTrash, formatBytes, TRASH_DAYS } from '@/domain/files/schema';
import type { StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

/**
 * Kosz na pliki w Ustawieniach → Kosz (T-67).
 *
 * **Znika, gdy jest pusty** — ta sama zasada co przy bibliotece przykładowej
 * (T-62) i checkliście onboardingu (T-17): sekcja, w której nie ma czego
 * zrobić, zamienia się w ozdobę.
 *
 * Siedzi obok paska zużycia świadomie: pliki w koszu **nadal zajmują limit**,
 * więc człowiek, który skasował pliki i nie rozumie, czemu pasek nie drgnął,
 * ma odpowiedź w zasięgu wzroku.
 */
export function TrashSection() {
  const trash = useTrash();
  const restore = useRestoreFile();
  const removeForever = useDeleteFilePermanently();
  const [confirmAll, setConfirmAll] = useState(false);

  // Sprzątanie przeterminowanych. Wołane samym zamontowaniem sekcji —
  // Supabase bez `pg_cron` nie ma harmonogramu, a kosz sprzątany przy okazji
  // wizyty w Ustawieniach wystarcza: plik czekający 40 zamiast 30 dni nikomu
  // nie szkodzi, plik usunięty za wcześnie owszem.
  usePurgeExpiredTrash();

  const rows = trash.data ?? [];
  if (trash.isLoading || rows.length === 0) return null;

  const totalBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);

  const purgeAll = () => {
    let failed = 0;
    void Promise.all(
      rows.map((row) =>
        removeForever.mutateAsync({ id: row.id, storagePath: row.storagePath }).catch(() => {
          failed += 1;
        }),
      ),
    ).then(() => {
      if (failed > 0) toast.error(pl.files.trashEmptyFailed(failed));
      else toast.success(pl.files.trashEmptied(rows.length));
    });
  };

  return (
    <PageSection title={pl.files.trashTitle}>
      <p className="text-ink-soft mb-3 text-sm">
        {pl.files.trashDescription(TRASH_DAYS, formatBytes(totalBytes))}
      </p>

      <ul className="divide-hair divide-y">
        {rows.map((row) => (
          <TrashRow
            key={row.id}
            file={row}
            onRestore={() =>
              restore.mutate(row.id, {
                onSuccess: () => toast.success(pl.files.restored),
                onError: (error) => toast.error(error.message),
              })
            }
            onDelete={() =>
              removeForever.mutate(
                { id: row.id, storagePath: row.storagePath },
                {
                  onSuccess: () => toast.success(pl.files.deletedForever),
                  onError: (error) => toast.error(error.message),
                },
              )
            }
          />
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={() => setConfirmAll(true)}>
          <Trash2 className="size-4" aria-hidden />
          {pl.files.trashEmpty}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={pl.files.trashEmptyTitle}
        description={pl.files.trashEmptyDescription(rows.length, formatBytes(totalBytes))}
        confirmLabel={pl.files.trashEmpty}
        destructive
        onConfirm={purgeAll}
      />
    </PageSection>
  );
}

function TrashRow({
  file,
  onRestore,
  onDelete,
}: {
  file: StoredFile;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const left = file.deletedAt ? daysLeftInTrash(file.deletedAt) : 0;

  return (
    <li className="flex items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-ink-faint text-xs">
          {formatBytes(file.sizeBytes)} ·{' '}
          {left === 0 ? pl.files.trashDueNow : pl.files.trashDays(left)}
        </p>
      </div>

      <Button size="sm" variant="ghost" onClick={onRestore}>
        <RotateCcw className="size-3.5" aria-hidden />
        {pl.files.restore}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
        <Trash2 className="size-3.5" aria-hidden />
        {pl.common.delete}
      </Button>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={pl.files.deleteForeverTitle}
        description={pl.files.deleteForeverDescription(file.name)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={onDelete}
      />
    </li>
  );
}
