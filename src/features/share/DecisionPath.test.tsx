import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { Acceptance, QuoteComment, Share } from '@/domain/share/schema';
import { pl } from '@/i18n/pl';

import { DecisionPath } from './DecisionPath';

function share(partial: Partial<Share> = {}): Share {
  return {
    id: 's1',
    quoteId: 'q1',
    token: 'tok',
    expiresAt: null,
    revokedAt: null,
    createdAt: '2026-08-20T10:00:00Z',
    firstViewedAt: null,
    lastViewedAt: null,
    viewCount: 0,
    ...partial,
  };
}

function comment(partial: Partial<QuoteComment> = {}): QuoteComment {
  return {
    id: 'c1',
    quoteId: 'q1',
    shareId: 's1',
    authorName: 'Anna',
    message: 'Czy da się taniej?',
    createdAt: '2026-08-22T10:00:00Z',
    readAt: null,
    ...partial,
  };
}

/*
 * Identyfikatory MUSZA byc UUID: `parseQuoteBody` waliduje ksztalt dokumentu,
 * a snapshot akceptacji przechodzi przez ten sam parser co edytor. Skroty
 * w rodzaju „i1" wywalaly parsowanie i lista zmian po cichu znikala.
 */
const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';
const ID_3 = '33333333-3333-4333-8333-333333333333';

/** Wycena z trzema pozycjami — dwie wlaczone, jedna nie. */
function bodyWithItems() {
  return newQuoteBody({
    sections: [
      newSection({
        title: 'Zakres',
        items: [
          newItem({ id: ID_1, name: 'Projekt koncepcyjny', enabled: true }),
          newItem({ id: ID_2, name: 'Wizualizacje 3D', enabled: true }),
          newItem({ id: ID_3, name: 'Nadzór autorski', enabled: true }),
        ],
      }),
    ],
  });
}

function acceptance(partial: Partial<Acceptance> = {}): Acceptance {
  return {
    id: 'a1',
    quoteId: 'q1',
    shareId: 's1',
    acceptedBody: bodyWithItems(),
    enabledItemIds: [ID_1, ID_2, ID_3],
    signerName: 'Anna Kowalska',
    signerIp: null,
    acceptedAt: '2026-08-25T09:30:00Z',
    decision: 'accepted',
    reason: null,
    ...partial,
  };
}

describe('DecisionPath — os decyzji klienta (poprawka 7a)', () => {
  it('kroki, ktore jeszcze nie zaszly, ZOSTAJA na liscie', () => {
    // Sedno przebudowy: lista pokazujaca tylko to, co sie stalo, nie mowi,
    // na co sie czeka.
    render(
      <DecisionPath sentAt={null} shares={[share()]} comments={[]} acceptance={null} />,
    );

    expect(screen.getByText(pl.share.pathOpenedPending)).toBeInTheDocument();
    expect(screen.getByText(pl.share.pathDecisionPending)).toBeInTheDocument();
  });

  it('otwarcie liczy z NAJWCZESNIEJSZEGO linku, nie z ostatniego', () => {
    // Wystawienie drugiego linku nie cofa faktu, ze klient juz oferte widzial.
    render(
      <DecisionPath
        sentAt="2026-08-20T09:00:00Z"
        shares={[
          share({ id: 's2', firstViewedAt: null }),
          share({ id: 's1', firstViewedAt: '2026-08-21T08:00:00Z' }),
        ]}
        comments={[]}
        acceptance={null}
      />,
    );

    expect(screen.getByText(pl.share.pathOpened)).toBeInTheDocument();
  });

  it('pokazuje odmowe razem z powodem', () => {
    render(
      <DecisionPath
        sentAt="2026-08-20T09:00:00Z"
        shares={[share({ firstViewedAt: '2026-08-21T08:00:00Z' })]}
        comments={[]}
        acceptance={acceptance({
          decision: 'rejected',
          reason: 'Wybraliśmy inną pracownię.',
          enabledItemIds: [],
        })}
      />,
    );

    expect(screen.getByText(pl.share.pathRejected)).toBeInTheDocument();
    expect(
      screen.getByText(pl.share.pathRejectedReason('Wybraliśmy inną pracownię.')),
    ).toBeInTheDocument();
  });

  it('wymienia NAZWY pozycji, ktore klient odznaczyl', () => {
    // „Klient wylaczyl 2 pozycje" nie daje sie na niczym oprzec.
    render(
      <DecisionPath
        sentAt="2026-08-20T09:00:00Z"
        shares={[share({ firstViewedAt: '2026-08-21T08:00:00Z' })]}
        comments={[comment()]}
        acceptance={acceptance({ enabledItemIds: [ID_1] })}
      />,
    );

    expect(screen.getByText(pl.share.turnedOffTitle)).toBeInTheDocument();
    expect(screen.getByText('Wizualizacje 3D')).toBeInTheDocument();
    expect(screen.getByText('Nadzór autorski')).toBeInTheDocument();
  });

  it('przyjecie bez zmian tez jest informacja', () => {
    render(
      <DecisionPath
        sentAt="2026-08-20T09:00:00Z"
        shares={[share({ firstViewedAt: '2026-08-21T08:00:00Z' })]}
        comments={[]}
        acceptance={acceptance()}
      />,
    );

    expect(screen.getByText(pl.share.pathAccepted)).toBeInTheDocument();
    expect(screen.getByText(pl.share.noChanges)).toBeInTheDocument();
  });
});
