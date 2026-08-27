import type { BriefAnswers, BriefQuestion, BriefTemplate } from '@/domain/brief';

/**
 * Formularz briefu (T-93, poprawka 9).
 *
 * ## Decyzje układu
 *
 * - **Jedna kolumna, sekcje po kolei.** Brief wypełnia się najczęściej na
 *   telefonie; dwie kolumny na desktopie kazałyby projektować dwa układy
 *   dla dokumentu, który i tak czyta się liniowo.
 * - **Podpowiedź pod pytaniem, nie w placeholderze.** Placeholder znika
 *   w chwili, w której zaczyna się pisać — czyli dokładnie wtedy, gdy jest
 *   potrzebny.
 * - **Wielokrotny wybór jako kafelki, nie checkboxy.** Cel dotknięcia na
 *   telefonie musi mieć rozmiar palca, a nie kwadratu 16 px.
 */
export function BriefForm({
  template,
  answers,
  onChange,
}: {
  template: BriefTemplate;
  answers: BriefAnswers;
  onChange: (answers: BriefAnswers) => void;
}) {
  const set = (id: string, value: string | string[]) => onChange({ ...answers, [id]: value });

  return (
    <div className="mt-8 space-y-10">
      {template.map((section) => (
        <section key={section.id}>
          <h2 className="font-display text-lg tracking-tight">{section.title}</h2>
          {section.hint ? (
            <p className="text-ink-soft mt-1 text-xs leading-relaxed">{section.hint}</p>
          ) : null}

          <div className="mt-4 space-y-5">
            {section.questions.map((question) => (
              <Field
                key={question.id}
                question={question}
                value={answers[question.id]}
                onChange={(value) => set(question.id, value)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const INPUT =
  'border-hair mt-1.5 w-full rounded-lg border bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]';

function Field({
  question,
  value,
  onChange,
}: {
  question: BriefQuestion;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const text = typeof value === 'string' ? value : '';
  const list = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="block">
        <span className="text-ink text-sm font-medium">
          {question.label}
          {question.required ? <span className="text-discount ml-1">*</span> : null}
        </span>
        {question.hint ? (
          <span className="text-ink-soft mt-0.5 block text-xs leading-relaxed">
            {question.hint}
          </span>
        ) : null}

        {question.kind === 'longtext' ? (
          <textarea
            value={text}
            rows={3}
            maxLength={4000}
            placeholder={question.placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={`${INPUT} resize-y`}
          />
        ) : question.kind === 'number' ? (
          <input
            type="number"
            inputMode="decimal"
            value={text}
            placeholder={question.placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={INPUT}
          />
        ) : question.kind === 'choice' ? (
          <select
            value={text}
            onChange={(event) => onChange(event.target.value)}
            className={INPUT}
          >
            <option value="">—</option>
            {question.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : question.kind === 'multi' ? null : (
          <input
            type="text"
            value={text}
            maxLength={500}
            placeholder={question.placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={INPUT}
          />
        )}
      </label>

      {question.kind === 'multi' ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {question.options.map((option) => {
            const on = list.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(on ? list.filter((item) => item !== option) : [...list, option])
                }
                className={
                  on
                    ? 'bg-accent rounded-lg px-3 py-2 text-sm font-medium text-white'
                    : 'border-hair text-ink rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-[var(--surface)]'
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
