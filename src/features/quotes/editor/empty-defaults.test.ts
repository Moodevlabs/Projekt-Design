import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { newQuoteBody } from '@/domain/quote';

/**
 * Zakładki Termin / Etapy / Cennik startują PUSTE (T-111) — także wtedy, gdy
 * ktoś woła `ensureX()` bez szablonu (T-115).
 *
 * Do tej pory brak argumentu znaczył „wbudowany szablon z domeny" i każde
 * miejsce, które zapomniało o `EMPTY_TEMPLATE`, wstawiało kilkanaście etapów
 * „znikąd" — tak działał most „dodaj do terminu" z cennika.
 */
describe('editor.store — puste domyślne (T-115)', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ body: newQuoteBody() });
  });

  it('ensureSchedule() bez szablonu daje pusty harmonogram', () => {
    useEditorStore.getState().ensureSchedule();
    expect(useEditorStore.getState().schedule?.stages).toEqual([]);
  });

  it('ensureStagesDoc() bez szablonu daje pustą listę etapów', () => {
    useEditorStore.getState().ensureStagesDoc();
    expect(useEditorStore.getState().documents?.stages?.entries).toEqual([]);
  });

  it('ensurePriceListDoc() bez szablonu daje pusty cennik', () => {
    useEditorStore.getState().ensurePriceListDoc();
    expect(useEditorStore.getState().documents?.priceList?.items).toEqual([]);
  });

  it('„dodaj do terminu" z cennika zakłada SAM etap zbiorczy, nie cały szablon', () => {
    useEditorStore
      .getState()
      .addScheduleExtra({ name: 'Panorama 360', days: 3 }, 'Usługi dodatkowe');

    const stages = useEditorStore.getState().schedule?.stages ?? [];
    expect(stages).toHaveLength(1);
    expect(stages[0]?.kind).toBe('extras');
    expect(stages[0]?.extras.map((extra) => extra.name)).toEqual(['Panorama 360']);
  });
});
