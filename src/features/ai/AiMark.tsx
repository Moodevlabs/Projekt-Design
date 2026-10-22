import { cn } from '@/lib/utils';

/**
 * Znak asystenta: monogram „AI" w cienkiej ramce (decyzja właściciela
 * 2026-10-22, zamiast iskry z lucide).
 *
 * ## Dlaczego litery, a nie ikona
 *
 * Iskra stała się znakiem „tu jest AI" w każdym produkcie naraz i obiecuje
 * magię, której asystent nie uprawia — on czyta cennik i proponuje zakres.
 * Dwie litery nazywają rzecz po imieniu. Rymują się z „{ }" przy polach
 * tekstu (`PlaceholderMenu`), z etykietą `.label-caps` i z ramkowym CTA na
 * pasie (`Button variant="frame"`): ten sam Inter, ta sama ramka 1 px,
 * ten sam kolor co tekst obok — więc na beżu, kanwie i brązowej szynie znak
 * nie potrzebuje własnej palety.
 *
 * ## Rozmiary
 *
 * `xs` stoi w linii z tekstem 11–13 px (etykieta, przyciski `sm`, stan
 * oczekiwania); `sm` wypełnia 24-pikselowy przycisk ikonowy obok „{ }";
 * `md` to nagłówek sekcji i spis w Pomocy, gdzie sąsiaduje z ikonami 16 px.
 * Ramka bierze `currentColor` z 40 % krycia — to samo, co `--hair-strong`
 * na jasnym tle, a na ciemnym po prostu jaśniejsza kreska.
 */
const SIZES = {
  xs: 'h-4 min-w-[22px] px-[5px] text-[8.5px] rounded-[3px]',
  sm: 'h-5 min-w-[27px] px-1.5 text-[10px] rounded-[4px]',
  md: 'h-6 min-w-[32px] px-2 text-[11px] rounded-[4px]',
} as const;

export type AiMarkSize = keyof typeof SIZES;

export function AiMark({
  size = 'xs',
  pulse = false,
  className,
}: {
  size?: AiMarkSize;
  /** Stan „asystent pracuje" — pulsuje krycie, nie położenie. */
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-current/40 font-sans font-medium tracking-[0.1em] uppercase select-none',
        // Pół piksela w dół: wersaliki bez wydłużeń siedzą optycznie za wysoko.
        '[padding-top:1px] leading-none',
        SIZES[size],
        pulse && 'motion-safe:animate-pulse',
        className,
      )}
    >
      AI
    </span>
  );
}
