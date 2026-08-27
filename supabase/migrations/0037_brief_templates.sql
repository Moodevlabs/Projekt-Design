-- =============================================================================
-- 0037 — Edytowalny szablon briefu (T-96)
--
-- ## Problem
--
-- Do T-93 zestaw pytań briefu był STAŁĄ w kodzie (`domain/brief/template.ts`).
-- Każda pracownia pyta jednak o co innego: projektant wnętrz komercyjnych nie
-- pyta o zwierzęta domowe, a pracownia wyspecjalizowana w kuchniach nie
-- potrzebuje bloku „kto tu będzie mieszkał”. Zestaw wbudowany jest dobrym
-- punktem startu i złym punktem docelowym.
--
-- ## Rozwiązanie
--
-- Szablon staje się DANYMI workspace'u. Nie jedną kolumną, lecz tabelą — bo
-- szablonów bywa kilka i jest to stan normalny: inny brief do mieszkania, inny
-- do lokalu usługowego, inny do samej kuchni. Jeden szablon na workspace
-- wymuszałby przepisywanie pytań przy każdym nowym typie zlecenia.
--
-- ## Czego ta migracja NIE zmienia
--
-- Snapshotu w `client_briefs.template` (T-93). To zostaje sednem: przy
-- wystawieniu linku sekcje szablonu kopiowane są do wiersza briefu, więc
-- późniejsza edycja szablonu nie zmienia briefów już wysłanych ani odpowiedzi
-- już zebranych. Szablon jest formularzem, brief jest dokumentem.
-- =============================================================================

create table if not exists public.brief_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Nazwa robocza, widoczna wyłącznie dla projektanta („Brief — mieszkanie”).
  -- Klient jej nie widzi: otrzymuje pytania, nie nazwę formularza.
  name text not null default 'Brief klienta',

  -- Sekcje i pytania — ten sam kształt co `client_briefs.template`.
  -- Kształtu pilnuje zod w `domain/brief` (BriefTemplateSchema).
  sections jsonb not null default '[]'::jsonb,

  -- Szablon podpowiadany przy wystawianiu linku. Dokładnie jeden na workspace
  -- (patrz indeks i wyzwalacz poniżej).
  is_default boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brief_templates_workspace_idx
  on public.brief_templates (workspace_id, created_at);

-- Jeden domyślny na workspace — pilnowane w bazie, nie w UI. Dwa domyślne
-- oznaczałyby, że „wystaw brief” losuje zestaw pytań, a jest to rodzaj błędu,
-- którego nikt nie zauważa do chwili, w której klient otrzyma zły formularz.
create unique index if not exists brief_templates_one_default_idx
  on public.brief_templates (workspace_id) where is_default;

comment on table public.brief_templates is
  'Edytowalne zestawy pytan briefu. Formularz, nie dokument — dokumentem jest client_briefs z wlasnym snapshotem.';
comment on column public.brief_templates.sections is
  'Sekcje i pytania: [{ id, title, hint, questions: [{ id, label, kind, hint, placeholder, options, required }] }].';
comment on column public.brief_templates.is_default is
  'Szablon podpowiadany przy wystawianiu linku. Wyzwalacz pilnuje, ze jest dokladnie jeden na workspace.';

-- -----------------------------------------------------------------------------
-- Ustawienie domyslnego zdejmuje flage z pozostalych.
--
-- Wyzwalacz, a nie dwa UPDATE-y z aplikacji: partial unique index odrzucilby
-- drugi domyslny w polowie operacji i zostawil workspace bez zadnego. Tutaj
-- czyszczenie odbywa sie PRZED zapisem wiersza, w jednej transakcji.
-- -----------------------------------------------------------------------------
create or replace function public.brief_templates_single_default()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.is_default then
    update public.brief_templates
       set is_default = false
     where workspace_id = new.workspace_id
       and id <> new.id
       and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists brief_templates_single_default on public.brief_templates;
create trigger brief_templates_single_default
  before insert or update of is_default on public.brief_templates
  for each row execute function public.brief_templates_single_default();

drop trigger if exists brief_templates_set_updated_at on public.brief_templates;
create trigger brief_templates_set_updated_at
  before update on public.brief_templates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — jak wszedzie: tylko czlonek workspace'u, zapis tylko z aktywnym dostepem.
-- -----------------------------------------------------------------------------
alter table public.brief_templates enable row level security;

drop policy if exists "brief_templates: select member" on public.brief_templates;
create policy "brief_templates: select member" on public.brief_templates
  for select to authenticated
  using (public.is_member(workspace_id));

drop policy if exists "brief_templates: insert member" on public.brief_templates;
create policy "brief_templates: insert member" on public.brief_templates
  for insert to authenticated
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "brief_templates: update member" on public.brief_templates;
create policy "brief_templates: update member" on public.brief_templates
  for update to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id))
  with check (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

drop policy if exists "brief_templates: delete member" on public.brief_templates;
create policy "brief_templates: delete member" on public.brief_templates
  for delete to authenticated
  using (public.is_member(workspace_id) and public.workspace_can_write(workspace_id));

grant select, insert, update, delete on public.brief_templates to authenticated;
