import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';
import { pl } from '@/i18n/pl';

function Wybuchowy({ boom }: { boom: boolean }) {
  if (boom) throw new Error('Coś pękło w środku');
  return <p>Zawartość aplikacji</p>;
}

beforeEach(() => {
  // React loguje zlapany blad do konsoli — w tescie to tylko szum.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppErrorBoundary', () => {
  it('przepuszcza aplikację, dopóki nic nie wybuchło', () => {
    render(
      <AppErrorBoundary>
        <Wybuchowy boom={false} />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Zawartość aplikacji')).toBeInTheDocument();
  });

  it('zamiast białego ekranu pokazuje komunikat', () => {
    /*
     * Bez granicy wyjatek w renderze daje pusta strone: uzytkownik nie wie,
     * czy aplikacja zamarla, czy zniknely jego dane. Dokladnie tak wygladal
     * blad podwojnego montowania edytora.
     */
    render(
      <AppErrorBoundary>
        <Wybuchowy boom />
      </AppErrorBoundary>,
    );

    expect(screen.getByText(pl.errors.crashTitle)).toBeInTheDocument();
    expect(screen.queryByText('Zawartość aplikacji')).not.toBeInTheDocument();
  });

  it('mówi WPROST, że dane są bezpieczne', () => {
    // To jest pierwsze pytanie uzytkownika, ktory zobaczyl blad.
    render(
      <AppErrorBoundary>
        <Wybuchowy boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByText(pl.errors.crashLead)).toBeInTheDocument();
  });

  it('pokazuje treść błędu do skopiowania w zgłoszeniu', () => {
    render(
      <AppErrorBoundary>
        <Wybuchowy boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Coś pękło w środku')).toBeInTheDocument();
  });

  it('„Spróbuj dalej" wraca do aplikacji, gdy przyczyna minęła', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AppErrorBoundary>
        <Wybuchowy boom />
      </AppErrorBoundary>,
    );

    rerender(
      <AppErrorBoundary>
        <Wybuchowy boom={false} />
      </AppErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: pl.errors.crashBack }));

    expect(screen.getByText('Zawartość aplikacji')).toBeInTheDocument();
  });
});
