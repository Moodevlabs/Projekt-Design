import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthStub } from '@/features/auth/test-utils';
import { Sidebar } from './Sidebar';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthStub>
        <TooltipProvider>
          <Sidebar />
        </TooltipProvider>
      </AuthStub>
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  it('zaznacza aktywną pozycję czarnym kółkiem', () => {
    renderAt('/wyceny');
    const active = screen.getByRole('link', { name: 'Wyceny' });
    // Regresja: `TooltipTrigger asChild` scala className jako string —
    // funkcyjny className NavLinka wyciekłby do DOM zamiast klas.
    expect(active.className).toContain('bg-primary');
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).not.toContain('isActive');
  });

  it('nie zaznacza pulpitu, gdy jesteśmy na podstronie', () => {
    renderAt('/wyceny');
    expect(screen.getByRole('link', { name: 'Pulpit' })).not.toHaveAttribute('aria-current');
  });

  it('zaznacza wyceny także na widoku edytora', () => {
    renderAt('/wyceny/abc');
    expect(screen.getByRole('link', { name: 'Wyceny' })).toHaveAttribute('aria-current', 'page');
  });

  it('oznacza pozycje z fazy 2 jako niedostępne', () => {
    renderAt('/');
    const clients = screen.getByRole('link', { name: /Klienci/ });
    expect(clients).toHaveAttribute('aria-disabled', 'true');
  });
});
