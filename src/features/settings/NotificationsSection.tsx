import { useEffect, useState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpdateWorkspaceSettings, useWorkspace } from '@/data/queries/useWorkspace';
import { useAuth } from '@/features/auth/auth-context';
import { useSendTestNotification } from '@/data/queries/useNotifications';
import {
  NotificationSettingsSchema,
  type NotificationKind,
  type NotificationSettings,
} from '@/domain/notifications/schema';
import { pl } from '@/i18n/pl';

/** Kolejność na ekranie = kolejność zdarzeń w rozmowie z klientem. */
const KINDS: NotificationKind[] = ['viewed', 'accepted', 'rejected', 'comment', 'brief'];

/**
 * Ustawienia → Aplikacja → Powiadomienia e-mail (T-116).
 *
 * ## Po co osobna sekcja, a nie dwa przełączniki w „Wycenach"
 *
 * To jest jedyne miejsce w Toolier, w którym program **sam z siebie wysyła
 * wiadomość**. Człowiek musi mieć gdzie sprawdzić, czy to działa i dokąd
 * trafia — stąd własna karta, jawny adres i przycisk wysyłający wiadomość
 * testową.
 *
 * ## Dlaczego test wysyła prawdziwego maila
 *
 * Bo połowa rzeczy, które psują powiadomienia, jest poza aplikacją:
 * niezweryfikowana domena w Resendzie, literówka w adresie, filtr
 * antyspamowy. „Ustawienia zapisane" nie odpowiada na pytanie „czy dostanę
 * tę wiadomość" — a jedna wysłana wiadomość odpowiada.
 */
export function NotificationsSection({ canWrite }: { canWrite: boolean }) {
  const workspace = useWorkspace();
  const update = useUpdateWorkspaceSettings();
  const test = useSendTestNotification();
  const { session } = useAuth();

  const saved = workspace.data?.settings;
  const savedNotifications = saved?.notifications;

  const [draft, setDraft] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    if (savedNotifications && draft === null) setDraft(savedNotifications);
  }, [savedNotifications, draft]);

  if (!saved || !draft) return null;

  const patch = (fields: Partial<NotificationSettings>) =>
    setDraft((previous) => (previous ? { ...previous, ...fields } : previous));

  const valid = NotificationSettingsSchema.safeParse(draft).success;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedNotifications);

  const save = () => {
    update.mutate(
      { ...saved, notifications: draft },
      {
        onSuccess: () => toast.success(pl.settings.saved),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const sendTest = () => {
    test.mutate(undefined, {
      onSuccess: (address) => toast.success(pl.notifications.testSent(address)),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section className="card-surface space-y-4 p-5">
      <div className="flex items-start gap-2">
        <MailCheck className="text-ink-soft mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="space-y-0.5">
          <h2 className="text-ink text-sm font-semibold">{pl.notifications.title}</h2>
          <p className="text-ink-soft text-xs">{pl.notifications.intro}</p>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="notifications-enabled">{pl.notifications.enabled}</Label>
          <p className="text-ink-soft text-xs">{pl.notifications.enabledHint}</p>
        </div>
        <Switch
          id="notifications-enabled"
          disabled={!canWrite}
          checked={draft.enabled}
          onCheckedChange={(checked) => patch({ enabled: checked })}
        />
      </div>

      {/* Rodzaje zdarzeń zostają widoczne po wyłączeniu głównego przełącznika,
          tylko wyszarzone: znikająca lista kazałaby włączyć całość z powrotem,
          żeby przypomnieć sobie, czego dotyczy. */}
      <div className="space-y-3 border-t border-[var(--hair)] pt-4">
        {KINDS.map((kind) => (
          <div key={kind} className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={`notifications-${kind}`}>{pl.notifications.kinds[kind].label}</Label>
              <p className="text-ink-soft text-xs">{pl.notifications.kinds[kind].hint}</p>
            </div>
            <Switch
              id={`notifications-${kind}`}
              disabled={!canWrite || !draft.enabled}
              checked={draft[kind]}
              onCheckedChange={(checked) => patch({ [kind]: checked })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-[var(--hair)] pt-4">
        <Label htmlFor="notifications-email">{pl.notifications.email}</Label>
        <Input
          id="notifications-email"
          type="email"
          inputMode="email"
          disabled={!canWrite}
          value={draft.email ?? ''}
          placeholder={session?.user.email ?? pl.notifications.emailPlaceholder}
          /* Puste pole zapisujemy jako `null`, czyli „adres konta" — a nie
             jako pusty ciąg, który nie jest adresem i nie przeszedłby
             walidacji przy zapisie. */
          onChange={(event) => patch({ email: event.target.value.trim() || null })}
        />
        <p className="text-ink-soft text-xs">{pl.notifications.emailHint}</p>
        {!valid ? <p className="text-danger text-xs">{pl.notifications.emailInvalid}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--hair)] pt-4">
        <Button
          type="button"
          disabled={!canWrite || !dirty || !valid || update.isPending}
          onClick={save}
        >
          {pl.notifications.save}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={test.isPending || dirty}
          title={dirty ? pl.notifications.saveFirst : undefined}
          onClick={sendTest}
        >
          <Send className="size-3.5" aria-hidden />
          {test.isPending ? pl.notifications.testSending : pl.notifications.test}
        </Button>

        {dirty ? <span className="text-ink-soft text-xs">{pl.settings.unsaved}</span> : null}
      </div>
    </section>
  );
}
