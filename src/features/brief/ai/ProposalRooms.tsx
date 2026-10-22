import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BriefProposalRoom } from '@/domain/ai';
import { pl } from '@/i18n/pl';

/**
 * Pomieszczenia z propozycji — lista do poprawienia, nie do czytania.
 *
 * Etykieta i ilość w polach, bo to właśnie te dwie rzeczy model myli
 * najczęściej („Pokój ×3" zamiast trzech różnych). Typ pomieszczenia nie ma
 * tu kontrolki: w edytorze wyceny jest pełny selekt ze słownika, a tutaj
 * chodzi o szybkie „tak, mniej więcej" przed utworzeniem dokumentu.
 */
export function ProposalRooms({
  rooms,
  onChange,
  onRemove,
  onAdd,
}: {
  rooms: BriefProposalRoom[];
  onChange: (index: number, patch: Partial<BriefProposalRoom>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-caps text-ink-soft">{pl.ai.brief.rooms}</h3>
        <Button type="button" size="xs" variant="ghost" onClick={onAdd}>
          <Plus aria-hidden />
          {pl.ai.brief.addRoom}
        </Button>
      </div>

      {rooms.length === 0 ? (
        <p className="text-ink-soft mt-2 text-sm">{pl.ai.brief.noRooms}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rooms.map((room, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                value={room.label}
                aria-label={pl.ai.brief.roomLabel}
                placeholder={pl.ai.brief.roomLabel}
                onChange={(event) => onChange(index, { label: event.target.value })}
                className="h-8 flex-1"
              />
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={room.qty}
                aria-label={pl.ai.brief.roomQty}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  onChange(index, { qty: Number.isFinite(next) && next > 0 ? next : 1 });
                }}
                className="tabular h-8 w-16 text-right"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={pl.ai.brief.removeRoom(room.label || pl.ai.brief.roomLabel)}
                onClick={() => onRemove(index)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
