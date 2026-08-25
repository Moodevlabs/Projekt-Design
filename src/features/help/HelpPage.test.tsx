import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpPage } from './HelpPage';
import { helpPl } from '@/i18n/help.pl';

describe('HelpPage — poradnik (T-73)', () => {
  it('renderuje kazda sekcje z naglowkiem i kotwica ze spisu tresci', () => {
    render(<HelpPage />);

    for (const section of helpPl.sections) {
      expect(screen.getByRole('heading', { level: 2, name: section.title })).toBeInTheDocument();
      expect(document.getElementById(section.id)).not.toBeNull();
    }
    const toc = screen.getByRole('navigation', { name: helpPl.tocLabel });
    expect(toc.querySelectorAll('a')).toHaveLength(helpPl.sections.length);
  });

  it('pokrywa wszystkie obszary aplikacji — brak sekcji to dziura w poradniku', () => {
    const ids = helpPl.sections.map((section) => section.id);
    for (const required of [
      'start',
      'clients',
      'quote',
      'status',
      'schedule',
      'documents',
      'pdf',
      'library',
      'templates',
      'files',
      'settings',
      'billing',
      'keys',
      'faq',
    ]) {
      expect(ids).toContain(required);
    }
  });

  it('szybkie linki prowadza do istniejacych sekcji', () => {
    const ids = new Set(helpPl.sections.map((section) => section.id));
    for (const link of helpPl.quick) expect(ids.has(link.target)).toBe(true);
  });
});
