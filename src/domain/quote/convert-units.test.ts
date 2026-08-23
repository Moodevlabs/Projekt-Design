import { describe, expect, it } from 'vitest';
import { convertItemUnits, convertPricingRule, convertUnits } from './convert-units';
import { newItem } from './factory';

/** 120 zł/h = 12 000 gr/h, czyli 200 groszy za minutę. */
const RATE = 12_000;

describe('convertUnits', () => {
  it('ten sam tryb nic nie zmienia', () => {
    expect(convertUnits(45, 'amount', 'amount', RATE)).toBe(45);
    expect(convertUnits(45, 'time', 'time', null)).toBe(45);
  });

  it('minuty na grosze: 45 min przy 120 zł/h = 90 zł', () => {
    expect(convertUnits(45, 'time', 'amount', RATE)).toBe(9_000);
  });

  it('grosze na minuty: 90 zł przy 120 zł/h = 45 min', () => {
    expect(convertUnits(9_000, 'amount', 'time', RATE)).toBe(45);
  });

  it('BEZ STAWKI zwraca null, a nie zero ani wartość niezmienioną', () => {
    /*
     * Obie „wygodne" odpowiedzi byłyby kłamstwem. Zero wpisałoby do oferty
     * darmową pracę; wartość niezmieniona wpisałaby 45 groszy tam, gdzie ktoś
     * policzył 45 minut. `null` zmusza wołającego, żeby coś z tym zrobił.
     */
    expect(convertUnits(45, 'time', 'amount', null)).toBeNull();
    expect(convertUnits(45, 'amount', 'time', 0)).toBeNull();
  });

  it('minuty zaokrągla do pełnych', () => {
    // 150 gr przy 120 zł/h = 0,75 min → 1 min.
    expect(convertUnits(150, 'amount', 'time', RATE)).toBe(1);
  });

  it('konwersja tam i z powrotem wraca do punktu wyjścia dla wielokrotności', () => {
    const minuty = 90;
    const grosze = convertUnits(minuty, 'time', 'amount', RATE);
    expect(convertUnits(grosze!, 'amount', 'time', RATE)).toBe(minuty);
  });
});

describe('convertPricingRule', () => {
  it('`flat` nie ma czego przeliczać w regule', () => {
    expect(convertPricingRule({ mode: 'flat' }, 'time', 'amount', RATE)).toEqual({ mode: 'flat' });
  });

  it('przelicza bazę, wartość domyślną i KAŻDĄ stawkę per pomieszczenie', () => {
    const wynik = convertPricingRule(
      {
        mode: 'per_room',
        baseCents: 30,
        perRoomCents: { 'rt-kuchnia': 15, 'rt-salon': 45 },
        defaultPerRoomCents: 10,
        roomScope: 'all',
      },
      'time',
      'amount',
      RATE,
    );

    expect(wynik).toEqual({
      mode: 'per_room',
      baseCents: 6_000,
      perRoomCents: { 'rt-kuchnia': 3_000, 'rt-salon': 9_000 },
      defaultPerRoomCents: 2_000,
      roomScope: 'all',
    });
  });

  it('nie rusza zasięgu ani trybu reguły', () => {
    const wynik = convertPricingRule(
      { mode: 'per_frame', baseCents: 15, perRoomCents: {}, defaultPerRoomCents: 30 },
      'time',
      'amount',
      RATE,
    );

    // Przeliczamy WARTOŚCI, nie sposób liczenia — reguła opisuje usługę.
    expect(wynik?.mode).toBe('per_frame');
  });

  it('bez stawki zwraca null', () => {
    expect(
      convertPricingRule(
        { mode: 'per_room', baseCents: 30, perRoomCents: {}, defaultPerRoomCents: 0, roomScope: 'all' },
        'time',
        'amount',
        null,
      ),
    ).toBeNull();
  });
});

describe('convertItemUnits', () => {
  it('przelicza cenę jednostkową i regułę', () => {
    const item = newItem({
      name: 'Projekt',
      unitPriceCents: 45,
      pricing: { mode: 'per_room', baseCents: 30, perRoomCents: {}, defaultPerRoomCents: 15, roomScope: 'all' },
    });

    const wynik = convertItemUnits(item, 'time', 'amount', RATE);

    expect(wynik?.unitPriceCents).toBe(9_000);
    expect(wynik?.pricing).toMatchObject({ baseCents: 6_000, defaultPerRoomCents: 3_000 });
  });

  it('NIE rusza zakresu pracy: ilości, kadrów, TAK/NIE ani pomieszczenia', () => {
    // Te pola opisują, ILE pracy, a nie ile ona kosztuje. Przeliczanie ich po
    // kursie stawki nie miałoby sensu.
    const item = newItem({ name: 'Wizualizacja', qty: 3, unitPriceCents: 45, frames: 8 });
    item.enabled = false;
    item.roomId = 'r-kuchnia';

    const wynik = convertItemUnits(item, 'time', 'amount', RATE);

    expect(wynik?.qty).toBe(3);
    expect(wynik?.frames).toBe(8);
    expect(wynik?.enabled).toBe(false);
    expect(wynik?.roomId).toBe('r-kuchnia');
    expect(wynik?.id).toBe(item.id);
  });

  it('bez stawki odmawia — cała pozycja, nie połowa', () => {
    // Przeliczenie samej ceny jednostkowej przy nietkniętej regule dałoby
    // pozycję, w której dwie liczby znaczą co innego.
    const item = newItem({
      name: 'Projekt',
      unitPriceCents: 45,
      pricing: { mode: 'per_room', baseCents: 30, perRoomCents: {}, defaultPerRoomCents: 0, roomScope: 'all' },
    });

    expect(convertItemUnits(item, 'time', 'amount', null)).toBeNull();
  });

  it('ten sam tryb zwraca pozycję bez zmian', () => {
    const item = newItem({ name: 'Projekt', unitPriceCents: 45 });
    expect(convertItemUnits(item, 'amount', 'amount', null)).toBe(item);
  });
});
