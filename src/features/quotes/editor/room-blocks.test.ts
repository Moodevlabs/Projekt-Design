import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { newQuoteBody, newRoom, newSection } from '@/domain/quote';

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
});
