import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WorkloadPopover } from './WorkloadPopover';
import { newItem, newQuoteBody, newSection, TAG_COMMUNICATION } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/** 120 zł/h — 240 zł to 2 godziny pracy. */
const RATE = 12_000;

function wycena(pricingBasis: 'amount' | 'time' = 'amount') {
  return newQuoteBody({
    pricingBasis,
    hourlyRateCents: pricingBasis === 'time' ? RATE : null,
    sections: [
      newSection({
        title: 'Projekt',
        items: [newItem({ name: 'Koncepcja', unitPriceCents: pricingBasis === 'time' ? 120 : 24_000 })],
      }),
      newSection({
        title: 'Nadzór',
        items: [
          newItem({
            name: 'Spotkania',
            unitPriceCents: pricingBasis === 'time' ? 30 : 6_000,
            tags: [TAG_COMMUNICATION],
          }),
        ],
      }),
    ],
  });
}

async function otworz(node: React.ReactElement) {
  const user = userEvent.setup();
  render(node);
  await user.click(screen.getByRole('button', { name: pl.editor.workloadEstimate }));
  return user;
}

describe('WorkloadPopover', () => {
  it('pokazuje rozbicie na sekcje i sumę', async () => {
    await otworz(<WorkloadPopover body={wycena()} fallbackRateCents={RATE} />);

    expect(await screen.findByText('Projekt')).toBeInTheDocument();
    expect(screen.getByText('2 h')).toBeInTheDocument();
    expect(screen.getByText('Nadzór')).toBeInTheDocument();
    // 2 h + 30 min.
    expect(screen.getByText('2 h 30 min')).toBeInTheDocument();
  });

  it('wyodrębnia komunikację i mówi, że jest wliczona w sumę', async () => {
    // Bez tego dopisku liczba wygląda na doliczoną obok i suma nie zgadza się
    // z rozbiciem na sekcje.
    await otworz(<WorkloadPopover body={wycena()} fallbackRateCents={RATE} />);

    expect(await screen.findByText(pl.editor.workloadCommunication)).toBeInTheDocument();
    expect(screen.getByText(pl.editor.workloadCommunicationHint)).toBeInTheDocument();
  });

  it('BEZ STAWKI mówi, czego brakuje, zamiast pokazywać zera', async () => {
    await otworz(<WorkloadPopover body={wycena()} fallbackRateCents={null} />);

    expect(await screen.findByText(pl.editor.workloadNoRate)).toBeInTheDocument();
    expect(screen.queryByText(pl.editor.workloadTotal)).not.toBeInTheDocument();
  });

  it('w trybie kwotowym uprzedza, że to szacunek z ceny', async () => {
    // To liczba wyliczona wstecz, a nie czas, który ktoś wpisał — i trzeba
    // to powiedzieć, zanim ktoś zaplanuje po niej tydzień pracy.
    await otworz(<WorkloadPopover body={wycena('amount')} fallbackRateCents={RATE} />);

    expect(await screen.findByText(pl.editor.workloadEstimateHint)).toBeInTheDocument();
  });

  it('w trybie godzinowym NIE nazywa minut szacunkiem', async () => {
    await otworz(<WorkloadPopover body={wycena('time')} fallbackRateCents={null} />);

    expect(await screen.findByText(pl.editor.workloadTotal)).toBeInTheDocument();
    expect(screen.queryByText(pl.editor.workloadEstimateHint)).not.toBeInTheDocument();
  });
});
