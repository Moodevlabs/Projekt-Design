import { describe, expect, it } from 'vitest';
import {
  canCreateVersion,
  groupByLineage,
  nextVersion,
  showsVersion,
  statusAfterSuperseding,
  versionLabel,
} from './versions';

describe('versionLabel / showsVersion', () => {
  it('etykieta to `v` i numer', () => {
    expect(versionLabel(2)).toBe('v2');
  });

  it('v1 sie NIE pokazuje — to domyslny przypadek', () => {
    // „· v1" przy kazdej wycenie bylby szumem: wersji nie ma wiekszosc ofert.
    expect(showsVersion(1)).toBe(false);
    expect(showsVersion(2)).toBe(true);
  });
});

describe('statusAfterSuperseding', () => {
  it('poprzedni SZKIC idzie do archiwum', () => {
    expect(statusAfterSuperseding('draft')).toBe('archived');
  });

  it('wyslana, zaakceptowana i odrzucona ZOSTAJA — to fakty, nie kopie roboczne', () => {
    // Przepisanie ich na `archived` skasowaloby historie tego, co poszlo do
    // inwestora i jak odpowiedzial (koncepcja §4 regula 2).
    expect(statusAfterSuperseding('sent')).toBeNull();
    expect(statusAfterSuperseding('accepted')).toBeNull();
    expect(statusAfterSuperseding('rejected')).toBeNull();
  });

  it('wygasla tez zostaje', () => {
    expect(statusAfterSuperseding('expired')).toBeNull();
  });
});

describe('canCreateVersion', () => {
  it('z archiwalnej nie da sie zrobic nowej wersji', () => {
    // Linia poszla dalej — odgalezienie daloby dwie „najnowsze".
    expect(canCreateVersion('archived')).toBe(false);
  });

  it('z kazdego innego statusu mozna', () => {
    for (const status of ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const) {
      expect(canCreateVersion(status)).toBe(true);
    }
  });
});

describe('nextVersion', () => {
  it('pusta linia zaczyna sie od v1', () => {
    expect(nextVersion([])).toBe(1);
  });

  it('bierze MAX + 1, a nie liczbe wersji', () => {
    // Usuniecie wersji ze srodka linii nie ma prawa powtorzyc numeru.
    expect(nextVersion([1, 3])).toBe(4);
  });

  it('nie zalezy od kolejnosci wejscia', () => {
    expect(nextVersion([3, 1, 2])).toBe(4);
  });
});

describe('groupByLineage', () => {
  const row = (id: string, lineageId: string, version: number) => ({ id, lineageId, version });

  it('linia jednowersyjna nie ma starszych wersji', () => {
    const groups = groupByLineage([row('a', 'L1', 1)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.latest.id).toBe('a');
    expect(groups[0]?.older).toEqual([]);
  });

  it('wierszem glownym jest NAJNOWSZA wersja, niezaleznie od kolejnosci wejscia', () => {
    const groups = groupByLineage([row('v1', 'L1', 1), row('v3', 'L1', 3), row('v2', 'L1', 2)]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.latest.id).toBe('v3');
    expect(groups[0]?.older.map((r) => r.id)).toEqual(['v2', 'v1']);
  });

  it('rozne linie zostaja osobno', () => {
    const groups = groupByLineage([row('a', 'L1', 1), row('b', 'L2', 1), row('c', 'L1', 2)]);
    expect(groups).toHaveLength(2);
  });

  it('zachowuje kolejnosc linii z wejscia — sortowanie robi baza', () => {
    const groups = groupByLineage([row('b', 'L2', 1), row('a', 'L1', 1)]);
    expect(groups.map((g) => g.lineageId)).toEqual(['L2', 'L1']);
  });

  it('pusta lista daje pusta liste grup', () => {
    expect(groupByLineage([])).toEqual([]);
  });
});
