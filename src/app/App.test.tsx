import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mockujemy env, zeby wynik nie zalezal od tego, czy ktos ma lokalny plik .env.
// Bez tego test przechodzil na czystym klonie repo, a padal u kazdego, kto
// skonfigurowal Supabase — czyli dokladnie odwrotnie, niz powinien.
vi.mock('@/lib/env', () => ({
  env: { supabaseUrl: '', supabaseAnonKey: '', stripePublishableKey: '', appEnv: 'local' },
  isConfigured: false,
}));

const { App } = await import('./App');

describe('App', () => {
  it('bez konfiguracji Supabase tlumaczy, czego brakuje, zamiast pokazywac pusty ekran', async () => {
    render(<App />);
    expect(await screen.findByText(/Brak konfiguracji Supabase/)).toBeInTheDocument();
  });
});
