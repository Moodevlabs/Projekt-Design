import { describe, expect, it } from 'vitest';

import {
  addQuestion,
  createQuestion,
  createSection,
  isTemplateUsable,
  moveItem,
  moveQuestion,
  moveSection,
  removeQuestion,
  removeSection,
  templateProblems,
  updateQuestion,
  updateSection,
} from './editor';
import { DEFAULT_BRIEF_TEMPLATE } from './template';
import type { BriefTemplate } from './schema';

const template = (): BriefTemplate => [
  {
    id: 'obiekt',
    title: 'Obiekt',
    hint: '',
    questions: [
      {
        id: 'obiekt.metraz',
        label: 'Metraż',
        kind: 'number',
        hint: '',
        placeholder: '',
        options: [],
        required: true,
      },
      {
        id: 'obiekt.adres',
        label: 'Adres',
        kind: 'text',
        hint: '',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
];

describe('moveItem', () => {
  it('przesuwa element na wskazaną pozycję', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('zwraca listę bez zmian, gdy cel wykracza poza zakres', () => {
    // „W górę” w pierwszym wierszu ma nic nie robić, a nie zawijać na koniec.
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });

  it('nie modyfikuje listy wejściowej', () => {
    const input = ['a', 'b'];
    moveItem(input, 0, 1);
    expect(input).toEqual(['a', 'b']);
  });
});

describe('tworzenie pozycji', () => {
  it('nadaje sekcji identyfikator wolny w obrębie szablonu', () => {
    const first = createSection([]);
    const second = createSection([first]);
    expect(first.id).toBe('sekcja');
    expect(second.id).toBe('sekcja.2');
  });

  it('wyprowadza identyfikator pytania z sekcji i unika kolizji', () => {
    let current = template();
    const first = createQuestion(current, 'obiekt');
    expect(first.id).toBe('obiekt.pytanie');

    current = addQuestion(current, 'obiekt');
    const second = createQuestion(current, 'obiekt');
    expect(second.id).toBe('obiekt.pytanie.2');
  });

  it('dokłada pytanie na koniec wskazanej sekcji', () => {
    const next = addQuestion(template(), 'obiekt');
    expect(next[0]?.questions).toHaveLength(3);
    expect(next[0]?.questions[2]?.label).toBe('');
  });
});

describe('operacje na strukturze', () => {
  it('zmienia pola sekcji bez ruszania pytań', () => {
    const next = updateSection(template(), 'obiekt', { title: 'Inwestycja' });
    expect(next[0]?.title).toBe('Inwestycja');
    expect(next[0]?.questions).toHaveLength(2);
  });

  it('zmienia pola pytania, zostawiając identyfikator', () => {
    const next = updateQuestion(template(), 'obiekt', 'obiekt.metraz', {
      label: 'Powierzchnia użytkowa',
      required: false,
    });
    expect(next[0]?.questions[0]?.id).toBe('obiekt.metraz');
    expect(next[0]?.questions[0]?.label).toBe('Powierzchnia użytkowa');
    expect(next[0]?.questions[0]?.required).toBe(false);
  });

  it('zachowuje opcje przy zmianie rodzaju pola', () => {
    // Powrót do „wybór” po przypadkowym przełączeniu ma przywrócić warianty.
    const withOptions = updateQuestion(template(), 'obiekt', 'obiekt.adres', {
      kind: 'choice',
      options: ['A', 'B'],
    });
    const asText = updateQuestion(withOptions, 'obiekt', 'obiekt.adres', { kind: 'text' });
    expect(asText[0]?.questions[1]?.options).toEqual(['A', 'B']);
  });

  it('usuwa pytanie i sekcję', () => {
    expect(removeQuestion(template(), 'obiekt', 'obiekt.adres')[0]?.questions).toHaveLength(1);
    expect(removeSection(template(), 'obiekt')).toHaveLength(0);
  });

  it('przesuwa pytanie w obrębie sekcji', () => {
    const next = moveQuestion(template(), 'obiekt', 'obiekt.adres', -1);
    expect(next[0]?.questions.map((q) => q.id)).toEqual(['obiekt.adres', 'obiekt.metraz']);
  });

  it('ignoruje przesunięcie sekcji poza zakres', () => {
    const next = moveSection(template(), 'obiekt', -1);
    expect(next.map((section) => section.id)).toEqual(['obiekt']);
  });
});

describe('templateProblems', () => {
  it('wbudowany szablon jest gotowy do wystawienia', () => {
    expect(templateProblems(DEFAULT_BRIEF_TEMPLATE)).toEqual([]);
    expect(isTemplateUsable(DEFAULT_BRIEF_TEMPLATE)).toBe(true);
  });

  it('zgłasza pusty szablon', () => {
    expect(templateProblems([])).toHaveLength(1);
  });

  it('zgłasza pytanie bez treści i sekcję bez pytań', () => {
    const broken: BriefTemplate = [
      { id: 'a', title: 'A', hint: '', questions: [] },
      {
        id: 'b',
        title: 'B',
        hint: '',
        questions: [
          {
            id: 'b.1',
            label: '  ',
            kind: 'text',
            hint: '',
            placeholder: '',
            options: [],
            required: false,
          },
        ],
      },
    ];
    expect(templateProblems(broken)).toHaveLength(2);
    expect(isTemplateUsable(broken)).toBe(false);
  });

  it('zgłasza pytanie wyboru z jedną opcją', () => {
    const broken: BriefTemplate = [
      {
        id: 'a',
        title: 'A',
        hint: '',
        questions: [
          {
            id: 'a.1',
            label: 'Rodzaj',
            kind: 'choice',
            hint: '',
            placeholder: '',
            options: ['Mieszkanie'],
            required: false,
          },
        ],
      },
    ];
    expect(templateProblems(broken)).toHaveLength(1);
  });

  it('zgłasza powtórzony identyfikator pytania', () => {
    // Powtórka znaczy, że dwa pytania dzielą jedną odpowiedź — cichy błąd
    // widoczny dopiero w odpowiedziach klienta.
    const duplicated: BriefTemplate = [
      {
        id: 'a',
        title: 'A',
        hint: '',
        questions: [
          {
            id: 'x',
            label: 'Pierwsze',
            kind: 'text',
            hint: '',
            placeholder: '',
            options: [],
            required: false,
          },
        ],
      },
      {
        id: 'b',
        title: 'B',
        hint: '',
        questions: [
          {
            id: 'x',
            label: 'Drugie',
            kind: 'text',
            hint: '',
            placeholder: '',
            options: [],
            required: false,
          },
        ],
      },
    ];
    expect(templateProblems(duplicated).some((problem) => problem.includes('powtarza'))).toBe(true);
  });
});
