import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pl } from '@/i18n/pl';

const mutate = vi.hoisted(() => vi.fn());
const useSetQuoteRegisterFields = vi.hoisted(() => vi.fn(() => ({ mutate, isPending: false })));

vi.mock('@/data/queries/useQuotes', () => ({ useSetQuoteRegisterFields }));

const { QuoteNotesPopover } = await import('./QuoteNotesPopover');

function pokaz(notes: string | null = null) {
  render(<QuoteNotesPopover quoteId="q1" title="Remont kuchni" notes={notes} docKind="offer" />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('QuoteNotesPopover — zapis notatki', () => {
  it('zapisuje po opuszczeniu pola, a NIE przy każdym znaku', async () => {
    /*
     * To jest lista, nie edytor: mutacja na litere zalalaby baze zapisami
     * i migala optymistycznymi aktualizacjami calego wiersza.
     */
    const user = userEvent.setup();
    pokaz();

    await user.click(screen.getByLabelText(pl.quotes.notesFor('Remont kuchni')));
    const pole = screen.getByLabelText(pl.quotes.notesFor('Remont kuchni'), {
      selector: 'textarea',
    });
    await user.type(pole, 'dzwonić po 16');

    expect(mutate).not.toHaveBeenCalled();

    await user.tab();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ id: 'q1', internalNotes: 'dzwonić po 16' });
  });

  it('nie zapisuje, gdy nic się nie zmieniło', async () => {
    const user = userEvent.setup();
    pokaz('stara notatka');

    await user.click(screen.getByLabelText(pl.quotes.notesFor('Remont kuchni')));
    await user.tab();

    expect(mutate).not.toHaveBeenCalled();
  });

  it('mówi wprost, że notatka nie idzie do PDF', async () => {
    const user = userEvent.setup();
    pokaz();
    await user.click(screen.getByLabelText(pl.quotes.notesFor('Remont kuchni')));

    expect(screen.getByText(pl.quotes.notesHint)).toBeInTheDocument();
  });
});

describe('QuoteNotesPopover — widoczność notatki na liście', () => {
  it('wiersz z notatką wygląda inaczej niż bez', () => {
    // Bez tego rejestr wyglada identycznie z notatkami i bez nich.
    const { unmount } = render(
      <QuoteNotesPopover quoteId="q1" title="A" notes="jest" docKind="offer" />,
    );
    const zNotatka = screen.getByLabelText(pl.quotes.notesFor('A')).getAttribute('title');
    unmount();

    render(<QuoteNotesPopover quoteId="q1" title="A" notes={null} docKind="offer" />);
    const bezNotatki = screen.getByLabelText(pl.quotes.notesFor('A')).getAttribute('title');

    expect(zNotatka).toBe(pl.quotes.hasNotes);
    expect(bezNotatki).not.toBe(zNotatka);
  });

  it('sama biała spacja to nie notatka', () => {
    render(<QuoteNotesPopover quoteId="q1" title="A" notes="   " docKind="offer" />);
    expect(screen.getByLabelText(pl.quotes.notesFor('A'))).toHaveAttribute(
      'title',
      pl.quotes.notes,
    );
  });
});

describe('QuoteNotesPopover — rodzaj dokumentu', () => {
  it('zmiana rodzaju zapisuje się od razu', async () => {
    const user = userEvent.setup();
    pokaz();

    await user.click(screen.getByLabelText(pl.quotes.notesFor('Remont kuchni')));
    await user.click(screen.getByLabelText(pl.quotes.docKindLabel));
    await user.click(screen.getByRole('option', { name: pl.quotes.docKind.schedule_only }));

    expect(mutate).toHaveBeenCalledWith({ id: 'q1', docKind: 'schedule_only' });
  });
});
