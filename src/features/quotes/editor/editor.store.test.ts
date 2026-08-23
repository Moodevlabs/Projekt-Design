import { beforeEach, describe, expect, it } from 'vitest';
import { countLinkedItems, useEditorStore } from './editor.store';
import { newGroup, newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';

function makeBody(): QuoteBody {
  return newQuoteBody({
    title: 'Wycena testowa',
    sections: [
      newSection({
        title: 'Projekt',
        items: [newItem({ name: 'Luzna pozycja', unitPriceCents: 10_000 })],
        groups: [
          newGroup({
            name: 'Kuchnia',
            items: [
              newItem({ name: 'Blat', unitPriceCents: 200_000 }),
              newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 50_000 }),
            ],
          }),
        ],
      }),
      newSection({ title: 'Nadzor' }),
    ],
  });
}

function makeQuote(body: QuoteBody): Quote {
  return {
    id: 'quote-1',
    workspaceId: 'ws-1',
    number: 'WYC/2026/08/0001',
    title: body.title,
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    body,
    bodyError: null,
  };
}

const store = () => useEditorStore.getState();

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.getState().load(makeQuote(makeBody()));
});

describe('editor.store — cykl zycia', () => {
  it('wczytuje wycene razem z updated_at do blokady optymistycznej', () => {
    expect(store().quoteId).toBe('quote-1');
    expect(store().number).toBe('WYC/2026/08/0001');
    expect(store().lastSeenUpdatedAt).toBe('2026-08-01T10:00:00Z');
    expect(store().saveState).toBe('idle');
  });

  it('reset czysci stan — inaczej przy przejsciu miedzy wycenami mignelaby poprzednia', () => {
    store().reset();
    expect(store().body).toBeNull();
    expect(store().quoteId).toBeNull();
  });

  it('rozroznia zwykly blad zapisu od konfliktu', () => {
    store().markError('brak sieci');
    expect(store().saveState).toBe('error');
    expect(store().saveError).toBe('brak sieci');

    store().markConflict();
    // Konflikt to inny stan, bo ponowienie zapisu nadpisaloby cudze zmiany.
    expect(store().saveState).toBe('conflict');
  });

  it('po zapisie przyjmuje nowy updated_at', () => {
    store().markSaving();
    expect(store().saveState).toBe('saving');

    store().markSaved('2026-08-01T11:00:00Z', '2026-08-01T11:00:00Z');
    expect(store().saveState).toBe('saved');
    expect(store().lastSeenUpdatedAt).toBe('2026-08-01T11:00:00Z');
  });
});

describe('editor.store — struktura', () => {
  it('dodaje i usuwa sekcje', () => {
    store().addSection();
    expect(store().body?.sections).toHaveLength(3);

    const id = store().body?.sections[2]?.id;
    if (!id) throw new Error('brak sekcji');
    store().removeSection(id);
    expect(store().body?.sections).toHaveLength(2);
  });

  it('dodaje grupe do wskazanej sekcji', () => {
    const sectionId = store().body?.sections[1]?.id;
    if (!sectionId) throw new Error('brak sekcji');

    store().addGroup(sectionId);
    expect(store().body?.sections[1]?.groups).toHaveLength(1);
    expect(store().body?.sections[0]?.groups).toHaveLength(1);
  });

  it('dodaje pozycje luzem w sekcji, gdy groupId jest null', () => {
    const sectionId = store().body?.sections[0]?.id;
    if (!sectionId) throw new Error('brak sekcji');

    store().addItem(sectionId, null);
    expect(store().body?.sections[0]?.items).toHaveLength(2);
  });

  it('dodaje pozycje do grupy', () => {
    const section = store().body?.sections[0];
    const groupId = section?.groups[0]?.id;
    if (!section || !groupId) throw new Error('brak grupy');

    store().addItem(section.id, groupId);
    expect(store().body?.sections[0]?.groups[0]?.items).toHaveLength(3);
  });

  it('usuwa pozycje niezaleznie od tego, czy lezy w grupie, czy luzem', () => {
    const section = store().body?.sections[0];
    const looseId = section?.items[0]?.id;
    const inGroupId = section?.groups[0]?.items[0]?.id;
    if (!looseId || !inGroupId) throw new Error('brak pozycji');

    store().removeItem(looseId);
    expect(store().body?.sections[0]?.items).toHaveLength(0);

    store().removeItem(inGroupId);
    expect(store().body?.sections[0]?.groups[0]?.items).toHaveLength(1);
  });

  it('przelacza pozycje TAK/NIE', () => {
    const itemId = store().body?.sections[0]?.groups[0]?.items[0]?.id;
    if (!itemId) throw new Error('brak pozycji');

    expect(store().body?.sections[0]?.groups[0]?.items[0]?.enabled).toBe(true);
    store().toggleItem(itemId);
    expect(store().body?.sections[0]?.groups[0]?.items[0]?.enabled).toBe(false);
    store().toggleItem(itemId);
    expect(store().body?.sections[0]?.groups[0]?.items[0]?.enabled).toBe(true);
  });

  it('ignoruje nieznane id zamiast rzucac', () => {
    expect(() => {
      store().renameSection('nie-ma', 'x');
      store().renameGroup('nie-ma', 'x');
      store().updateItem('nie-ma', { name: 'x' });
      store().toggleItem('nie-ma');
      store().removeItem('nie-ma');
    }).not.toThrow();
  });
});

describe('editor.store — oznaczanie zmian', () => {
  it('kazda zmiana tresci ustawia stan `dirty` dla autozapisu', () => {
    const itemId = store().body?.sections[0]?.items[0]?.id;
    if (!itemId) throw new Error('brak pozycji');

    expect(store().saveState).toBe('idle');
    store().updateItem(itemId, { unitPriceCents: 12_345 });
    expect(store().saveState).toBe('dirty');
  });

  it('zmiana trybu podglad/edycja NIE brudzi dokumentu', () => {
    store().setMode('preview');
    // Podglad to ten sam komponent bez kontrolek — nic sie nie zmienilo w danych,
    // wiec autozapis nie ma czego wysylac.
    expect(store().saveState).toBe('idle');
    expect(store().mode).toBe('preview');
  });
});

describe('editor.store — wydajnosc (tozsamosc obiektow)', () => {
  it('zmiana pozycji nie podmienia nietknietych sekcji ani grup', () => {
    const before = store().body;
    if (!before) throw new Error('brak body');

    const untouchedSection = before.sections[1];
    const touchedSection = before.sections[0];
    const itemId = touchedSection?.groups[0]?.items[0]?.id;
    if (!itemId || !untouchedSection) throw new Error('brak danych');

    store().updateItem(itemId, { name: 'Blat kamienny' });

    const after = store().body;
    if (!after) throw new Error('brak body');

    // To jest gwarancja z kryterium T-08 „300 pozycji bez laga": zmemoizowane
    // komponenty nietknietych galezi dostaja te sama referencje i nie renderuja sie.
    expect(after.sections[1]).toBe(untouchedSection);
    expect(after.sections[0]).not.toBe(touchedSection);
  });

  it('zmiana jednej pozycji nie podmienia jej rodzenstwa', () => {
    const group = store().body?.sections[0]?.groups[0];
    const sibling = group?.items[1];
    const targetId = group?.items[0]?.id;
    if (!sibling || !targetId) throw new Error('brak danych');

    store().updateItem(targetId, { unitPriceCents: 999 });

    expect(store().body?.sections[0]?.groups[0]?.items[1]).toBe(sibling);
  });

  it('radzi sobie z duzym dokumentem', () => {
    const big = newQuoteBody({
      sections: [
        newSection({
          title: 'Duza sekcja',
          items: Array.from({ length: 300 }, (_, index) =>
            newItem({ name: `Pozycja ${index}`, unitPriceCents: index * 100 }),
          ),
        }),
      ],
    });
    store().load(makeQuote(big));

    const items = store().body?.sections[0]?.items ?? [];
    expect(items).toHaveLength(300);

    const untouched = items[299];
    const targetId = items[0]?.id;
    if (!targetId || !untouched) throw new Error('brak danych');

    store().updateItem(targetId, { name: 'Zmieniona' });

    expect(store().body?.sections[0]?.items[299]).toBe(untouched);
    expect(store().body?.sections[0]?.items[0]?.name).toBe('Zmieniona');
  });
});

describe('editor.store — toggle grupy', () => {
  it('wlacza wszystko, gdy czesc jest wylaczona', () => {
    const group = store().body?.sections[0]?.groups[0];
    const groupId = group?.id;
    const firstId = group?.items[0]?.id;
    if (!groupId || !firstId) throw new Error('brak grupy');

    store().toggleItem(firstId);
    expect(store().body?.sections[0]?.groups[0]?.items.map((i) => i.enabled)).toEqual([
      false,
      true,
    ]);

    store().toggleGroup(groupId);
    expect(store().body?.sections[0]?.groups[0]?.items.every((i) => i.enabled)).toBe(true);
  });

  it('gasi wszystko, gdy wszystko bylo wlaczone', () => {
    const groupId = store().body?.sections[0]?.groups[0]?.id;
    if (!groupId) throw new Error('brak grupy');

    store().toggleGroup(groupId);
    expect(store().body?.sections[0]?.groups[0]?.items.some((i) => i.enabled)).toBe(false);
  });

  it('pusta grupa nie ma czego wlaczyc i nie brudzi dokumentu', () => {
    const sectionId = store().body?.sections[1]?.id;
    if (!sectionId) throw new Error('brak sekcji');

    store().addGroup(sectionId);
    const emptyId = store().body?.sections[1]?.groups[0]?.id;
    if (!emptyId) throw new Error('brak grupy');

    store().markSaved('2026-08-01T12:00:00Z', '2026-08-01T12:00:00Z');
    store().toggleGroup(emptyId);
    expect(store().saveState).toBe('saved');
  });
});

describe('editor.store — kolejność', () => {
  const ids = () => {
    const body = store().body;
    if (!body) throw new Error('brak body');
    const section = body.sections[0];
    const group = section?.groups[0];
    if (!section || !group) throw new Error('brak danych');
    return { section, group, body };
  };

  it('przenosi pozycję z grupy do luźnych pozycji sekcji', () => {
    const { section, group } = ids();
    const itemId = group.items[0]?.id;
    if (!itemId) throw new Error('brak pozycji');

    store().moveItem({ itemId, toSectionId: section.id, toGroupId: null, toIndex: 0 });

    const after = store().body?.sections[0];
    expect(after?.items[0]?.id).toBe(itemId);
    expect(after?.groups[0]?.items).toHaveLength(1);
  });

  it('przenosi pozycję między sekcjami', () => {
    const { group } = ids();
    const targetSectionId = store().body?.sections[1]?.id;
    const itemId = group.items[0]?.id;
    if (!targetSectionId || !itemId) throw new Error('brak danych');

    store().moveItem({ itemId, toSectionId: targetSectionId, toGroupId: null, toIndex: 0 });

    expect(store().body?.sections[1]?.items[0]?.id).toBe(itemId);
  });

  it('przenosi grupę do innej sekcji', () => {
    const { group } = ids();
    const targetSectionId = store().body?.sections[1]?.id;
    if (!targetSectionId) throw new Error('brak sekcji');

    store().moveGroup({ groupId: group.id, toSectionId: targetSectionId, toIndex: 0 });

    expect(store().body?.sections[0]?.groups).toHaveLength(0);
    expect(store().body?.sections[1]?.groups[0]?.id).toBe(group.id);
  });

  it('zmienia kolejność sekcji', () => {
    const first = store().body?.sections[0]?.id;
    if (!first) throw new Error('brak sekcji');

    store().moveSection({ sectionId: first, toIndex: 1 });
    expect(store().body?.sections[1]?.id).toBe(first);
  });

  it('każda zmiana kolejności brudzi dokument', () => {
    const { section } = ids();
    expect(store().saveState).toBe('idle');
    store().moveSection({ sectionId: section.id, toIndex: 1 });
    expect(store().saveState).toBe('dirty');
  });

  it('ruch nieznanego elementu NIE brudzi dokumentu', () => {
    const { section } = ids();

    // Domena zwraca to samo wejście, gdy id nie istnieje; store porównuje
    // referencje i wtedy nie budzi autozapisu.
    store().moveSection({ sectionId: 'nie-ma-takiej', toIndex: 0 });
    expect(store().saveState).toBe('idle');

    store().moveItem({
      itemId: 'nie-ma-takiej',
      toSectionId: section.id,
      toGroupId: null,
      toIndex: 0,
    });
    expect(store().saveState).toBe('idle');

    // Uwaga: upuszczenie elementu TAM, GDZIE JUŻ JEST, store'a nie interesuje —
    // domena i tak zwraca nowy dokument. Takie ruchy odsiewa `resolveDrop`
    // z warstwy przeciągania (patrz `dnd/drop-resolution.test.ts`).
  });

  it('nie wywraca się na szkicu immera (structuredClone proxy)', () => {
    const { section, group } = ids();
    expect(() => {
      store().moveItem({
        itemId: group.items[0]?.id ?? '',
        toSectionId: section.id,
        toGroupId: null,
        toIndex: 0,
      });
    }).not.toThrow();
  });
});

describe('editor.store — kaskada z biblioteki', () => {
  const LIB_ID = 'lib-1';

  beforeEach(() => {
    // Dwie pozycje z tej samej pozycji bibliotecznej + jedna niepowiązana.
    const body = makeBody();
    const group = body.sections[0]?.groups[0];
    const loose = body.sections[0]?.items[0];
    if (!group || !loose) throw new Error('brak danych');
    group.items[0]!.libraryItemId = LIB_ID;
    loose.libraryItemId = LIB_ID;

    useEditorStore.getState().reset();
    useEditorStore.getState().load(makeQuote(body));
  });

  it('liczy pozycje powiązane z biblioteką', () => {
    expect(countLinkedItems(store().body, LIB_ID)).toBe(2);
    expect(countLinkedItems(store().body, 'inne-id')).toBe(0);
    expect(countLinkedItems(null, LIB_ID)).toBe(0);
  });

  it('aktualizuje wszystkie powiązane pozycje naraz', () => {
    store().applyLibraryUpdate(LIB_ID, { unitPriceCents: 99_900, name: 'Nowa nazwa' });

    const body = store().body;
    expect(body?.sections[0]?.items[0]?.unitPriceCents).toBe(99_900);
    expect(body?.sections[0]?.items[0]?.name).toBe('Nowa nazwa');
    expect(body?.sections[0]?.groups[0]?.items[0]?.unitPriceCents).toBe(99_900);
  });

  it('nie rusza pozycji niepowiązanych', () => {
    const przed = store().body?.sections[0]?.groups[0]?.items[1]?.unitPriceCents;
    store().applyLibraryUpdate(LIB_ID, { unitPriceCents: 99_900 });
    expect(store().body?.sections[0]?.groups[0]?.items[1]?.unitPriceCents).toBe(przed);
  });

  it('NIE nadpisuje stanu TAK/NIE ani ilości — to należy do wyceny, nie do biblioteki', () => {
    const itemId = store().body?.sections[0]?.items[0]?.id;
    if (!itemId) throw new Error('brak pozycji');
    store().updateItem(itemId, { enabled: false, qty: 3 });

    store().applyLibraryUpdate(LIB_ID, { unitPriceCents: 1000 });

    const item = store().body?.sections[0]?.items[0];
    expect(item?.enabled).toBe(false);
    expect(item?.qty).toBe(3);
    expect(item?.unitPriceCents).toBe(1000);
  });

  it('brak powiązanych pozycji nie brudzi dokumentu', () => {
    expect(store().saveState).toBe('idle');
    store().applyLibraryUpdate('nie-ma-takiej', { unitPriceCents: 1 });
    expect(store().saveState).toBe('idle');
  });

  it('kaskada brudzi dokument, żeby autozapis ją utrwalił', () => {
    store().applyLibraryUpdate(LIB_ID, { unitPriceCents: 1 });
    expect(store().saveState).toBe('dirty');
  });
});

describe('editor.store — pomieszczenia (T-35)', () => {
  it('dodane pomieszczenie ma sensowne wartosci startowe i brudzi dokument', () => {
    store().addRoom();

    const room = store().body?.rooms[0];
    expect(room?.label).toBe('Nowe pomieszczenie');
    expect(room?.qty).toBe(1);
    // Nowe pomieszczenie liczy sie do obu czesci — wylaczanie jest decyzja.
    expect(room?.includedInVisual).toBe(true);
    expect(room?.includedInTechnical).toBe(true);
    expect(room?.roomTypeId).toBeNull();
    expect(store().saveState).toBe('dirty');
  });

  it('kazde pomieszczenie dostaje wlasne id', () => {
    store().addRoom();
    store().addRoom();

    const rooms = store().body?.rooms ?? [];
    expect(rooms).toHaveLength(2);
    expect(rooms[0]?.id).not.toBe(rooms[1]?.id);
  });

  it('aktualizuje wskazane pomieszczenie, nie rusza pozostalych', () => {
    store().addRoom({ label: 'Kuchnia' });
    store().addRoom({ label: 'Salon' });
    const kuchnia = store().body?.rooms[0];
    if (!kuchnia) throw new Error('brak pomieszczenia');

    store().updateRoom(kuchnia.id, { qty: 2, includedInVisual: false });

    expect(store().body?.rooms[0]?.qty).toBe(2);
    expect(store().body?.rooms[0]?.includedInVisual).toBe(false);
    expect(store().body?.rooms[1]?.label).toBe('Salon');
    expect(store().body?.rooms[1]?.qty).toBe(1);
  });

  it('usuwa pomieszczenie i ODPINA od niego pozycje, zamiast je kasowac', () => {
    store().addRoom({ label: 'Kuchnia' });
    const room = store().body?.rooms[0];
    const itemId = store().body?.sections[0]?.items[0]?.id;
    if (!room || !itemId) throw new Error('brak danych');

    store().updateItem(itemId, { roomId: room.id });
    store().removeRoom(room.id);

    expect(store().body?.rooms).toHaveLength(0);
    // Uzytkownik usunal POMIESZCZENIE, nie usluge — pozycja zostaje w wycenie.
    const item = store().body?.sections[0]?.items[0];
    expect(item?.id).toBe(itemId);
    // ...ale bez martwego wskaznika, ktory kazalby liczyc ja po cenie
    // nieistniejacego pomieszczenia.
    expect(item?.roomId).toBeNull();
  });

  it('odpina takze pozycje siedzace w grupach', () => {
    store().addRoom({ label: 'Kuchnia' });
    const room = store().body?.rooms[0];
    const groupItemId = store().body?.sections[0]?.groups[0]?.items[0]?.id;
    if (!room || !groupItemId) throw new Error('brak danych');

    store().updateItem(groupItemId, { roomId: room.id });
    store().removeRoom(room.id);

    expect(store().body?.sections[0]?.groups[0]?.items[0]?.roomId).toBeNull();
  });

  it('usuniecie nieistniejacego pomieszczenia nie rusza pozycji', () => {
    store().addRoom({ label: 'Kuchnia' });
    const room = store().body?.rooms[0];
    const itemId = store().body?.sections[0]?.items[0]?.id;
    if (!room || !itemId) throw new Error('brak danych');

    store().updateItem(itemId, { roomId: room.id });
    store().removeRoom('nie-ma-takiego');

    expect(store().body?.rooms).toHaveLength(1);
    expect(store().body?.sections[0]?.items[0]?.roomId).toBe(room.id);
  });
});
