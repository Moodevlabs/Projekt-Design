import { z } from 'zod';

import { StageProgressSchema } from './stages';
import type { Client } from '../client/schema';

/**
 * Projekt — teczka jednej inwestycji (koncepcja §2, decyzja D1).
 *
 * Byt **lekki**: nazwa, adres, metraż, typ, status, notatki. Nie jest
 * harmonogramem ani systemem zarządzania pracą — status ustawia człowiek
 * i nie wyliczamy go z wycen (reguła 3). Pomieszczeń projekt nie ma: liczy je
 * cennik w `body.rooms` wyceny (§9.2).
 */

export const ProjectStatusSchema = z.enum(['lead', 'offer', 'in_progress', 'done', 'canceled']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/** Kolejność statusów na pigułkach filtra i w select — od pierwszego kontaktu do końca. */
export const PROJECT_STATUSES = ProjectStatusSchema.options;

/**
 * Typ inwestycji.
 *
 * W bazie to zwykły `text`, więc własna wartość przejdzie — UI podaje cztery,
 * bo słownik z jednym wpisem na klienta byłby gorszy niż jego brak. `''`
 * znaczy „nie określono" i jest normalnym stanem.
 */
export const ProjectKindSchema = z.enum(['apartment', 'house', 'commercial', 'other']);
export type ProjectKind = z.infer<typeof ProjectKindSchema>;
export const PROJECT_KINDS = ProjectKindSchema.options;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().default(''),
  city: z.string().default(''),
  /** Metraż w m². `null` = nie podano — to nie to samo co 0 m². */
  areaM2: z.number().nullable().default(null),
  kind: z.string().default(''),
  status: ProjectStatusSchema.default('lead'),
  /** Data startu (ISO `YYYY-MM-DD`). `null` = jeszcze nie ustalono. */
  startDate: z.string().nullable().default(null),
  notes: z.string().default(''),
  sortOrder: z.number().int().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Postep realizacji etapow (T-68). Etapy zyja w harmonogramie wyceny. */
  stageProgress: StageProgressSchema.default({}),
});
export type Project = z.infer<typeof ProjectSchema>;

/** Projekt z sumami liczonymi w bazie (widok `projects_overview`). */
export const ProjectOverviewSchema = ProjectSchema.extend({
  clientName: z.string(),
  quotesCount: z.number().int().nonnegative().default(0),
  acceptedNetCents: z.number().int().nonnegative().default(0),
  lastActivityAt: z.string(),
});
export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>;

/**
 * Dane z formularza.
 *
 * Metraż jest stringiem, bo tym jest zawartość `<input>` — pusty znaczy
 * „nie podano" i ma trafić do bazy jako `null`, a nie jako zero. Konwersja
 * siedzi w `parseArea`, żeby nie powtarzać jej w każdym miejscu zapisu.
 */
export const ProjectDraftSchema = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę projektu'),
  address: z.string().trim(),
  city: z.string().trim(),
  areaM2: z
    .string()
    .trim()
    .refine((value) => value === '' || parseArea(value) !== null, {
      message: 'Metraż musi być liczbą',
    }),
  kind: z.string(),
  status: ProjectStatusSchema,
  startDate: z.string(),
  notes: z.string(),
});
export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;

/**
 * Metraż z pola tekstowego. Przyjmuje przecinek i spacje („164,5", „164.5"),
 * bo tak ludzie piszą metry — odrzucenie „164,5" byłoby czepianiem się
 * o znak dziesiętny.
 */
export function parseArea(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // Baza trzyma `numeric(8,1)` — zaokrąglamy tu, żeby to, co widać po zapisie,
  // zgadzało się z tym, co wpisano.
  return Math.round(parsed * 10) / 10;
}

/** Metraż do pola formularza. `null` → puste, nie „0". */
export function formatArea(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/**
 * Pusty formularz z adresem podpowiedzianym z kartoteki klienta.
 *
 * Adres inwestycji **najczęściej** jest adresem klienta, ale nie zawsze —
 * dlatego podpowiedź, a nie kopia na sztywno. Człowiek nadpisze jednym
 * kliknięciem, a nie musi przepisywać ulicy z sąsiedniej zakładki.
 */
export function emptyProjectDraft(client?: Pick<Client, 'address' | 'city'>): ProjectDraft {
  return {
    name: '',
    address: client?.address ?? '',
    city: client?.city ?? '',
    areaM2: '',
    kind: '',
    status: 'lead',
    startDate: '',
    notes: '',
  };
}

/** Formularz wypełniony istniejącym projektem. */
export function projectToDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    address: project.address,
    city: project.city,
    areaM2: formatArea(project.areaM2),
    kind: project.kind,
    status: project.status,
    startDate: project.startDate ?? '',
    notes: project.notes,
  };
}

/**
 * Czy akceptacja wyceny powinna zaproponować przestawienie projektu.
 *
 * **Propozycja, nie automat** (koncepcja §2 reguła 3): status projektu należy
 * do człowieka. Nie ma sensu proponować przejścia z `in_progress`, `done`
 * ani `canceled` — pierwsze już tam jest, a dwa ostatnie byłyby cofnięciem
 * decyzji, której nie podejmowaliśmy.
 */
export function suggestsInProgress(status: ProjectStatus): boolean {
  return status === 'lead' || status === 'offer';
}
