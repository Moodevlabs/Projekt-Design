import type { ShareActionRejection } from '@/domain/share/schema';

/**
 * Komunikaty odmowy — w brzmieniu kierowanym do inwestora, nie do programisty.
 *
 * Rejestr formalny (T-97): dokument otwiera klient pracowni projektowej,
 * a nie użytkownik aplikacji. Zwrot grzecznościowy „Państwo" i forma
 * bezosobowa; bez trybu rozkazującego w drugiej osobie liczby pojedynczej.
 *
 * Osobny plik, żeby `DecisionPanel` eksportował wyłącznie komponent: mieszanie
 * stałych z komponentami psuje odświeżanie na gorąco w czasie pracy.
 */
export const REJECTION_TEXT: Record<ShareActionRejection, string> = {
  not_found: 'Link utracił ważność. Prosimy o kontakt z pracownią w celu otrzymania nowego adresu.',
  expired: 'Termin ważności linku upłynął. Prosimy o kontakt z pracownią w celu jego odnowienia.',
  revoked:
    'Link został wycofany. Prosimy o kontakt z pracownią w celu otrzymania aktualnego adresu.',
  name_required: 'Prosimy o podanie imienia i nazwiska — stanowi ono potwierdzenie akceptacji.',
  message_required: 'Prosimy o wprowadzenie treści uwagi.',
  already_accepted: 'Oferta została już zaakceptowana.',
  already_rejected: 'Postępowanie ofertowe zostało już zamknięte.',
  too_many: 'Osiągnięto maksymalną liczbę uwag możliwych do przesłania w ramach tej oferty.',
};

/** To samo dla briefu (T-93) — inne sformułowania, ponieważ nie jest to oferta. */
export const BRIEF_REJECTION_TEXT: Record<
  'not_found' | 'expired' | 'revoked' | 'message_required',
  string
> = {
  not_found: 'Link utracił ważność. Prosimy o kontakt z pracownią w celu otrzymania nowego adresu.',
  expired: 'Termin ważności linku upłynął. Prosimy o kontakt z pracownią w celu jego odnowienia.',
  revoked:
    'Link został wycofany. Prosimy o kontakt z pracownią w celu otrzymania aktualnego adresu.',
  message_required:
    'Odczytanie odpowiedzi nie powiodło się. Prosimy odświeżyć stronę i ponowić próbę.',
};
