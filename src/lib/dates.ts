const pl = new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const plTime = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (value: string | Date): string => pl.format(new Date(value));
export const formatTime = (value: string | Date): string => plTime.format(new Date(value));

/** „26.08.2026, 23:40" — data z godziną, do zdarzeń (otwarcia linku, akceptacja). */
export const formatDateTime = (value: string | Date): string =>
  `${formatDate(value)}, ${formatTime(value)}`;

/** „dziś", „wczoraj", „3 dni temu", dalej data. */
export function formatRelativeDay(value: string | Date): string {
  const d = new Date(value);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  if (days < 7) return `${days} dni temu`;
  return pl.format(d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
