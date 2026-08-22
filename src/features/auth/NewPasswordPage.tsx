import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from './AuthLayout';
import { NewPasswordFormSchema, type NewPasswordForm } from './schema';
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
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Ustawienie nowego hasła po powrocie z maila. Wchodzi się tu deep linkiem
 * `anzorge://auth/recovery?code=…`, który najpierw wymienia kod na sesję —
 * więc w tym miejscu użytkownik jest już zalogowany.
 */
export function NewPasswordPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<NewPasswordForm>({
    resolver: zodResolver(NewPasswordFormSchema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  async function onSubmit(values: NewPasswordForm) {
    setFormError(null);
    const { error } = await getSupabase().auth.updateUser({ password: values.password });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    void navigate(routes.dashboard, { replace: true });
  }

  return (
    <AuthLayout title="Nowe hasło" description="Ustaw hasło, którym będziesz się logować.">
      <Form {...form}>
        <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pl.auth.password}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" autoFocus {...field} />
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
                <FormLabel>Powtórz hasło</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
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

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? pl.common.loading : pl.common.save}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
