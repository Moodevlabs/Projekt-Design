import { describe, expect, it } from 'vitest';
import {
  defaultStageEntries,
  groupStageEntries,
  newStageEntry,
  newStagesDoc,
  parseQuoteDocuments,
  StagesDocSchema,
} from './index';

describe('szablon etapów współpracy', () => {
  it('ma 19 etapów w pięciu częściach — parytet strukturalny z arkuszem', () => {
    const entries = defaultStageEntries();
    expect(entries).toHaveLength(19);
    expect(groupStageEntries(entries)).toHaveLength(5);
  });

  it('każdy etap ma świeży identyfikator', () => {
    const a = defaultStageEntries();
    const b = defaultStageEntries();
    const wszystkie = new Set([...a, ...b].map((entry) => entry.id));
    expect(wszystkie.size).toBe(38);
  });

  it('etapy poza standardowym zakresem startują odznaczone', () => {
    // Nadzór i kompletacja to osobne umowy — dokument ma o tym mówić wprost,
    // a nie milczeć, dopóki inwestor sam nie zapyta.
    const poza = defaultStageEntries().filter((entry) => !entry.included);
    expect(poza.length).toBeGreaterThan(0);
    expect(poza.every((entry) => entry.sectionLabel === 'Nadzór i realizacja')).toBe(true);
  });

  it('szablon workspace nadpisuje domyślny', () => {
    const doc = newStagesDoc({}, [
      {
        name: 'Mój etap',
        description: '',
        included: true,
        sectionLabel: '',
        linkedItemTags: [],
      },
    ]);
    expect(doc.entries).toHaveLength(1);
    expect(doc.entries[0]?.name).toBe('Mój etap');
  });

  it('domyślna ważność to 14 dni', () => {
    expect(newStagesDoc().validDays).toBe(14);
  });
});

describe('groupStageEntries', () => {
  it('zachowuje kolejność pierwszego wystąpienia nagłówka', () => {
    const grupy = groupStageEntries([
      newStageEntry({ sectionLabel: 'B', name: 'b1' }),
      newStageEntry({ sectionLabel: 'A', name: 'a1' }),
      newStageEntry({ sectionLabel: 'B', name: 'b2' }),
    ]);

    expect(grupy.map((g) => g.label)).toEqual(['B', 'A']);
    expect(grupy[0]?.entries.map((e) => e.name)).toEqual(['b1', 'b2']);
  });
});

describe('newStageEntry — odporność na obiekt zdarzenia', () => {
  it('nie wpuszcza pól spoza schematu, gdy akcję podepnie się pod onClick', () => {
    // Ten sam wypadek co przy pomieszczeniach: `onClick={addEntry}` wsypuje
    // SyntheticEvent do dokumentu, a ten ma cykliczne referencje do DOM-u
    // i wywraca JSON.stringify przy zapisie.
    const zdarzenie = { target: {}, currentTarget: {}, nativeEvent: {}, type: 'click' };
    const entry = newStageEntry(zdarzenie as never);

    expect(() => JSON.stringify(entry)).not.toThrow();
    expect(Object.keys(entry).sort()).toEqual(
      ['description', 'id', 'included', 'linkedItemTags', 'name', 'sectionLabel'].sort(),
    );
  });

  it('czyta wymienione pola', () => {
    const entry = newStageEntry({ name: 'Nadzór', included: false, sectionLabel: 'X' });
    expect(entry.name).toBe('Nadzór');
    expect(entry.included).toBe(false);
    expect(entry.sectionLabel).toBe('X');
  });
});

describe('parseQuoteDocuments', () => {
  it('null i undefined znaczą „brak dokumentów" i są poprawne', () => {
    expect(parseQuoteDocuments(null)).toBeNull();
    expect(parseQuoteDocuments(undefined)).toBeNull();
  });

  it('zepsuty zapis nie blokuje wyceny', () => {
    // Miękko, jak `schedule`: dokument towarzyszący nie ma prawa zamknąć
    // dostępu do oferty.
    expect(parseQuoteDocuments({ stages: { validDays: 'dużo' } })).toBeNull();
  });

  it('czyta poprawny dokument', () => {
    const doc = StagesDocSchema.parse({ entries: [], validDays: 30, footnote: 'Uwaga' });
    const parsed = parseQuoteDocuments({ stages: doc });
    expect(parsed?.stages?.validDays).toBe(30);
    expect(parsed?.stages?.footnote).toBe('Uwaga');
  });
});
