import { z } from 'zod';

/**
 * Powiadomienia e-mail o ruchu klienta (T-116).
 *
 * ## Gdzie to mieszka
 *
 * W `workspaces.settings.notifications`, a nie w osobnej tabeli — to jest
 * pięć przełączników i jeden adres, czyli dokładnie to, po co `settings`
 * istnieje. Kształt czyta **także baza**: `notifications_enabled()` z migracji
 * 0047 pyta o `settings -> 'notifications' ->> 'enabled'` i o klucz o nazwie
 * rodzaju zdarzenia.
 *
 * ⚠️ **Nazwy kluczy są kontraktem z SQL-em.** Zmiana `comment` na `comments`
 * tutaj nie zepsuje typów, tylko po cichu wyłączy sprawdzanie po stronie bazy
 * (brakujący klucz = „włączone"). Pilnuje tego `schema.test.ts`.
 */

/**
 * Rodzaje zdarzeń. Te same nazwy co `ActivityKind` w `activity.repo.ts`
 * i co `check (kind in …)` na `notification_outbox` — jedno zdarzenie ma mieć
 * jedną nazwę w całym produkcie.
 */
export const NOTIFICATION_KINDS = ['viewed', 'accepted', 'rejected', 'comment', 'brief'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * Adres, na który idą powiadomienia. `null` = adres konta.
 *
 * Osobne pole, bo bywa potrzebne: właściciel loguje się prywatnym Gmailem,
 * a pocztę firmową czyta pod `biuro@pracownia.pl`. Pusty ciąg zapisujemy jako
 * `null`, żeby „skasowałem zawartość pola" znaczyło „wróć do adresu konta",
 * a nie „wysyłaj donikąd".
 */
const RecipientSchema = z
  .string()
  .email()
  .nullable()
  .catch(null)
  .default(null);

export const NotificationSettingsSchema = z.object({
  /**
   * Wyłącznik główny. Domyślnie **włączone**, i to jest decyzja, nie
   * przeoczenie: konto sprzed T-116 nie ma w `settings` niczego, na czym
   * dałoby się oprzeć zgodę, a adresatem jest własna skrzynka właściciela.
   * Wyłączenie jest jednym kliknięciem; niedziałająca funkcja, o której nikt
   * nie wie, nie jest.
   */
  enabled: z.boolean().catch(true).default(true),

  /** Pierwsze otwarcie linku przez klienta (kolejne już nie — patrz 0047). */
  viewed: z.boolean().catch(true).default(true),
  accepted: z.boolean().catch(true).default(true),
  rejected: z.boolean().catch(true).default(true),
  /** Uwagi klienta pod ofertą. */
  comment: z.boolean().catch(true).default(true),
  /** Pierwsze odesłanie wypełnionego briefu. */
  brief: z.boolean().catch(true).default(true),

  email: RecipientSchema,
});
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

export function defaultNotificationSettings(): NotificationSettings {
  return NotificationSettingsSchema.parse({});
}

/**
 * Czy zdarzenie tego rodzaju ma wyjść mailem.
 *
 * **Odpowiednik `notifications_enabled()` z migracji 0047** — a nie źródło
 * prawdy: decyzję podejmuje baza, w tej samej transakcji, w której zapisuje
 * zdarzenie. Ta funkcja służy interfejsowi (podpowiedź „nic nie wyśle, bo
 * wyłączone") i testom parzystości z SQL-em.
 */
export function shouldNotify(settings: NotificationSettings, kind: NotificationKind): boolean {
  return settings.enabled && settings[kind];
}
