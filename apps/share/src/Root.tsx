import { useMemo } from 'react';

import { briefTokenFromPath } from '@/domain/brief';
import { tokenFromPath } from '@/domain/share/schema';

import { App } from './App';
import { BriefApp } from './BriefApp';

/**
 * Wybór strony po adresie (T-93, poprawka 9).
 *
 * ## Dlaczego bez routera
 *
 * Ta aplikacja ma dokładnie **dwa adresy**: `/q/{token}` (oferta) i
 * `/b/{token}` (brief). Router z pełnym drzewem tras dołożyłby ~10 kB
 * i warstwę abstrakcji do rozstrzygnięcia jednego `if` — a strona klienta ma
 * być lekka, bo otwiera się ją raz, często na telefonie, w drodze.
 *
 * Adres czytamy RAZ, przy montowaniu: nawigacji tu nie ma, więc nasłuch na
 * `popstate` też nie jest potrzebny.
 */
export function Root() {
  const path = window.location.pathname;
  const briefToken = useMemo(() => briefTokenFromPath(path), [path]);
  const quoteToken = useMemo(() => tokenFromPath(path), [path]);

  if (briefToken) return <BriefApp token={briefToken} />;

  // Oferta jest domyślna także dla adresu, którego nie rozpoznajemy: `App`
  // sam pokaże „ten link nie działa", i to jest właściwy komunikat dla kogoś,
  // kto wkleił połowę adresu.
  void quoteToken;
  return <App />;
}
