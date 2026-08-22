import { z } from 'zod';

const email = z.string().min(1, 'Podaj adres e-mail').email('Nieprawidłowy adres e-mail');
const password = z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków');

export const LoginFormSchema = z.object({
  email,
  password: z.string().min(1, 'Podaj hasło'),
});

export const RegisterFormSchema = z.object({
  company: z.string().min(2, 'Podaj nazwę firmy'),
  fullName: z.string().min(2, 'Podaj imię i nazwisko'),
  email,
  password,
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
