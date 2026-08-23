/**
 * Testy integracyjne na zywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 *
 * Logujemy sie kontem z seeda (demo@anzorge.local / demo1234) i pracujemy
 * na prawdziwym RLS — dzieki temu test lapie takze bledy polityk, a nie tylko
 * bledy mapowania.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  archiveQuote,
  createQuote,
  duplicateQuote,
  getQuote,
  listQuotes,
  nextQuoteNumber,
  saveQuote,
  setQuoteStatus,
} from './quotes.repo';
import { ConflictError } from './errors';
import { newScheduleBody } from '@/domain/schedule';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';

const DEMO_EMAIL = 'demo@anzorge.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
const created: string[] = [];

/** Wycena z jedna sekcja, jedna pozycja i jednym rabatem. */
function sampleBody(title: string) {
  return newQuoteBody({
    title,
    client: { name: 'Testowy Klient', phone: '', email: '' },
    vatRate: 23,
    pricesInclude: 'net',
    sections: [
      newSection({
        title: 'Projekt',
        items: [
          newItem({ name: 'Projekt koncepcyjny', qty: 1, unitPriceCents: 500_000 }),
          newItem({ name: 'Rabat', kind: 'discount', qty: 1, unitPriceCents: 50_000 }),
        ],
      }),
    ],
  });
}

beforeAll(async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error) {
    throw new Error(
      'Nie udalo sie zalogowac uzytkownikiem z seeda. Czy `pnpm db:start` dziala? ' +
        error.message,
    );
  }

  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  const supabase = getSupabase();
  if (created.length > 0) {
    await supabase.from('quotes').delete().in('id', created);
  }
  await supabase.auth.signOut();
});

async function makeQuote(title: string) {
  const quote = await createQuote({ workspaceId, body: sampleBody(title) });
  created.push(quote.id);
  return quote;
}

describe('quotes.repo — CRUD', () => {
  it('tworzy wycene z numerem nadanym przez baze i policzonymi totalami', async () => {
    const quote = await makeQuote('Wycena testowa');

    expect(quote.id).toBeTruthy();
    expect(quote.number).toMatch(/^WYC\/\d{4}\/\d{2}\/\d{4}$/);
    expect(quote.status).toBe('draft');
    // 500 000 gr pozycji - 50 000 gr rabatu = 450 000 gr netto, VAT 23%.
    expect(quote.totalNetCents).toBe(450_000);
    expect(quote.totalGrossCents).toBe(553_500);
    expect(quote.clientName).toBe('Testowy Klient');
    expect(quote.bodyError).toBeNull();
  });

  it('nadaje kolejne numery bez powtorzen', async () => {
    const numbers = await Promise.all([
      nextQuoteNumber(workspaceId),
      nextQuoteNumber(workspaceId),
      nextQuoteNumber(workspaceId),
    ]);
    expect(new Set(numbers).size).toBe(3);
  });

  it('odczytuje wycene i parsuje body zodem', async () => {
    const source = await makeQuote('Do odczytu');
    const loaded = await getQuote(source.id);

    expect(loaded.body).not.toBeNull();
    expect(loaded.body?.sections).toHaveLength(1);
    expect(loaded.body?.sections[0]?.items).toHaveLength(2);
  });

  it('zwraca wycene na liscie i filtruje po statusie', async () => {
    const quote = await makeQuote('Na liscie');

    const drafts = await listQuotes({ workspaceId, status: 'draft' });
    expect(drafts.some((q) => q.id === quote.id)).toBe(true);

    const accepted = await listQuotes({ workspaceId, status: 'accepted' });
    expect(accepted.some((q) => q.id === quote.id)).toBe(false);
  });

  it('szuka po tytule i nazwie klienta', async () => {
    const quote = await makeQuote('Unikalny Tytul Szukany');

    const byTitle = await listQuotes({ workspaceId, search: 'Unikalny Tytul' });
    expect(byTitle.some((q) => q.id === quote.id)).toBe(true);

    const byClient = await listQuotes({ workspaceId, search: 'Testowy Klient' });
    expect(byClient.some((q) => q.id === quote.id)).toBe(true);

    const miss = await listQuotes({ workspaceId, search: 'zzz-nie-istnieje-zzz' });
    expect(miss.some((q) => q.id === quote.id)).toBe(false);
  });

  it('zapisuje zmiany i przelicza zdenormalizowane totale', async () => {
    const quote = await makeQuote('Do zapisu');
    const body = quote.body;
    if (!body) throw new Error('brak body');

    body.title = 'Po zapisie';
    body.sections[0]?.items.push(newItem({ name: 'Nadzor', qty: 2, unitPriceCents: 100_000 }));

    const saved = await saveQuote({
      id: quote.id,
      body,
      lastSeenUpdatedAt: quote.updatedAt,
    });

    expect(saved.title).toBe('Po zapisie');
    // 500 000 + 2 x 100 000 - 50 000 = 650 000 gr netto.
    expect(saved.totalNetCents).toBe(650_000);
    expect(saved.updatedAt).not.toBe(quote.updatedAt);
  });

  it('zmienia status i stempluje sent_at', async () => {
    const quote = await makeQuote('Do wyslania');
    const sent = await setQuoteStatus(quote.id, 'sent');

    expect(sent.status).toBe('sent');
    expect(sent.sentAt).not.toBeNull();
  });

  it('duplikuje wycene z nowymi id i nowym numerem', async () => {
    const source = await makeQuote('Do duplikacji');
    const copy = await duplicateQuote(source.id);
    created.push(copy.id);

    expect(copy.id).not.toBe(source.id);
    expect(copy.number).not.toBe(source.number);
    expect(copy.body?.title).toBe('Do duplikacji (kopia)');
    // Duplikat musi miec wlasne id pozycji, inaczej edycja kopii ruszylaby oryginal.
    const sourceItemId = source.body?.sections[0]?.items[0]?.id;
    const copyItemId = copy.body?.sections[0]?.items[0]?.id;
    expect(copyItemId).toBeTruthy();
    expect(copyItemId).not.toBe(sourceItemId);
  });

  it('archiwizuje miekko — wycena znika z listy, ale zostaje w bazie', async () => {
    const quote = await makeQuote('Do archiwum');
    await archiveQuote(quote.id);

    const visible = await listQuotes({ workspaceId });
    expect(visible.some((q) => q.id === quote.id)).toBe(false);

    const withArchived = await listQuotes({ workspaceId, includeArchived: true });
    expect(withArchived.some((q) => q.id === quote.id)).toBe(true);
  });
});

describe('quotes.repo — konflikt updated_at', () => {
  it('odrzuca zapis oparty o nieaktualny updated_at', async () => {
    const quote = await makeQuote('Konfliktowa');
    const body = quote.body;
    if (!body) throw new Error('brak body');

    // Pierwszy zapis przechodzi i podbija updated_at.
    body.title = 'Zapis pierwszy';
    const first = await saveQuote({
      id: quote.id,
      body,
      lastSeenUpdatedAt: quote.updatedAt,
    });

    // Drugi zapis udaje inna instancje aplikacji, ktora widziala starszy stan.
    body.title = 'Zapis drugi (stary snapshot)';
    await expect(
      saveQuote({ id: quote.id, body, lastSeenUpdatedAt: quote.updatedAt }),
    ).rejects.toBeInstanceOf(ConflictError);

    // Dane w bazie zostaja z pierwszego zapisu — nic sie nie nadpisalo po cichu.
    const reloaded = await getQuote(quote.id);
    expect(reloaded.title).toBe('Zapis pierwszy');
    expect(reloaded.updatedAt).toBe(first.updatedAt);
  });

  it('pozwala zapisac po przeladowaniu swiezego updated_at', async () => {
    const quote = await makeQuote('Po przeladowaniu');
    const body = quote.body;
    if (!body) throw new Error('brak body');

    body.title = 'Krok 1';
    await saveQuote({ id: quote.id, body, lastSeenUpdatedAt: quote.updatedAt });

    const fresh = await getQuote(quote.id);
    const freshBody = fresh.body;
    if (!freshBody) throw new Error('brak body');
    freshBody.title = 'Krok 2';

    const saved = await saveQuote({
      id: fresh.id,
      body: freshBody,
      lastSeenUpdatedAt: fresh.updatedAt,
    });
    expect(saved.title).toBe('Krok 2');
  });
});

describe('quotes.repo — RLS', () => {
  it('nie pozwala utworzyc wyceny w cudzym workspace', async () => {
    const obcyWorkspace = '00000000-0000-4000-8000-000000000000';
    // RLS odrzuca insert; repo zamienia to na RepoError/ReadOnlyError.
    await expect(createQuote({ workspaceId: obcyWorkspace })).rejects.toThrow();
  });
});

describe('quotes.repo — harmonogram (F5.1)', () => {
  it('nowa wycena NIE ma harmonogramu', async () => {
    // `null` to normalny stan, a nie brak danych: wiekszosc ofert obejdzie
    // sie bez terminu.
    const quote = await makeQuote('Bez terminu');
    expect(quote.schedule).toBeNull();
  });

  it('zapisuje i odczytuje harmonogram', async () => {
    const quote = await makeQuote('Z terminem');
    const body = quote.body;
    if (!body) throw new Error('brak body');

    const schedule = newScheduleBody({ startDate: '2026-06-01', clientWorkdaysPerWeek: 6 });
    const saved = await saveQuote({
      id: quote.id,
      body,
      lastSeenUpdatedAt: quote.updatedAt,
      schedule,
    });

    expect(saved.schedule?.startDate).toBe('2026-06-01');
    expect(saved.schedule?.clientWorkdaysPerWeek).toBe(6);
    expect(saved.schedule?.stages.length).toBeGreaterThanOrEqual(11);

    const fresh = await getQuote(quote.id);
    expect(fresh.schedule?.startDate).toBe('2026-06-01');
  });

  it('zapis samej wyceny NIE kasuje harmonogramu', async () => {
    /*
     * Kluczowe dla F5.2: zakladka „Wycena" i zakladka „Termin" zapisuja ten
     * sam wiersz. Gdyby zapis dokumentu wysylal `schedule: null`, kazda edycja
     * pozycji kasowalaby ustawiony termin — i nikt by nie wiedzial dlaczego.
     */
    const quote = await makeQuote('Termin przezywa zapis');
    const body = quote.body;
    if (!body) throw new Error('brak body');

    const zHarmonogramem = await saveQuote({
      id: quote.id,
      body,
      lastSeenUpdatedAt: quote.updatedAt,
      schedule: newScheduleBody({ startDate: '2026-09-01' }),
    });

    body.title = 'Zmieniony tytul';
    const poZapisie = await saveQuote({
      id: quote.id,
      body,
      lastSeenUpdatedAt: zHarmonogramem.updatedAt,
    });

    expect(poZapisie.title).toBe('Zmieniony tytul');
    expect(poZapisie.schedule?.startDate).toBe('2026-09-01');
  });

  it('uszkodzony harmonogram nie blokuje wyceny', async () => {
    // Ta sama zasada co przy `pricing` w bibliotece: jeden zepsuty fragment
    // ma nie zabrac dostepu do calego dokumentu.
    const quote = await makeQuote('Uszkodzony termin');
    await getSupabase()
      .from('quotes')
      .update({ schedule: { startDate: 'wczoraj', stages: 'brak' } })
      .eq('id', quote.id);

    const fresh = await getQuote(quote.id);
    expect(fresh.schedule).toBeNull();
    expect(fresh.body).not.toBeNull();
  });
});
