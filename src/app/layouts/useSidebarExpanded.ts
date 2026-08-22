import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anzorge:sidebar-expanded';

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // Prywatne okno albo zablokowane dane witryny — trudno, startujemy zwinięci.
    return false;
  }
}

/** Stan rozwinięcia sidebara, zapamiętywany między uruchomieniami. */
export function useSidebarExpanded() {
  const [expanded, setExpanded] = useState(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0');
    } catch {
      // Zapamiętanie preferencji to wygoda, nie funkcja — cisza jest OK.
    }
  }, [expanded]);

  const toggle = useCallback(() => setExpanded((value) => !value), []);

  return { expanded, toggle };
}
