import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '../editor.store';
import { pl } from '@/i18n/pl';

/**
 * Podpowiedź: włączona w wycenie pozycja z etykietą włącza pasujący etap (F5.2).
 *
 * Trzy rzeczy, które trzymają to po stronie pomocy, a nie automatu rządzącego
 * dokumentem:
 *
 *  - **Raz na etap.** Wyłączenie etapu ręcznie musi zostać wyłączone. Automat,
 *    który przy każdym renderze przywraca swoją decyzję, jest nie do zniesienia.
 *  - **Tylko włączamy.** Zniknięcie pozycji nie wyłącza etapu: praca bywa
 *    zaplanowana wcześniej niż wyceniona, a ciche skrócenie terminu to
 *    najgorszy rodzaj niespodzianki.
 *  - **Z cofnięciem.** Komunikat mówi, co się stało, i pozwala to odwrócić
 *    jednym kliknięciem.
 */
export function useStageAutoSync(enabled: boolean) {
  const schedule = useEditorStore((state) => state.schedule);
  const body = useEditorStore((state) => state.body);
  const updateStage = useEditorStore((state) => state.updateStage);

  /** Etapy, które automat już raz zaproponował — drugi raz nie wraca. */
  const zaproponowane = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !schedule || !body) return;

    const tagiWWycenie = new Set(
      body.sections
        .flatMap((section) => [...section.items, ...section.groups.flatMap((group) => group.items)])
        .filter((item) => item.enabled)
        .flatMap((item) => item.tags),
    );

    for (const stage of schedule.stages) {
      if (stage.enabled) continue;
      if (zaproponowane.current.has(stage.id)) continue;
      if (!stage.linkedItemTags.some((tag) => tagiWWycenie.has(tag))) continue;

      zaproponowane.current.add(stage.id);
      updateStage(stage.id, { enabled: true });

      toast.success(pl.editor.stageAutoEnabled(stage.name), {
        action: {
          label: pl.common.undo,
          onClick: () => updateStage(stage.id, { enabled: false }),
        },
      });
    }
  }, [enabled, schedule, body, updateStage]);
}
