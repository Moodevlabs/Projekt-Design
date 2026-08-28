import { newId } from '../id';
import { StageEntrySchema, StagesDocSchema, type StageEntry, type StagesDoc } from './schema';

/**
 * Domyślne etapy współpracy (F6.1).
 *
 * Punkt wyjścia do edycji, nie prawda o czyimś procesie — każdy workspace
 * nadpisuje je u siebie (`settings.stagesTemplate`). Podział na pięć części
 * odwzorowuje arkusz `ETAPY WSPÓŁPRACY`: część ogólna plus cztery etapy.
 *
 * **Treść opisów jest naszą propozycją, nie przepisaniem arkusza** — samego
 * pliku nie ma w repozytorium. Brzmienie warto skonfrontować z oryginałem,
 * zanim trafi do klientów; struktura i podział są zgodne ze specyfikacją.
 */
export type StageTemplateEntry = Omit<StageEntry, 'id'>;

const OGOLNE = 'Zakres ogólny';
const FUNKCJONALNY = 'Etap funkcjonalny';
const WIZUALNY = 'Etap wizualny';
const TECHNICZNY = 'Etap techniczny';
const NADZOR = 'Nadzór i realizacja';

function etap(
  sectionLabel: string,
  name: string,
  description: string,
  extra: Partial<StageTemplateEntry> = {},
): StageTemplateEntry {
  return {
    name,
    description,
    /*
     * ODZNACZONE domyślnie (2026-08-27).
     *
     * Wcześniej większość etapów startowała z „ptaszkiem", więc dokument
     * „Etapy współpracy" od pierwszego otwarcia twierdził, że oferta obejmuje
     * niemal wszystko — łącznie z rzeczami, których nikt nie zamawiał.
     * Sens tego dokumentu jest odwrotny: ma pokazać, co robimy i **czego nie
     * robimy**, a to wymaga świadomego zaznaczenia zakresu, nie odklikiwania
     * gotowej listy.
     *
     * Etapy nieobjęte i tak zostają widoczne (z krzyżykiem) — to jest cała
     * wartość tego dokumentu dla inwestora.
     */
    included: false,
    sectionLabel,
    linkedItemTags: [],
    ...extra,
  };
}

const SZABLON: StageTemplateEntry[] = [
  etap(OGOLNE, 'Spotkanie wstępne', 'Rozmowa o potrzebach, stylu życia i budżecie.'),
  etap(OGOLNE, 'Inwentaryzacja', 'Pomiary z natury, dokumentacja zdjęciowa, weryfikacja rzutu.'),
  etap(OGOLNE, 'Analiza potrzeb', 'Spis funkcji, sprzętu i miejsc do przechowywania.'),
  etap(OGOLNE, 'Harmonogram prac', 'Ustalenie etapów, terminów i punktów decyzyjnych.'),

  etap(FUNKCJONALNY, 'Warianty układu', 'Co najmniej dwa układy funkcjonalne do wyboru.'),
  etap(FUNKCJONALNY, 'Korekty układu', 'Poprawki wybranego wariantu po uwagach inwestora.'),
  etap(FUNKCJONALNY, 'Finalny rzut', 'Zatwierdzony układ z wymiarami i opisem pomieszczeń.'),
  etap(
    FUNKCJONALNY,
    'Konsultacje branżowe',
    'Uzgodnienia z instalatorami tam, gdzie są potrzebne.',
  ),

  etap(WIZUALNY, 'Moodboard', 'Kierunek stylistyczny: kolory, materiały, nastrój.'),
  etap(WIZUALNY, 'Dobór materiałów', 'Wykończenia, okładziny i kolorystyka z konkretnych źródeł.', {
    linkedItemTags: ['materials'],
  }),
  etap(WIZUALNY, 'Wizualizacje 3D', 'Fotorealistyczne ujęcia pomieszczeń objętych zakresem.', {
    linkedItemTags: ['visualization'],
  }),
  etap(WIZUALNY, 'Korekty wizualizacji', 'Jedna tura poprawek po uwagach inwestora.'),

  etap(TECHNICZNY, 'Rzuty techniczne', 'Rysunki wykonawcze: ściany, posadzki, sufity.'),
  etap(TECHNICZNY, 'Projekt elektryki', 'Gniazda, oświetlenie, łączniki i sterowanie.'),
  etap(TECHNICZNY, 'Projekt hydrauliki', 'Punkty wodne i odpływy w kuchni i łazienkach.'),
  etap(TECHNICZNY, 'Kłady ścian i detale', 'Widoki ścian, rozrys płytek, detale zabudowy.'),
  etap(
    TECHNICZNY,
    'Zestawienie materiałów',
    'Lista wykończenia i wyposażenia z linkami zakupowymi.',
  ),

  etap(NADZOR, 'Nadzór autorski', 'Wizyty na budowie i weryfikacja zgodności z projektem.', {
    included: false,
  }),
  etap(
    NADZOR,
    'Kompletacja i zamówienia',
    'Zamówienia, pilnowanie terminów, kontakt z dostawcami.',
    {
      included: false,
    },
  ),
];

/** Etapy szablonu ze świeżymi identyfikatorami. */

/**
 * Wbudowany szablon jako lista wpisów — treść seedu biblioteki dokumentów
 * (T-102). Kopia, nie referencja: biblioteka może ją potem edytować.
 */
export function builtInStagesTemplate(): StageTemplateEntry[] {
  return structuredClone(SZABLON);
}

export function defaultStageEntries(template: StageTemplateEntry[] | null = null): StageEntry[] {
  return (template ?? SZABLON).map((entry) => ({ ...entry, id: newId() }));
}

/** Nowy dokument „Etapy współpracy". */
export function newStagesDoc(
  partial: Partial<StagesDoc> = {},
  template: StageTemplateEntry[] | null = null,
): StagesDoc {
  return StagesDocSchema.parse({ entries: defaultStageEntries(template), ...partial });
}

/**
 * Nowy pojedynczy etap.
 *
 * Czyta wymienione pola i przepuszcza wynik przez schemat — ta sama zasada co
 * w `newRoom`/`newStage`: akcje bywają podpinane wprost pod `onClick`,
 * a obiekt zdarzenia rozsypany do dokumentu psuje zapis.
 */
export function newStageEntry(partial: Partial<StageEntry> = {}): StageEntry {
  const domyslny: StageEntry = {
    id: newId(),
    name: '',
    description: '',
    included: true,
    sectionLabel: '',
    linkedItemTags: [],
  };

  const kandydat: StageEntry = {
    ...domyslny,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.name === undefined ? {} : { name: partial.name }),
    ...(partial.description === undefined ? {} : { description: partial.description }),
    ...(partial.included === undefined ? {} : { included: partial.included }),
    ...(partial.sectionLabel === undefined ? {} : { sectionLabel: partial.sectionLabel }),
    ...(partial.linkedItemTags === undefined ? {} : { linkedItemTags: partial.linkedItemTags }),
  };

  return StageEntrySchema.safeParse(kandydat).data ?? domyslny;
}

/** Etapy pogrupowane po nagłówku, w kolejności pierwszego wystąpienia. */
export function groupStageEntries(
  entries: StageEntry[],
): { label: string; entries: StageEntry[] }[] {
  const groups = new Map<string, StageEntry[]>();

  for (const entry of entries) {
    const label = entry.sectionLabel;
    const group = groups.get(label);
    if (group) group.push(entry);
    else groups.set(label, [entry]);
  }

  return [...groups].map(([label, group]) => ({ label, entries: group }));
}
