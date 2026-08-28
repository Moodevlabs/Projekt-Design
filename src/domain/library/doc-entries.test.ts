import { describe, expect, it } from 'vitest';
import {
  DOC_LIBRARY_KINDS,
  builtInDocLibrary,
  emptyDocLibraryPayload,
  parseDocLibraryPayload,
} from './doc-entries';
import { newStage } from '../schedule/defaults';
import { newStageEntry } from '../documents/stages-defaults';
import { newPriceListItem } from '../documents/price-list';

describe('biblioteka dokumentów (T-102)', () => {
  it('wbudowany szablon każdego rodzaju jest niepusty i parsuje się bez strat', () => {
    for (const kind of DOC_LIBRARY_KINDS) {
      const entries = builtInDocLibrary(kind);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(parseDocLibraryPayload(kind, entry)).toEqual(entry);
      }
    }
  });

  it('wbudowany szablon to kopia — edycja nie rusza źródła', () => {
    const a = builtInDocLibrary('stages');
    a[0]!.name = 'ZMIENIONE';
    expect(builtInDocLibrary('stages')[0]!.name).not.toBe('ZMIENIONE');
  });

  it('payload wstawia się do dokumentu bez mapowania (kształt = szablon pozycji)', () => {
    const [stage] = builtInDocLibrary('schedule');
    const [entry] = builtInDocLibrary('stages');
    const [item] = builtInDocLibrary('price_list');

    expect(newStage(stage).name).toBe(stage!.name);
    expect(newStageEntry(entry).description).toBe(entry!.description);
    expect(newPriceListItem(item).priceMinCents).toBe(item!.priceMinCents);
  });

  it('uszkodzony payload daje null, nie wyjątek', () => {
    expect(parseDocLibraryPayload('schedule', { owner: 'nikt' })).toBeNull();
    expect(parseDocLibraryPayload('price_list', { priceMinCents: -5 })).toBeNull();
  });

  it('brak payloadu (stary zapis) to poprawny, pusty wpis', () => {
    expect(parseDocLibraryPayload('stages', null)).not.toBeNull();
  });

  it('pusty wpis ma nazwę i sensowne wartości domyślne', () => {
    expect(emptyDocLibraryPayload('price_list', 'Panorama').name).toBe('Panorama');
    expect(emptyDocLibraryPayload('schedule', 'Etap').owner).toBe('provider');
    expect(emptyDocLibraryPayload('stages', 'X').included).toBe(true);
  });
});
