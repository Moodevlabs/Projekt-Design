import type { AiFileSource } from '@/domain/ai/payloads';
import { xlsxToText } from './xlsx-text';

/**
 * Plik z dysku → źródło dla asystenta AI (T-136, FEATURES-AI.md §1.1).
 *
 * Jedno miejsce decyduje, co z pliku jedzie do modelu i w jakiej postaci:
 * tekst jako tekst, PDF i obraz jako base64, Excel jako tekst wyciągnięty
 * lokalnie. Komponent dostaje gotowe źródło albo jeden z trzech powodów
 * odmowy — i tylko tłumaczy je na komunikat.
 */

/** Limit rozmiaru pliku wysyłanego do funkcji brzegowej. */
export const AI_FILE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Limit długości tekstu — ten sam, który funkcja brzegowa `ai` egzekwuje
 * w `FileSource` (`supabase/functions/ai/schemas.ts`). Sprawdzamy go tutaj,
 * zanim cokolwiek poleci do sieci: 20 MB pliku tekstowego to miliony znaków,
 * a model i tak ich nie przyjmie. Nie przycinamy po cichu — użytkownik ma
 * wiedzieć, że podzielić plik musi sam.
 */
export const AI_TEXT_MAX_CHARS = 200_000;

export type AiFileSourceErrorCode = 'unsupported' | 'too_large' | 'too_long' | 'docx';

export interface AiFileSourceError {
  error: AiFileSourceErrorCode;
  /** Rozszerzenie bez kropki, małymi literami — do komunikatu. */
  ext: string;
  /** Przy `too_long`: ile znaków ma tekst. */
  chars?: number;
}

const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'tsv', 'md']);
const IMAGE_TYPES: Record<string, 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};
const WORD_EXTENSIONS = new Set(['docx', 'doc', 'odt', 'rtf']);

/** Rozszerzenia obsługiwane przez import — do `accept` w `<input type=file>`. */
export const AI_FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.csv,.tsv,.txt,.md';

export function fileExtensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Base64 porcjami.
 *
 * `btoa(String.fromCharCode(...bytes))` rozwija bajty w argumenty i przepełnia
 * stos już przy kilkuset kilobajtach. Konwertujemy fragmentami o długości
 * podzielnej przez 3 — wtedy base64 każdej porcji kończy się bez dopełnienia
 * `=` i sklejone fragmenty dają poprawny base64 całości.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 3 * 16 * 1024;
  const parts: string[] = [];
  for (let at = 0; at < bytes.length; at += CHUNK) {
    const slice = bytes.subarray(at, Math.min(at + CHUNK, bytes.length));
    let binary = '';
    for (let i = 0; i < slice.length; i++) binary += String.fromCharCode(slice[i]!);
    parts.push(btoa(binary));
  }
  return parts.join('');
}

/**
 * Tekst z bajtów: UTF-8 (BOM zjadany przez dekoder), a gdy wynik jest
 * poszatkowany znakami zastępczymi — Windows-1250, w którym Excel
 * zapisuje polskie CSV-ki „do starszych programów".
 */
export function decodeText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const replacements = utf8.split('�').length - 1;
  if (replacements === 0) return utf8;

  try {
    return new TextDecoder('windows-1250').decode(bytes);
  } catch {
    return utf8;
  }
}

/**
 * Tekst (z pliku albo wklejony) → źródło, o ile mieści się w limicie funkcji.
 * `ext` idzie tylko do komunikatu; wklejony tekst nie ma rozszerzenia.
 */
export function textToAiSource(text: string, ext = ''): AiFileSource | AiFileSourceError {
  if (text.length > AI_TEXT_MAX_CHARS) return { error: 'too_long', ext, chars: text.length };
  return { kind: 'text', text };
}

export async function fileToAiSource(file: {
  name: string;
  bytes: Uint8Array;
}): Promise<AiFileSource | AiFileSourceError> {
  const ext = fileExtensionOf(file.name);

  if (WORD_EXTENSIONS.has(ext)) return { error: 'docx', ext };
  if (file.bytes.byteLength > AI_FILE_MAX_BYTES) return { error: 'too_large', ext };

  if (TEXT_EXTENSIONS.has(ext)) return textToAiSource(decodeText(file.bytes), ext);
  if (ext === 'pdf') return { kind: 'pdf', base64: bytesToBase64(file.bytes) };

  const mediaType = IMAGE_TYPES[ext];
  if (mediaType) return { kind: 'image', mediaType, base64: bytesToBase64(file.bytes) };

  if (ext === 'xlsx') {
    let text: string;
    try {
      text = await xlsxToText(file.bytes);
    } catch {
      // `.xls` z podmienionym rozszerzeniem albo uszkodzony plik — dla
      // użytkownika to „nieobsługiwany", nie „awaria".
      return { error: 'unsupported', ext };
    }
    return textToAiSource(text, ext);
  }

  return { error: 'unsupported', ext };
}

export function isAiFileSourceError(
  value: AiFileSource | AiFileSourceError,
): value is AiFileSourceError {
  return 'error' in value;
}
