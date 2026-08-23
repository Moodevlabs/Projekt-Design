import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';
import type { Template } from '@/data/repos/templates.repo';
import { useEditorStore } from './editor.store';

const createMutate = vi.hoisted(() => vi.fn());
const overwriteMutate = vi.hoisted(() => vi.fn());
const useTemplates = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useTemplates', () => ({
  useTemplates,
  useCreateTemplate: () => ({ mutate: createMutate }),
  useOverwriteTemplate: () => ({ mutate: overwriteMutate }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { useTemplateActions } = await import('./useTemplateActions');

function makeBody(): QuoteBody {
  return newQuoteBody({
    title: 'Wycena dla Kowalskiego',
    client: { name: 'Jan Kowalski', phone: '600100200', email: 'jan@example.com' },
    issueDate: '2026-08-01',
    sections: [newSection({ title: 'Prace', items: [newItem({ name: 'Projekt' })] })],
  });
}

function makeQuote(body: QuoteBody): Quote {
  return {
    id: 'q1',
    workspaceId: 'ws',
    number: 'WYC/2026/08/0001',
    title: body.title,
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    body,
    bodyError: null,
    schedule: null,
  };
}

const template: Template = {
  id: 't1',
  workspaceId: 'ws',
  name: 'Mieszkanie pod klucz',
  body: newQuoteBody(),
  bodyError: null,
  itemCount: 3,
  totalNetCents: 100_000,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  useTemplates.mockReturnValue({ data: [template] });
  useEditorStore.getState().reset();
  useEditorStore.getState().load(makeQuote(makeBody()));
});

describe('useTemplateActions — zapis jako szablon', () => {
  it('zapisuje uklad i pozycje wyceny', () => {
    const { result } = renderHook(() => useTemplateActions());
    result.current.saveAs('Mieszkanie pod klucz');

    const vars = createMutate.mock.calls[0]?.[0] as { name: string; body: QuoteBody };
    expect(vars.name).toBe('Mieszkanie pod klucz');
    expect(vars.body.sections[0]?.items[0]?.name).toBe('Projekt');
  });

  it('NIE zabiera danych klienta ani daty wystawienia', () => {
    // Inaczej nowa wycena z szablonu startowalaby z cudzym nazwiskiem
    // i telefonem — pomylka, ktora latwo wyslac do klienta.
    const { result } = renderHook(() => useTemplateActions());
    result.current.saveAs('Szablon');

    const vars = createMutate.mock.calls[0]?.[0] as { body: QuoteBody };
    expect(vars.body.client).toEqual({ name: '', phone: '', email: '' });
    expect(vars.body.issueDate).toBeNull();
  });

  it('zapisuje KOPIE, nie referencje do dokumentu w edytorze', () => {
    const { result } = renderHook(() => useTemplateActions());
    result.current.saveAs('Szablon');

    const vars = createMutate.mock.calls[0]?.[0] as { body: QuoteBody };
    const zapisanaNazwa = vars.body.sections[0]?.items[0]?.name;

    // Dalsza edycja wyceny nie moze zmieniac tresci wyslanej do zapisu.
    const itemId = useEditorStore.getState().body?.sections[0]?.items[0]?.id;
    if (itemId) useEditorStore.getState().updateItem(itemId, { name: 'Zmienione po zapisie' });

    expect(vars.body.sections[0]?.items[0]?.name).toBe(zapisanaNazwa);
  });

  it('bez otwartej wyceny nie zapisuje niczego', () => {
    useEditorStore.getState().reset();
    const { result } = renderHook(() => useTemplateActions());
    result.current.saveAs('Szablon');

    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe('useTemplateActions — nadpisanie', () => {
  it('nadpisuje wskazany szablon trescia biezacej wyceny', () => {
    const { result } = renderHook(() => useTemplateActions());
    result.current.overwrite(template);

    const vars = overwriteMutate.mock.calls[0]?.[0] as { id: string; body: QuoteBody };
    expect(vars.id).toBe('t1');
    expect(vars.body.sections[0]?.items[0]?.name).toBe('Projekt');
    // Ta sama zasada co przy zapisie: dane klienta zostaja w ofercie.
    expect(vars.body.client.name).toBe('');
  });

  it('`canOverwrite` jest falszem, gdy nie ma zadnego szablonu', () => {
    useTemplates.mockReturnValue({ data: [] });
    const { result } = renderHook(() => useTemplateActions());

    expect(result.current.canOverwrite).toBe(false);
  });
});
