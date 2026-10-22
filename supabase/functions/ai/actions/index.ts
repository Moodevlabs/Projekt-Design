import { briefToQuote } from './brief-to-quote.ts';
import { commentsToChanges } from './comments-to-changes.ts';
import { importLibrary } from './import-library.ts';
import { polishText } from './polish-text.ts';

/**
 * Rejestr akcji. Klucze = `AI_ACTIONS` z `src/domain/ai/schema.ts`
 * (parytet pilnowany testem).
 */
export const ACTIONS = {
  'import-library': importLibrary,
  'brief-to-quote': briefToQuote,
  'comments-to-changes': commentsToChanges,
  'polish-text': polishText,
} as const;

export type ActionName = keyof typeof ACTIONS;

export function isActionName(value: unknown): value is ActionName {
  return typeof value === 'string' && value in ACTIONS;
}
