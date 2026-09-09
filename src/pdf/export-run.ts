import { toast } from 'sonner';
import type { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

type Logger = ReturnType<typeof createLogger>;

/**
 * Jeden toast postępu dla wszystkich eksportów — stałe `id`, żeby drugi
 * eksport zastąpił pierwszy, a nie ustawił się pod nim.
 */
export const PDF_PROGRESS_TOAST = 'pdf-progress';

/**
 * Wspólny przebieg eksportu PDF (2026-09-09).
 *
 * Pięć hooków eksportu robiło to samo na własną rękę: `try`, `log.error`,
 * `toast.error`. Brakowało dwóch rzeczy, przez które „eksport czasem nie
 * działa i nie wiadomo dlaczego":
 *
 * 1. **Znaku życia.** Między kliknięciem a dialogiem zapisu mija render,
 *    pobranie logo i archiwizacja — kilka sekund, w których nic się nie
 *    działo, a pozycje menu były wyszarzone. Teraz stoi toast „Generowanie".
 * 2. **Końca.** Kroki sieciowe potrafiły nie odpowiedzieć nigdy; wtedy
 *    `finally` nie nadchodził i menu zostawało wyszarzone do restartu.
 *    Limity czasu siedzą w samych krokach (`withTimeout`), a tu jest
 *    miejsce, w którym każdy z nich kończy się czytelnym komunikatem.
 *
 * Toast postępu znika, gdy praca się skończy — albo wcześniej, gdy
 * `deliverPdf` otwiera dialog zapisu (dalej czeka już człowiek, nie program).
 */
export async function runPdfExport(
  log: Logger,
  failLog: string,
  work: () => Promise<void>,
): Promise<void> {
  toast.loading(pl.pdf.generating, { id: PDF_PROGRESS_TOAST });
  try {
    await work();
    toast.dismiss(PDF_PROGRESS_TOAST);
  } catch (error) {
    log.error(failLog, error);
    toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed, {
      id: PDF_PROGRESS_TOAST,
    });
  }
}
