import { describe, expect, it } from 'vitest';
import {
  availableDocs,
  packageFileName,
  packagePlan,
  PACKAGE_ORDER,
  type PackageContents,
} from './package-plan';

const PELNY: PackageContents = { hasSchedule: true, hasStages: true, hasPriceList: true };
const PUSTY: PackageContents = { hasSchedule: false, hasStages: false, hasPriceList: false };

describe('availableDocs', () => {
  it('wycena jest zawsze — bez niej nie ma pakietu', () => {
    expect(availableDocs(PUSTY)).toEqual(['quote']);
  });

  it('pokazuje tylko dokumenty, które wycena naprawdę ma', () => {
    expect(availableDocs({ ...PUSTY, hasStages: true })).toEqual(['quote', 'stages']);
  });

  it('zachowuje kolejność czytania pakietu', () => {
    expect(availableDocs(PELNY)).toEqual(PACKAGE_ORDER);
  });
});

describe('packagePlan', () => {
  it('układa wybrane dokumenty w kolejności pakietu, nie zaznaczania', () => {
    const plan = packagePlan(
      ['priceList', 'quote', 'schedule'],
      PELNY,
      'WYC/2026/08/0001',
      'Kowalski',
    );
    expect(plan.map((part) => part.kind)).toEqual(['quote', 'schedule', 'priceList']);
  });

  it('ignoruje zaznaczenie dokumentu, którego wycena nie ma', () => {
    // Stan dialogu nie ma prawa wymusic renderu czegos, czego nie ma.
    const plan = packagePlan(['quote', 'stages'], PUSTY, 'WYC/1', 'Kowalski');
    expect(plan.map((part) => part.kind)).toEqual(['quote']);
  });

  it('nic nie zaznaczono — nie ma czego eksportować', () => {
    expect(packagePlan([], PELNY, 'WYC/1', 'Kowalski')).toEqual([]);
  });

  it('każdy dokument ma inną nazwę pliku', () => {
    const plan = packagePlan(PACKAGE_ORDER, PELNY, 'WYC/2026/08/0001', 'Kowalski');
    const nazwy = plan.map((part) => part.fileName);
    expect(new Set(nazwy).size).toBe(nazwy.length);
    expect(nazwy).toEqual([
      'wyc-2026-08-0001-kowalski.pdf',
      'wyc-2026-08-0001-termin.pdf',
      'wyc-2026-08-0001-etapy.pdf',
      'wyc-2026-08-0001-cennik.pdf',
    ]);
  });
});

describe('packageFileName', () => {
  it('scalony pakiet ma własny przyrostek', () => {
    expect(packageFileName('WYC/2026/08/0001')).toBe('wyc-2026-08-0001-pakiet.pdf');
  });

  it('bez numeru daje sensowną nazwę', () => {
    expect(packageFileName(null)).toBe('wycena-pakiet.pdf');
  });

  it('nie zderza się z nazwą samej wyceny', () => {
    const plan = packagePlan(['quote'], PUSTY, 'WYC/1', 'Kowalski');
    expect(packageFileName('WYC/1')).not.toBe(plan[0]?.fileName);
  });
});
