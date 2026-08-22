import { InlineText } from './InlineText';
import type { QuoteBody } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface QuoteHeaderProps {
  body: QuoteBody;
  editing: boolean;
  /** Data utworzenia rekordu — używana, gdy `body.issueDate` jest puste. */
  createdAt: string;
  onPatch: (patch: Partial<QuoteBody>) => void;
  onPatchClient: (patch: Partial<QuoteBody['client']>) => void;
}

/** Pole „Etykieta: wartość" z siatki metadanych. */
function MetaField({
  label,
  value,
  onCommit,
  editing,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (next: string) => void;
  editing: boolean;
  placeholder?: string;
}) {
  return (
    <p className="flex items-baseline gap-1.5 text-[14px] text-[var(--doc-ink-soft)]">
      <span className="shrink-0">{label}:</span>
      <InlineText
        value={value}
        onCommit={onCommit}
        readOnly={!editing}
        placeholder={placeholder}
        ariaLabel={label}
        className="inline-field min-w-0 flex-1"
      />
    </p>
  );
}

export function QuoteHeader({
  body,
  editing,
  createdAt,
  onPatch,
  onPatchClient,
}: QuoteHeaderProps) {
  const issueDate = body.issueDate ?? createdAt.slice(0, 10);
  const hasDescription = body.projectDescription.trim().length > 0;

  return (
    <header>
      <p className="text-[12px] font-semibold tracking-[0.14em] text-[var(--doc-sage)] uppercase">
        {pl.editor.eyebrow}
      </p>

      <InlineText
        value={body.title}
        onCommit={(title) => onPatch({ title })}
        readOnly={!editing}
        placeholder={pl.editor.titlePlaceholder}
        ariaLabel={pl.quotes.quoteTitle}
        className={cn(
          'inline-field mt-2 text-[34px] leading-[1.15] font-normal tracking-[-0.01em] uppercase',
        )}
      />

      {editing || body.subtitle ? (
        <InlineText
          value={body.subtitle}
          onCommit={(subtitle) => onPatch({ subtitle })}
          readOnly={!editing}
          placeholder={pl.editor.subtitlePlaceholder}
          ariaLabel={pl.editor.subtitlePlaceholder}
          className="inline-field mt-1 text-[15px] text-[var(--doc-ink-soft)]"
        />
      ) : null}

      <div className="mt-5 grid max-w-[640px] grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6 gap-y-1">
        <MetaField
          label={pl.editor.investor}
          value={body.client.name}
          onCommit={(name) => onPatchClient({ name })}
          editing={editing}
        />

        <p className="flex items-baseline gap-1.5 text-[14px] text-[var(--doc-ink-soft)]">
          <span className="shrink-0">{pl.editor.date}:</span>
          {editing ? (
            <input
              type="date"
              value={issueDate}
              aria-label={pl.editor.date}
              onChange={(event) => onPatch({ issueDate: event.target.value || null })}
              className="inline-field min-w-0 flex-1 bg-transparent px-1"
            />
          ) : (
            <span>{new Date(issueDate).toLocaleDateString('pl-PL')}</span>
          )}
        </p>

        <MetaField
          label={pl.editor.phone}
          value={body.client.phone}
          onCommit={(phone) => onPatchClient({ phone })}
          editing={editing}
        />
        <MetaField
          label={pl.editor.email}
          value={body.client.email}
          onCommit={(email) => onPatchClient({ email })}
          editing={editing}
        />

        <p className="flex items-baseline gap-1.5 text-[14px] text-[var(--doc-ink-soft)]">
          <span className="shrink-0">{pl.editor.validity}:</span>
          {editing ? (
            <input
              type="number"
              min={0}
              value={body.validDays}
              aria-label={pl.editor.validity}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                onPatch({ validDays: Number.isFinite(next) && next >= 0 ? next : 0 });
              }}
              className="inline-field amount w-16 bg-transparent px-1"
            />
          ) : (
            <span>{pl.editor.days(body.validDays)}</span>
          )}
        </p>
      </div>

      {editing || body.intro ? (
        <InlineText
          value={body.intro}
          onCommit={(intro) => onPatch({ intro })}
          readOnly={!editing}
          multiline
          placeholder={pl.editor.introPlaceholder}
          ariaLabel={pl.editor.introPlaceholder}
          className="inline-field mt-5 max-w-[560px] text-[14.5px] leading-[1.6] text-[var(--doc-ink-soft)]"
        />
      ) : null}

      {/* Pusty opis projektu znika w podglądzie — jak w prototypie. */}
      {editing || hasDescription ? (
        <div className="mt-6">
          <p className="text-[12px] font-semibold tracking-[0.1em] text-[var(--doc-sage)] uppercase">
            {pl.editor.projectDescription}
          </p>
          <InlineText
            value={body.projectDescription}
            onCommit={(projectDescription) => onPatch({ projectDescription })}
            readOnly={!editing}
            multiline
            placeholder={pl.editor.projectDescriptionPlaceholder}
            ariaLabel={pl.editor.projectDescription}
            className="inline-field mt-1 text-[14.5px] leading-[1.6] whitespace-pre-wrap"
          />
        </div>
      ) : null}
    </header>
  );
}
