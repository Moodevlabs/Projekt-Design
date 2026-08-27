import { pl } from '@/i18n/pl';

/** Limity bucketa `brand` (migracja 0005) — sprawdzamy je też po stronie UI. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/**
 * Czy plik nadaje się do wysłania. Zwraca komunikat albo `null`.
 *
 * Sprawdzamy to **przed** wysyłką, mimo że bucket i tak by odrzucił plik:
 * komunikat ze Storage jest po angielsku i mówi o typie MIME, a użytkownik
 * ma usłyszeć, że plik jest za duży.
 */
export function imageFileError(file: File): string | null {
  if (file.size > MAX_IMAGE_BYTES) return pl.brand.logoTooBig;
  if (!IMAGE_TYPES.includes(file.type)) return pl.brand.logoWrongType;
  return null;
}
