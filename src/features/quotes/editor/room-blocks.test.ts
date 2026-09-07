import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { calcQuoteTotals, newItem, newQuoteBody, newRoom, newSection } from '@/domain/quote';

/** „Rozpisz na pomieszczenia" (T-51, przywrócone w T-111). */
describe('editor.store.addRoomBlocks', () => {
  const kuchnia = newRoom({ label: 'Kuchnia' });
  const salon = newRoom({ label: 'Salon' });
  const sekcja = newSection({ title: 'Wizualizacje' });

  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      quoteId: 'q1',
      body: newQuoteBody({ rooms: [kuchnia, salon], sections: [sekcja] }),
      saveState: 'idle',
    });
  });

  const grupy = () => useEditorStore.getState().body!.sections[0]!.groups;

  it('zakłada blok dla każdego pomieszczenia, z nazwą i przypięciem', () => {
    useEditorStore.getState().addRoomBlocks(sekcja.id);
    expect(grupy().map((group) => [group.name, group.roomId])).toEqual([
      ['Kuchnia', kuchnia.id],
      ['Salon', salon.id],
    ]);
    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('powtórne „Rozpisz” nie dubluje bloków i nie brudzi dokumentu', () => {
    useEditorStore.getState().addRoomBlocks(sekcja.id);
    useEditorStore.setState({ saveState: 'saved' });
    useEditorStore.getState().addRoomBlocks(sekcja.id);
    expect(grupy()).toHaveLength(2);
    expect(useEditorStore.getState().saveState).toBe('saved');
  });

  it('dokłada blok tylko dla pomieszczenia dodanego później', () => {
    useEditorStore.getState().addRoomBlocks(sekcja.id);
    useEditorStore.getState().addRoom();
    useEditorStore.getState().addRoomBlocks(sekcja.id);
    expect(grupy()).toHaveLength(3);
  });

  describe('pozycja liczy się z miejsca, w którym leży (T-126)', () => {
    const wizualizacja = () =>
      newItem({
        name: 'Wizualizacja',
        pricing: {
          mode: 'per_room',
          baseCents: 10_000,
          perRoomCents: {},
          defaultPerRoomCents: 25_000,
          roomScope: 'all',
        },
      });

    it('wstawiona do bloku dostaje roomId i liczy tylko to pomieszczenie', () => {
      useEditorStore.getState().addRoomBlocks(sekcja.id);
      const blokKuchni = grupy()[0]!;
      useEditorStore.getState().insertItems(sekcja.id, blokKuchni.id, [wizualizacja()]);

      const item = grupy()[0]!.items[0]!;
      expect(item.roomId).toBe(kuchnia.id);
      // 250 zł za kuchnię — nie 100 + 2 × 250 za wszystkie pomieszczenia.
      expect(calcQuoteTotals(useEditorStore.getState().body!).itemsCents).toBe(25_000);
    });

    it('wstawiona luzem zostaje globalna: baza + wszystkie pomieszczenia', () => {
      useEditorStore.getState().insertItems(sekcja.id, null, [wizualizacja()]);
      expect(useEditorStore.getState().body!.sections[0]!.items[0]!.roomId).toBeNull();
      expect(calcQuoteTotals(useEditorStore.getState().body!).itemsCents).toBe(60_000);
    });

    it('rozpisanie tej samej usługi na dwa bloki daje sumę stawek, nie 2 × wszystko', () => {
      useEditorStore.getState().addRoomBlocks(sekcja.id);
      for (const group of grupy()) {
        useEditorStore.getState().insertItems(sekcja.id, group.id, [wizualizacja()]);
      }
      expect(calcQuoteTotals(useEditorStore.getState().body!).itemsCents).toBe(50_000);
    });

    it('pozycja dopisana ręcznie w bloku też jest przypięta', () => {
      useEditorStore.getState().addRoomBlocks(sekcja.id);
      useEditorStore.getState().addItem(sekcja.id, grupy()[1]!.id);
      expect(grupy()[1]!.items[0]!.roomId).toBe(salon.id);
    });
  });
});
