import type { Brief } from '@/domain/brief';

/**
 * Odpowiedzi w układzie dokumentu, nie tabeli.
 *
 * Pytania **bez odpowiedzi pomijamy**: brief wypełnia się na raty i lista
 * dwudziestu pustych pól przykryłaby te pięć, które klient już wypełnił.
 */
export function BriefAnswers({ brief }: { brief: Brief }) {
  return (
    <div className="mt-4 space-y-5 border-t border-[var(--hair)] pt-4">
      {brief.template.map((section) => {
        const answered = section.questions.filter((question) => {
          const value = brief.answers[question.id];
          return typeof value === 'string'
            ? value.trim().length > 0
            : Array.isArray(value) && value.length > 0;
        });

        if (answered.length === 0) return null;

        return (
          <section key={section.id}>
            <h3 className="label-caps text-ink-soft">{section.title}</h3>
            <dl className="mt-2 space-y-2.5">
              {answered.map((question) => {
                const value = brief.answers[question.id];
                const text = Array.isArray(value) ? value.join(', ') : (value ?? '');

                return (
                  <div key={question.id}>
                    <dt className="text-ink-soft text-xs">{question.label}</dt>
                    <dd className="text-ink text-sm whitespace-pre-line">{text}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
