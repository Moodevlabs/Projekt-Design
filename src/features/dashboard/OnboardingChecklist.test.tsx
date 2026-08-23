import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pl } from '@/i18n/pl';

const useBrandKit = vi.hoisted(() => vi.fn());
const useAllLibraryItems = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useBrandKit', () => ({ useBrandKit }));
vi.mock('@/data/queries/useLibrary', () => ({ useAllLibraryItems }));

const { OnboardingChecklist } = await import('./OnboardingChecklist');

function pokaz(hasQuotes = false) {
  render(
    <MemoryRouter>
      <OnboardingChecklist hasQuotes={hasQuotes} />
    </MemoryRouter>,
  );
}

function stan({
  logo = false,
  pozycje = 0,
  gotowe = true,
}: { logo?: boolean; pozycje?: number; gotowe?: boolean } = {}) {
  useBrandKit.mockReturnValue({
    isSuccess: gotowe,
    data: gotowe ? { logoLightPath: logo ? 'logo.png' : null, logoDarkPath: null } : undefined,
  });
  useAllLibraryItems.mockReturnValue({
    isSuccess: gotowe,
    data: gotowe ? Array.from({ length: pozycje }, (_, i) => ({ id: String(i) })) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OnboardingChecklist — kiedy się pokazuje', () => {
  it('świeży workspace dostaje wszystkie trzy kroki', () => {
    stan();
    pokaz();

    expect(screen.getByText(pl.onboarding.title)).toBeInTheDocument();
    for (const step of Object.values(pl.onboarding.steps)) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('ZNIKA, gdy wszystko jest zrobione', () => {
    // Checklist, ktory zostaje po wykonaniu, zamienia sie w ozdobe.
    stan({ logo: true, pozycje: 3 });
    pokaz(true);

    expect(screen.queryByText(pl.onboarding.title)).not.toBeInTheDocument();
  });

  it('zostaje, gdy choć jeden krok czeka', () => {
    stan({ logo: true, pozycje: 3 });
    pokaz(false);

    expect(screen.getByText(pl.onboarding.title)).toBeInTheDocument();
    expect(screen.getByText(pl.onboarding.progress(2, 3))).toBeInTheDocument();
  });

  it('NIE miga, dopóki nie wiadomo, co jest zrobione', () => {
    /*
     * Lista, ktora najpierw mowi „nie masz logo", a chwile pozniej sie
     * rozmysla, jest gorsza niz lista pojawiajaca sie sekunde pozniej.
     */
    stan({ gotowe: false });
    pokaz();

    expect(screen.queryByText(pl.onboarding.title)).not.toBeInTheDocument();
  });
});

describe('OnboardingChecklist — stan kroków', () => {
  it('wgrane logo odhacza pierwszy krok', () => {
    stan({ logo: true });
    pokaz();
    expect(screen.getAllByText(pl.onboarding.done)).toHaveLength(1);
  });

  it('logo w wersji ciemnej też się liczy', () => {
    useBrandKit.mockReturnValue({
      isSuccess: true,
      data: { logoLightPath: null, logoDarkPath: 'logo-dark.png' },
    });
    useAllLibraryItems.mockReturnValue({ isSuccess: true, data: [] });
    pokaz();

    expect(screen.getAllByText(pl.onboarding.done)).toHaveLength(1);
  });

  it('każdy krok prowadzi gdzieś indziej', () => {
    stan();
    pokaz();

    const cele = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(new Set(cele).size).toBe(3);
  });
});
