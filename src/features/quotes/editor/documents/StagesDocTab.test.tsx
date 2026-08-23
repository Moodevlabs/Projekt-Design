import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useWorkspace = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useWorkspace', () => ({ useWorkspace, useWorkspaceId: () => 'ws-1' }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() },
}));

const { StagesDocTab } = await import('./StagesDocTab');
const { useEditorStore } = await import('../editor.store');

function zaladuj(items = [newItem({ name: 'Pozycja' })]) {
  useEditorStore.setState({
    body: newQuoteBody({ sections: [newSection({ title: 'Sekcja', items })] }),
    schedule: null,
    documents: null,
    quoteId: 'q1',
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
}

function dokument() {
  return useEditorStore.getState().documents?.stages ?? null;
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspace.mockReturnValue({ data: { settings: { stagesTemplate: null } } });
  useEditorStore.getState().reset();
});

describe('StagesDocTab — zakładanie dokumentu', () => {
  it('pierwsze wejście w trybie edycji zakłada 19 etapów z szablonu', () => {
    zaladuj();
    render(<StagesDocTab editing />);
    expect(dokument()?.entries).toHaveLength(19);
  });

  it('NIE zakłada dokumentu w podglądzie', () => {
    // Obejrzenie oferty nie ma prawa dopisac jej dokumentu ani zabrudzic zapisu.
    zaladuj();
    render(<StagesDocTab editing={false} />);

    expect(dokument()).toBeNull();
    expect(useEditorStore.getState().saveState).toBe('idle');
    expect(screen.getByText(pl.editor.stagesDocEmpty)).toBeInTheDocument();
  });

  it('nie kasuje dokumentu, który już jest', () => {
    zaladuj();
    render(<StagesDocTab editing />).unmount();
    useEditorStore.getState().patchStagesDoc({ footnote: 'Moja uwaga' });

    render(<StagesDocTab editing />);
    expect(dokument()?.footnote).toBe('Moja uwaga');
  });
});

describe('StagesDocTab — etapy poza zakresem', () => {
  it('etapy odznaczone ZOSTAJĄ na liście — kryterium F6.1', () => {
    /*
     * Sedno tego dokumentu: klient ma zobaczyć, czego nie zamawia. Etap,
     * który znika po odznaczeniu, zamienia dokument o zakresie w listę
     * życzeń.
     */
    zaladuj();
    render(<StagesDocTab editing />);

    const poza = dokument()?.entries.filter((entry) => !entry.included) ?? [];
    expect(poza.length).toBeGreaterThan(0);
    for (const entry of poza) {
      expect(screen.getByLabelText(pl.editor.stageEntryIncluded(entry.name))).toBeInTheDocument();
    }
  });

  it('odznaczenie etapu brudzi dokument i zostaje w treści', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<StagesDocTab editing />);

    const etap = dokument()?.entries[0];
    if (!etap) throw new Error('brak etapu');

    await user.click(screen.getByLabelText(pl.editor.stageEntryIncluded(etap.name)));

    expect(dokument()?.entries[0]?.included).toBe(false);
    expect(useEditorStore.getState().saveState).toBe('dirty');
    expect(screen.getByLabelText(pl.editor.stageEntryIncluded(etap.name))).toBeInTheDocument();
  });

  it('w podglądzie nie da się przełączyć etapu', () => {
    zaladuj();
    useEditorStore.getState().ensureStagesDoc(null);
    render(<StagesDocTab editing={false} />);

    const etap = dokument()?.entries[0];
    if (!etap) throw new Error('brak etapu');
    expect(screen.getByLabelText(pl.editor.stageEntryIncluded(etap.name))).toBeDisabled();
  });
});

describe('StagesDocTab — podpowiedź po etykietach pozycji', () => {
  /** Etap z etykietą, odznaczony ręcznie — punkt wyjścia dla podpowiedzi. */
  function odznaczonyEtapZEtykieta() {
    useEditorStore.getState().ensureStagesDoc(null);
    const etap = dokument()?.entries.find((entry) =>
      entry.linkedItemTags.includes('visualization'),
    );
    if (!etap) throw new Error('brak etapu z etykietą');
    useEditorStore.getState().updateStageEntry(etap.id, { included: false });
    return etap;
  }

  function stanEtapu(id: string) {
    return dokument()?.entries.find((entry) => entry.id === id)?.included;
  }

  it('pozycja z etykietą wciąga odznaczony etap z powrotem do zakresu', () => {
    zaladuj([newItem({ name: 'Wizualizacje', tags: ['visualization'] })]);
    const etap = odznaczonyEtapZEtykieta();

    render(<StagesDocTab editing />);

    expect(stanEtapu(etap.id)).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith(
      pl.editor.stageEntryAutoIncluded(etap.name),
      expect.objectContaining({ action: expect.anything() }),
    );
  });

  it('bez pasującej pozycji NIE rusza zakresu', () => {
    zaladuj([newItem({ name: 'Coś innego' })]);
    const etap = odznaczonyEtapZEtykieta();

    render(<StagesDocTab editing />);

    expect(stanEtapu(etap.id)).toBe(false);
  });

  it('w podglądzie nie podpowiada — dokument klienta się nie zmienia', () => {
    zaladuj([newItem({ name: 'Wizualizacje', tags: ['visualization'] })]);
    const etap = odznaczonyEtapZEtykieta();

    render(<StagesDocTab editing={false} />);

    expect(stanEtapu(etap.id)).toBe(false);
  });

  it('NIE wraca do etapu odznaczonego ręcznie', () => {
    // Automat, ktory przy kazdym renderze przywraca swoja decyzje, jest nie
    // do zniesienia — proponuje raz na etap.
    zaladuj([newItem({ name: 'Wizualizacje', tags: ['visualization'] })]);
    const etap = odznaczonyEtapZEtykieta();

    const { rerender } = render(<StagesDocTab editing />);
    expect(stanEtapu(etap.id)).toBe(true);

    useEditorStore.getState().updateStageEntry(etap.id, { included: false });
    rerender(<StagesDocTab editing />);

    expect(stanEtapu(etap.id)).toBe(false);
  });
});

describe('StagesDocTab — edycja', () => {
  it('dopisany etap trafia do dokumentu', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<StagesDocTab editing />);

    const przed = dokument()?.entries.length ?? 0;
    await user.click(screen.getByText(pl.editor.addStageEntry));

    expect(dokument()?.entries).toHaveLength(przed + 1);
  });

  it('dodanie etapu nie wsypuje obiektu zdarzenia do dokumentu', async () => {
    // Ten sam wypadek co przy pomieszczeniach — SyntheticEvent ma cykliczne
    // referencje i wywraca zapis.
    const user = userEvent.setup();
    zaladuj();
    render(<StagesDocTab editing />);

    await user.click(screen.getByText(pl.editor.addStageEntry));
    expect(() => JSON.stringify(dokument())).not.toThrow();
  });

  it('ważność dokumentu jest osobna od oferty', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<StagesDocTab editing />);

    expect(dokument()?.validDays).toBe(14);

    const pole = screen.getByLabelText(pl.editor.stagesDocValidDays);
    await user.clear(pole);
    await user.type(pole, '30');

    expect(dokument()?.validDays).toBe(30);
  });
});
