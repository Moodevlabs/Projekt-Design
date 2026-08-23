/**
 * Grupy wariantów pozycji bibliotecznych (F1.4).
 *
 * Wariant to osobny wpis wskazujący na lidera grupy — patrz migracja
 * `0010_library_variants.sql`, gdzie stoi uzasadnienie tego wyboru. Tutaj
 * są czyste reguły składania grup; domena nie zna ani Supabase, ani Reacta,
 * więc operuje na najwęższym możliwym kształcie.
 */

/** Minimum, którego potrzeba do zbudowania grupy. */
export interface VariantMember {
  id: string;
  variantOf: string | null;
}

/**
 * Identyfikator grupy, do której należy wpis.
 *
 * Lider jest liderem samego siebie — dzięki temu porównanie grup to zwykłe
 * porównanie dwóch stringów, bez rozgałęziania na „lider czy wariant".
 */
export function variantGroupId(member: VariantMember): string {
  return member.variantOf ?? member.id;
}

/** Czy wpis jest liderem grupy (albo pozycją samodzielną). */
export function isVariantLeader(member: VariantMember): boolean {
  return member.variantOf === null;
}

/**
 * Warianty pogrupowane po liderze.
 *
 * Grupy jednoelementowe **zostają w wyniku**: „ta pozycja nie ma wariantów"
 * to informacja, a nie brak danych. Odsiewanie ich tutaj znaczyłoby, że każde
 * miejsce wywołujące musi sprawdzać `undefined` zamiast czytać długość.
 */
export function groupVariants<T extends VariantMember>(members: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const member of members) {
    const key = variantGroupId(member);
    const group = groups.get(key);
    if (group) group.push(member);
    else groups.set(key, [member]);
  }

  // Lider ma stać pierwszy — to on nadaje grupie nazwę i to jego wybiera się
  // domyślnie. Kolejność reszty zostaje taka, jak przyszła (sort_order).
  for (const group of groups.values()) {
    group.sort((a, b) => Number(isVariantLeader(b)) - Number(isVariantLeader(a)));
  }

  return groups;
}

/**
 * Rodzeństwo wpisu — on sam plus pozostałe warianty z jego grupy.
 *
 * Zwraca pustą tablicę, gdy wpis nie ma wariantów. To celowe: „jeden wariant"
 * i „brak wariantów" to dla interfejsu ten sam przypadek (nie ma z czego
 * wybierać), a pusta tablica mówi to wprost.
 */
export function variantsOf<T extends VariantMember>(members: T[], id: string): T[] {
  const member = members.find((candidate) => candidate.id === id);
  if (!member) return [];

  const key = variantGroupId(member);
  const group = groupVariants(members).get(key) ?? [];
  return group.length > 1 ? group : [];
}
