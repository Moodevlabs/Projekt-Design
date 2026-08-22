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
export const CURRENT_BODY_VERSION = 3;

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
