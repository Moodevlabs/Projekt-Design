import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthGate } from './AuthGate';
import { AuthStub } from './test-utils';
import type { AuthStatus } from './auth-context';

function renderGate(status: AuthStatus) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthStub status={status} session={status === 'authenticated' ? undefined : null}>
        <Routes>
          <Route element={<AuthGate />}>
            <Route path="/" element={<p>Zawartość aplikacji</p>} />
          </Route>
          <Route path="/logowanie" element={<p>Ekran logowania</p>} />
        </Routes>
      </AuthStub>
    </MemoryRouter>,
  );
}

describe('AuthGate', () => {
  it('nie pokazuje logowania, dopóki nie wiemy, czy jest sesja', () => {
    renderGate('loading');
    // Migające logowanie przy każdym starcie to najczęstszy błąd w tym miejscu.
    expect(screen.queryByText('Ekran logowania')).not.toBeInTheDocument();
    expect(screen.queryByText('Zawartość aplikacji')).not.toBeInTheDocument();
  });

  it('przekierowuje niezalogowanego na logowanie', () => {
    renderGate('anonymous');
    expect(screen.getByText('Ekran logowania')).toBeInTheDocument();
  });

  it('wpuszcza zalogowanego', () => {
    renderGate('authenticated');
    expect(screen.getByText('Zawartość aplikacji')).toBeInTheDocument();
  });

  it('tłumaczy brak konfiguracji zamiast wysyłać na logowanie', () => {
    renderGate('unconfigured');
    expect(screen.getByText(/Brak konfiguracji Supabase/)).toBeInTheDocument();
    expect(screen.queryByText('Ekran logowania')).not.toBeInTheDocument();
  });
});
