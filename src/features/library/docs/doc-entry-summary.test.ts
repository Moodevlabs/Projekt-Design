import { describe, expect, it } from 'vitest';
import { docEntrySummary } from './doc-entry-summary';
import { emptyDocLibraryPayload } from '@/domain/library/doc-entries';

describe('docEntrySummary — etap terminu', () => {
  it('etap zależny od pomieszczeń mówi o tym nawet przy stawce domyślnej 0', () => {
    // Wpis z samymi stawkami per typ wyglądałby inaczej jak „cały projekt".
    const payload = {
      ...emptyDocLibraryPayload('schedule', 'Wizualizacje'),
      roomScope: 'visual' as const,
      baseDays: 1,
      defaultPerRoomDays: 0,
      perRoomDays: { kuchnia: 2, salon: 1.5 },
    };
    const text = docEntrySummary('schedule', payload);
    expect(text).toContain('+0');
    expect(text).toContain('2 własne stawki');
  });

  it('etap niezależny od pomieszczeń nie udaje, że je liczy', () => {
    const payload = { ...emptyDocLibraryPayload('schedule', 'Spotkania'), baseDays: 3 };
    expect(docEntrySummary('schedule', payload)).not.toContain('za pomieszczenie');
  });
});
