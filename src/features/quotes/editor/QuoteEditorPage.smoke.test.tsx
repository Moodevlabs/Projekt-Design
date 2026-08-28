import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import { defaultWorkspaceSettings } from '@/domain/brand/schema';
import type { Quote } from '@/data/repos/quotes.repo';

/**
 * Test dymny edytora: **czy strona w ogóle się otwiera**.
 *
 * Powstał po zgłoszeniu „biały ekran przy wejściu do wyceny". Reszta testów
 * sprawdza pojedyncze zachowania na wyizolowanych komponentach, więc żaden
 * z nich nie łapał błędu w samym złożeniu strony.
 */

const useQuote = vi.hoisted(() => vi.fn());
const useWorkspace = vi.hoisted(() => vi.fn());
const createMutateAsync = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useQuotes', () => ({
  useQuote,
  useCreateQuote: () => ({
    mutate: vi.fn(),
    mutateAsync: createMutateAsync,
    isError: false,
    error: null,
    isPending: false,
  }),
  useSaveQuote: () => ({ mutateAsync: vi.fn() }),
  useSetQuoteStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateQuoteVersion: () => ({ mutate: vi.fn(), isPending: false }),
  useAcceptReplacing: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace,
  useWorkspaceId: () => 'ws-1',
  requireWorkspaceId: (id?: string) => id ?? 'ws-1',
}));

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems: () => ({ data: [] }),
  useAllLibraryItems: () => ({ data: [] }),
  useLibraryGroups: () => ({ data: [] }),
  useSaveItemsToLibrary: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateLibraryGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateLibraryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLibraryItem: () => ({ mutate: vi.fn(), isPending: false }),
  useLibraryCategories: () => ({ data: [], isLoading: false }),
}));

// Panel „Dodaj usługi" (T-71) koloruje pigułki grup ze słownika.
vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList: () => ({ data: [] }),
}));

// Biblioteka dokumentow (T-103): panel „Dodaj z biblioteki" i zapis wiersza
// pytaja o wpisy — test komponentu izoluje sie od TanStack Query.
vi.mock('@/data/queries/useLibraryDocs', () => ({
  useDocLibrary: () => ({ data: [], isLoading: false, isError: false }),
  useDocLibraryEntries: () => ({ entries: [], data: [], isLoading: false, isError: false }),
  useCreateDocLibraryEntry: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes: () => ({ data: [] }),
}));

// Karta „Klient" w prawej kolumnie (T-53) pyta o kartotekę — bez tego mocka
// test dymny ciągnąłby tu TanStack Query i Supabase.
vi.mock('@/data/queries/useClients', () => ({
  useClients: () => ({ data: [] }),
  useClient: () => ({ data: null }),
  useCreateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Karta „Dokumenty" w prawej kolumnie (T-56) pyta o archiwum klienta.
vi.mock('@/data/queries/useFiles', () => ({
  useFiles: () => ({ data: [], isLoading: false, isError: false }),
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 1 }, isLoading: false }),
  useUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRenameFile: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFile: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/data/queries/useTemplates', () => ({
  useTemplates: () => ({ data: [] }),
  useCreateTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useOverwriteTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Karta „co wrocilo od klienta" (T-26) stoi teraz w prawej kolumnie edytora
// i pyta o akceptacje oraz uwagi. Test dymny izoluje strone od warstwy danych.
vi.mock('@/data/queries/useShares', () => ({
  useQuoteAcceptance: () => ({ data: null }),
  useQuoteComments: () => ({ data: [] }),
  useMarkCommentRead: () => ({ mutate: vi.fn() }),
  // Od poprawki 7a os „Na czym stoimy" pyta tez o linki.
  useShares: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/data/queries/useBrandKit', () => ({
  useBrandKit: () => ({ data: null }),
}));

vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: true, reason: 'active', loading: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { QuoteEditorPage } = await import('./QuoteEditorPage');

function quote(): Quote {
  return {
    id: 'q1',
    workspaceId: 'ws-1',
    number: 'WYC/2026/08/0001',
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    body: newQuoteBody({
      title: 'Wycena testowa',
      sections: [newSection({ title: 'Sekcja', items: [newItem({ name: 'Pozycja' })] })],
    }),
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/wyceny/q1']}>
      <TooltipProvider>
        <Routes>
          <Route path="/wyceny/:id" element={<QuoteEditorPage />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspace.mockReturnValue({
    data: {
      id: 'ws-1',
      name: 'Studio',
      ownerId: 'u1',
      settings: defaultWorkspaceSettings(),
      quoteSeq: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    isPending: false,
    isError: false,
  });
  useQuote.mockReturnValue({
    data: quote(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
});

function renderEditorStrict() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/wyceny/q1']}>
        <TooltipProvider>
          <Routes>
            <Route path="/wyceny/:id" element={<QuoteEditorPage />} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

function renderNewQuoteStrict() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/wyceny/nowa']}>
        <TooltipProvider>
          <Routes>
            <Route path="/wyceny/nowa" element={<QuoteEditorPage />} />
            <Route path="/wyceny/:id" element={<p>Edytor wyceny</p>} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('Nowa wycena w StrictMode', () => {
  it('zaklada dokument DOKLADNIE RAZ i przechodzi na niego', async () => {
    /*
     * Regresja zgloszona przez uzytkownika: „nie moge utworzyc nowej wyceny,
     * bialy ekran". Wycena POWSTAWALA w bazie, ale przekierowanie nie
     * nastepowalo — bo `StrictMode` porzuca pierwszego obserwatora mutacji,
     * a razem z nim callbacki `onSuccess` i stan `isSuccess`.
     *
     * Widac to bylo tylko na `pnpm dev`: w zbudowanym .exe StrictMode nie
     * dziala, wiec aplikacja zachowywala sie poprawnie.
     */
    createMutateAsync.mockResolvedValue({ ...quote(), id: 'nowa-1' });
    renderNewQuoteStrict();

    expect(await screen.findByText('Edytor wyceny')).toBeInTheDocument();
    // Podwojne montowanie NIE moze zalozyc dwoch dokumentow.
    expect(createMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('nieudane zalozenie pokazuje blad, a nie wieczny szkielet', async () => {
    // Bez wlasnego stanu blad ginal razem z porzuconym obserwatorem.
    createMutateAsync.mockRejectedValue(new Error('Brak uprawnien'));
    renderNewQuoteStrict();

    expect(await screen.findByText('Brak uprawnien')).toBeInTheDocument();
  });
});

describe('QuoteEditorPage — otwieranie', () => {
  it('otwiera sie takze w StrictMode (podwojne montowanie w devie)', () => {
    /*
     * `main.tsx` owija aplikacje w `StrictMode`, ktory w budowaniu DEWELOPERSKIM
     * montuje komponent dwa razy: mount → cleanup → mount. W zbudowanym .exe
     * (produkcja) tego nie ma — dlatego blad widac tylko na `pnpm dev`.
     */
    renderEditorStrict();
    expect(screen.getByDisplayValue('Wycena testowa')).toBeInTheDocument();
  });

  it('renderuje edytor istniejącej wyceny', () => {
    renderEditor();
    expect(screen.getByDisplayValue('Wycena testowa')).toBeInTheDocument();
  });

  it('renderuje wycenę BEZ harmonogramu i bez pomieszczeń', () => {
    // Najczęstszy przypadek: świeża wycena.
    renderEditor();
    expect(screen.getByTestId('item-row')).toBeInTheDocument();
  });
});
