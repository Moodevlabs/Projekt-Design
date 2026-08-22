/**
 * Uchwyt przeciągania — sześć kropek w siatce 2×3, jak w prototypie
 * (`lucide-react/GripVertical` jest wyraźnie gęstszy).
 *
 * W T-08 to **martwy placeholder**: rezerwuje miejsce, żeby layout wiersza był
 * finalny i nie przeskoczył, gdy T-09 podepnie pod niego drag & drop.
 */
export function DragHandle({ label }: { label?: string }) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="w-[18px] shrink-0 cursor-grab text-[var(--doc-ink-soft)] active:cursor-grabbing"
    >
      <svg viewBox="0 0 24 24" className="size-[14px]" focusable="false">
        {[6, 12, 18].map((y) =>
          [8, 16].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />),
        )}
      </svg>
    </span>
  );
}
