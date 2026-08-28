import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { openExternal, runningInTauri } from '@/lib/tauri';

/**
 * Link do adresu POZA aplikacją (strona produktu, dokumentacja).
 *
 * W Tauri zwykłe `<a target="_blank">` nie ma gdzie się otworzyć — webview
 * nie zakłada nowych okien — więc kliknięcie przechwytujemy i oddajemy
 * systemowej przeglądarce przez `openExternal` (lista dozwolonych adresów:
 * `src-tauri/capabilities/default.json`). W przeglądarce (`pnpm dev`) to
 * zwykły link w nowej karcie.
 */
export function ExternalLink({
  href,
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !runningInTauri()) return;
    event.preventDefault();
    void openExternal(href);
  };

  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
