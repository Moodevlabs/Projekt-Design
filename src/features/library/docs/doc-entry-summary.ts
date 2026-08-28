import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { formatMoneyRange } from '@/domain/money';
import { pl } from '@/i18n/pl';

/**
 * Jedna linijka pod nazwą wpisu — to, co odróżnia go od sąsiadów.
 *
 * Czysta funkcja (bez React), żeby ten sam opis mógł stanąć w wierszu
 * biblioteki i w panelu „Dodaj z biblioteki" w edytorze (T-103).
 */
export function docEntrySummary<K extends DocLibraryKind>(
  kind: K,
  payload: DocLibraryPayloadByKind[K],
): string {
  switch (kind) {
    case 'schedule': {
      const p = payload as DocLibraryPayloadByKind['schedule'];
      const owner =
        p.owner === 'client' ? pl.editor.stageOwnerClient : pl.editor.stageOwnerProvider;
      const parts = [owner, `${p.baseDays} ${pl.library.docs.summary.days}`];
      if (p.roomScope !== 'none') {
        // Etap liczony z pomieszczen ma to POWIEDZIEC, nawet gdy stawka
        // domyslna to 0 — inaczej wpis z samymi stawkami per typ wygladalby
        // jak „cały projekt".
        const overrides = Object.keys(p.perRoomDays).length;
        parts.push(
          `+${p.defaultPerRoomDays} ${pl.library.docs.summary.perRoom}` +
            (overrides > 0 ? ` (${pl.library.docs.summary.overrides(overrides)})` : ''),
        );
      }
      return parts.join(' · ');
    }
    case 'stages': {
      const p = payload as DocLibraryPayloadByKind['stages'];
      return [p.sectionLabel, p.description].filter(Boolean).join(' · ');
    }
    default: {
      const p = payload as DocLibraryPayloadByKind['price_list'];
      const price = formatMoneyRange(p.priceMinCents, p.priceMaxCents, p.unit);
      return [p.sectionLabel, price, p.leadTime].filter(Boolean).join(' · ');
    }
  }
}
