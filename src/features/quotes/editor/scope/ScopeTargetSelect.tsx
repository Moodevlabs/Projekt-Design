import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditorStore } from '../editor.store';
import { useScopePanel, type ScopeTarget } from './scope-panel.store';
import { pl } from '@/i18n/pl';

const SEP = '::';

function encode(target: ScopeTarget): string {
  return `${target.sectionId}${SEP}${target.groupId ?? ''}`;
}

function decode(value: string): ScopeTarget {
  const [sectionId = '', groupId = ''] = value.split(SEP);
  return { sectionId, groupId: groupId || null };
}

/**
 * „Dodaj do: Sekcja › Grupa”.
 *
 * Panel jest jeden na całą wycenę, więc cel musi być widoczny i zmienny bez
 * zamykania — inaczej dobranie usług do dwóch sekcji znaczyłoby dwa otwarcia.
 * Lista celów bierze się wprost z dokumentu: każda sekcja i każda jej grupa
 * (blok pomieszczenia nazywa się jak pomieszczenie, tak samo jak w dokumencie).
 */
export function ScopeTargetSelect() {
  const sections = useEditorStore((state) => state.body?.sections);
  const rooms = useEditorStore((state) => state.body?.rooms);
  const target = useScopePanel((state) => state.target);
  const setTarget = useScopePanel((state) => state.setTarget);

  const options = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    for (const section of sections ?? []) {
      const sectionName = section.title.trim() || pl.editor.newSectionName;
      list.push({
        value: encode({ sectionId: section.id, groupId: null }),
        label: pl.editor.scopeTargetLabel(sectionName, null),
      });
      for (const group of section.groups) {
        const room = group.roomId ? rooms?.find((r) => r.id === group.roomId) : null;
        const groupName = room
          ? pl.editor.roomBlockLabel(room.label || pl.editor.newRoomName, room.qty)
          : group.name.trim() || pl.editor.newGroupName;
        list.push({
          value: encode({ sectionId: section.id, groupId: group.id }),
          label: pl.editor.scopeTargetLabel(sectionName, groupName),
        });
      }
    }
    return list;
  }, [sections, rooms]);

  if (!target) return null;

  return (
    <Select value={encode(target)} onValueChange={(next) => setTarget(decode(next))}>
      <SelectTrigger className="h-9 w-full sm:w-[280px]" aria-label={pl.editor.scopeTarget}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
