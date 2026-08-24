import { beforeEach, describe, expect, it, vi } from 'vitest';

const archiveGeneratedPdf = vi.hoisted(() =>
  vi.fn((_input: Record<string, unknown>) => Promise.resolve({})),
);
const saveFile = vi.hoisted(() => vi.fn(() => Promise.resolve('C:/pobrane/plik.pdf')));
const runningInTauri = vi.hoisted(() => vi.fn(() => false));
const saveDialog = vi.hoisted(() => vi.fn(() => Promise.resolve<string | null>('C:/plik.pdf')));
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/repos/files.repo', () => ({ archiveGeneratedPdf }));

vi.mock('@/lib/tauri', () => ({
  runningInTauri,
  saveFile,
  openPath: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: saveDialog }));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: vi.fn() },
}));

const { deliverPdf } = await import('./export');

const BYTES = new Uint8Array([1, 2, 3]);
const ARCHIVE = { workspaceId: 'ws', clientId: 'c1', projectId: 'p1', quoteId: 'q1' };

function args(overrides: Record<string, unknown> = {}) {
  return {
    bytes: BYTES,
    fileName: 'wyc-2026-08-0001-kowalscy.pdf',
    docType: 'quote' as const,
    savedToast: 'Zapisano PDF',
    archive: ARCHIVE,
    ...overrides,
  };
}

describe('deliverPdf — jedno wyjscie dla wszystkich eksportow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runningInTauri.mockReturnValue(false);
    saveDialog.mockResolvedValue('C:/plik.pdf');
    archiveGeneratedPdf.mockResolvedValue({});
  });

  it('archiwizuje kopie z typem dokumentu i przypisaniem do teczki', async () => {
    await deliverPdf(args());

    expect(archiveGeneratedPdf).toHaveBeenCalledTimes(1);
    expect(archiveGeneratedPdf.mock.calls[0]?.[0]).toMatchObject({
      workspaceId: 'ws',
      clientId: 'c1',
      projectId: 'p1',
      quoteId: 'q1',
      docType: 'quote',
      fileName: 'wyc-2026-08-0001-kowalscy.pdf',
    });
  });

  it('bez celu archiwizacji nie zapisuje niczego w archiwum', async () => {
    // Tak jest przy wycenie bez klienta i po odznaczeniu checkboxa.
    await deliverPdf(args({ archive: null }));
    expect(archiveGeneratedPdf).not.toHaveBeenCalled();
  });

  it('ANULOWANY dialog zapisu NIE cofa archiwizacji', async () => {
    // Sedno koncepcji §3 reguly 6: to sa dwie niezalezne rzeczy. Czlowiek,
    // ktory rozmyslil sie co do zapisu na dysku, dalej wie, co wyslal.
    runningInTauri.mockReturnValue(true);
    saveDialog.mockResolvedValue(null);

    const wynik = await deliverPdf(args());

    expect(archiveGeneratedPdf).toHaveBeenCalledTimes(1);
    expect(saveFile).not.toHaveBeenCalled();
    // `saved: false` — pytanie „oznaczyc jako wyslana?" nie ma prawa paść.
    expect(wynik.saved).toBe(false);
  });

  it('NIEUDANA archiwizacja nie blokuje pliku na dysku, tylko daje „Ponow"', async () => {
    archiveGeneratedPdf.mockRejectedValueOnce(new Error('brak miejsca'));
    runningInTauri.mockReturnValue(true);

    const wynik = await deliverPdf(args());

    expect(toastError).toHaveBeenCalled();
    const opcje = toastError.mock.calls[0]?.[1] as { action?: { label: string } } | undefined;
    expect(opcje?.action?.label).toBeDefined();

    // Plik i tak poszedl na dysk — to jest najwazniejsze.
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(wynik.saved).toBe(true);
  });

  it('ponowienie z toasta wola archiwizacje jeszcze raz', async () => {
    archiveGeneratedPdf.mockRejectedValueOnce(new Error('brak sieci'));
    await deliverPdf(args());

    const opcje = toastError.mock.calls[0]?.[1] as
      | { action?: { onClick: () => void } }
      | undefined;
    opcje?.action?.onClick();
    await Promise.resolve();

    expect(archiveGeneratedPdf).toHaveBeenCalledTimes(2);
  });

  it('w przegladarce zapis „udaje sie" zawsze — nie ma dialogu do anulowania', async () => {
    const wynik = await deliverPdf(args({ archive: null }));
    expect(wynik.saved).toBe(true);
    expect(saveFile).not.toHaveBeenCalled();
  });
});
