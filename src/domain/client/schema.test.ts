import { describe, expect, it } from 'vitest';
import {
  ClientDraftSchema,
  clientSnapshot,
  clientSnapshotDiffers,
  clientToDraft,
  emptyClientDraft,
  type Client,
} from './schema';

function client(partial: Partial<Client> = {}): Client {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Anna i Piotr Kowalscy',
    phone: '600 100 200',
    email: 'anna@example.com',
    address: 'ul. Wiosenna 12/3',
    city: 'Poznań',
    notes: '',
    status: 'active',
    archivedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    ...partial,
  };
}

describe('clientSnapshot', () => {
  it('przepisuje do wyceny nazwe, telefon, e-mail i miasto', () => {
    expect(clientSnapshot(client())).toEqual({
      name: 'Anna i Piotr Kowalscy',
      phone: '600 100 200',
      email: 'anna@example.com',
      city: 'Poznań',
    });
  });

  it('nie niesie adresu inwestycji — QuoteClient go nie zna', () => {
    // Dolozenie pola do `body.client` podbiloby `bodyVersion` bez powodu
    // (FEATURES-Z-KONCEPCJI §9.5).
    expect(clientSnapshot(client())).not.toHaveProperty('address');
  });

  it('jest KOPIA, nie referencja — edycja kartoteki nie rusza wyceny', () => {
    const kartoteka = client();
    const wWycenie = clientSnapshot(kartoteka);

    kartoteka.phone = '999 888 777';
    kartoteka.name = 'Kowalscy (po zmianie)';

    expect(wWycenie.phone).toBe('600 100 200');
    expect(wWycenie.name).toBe('Anna i Piotr Kowalscy');
  });
});

describe('clientSnapshotDiffers', () => {
  it('nie widzi roznicy tuz po przypieciu', () => {
    const kartoteka = client();
    expect(clientSnapshotDiffers(clientSnapshot(kartoteka), kartoteka)).toBe(false);
  });

  it('widzi zmieniony telefon', () => {
    const snapshot = clientSnapshot(client());
    expect(clientSnapshotDiffers(snapshot, client({ phone: '999 888 777' }))).toBe(true);
  });

  it('widzi zmienione miasto', () => {
    const snapshot = clientSnapshot(client());
    expect(clientSnapshotDiffers(snapshot, client({ city: 'Warszawa' }))).toBe(true);
  });

  it('ignoruje adres — nie ma go w dokumencie, wiec nie ma czego odswiezac', () => {
    const snapshot = clientSnapshot(client());
    expect(clientSnapshotDiffers(snapshot, client({ address: 'inny adres' }))).toBe(false);
  });
});

describe('ClientDraftSchema', () => {
  it('wymaga wylacznie nazwy', () => {
    const result = ClientDraftSchema.safeParse(emptyClientDraft());
    expect(result.success).toBe(false);

    const zNazwa = ClientDraftSchema.safeParse({ ...emptyClientDraft(), name: 'Nowak' });
    expect(zNazwa.success).toBe(true);
  });

  it('przepuszcza pusty e-mail — polowa klientow dzwoni', () => {
    const result = ClientDraftSchema.safeParse({ ...emptyClientDraft(), name: 'Nowak', email: '' });
    expect(result.success).toBe(true);
  });

  it('odrzuca e-mail, ktory nie jest adresem', () => {
    const result = ClientDraftSchema.safeParse({
      ...emptyClientDraft(),
      name: 'Nowak',
      email: 'to-nie-adres',
    });
    expect(result.success).toBe(false);
  });

  it('obcina biale znaki z nazwy', () => {
    const result = ClientDraftSchema.parse({ ...emptyClientDraft(), name: '  Nowak  ' });
    expect(result.name).toBe('Nowak');
  });

  it('sama spacja to nie nazwa', () => {
    expect(ClientDraftSchema.safeParse({ ...emptyClientDraft(), name: '   ' }).success).toBe(false);
  });
});

describe('clientToDraft', () => {
  it('wypelnia formularz danymi klienta, bez pol technicznych', () => {
    expect(clientToDraft(client())).toEqual({
      name: 'Anna i Piotr Kowalscy',
      phone: '600 100 200',
      email: 'anna@example.com',
      address: 'ul. Wiosenna 12/3',
      city: 'Poznań',
      notes: '',
    });
  });
});
