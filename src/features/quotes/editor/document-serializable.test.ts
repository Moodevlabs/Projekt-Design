import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { newQuoteBody, newSection, newItem } from '@/domain/quote';

/**
 * Dokument wyceny MUSI dać się zserializować do JSON — inaczej nie da się go
 * zapisać, a praca zostaje tylko w pamięci przeglądarki.
 *
 * Zgłoszenie użytkownika: „Błąd zapisu — ponów" po kliknięciu „Dodaj
 * pomieszczenie". Powód: przycisk był podpięty jako `onClick={onAdd}`, więc
 * React przekazywał akcji **obiekt zdarzenia**, a ta rozsypywała go (`...partial`)
 * do dokumentu. Razem z nim wjeżdżały węzły DOM i włókna Reacta, przez co
 * `JSON.stringify` wywalał się na strukturze cyklicznej.
 */

/** Coś, co udaje obiekt zdarzenia Reacta: ma cykl i węzeł DOM. */
function fakeReactEvent(): unknown {
  const button = { nodeName: 'BUTTON' } as Record<string, unknown>;
  const fiber = { stateNode: button, tag: 5 } as Record<string, unknown>;
  button.__reactFiber = fiber;

  return { type: 'click', target: button, currentTarget: button, nativeEvent: { target: button } };
}

function zaladujWycene() {
  useEditorStore.setState({
    body: newQuoteBody({
      title: 'Wycena',
      sections: [newSection({ title: 'Sekcja', items: [newItem({ name: 'Pozycja' })] })],
    }),
    quoteId: 'q1',
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
}

beforeEach(() => {
  useEditorStore.getState().reset();
  zaladujWycene();
});

describe('dodanie pomieszczenia', () => {
  it('dokument DAJE SIĘ zapisać, nawet gdy akcję wywołano ze zdarzeniem', () => {
    // Dokładnie ten przypadek dawał „Błąd zapisu — ponów".
    (useEditorStore.getState().addRoom as (arg: unknown) => void)(fakeReactEvent());

    expect(() => JSON.stringify(useEditorStore.getState().body)).not.toThrow();
  });

  it('ze śmieci powstaje ZWYKŁE pomieszczenie, a nie wpis pełen dziwów', () => {
    (useEditorStore.getState().addRoom as (arg: unknown) => void)(fakeReactEvent());

    const room = useEditorStore.getState().body?.rooms[0];
    expect(room?.label).toBe('Nowe pomieszczenie');
    expect(room?.qty).toBe(1);
    // Żadnych pól spoza modelu.
    expect(Object.keys(room ?? {}).sort()).toEqual(
      ['id', 'includedInTechnical', 'includedInVisual', 'label', 'qty', 'roomTypeId'].sort(),
    );
  });

  it('podane wartości nadal działają — łącznie z jawnym `false`', () => {
    useEditorStore.getState().addRoom({ label: 'Kuchnia', qty: 2, includedInVisual: false });

    const room = useEditorStore.getState().body?.rooms[0];
    expect(room?.label).toBe('Kuchnia');
    expect(room?.qty).toBe(2);
    // `??`, a nie `||` — inaczej `false` wróciłoby do `true`.
    expect(room?.includedInVisual).toBe(false);
  });
});

describe('dodanie rabatu', () => {
  it('dokument DAJE SIĘ zapisać, nawet gdy akcję wywołano ze zdarzeniem', () => {
    // Ten sam błąd czekał na „Dodaj rabat" — użytkownik jeszcze go nie trafił.
    (useEditorStore.getState().addDiscount as (arg: unknown) => void)(fakeReactEvent());

    expect(() => JSON.stringify(useEditorStore.getState().body)).not.toThrow();
  });

  it('ze śmieci powstaje zwykły rabat kwotowy', () => {
    (useEditorStore.getState().addDiscount as (arg: unknown) => void)(fakeReactEvent());

    const discount = useEditorStore.getState().body?.discounts[0];
    expect(discount?.name).toBe('Rabat');
    expect(discount?.type).toBe('fixed');
    expect(discount?.scope).toBe('quote');
  });

  it('rabat procentowy zachowuje swoją wartość', () => {
    useEditorStore.getState().addDiscount({ type: 'percent', percent: 5, name: 'Za komplet' });

    const discount = useEditorStore.getState().body?.discounts[0];
    expect(discount?.type).toBe('percent');
    expect(discount?.percent).toBe(5);
  });
});
