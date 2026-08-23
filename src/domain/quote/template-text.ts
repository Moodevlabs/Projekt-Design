import type { Room } from './schema';

/**
 * Placeholdery w opisach pozycji i we wstępie wyceny (F4.1).
 *
 * Sens: opis „Widoki ścian dla: kuchnia, salon x2." ma sam nadążać za listą
 * pomieszczeń. Bez tego każda zmiana zakresu znaczy ręczne poprawianie tekstu
 * w kilkunastu wierszach — a ten, kto o niej zapomni, wyśle klientowi ofertę
 * opisującą inny zakres, niż wycenia.
 */

/** Co wiemy w chwili renderowania tekstu. */
export interface TextContext {
  /** Pomieszczenia wyceny — źródło dla `{rooms}` i wariantów. */
  rooms?: Room[];
  /** Pomieszczenie bloku, w którym stoi pozycja (`{room}`). */
  room?: Room | null;
  qty?: number;
  frames?: number;
  client?: string;
  validUntil?: string;
  /** Stawka godzinowa, sformatowana już do pokazania (F2). */
  hourlyRate?: string;
}

/**
 * Polska liczba mnoga: `{frames|kadr|kadry|kadrów}`.
 *
 * Reguła: 1 → forma pierwsza; końcówki 2–4 → druga; reszta → trzecia.
 * **Wyjątek 12–14 jest istotny**, bo to jedyne miejsce, gdzie sama końcówka
 * kłamie: „22 kadry", ale „12 kadrów". Bez tego wyjątku tekst wygląda na
 * napisany przez maszynę — a to jest oferta handlowa.
 */
export function polishPlural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count));
  if (n === 1) return one;

  const rest = n % 10;
  const tens = n % 100;
  if (rest >= 2 && rest <= 4 && (tens < 12 || tens > 14)) return few;
  return many;
}

/** Etykieta pomieszczenia z krotnością: „salon x2" (a przy jednym — sam „salon"). */
function roomLabel(room: Room): string {
  return room.qty > 1 ? `${room.label} x${room.qty}` : room.label;
}

/**
 * Lista pomieszczeń w zadanym zakresie.
 *
 * Zakres jest ten sam, którym posługuje się cennik parametryczny — dzięki temu
 * zdanie „widoki ścian dla: …" wymienia dokładnie te pomieszczenia, za które
 * klient płaci w tej pozycji.
 */
function roomsText(rooms: Room[], scope: 'all' | 'visual' | 'technical'): string {
  const wybrane = rooms.filter((room) => {
    if (scope === 'visual') return room.includedInVisual;
    if (scope === 'technical') return room.includedInTechnical;
    return true;
  });

  return wybrane.map(roomLabel).join(', ');
}

/*
 * Placeholder: `{nazwa}` albo `{nazwa:wariant}`, albo forma z odmianą
 * `{liczba|jeden|dwa|pięć}`. Nazwy ograniczone do liter — nawias klamrowy
 * pojawia się w tekstach także sam z siebie (np. w kodzie), a nie chcemy
 * zjadać czegoś, co placeholderem nie jest.
 */
const PLACEHOLDER = /\{([a-zA-Z]+)(?::([a-zA-Z]+))?((?:\|[^|{}]*){0,3})\}/g;

/**
 * Podstawia placeholdery w tekście.
 *
 * **Nieznany placeholder zostaje dosłownie.** To celowe: tekst jest pisany
 * ręcznie, więc literówka w nazwie ma zostać widoczna jako `{pokoje}`, a nie
 * zniknąć bez śladu. Puste zniknięcie znaczyłoby zdanie z dziurą, wysłane do
 * klienta bez szansy, że ktoś to zauważy.
 */
export function renderText(template: string, context: TextContext = {}): string {
  if (!template.includes('{')) return template;

  return template.replace(PLACEHOLDER, (match, name: string, variant?: string, forms?: string) => {
    const value = resolve(name, variant, context);
    if (value === null) return match;

    // Formy odmiany dotyczą wartości liczbowych: `{frames|kadr|kadry|kadrów}`.
    if (forms) {
      const [one, few, many] = forms.slice(1).split('|');
      const count = Number(value);
      if (!Number.isFinite(count) || one === undefined) return match;

      const word = polishPlural(count, one, few ?? one, many ?? few ?? one);
      return `${value} ${word}`;
    }

    return value;
  });
}

/** `null` znaczy „nie znam takiego placeholdera" — wtedy zostaje dosłownie. */
function resolve(name: string, variant: string | undefined, context: TextContext): string | null {
  switch (name) {
    case 'rooms': {
      const rooms = context.rooms ?? [];
      const scope = variant === 'visual' || variant === 'technical' ? variant : 'all';
      // Wariant spoza słownika (`{rooms:kuchnia}`) to literówka, nie „wszystkie".
      if (variant !== undefined && variant !== 'visual' && variant !== 'technical') return null;
      return roomsText(rooms, scope);
    }
    case 'room':
      return context.room ? roomLabel(context.room) : '';
    case 'qty':
      return context.qty === undefined ? null : String(context.qty);
    case 'frames':
      return context.frames === undefined ? null : String(context.frames);
    case 'client':
      return context.client ?? '';
    case 'validUntil':
      return context.validUntil ?? '';
    case 'hourlyRate':
      return context.hourlyRate ?? '';
    default:
      return null;
  }
}

/** Placeholdery pokazywane w podpowiedziach edytora (F4.2). */
export const PLACEHOLDER_HINTS = [
  { token: '{rooms}', description: 'Wszystkie pomieszczenia wyceny' },
  { token: '{rooms:visual}', description: 'Pomieszczenia z częścią wizualną' },
  { token: '{rooms:technical}', description: 'Pomieszczenia z częścią techniczną' },
  { token: '{room}', description: 'Pomieszczenie bloku, w którym stoi pozycja' },
  { token: '{qty}', description: 'Ilość w tej pozycji' },
  { token: '{frames|kadr|kadry|kadrów}', description: 'Liczba kadrów z odmianą' },
  { token: '{client}', description: 'Nazwa klienta' },
  { token: '{validUntil}', description: 'Data ważności oferty' },
] as const;
