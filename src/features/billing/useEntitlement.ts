import { useMemo } from 'react';
import { useSubscription } from '@/data/queries/useSubscription';
import { entitlementFor, type Entitlement } from '@/domain/billing/entitlement';

export interface EntitlementState extends Entitlement {
  /**
   * Nie wiemy jeszcze, jak jest — trwa pobieranie albo się nie udało.
   * Przez ten czas `canWrite` jest `true`, a UI nie pokazuje nic o wygaśnięciu.
   */
  loading: boolean;
  /** Odnowienie albo koniec okresu próbnego — do pokazania na ekranie subskrypcji. */
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
}

/**
 * Prawo zapisu dla bieżącego workspace'u.
 *
 * **Blokujemy tylko wtedy, gdy wiemy, że dostęp wygasł.** Dopóki odpowiedź nie
 * dotarła — albo zapytanie się wywaliło — zakładamy, że wolno pisać. Odwrotny
 * domysł znaczyłby, że każdy start aplikacji na sekundę wygląda na
 * zablokowany, a chwilowy brak sieci odbiera prawo do pracy komuś, kto
 * regularnie płaci. To najgorszy możliwy moment na taki komunikat.
 *
 * Nie osłabia to niczego: prawdziwą granicą jest RLS w bazie. Tutaj chodzi
 * wyłącznie o to, żeby interfejs nie kłamał, gdy nie ma pewności.
 */
export function useEntitlement(): EntitlementState {
  const subscription = useSubscription();

  return useMemo(() => {
    const data = subscription.data ?? null;

    /*
     * Jedyny stan, który cokolwiek przesądza, to `isSuccess`. Wszystko inne —
     * pobieranie w toku, błąd sieci, a przede wszystkim zapytanie jeszcze
     * WYŁĄCZONE (czeka na identyfikator workspace'u) — znaczy „nie wiem".
     *
     * Sprawdzanie samego `isLoading` przepuszczało ten ostatni przypadek:
     * wyłączone zapytanie nie jest „ładujące się", więc na starcie aplikacji
     * wychodziło „brak subskrypcji" i edytor na moment zamykał się każdemu,
     * łącznie z płacącymi.
     */
    if (!subscription.isSuccess) {
      return {
        canWrite: true,
        reason: 'active',
        loading: true,
        renewsAt: null,
        cancelAtPeriodEnd: false,
        hasCustomer: false,
      };
    }

    const entitlement = entitlementFor(
      data && {
        status: data.status,
        trialEndsAt: data.trialEndsAt,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      },
    );

    return {
      ...entitlement,
      loading: false,
      // Przy okresie próbnym „odnowienie" to jego koniec — to ta data
      // interesuje użytkownika, a nie puste `current_period_end`.
      renewsAt: data?.status === 'trialing' ? data.trialEndsAt : (data?.currentPeriodEnd ?? null),
      cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
      hasCustomer: Boolean(data?.stripeCustomerId),
    };
  }, [subscription.data, subscription.isSuccess]);
}
