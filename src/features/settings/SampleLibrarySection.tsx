import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, PageSection } from '@/components/shared';
import { useDeleteSampleLibrary, useSampleCount } from '@/data/queries/useLibrary';
import { pl } from '@/i18n/pl';

/**
 * „Usuń pozostałe przykładowe" w Ustawieniach → Biblioteka (T-62).
 *
 * Sekcja **znika, gdy nie ma czego usuwać**. Przycisk, który po użyciu zostaje
 * i nic nie robi, zamienia się w ozdobę — ta sama zasada co przy checkliście
 * onboardingu (T-17).
 *
 * Kasuje tylko wpisy nietknięte: edycja dowolnego pola zdejmuje flagę
 * `is_sample`, więc usługa, którą ktoś wziął na własność, zostaje.
 */
export function SampleLibrarySection() {
  const count = useSampleCount();
  const remove = useDeleteSampleLibrary();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const remaining = count.data ?? 0;
  if (count.isLoading || remaining === 0) return null;

  return (
    <PageSection title={pl.library.title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft text-sm">{pl.library.sampleSectionHint}</p>
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          {pl.library.deleteSample(remaining)}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.library.deleteSampleTitle}
        description={pl.library.deleteSampleDescription(remaining)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          remove.mutate(undefined, {
            onSuccess: (removed) => toast.success(pl.library.sampleDeleted(removed)),
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </PageSection>
  );
}
