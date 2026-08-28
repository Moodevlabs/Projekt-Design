-- =============================================================================
-- 0040 — Logo pracowni na stronie briefu (poprawka z 2026-08-28)
--
-- ## Objaw
--
-- Brief otwarty z magic linka pokazywał samą nazwę firmy tekstem, mimo że
-- `get_shared_brief` zwraca `logoPath` dokładnie tak jak `get_shared_quote`,
-- a `BriefApp` renderuje znak tym samym kodem co strona oferty.
--
-- ## Przyczyna
--
-- Polityka odczytu bucketa `brand` dla `anon` (migracja 0025) wpuszczała
-- gościa tylko wtedy, gdy workspace ma żywy link **do oferty**. Powstała
-- zanim briefy w ogóle istniały. Klient z samym briefem — czyli ktoś na
-- PIERWSZYM etapie współpracy, przed jakąkolwiek wyceną — nie spełniał tego
-- warunku, więc `createSignedUrl` odmawiał, a strona po cichu wracała do
-- napisu. Formularz bez znaku nadawcy wygląda jak spam i tak bywa traktowany,
-- a jest to pierwszy dokument, jaki inwestor od pracowni dostaje.
--
-- ## Zakres
--
-- Rozszerzamy warunek o żywy brief. Nadal chodzi WYŁĄCZNIE o bucket `brand`
-- (nie o `files` z dokumentami klientów) i wyłącznie na czas życia linku:
-- odwołany albo wygasły brief przestaje otwierać logo tak samo jak odwołana
-- oferta.
-- =============================================================================

drop policy if exists "brand: select via active share" on storage.objects;
create policy "brand: select via active share" on storage.objects
  for select to anon
  using (
    bucket_id = 'brand'
    and (
      -- Żywy link do oferty (stan z 0025, bez zmian).
      exists (
        select 1
          from public.quote_shares s
          join public.quotes q on q.id = s.quote_id
         where q.workspace_id = public.storage_workspace_id(storage.objects.name)
           and q.deleted_at is null
           and s.revoked_at is null
           and (s.expires_at is null or s.expires_at > now())
      )
      -- Żywy brief. Warunek jest ten sam, którego pilnuje `brief_status`:
      -- link nieodwołany i niewygasły. Trzymamy go tutaj wprost, a nie przez
      -- wywołanie funkcji, bo polityka RLS musi dać się zaplanować jako
      -- zwykłe `exists` — i tak też korzysta z indeksu po `workspace_id`.
      or exists (
        select 1
          from public.client_briefs b
         where b.workspace_id = public.storage_workspace_id(storage.objects.name)
           and b.revoked_at is null
           and (b.expires_at is null or b.expires_at > now())
      )
    )
  );

comment on policy "brand: select via active share" on storage.objects is
  'Anonim czyta logo z bucketa brand tylko wtedy, gdy workspace ma zywy link — do oferty albo do briefu.';
