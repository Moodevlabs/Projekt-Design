import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiError } from '@/data/repos/ai.repo';
import { pl } from '@/i18n/pl';

type PolishData = { data: { text: string; placeholdersKept: boolean }; usage: object };
type PolishMock = {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
  data: PolishData | undefined;
  error: AiError | null;
  reset: ReturnType<typeof vi.fn>;
};

// Atrapa zamiast QueryClientProvider: komponent czyta stan z hooka, więc
// test podstawia odpowiedź w chwili wywołania `mutate` i patrzy na rerender.
const polish = vi.hoisted((): { value: PolishMock } => ({
  value: { mutate: vi.fn(), isPending: false, data: undefined, error: null, reset: vi.fn() },
}));

vi.mock('@/data/queries/useAi', () => ({
  useAiPolishText: () => polish.value,
}));

const { AiPolishButton } = await import('./AiPolishButton');

const ORYGINAL = 'Widoki ścian dla: {rooms}.';
const CONTEXT = { companyName: 'Studio Wnętrz', rooms: ['kuchnia', 'salon ×2'] };

function respondWith(text: string) {
  polish.value.mutate.mockImplementation(() => {
    polish.value.data = { data: { text, placeholdersKept: true }, usage: {} };
  });
}

async function otworz(onApply = vi.fn()) {
  const user = userEvent.setup();
  render(<AiPolishButton field="intro" text={ORYGINAL} context={CONTEXT} onApply={onApply} />);
  await user.click(screen.getByRole('button', { name: pl.ai.text.action }));
  return { user, onApply };
}

beforeEach(() => {
  polish.value = {
    mutate: vi.fn(),
    isPending: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
  };
});

describe('AiPolishButton', () => {
  it('wysyła pole z kontekstem, pokazuje „było / będzie” i oddaje tekst przez onApply', async () => {
    const PROPOZYCJA = 'Przygotujemy widoki ścian dla: {rooms}, w skali 1:50.';
    respondWith(PROPOZYCJA);

    const { user, onApply } = await otworz();

    expect(polish.value.mutate).toHaveBeenCalledWith({
      field: 'intro',
      text: ORYGINAL,
      context: CONTEXT,
    });
    expect(await screen.findByText(pl.ai.text.before)).toBeInTheDocument();
    expect(screen.getByText(ORYGINAL)).toBeInTheDocument();
    expect(screen.getByText(pl.ai.text.after)).toBeInTheDocument();
    expect(screen.getByText(PROPOZYCJA)).toBeInTheDocument();
    expect(screen.getByText(pl.ai.badge)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.ai.text.apply }));

    expect(onApply).toHaveBeenCalledWith(PROPOZYCJA);
    // Zamknięcie zapomina odpowiedź — następne otwarcie woła model na nowo.
    expect(polish.value.reset).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: pl.ai.text.apply })).not.toBeInTheDocument();
  });

  it('odrzuca propozycję, która zgubiła placeholder {rooms}', async () => {
    respondWith('Przygotujemy widoki ścian dla wszystkich pomieszczeń.');

    const { onApply } = await otworz();

    expect(await screen.findByText(pl.ai.text.lostPlaceholders('{rooms}'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pl.ai.text.apply })).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('przycina propozycję do limitu POLA i mówi o tym w podglądzie', async () => {
    // Model pisze 50 znaków, pole mieści 20: `onApply` dostaje dokładnie to,
    // co widać w podglądzie — nie pełny tekst, który pole i tak by ucięło.
    const PROPOZYCJA = 'Pomiar lokalu z inwentaryzacją i dokumentacją.....';
    expect(PROPOZYCJA).toHaveLength(50);
    respondWith(PROPOZYCJA);
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(
      <AiPolishButton
        field="itemDescription"
        text="Pomiar lokalu."
        context={{ companyName: 'Studio', itemName: 'Pomiar' }}
        maxLength={20}
        onApply={onApply}
      />,
    );
    await user.click(screen.getByRole('button', { name: pl.ai.text.action }));

    expect(await screen.findByText(pl.ai.text.truncated(20))).toBeInTheDocument();
    expect(screen.getByText(PROPOZYCJA.slice(0, 20))).toBeInTheDocument();
    expect(screen.queryByText(PROPOZYCJA)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.ai.text.apply }));
    expect(onApply).toHaveBeenCalledWith(PROPOZYCJA.slice(0, 20));
    expect(onApply.mock.calls[0]![0]).toHaveLength(20);
  });

  it('nie wspomina o skróceniu, gdy propozycja mieści się w limicie', async () => {
    respondWith('Przygotujemy widoki ścian dla: {rooms}.');
    await otworz();

    expect(await screen.findByText(pl.ai.text.after)).toBeInTheDocument();
    expect(screen.queryByText(pl.ai.text.truncated(1200))).not.toBeInTheDocument();
  });

  it('pokazuje błąd limitu z datą odnowienia', async () => {
    polish.value.mutate.mockImplementation(() => {
      polish.value.error = new AiError('limit', 'limit_reached', {
        used: 300,
        limit: 300,
        resetsAt: '2026-11-01T00:00:00.000Z',
      });
    });

    await otworz();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('300');
    expect(screen.queryByRole('button', { name: pl.ai.text.apply })).not.toBeInTheDocument();
  });

  it('jest wyłączony w trybie tylko do odczytu', () => {
    render(
      <AiPolishButton
        field="itemDescription"
        text=""
        context={{ companyName: 'Studio', itemName: 'Pomiar' }}
        onApply={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: pl.ai.text.action })).toBeDisabled();
  });
});
