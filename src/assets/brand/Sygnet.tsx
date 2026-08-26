import type { SVGProps } from 'react';

/**
 * Toolier
 *
 * Kolor idzie z `currentColor` — źródłowy SVG ma `fill: #33251e` wpisany
 * na sztywno w `<style>`, więc na brązowej szynie byłby brązem na brązie.
 * Nadaj barwę klasą na elemencie (np. `text-rail-ink`).
 *
 * Bez `title` renderuje się jako ozdoba (`aria-hidden`) — tak ma być tam,
 * gdzie obok stoi już nazwa produktu w tekście.
 */
export function Sygnet({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 426.06 463.54"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M297.96,354.57c-5.1,4.53-18.12,11.33-39.64,11.33-26.05,0-39.07-13.03-39.07-37.94v-199.91h79.28v-22.65h-79.28v-63.43h-6.23l-83.81,75.89v10.19h32.85v98.49l33.49,19.33-33.49,19.34v63.88c0,55.5,31.71,71.35,67.39,71.35,32.85,0,58.9-15.29,74.75-37.94l-6.23-7.93Z"/>
    </svg>
  );
}
