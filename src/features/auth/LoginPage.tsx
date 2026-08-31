import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from './AuthLayout';
import { LoginFormSchema, type LoginForm } from './schema';
import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/components/shared';
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
import { authErrorMessage } from './errors';

export function LoginPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    setFormError(null);
    const { error } = await getSupabase().auth.signInWithPassword(values);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    void navigate(routes.dashboard, { replace: true });
  }

  return (
    <AuthLayout
      title={pl.auth.login}
      footer={
        <>
          {/* „Nie posiadasz konta?" stoi teraz w karcie, przy przycisku
              (T-119) — powtórzone jeszcze w stopce znaczyłoby dwa wyjścia
              do tego samego miejsca, oddalone o 2 cm. */}
          {/* Strona produktu (2026-08-28): jedyne miejsce w aplikacji, gdzie
              ktoś jeszcze niezalogowany może o niej doczytać. */}
          <p className="text-white/80">
            {pl.app.websiteHint}{' '}
            <ExternalLink
              href={pl.app.websiteUrl}
              className="font-medium text-white underline underline-offset-4"
            >
              {pl.app.websiteLabel}
            </ExternalLink>
          </p>
        </>
      }
    >
      {!isConfigured ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{pl.errors.notConfigured}</AlertDescription>
        </Alert>
      ) : null}

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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>{pl.auth.password}</FormLabel>
                  <Link
                    to={routes.resetPassword}
                    className="text-ink-soft text-xs underline underline-offset-4"
                  >
                    {pl.auth.resetPassword}
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
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
            {form.formState.isSubmitting ? pl.common.loading : pl.auth.login}
          </Button>
        </form>
      </Form>

      {/*
        Druga droga z tego ekranu (T-119, po usunięciu logowania Google).
        Kreska oddziela ją od formularza, bo to nie jest wariant logowania,
        tylko wyjście gdzie indziej — a przycisk `outline` mówi, że akcja
        jest drugorzędna wobec „Zaloguj się" u góry.
      */}
      <div className="bg-hair my-5 h-px" />

      <p className="text-ink-soft mb-3 text-center text-sm">{pl.auth.noAccount}</p>
      <Button asChild variant="outline" className="w-full">
        <Link to={routes.register}>{pl.auth.register}</Link>
      </Button>
    </AuthLayout>
  );
}
