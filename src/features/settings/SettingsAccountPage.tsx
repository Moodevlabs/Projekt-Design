import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageSection } from '@/components/shared';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

import { AccountSection } from './AccountSection';

/**
 * Ustawienia → Konto.
 *
 * Wszystko, co dotyczy **człowieka i jego dostępu**: hasło, subskrypcja,
 * kopia danych, usunięcie konta.
 *
 * Świadomie oddzielone od ustawień dokumentów. „Jaki VAT ma nowa wycena"
 * i „jak zmienić hasło" to dwa różne pytania, a do 2026-08-27 odpowiedzi na
 * nie stały w jednej kolumnie jedna pod drugą — razem z brandingiem, koszem
 * i aktualizacjami. Żeby cokolwiek znaleźć, trzeba było przewinąć wszystko.
 */
export function SettingsAccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-16">
      <p className="text-ink-soft text-sm">{pl.settings.accountIntro}</p>

      {/*
        Subskrypcja jest tu ODNOŚNIKIEM, nie kopią ekranu płatności: plan,
        faktury i portal Stripe'a mają własny ekran, a powielenie ich tutaj
        dałoby dwa miejsca, w których trzeba pamiętać o tej samej zmianie.
      */}
      <PageSection
        title={pl.billing.title}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to={routes.subscription}>
              {pl.settings.manageSubscription}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        }
      >
        <p className="text-ink-soft text-sm">{pl.settings.subscriptionHint}</p>
      </PageSection>

      <AccountSection />
    </div>
  );
}
