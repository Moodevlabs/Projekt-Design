import { describe, expect, it } from 'vitest';
import {
  ProjectDraftSchema,
  emptyProjectDraft,
  formatArea,
  parseArea,
  projectToDraft,
  suggestsInProgress,
  type Project,
} from './schema';

function project(partial: Partial<Project> = {}): Project {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    clientId: '11111111-1111-4111-8111-111111111111',
    name: 'Dom 164 m²',
    address: 'ul. Sosnowa 8',
    city: 'Konstancin',
    areaM2: 164,
    kind: 'house',
    status: 'lead',
    startDate: null,
    notes: '',
    sortOrder: 0,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    stageProgress: {},
    ...partial,
  };
}

describe('parseArea', () => {
  it('przyjmuje przecinek, bo tak ludzie pisza metry', () => {
    expect(parseArea('164,5')).toBe(164.5);
  });

  it('przyjmuje kropke i spacje', () => {
    expect(parseArea('164.5')).toBe(164.5);
    expect(parseArea(' 164 ')).toBe(164);
  });

  it('puste pole to `null`, a NIE zero', () => {
    // 0 m² to twierdzenie o inwestycji; brak metrazu to jego brak.
    expect(parseArea('')).toBeNull();
    expect(parseArea('   ')).toBeNull();
  });

  it('odrzuca tekst i liczby ujemne', () => {
    expect(parseArea('sto')).toBeNull();
    expect(parseArea('-5')).toBeNull();
  });

  it('zaokragla do jednego miejsca — tyle trzyma kolumna', () => {
    // `numeric(8,1)` w bazie; bez zaokraglenia to, co widac po zapisie,
    // roznilo by sie od tego, co wpisano.
    expect(parseArea('164,57')).toBe(164.6);
  });
});

describe('formatArea', () => {
  it('null to puste pole, nie „0"', () => {
    expect(formatArea(null)).toBe('');
  });

  it('wraca z przecinkiem', () => {
    expect(formatArea(164.5)).toBe('164,5');
  });

  it('jest odwrotnoscia parseArea', () => {
    expect(parseArea(formatArea(164.5))).toBe(164.5);
  });
});

describe('emptyProjectDraft', () => {
  it('podpowiada adres z kartoteki klienta', () => {
    const draft = emptyProjectDraft({ address: 'ul. Wiosenna 12', city: 'Poznań' });
    expect(draft.address).toBe('ul. Wiosenna 12');
    expect(draft.city).toBe('Poznań');
  });

  it('bez klienta zostawia pustke, a nie undefined', () => {
    expect(emptyProjectDraft()).toMatchObject({ address: '', city: '', areaM2: '', kind: '' });
  });

  it('nowy projekt startuje jako zapytanie', () => {
    expect(emptyProjectDraft().status).toBe('lead');
  });
});

describe('ProjectDraftSchema', () => {
  it('wymaga nazwy', () => {
    expect(ProjectDraftSchema.safeParse(emptyProjectDraft()).success).toBe(false);
    expect(ProjectDraftSchema.safeParse({ ...emptyProjectDraft(), name: 'Dom' }).success).toBe(
      true,
    );
  });

  it('odrzuca metraz, ktory nie jest liczba', () => {
    const result = ProjectDraftSchema.safeParse({
      ...emptyProjectDraft(),
      name: 'Dom',
      areaM2: 'duzy',
    });
    expect(result.success).toBe(false);
  });

  it('przepuszcza pusty metraz', () => {
    const result = ProjectDraftSchema.safeParse({
      ...emptyProjectDraft(),
      name: 'Dom',
      areaM2: '',
    });
    expect(result.success).toBe(true);
  });
});

describe('projectToDraft', () => {
  it('metraz wraca jako tekst z przecinkiem', () => {
    expect(projectToDraft(project({ areaM2: 62.5 })).areaM2).toBe('62,5');
  });

  it('brak daty startu to puste pole', () => {
    expect(projectToDraft(project({ startDate: null })).startDate).toBe('');
  });
});

describe('suggestsInProgress', () => {
  it('proponuje realizacje tylko z zapytania i oferty', () => {
    expect(suggestsInProgress('lead')).toBe(true);
    expect(suggestsInProgress('offer')).toBe(true);
  });

  it('nie proponuje tego, co juz trwa', () => {
    expect(suggestsInProgress('in_progress')).toBe(false);
  });

  it('nie cofa decyzji czlowieka o zakonczeniu ani anulowaniu', () => {
    expect(suggestsInProgress('done')).toBe(false);
    expect(suggestsInProgress('canceled')).toBe(false);
  });
});
