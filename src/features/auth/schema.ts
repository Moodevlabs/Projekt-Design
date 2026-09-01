import { z } from 'zod';

const email = z.string().min(1, 'Podaj adres e-mail').email('Nieprawidłowy adres e-mail');
const password = z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków');

export const LoginFormSchema = z.object({
  email,
  password: z.string().min(1, 'Podaj hasło'),
});

export const RegisterFormSchema = z.object({
  company: z.string().min(2, 'Podaj nazwę firmy'),
  /**
   * Imię i nazwisko — **opcjonalne** (2026-09-01, decyzja właściciela).
   *
   * Bez `min()`: pusty napis ma przechodzić. Ograniczamy tylko górę, żeby do
   * profilu nie trafił wpis o długości akapitu. Puste pole nie leci do bazy
   * jako `''`, tylko jako brak wartości — patrz `onSubmit` w `RegisterPage`.
   */
  fullName: z.string().trim().max(120, 'Imię i nazwisko jest za długie'),
  email,
  password,
  /**
   * Akceptacja regulaminu i polityki prywatności (T-124).
   *
   * `boolean().refine(...)`, a NIE `literal(true)` — choć literał wygląda tu
   * naturalniej. Literał zawęża typ wyjściowy do `true`, a formularz startuje
   * z `terms: false`; react-hook-form wymaga zgodności typu wejściowego
   * z wyjściowym i taka para się nie skompiluje. `refine` daje dokładnie to
   * samo zachowanie (odznaczone = błąd z własnym komunikatem) przy typie
   * `boolean` po obu stronach.
   *
   * Checkbox startuje PUSTY: zgoda musi być czynnością wyraźną (art. 4 pkt 11
   * RODO), więc domyślne zaznaczenie nie byłoby zgodą, tylko jej pozorem.
   */
  terms: z
    .boolean()
    .refine((accepted) => accepted, 'Akceptacja regulaminu jest wymagana do założenia konta'),
});

export const ResetRequestFormSchema = z.object({ email });

export const NewPasswordFormSchema = z
  .object({
    password,
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: 'Hasła nie są takie same',
    path: ['passwordConfirm'],
  });

export type LoginForm = z.infer<typeof LoginFormSchema>;
export type RegisterForm = z.infer<typeof RegisterFormSchema>;
export type ResetRequestForm = z.infer<typeof ResetRequestFormSchema>;
export type NewPasswordForm = z.infer<typeof NewPasswordFormSchema>;
