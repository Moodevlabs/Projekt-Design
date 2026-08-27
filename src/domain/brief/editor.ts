import { z } from 'zod';

import {
  BriefFieldKindSchema,
  BriefSectionSchema,
  BriefTemplateSchema,
  type BriefFieldKind,
  type BriefQuestion,
  type BriefSection,
  type BriefTemplate,
} from './schema';

/**
 * Edycja zestawu pytań briefu (T-96).
 *
 * ## Dlaczego czyste funkcje, a nie stan komponentu
 *
 * Edytor szablonu operuje na strukturze zagnieżdżonej (sekcje → pytania →
 * opcje) i wykonuje na niej cztery operacje: dodaj, usuń, przesuń, zmień pole.
 * Rozpisane wprost w komponencie zamieniają go w plik, w którym poprawka
 * jednej rzeczy psuje drugą. Tutaj są testowalne bez renderowania czegokolwiek.
 *
 * ## Reguła nadrzędna: identyfikator pytania jest nienaruszalny
 *
 * `question.id` wiąże pytanie z odpowiedzią (`client_briefs.answers`). Zmiana
 * treści pytania jest poprawką formularza; zmiana identyfikatora jest
 * skasowaniem odpowiedzi wszystkim, którzy już odpowiedzieli. Dlatego
 * identyfikatory nadajemy raz — przy tworzeniu pozycji — i nie udostępniamy
 * ich do edycji.
 */

/** Rekord tabeli `brief_templates` — formularz, nie dokument. */
export const BriefTemplateRecordSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  sections: BriefTemplateSchema.default([]),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BriefTemplateRecord = z.infer<typeof BriefTemplateRecordSchema>;

/** Rodzaje pól w kolejności, w jakiej pokazujemy je w edytorze. */
export const BRIEF_FIELD_KINDS: readonly BriefFieldKind[] = BriefFieldKindSchema.options;

/** Czy dany rodzaj pola w ogóle korzysta z listy opcji. */
export function kindUsesOptions(kind: BriefFieldKind): boolean {
  return kind === 'choice' || kind === 'multi';
}

/* -------------------------------------------------------------------------- */
/* Tworzenie pozycji                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Wolny identyfikator o zadanym rdzeniu.
 *
 * Numer doklejamy dopiero przy kolizji, żeby pierwsza sekcja nazywała się
 * `sekcja`, a nie `sekcja.1` — identyfikatory bywają oglądane w eksporcie
 * odpowiedzi i czytelność ma tam znaczenie.
 */
function freeId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}.${index}`)) index += 1;
  return `${base}.${index}`;
}

export function sectionIds(template: BriefTemplate): Set<string> {
  return new Set(template.map((section) => section.id));
}

export function questionIds(template: BriefTemplate): Set<string> {
  const ids = new Set<string>();
  for (const section of template) {
    for (const question of section.questions) ids.add(question.id);
  }
  return ids;
}

export function createSection(template: BriefTemplate, title = ''): BriefSection {
  return BriefSectionSchema.parse({
    id: freeId('sekcja', sectionIds(template)),
    title: title.trim() === '' ? 'Nowa sekcja' : title.trim(),
    hint: '',
    questions: [],
  });
}

/**
 * Nowe pytanie w obrębie sekcji.
 *
 * Identyfikator wyprowadzamy z identyfikatora sekcji (`obiekt.pytanie`), bo
 * przy przeglądaniu surowych odpowiedzi od razu widać, z którego bloku
 * pochodzi wartość.
 */
export function createQuestion(template: BriefTemplate, sectionId: string): BriefQuestion {
  return {
    id: freeId(`${sectionId}.pytanie`, questionIds(template)),
    label: '',
    kind: 'text',
    hint: '',
    placeholder: '',
    options: [],
    required: false,
  };
}

/* -------------------------------------------------------------------------- */
/* Operacje na strukturze                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Przeniesienie elementu listy. Indeks poza zakresem zwraca listę bez zmian —
 * przycisk „w górę” w pierwszym wierszu ma nic nie robić, a nie zawijać
 * pozycję na koniec.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...list];
  if (from < 0 || from >= list.length) return [...list];
  if (to < 0 || to >= list.length) return [...list];

  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return [...list];
  next.splice(to, 0, moved);
  return next;
}

export function updateSection(
  template: BriefTemplate,
  sectionId: string,
  patch: Partial<Omit<BriefSection, 'id' | 'questions'>>,
): BriefTemplate {
  return template.map((section) => (section.id === sectionId ? { ...section, ...patch } : section));
}

export function removeSection(template: BriefTemplate, sectionId: string): BriefTemplate {
  return template.filter((section) => section.id !== sectionId);
}

export function moveSection(
  template: BriefTemplate,
  sectionId: string,
  delta: number,
): BriefTemplate {
  const index = template.findIndex((section) => section.id === sectionId);
  if (index === -1) return template;
  return moveItem(template, index, index + delta);
}

export function addQuestion(template: BriefTemplate, sectionId: string): BriefTemplate {
  const question = createQuestion(template, sectionId);
  return template.map((section) =>
    section.id === sectionId
      ? { ...section, questions: [...section.questions, question] }
      : section,
  );
}

/**
 * Zmiana pola pytania.
 *
 * `id` jest świadomie wyłączony z typu łatki — patrz reguła nadrzędna w nagłówku.
 * Przy zmianie rodzaju pola na taki, który nie korzysta z opcji, listę opcji
 * ZOSTAWIAMY: powrót do `choice` po przypadkowym przełączeniu ma przywrócić
 * wpisane warianty, a nie kazać wpisywać je od nowa.
 */
export function updateQuestion(
  template: BriefTemplate,
  sectionId: string,
  questionId: string,
  patch: Partial<Omit<BriefQuestion, 'id'>>,
): BriefTemplate {
  return template.map((section) =>
    section.id !== sectionId
      ? section
      : {
          ...section,
          questions: section.questions.map((question) =>
            question.id === questionId ? { ...question, ...patch } : question,
          ),
        },
  );
}

export function removeQuestion(
  template: BriefTemplate,
  sectionId: string,
  questionId: string,
): BriefTemplate {
  return template.map((section) =>
    section.id !== sectionId
      ? section
      : { ...section, questions: section.questions.filter((q) => q.id !== questionId) },
  );
}

export function moveQuestion(
  template: BriefTemplate,
  sectionId: string,
  questionId: string,
  delta: number,
): BriefTemplate {
  return template.map((section) => {
    if (section.id !== sectionId) return section;
    const index = section.questions.findIndex((question) => question.id === questionId);
    if (index === -1) return section;
    return { ...section, questions: moveItem(section.questions, index, index + delta) };
  });
}

/* -------------------------------------------------------------------------- */
/* Walidacja przed zapisem                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Usterki, które czynią formularz bezużytecznym dla klienta.
 *
 * Zwracamy listę komunikatów, a nie `boolean`: projektant ma wiedzieć, które
 * pytanie wymaga uzupełnienia, a nie tylko że „coś jest nie tak”. Pusty wynik
 * oznacza szablon gotowy do wystawienia.
 *
 * Świadomie NIE zgłaszamy braku pytań wymaganych ani krótkich podpowiedzi:
 * to decyzje redakcyjne pracowni, nie błędy.
 */
export function templateProblems(template: BriefTemplate): string[] {
  const problems: string[] = [];
  const seenQuestionIds = new Set<string>();

  if (template.length === 0) {
    problems.push('Szablon nie zawiera żadnej sekcji.');
  }

  for (const section of template) {
    const where = section.title.trim() === '' ? `sekcja „${section.id}”` : `„${section.title}”`;

    if (section.title.trim() === '') {
      problems.push(`Sekcja ${section.id} nie ma tytułu.`);
    }
    if (section.questions.length === 0) {
      problems.push(`Sekcja ${where} nie zawiera pytań.`);
    }

    for (const question of section.questions) {
      if (question.label.trim() === '') {
        problems.push(`Sekcja ${where}: jedno z pytań nie ma treści.`);
      }
      if (kindUsesOptions(question.kind) && question.options.length < 2) {
        problems.push(
          `Pytanie „${question.label || question.id}” jest pytaniem wyboru i wymaga co najmniej dwóch opcji.`,
        );
      }
      if (seenQuestionIds.has(question.id)) {
        problems.push(`Identyfikator pytania „${question.id}” powtarza się w szablonie.`);
      }
      seenQuestionIds.add(question.id);
    }
  }

  return problems;
}

/** Czy szablon nadaje się do wystawienia klientowi. */
export function isTemplateUsable(template: BriefTemplate): boolean {
  return templateProblems(template).length === 0;
}
