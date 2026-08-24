/**
 * Testy integracyjne na żywym, lokalnym Supabase (`pnpm db:start`).
 * Uruchamianie: `pnpm test:db`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSupabase } from '@/data/supabase';
import { getCurrentWorkspace } from './workspace.repo';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  overwriteTemplate,
  renameTemplate,
  templateSummary,
} from './templates.repo';
import { CURRENT_BODY_VERSION, newGroup, newItem, newQuoteBody, newSection } from '@/domain/quote';
import { newScheduleBody } from '@/domain/schedule';

const DEMO_EMAIL = 'demo@toolier.local';
const DEMO_PASSWORD = 'demo1234';

let workspaceId: string;
const created: string[] = [];

/** Sekcja z jedną pozycją luźną, jedną w grupie i jedną wyłączoną. */
function sampleBody(title: string) {
  return newQuoteBody({
    title,
    vatRate: 23,
    pricesInclude: 'net',
    sections: [
      newSection({
        title: 'Projekt',
        items: [newItem({ name: 'Koncepcja', qty: 1, unitPriceCents: 200_000 })],
        groups: [
          newGroup({
            name: 'Kuchnia',
            items: [
              newItem({ name: 'Wizualizacje', qty: 2, unitPriceCents: 50_000 }),
              newItem({ name: 'Opcja dodatkowa', unitPriceCents: 999_999, enabled: false }),
            ],
          }),
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
      'Nie udalo sie zalogowac uzytkownikiem z seeda. Czy `pnpm db:start` dziala? ' + error.message,
    );
  }

  workspaceId = (await getCurrentWorkspace()).id;
});

afterAll(async () => {
  const supabase = getSupabase();
  if (created.length > 0) {
    await supabase.from('quote_templates').delete().in('id', created);
  }
  await supabase.auth.signOut();
});

async function makeTemplate(name: string) {
  const template = await createTemplate({ workspaceId, name, body: sampleBody(name) });
  created.push(template.id);
  return template;
}

describe('templates.repo — CRUD', () => {
  it('zapisuje szablon i liczy podsumowanie z body', async () => {
    const template = await makeTemplate('Szablon testowy');

    expect(template.id).toBeTruthy();
    expect(template.workspaceId).toBe(workspaceId);
    expect(template.bodyError).toBeNull();
    expect(template.body?.sections).toHaveLength(1);
    // 3 pozycje w dokumencie (razem z wylaczona)...
    expect(template.itemCount).toBe(3);
    // ...ale suma netto liczy tylko wlaczone: 200 000 + 2 x 50 000.
    expect(template.totalNetCents).toBe(300_000);
  });

  it('zwraca szablon na liscie razem z tym z seeda', async () => {
    const template = await makeTemplate('Szablon na liscie');

    const rows = await listTemplates(workspaceId);
    expect(rows.some((row) => row.id === template.id)).toBe(true);
    // Seed zaklada jeden szablon — lista musi go sparsowac bez bledu.
    expect(rows.every((row) => row.bodyError === null)).toBe(true);
    expect(rows.length).toBeGreaterThan(1);
  });

  it('odczytuje pojedynczy szablon i parsuje body zodem', async () => {
    const source = await makeTemplate('Do odczytu');
    const loaded = await getTemplate(source.id);

    expect(loaded.name).toBe('Do odczytu');
    expect(loaded.body?.sections[0]?.groups[0]?.items).toHaveLength(2);
  });

  it('nadpisuje tresc, zostawiajac nazwe i przeliczajac podsumowanie', async () => {
    const template = await makeTemplate('Do nadpisania');
    const body = template.body;
    if (!body) throw new Error('brak body');

    body.sections[0]?.items.push(newItem({ name: 'Nadzor', qty: 1, unitPriceCents: 100_000 }));
    const overwritten = await overwriteTemplate(template.id, body);

    expect(overwritten.name).toBe('Do nadpisania');
    expect(overwritten.itemCount).toBe(4);
    expect(overwritten.totalNetCents).toBe(400_000);
    expect(overwritten.updatedAt).not.toBe(template.updatedAt);
  });

  it('kasuje twardo — szablonu nie da sie juz odczytac', async () => {
    const template = await makeTemplate('Do skasowania');
    await deleteTemplate(template.id);

    await expect(getTemplate(template.id)).rejects.toThrow();

    const rows = await listTemplates(workspaceId);
    expect(rows.some((row) => row.id === template.id)).toBe(false);
  });

  it('zmienia sama nazwe, nie ruszajac tresci', async () => {
    const template = await makeTemplate('Stara nazwa');
    const przed = template.itemCount;

    const po = await renameTemplate(template.id, 'Nowa nazwa');

    expect(po.name).toBe('Nowa nazwa');
    expect(po.itemCount).toBe(przed);
    expect(po.bodyError).toBeNull();
  });

  it('nie wywala sie na uszkodzonym body — zwraca bodyError', async () => {
    const template = await makeTemplate('Uszkodzony');

    // Symulujemy zapis ze starszej wersji aplikacji.
    await getSupabase()
      .from('quote_templates')
      .update({ body: { title: 'Bez sekcji', sections: 'to nie jest tablica' } })
      .eq('id', template.id);

    const broken = await getTemplate(template.id);
    expect(broken.body).toBeNull();
    expect(broken.bodyError).toContain('sections');
    expect(broken.itemCount).toBe(0);
    expect(broken.totalNetCents).toBe(0);
  });

  it('szablon sprzed wersjonowania wczytuje sie bez zmiany tresci', async () => {
    const template = await makeTemplate('Sprzed wersjonowania');

    // Tak wygladaja dokumenty zapisane, zanim wprowadzilismy `bodyVersion`.
    const { bodyVersion: _bezWersji, ...body } = template.body!;
    await getSupabase()
      .from('quote_templates')
      .update({ body })
      .eq('id', template.id);

    const wczytany = await getTemplate(template.id);
    expect(wczytany.bodyError).toBeNull();
    expect(wczytany.body?.bodyVersion).toBe(CURRENT_BODY_VERSION);
    expect(wczytany.itemCount).toBeGreaterThan(0);
  });

  it('szablon z nowszej wersji aplikacji nie jest po cichu okrajany', async () => {
    const template = await makeTemplate('Z przyszlosci');

    await getSupabase()
      .from('quote_templates')
      .update({
        body: { ...(template.body as object), bodyVersion: CURRENT_BODY_VERSION + 1 },
      })
      .eq('id', template.id);

    const zPrzyszlosci = await getTemplate(template.id);
    // Lepiej powiedziec "zaktualizuj aplikacje" niz zapisac z powrotem dokument
    // bez pol, ktorych ta wersja nie rozumie.
    expect(zPrzyszlosci.body).toBeNull();
    expect(zPrzyszlosci.bodyError).toMatch(/nowsz/i);
  });
});

describe('templates.repo — pakiet: termin i dokumenty (T-63)', () => {
  const harmonogram = newScheduleBody({ startDate: null });
  const dokumenty = { stages: null, priceList: null };

  it('zapisuje i wczytuje termin razem z szablonem', async () => {
    const template = await createTemplate({
      workspaceId,
      name: 'Projekt kompleksowy',
      body: sampleBody('Projekt kompleksowy'),
      schedule: harmonogram,
      documents: dokumenty,
    });
    created.push(template.id);

    const wczytany = await getTemplate(template.id);
    expect(wczytany.schedule?.stages.length).toBe(harmonogram.stages.length);
    expect(wczytany.documents).toEqual(dokumenty);
  });

  it('szablon bez pakietu ma `null`, a nie pusty obiekt', async () => {
    // `null` znaczy „ten szablon nie niesie terminu" i jest normalnym stanem —
    // pusty harmonogram wygladalby w UI jak zapisany przez pomylke.
    const template = await makeTemplate('Sama wycena');
    const wczytany = await getTemplate(template.id);

    expect(wczytany.schedule).toBeNull();
    expect(wczytany.documents).toBeNull();
  });

  it('nadpisanie z odznaczonym checkboxem KASUJE pakiet', async () => {
    // Odznaczenie ma znaczyc „ten szablon juz nie niesie terminu". Zostawienie
    // starego harmonogramu byloby cicha niespodzianka przy nastepnej wycenie.
    const template = await createTemplate({
      workspaceId,
      name: 'Do odchudzenia',
      body: sampleBody('Do odchudzenia'),
      schedule: harmonogram,
      documents: dokumenty,
    });
    created.push(template.id);

    await overwriteTemplate(template.id, sampleBody('Do odchudzenia'), {
      schedule: null,
      documents: null,
    });

    const wczytany = await getTemplate(template.id);
    expect(wczytany.schedule).toBeNull();
    expect(wczytany.documents).toBeNull();
  });

  it('uszkodzony harmonogram nie blokuje szablonu', async () => {
    const template = await makeTemplate('Zepsuty termin');
    await getSupabase()
      .from('quote_templates')
      .update({ schedule: { stages: 'nie tablica' } })
      .eq('id', template.id);

    const wczytany = await getTemplate(template.id);
    // Miekkie parsowanie jak w `quotes`: wycena ma sie otworzyc mimo smiecia
    // w kolumnie, ktora jest dodatkiem, a nie trescia dokumentu.
    expect(wczytany.schedule).toBeNull();
    expect(wczytany.body).not.toBeNull();
  });
});

describe('templates.repo — podsumowanie', () => {
  it('liczy zero dla uszkodzonego body', () => {
    expect(templateSummary(null)).toEqual({ itemCount: 0, totalNetCents: 0 });
  });
});

describe('templates.repo — RLS', () => {
  it('nie pozwala zapisac szablonu w cudzym workspace', async () => {
    const obcyWorkspace = '00000000-0000-4000-8000-000000000000';
    await expect(
      createTemplate({ workspaceId: obcyWorkspace, name: 'Obcy', body: sampleBody('Obcy') }),
    ).rejects.toThrow();
  });
});
