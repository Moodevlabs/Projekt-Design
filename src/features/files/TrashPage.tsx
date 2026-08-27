import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, EmptyState, PageSection } from '@/components/shared';
import {
  useDeleteFilePermanently,
  usePurgeExpiredTrash,
  useRestoreFile,
  useStorageUsage,
  useTrash,
} from '@/data/queries/useFiles';
import { daysLeftInTrash, formatBytes, TRASH_DAYS } from '@/domain/files/schema';
import type { StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

/**
 * Kosz na pliki — własny ekran (T-67, wydzielony z Ustawień 2026-08-27).
 *
 * ## Dlaczego osobny ekran, a nie sekcja Ustawień
 *
 * Kosz nie jest **ustawieniem**: to miejsce, w którym leżą czyjeś pliki
 * i z którego się je odzyskuje. Sekcja w Ustawieniach znikała, gdy kosz był
 * pusty — czyli człowiek szukający skasowanego pliku nie miał gdzie zajrzeć
 * i nie dowiadywał się nawet, że kosz w ogóle istnieje.
 *
 * Ekran pokazuje się **zawsze**, także pusty, i mówi wprost, ile plików
 * czeka oraz **ile miejsca trzymają** — bo to jest jedyna odpowiedź na
 * „skasowałem pliki, a pasek zużycia nie drgnął".
 */
export function TrashPage() {
  const trash = useTrash();
  const usage = useStorageUsage();
  const restore = useRestoreFile();
  const removeForever = useDeleteFilePermanently();
  const [confirmAll, setConfirmAll] = useState(false);

  // Sprzątanie przeterminowanych — wołane samym wejściem na ekran.
  // Supabase bez `pg_cron` nie ma harmonogramu, a kosz sprzątany przy okazji
  // wizyty wystarcza: plik czekający 40 zamiast 30 dni nikomu nie szkodzi.
  usePurgeExpiredTrash();

  if (trash.isLoading) {
    return <Skeleton className="h-64 rounded-[var(--radius-card)]" />;
  }

  const rows = trash.data ?? [];
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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title={pl.files.trashEmptyTitle2}
        description={pl.files.trashEmptyDescription2(TRASH_DAYS)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16">
      <PageSection
        title={pl.files.trashCount(rows.length)}
        action={
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)}>
            <Trash2 className="size-4" aria-hidden />
            {pl.files.trashEmpty}
          </Button>
        }
      >
        {/*
          Zajętość kosza w zdaniu, a nie w pasku: pasek zużycia całego
          workspace'u stoi w Ustawieniach i dublowanie go tutaj kazałoby
          pytać, który jest prawdziwy. Tu liczy się jedna liczba —
          ile odzyskam, jeśli opróżnię.
        */}
        <p className="text-ink-soft text-sm">
          {pl.files.trashOccupies(
            formatBytes(totalBytes),
            usage.data ? formatBytes(usage.data.quotaBytes) : '',
          )}
        </p>

        <ul className="divide-hair mt-4 divide-y">
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
      </PageSection>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={pl.files.trashEmptyTitle}
        description={pl.files.trashEmptyDescription(rows.length, formatBytes(totalBytes))}
        confirmLabel={pl.files.trashEmpty}
        destructive
        onConfirm={purgeAll}
      />
    </div>
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
    <li className="flex items-center gap-3 py-2.5">
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
