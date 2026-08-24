import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '@/data/repos/subscription.repo';
import { pl } from '@/i18n/pl';
import { formatDate } from '@/lib/dates';

const useSubscription = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());
const openExternal = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useSubscription', () => ({ useSubscription }));
vi.mock('@/data/supabase', () => ({ getSupabase: () => ({ functions: { invoke } }) }));
vi.mock('@/lib/tauri', () => ({ runningInTauri: () => true, openExternal }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const { SubscriptionPage } = await import('./SubscriptionPage');
const { ReadOnlyBanner } = await import('./ReadOnlyBanner');
const { TrialBar } = await import('./TrialBar');

function at(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function mockSub(partial: Partial<Subscription> | null, pending = false) {
  useSubscription.mockReturnValue({
    isPending: pending,
    isSuccess: !pending,
    isError: false,
    data: partial
      ? {
          workspaceId: 'ws',
          status: 'trialing',
          plan: null,
          trialEndsAt: at(14),
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeCustomerId: null,
          ...partial,
        }
      : null,
  });
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue({ data: { url: 'https://checkout.stripe.com/c/pay/test' }, error: null });
  mockSub({});
});

describe('SubscriptionPage — rama produktowa', () => {
  it('nie nazywa niczego planem „Pro” ani wersją darmową', () => {
    // Aplikacja jest platna w calosci — slowo „Pro” sugerowaloby nizszy tier.
    mockSub({});
    const { container } = renderWithRouter(<SubscriptionPage />);

    expect(container.textContent).not.toMatch(/\bPro\b/);
    expect(container.textContent).not.toMatch(/darmow/i);
  });

  it('daje wybor CZESTOTLIWOSCI platnosci, a nie pakietow', () => {
    renderWithRouter(<SubscriptionPage />);

    expect(screen.getByText(pl.billing.monthly)).toBeInTheDocument();
    expect(screen.getByText(pl.billing.yearly)).toBeInTheDocument();
    expect(screen.getByText(pl.billing.prices.monthly)).toBeInTheDocument();
  });

  it('pokazuje NOWA cene, a stara nie wraca (T-66)', () => {
    /*
     * Kwoty siedza w trzech miejscach naraz (i18n, Stripe, marketing).
     * Ten test pilnuje tego jednego, ktore mozemy sprawdzic automatycznie —
     * zeby "19,99" nie wrocilo przez odwrocony merge albo skopiowany fragment.
     */
    const { container } = renderWithRouter(<SubscriptionPage />);

    expect(container.textContent).toContain('98,99');
    expect(container.textContent).toContain('999,99');
    expect(container.textContent).not.toContain('19,99 zł');
    expect(container.textContent).not.toContain('199 zł / rok');
  });

  it('pokazuje, ILE oszczedza roczna — przekreslona kwota, nie sama obietnica', () => {
    const { container } = renderWithRouter(<SubscriptionPage />);

    // 12 x 98,99 = 1 187,88. Bez tej liczby "dwa miesiace taniej" jest
    // haslem, ktorego klient nie ma jak sprawdzic.
    expect(container.textContent).toContain(pl.billing.prices.yearlyBefore);
    expect(screen.getByText(pl.billing.prices.yearlySaving)).toBeInTheDocument();
  });

  it('mowi wprost, ze dane zostaja po wygasnieciu', () => {
    renderWithRouter(<SubscriptionPage />);
    expect(screen.getByText(pl.billing.dataSafe)).toBeInTheDocument();
  });

  it('okres probny pokazuje licznik i wyjasnienie, czym jest', () => {
    mockSub({ status: 'trialing', trialEndsAt: at(5) });
    renderWithRouter(<SubscriptionPage />);

    expect(screen.getByText(pl.billing.trialDaysLeft(5))).toBeInTheDocument();
    expect(screen.getByText(pl.billing.trialExplainer)).toBeInTheDocument();
  });
});

describe('SubscriptionPage — akcje', () => {
  it('wybor okresu otwiera Checkout w przegladarce systemowej', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SubscriptionPage />);

    const buttons = screen.getAllByRole('button', { name: pl.billing.buy });
    await user.click(buttons[0]!);

    expect(invoke).toHaveBeenCalledWith('stripe-create-checkout', { body: { plan: 'monthly' } });
    expect(openExternal).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/test');
  });

  it('rocznie wysyla `yearly`', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SubscriptionPage />);

    const buttons = screen.getAllByRole('button', { name: pl.billing.buy });
    await user.click(buttons[1]!);

    expect(invoke).toHaveBeenCalledWith('stripe-create-checkout', { body: { plan: 'yearly' } });
  });

  it('portal pokazuje sie dopiero, gdy jest klient Stripe', async () => {
    mockSub({ stripeCustomerId: null });
    const { unmount } = renderWithRouter(<SubscriptionPage />);
    expect(screen.queryByRole('button', { name: pl.billing.manage })).not.toBeInTheDocument();
    unmount();

    mockSub({ stripeCustomerId: 'cus_123' });
    const user = userEvent.setup();
    renderWithRouter(<SubscriptionPage />);

    await user.click(screen.getByRole('button', { name: pl.billing.manage }));
    expect(invoke).toHaveBeenCalledWith('stripe-create-portal', { body: {} });
  });

  it('po anulowaniu mowi „dostep do", a nie „odnowi sie"', () => {
    // Oplacony okres nalezy sie do konca — ale nie wolno sugerowac, ze
    // subskrypcja sie odnowi, skoro klient wlasnie ja wylaczyl.
    const koniec = at(10);
    mockSub({ status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: koniec });
    renderWithRouter(<SubscriptionPage />);

    const data = formatDate(new Date(koniec));
    expect(screen.getByText(pl.billing.endsAt(data))).toBeInTheDocument();
    expect(screen.queryByText(pl.billing.renewsAt(data))).not.toBeInTheDocument();
  });
});

describe('ReadOnlyBanner', () => {
  it('nie pokazuje sie, gdy dostep jest aktywny', () => {
    mockSub({ status: 'active' });
    const { container } = renderWithRouter(<ReadOnlyBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('nie miga podczas ladowania', () => {
    // Blysk „dostep wygasl” przy kazdym starcie bylby gorszy niz sekunda ciszy.
    mockSub(null, true);
    const { container } = renderWithRouter(<ReadOnlyBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('po wygasnieciu mowi, ze wyceny dalej da sie otworzyc i wyeksportowac', () => {
    mockSub({ status: 'canceled' });
    renderWithRouter(<ReadOnlyBanner />);

    const tekst = screen.getByText(pl.billing.readOnlyBanner).textContent ?? '';
    // To nie jest zakladnik danych — brak prawa do dalszej PRACY, nie do danych.
    expect(tekst).toMatch(/przegląda|eksport/i);
    expect(screen.getByRole('link', { name: pl.billing.buy })).toBeInTheDocument();
  });
});

describe('TrialBar', () => {
  it('milczy na poczatku okresu probnego', () => {
    // Licznik od pierwszego dnia to ciagle przypominanie o platnosci komus,
    // kto dopiero zaczal probowac.
    mockSub({ status: 'trialing', trialEndsAt: at(12) });
    const { container } = renderWithRouter(<TrialBar expanded />);
    expect(container).toBeEmptyDOMElement();
  });

  it('pokazuje licznik na tydzien przed koncem', () => {
    mockSub({ status: 'trialing', trialEndsAt: at(5) });
    renderWithRouter(<TrialBar expanded />);

    expect(screen.getByText(pl.billing.trialDaysLeft(5))).toBeInTheDocument();
  });

  it('po wykupieniu znika', () => {
    mockSub({ status: 'active' });
    const { container } = renderWithRouter(<TrialBar expanded />);
    expect(container).toBeEmptyDOMElement();
  });

  it('zwiniety panel pokazuje sama liczbe, ale z opisem dla czytnika', () => {
    mockSub({ status: 'trialing', trialEndsAt: at(3) });
    renderWithRouter(<TrialBar expanded={false} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('title', pl.billing.trialDaysLeft(3));
    expect(link.textContent).toBe('3');
  });
});
