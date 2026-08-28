import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBrandPreview } from './useBrandPreview';
import { fetchLogoAsDataUrl } from '@/pdf/logo';
import { headerLogoVariant } from '@/pdf/theme';
import { openBytes, runningInTauri } from '@/lib/tauri';
import type { BrandKit } from '@/domain/brand/schema';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('brand.preview');

/**
 * Podgląd oferty w ustawieniach brandingu (04-PDF §4).
 *
 * Jeden przycisk: generuje przykładową ofertę z **niezapisanego szkicu**
 * i otwiera ją w systemowej przeglądarce PDF. Osadzania dokumentu w stronie
 * spróbowaliśmy dwa razy — ramką `<object>` i rysowaniem stron na kanwie —
 * i za każdym razem na macOS wychodziło białe pole bez komunikatu o błędzie.
 * Prawdziwy plik w prawdziwym czytniku działa wszędzie, pokazuje dokument
 * w pełnej skali i pozwala go wydrukować próbnie.
 *
 * Renderujemy szkic, a nie zapisany brand kit: podgląd jest coś wart tylko
 * w trakcie dobierania kolorów, a więc zanim cokolwiek trafi do bazy.
 */
export function BrandPreview({ draft }: { draft: BrandKit | null }) {
  const logoDataUrl = usePreviewLogo(draft);
  const { generate, rendering, error } = useBrandPreview(draft, logoDataUrl);
  const [opening, setOpening] = useState(false);

  const open = async () => {
    setOpening(true);
    try {
      const bytes = await generate();
      if (!bytes) return;

      if (runningInTauri()) {
        await openBytes('podglad-oferty.pdf', bytes);
        return;
      }
      // W przeglądarce (`pnpm dev`) nowa karta robi dokładnie to samo.
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      log.error('Otwarcie podgladu nieudane', reason);
      toast.error(reason instanceof Error ? reason.message : pl.files.openFailed);
    } finally {
      setOpening(false);
    }
  };

  const busy = rendering || opening;

  return (
    <section className="card-surface space-y-3 p-5">
      <h2 className="text-ink text-sm font-semibold">{pl.brand.previewTitle}</h2>
      <p className="text-ink-soft max-w-prose text-xs">{pl.brand.previewHint}</p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" variant="outline" disabled={busy || !draft} onClick={() => void open()}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <FileText className="size-4" aria-hidden />
        )}
        {busy ? pl.brand.previewRendering : pl.brand.previewOpen}
      </Button>
    </section>
  );
}

/**
 * Logo do podglądu, jako data URL.
 *
 * Wariant bierzemy z `headerLogoVariant` — tej samej funkcji, z której korzysta
 * generator PDF. Inaczej podgląd pokazywałby jasne logo tam, gdzie eksport
 * wstawi ciemne, i cała ta strona kłamałaby w najważniejszym miejscu.
 */
function usePreviewLogo(draft: BrandKit | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const path = draft
    ? headerLogoVariant(draft) === 'dark'
      ? draft.logoDarkPath
      : draft.logoLightPath
    : null;

  useEffect(() => {
    let aktualne = true;
    void fetchLogoAsDataUrl(path).then((result) => {
      if (aktualne) setDataUrl(result);
    });
    return () => {
      aktualne = false;
    };
  }, [path]);

  return dataUrl;
}
