import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { SchedulePdfDocument } from './SchedulePdfDocument';
import {
  printableRooms,
  printableStages,
  projectStages,
  roomHeading,
  roomStages,
  stageCoversRoom,
  stageRoomDays,
} from './schedule-content';
import { scheduleFileName } from './file-name';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newScheduleBody, ScheduleStageSchema, type ScheduleStage } from '@/domain/schedule';
import type { Room } from '@/domain/quote';

function stage(partial: Partial<ScheduleStage> & { name: string }): ScheduleStage {
  return ScheduleStageSchema.parse({
    id: `00000000-0000-4000-8000-0000000000${String(partial.name.length).padStart(2, '0')}`,
    owner: 'provider',
    ...partial,
  });
}

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: `r-${partial.label}`,
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

const KUCHNIA = room({ label: 'Kuchnia', roomTypeId: 'rt-kuchnia' });
const SALON = room({ label: 'Salon', qty: 2 });
const TYLKO_TECH = room({ label: 'Garaż', includedInVisual: false });
const POMINIETE = room({ label: 'Strych', includedInVisual: false, includedInTechnical: false });

describe('schedule-content — co wchodzi do dokumentu', () => {
  const schedule = newScheduleBody({
    stages: [
      stage({ name: 'Wizualizacje', roomScope: 'visual', defaultPerRoomDays: 2 }),
      stage({ name: 'Teczka', roomScope: 'none', baseDays: 3 }),
      stage({ name: 'Wyłączony', roomScope: 'all', defaultPerRoomDays: 5, enabled: false }),
      stage({ name: 'Zerowy', roomScope: 'none', baseDays: 0 }),
    ],
  });

  const rooms = [KUCHNIA, SALON];

  it('pomija etapy wyłączone i takie, które dają zero dni', () => {
    // Etap bez czasu w dokumencie terminu to wiersz o niczym.
    const nazwy = printableStages(schedule, rooms).map((s) => s.name);
    expect(nazwy).toEqual(['Wizualizacje', 'Teczka']);
  });

  it('MACIERZ bierze tylko etapy zależne od pomieszczeń', () => {
    /*
     * Kolumna dla etapu liczonego na caly projekt mialaby w kazdym wierszu to
     * samo — nie niosłaby informacji, a zabierala szerokosc, ktorej na A4 nie
     * ma w nadmiarze.
     */
    expect(roomStages(schedule, rooms).map((s) => s.name)).toEqual(['Wizualizacje']);
    expect(projectStages(schedule, rooms).map((s) => s.name)).toEqual(['Teczka']);
  });

  it('pomieszczenie odznaczone w OBU częściach nie trafia do dokumentu', () => {
    // Jego wiersz bylby pasem mysinikow — informacja, ze czegos nie ma.
    expect(printableRooms([KUCHNIA, POMINIETE]).map((r) => r.label)).toEqual(['Kuchnia']);
  });
});

describe('schedule-content — znaczniki i dni', () => {
  const wizualizacje = stage({ name: 'Wizualizacje', roomScope: 'visual', defaultPerRoomDays: 2 });
  const techniczne = stage({
    name: 'Rysunki',
    roomScope: 'technical',
    perRoomDays: { 'rt-kuchnia': 3 },
    defaultPerRoomDays: 1,
  });

  it('zasięg decyduje o ✓ albo —', () => {
    expect(stageCoversRoom(wizualizacje, KUCHNIA)).toBe(true);
    expect(stageCoversRoom(wizualizacje, TYLKO_TECH)).toBe(false);
    expect(stageCoversRoom(techniczne, TYLKO_TECH)).toBe(true);
  });

  it('etap niezależny od pomieszczeń nie obejmuje żadnego', () => {
    expect(stageCoversRoom(stage({ name: 'Teczka', roomScope: 'none' }), KUCHNIA)).toBe(false);
  });

  it('stawka per typ bije domyślną, a pomieszczenie poza zasięgiem daje zero', () => {
    expect(stageRoomDays(techniczne, KUCHNIA)).toBe(3);
    expect(stageRoomDays(techniczne, SALON)).toBe(1);
    expect(stageRoomDays(wizualizacje, TYLKO_TECH)).toBe(0);
  });

  it('krotność pokazujemy przy nazwie', () => {
    expect(roomHeading(SALON, 'Pomieszczenie')).toBe('Salon ×2');
    expect(roomHeading(KUCHNIA, 'Pomieszczenie')).toBe('Kuchnia');
    expect(roomHeading(room({ label: '' }), 'Pomieszczenie')).toBe('Pomieszczenie');
  });
});

/**
 * Render sprawdzamy na to, ze dokument SIE SKLADA i wychodzi z niego poprawny
 * plik. Tresci szukamy w czystych funkcjach wyzej — `@react-pdf` renderuje do
 * binarnego PDF-a, wiec `toContain('Kuchnia')` na bajtach jest testem, ktory
 * nic nie znaczy (pulapka z T-13).
 */
async function render(rooms: Room[], startDate: string | null = '2026-06-01') {
  const schedule = newScheduleBody({
    startDate,
    stages: [
      stage({ name: 'Wizualizacje', roomScope: 'visual', defaultPerRoomDays: 2 }),
      stage({ name: 'Rysunki', roomScope: 'technical', defaultPerRoomDays: 1.5 }),
      stage({ name: 'Teczka', roomScope: 'none', baseDays: 2 }),
      stage({ name: 'Decyzje', roomScope: 'none', baseDays: 4, owner: 'client' }),
    ],
  });

  return renderToBuffer(
    <SchedulePdfDocument
      schedule={schedule}
      rooms={rooms}
      theme={buildPdfTheme(defaultBrandKit())}
      brandKit={defaultBrandKit()}
      number="WYC/2026/08/0001"
      issueDate="2026-08-01"
      validDays={7}
    />,
  );
}

describe('SchedulePdfDocument — render', () => {
  it('składa dokument z macierzą pomieszczeń', async () => {
    const bytes = await render([KUCHNIA, SALON, TYLKO_TECH]);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('A4 przyjmuje 18 pomieszczeń', async () => {
    // Kryterium odbioru F5.3. Wiersze maja `wrap={false}`, wiec przy przejsciu
    // na druga strone zaden nie peka w polowie.
    const duzo = Array.from({ length: 18 }, (_, i) => room({ label: `Pomieszczenie ${i + 1}` }));
    const bytes = await render(duzo);

    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('składa się BEZ pomieszczeń', async () => {
    // Wycena bez pomieszczen tez ma termin — same etapy calego projektu.
    const bytes = await render([]);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('składa się bez daty startu', async () => {
    const bytes = await render([KUCHNIA], null);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('scheduleFileName', () => {
  it('odróżnia się od pliku oferty', () => {
    // Pakiet dla jednego inwestora to kilka plikow o tym samym numerze —
    // bez rozroznienia drugi zapis nadpisalby pierwszy.
    expect(scheduleFileName('WYC/2026/08/0001')).toBe('wyc-2026-08-0001-termin.pdf');
  });

  it('wycena bez numeru też ma nazwę', () => {
    expect(scheduleFileName(null)).toBe('wycena-termin.pdf');
  });
});
