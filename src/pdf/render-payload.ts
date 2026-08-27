import type { BrandKit } from '@/domain/brand/schema';
import type { QuoteBody } from '@/domain/quote';
import type { PdfTheme } from './theme';

/**
 * Wszystko, czego potrzeba do złożenia dokumentu — w postaci, którą da się
 * przesłać do Web Workera.
 *
 * Świadomie **same dane, żadnych funkcji ani elementów Reacta**: structured
 * clone przepuszcza tylko takie rzeczy, a próba wysłania gotowego drzewa JSX
 * kończy się `DataCloneError` dopiero w czasie działania.
 */
export interface PdfRenderPayload {
  body: QuoteBody;
  theme: PdfTheme;
  brandKit: BrandKit;
  number: string | null;
  /** Etykieta wersji na dokumencie (T-57). `null` = nie pokazuj — tak jest domyślnie. */
  versionLabel?: string | null;
  issueDate: string;
  currency: string;
  logoDataUrl: string | null;
}

/** Wiadomość od workera: gotowy plik albo powód, dla którego go nie ma. */
export type PdfWorkerResponse = { ok: true; bytes: ArrayBuffer } | { ok: false; error: string };
