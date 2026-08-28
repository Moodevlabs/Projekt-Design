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

// Biblioteka dokumentow (T-103): panel „Dodaj z biblioteki" i zapis wiersza
// pytaja o wpisy — test komponentu izoluje sie od TanStack Query.
const docEntries = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock('@/data/queries/useLibraryDocs', () => ({
  useDocLibrary: () => ({ data: [], isLoading: false, isError: false }),
  useDocLibraryEntries: () => ({
    entries: docEntries.current,
    data: [],
    isLoading: false,
    isError: false,
  }),
  useCreateDocLibraryEntry: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() },
}));

const { ScheduleTab } = await import('./ScheduleTab');
const { calcSchedule } = await import('@/domain/schedule');
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
      documents: null,
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

describe('ScheduleTab — zakladka tlumaczy, jak liczy (poprawka 7b)', () => {
  it('nazywa zalozenia i mowi, co z nich wynika', () => {
    render(<ScheduleTab editing />);

    expect(screen.getByText(pl.editor.scheduleAssumptions)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.scheduleAssumptionsHint)).toBeInTheDocument();
  });

  it('rozwija skroty ARCH./INW. pod lista etapow, nie tylko w karcie wyniku', () => {
    // Skrot przy kazdym wierszu potrzebuje rozwiniecia TAM, gdzie te wiersze sa.
    render(<ScheduleTab editing />);
    expect(screen.getByText(pl.editor.scheduleOwnerLegend)).toBeInTheDocument();
  });
});

describe('ScheduleTab — wynik', () => {
  it('POMIESZCZENIA zmieniają wynik — kryterium odbioru T-44', () => {
    /*
     * „Zmiana pomieszczeń w zakładce Wycena zmienia wynik w zakładce Termin".
     * Etapy zależne od pomieszczeń liczą się z tych samych `rooms` co cennik,
     * bo harmonogram mieszka w tym samym dokumencie.
     */
    // Szablon startuje ODZNACZONY (2026-08-27), więc najpierw włączamy etap
    // zależny od pomieszczeń — inaczej obie strony liczą zero i test nie ma
    // czego porównać.
    const wlaczEtapPerPokoj = () => {
      const stages = useEditorStore.getState().schedule?.stages ?? [];
      const perRoom = stages.find((stage) => stage.roomScope !== 'none');
      if (!perRoom) throw new Error('szablon nie ma etapu zaleznego od pomieszczen');
      useEditorStore.getState().updateStage(perRoom.id, { enabled: true });
    };

    zaladuj();
    wlaczEtapPerPokoj();
    const { unmount } = render(<ScheduleTab editing />);
    const bezPomieszczen = screen.getByText(pl.editor.scheduleProviderDays).parentElement
      ?.textContent;
    unmount();

    zaladuj([pokoj('Kuchnia', 3)]);
    wlaczEtapPerPokoj();
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
  it('przełącznik etapu zmienia jego stan i brudzi dokument', async () => {
    // Szablon startuje odznaczony (2026-08-27), więc pierwszy klik WŁĄCZA.
    // Test pilnuje przełączenia i zapisu, nie konkretnej wartości startowej.
    const user = userEvent.setup();
    zaladuj();
    render(<ScheduleTab editing />);

    const etap = harmonogram()?.stages[0];
    if (!etap) throw new Error('brak etapu');
    const przed = etap.enabled;

    await user.click(screen.getByLabelText(pl.editor.stageEnabled(etap.name)));

    expect(harmonogram()?.stages[0]?.enabled).toBe(!przed);
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

describe('ScheduleTab — etap zbiorczy „Usługi dodatkowe" (T-64)', () => {
  function zUsluga(days = 3) {
    zaladuj();
    useEditorStore
      .getState()
      .addScheduleExtra({ name: 'Panorama 360', days }, pl.editor.extrasStageName);
  }

  it('pokazuje skladniki etapu, a nie sama sume', () => {
    // Uzytkownik ma widziec, SKAD wzielo sie "+3 dni".
    zUsluga();
    render(<ScheduleTab editing />);

    expect(screen.getByText('Panorama 360')).toBeInTheDocument();
    expect(screen.getByText(pl.editor.extrasStageHint)).toBeInTheDocument();
  });

  it('etap zbiorczy nie ma pola „Dni bazowe" do recznej edycji', () => {
    // Liczba jest suma skladnikow — pole do wpisania byloby pulapka.
    zUsluga();
    render(<ScheduleTab editing />);

    expect(
      screen.queryByLabelText(pl.editor.stageBaseDaysLabel(pl.editor.extrasStageName)),
    ).not.toBeInTheDocument();
  });

  it('usuniecie skladnika skraca termin', async () => {
    const user = userEvent.setup();
    zUsluga();
    render(<ScheduleTab editing />);

    await user.click(
      screen.getByRole('button', { name: pl.editor.removeExtrasEntry('Panorama 360') }),
    );

    expect(harmonogram()?.stages.some((stage) => stage.kind === 'extras')).toBe(false);
  });
});

describe('ScheduleTab — etapy z biblioteki i podpowiedzi (T-108)', () => {
  it('etap wstawiony z biblioteki jest ZAZNACZONY, mimo ze szablon trzyma enabled:false', async () => {
    const user = userEvent.setup();
    docEntries.current = [
      {
        id: 'e1',
        workspaceId: 'ws',
        kind: 'schedule',
        name: 'Wizualizacje 3D',
        payload: {
          name: 'Wizualizacje 3D',
          owner: 'provider',
          baseDays: 0,
          perRoomDays: {},
          defaultPerRoomDays: 2,
          roomScope: 'visual',
          enabled: false,
          linkedItemTags: [],
        },
        sortOrder: 0,
        isSample: true,
      },
    ];
    zaladuj([pokoj('Kuchnia'), pokoj('Salon', 2)]);
    useEditorStore.getState().patchSchedule({ stages: [] });
    render(<ScheduleTab editing />);

    await user.click(screen.getByRole('button', { name: pl.editor.docLibrary.open }));
    await user.click(
      screen.getByRole('button', { name: pl.editor.docLibrary.addLabel('Wizualizacje 3D') }),
    );

    const etap = harmonogram()?.stages[0];
    expect(etap?.enabled).toBe(true);
    // 3 pomieszczenia (kuchnia + salon x2) x 2 dni = 6 dni — pomieszczenia DZIALAJA.
    expect(calcSchedule(harmonogram()!, useEditorStore.getState().body!.rooms).providerDays).toBe(
      6,
    );
  });

  it('gdy wszystkie etapy sa odznaczone, mowi to wprost', () => {
    docEntries.current = [];
    zaladuj([pokoj('Kuchnia')]);
    render(<ScheduleTab editing />);
    expect(screen.getByText(pl.editor.scheduleNoneEnabled)).toBeInTheDocument();
  });
});
