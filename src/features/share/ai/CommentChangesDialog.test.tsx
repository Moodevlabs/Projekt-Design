import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommentChanges } from '@/domain/ai';
import { newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';
import type { QuoteComment } from '@/domain/share/schema';
import { pl } from '@/i18n/pl';

const WIZ = '11111111-1111-4111-8111-111111111111';
const NADZOR = '22222222-2222-4222-8222-222222222222';
const SEKCJA = '44444444-4444-4444-8444-444444444444';
const LIB = '66666666-6666-4666-8666-666666666666';

type MutationMock = {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: { data: CommentChanges; usage: { inputTokens: number; outputTokens: number } } | undefined;
  error: unknown;
};

const ai = vi.hoisted((): { value: MutationMock } => ({
  value: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
  },
}));
const createVersion = vi.hoisted(() => vi.fn());
const saveQuote = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastWarning = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useAi', () => ({
  useAiCommentsToChanges: () => ai.value,
  useAiQuota: () => ({ data: { used: 3, limit: 300, resetsAt: '2026-11-01T00:00:00Z' } }),
}));

vi.mock('@/data/queries/useLibrary', () => ({
  useAllLibraryItems: () => ({
    data: [
      {
        id: LIB,
        workspaceId: 'ws-1',
        categoryName: '',
        categoryId: null,
        kind: 'item',
        name: 'Projekt oświetlenia',
        description: '',
        unitPriceCents: 250_00,
        unit: 'lump',
        unitLabel: null,
        minPriceCents: null,
        active: true,
        isSample: false,
        sortOrder: 0,
        pricing: { mode: 'flat' },
        variantOfId: null,
        tags: [],
      },
    ],
  }),
}));

vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryMap: () => new Map(),
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useCreateQuoteVersion: () => ({ mutateAsync: createVersion, isPending: false }),
  useSaveQuote: () => ({ mutateAsync: saveQuote, isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, warning: toastWarning, error: toastError, info: vi.fn() },
}));

const { CommentChangesDialog } = await import('./CommentChangesDialog');

function body(): QuoteBody {
  return newQuoteBody({
    sections: [
      newSection({
        id: SEKCJA,
        title: 'Projekt',
        items: [
          newItem({ id: WIZ, name: 'Wizualizacje łazienki', unitPriceCents: 300_00 }),
          newItem({ id: NADZOR, name: 'Nadzór autorski', unitPriceCents: 100_00 }),
        ],
      }),
    ],
  });
}

const comment: QuoteComment = {
  id: 'c1',
  quoteId: 'q1',
  shareId: 's1',
  authorName: 'Michał',
  message: 'Bez wizualizacji łazienki, dodajcie projekt oświetlenia.',
  createdAt: '2026-08-27T10:00:00Z',
  readAt: null,
};

const proposal: CommentChanges = {
  summary: 'Klient rezygnuje z 3D łazienki i chce projekt oświetlenia.',
  changes: [
    { kind: 'disable', itemId: WIZ, reason: 'klient rezygnuje z 3D' },
    { kind: 'add', libraryItemId: LIB, sectionId: SEKCJA, reason: 'prośba o oświetlenie' },
    { kind: 'remove', itemId: NADZOR, reason: 'nie wspomniany' },
  ],
  unresolved: ['„trochę za drogo”'],
};

function renderDialog(status: 'draft' | 'sent' | 'archived' = 'sent') {
  const onOpenChange = vi.fn();
  render(
    <MemoryRouter>
      <CommentChangesDialog
        comment={comment}
        quote={{ id: 'q1', body: body(), status, version: 1, currency: 'PLN' }}
        open
        onOpenChange={onOpenChange}
      />
    </MemoryRouter>,
  );
  return { onOpenChange };
}

function ready(result: CommentChanges = proposal) {
  ai.value = {
    ...ai.value,
    isSuccess: true,
    data: { data: result, usage: { inputTokens: 10, outputTokens: 5 } },
  };
}

/** Wiersz listy zmian (`<li>`) dla checkboxa o podanym indeksie. */
function rowOf(index: number): HTMLElement {
  return screen.getAllByRole('checkbox')[index]!.closest('li')!;
}

beforeEach(() => {
  vi.clearAllMocks();
  ai.value = {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
  };
  createVersion.mockResolvedValue({ id: 'q2', version: 2, updatedAt: '2026-10-22T10:00:00Z' });
  saveQuote.mockResolvedValue({});
});

describe('CommentChangesDialog', () => {
  it('po otwarciu wysyła uwagę BEZ autora, ze strukturą wyceny i biblioteką', () => {
    renderDialog();

    expect(ai.value.mutate).toHaveBeenCalledTimes(1);
    const payload = ai.value.mutate.mock.calls[0]![0] as {
      comment: string;
      quote: { sections: Array<{ id: string }> };
      library: Array<{ id: string }>;
    };
    expect(payload.comment).toBe(comment.message);
    expect(JSON.stringify(payload)).not.toContain('Michał');
    expect(payload.quote.sections[0]!.id).toBe(SEKCJA);
    expect(payload.library.map((row) => row.id)).toEqual([LIB]);
    expect(screen.getByText(pl.ai.comments.analyzing)).toBeInTheDocument();
  });

  it('pokazuje podsumowanie, zmiany zaznaczone domyślnie, odrzucone wyszarzone i „do omówienia”', () => {
    ready();
    renderDialog();

    expect(screen.getByText(proposal.summary)).toBeInTheDocument();
    expect(screen.getByText('„trochę za drogo”')).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    expect(boxes[0]).toHaveAttribute('aria-checked', 'true');
    expect(boxes[1]).toHaveAttribute('aria-checked', 'true');
    // `remove` pozycji WŁĄCZONEJ — domena ją odrzuca: wiersz zostaje zaznaczony
    // i zaznaczalny, ale wyszarzony z powodem, a licznik go nie liczy.
    expect(boxes[2]).toBeEnabled();
    expect(boxes[2]).toHaveAttribute('aria-checked', 'true');
    expect(rowOf(2)).toHaveAttribute('data-rejected');
    expect(screen.getByText(pl.ai.comments.skipped.enabled_item)).toBeInTheDocument();
    expect(screen.getByText(pl.ai.comments.selected(2, 3))).toBeInTheDocument();
  });

  it('tworzy wersję v2 i zapisuje dokument z nałożonymi TYLKO zaznaczonymi zmianami', async () => {
    ready();
    const { onOpenChange } = renderDialog();

    // Odznaczamy „dodaj projekt oświetlenia" i odrzucone „usuń nadzór" —
    // zostaje samo wyłączenie wizualizacji, bez żadnych pominięć.
    fireEvent.click(screen.getAllByRole('checkbox')[1]!);
    fireEvent.click(screen.getAllByRole('checkbox')[2]!);
    expect(screen.getByText(pl.ai.comments.selected(1, 3))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: pl.ai.comments.createVersion('v2') }));

    await waitFor(() => expect(saveQuote).toHaveBeenCalledTimes(1));
    expect(createVersion).toHaveBeenCalledWith('q1');

    const saved = saveQuote.mock.calls[0]![0] as {
      id: string;
      body: QuoteBody;
      lastSeenUpdatedAt: string;
    };
    expect(saved.id).toBe('q2');
    expect(saved.lastSeenUpdatedAt).toBe('2026-10-22T10:00:00Z');
    const items = saved.body.sections[0]!.items;
    expect(items.map((item) => [item.name, item.enabled])).toEqual([
      ['Wizualizacje łazienki', false],
      ['Nadzór autorski', true],
    ]);
    // Nowa wersja dostaje nowe identyfikatory — jak przy zwykłym duplikacie.
    expect(items[0]!.id).not.toBe(WIZ);

    expect(toastSuccess).toHaveBeenCalledWith(pl.ai.comments.created('v2'));
    expect(toastWarning).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('podgląd i zapis liczą się z ZAZNACZONYCH zmian — odznaczenie „wyłącz” odrzuca zależne „usuń”', async () => {
    // `remove` przechodzi tylko po `disable` tej samej pozycji w tym samym
    // zestawie. Gdyby podgląd liczył się ze wszystkich zmian, a zapis
    // z zaznaczonych, odznaczenie „wyłącz" zostawiłoby „usuń" na zielono,
    // a nowa wersja powstałaby bez usunięcia i z toastem o pełnym sukcesie.
    ready({
      summary: 'Klient rezygnuje z wizualizacji i nadzoru.',
      changes: [
        { kind: 'disable', itemId: WIZ, reason: 'klient rezygnuje z 3D' },
        { kind: 'remove', itemId: WIZ, reason: 'pozycja do usunięcia' },
        { kind: 'disable', itemId: NADZOR, reason: 'klient rezygnuje z nadzoru' },
      ],
      unresolved: [],
    });
    const { onOpenChange } = renderDialog();

    // Z pełnym zaznaczeniem usunięcie przechodzi — nic nie jest odrzucone.
    expect(screen.getByText(pl.ai.comments.selected(3, 3))).toBeInTheDocument();
    expect(screen.queryByText(pl.ai.comments.skipped.enabled_item)).not.toBeInTheDocument();

    // Odznaczamy „wyłącz wizualizacje" — „usuń wizualizacje" od razu odpada
    // z powodem, choć zostaje zaznaczone i zaznaczalne.
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    expect(screen.getAllByRole('checkbox')[1]).toBeEnabled();
    expect(screen.getAllByRole('checkbox')[1]).toHaveAttribute('aria-checked', 'true');
    expect(rowOf(1)).toHaveAttribute('data-rejected');
    expect(screen.getByText(pl.ai.comments.skipped.enabled_item)).toBeInTheDocument();
    expect(screen.getByText(pl.ai.comments.selected(1, 3))).toBeInTheDocument();

    // Ponowne zaznaczenie zależności przywraca usunięcie bez klikania w nie.
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    expect(rowOf(1)).not.toHaveAttribute('data-rejected');
    expect(screen.getByText(pl.ai.comments.selected(3, 3))).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);

    // Zapis NIE jest blokowany: dokument jest dokładnie taki jak w podglądzie
    // (odrzucona zmiana po prostu nie weszła), więc wymuszanie ręcznego
    // odznaczania każdej odrzuconej propozycji modelu (np. ze zmyślonym id)
    // byłoby tylko uciążliwe. Zamiast tego toast mówi wprost, co pominięto.
    fireEvent.click(screen.getByRole('button', { name: pl.ai.comments.createVersion('v2') }));
    await waitFor(() => expect(saveQuote).toHaveBeenCalledTimes(1));

    const saved = saveQuote.mock.calls[0]![0] as { body: QuoteBody };
    expect(saved.body.sections[0]!.items.map((item) => [item.name, item.enabled])).toEqual([
      ['Wizualizacje łazienki', true],
      ['Nadzór autorski', false],
    ]);
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastWarning).toHaveBeenCalledWith(pl.ai.comments.created('v2'), {
      description: pl.ai.comments.appliedWithSkips(1, 1),
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('z wersji archiwalnej nie tworzy nowej — przycisk nieaktywny z podpowiedzią', () => {
    ready();
    renderDialog('archived');

    expect(screen.getByRole('button', { name: pl.ai.comments.createVersion('v2') })).toBeDisabled();
    expect(screen.getByText(pl.ai.comments.cannotVersion)).toBeInTheDocument();
  });

  it('bez zmian mówi to wprost i nie pozwala tworzyć wersji', () => {
    ai.value = {
      ...ai.value,
      isSuccess: true,
      data: {
        data: { summary: 'Za drogo.', changes: [], unresolved: ['za drogo'] },
        usage: { inputTokens: 1, outputTokens: 1 },
      },
    };
    renderDialog();

    expect(screen.getByText(pl.ai.comments.noChanges)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.ai.comments.createVersion('v2') })).toBeDisabled();
  });

  it('błąd asystenta pokazuje notkę z możliwością ponowienia', () => {
    // Kształt `AiError` bez importu klasy — notka czyta tylko `code` i `quota`.
    const error = Object.assign(new Error('Asystent nie odpowiedział.'), {
      code: 'upstream',
      quota: null,
    });
    ai.value = { ...ai.value, isError: true, error };
    renderDialog();

    expect(screen.getByRole('alert')).toHaveTextContent(pl.ai.errors.upstream);
    fireEvent.click(screen.getByRole('button', { name: pl.ai.retry }));
    expect(ai.value.mutate).toHaveBeenCalledTimes(2);
  });
});
