import type { QuoteSummary } from '@/data/repos/quotes.repo';
import type { ActivityEvent } from '@/data/repos/activity.repo';
import type { ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';

/** Ile dni przed końcem ważności oferta jest „wygasająca". */
export const EXPIRING_DAYS = 7;

export interface DashboardCounts {
  /** Oferty ze statusem „Wysłana" — czekają na decyzję inwestora. */
  sent: number;
  /** Wysłane, którym ważność kończy się w ciągu `EXPIRING_DAYS` dni. */
  expiring: number;
  /** Najbliższa data wygaśnięcia (ISO `YYYY-MM-DD`) albo `null`. */
  expiringOn: string | null;
  /** Nieprzeczytane uwagi klientów. */
  comments: number;
  /** Nowe zdarzenia (po znaczniku „przejrzane") niebędące uwagami. */
  otherNew: number;
  /** Teczki w toku. */
  projects: number;
}

export function dashboardCounts(args: {
  quotes: readonly QuoteSummary[];
  events: readonly ActivityEvent[];
  projects: readonly ProjectOverview[];
  seenAt: string | null;
  now?: Date;
}): DashboardCounts {
  const now = args.now ?? new Date();
  const today = startOfDay(now);
  const horizon = new Date(today.getTime() + EXPIRING_DAYS * 86_400_000);

  const sent = args.quotes.filter((quote) => quote.status === 'sent');
  const expiring = sent
    .filter((quote) => quote.validUntil !== null)
    .map((quote) => quote.validUntil as string)
    .filter((iso) => {
      const until = new Date(iso);
      return until >= today && until <= horizon;
    })
    .sort();

  const fresh = args.events.filter(
    (event) => event.unread || args.seenAt === null || event.at > args.seenAt,
  );
  const comments = fresh.filter((event) => event.kind === 'comment').length;

  return {
    sent: sent.length,
    expiring: expiring.length,
    expiringOn: expiring[0] ?? null,
    comments,
    otherNew: fresh.length - comments,
    projects: args.projects.filter(
      (project) => project.status !== 'done' && project.status !== 'canceled',
    ).length,
  };
}

/** Kawałek zdania — z odnośnikiem albo bez. */
export interface LedeSegment {
  text: string;
  to?: string;
}

type Gender = 'f' | 'm' | 'n';

const WORDS: Record<Gender, string[]> = {
  f: ['', 'jedna', 'dwie', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'],
  m: ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'],
  n: ['', 'jedno', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'],
};

/** „trzy" do dziewięciu, dalej cyfry — jak w składzie tekstu, nie w tabeli. */
export function countWord(n: number, gender: Gender): string {
  return n >= 1 && n <= 9 ? (WORDS[gender][n] ?? String(n)) : String(n);
}

/** Polska liczba mnoga: 1 / 2–4 (poza 12–14) / reszta. */
export function plural(n: number, forms: readonly [string, string, string]): string {
  if (n === 1) return forms[0];
  const tens = n % 100;
  const ones = n % 10;
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return forms[1];
  return forms[2];
}

const WEEKDAY = [
  'w niedzielę',
  'w poniedziałek',
  'we wtorek',
  'w środę',
  'w czwartek',
  'w piątek',
  'w sobotę',
];

/** „dziś", „jutro", „w czwartek", „za tydzień". */
export function whenLabel(iso: string, now: Date): string {
  const today = startOfDay(now);
  const day = startOfDay(new Date(iso));
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return 'dziś';
  if (diff === 1) return 'jutro';
  if (diff >= 7) return 'za tydzień';
  return WEEKDAY[day.getDay()] ?? '';
}

/**
 * Zdanie otwierające pulpit (T-133): co dziś czeka, po polsku, z odnośnikami
 * w treści. Zamiast czterech kafli z cyframi — jedno albo dwa zdania, które
 * da się przeczytać w sekundę.
 *
 * Kolejność: oferty u klientów (i czy któraś wygasa) → co nowego od klientów
 * → gdy nic nie czeka: teczki w toku. Zdania zaczynają się wielką literą,
 * liczby do dziewięciu są słowem.
 */
export function ledeSegments(counts: DashboardCounts, now: Date = new Date()): LedeSegment[] {
  const sentences: LedeSegment[][] = [];

  if (counts.sent > 0) {
    const s: LedeSegment[] = [
      {
        text: `${countWord(counts.sent, 'f')} ${plural(counts.sent, ['oferta', 'oferty', 'ofert'])}`,
        to: routes.quotes,
      },
      { text: ` ${counts.sent === 1 ? 'czeka' : 'czekają'} na decyzję inwestorów` },
    ];
    if (counts.expiring > 0 && counts.expiringOn) {
      s.push({
        text:
          counts.expiring === 1
            ? `, ${counts.sent === 1 ? 'wygasa' : 'jedna z nich wygasa'} ${whenLabel(counts.expiringOn, now)}`
            : `, ${countWord(counts.expiring, 'f')} z nich wygasają w ciągu tygodnia`,
      });
    }
    s.push({ text: '.' });
    sentences.push(s);
  }

  if (counts.comments > 0) {
    sentences.push([
      {
        text: `${countWord(counts.comments, 'f')} ${plural(counts.comments, ['nowa uwaga', 'nowe uwagi', 'nowych uwag'])} od klientów.`,
      },
    ]);
  } else if (counts.otherNew > 0) {
    sentences.push([
      {
        text: `${countWord(counts.otherNew, 'n')} ${plural(counts.otherNew, ['nowe zdarzenie', 'nowe zdarzenia', 'nowych zdarzeń'])} od klientów.`,
      },
    ]);
  } else if (counts.sent > 0) {
    sentences.push([{ text: 'Brak nowych zdarzeń od klientów.' }]);
  }

  if (sentences.length === 0) {
    sentences.push([{ text: 'Nic nie czeka na odpowiedź.' }]);
    sentences.push(
      counts.projects > 0
        ? [
            {
              text: `${countWord(counts.projects, 'm')} ${plural(counts.projects, ['projekt', 'projekty', 'projektów'])} w toku.`,
              to: routes.clients,
            },
          ]
        : [{ text: 'Brak projektów w toku.' }],
    );
  }

  return sentences.flatMap((sentence, index) => {
    const [first, ...rest] = sentence;
    if (!first) return [];
    const capitalized = {
      ...first,
      text: first.text.charAt(0).toUpperCase() + first.text.slice(1),
    };
    const lead: LedeSegment[] = index === 0 ? [] : [{ text: ' ' }];
    return [...lead, capitalized, ...rest];
  });
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
