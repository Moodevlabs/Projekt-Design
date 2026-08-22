/**
 * Generator identyfikatorów dla encji domenowych.
 *
 * Celowo opakowany w cienki helper (zamiast wołać `crypto.randomUUID()` wprost),
 * żeby testy mogły go zamockować i sprawdzać deterministyczne wyniki fabryk.
 */

/** Zwraca nowy identyfikator w formacie UUID v4. */
export function newId(): string {
  const cryptoRef: Crypto | undefined = globalThis.crypto;
  if (typeof cryptoRef?.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return fallbackUuidV4();
}

/**
 * Awaryjny generator UUID v4 dla środowisk bez `crypto.randomUUID`
 * (np. starsze webview albo okrojony jsdom).
 */
function fallbackUuidV4(): string {
  const chars: string[] = [];
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      chars.push('-');
    } else if (i === 14) {
      chars.push('4');
    } else if (i === 19) {
      chars.push(((Math.random() * 4) | 8).toString(16));
    } else {
      chars.push(((Math.random() * 16) | 0).toString(16));
    }
  }
  return chars.join('');
}
