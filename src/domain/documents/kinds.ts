import { DocKindSchema, type DocKind } from '../quote/schema';

/**
 * Rodzaje dokumentu (T-99, Faza 5).
 *
 * Wycena przestała być rdzeniem aplikacji — jest jednym z czterech dokumentów,
 * które studio wystawia inwestorowi. Każdy rodzaj ma własny rejestr (zakładka
 * w „Dokumentach"), własny wzorzec numeru i własną sekcję w bibliotece.
 * Wiersz w bazie jest ten sam (`quotes`) — różni się tylko tym, którą część
 * edytor traktuje jako „ten dokument".
 */
export const DOCUMENT_KINDS = DocKindSchema.options;
export type DocumentKind = DocKind;

/**
 * Domyślne wzorce numerów per rodzaj. Parytet z `next_document_number`
 * (migracja `0042`) — SQL ma te same literały jako `fallback`.
 *
 * Wycena celowo NIE ma tu wpisu: jej wzorzec to istniejące
 * `settings.numberPattern`, którego użytkownik mógł już zmienić.
 */
export const DEFAULT_DOCUMENT_NUMBER_PATTERNS: Record<Exclude<DocKind, 'offer'>, string> = {
  schedule: 'TER/{YYYY}/{MM}/{seq}',
  stages: 'ETP/{YYYY}/{MM}/{seq}',
  price_list: 'CEN/{YYYY}/{MM}/{seq}',
};

/**
 * Mapowanie etykiet rejestru sprzed T-99 na rodzaje dokumentu.
 *
 * Baza dostała `update` w migracji, ale dane mogą przyjść też z innych
 * miejsc (eksport JSON, podręczna kopia offline, test) — parser ma je
 * rozumieć, a nie odrzucać jako uszkodzone.
 */
export function documentKindFromLegacy(raw: unknown): DocKind {
  if (raw === 'schedule_only') return 'schedule';
  if (raw === 'price_list_only') return 'price_list';
  const parsed = DocKindSchema.safeParse(raw);
  return parsed.success ? parsed.data : 'offer';
}

/** Domyślny tytuł dokumentu (`body.title`) — to, co widać w rejestrze. */
export function defaultTitleForKind(kind: DocKind): string {
  switch (kind) {
    case 'schedule':
      return 'Termin';
    case 'stages':
      return 'Etapy współpracy';
    case 'price_list':
      return 'Cennik dodatkowy';
    default:
      return 'Wycena';
  }
}

/** Czy ten rodzaj dokumentu ma zakładkę „Wycena" (pozycje, sumy, rabaty). */
export function hasQuoteSurface(kind: DocKind): boolean {
  return kind === 'offer';
}

/**
 * Czy dokument tego rodzaju liczy się z pomieszczeń.
 *
 * Termin liczy dni per pomieszczenie dokładnie jak cennik parametryczny —
 * dlatego standalone „Termin" dostaje panel pomieszczeń, a etapy i cennik nie.
 */
export function usesRooms(kind: DocKind): boolean {
  return kind === 'offer' || kind === 'schedule';
}
