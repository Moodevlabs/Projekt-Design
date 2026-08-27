import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from './AuthLayout';
import { GoogleButton } from './GoogleButton';
import { RegisterFormSchema, type RegisterForm } from './schema';
import { authErrorMessage } from './errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
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

export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: { company: '', fullName: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterForm) {
    setFormError(null);
    // `company` i `full_name` czyta trigger handle_new_user() — z nich powstaje
    // workspace i profil. Nazwy kluczy muszą zgadzać się z migracją 0004.
    const { data, error } = await getSupabase().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { company: values.company, full_name: values.fullName },
      },
    });

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    if (!data.session) {
      // Projekt Supabase wymaga potwierdzenia maila — nie ma sesji do przejęcia.
      setNeedsConfirmation(true);
      return;
    }

    void navigate(routes.dashboard, { replace: true });
  }

  if (needsConfirmation) {
    return (
      <AuthLayout
        title="Sprawdź skrzynkę"
        description="Wysłaliśmy link potwierdzający. Kliknij go, żeby dokończyć rejestrację."
        footer={
          <Link to={routes.login} className="text-ink font-medium underline underline-offset-4">
            {pl.auth.login}
          </Link>
        }
      >
        <p className="text-ink-soft text-sm">
          Po potwierdzeniu wróć tutaj i zaloguj się swoim adresem e-mail.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={pl.auth.register}
      description="14 dni bez opłat, bez karty."
      footer={
        <>
          {pl.auth.hasAccount}{' '}
          <Link to={routes.login} className="text-ink font-medium underline underline-offset-4">
            {pl.auth.login}
          </Link>
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
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pl.auth.company}</FormLabel>
                <FormControl>
                  <Input autoComplete="organization" autoFocus {...field} />
                </FormControl>
                <FormDescription>
                  Nazwa workspace’u. Można ją zmienić w każdej chwili.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pl.auth.fullName}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{pl.auth.email}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
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
                <FormLabel>{pl.auth.password}</FormLabel>
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

          <Button
            type="submit"
            className="w-full"
            disabled={!isConfigured || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? pl.common.loading : pl.auth.register}
          </Button>
        </form>
      </Form>

      <div className="my-5 flex items-center gap-3">
        <span className="bg-hair h-px flex-1" />
        <span className="text-ink-soft text-xs">lub</span>
        <span className="bg-hair h-px flex-1" />
      </div>

      <GoogleButton disabled={!isConfigured} />
    </AuthLayout>
  );
}
