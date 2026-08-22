import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('bez konfiguracji Supabase tłumaczy, czego brakuje, zamiast pokazywać pusty ekran', async () => {
    // W testach nie ma .env, więc `isConfigured` jest false — to ta sama ścieżka,
    // którą zobaczy ktoś, kto sklonuje repo i odpali `pnpm dev`.
    render(<App />);
    expect(await screen.findByText(/Brak konfiguracji Supabase/)).toBeInTheDocument();
  });
});
