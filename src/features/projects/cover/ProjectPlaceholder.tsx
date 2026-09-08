import { placeholderKind } from '@/domain/project/cover';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Placeholder okładki projektu (T-131) — rysunek kreską według typu
 * inwestycji, gdy projekt nie ma jeszcze żadnego obrazu.
 *
 * Rysunek, a nie fotografia stockowa: cztery kreskowe szkice w barwach marki
 * są spójne z każdym brand kitem, ważą kilkaset bajtów i nie udają, że
 * projekt ma już wizualizację. Kolory idą z tokenów (`currentColor` = atrament,
 * tło = beż), więc placeholder wygląda tak samo w tabeli, na pulpicie i na
 * karcie — różni się tylko rozmiarem.
 *
 * `viewBox` 4:3; kontener nadaje proporcję przez `aspect-ratio` albo stałe
 * wymiary, a `preserveAspectRatio="xMidYMid slice"` kadruje jak `object-fit:
 * cover`, żeby miniatura 56×40 i kadr 16:10 brały ten sam rysunek.
 */
export function ProjectPlaceholder({ kind, className }: { kind: string; className?: string }) {
  const resolved = placeholderKind(kind);

  return (
    <svg
      viewBox="0 0 320 240"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={pl.projects.coverPlaceholder(pl.projects.kinds[resolved])}
      className={cn('bg-beige text-ink block h-full w-full', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {resolved === 'apartment' ? <Apartment /> : null}
      {resolved === 'house' ? <House /> : null}
      {resolved === 'commercial' ? <Commercial /> : null}
      {resolved === 'other' ? <Other /> : null}
    </svg>
  );
}

/** Wypełnienie „ściany" — o ton jaśniejsze od beżu tła. */
const WALL = 'var(--canvas)';

function Apartment() {
  return (
    <>
      <line x1="0" y1="196" x2="320" y2="196" strokeOpacity=".35" />
      <rect x="96" y="44" width="128" height="152" fill={WALL} />
      {[60, 96, 132].map((y) =>
        [110, 148, 186].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="24" height="20" />),
      )}
      <rect x="150" y="172" width="20" height="24" />
      <rect x="48" y="120" width="34" height="76" fill={WALL} strokeOpacity=".5" />
      <rect x="238" y="136" width="40" height="60" fill={WALL} strokeOpacity=".5" />
    </>
  );
}

function House() {
  return (
    <>
      <line x1="0" y1="196" x2="320" y2="196" strokeOpacity=".35" />
      <path d="M84 196 V116 L160 60 L236 116 V196 Z" fill={WALL} />
      <path d="M70 122 L160 54 L250 122" />
      <rect x="146" y="150" width="28" height="46" />
      <rect x="104" y="136" width="26" height="24" />
      <rect x="190" y="136" width="26" height="24" />
      <line x1="117" y1="136" x2="117" y2="160" strokeOpacity=".5" />
      <line x1="203" y1="136" x2="203" y2="160" strokeOpacity=".5" />
      <rect x="196" y="76" width="14" height="26" fill={WALL} />
      <circle cx="270" cy="160" r="18" strokeOpacity=".6" />
      <line x1="270" y1="178" x2="270" y2="196" strokeOpacity=".6" />
    </>
  );
}

function Commercial() {
  return (
    <>
      <line x1="0" y1="196" x2="320" y2="196" strokeOpacity=".35" />
      <rect x="64" y="96" width="192" height="100" fill={WALL} />
      <path d="M56 96 L64 72 H256 L264 96 Z" fill="var(--beige)" />
      <path
        d="M56 96 q13 14 26 0 q13 14 26 0 q13 14 26 0 q13 14 26 0 q13 14 26 0 q13 14 26 0 q13 14 26 0 q13 14 26 0"
        fill={WALL}
      />
      <rect x="80" y="118" width="60" height="78" />
      <rect x="176" y="118" width="60" height="78" />
      <line x1="110" y1="118" x2="110" y2="196" strokeOpacity=".4" />
      <rect x="152" y="130" width="16" height="66" />
      <circle cx="163" cy="164" r="1.6" fill="currentColor" />
      <rect x="104" y="46" width="112" height="16" strokeOpacity=".6" />
    </>
  );
}

function Other() {
  return (
    <>
      <rect x="72" y="52" width="176" height="136" fill={WALL} />
      <line x1="72" y1="120" x2="160" y2="120" />
      <line x1="160" y1="52" x2="160" y2="188" />
      <line x1="160" y1="140" x2="248" y2="140" />
      <path d="M112 120 a20 20 0 0 1 20 -20" strokeOpacity=".6" />
      <line x1="132" y1="100" x2="132" y2="120" strokeOpacity=".6" />
      <path d="M200 140 a18 18 0 0 0 -18 18" strokeOpacity=".6" />
      <rect x="180" y="72" width="44" height="26" strokeOpacity=".5" />
      <rect x="88" y="140" width="52" height="30" strokeOpacity=".5" />
      <circle cx="270" cy="72" r="12" strokeOpacity=".6" />
      <line x1="270" y1="56" x2="270" y2="64" strokeOpacity=".6" />
      <line x1="270" y1="60" x2="266" y2="66" strokeOpacity=".6" />
      <line x1="270" y1="60" x2="274" y2="66" strokeOpacity=".6" />
    </>
  );
}
