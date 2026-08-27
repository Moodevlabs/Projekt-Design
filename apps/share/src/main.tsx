import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/faculty-glyphic';
import '@fontsource-variable/inter';

import { Root } from './Root';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Brak #root');

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
