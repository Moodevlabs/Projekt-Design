import type { ShareActionRejection } from '@/domain/share/schema';

/**
 * Komunikaty odmowy — po polsku, w brzmieniu dla inwestora, nie dla programisty.
 *
 * Osobny plik, żeby `DecisionPanel` eksportował wyłącznie komponent: mieszanie
 * stałych z komponentami psuje odświeżanie na gorąco w czasie pracy.
 */
export const REJECTION_TEXT: Record<ShareActionRejection, string> = {
  not_found: 'Ten link już nie działa. Poproś projektanta o nowy.',
  expired: 'Ważność tego linku minęła. Poproś projektanta o nowy.',
  revoked: 'Ten link został wycofany. Poproś projektanta o aktualny.',
  name_required: 'Wpisz imię i nazwisko — to one potwierdzają akceptację.',
  message_required: 'Napisz treść uwagi.',
  already_accepted: 'Ta oferta została już zaakceptowana.',
  already_rejected: 'Ta oferta została już zamknięta.',
  too_many: 'Wysłano już maksymalną liczbę uwag do tej oferty.',
};

/** To samo dla briefu (T-93) — inne słowa, bo to nie oferta. */
export const BRIEF_REJECTION_TEXT: Record<
  'not_found' | 'expired' | 'revoked' | 'message_required',
  string
> = {
  not_found: 'Ten link już nie działa. Poproś projektanta o nowy.',
  expired: 'Ważność tego linku minęła. Poproś projektanta o nowy.',
  revoked: 'Ten link został wycofany. Poproś projektanta o aktualny.',
  message_required: 'Nie udało się odczytać odpowiedzi. Odśwież stronę i spróbuj ponownie.',
};
