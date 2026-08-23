import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newItem, newQuoteBody, newSection, TAG_COMMUNICATION } from '@/domain/quote';
import { newScheduleBody } from '@/domain/schedule';
import type { RoomType } from '@/data/repos/room-types.repo';
import { pl } from '@/i18n/pl';

const useRoomTypes = vi.hoisted(() => vi.fn());
const useWorkspace = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useRoomTypes', () => ({ useRoomTypes }));
vi.mock('@/data/queries/useWorkspace', () => ({ useWorkspace, useWorkspaceId: () => 'ws-1' }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() },
}));

const { ScheduleTab } = await import('./ScheduleTab');
const { useEditorStore } = await import('../editor.store');

const TYPY: RoomType[] = [
  { id: 'rt-kuchnia', workspaceId: 'ws', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 10 },
];

function pokoj(label: string, qty = 1) {
  return {
    id: `r-${label}`,
    roomTypeId: 'rt-kuchnia',
    label,
    qty,
    includedInVisual: true,
    includedInTechnical: true,
  };
}

function zaladuj(rooms: ReturnType<typeof pokoj>[] = [], items = [newItem({ name: 'Pozycja' })]) {
  useEditorStore.setState({
    body: newQuoteBody({ rooms, sections: [newSection({ title: 'Sekcja', items })] }),
    schedule: newScheduleBody({ startDate: '2026-06-01' }),
    quoteId: 'q1',
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
}

function harmonogram() {
  return useEditorStore.getState().schedule;
}

beforeEach(() => {
  vi.clearAllMocks();
  useRoomTypes.mockReturnValue({ data: TYPY });
  useWorkspace.mockReturnValue({ data: { settings: { scheduleTemplate: null } } });
  useEditorStore.getState().reset();
});

describe('ScheduleTab — zakładanie harmonogramu', () => {
  it('pierwsze wejście w trybie edycji zakłada etapy z szablonu', () => {
    useEditorStore.setState({
      body: newQuoteBody({}),
      schedule: null,
      quoteId: 'q1',
      lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
      saveState: 'idle',
    });

    render(<ScheduleTab editing />);
    expect(harmonogram()?.stages.length).toBeGreaterThanOrEqual(11);
  });

  it('NIE zakłada harmonogramu w podglądzie', () => {
    // Samo obejrzenie wyceny nie moze zmieniac dokumentu ani brudzic zapisu.
    useEditorStore.setState({
      body: newQuoteBody({}),
      schedule: null,
      quoteId: 'q1',
      lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
      saveState: 'idle',
    });

    render(<ScheduleTab editing={false} />);
    expect(harmonogram()).toBeNull();
    expect(useEditorStore.getState().saveState).toBe('idle');
  });

  it('nie kasuje harmonogramu, który już jest', () => {
    zaladuj();
    const przed = harmonogram()?.startDate;

    render(<ScheduleTab editing />);
    expect(harmonogram()?.startDate).toBe(przed);
  });
});

describe('ScheduleTab — wynik', () => {
  it('POMIESZCZENIA zmieniają wynik — kryterium odbioru T-44', () => {
    /*
     * „Zmiana pomieszczeń w zakładce Wycena zmienia wynik w zakładce Termin".
     * Etapy zależne od pomieszczeń liczą się z tych samych `rooms` co cennik,
     * bo harmonogram mieszka w tym samym dokumencie.
     */
    zaladuj();
    const { unmount } = render(<ScheduleTab editing />);
    const bezPomieszczen = screen.getByText(pl.editor.scheduleProviderDays).parentElement
      ?.textContent;
    unmount();

    zaladuj([pokoj('Kuchnia', 3)]);
    render(<ScheduleTab editing />);
    const zPomieszczeniami = screen.getByText(pl.editor.scheduleProviderDays).parentElement
      ?.textContent;

    expect(zPomieszczeniami).not.toBe(bezPomieszczen);
  });

  it('bez daty startu mówi, czego brakuje, zamiast pokazywać datę', () => {
    zaladuj();
    useEditorStore.getState().patchSchedule({ startDate: null });

    render(<ScheduleTab editing />);
    expect(screen.getByText(pl.editor.scheduleNoStart)).toBeInTheDocument();
  });

  it('pusta lista pomieszczeń jest wyjaśniona, a nie przemilczana', () => {
    zaladuj();
    render(<ScheduleTab editing />);
    expect(screen.getByText(pl.editor.scheduleNoRooms)).toBeInTheDocument();
  });
});

describe('ScheduleTab — edycja etapów', () => {
  it('wyłączenie etapu zeruje jego dni i brudzi dokument', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<ScheduleTab editing />);

    const etap = harmonogram()?.stages[0];
    if (!etap) throw new Error('brak etapu');

    await user.click(screen.getByLabelText(pl.editor.stageEnabled(etap.name)));

    expect(harmonogram()?.stages[0]?.enabled).toBe(false);
    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('zmiana tygodnia roboczego trafia do harmonogramu', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<ScheduleTab editing />);

    const pole = screen.getByLabelText(pl.editor.scheduleClientWeek);
    await user.clear(pole);
    await user.type(pole, '6');

    expect(harmonogram()?.clientWorkdaysPerWeek).toBe(6);
  });

  it('w podglądzie nie da się edytować etapów', () => {
    zaladuj();
    render(<ScheduleTab editing={false} />);

    const etap = harmonogram()?.stages[0];
    if (!etap) throw new Error('brak etapu');
    expect(screen.getByLabelText(pl.editor.stageEnabled(etap.name))).toBeDisabled();
  });
});

describe('ScheduleTab — podpowiedź po etykietach pozycji', () => {
  it('pozycja z etykietą WŁĄCZA pasujący etap i mówi o tym', () => {
    zaladuj([], [newItem({ name: 'Spotkania', tags: [TAG_COMMUNICATION] })]);
    // Etap „Komunikacja projektowa" startuje wylaczony w tym scenariuszu.
    const komunikacja = harmonogram()?.stages.find((stage) =>
      stage.linkedItemTags.includes(TAG_COMMUNICATION),
    );
    if (!komunikacja) throw new Error('brak etapu komunikacji');
    useEditorStore.getState().updateStage(komunikacja.id, { enabled: false });

    render(<ScheduleTab editing />);

    const po = harmonogram()?.stages.find((stage) => stage.id === komunikacja.id);
    expect(po?.enabled).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith(
      pl.editor.stageAutoEnabled(komunikacja.name),
      expect.objectContaining({ action: expect.anything() }),
    );
  });

  it('NIE wraca do etapu wyłączonego ręcznie po podpowiedzi', () => {
    // Automat, ktory przy kazdym renderze przywraca swoja decyzje, jest nie
    // do zniesienia — dlatego proponuje raz na etap.
    zaladuj([], [newItem({ name: 'Spotkania', tags: [TAG_COMMUNICATION] })]);
    const komunikacja = harmonogram()?.stages.find((stage) =>
      stage.linkedItemTags.includes(TAG_COMMUNICATION),
    );
    if (!komunikacja) throw new Error('brak etapu komunikacji');
    useEditorStore.getState().updateStage(komunikacja.id, { enabled: false });

    const { rerender } = render(<ScheduleTab editing />);
    useEditorStore.getState().updateStage(komunikacja.id, { enabled: false });
    rerender(<ScheduleTab editing />);

    expect(harmonogram()?.stages.find((s) => s.id === komunikacja.id)?.enabled).toBe(false);
  });
});
