import { z } from 'zod';

import type { Item, QuoteBody } from '../quote/schema';

/**
 * Link klienta („magic link") i akceptacja online — T-25 / T-26.
 *
 * Ten moduł nie wie nic o Supabase ani o Reakcie. Zna kształt linku, reguły
 * jego ważności i jedną operację, na której stoi cała akceptacja:
 * `applyEnabledIds` — złożenie snapshotu z serwera z wyborem klienta.
 */

/** Powód, dla którego link nie działa. Zgodny z `share_status()` w bazie. */
export const ShareRejectionSchema = z.enum(['not_found', 'expired', 'revoked']);
export type ShareRejection = z.infer<typeof ShareRejectionSchema>;

/** Odmowy specyficzne dla akceptacji i uwag (RPC 2 i 3). */
export const ShareActionRejectionSchema = z.enum([
  'not_found',
  'expired',
  'revoked',
  'name_required',
  'message_required',
  'already_accepted',
  'already_rejected',
  'too_many',
]);
export type ShareActionRejection = z.infer<typeof ShareActionRejectionSchema>;

/** Wiersz `quote_shares` widziany przez projektanta w aplikacji. */
export const ShareSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.string().nullable().default(null),
  revokedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  firstViewedAt: z.string().nullable().default(null),
  lastViewedAt: z.string().nullable().default(null),
  viewCount: z.number().int().nonnegative().default(0),
});
export type Share = z.infer<typeof ShareSchema>;

/** Uwaga zostawiona przez klienta pod ofertą. */
export const QuoteCommentSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  shareId: z.string().uuid().nullable().default(null),
  authorName: z.string().nullable().default(null),
  message: z.string().min(1),
  createdAt: z.string(),
  readAt: z.string().nullable().default(null),
});
export type QuoteComment = z.infer<typeof QuoteCommentSchema>;

/**
 * Co klient odpowiedział (migracja 0033, poprawka 7a).
 *
 * Do 2026-08-27 tabela `quote_acceptances` znała tylko jedną odpowiedź, więc
 * odmowa nie miała gdzie się zapisać — status `rejected` ustawiał ręcznie
 * projektant, czyli system przechowywał jego domysł zamiast decyzji klienta.
 */
export const DecisionSchema = z.enum(['accepted', 'rejected']);
export type Decision = z.infer<typeof DecisionSchema>;

/** Zapis decyzji — dowód, co i w jakim kształcie klient odpowiedział. */
export const AcceptanceSchema = z.object({
  id: z.string().uuid(),
  quoteId: z.string().uuid(),
  shareId: z.string().uuid().nullable().default(null),
  acceptedBody: z.unknown(),
  enabledItemIds: z.array(z.string()).default([]),
  signerName: z.string().nullable().default(null),
  signerIp: z.string().nullable().default(null),
  acceptedAt: z.string(),
  /** `accepted` dla wierszy sprzed 0033 — wtedy innej odpowiedzi nie było. */
  decision: DecisionSchema.catch('accepted').default('accepted'),
  /** Powód odmowy, jeśli klient go podał. `null` przy akceptacji. */
  reason: z.string().nullable().default(null),
});
export type Acceptance = z.infer<typeof AcceptanceSchema>;

/** Brand kit w okrojonej postaci, jaką dostaje strona klienta. */
export const SharedBrandSchema = z.object({
  companyName: z.string().default(''),
  accentColor: z.string().default('#33251E'),
  bgColor: z.string().default('#EFECE8'),
  contacts: z.array(z.record(z.string(), z.unknown())).default([]),
  address: z.string().nullable().default(null),
  footerText: z.string().nullable().default(null),
  logoPath: z.string().nullable().default(null),
});
export type SharedBrand = z.infer<typeof SharedBrandSchema>;

export const SharedQuoteSchema = z.object({
  number: z.string().nullable().default(null),
  title: z.string().default('Wycena'),
  status: z.string().default('sent'),
  currency: z.string().default('PLN'),
  validUntil: z.string().nullable().default(null),
  /**
   * Dokument surowy — **celowo `unknown`, a nie `QuoteBodySchema`.**
   *
   * `QuoteBodySchema` opisuje wyłącznie bieżący `bodyVersion`, a w bazie
   * siedzą też starsze. Walidacja tutaj odrzucałaby ofertę, którą klient ma
   * prawo zobaczyć. Przepuszczenie przez `parseQuoteBody` (migracja → schemat)
   * jest zadaniem odbiorcy i to on decyduje, co zrobić z niepowodzeniem.
   */
  body: z.unknown(),
});
export type SharedQuote = z.infer<typeof SharedQuoteSchema>;

/**
 * Odpowiedź `get_shared_quote`. Rozłączna unia, bo strona klienta ma dwa
 * zupełnie różne widoki: ofertę albo komunikat „ten link już nie działa".
 */
export const SharedQuotePayloadSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    quote: SharedQuoteSchema,
    /**
     * Termin i dokumenty towarzyszące (poprawka 7a, 2026-08-27).
     *
     * `unknown` z tego samego powodu co `body`: to zapisy dokumentów, które
     * mają własne wersje i migracje. Walidacja tutaj odrzucałaby harmonogram,
     * który klient ma prawo zobaczyć.
     *
     * `null` jest normalnym stanem — większość ofert obejdzie się bez terminu.
     */
    schedule: z.unknown().nullable().default(null),
    documents: z.unknown().nullable().default(null),
    brand: SharedBrandSchema,
    share: z.object({ expiresAt: z.string().nullable().default(null) }),
    acceptance: z
      .object({
        signerName: z.string().nullable().default(null),
        acceptedAt: z.string(),
        /** `accepted` dla wpisów sprzed migracji 0033. */
        decision: DecisionSchema.catch('accepted').default('accepted'),
        reason: z.string().nullable().default(null),
      })
      .nullable()
      .default(null),
  }),
  z.object({ ok: z.literal(false), reason: ShareRejectionSchema }),
]);
export type SharedQuotePayload = z.infer<typeof SharedQuotePayloadSchema>;

export const ShareActionResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    acceptedAt: z.string().optional(),
    rejectedAt: z.string().optional(),
  }),
  z.object({ ok: z.literal(false), reason: ShareActionRejectionSchema }),
]);
export type ShareActionResult = z.infer<typeof ShareActionResultSchema>;

/**
 * Ile dni ma żyć link. `null` = bezterminowo.
 *
 * Domyślne 30 dni jest celowe: link bez końca to link, który zostaje w skrzynce
 * klienta na zawsze i po roku pokazuje ceny sprzed podwyżki. Ważność da się
 * zdjąć jednym wyborem, ale trzeba to zrobić świadomie.
 */
export const EXPIRY_PRESETS = [
  { days: 7, label: '7 dni' },
  { days: 14, label: '14 dni' },
  { days: 30, label: '30 dni' },
  { days: 90, label: '90 dni' },
  { days: null, label: 'Bezterminowo' },
] as const;

export const DEFAULT_EXPIRY_DAYS = 30;

/** ISO chwili wygaśnięcia dla liczby dni od `now`. `null` → bezterminowo. */
export function expiryFromDays(days: number | null, now: Date = new Date()): string | null {
  if (days === null) return null;
  const at = new Date(now.getTime());
  at.setDate(at.getDate() + days);
  return at.toISOString();
}

/**
 * Adres, pod którym klient zobaczy ofertę.
 *
 * Bazę bierzemy z konfiguracji (`VITE_SHARE_BASE_URL`), a nie sklejamy tu na
 * sztywno — ten sam token musi działać i na produkcji, i pod `localhost`
 * w czasie pracy nad stroną.
 */
export function buildShareUrl(baseUrl: string, token: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/q/${encodeURIComponent(token)}`;
}

/**
 * Token z adresu `/q/{token}`.
 *
 * Bierzemy ostatni segment ŚCIEŻKI, a nie parametr zapytania: token w `?t=`
 * trafia do nagłówka `Referer` przy żądaniu do obcego hosta i do historii
 * przeglądarki w bardziej narażonej postaci. Zwraca `null`, gdy adres nie ma
 * kształtu `/q/coś` — wtedy strona pokazuje „nie ma takiego linku" zamiast
 * odpytywać bazę pustym tokenem.
 */
export function tokenFromPath(pathname: string): string | null {
  const match = /^\/q\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    // Uszkodzone kodowanie procentowe w adresie — traktujemy jak zły token.
    return null;
  }
}

/** Czy link jest dziś ważny (bez odpytywania bazy — do etykiet na liście). */
export function isShareActive(share: Share, now: Date = new Date()): boolean {
  if (share.revokedAt !== null) return false;
  if (share.expiresAt === null) return true;
  return new Date(share.expiresAt).getTime() > now.getTime();
}

export type ShareState = 'active' | 'revoked' | 'expired';

export function shareState(share: Share, now: Date = new Date()): ShareState {
  if (share.revokedAt !== null) return 'revoked';
  if (share.expiresAt !== null && new Date(share.expiresAt).getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'active';
}

/** Wszystkie id pozycji dokumentu, w kolejności występowania. */
export function collectItemIds(body: QuoteBody): string[] {
  const ids: string[] = [];
  for (const section of body.sections) {
    for (const item of section.items) ids.push(item.id);
    for (const group of section.groups) {
      for (const item of group.items) ids.push(item.id);
    }
  }
  return ids;
}

/** Pozycje włączone w dokumencie — punkt wyjścia dla widoku klienta. */
export function enabledItemIds(body: QuoteBody): string[] {
  const ids: string[] = [];
  for (const section of body.sections) {
    for (const item of section.items) if (item.enabled) ids.push(item.id);
    for (const group of section.groups) {
      for (const item of group.items) if (item.enabled) ids.push(item.id);
    }
  }
  return ids;
}

/**
 * Nakłada wybór klienta na dokument z serwera.
 *
 * **To jest miejsce, w którym akceptacja staje się kwotą.** Klient nigdy nie
 * odsyła dokumentu — odsyła listę id. Snapshot `body` pochodzi z bazy, więc
 * podmiana ceny po stronie przeglądarki nie ma jak wpłynąć na to, co zostało
 * zaakceptowane. Kwotę liczy potem `calcQuoteTotals` z wyniku tej funkcji,
 * czyli tym samym kodem, co w edytorze i w PDF.
 *
 * Rabaty (`body.discounts`) zostają nietknięte: klient przełącza pozycje,
 * a nie warunki handlowe. Rabat warunkowy sam przeliczy się w `calc`.
 */
export function applyEnabledIds(body: QuoteBody, ids: readonly string[]): QuoteBody {
  const wanted = new Set(ids);
  const apply = (item: Item): Item => ({ ...item, enabled: wanted.has(item.id) });

  return {
    ...body,
    sections: body.sections.map((section) => ({
      ...section,
      items: section.items.map(apply),
      groups: section.groups.map((group) => ({
        ...group,
        items: group.items.map(apply),
      })),
    })),
  };
}

/**
 * Co klient zmienił względem tego, co dostał — do pokazania projektantowi
 * („klient wyłączył 3 pozycje"). Zwraca id, nie nazwy: nazwę bierze się
 * z dokumentu, który i tak trzeba mieć pod ręką.
 */
/**
 * To samo, ale NAZWAMI (poprawka 7a, 2026-08-27).
 *
 * „Klient wyłączył 3 pozycje" nie mówi nic, na czym da się oprzeć rozmowę.
 * „Wyłączył: Wizualizacje 3D, Nadzór autorski, Projekt oświetlenia" mówi
 * wszystko — i to jest pierwsza rzecz, o którą projektant pyta, kiedy widzi,
 * że oferta wróciła okrojona.
 *
 * Pozycje bez nazwy pomijamy: pusty myślnik na liście jest gorszy niż jego
 * brak, a nazwana pozycja to jedyna, o której da się cokolwiek powiedzieć.
 */
export function selectionDiffNames(
  original: QuoteBody,
  chosen: readonly string[],
): { turnedOff: string[]; turnedOn: string[] } {
  const diff = selectionDiff(original, chosen);
  const names = new Map<string, string>();

  for (const section of original.sections) {
    for (const item of section.items) names.set(item.id, item.name);
    for (const group of section.groups) {
      for (const item of group.items) names.set(item.id, item.name);
    }
  }

  const resolve = (ids: string[]) =>
    ids.map((id) => names.get(id) ?? '').filter((name) => name.trim().length > 0);

  return { turnedOff: resolve(diff.turnedOff), turnedOn: resolve(diff.turnedOn) };
}

export function selectionDiff(
  original: QuoteBody,
  chosen: readonly string[],
): { turnedOff: string[]; turnedOn: string[] } {
  const before = new Set(enabledItemIds(original));
  const after = new Set(chosen);
  const turnedOff: string[] = [];
  const turnedOn: string[] = [];

  for (const id of collectItemIds(original)) {
    if (before.has(id) && !after.has(id)) turnedOff.push(id);
    if (!before.has(id) && after.has(id)) turnedOn.push(id);
  }

  return { turnedOff, turnedOn };
}
