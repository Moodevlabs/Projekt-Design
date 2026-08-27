import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from './AuthLayout';
import { ResetRequestFormSchema, type ResetRequestForm } from './schema';
import { authErrorMessage } from './errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabase } from '@/data/supabase';
import { isConfigured } from '@/lib/env';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Deep link, na który Supabase odsyła z maila „reset hasła". */
export const RECOVERY_CALLBACK_URL = 'toolier://auth/recovery';

export function ResetPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ResetRequestForm>({
    resolver: zodResolver(ResetRequestFormSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ResetRequestForm) {
    setFormError(null);
    const { error } = await getSupabase().auth.resetPasswordForEmail(values.email, {
      redirectTo: RECOVERY_CALLBACK_URL,
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    // Nie zdradzamy, czy konto istnieje — komunikat jest ten sam w obu przypadkach.
    setSent(true);
  }

  return (
    <AuthLayout
      title={pl.auth.resetPassword}
      description={sent ? undefined : 'Wyślemy link do ustawienia nowego hasła.'}
      footer={
        <Link to={routes.login} className="text-ink font-medium underline underline-offset-4">
          {pl.auth.login}
        </Link>
      }
    >
      {sent ? (
        <p className="text-ink-soft text-sm">
          Jeśli konto o tym adresie istnieje, link do zmiany hasła jest już w skrzynce.
        </p>
      ) : (
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.auth.email}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={!isConfigured || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? pl.common.loading : 'Wyślij link'}
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
