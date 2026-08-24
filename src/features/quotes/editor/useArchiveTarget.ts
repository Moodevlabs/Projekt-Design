import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from './editor.store';
import { useWorkspaceId } from '@/data/queries/useWorkspace';
import type { ArchiveRequest } from '@/pdf/export';

/**
 * Czy i gdzie zapisać kopię eksportowanego PDF-u (T-56).
 *
 * Przełącznik jest **domyślnie włączony** i **ukryty**, gdy wycena nie ma
 * klienta — bez niego nie ma archiwum, do którego można by cokolwiek zapisać
 * (koncepcja §3 reguła 6). Stan żyje przez sesję edytora, nie w bazie:
 * to decyzja o pojedynczym eksporcie, a nie ustawienie konta.
 *
 * Wersja wyceny leci jako `null` do czasu T-57 — kolumna `quote_version`
 * istnieje od `0017`, ale numerów wersji jeszcze nie ma i wpisywanie tam
 * `1` na sztywno byłoby zgadywaniem.
 */
export function useArchiveTarget() {
  const workspaceId = useWorkspaceId();
  const { quoteId, clientId, projectId } = useEditorStore(
    useShallow((state) => ({
      quoteId: state.quoteId,
      clientId: state.clientId,
      projectId: state.projectId,
    })),
  );
  const [enabled, setEnabled] = useState(true);

  const available = Boolean(clientId && workspaceId);

  const target: ArchiveRequest | null =
    available && enabled
      ? {
          workspaceId: workspaceId as string,
          clientId: clientId as string,
          projectId,
          quoteId,
          quoteVersion: null,
        }
      : null;

  return { target, enabled, setEnabled, available };
}
