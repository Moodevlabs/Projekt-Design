import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultBrandKit, type BrandKit } from '@/domain/brand/schema';
import { pl } from '@/i18n/pl';

const useBrandKit = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const uploadMutate = vi.hoisted(() => vi.fn());
const removeLogoMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useBrandKit', () => ({
  useBrandKit,
  useUpdateBrandKit: () => ({ mutate: updateMutate, isPending: false }),
  useUploadLogo: () => ({ mutate: uploadMutate, isPending: false }),
  useRemoveLogo: () => ({ mutate: removeLogoMutate, isPending: false }),
  useLogoUrl: () => ({ data: null, isLoading: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const { BrandSettingsPage } = await import('./BrandSettingsPage');

function mockKit(partial: Partial<BrandKit> = {}) {
  useBrandKit.mockReturnValue({
    data: { ...defaultBrandKit(), companyName: 'Studio Wnętrz', ...partial },
    isLoading: false,
    isError: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockKit();
});

describe('BrandSettingsPage', () => {
  it('pokazuje zapisane dane firmy', () => {
    render(<BrandSettingsPage />);
    expect(screen.getByLabelText(pl.brand.companyName)).toHaveValue('Studio Wnętrz');
  });

  it('bez zmian nie pokazuje paska zapisu', () => {
    render(<BrandSettingsPage />);
    // Pasek ma sie pojawiac dopiero, gdy jest co zapisywac.
    expect(screen.queryByRole('button', { name: pl.common.save })).not.toBeInTheDocument();
  });

  it('zapisuje dopiero po kliknieciu, nie przy kazdym klawiszu', async () => {
    const user = userEvent.setup();
    render(<BrandSettingsPage />);

    await user.type(screen.getByLabelText(pl.brand.companyName), '!');
    // Brand kit czyta generator PDF — zapis w trakcie pisania przerysowywalby
    // dokument po kazdej literze.
    expect(updateMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.common.save }));
    const patch = updateMutate.mock.calls[0]?.[0] as BrandKit;
    expect(patch.companyName).toBe('Studio Wnętrz!');
  });

  it('anulowanie przywraca zapisane wartosci', async () => {
    const user = userEvent.setup();
    render(<BrandSettingsPage />);

    const input = screen.getByLabelText(pl.brand.companyName);
    await user.type(input, ' zmiana');
    await user.click(screen.getByRole('button', { name: pl.common.cancel }));

    expect(input).toHaveValue('Studio Wnętrz');
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('blokuje zapis przy niepoprawnym kolorze', async () => {
    const user = userEvent.setup();
    render(<BrandSettingsPage />);

    const accent = screen.getByLabelText(pl.brand.accentColor);
    await user.clear(accent);
    await user.type(accent, 'terakota');

    expect(screen.getByText(pl.brand.invalidColor)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
  });

  it('dodaje wiersz godzin otwarcia i zapisuje go w brand kicie', async () => {
    const user = userEvent.setup();
    render(<BrandSettingsPage />);

    await user.click(screen.getByRole('button', { name: pl.brand.addOpeningHours }));
    await user.type(screen.getByLabelText(pl.brand.openingHoursLabel(0)), 'poniedziałek – piątek');
    await user.type(screen.getByLabelText(pl.brand.openingHoursValue(0)), '8.00 – 16.00');
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    const patch = updateMutate.mock.calls[0]?.[0] as BrandKit;
    expect(patch.openingHours).toEqual([
      { label: 'poniedziałek – piątek', hours: '8.00 – 16.00' },
    ]);
  });

  it('przy czterech wierszach nie da sie dodac piatego', () => {
    mockKit({
      openingHours: [
        { label: 'pn', hours: '8-16' },
        { label: 'wt', hours: '8-16' },
        { label: 'sr', hours: '8-16' },
        { label: 'cz', hours: '8-16' },
      ],
    });
    render(<BrandSettingsPage />);

    expect(
      screen.queryByRole('button', { name: pl.brand.addOpeningHours }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(pl.brand.openingHoursFull)).toBeInTheDocument();
  });

  it('zapisuje tytul zawodowy wystawiajacego', async () => {
    const user = userEvent.setup();
    render(<BrandSettingsPage />);

    await user.type(
      screen.getByLabelText(`${pl.brand.signer}: ${pl.brand.signerTitle}`),
      'projektant wnętrz',
    );
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    const patch = updateMutate.mock.calls[0]?.[0] as BrandKit;
    expect(patch.signerTitle).toBe('projektant wnętrz');
  });

  it('puste pole tekstowe zapisuje sie jako null, nie jako pusty string', async () => {
    // Kolumny sa nullable — pusty string udawalby wypelniona wartosc w PDF.
    const user = userEvent.setup();
    mockKit({ taxId: '1234567890' });
    render(<BrandSettingsPage />);

    await user.clear(screen.getByLabelText(pl.brand.taxId));
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    const patch = updateMutate.mock.calls[0]?.[0] as BrandKit;
    expect(patch.taxId).toBeNull();
  });
});
