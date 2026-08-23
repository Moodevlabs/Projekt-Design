import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '../editor.store';
import { pl } from '@/i18n/pl';

/**
 * Podpowiedź: pozycja z etykietą zaznacza pasujący etap współpracy (F6.1).
 *
 * Ta sama zasada co przy harmonogramie (`useStageAutoSync`) i z tego samego
 * powodu: jeśli wycena zawiera wizualizacje, to etap „Wizualizacje 3D" prawie
 * na pewno wchodzi w zakres — a dokument, który mówi klientowi „nie robimy
 * wizualizacji" obok pozycji „Wizualizacje 3D" w cenniku, jest gorszy niż
 * brak dokumentu.
 *
 * Trzy ograniczenia trzymają to po stronie pomocy, a nie automatu:
 *
 *  - **Raz na etap** — odznaczenie ręczne musi zostać odznaczone.
 *  - **Tylko zaznaczamy** — usunięcie pozycji nie wyrzuca etapu z zakresu.
 *    Cichy skrót zakresu to najgorszy rodzaj niespodzianki.
 *  - **Z cofnięciem** — komunikat mówi, co się stało, i pozwala to odwrócić.
 */
export function useStageEntryAutoSync(enabled: boolean) {
  const doc = useEditorStore((state) => state.documents?.stages ?? null);
  const body = useEditorStore((state) => state.body);
  const updateEntry = useEditorStore((state) => state.updateStageEntry);

  /** Etapy, które automat już raz zaproponował — drugi raz nie wraca. */
  const zaproponowane = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !doc || !body) return;

    const tagiWWycenie = new Set(
      body.sections
        .flatMap((section) => [...section.items, ...section.groups.flatMap((group) => group.items)])
        .filter((item) => item.enabled)
        .flatMap((item) => item.tags),
    );

    for (const entry of doc.entries) {
      if (entry.included) continue;
      if (zaproponowane.current.has(entry.id)) continue;
      if (!entry.linkedItemTags.some((tag) => tagiWWycenie.has(tag))) continue;

      zaproponowane.current.add(entry.id);
      updateEntry(entry.id, { included: true });

      toast.success(pl.editor.stageEntryAutoIncluded(entry.name), {
        action: {
          label: pl.common.undo,
          onClick: () => updateEntry(entry.id, { included: false }),
        },
      });
    }
  }, [enabled, doc, body, updateEntry]);
}
