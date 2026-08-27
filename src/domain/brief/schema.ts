import { z } from 'zod';

/**
 * Brief klienta (T-93, poprawka 9 z 2026-08-27).
 *
 * ## Czym jest, a czym nie
 *
 * To **kwestionariusz przed rozpoczęciem projektu**, nie ankieta
 * satysfakcji i nie formularz kontaktowy. Odpowiedzi na te pytania decydują
 * o tym, co w ogóle da się wycenić: metraż i liczba pomieszczeń dają zakres,
 * budżet daje standard, styl życia daje układ funkcjonalny.
 *
 * ## Skąd ten zestaw pytań
 *
 * Z praktyki zawodu, nie z wyobraźni. Brief projektanta wnętrz stoi na
 * pięciu blokach, zawsze w tej kolejności:
 *
 *  1. **Obiekt** — co projektujemy i w jakim jest stanie.
 *  2. **Ludzie** — kto tu będzie mieszkał i jak żyje. To jest część, którą
 *     najczęściej się skraca i której najbardziej brakuje w połowie projektu.
 *  3. **Zakres i oczekiwania** — co ma być zrobione, co zostaje.
 *  4. **Estetyka** — styl, kolory, inspiracje, rzeczy nie do przyjęcia.
 *  5. **Budżet i termin** — dwie liczby, bez których reszta jest życzeniem.
 *
 * ## Dlaczego zestaw jest DANYMI, nie kodem formularza
 *
 * Szablon zapisuje się razem z odpowiedziami (`client_briefs.template`).
 * Dzięki temu brief sprzed pół roku pokazuje pytania, na które klient
 * naprawdę odpowiadał — a nie dzisiejsze, przestawione i dopisane.
 */

export const BriefFieldKindSchema = z.enum(['text', 'longtext', 'choice', 'multi', 'number']);
export type BriefFieldKind = z.infer<typeof BriefFieldKindSchema>;

export const BriefQuestionSchema = z.object({
  /** Stabilny klucz odpowiedzi. Nigdy nie zmieniamy — to on wiąże pytanie z tekstem. */
  id: z.string().min(1),
  label: z.string().min(1),
  kind: BriefFieldKindSchema.default('text'),
  /** Podpowiedź pod pytaniem: po co pytamy albo jak odpowiedzieć. */
  hint: z.string().default(''),
  placeholder: z.string().default(''),
  /** Opcje dla `choice` i `multi`. */
  options: z.array(z.string()).default([]),
  /**
   * Czy odpowiedź jest wymagana.
   *
   * Świadomie **bardzo mało pytań wymaganych**: brief wypełnia się wieczorem,
   * na telefonie, na raty. Formularz, który nie pozwala zapisać połowy,
   * zostaje niewypełniony w całości.
   */
  required: z.boolean().default(false),
});
export type BriefQuestion = z.infer<typeof BriefQuestionSchema>;

export const BriefSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  hint: z.string().default(''),
  questions: z.array(BriefQuestionSchema).default([]),
});
export type BriefSection = z.infer<typeof BriefSectionSchema>;

export const BriefTemplateSchema = z.array(BriefSectionSchema);
export type BriefTemplate = z.infer<typeof BriefTemplateSchema>;

/** Odpowiedź: tekst albo lista wyborów (`multi`). */
export const BriefAnswerSchema = z.union([z.string(), z.array(z.string())]);
export type BriefAnswer = z.infer<typeof BriefAnswerSchema>;

export const BriefAnswersSchema = z.record(z.string(), BriefAnswerSchema);
export type BriefAnswers = z.infer<typeof BriefAnswersSchema>;

/** Wiersz `client_briefs` widziany przez projektanta. */
export const BriefSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().default(null),
  token: z.string().min(1),
  template: BriefTemplateSchema.default([]),
  answers: BriefAnswersSchema.default({}),
  expiresAt: z.string().nullable().default(null),
  revokedAt: z.string().nullable().default(null),
  submittedAt: z.string().nullable().default(null),
  firstViewedAt: z.string().nullable().default(null),
  lastViewedAt: z.string().nullable().default(null),
  viewCount: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Brief = z.infer<typeof BriefSchema>;

/** Odpowiedź `get_shared_brief` — strona klienta ma dwa widoki, jak przy ofercie. */
export const SharedBriefPayloadSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    brief: z.object({
      template: BriefTemplateSchema.catch([]),
      answers: BriefAnswersSchema.catch({}),
      submittedAt: z.string().nullable().default(null),
    }),
    brand: z.object({
      companyName: z.string().default(''),
      accentColor: z.string().default('#33251E'),
      bgColor: z.string().default('#EFECE8'),
      contacts: z.array(z.record(z.string(), z.unknown())).default([]),
      address: z.string().nullable().default(null),
      footerText: z.string().nullable().default(null),
      logoPath: z.string().nullable().default(null),
    }),
    share: z.object({ expiresAt: z.string().nullable().default(null) }),
  }),
  z.object({ ok: z.literal(false), reason: z.enum(['not_found', 'expired', 'revoked']) }),
]);
export type SharedBriefPayload = z.infer<typeof SharedBriefPayloadSchema>;

export const BriefSubmitResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), submittedAt: z.string().optional() }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(['not_found', 'expired', 'revoked', 'message_required']),
  }),
]);
export type BriefSubmitResult = z.infer<typeof BriefSubmitResultSchema>;

/**
 * ISO chwili wygaśnięcia dla liczby dni od `now`. `null` → bezterminowo.
 *
 * Brief dostaje domyślnie DŁUŻSZY termin niż oferta (60 dni zamiast 30):
 * ofertę czyta się raz i odpowiada, a brief wypełnia się na raty, wieczorami,
 * czasem po rozmowie z drugą połową. Link, który wygasa w tydzień, wraca do
 * nas jako telefon „nie działa mi ten formularz".
 */
export const DEFAULT_BRIEF_EXPIRY_DAYS = 60;

export function expiryOrNull(days: number | null, now: Date = new Date()): string | null {
  if (days === null) return null;
  const at = new Date(now.getTime());
  at.setDate(at.getDate() + days);
  return at.toISOString();
}

/** Token z adresu `/b/{token}`. Ta sama zasada co przy ofercie: ścieżka, nie `?t=`. */
export function briefTokenFromPath(pathname: string): string | null {
  const match = /^\/b\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function buildBriefUrl(baseUrl: string, token: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/b/${encodeURIComponent(token)}`;
}

/**
 * Ile pytań ma odpowiedź — do paska postępu i do listy briefów.
 *
 * Pusty string i pusta lista liczą się jako BRAK odpowiedzi: pole dotknięte
 * i wyczyszczone nie jest odpowiedzią, a licznik, który mówi inaczej, kłamie
 * dokładnie w tę stronę, w którą nie wolno.
 */
export function countAnswered(template: BriefTemplate, answers: BriefAnswers): number {
  let filled = 0;
  for (const section of template) {
    for (const question of section.questions) {
      const value = answers[question.id];
      if (typeof value === 'string' && value.trim().length > 0) filled += 1;
      else if (Array.isArray(value) && value.length > 0) filled += 1;
    }
  }
  return filled;
}

export function countQuestions(template: BriefTemplate): number {
  return template.reduce((sum, section) => sum + section.questions.length, 0);
}
