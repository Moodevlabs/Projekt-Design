-- =============================================================================
-- 0046_number_prefix_dok.sql — domyślny przedrostek numeru „DOK/” (T-115)
--
-- Od T-111 jeden wiersz `quotes` to cała dokumentacja (wycena + termin +
-- etapy + cennik), więc „WYC/” w numerze mówił o części, a nie o całości.
-- Domyślny wzorzec to teraz `DOK/{YYYY}/{MM}/{seq}` — w domenie
-- (`DEFAULT_NUMBER_PATTERN`), w obu funkcjach numerujących i w ustawieniach
-- workspace'ów, które miały zapisany STARY domyślny wzorzec dosłownie.
--
-- Wzorce własne (inne niż `WYC/{YYYY}/{MM}/{seq}`) zostają — ktoś je wybrał.
-- Numery już nadane nie zmieniają się: numer jest dokumentu, nie ustawienia.
-- =============================================================================

create or replace function public.next_quote_number(ws uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  seq int;
  pattern text;
begin
  if not public.is_member(ws) then
    raise exception 'Brak dostępu do workspace %', ws using errcode = '42501';
  end if;

  if not public.workspace_can_write(ws) then
    raise exception 'Workspace % jest w trybie tylko do odczytu', ws using errcode = '42501';
  end if;

  -- UPDATE ... RETURNING bierze blokadę wiersza: dwa równoległe wywołania
  -- nie dostaną tego samego numeru.
  update public.workspaces w
     set quote_seq = w.quote_seq + 1
   where w.id = ws
   returning w.quote_seq, coalesce(w.settings->>'numberPattern', 'DOK/{YYYY}/{MM}/{seq}')
    into seq, pattern;

  if seq is null then
    raise exception 'Workspace % nie istnieje', ws using errcode = 'P0002';
  end if;

  return replace(
           replace(
             replace(pattern, '{YYYY}', to_char(now(), 'YYYY')),
             '{MM}', to_char(now(), 'MM')),
           '{seq}', lpad(seq::text, 4, '0'));
end;
$$;

comment on function public.next_quote_number(uuid) is
  'Atomowo podbija workspaces.quote_seq i zwraca numer dokumentacji wg settings.numberPattern (domyślnie DOK/{YYYY}/{MM}/{seq}).';

-- `next_document_number` (0042) zostaje dla parytetu z kolumną `doc_kind`,
-- choć aplikacja od T-111 woła tylko `next_quote_number`. Fallback dla
-- `offer` też idzie na DOK, żeby obie drogi dawały ten sam numer.
create or replace function public.next_document_number(ws uuid, kind text)
returns text
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  seq int;
  pattern text;
  fallback text;
begin
  if not public.is_member(ws) then
    raise exception 'Brak dostępu do workspace %', ws using errcode = '42501';
  end if;

  if not public.workspace_can_write(ws) then
    raise exception 'Workspace % jest w trybie tylko do odczytu', ws using errcode = '42501';
  end if;

  fallback := case kind
    when 'schedule'   then 'TER/{YYYY}/{MM}/{seq}'
    when 'stages'     then 'ETP/{YYYY}/{MM}/{seq}'
    when 'price_list' then 'CEN/{YYYY}/{MM}/{seq}'
    else 'DOK/{YYYY}/{MM}/{seq}'
  end;

  update public.workspaces w
     set quote_seq = w.quote_seq + 1
   where w.id = ws
   returning
     w.quote_seq,
     case
       when kind = 'offer' then coalesce(w.settings->>'numberPattern', fallback)
       else coalesce(w.settings->'numberPatterns'->>kind, fallback)
     end
    into seq, pattern;

  if seq is null then
    raise exception 'Workspace % nie istnieje', ws using errcode = 'P0002';
  end if;

  return replace(
           replace(
             replace(pattern, '{YYYY}', to_char(now(), 'YYYY')),
             '{MM}', to_char(now(), 'MM')),
           '{seq}', lpad(seq::text, 4, '0'));
end;
$$;

-- Workspace'y ze STARYM domyślnym wzorcem zapisanym dosłownie (formularz
-- ustawień zapisuje cały obiekt, więc domyślna wartość ląduje w bazie).
update public.workspaces
   set settings = jsonb_set(settings, '{numberPattern}', to_jsonb('DOK/{YYYY}/{MM}/{seq}'::text))
 where settings->>'numberPattern' = 'WYC/{YYYY}/{MM}/{seq}';
