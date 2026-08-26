import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
/*
 * Fonty MUSZĄ być importowane tutaj, a nie tylko wpisane w stos w `globals.css`.
 * Do T-74 pakiety `@fontsource*` stały w `package.json`, ale nikt ich nie
 * importował — żaden `@font-face` nie był rejestrowany, `'Inter Variable'`
 * nie rozwiązywało się do niczego i cała aplikacja renderowała się w
 * systemowym Segoe UI. Import idzie PRZED `globals.css`, żeby `@font-face`
 * był znany zanim pojawi się pierwsza reguła, która o niego prosi.
 */
import '@fontsource-variable/inter';
import '@fontsource/faculty-glyphic';
import '@/styles/globals.css';
import { App } from '@/app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Brak elementu #root w index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
