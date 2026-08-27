import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ConfirmDialog, PageSection } from '@/components/shared';
import { useAuth } from '@/features/auth/auth-context';
import { NewPasswordFormSchema, type NewPasswordForm } from '@/features/auth/schema';
import { authErrorMessage } from '@/features/auth/errors';
import { getSupabase } from '@/data/supabase';
import { useExportData } from './useExportData';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('settings.account');

/** Wpisanie tego słowa odblokowuje kasowanie konta. */
const DELETE_CONFIRMATION = 'USUŃ';

export function AccountSection() {
  const { session, signOut } = useAuth();
  const { exportData, exporting } = useExportData();

  /*
   * TRZY KARTY, nie jedna (przeprojektowanie 2026-08-27).
   *
   * Wcześniej dostęp, kopia danych i kasowanie konta stały w jednym pudełku,
   * jedno pod drugim. „Zmień hasło" i „usuń konto nieodwracalnie" to nie są
   * czynności tej samej wagi i nie powinny wyglądać tak samo — a kopia
   * danych jest pomiędzy nimi jedynym wyjściem awaryjnym, więc ma być
   * widoczna PRZED strefą nieodwracalną, a nie po.
   */
  return (
    <>
      <PageSection title={pl.settings.access}>
        <p className="text-ink-soft mb-4 text-sm">{session?.user.email}</p>
        <PasswordForm />
      </PageSection>

      <PageSection title={pl.settings.yourData}>
        <p className="text-ink-soft mb-3 text-sm">{pl.settings.exportDataHint}</p>
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          onClick={() => void exportData()}
        >
          <Download className="size-4" aria-hidden />
          {exporting ? pl.settings.exportRunning : pl.settings.exportData}
        </Button>
      </PageSection>

      <PageSection title={pl.settings.dangerZone}>
        <DeleteAccount onDeleted={() => void signOut()} />
      </PageSection>
    </>
  );
}

function PasswordForm() {
  const form = useForm<NewPasswordForm>({
    resolver: zodResolver(NewPasswordFormSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  async function onSubmit(values: NewPasswordForm) {
    const { error } = await getSupabase().auth.updateUser({ password: values.password });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    form.reset({ password: '', passwordConfirm: '' });
    toast.success(pl.settings.passwordChanged);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
        className="border-hair space-y-3 border-t pt-4"
        noValidate
      >
        <Label>{pl.settings.changePassword}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{pl.settings.newPassword}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{pl.settings.repeatPassword}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}>
          <KeyRound className="size-4" aria-hidden />
          {pl.settings.changePassword}
        </Button>
      </form>
    </Form>
  );
}

/**
 * Kasowanie konta.
 *
 * Dwie bariery, nie jedna: trzeba przepisać słowo **i** potwierdzić w dialogu.
 * To jedyna operacja w aplikacji, po której nie ma powrotu — kasuje wyceny,
 * bibliotekę i szablony. Dlatego obok stoi wprost zachęta do eksportu.
 */
function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const armed = confirmation.trim().toUpperCase() === DELETE_CONFIRMATION;

  const usun = async () => {
    setPending(true);
    try {
      const response = await getSupabase().functions.invoke('delete-account', { body: {} });
      if (response.error) throw response.error;
      toast.success(pl.settings.accountDeleted);
      onDeleted();
    } catch (error) {
      log.error('Kasowanie konta nieudane', error);
      toast.error(error instanceof Error ? error.message : pl.settings.deleteAccountFailed);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="deleteConfirmation">{pl.settings.deleteAccount}</Label>
      <p className="text-ink-soft text-xs">{pl.settings.deleteAccountHint}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="deleteConfirmation"
          value={confirmation}
          placeholder={DELETE_CONFIRMATION}
          aria-label={pl.settings.deleteAccountConfirmLabel(DELETE_CONFIRMATION)}
          className="max-w-[160px]"
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button
          type="button"
          variant="destructive"
          disabled={!armed || pending}
          onClick={() => setDialogOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
          {pl.settings.deleteAccount}
        </Button>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        destructive
        title={pl.settings.deleteAccountTitle}
        description={pl.settings.deleteAccountDescription}
        confirmLabel={pl.settings.deleteAccount}
        onConfirm={() => void usun()}
      />
    </div>
  );
}
