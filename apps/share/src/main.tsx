import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/faculty-glyphic';
import '@fontsource-variable/inter';

import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Brak #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
