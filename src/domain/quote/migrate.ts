/**
 * Migracje dokumentu wyceny (`quotes.body`, `templates.body`).
 *
 * `body` to jeden JSONB, więc zmiana kształtu modelu nie ma pomocy ze strony
 * bazy — dokument zapisany starszą wersją aplikacji musi dać się doczytać.
 * Stąd `bodyVersion` i rejestr kroków: każdy krok podnosi dokument o jedną
 * wersję, a `migrateBody` przepuszcza go przez wszystkie brakujące.
 *
 * Dwie rzeczy, które łatwo przeoczyć:
 *  - **Brak pola `bodyVersion` znaczy wersję 1.** Dokumenty sprzed wprowadzenia
 *    wersjonowania nie mają czego czytać, więc nie wolno wymagać tego pola.
 *  - **Dokument z nowszej wersji odrzucamy.** Gdy ktoś otworzy starszą apką
 *    wycenę zapisaną nowszą, kształtu i tak nie zrozumiemy; lepiej powiedzieć
 *    to wprost niż zapisać z powrotem okrojony dokument i skasować dane.
 */

/** Wersja, w której zapisujemy dokumenty. Podnieś ją razem z dopisaniem kroku. */
export const CURRENT_BODY_VERSION = 5;

export type BodyRecord = Record<string, unknown>;

/** Krok migracji: dostaje dokument w wersji `from`, oddaje w `from + 1`. */
export type MigrationStep = (body: BodyRecord) => BodyRecord;

/** Kroki po numerze wersji WEJŚCIOWEJ: `1` podnosi z 1 na 2. */
export const MIGRATIONS: Record<number, MigrationStep> = {
  /**
   * v2 = cennik parametryczny (T-31). Dokument dostaje pustą listę pomieszczeń;
   * pozycjom nie dopisujemy `pricing` ręcznie — schemat nadaje im `flat`, czyli
   * dokładnie dotychczasowe `qty × cena`, więc **totale starych wycen się nie
   * zmieniają**. Tu jest tylko to, czego zod sam by nie odtworzył.
   */
  1: (body) => ({ ...body, rooms: Array.isArray(body.rooms) ? body.rooms : [] }),

  /**
   * v3 = rabaty jako osobny byt (T-32). Dokument dostaje pustą listę rabatów.
   * Istniejących pozycji `kind: 'discount'` **nie** przenosimy tutaj — zrobi to
   * T-36 razem z UI. Gdyby przenieść je teraz, rabaty zniknęłyby z edytora,
   * bo nie ma jeszcze czym ich narysować.
   */
  2: (body) => ({ ...body, discounts: Array.isArray(body.discounts) ? body.discounts : [] }),

  /**
   * v4 = rabaty wychodzą z listy pozycji (T-36). Wiersze `kind: 'discount'`
   * zamieniają się we wpisy `discounts` — kwotowe, na całą wycenę, bo dokładnie
   * tak działały jako pozycje.
   *
   * Kolejność i `enabled` przenosimy: to były widoczne dla klienta wiersze,
   * a nie techniczny zapis. Zerowanie ich przy migracji zmieniłoby kwotę
   * istniejącej oferty.
   */
  3: (body) => {
    /*
     * Migracja NIE naprawia uszkodzeń. Dokument o niespodziewanym kształcie
     * (np. `sections` jako tekst) przepuszczamy nietknięty — złapie go
     * walidacja i użytkownik zobaczy „wycena uszkodzona” zamiast pustej listy
     * pozycji. Ciche zastąpienie śmiecia pustą tablicą wyglądałoby jak utrata
     * całej wyceny.
     */
    if (!Array.isArray(body.sections)) return body;

    const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
    const jestRabatem = (item: unknown): item is BodyRecord =>
      isRecord(item) && item.kind === 'discount';

    const naDiscount = (item: BodyRecord): BodyRecord => ({
      id: item.id,
      name: typeof item.name === 'string' && item.name.length > 0 ? item.name : 'Rabat',
      description: typeof item.description === 'string' ? item.description : '',
      enabled: item.enabled !== false,
      type: 'fixed',
      // Pozycja-rabat liczyła się jako `qty × cena`, więc tę samą kwotę
      // przenosimy do rabatu kwotowego.
      valueCents: Math.round(
        (typeof item.qty === 'number' ? item.qty : 1) *
          (typeof item.unitPriceCents === 'number' ? item.unitPriceCents : 0),
      ),
      scope: 'quote',
      sectionId: null,
      itemIds: [],
      condition: 'always',
      roundToCents: 0,
    });

    const przeniesione: BodyRecord[] = [];

    const bezRabatow = (items: unknown): unknown[] =>
      asList(items).filter((item) => {
        if (!jestRabatem(item)) return true;
        przeniesione.push(naDiscount(item));
        return false;
      });

    const noweSekcje: unknown[] = asList(body.sections).map((section) => {
      if (!isRecord(section)) return section;
      return {
        ...section,
        items: bezRabatow(section.items),
        groups: asList(section.groups).map((group) =>
          isRecord(group) ? { ...group, items: bezRabatow(group.items) } : group,
        ),
      };
    });

    return {
      ...body,
      sections: noweSekcje,
      discounts: [...asList(body.discounts), ...przeniesione],
    };
  },

  /**
   * v5 = cena „indywidualna" (T-60). Kształt `Item.unitPriceCents` zmienia się
   * z `int` na `int | null`, a pozycje dostają `unit`.
   *
   * Krok **niczego nie przekształca** — stare dokumenty mają liczby, a `unit`
   * nadaje schemat (`default('lump')`, czyli dotychczasowe zachowanie bez
   * etykiety). Istnieje tylko po to, żeby literał wersji się zgadzał: bez
   * niego dokument w wersji 4 nie miałby jak dojść do 5 i wyglądałby na
   * uszkodzony (zasada z T-30).
   */
  4: (body) => body,
};

export type MigrateResult = { ok: true; body: unknown } | { ok: false; error: string };

function isRecord(value: unknown): value is BodyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Odczytuje wersję dokumentu. Brak pola = 1 (dokument sprzed wersjonowania).
 * Wartość, która nie jest dodatnią liczbą całkowitą, traktujemy jak uszkodzenie
 * — zgadywanie kształtu na podstawie śmiecia kończy się gorzej niż odmowa.
 */
export function readBodyVersion(body: BodyRecord): number | null {
  const raw = body.bodyVersion;
  if (raw === undefined || raw === null) return 1;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) return null;
  return raw;
}

/**
 * Przepuszcza dokument przez kolejne kroki aż do `CURRENT_BODY_VERSION`
 * i stempluje wynik. Wyodrębnione z `migrateBody`, żeby dało się przetestować
 * sam mechanizm na sztucznym rejestrze, niezależnie od tego, ile kroków
 * akurat istnieje.
 */
export function runMigrations(
  body: BodyRecord,
  from: number,
  to: number,
  registry: Record<number, MigrationStep> = MIGRATIONS,
): MigrateResult {
  let current = body;

  for (let version = from; version < to; version += 1) {
    const step = registry[version];
    if (!step) {
      return {
        ok: false,
        error: `Brak migracji dokumentu z wersji ${version} na ${version + 1}.`,
      };
    }
    current = step(current);
  }

  return { ok: true, body: { ...current, bodyVersion: to } };
}

/** Doprowadza dokument z bazy do bieżącej wersji modelu. */
export function migrateBody(raw: unknown): MigrateResult {
  // Nie-obiekt zostawiamy walidacji schematu — to ona ma powiedzieć,
  // czego brakuje, i wypełnić `bodyError` czytelnym opisem.
  if (!isRecord(raw)) return { ok: true, body: raw };

  const version = readBodyVersion(raw);
  if (version === null) {
    return { ok: false, error: 'Nieczytelna wersja dokumentu (`bodyVersion`).' };
  }

  if (version > CURRENT_BODY_VERSION) {
    return {
      ok: false,
      error: `Dokument zapisano nowszą wersją aplikacji (wersja ${version}, obsługujemy ${CURRENT_BODY_VERSION}). Zaktualizuj aplikację.`,
    };
  }

  return runMigrations(raw, version, CURRENT_BODY_VERSION);
}
