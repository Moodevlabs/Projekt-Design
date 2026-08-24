# 03 — Subskrypcja i Stripe

## 1. Produkty w Stripe
- Product „Toolier": price `monthly` **98,99 PLN/mies.**, `yearly` **999,99 PLN/rok** (roczna = ~10 miesięcy w cenie 12; ekran subskrypcji pokazuje oszczędność).
  **Zmiana ceny 2026-08-24** (wcześniej 19,99 / 199 pod nazwą „Anzorge"). Stripe nie pozwala edytować kwoty istniejącego `price` — tworzymy **nowe** ceny z `lookup_key` `toolier_monthly` / `toolier_yearly`, stare archiwizujemy (nie kasujemy: mogą być na nich istniejące subskrypcje testowe). Kwoty w UI tylko z `pl.billing.prices` (i18n) — jedno miejsce. Zadanie: T-66.
  **Nazwa produktu jest widoczna dla klienta na stronie płatności** — nie ma tu żadnego „Pro”, bo nie ma wersji darmowej. Płaci się za korzystanie z aplikacji; miesięcznie albo rocznie. Tax: ceny brutto (`tax_behavior: inclusive`), włączony Stripe Tax (VAT PL / OSS).
- Trial nie jest w Stripe — trial jest **nasz** (`subscriptions.trial_ends_at` nadawany przy signup). Dzięki temu nie wymagamy karty i Stripe customer powstaje dopiero przy pierwszym checkout.
- Customer Portal: włączone zmiana planu, anulowanie na koniec okresu, faktury.

## 2. Przepływ zakupu

```
[App] "Aktywuj dostęp" ──invoke──► Edge fn stripe-create-checkout (JWT usera)
   └─ tworzy/odnajduje customer (metadata.workspace_id), session.url
[App] opener.openUrl(session.url)  ──► przeglądarka systemowa, Stripe Checkout
   success_url = toolier://billing/success   cancel_url = toolier://billing/cancel
[Stripe] webhook ──► Edge fn stripe-webhook ──► upsert subscriptions (service role)
[App] deep link success ──► invalidate query 'subscription' + polling co 2 s przez max 30 s aż status=active
```

Dlaczego polling po powrocie: webhook może dojść po deep linku. Alternatywa: Supabase Realtime na `subscriptions` — zrób to, jeśli okaże się prostsze (1 subskrypcja kanału na workspace).

## 3. Edge Functions (Deno)

`stripe-create-checkout`
- Wejście: `{ plan: 'monthly'|'yearly' }` (okres rozliczeniowy). Auth: JWT z `Authorization`.
- Pobierz workspace usera (musi być owner). Jeśli `stripe_customer_id` brak → `customers.create({ email, metadata: { workspace_id } })`, zapisz.
- `checkout.sessions.create({ mode:'subscription', customer, line_items:[{price}], success_url, cancel_url, allow_promotion_codes:true, automatic_tax:{enabled:true}, metadata:{workspace_id} })`.
- Zwróć `{ url }`.

`stripe-create-portal` → `billingPortal.sessions.create({ customer, return_url: 'toolier://billing/return' })`.

`stripe-webhook`
- Weryfikacja podpisu (`stripe.webhooks.constructEventAsync`, `STRIPE_WEBHOOK_SECRET`).
- Idempotencja: `insert into stripe_events` — jeśli konflikt, `200` i koniec.
- Obsługiwane eventy → `upsert subscriptions`:
  - `checkout.session.completed` → pobierz subscription, ustaw `active`, `stripe_subscription_id`, `plan`, `current_period_end`.
  - `customer.subscription.updated` / `.deleted` → mapuj `status`, `cancel_at_period_end`, `current_period_end`.
  - `invoice.payment_failed` → `past_due`.
  - `invoice.paid` → `active`.
- `workspace_id` z `subscription.metadata` lub `customer.metadata` — zawsze ustawiaj przy tworzeniu.
- Odpowiadaj 200 szybko; loguj błędy do `console.error` (Supabase logs).

Sekrety: `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_PRICE_MONTHLY=... STRIPE_PRICE_YEARLY=...`.

## 4. Gating w aplikacji

`useSubscription()` (TanStack Query, `staleTime: 60s`, persist do cache) → `entitlement`:

```ts
type Entitlement = { canWrite: boolean; reason: 'trial'|'active'|'grace'|'expired'|'canceled'; daysLeft?: number }
```

Logika w `domain/billing/entitlement.ts` (czysta funkcja od wiersza `subscriptions` + `now`) — **identyczna** z `workspace_can_write()` w SQL. Test jednostkowy pilnuje parytetu na przypadkach brzegowych.

UI:
- `<PaywallGate>` owija akcje zapisu: gdy `!canWrite` → przyciski disabled + banner na górze edytora „Tryb tylko do odczytu — opłać dostęp, żeby edytować".
- Trial: pasek „Zostało X dni triala" w sidebarze od 7. dnia.
- Offline / brak odpowiedzi: używaj ostatniego znanego entitlement z cache, max 7 dni od `fetchedAt`; potem read-only z komunikatem „Połącz się z internetem, żeby odświeżyć licencję".
- RLS jest twardą granicą — nawet obejście UI nie pozwoli zapisać.

## 5. Edge-case'y do obsłużenia
- Użytkownik kupił, ale zamknął przeglądarkę przed redirectem → stan i tak przyjdzie webhookiem; ekran subskrypcji ma przycisk „Odśwież".
- Chargeback/unpaid → read-only, nie kasujemy danych.
- Usunięcie konta (RODO): Edge fn `delete-account` → `subscriptions.cancel` w Stripe, usuń usera (cascade).
- Zmiana e-maila w Supabase → aktualizuj customer w Stripe (Edge fn `sync-customer-email`, faza 2).

## 6. Lokalne testy
```
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```
Testowe karty: `4242…` ok, `4000 0000 0000 0341` failure.
