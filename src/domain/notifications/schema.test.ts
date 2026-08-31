import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  defaultNotificationSettings,
  NOTIFICATION_KINDS,
  NotificationSettingsSchema,
  shouldNotify,
} from './schema';
import { defaultWorkspaceSettings, WorkspaceSettingsSchema } from '../brand/schema';

const MIGRATION = resolve(
  import.meta.dirname,
  '../../../supabase/migrations/0047_notifications.sql',
);
const EDGE_EMAIL = resolve(
  import.meta.dirname,
  '../../../supabase/functions/_shared/notification-email.ts',
);

describe('ustawienia powiadomień', () => {
  it('domyślnie wszystko włączone, adres z konta', () => {
    const settings = defaultNotificationSettings();
    expect(settings.enabled).toBe(true);
    for (const kind of NOTIFICATION_KINDS) expect(settings[kind]).toBe(true);
    expect(settings.email).toBeNull();
  });

  /*
   * Konto sprzed T-116 nie ma klucza `notifications` w `settings`. Musi go
   * dostać z domyślnych — inaczej ekran ustawień nie miałby czego pokazać,
   * a `shouldNotify` odpowiadałby o `undefined`.
   */
  it('workspace sprzed T-116 dostaje komplet domyślnych', () => {
    const settings = WorkspaceSettingsSchema.parse({ currency: 'PLN' });
    expect(settings.notifications).toEqual(defaultNotificationSettings());
    expect(defaultWorkspaceSettings().notifications.enabled).toBe(true);
  });

  it('adres spoza formatu wraca do „adresu konta" zamiast wywracać ustawienia', () => {
    const settings = NotificationSettingsSchema.parse({ email: 'to-nie-jest-adres' });
    expect(settings.email).toBeNull();
  });

  it('wyłącznik główny wygrywa z pojedynczym rodzajem', () => {
    const settings = NotificationSettingsSchema.parse({ enabled: false, accepted: true });
    expect(shouldNotify(settings, 'accepted')).toBe(false);
  });

  it('pojedynczy rodzaj da się wyłączyć osobno', () => {
    const settings = NotificationSettingsSchema.parse({ viewed: false });
    expect(shouldNotify(settings, 'viewed')).toBe(false);
    expect(shouldNotify(settings, 'accepted')).toBe(true);
  });
});

/**
 * Parytet z SQL-em i z funkcją brzegową.
 *
 * Nazwy rodzajów są kontraktem trzech miejsc naraz: `check (kind in …)`
 * na `notification_outbox`, klucze w `settings.notifications` (czyta je
 * `notifications_enabled()`) i `switch` w szablonie maila. Rozjazd jest cichy:
 * baza wpuści zdarzenie, aplikacja nie da go wyłączyć, a mail wyjdzie z
 * tematem „Powiadomienie z Toolier".
 */
describe('parytet rodzajów zdarzeń', () => {
  const sql = readFileSync(MIGRATION, 'utf8');
  const email = readFileSync(EDGE_EMAIL, 'utf8');

  it('migracja dopuszcza dokładnie te rodzaje, które zna domena', () => {
    const match = /check \(kind in \(([^)]*)\)\)/.exec(sql);
    expect(match).not.toBeNull();

    const fromSql = [...(match?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((hit) => hit[1]);
    expect(fromSql.sort()).toEqual([...NOTIFICATION_KINDS].sort());
  });

  it('każdy rodzaj ma swoją treść maila', () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(email).toContain(`case '${kind}'`);
    }
  });

  it('RPC strony klienta kolejkują każdy rodzaj', () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(sql).toContain(`'${kind}',`);
    }
  });
});
