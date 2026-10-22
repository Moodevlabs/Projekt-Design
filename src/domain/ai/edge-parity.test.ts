import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRICING_CHOICES } from '../library/units';
import {
  AI_ACTIONS,
  AI_RESULT_SCHEMAS,
  BriefProposalSchema,
  CommentChangesSchema,
  LibraryImportItemSchema,
  LibraryImportProposalSchema,
  PolishedTextSchema,
} from './schema';

/**
 * Parytet schematów między domeną a funkcją brzegową `ai`.
 *
 * `supabase/functions/ai/schemas.ts` to świadoma kopia (Deno nie importuje
 * `src/`). Rozjazd znaczyłby, że model odpowiada w kształcie, którego
 * `ai.repo` odrzuci jako `invalid_output` — a użytkownik zobaczy błąd, mimo
 * że model zrobił, co kazano. Test czyta plik Deno jako tekst i porównuje:
 * nazwy akcji, klucze najwyższego poziomu każdego schematu wyjścia i listę
 * sposobów wyceny.
 */
const FUNCTIONS_DIR = resolve(import.meta.dirname, '../../../supabase/functions/ai');
const edgeSchemas = readFileSync(resolve(FUNCTIONS_DIR, 'schemas.ts'), 'utf8');
const edgeActions = readFileSync(resolve(FUNCTIONS_DIR, 'actions/index.ts'), 'utf8');

/** Klucze `z.object({ … })` nazwanego `export const <name> = z.object({` — tylko pierwszy poziom. */
function topLevelKeys(source: string, name: string): string[] {
  const start = source.indexOf(`export const ${name} = z.object({`);
  expect(start, `${name} w schemas.ts`).toBeGreaterThanOrEqual(0);

  const keys: string[] = [];
  let depth = 0;
  let index = source.indexOf('{', start);
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{' || char === '(' || char === '[') depth += 1;
    if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      if (depth === 0) break;
    }
    // Klucz pierwszego poziomu: na głębokości 1, na początku linii.
    if (depth === 1 && char === '\n') {
      const line = source.slice(index + 1, source.indexOf('\n', index + 1)).trim();
      const match = /^([a-zA-Z]+):/.exec(line);
      if (match) keys.push(match[1]!);
    }
  }
  return keys;
}

function domainKeys(schema: { shape: Record<string, unknown> }): string[] {
  return Object.keys(schema.shape);
}

describe('parytet domena ↔ funkcja brzegowa ai', () => {
  it('rejestr akcji ma te same nazwy co AI_ACTIONS', () => {
    for (const action of AI_ACTIONS) {
      expect(edgeActions, action).toContain(`'${action}':`);
    }
    expect(Object.keys(AI_RESULT_SCHEMAS)).toEqual([...AI_ACTIONS]);
  });

  it.each([
    ['LibraryImportProposalSchema', LibraryImportProposalSchema],
    ['BriefProposalSchema', BriefProposalSchema],
    ['CommentChangesSchema', CommentChangesSchema],
    ['PolishedTextSchema', PolishedTextSchema],
  ] as const)('%s ma te same klucze po obu stronach', (name, schema) => {
    expect(topLevelKeys(edgeSchemas, name)).toEqual(domainKeys(schema));
  });

  it('sposoby wyceny w Deno = PRICING_CHOICES', () => {
    const start = edgeSchemas.indexOf('export const PRICING_CHOICE_IDS = [');
    const end = edgeSchemas.indexOf('] as const', start);
    const ids = [...edgeSchemas.slice(start, end).matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
    expect(ids).toEqual(PRICING_CHOICES.map((choice) => choice.id));
  });

  it('pozycja importu ma te same pola w obu kopiach', () => {
    const itemStart = edgeSchemas.indexOf('items: z.array(\n    z.object({', 0);
    const itemBlock = edgeSchemas.slice(itemStart, edgeSchemas.indexOf('}),\n  ),', itemStart));
    const edgeItemKeys = [...itemBlock.matchAll(/^\s{6}([a-zA-Z]+):/gm)].map((m) => m[1]);
    expect(edgeItemKeys).toEqual(domainKeys(LibraryImportItemSchema));
  });
});
