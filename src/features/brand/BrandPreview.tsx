import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrandPreview } from './useBrandPreview';
import { fetchLogoAsDataUrl } from '@/pdf/logo';
import { headerLogoVariant } from '@/pdf/theme';
import { openBytes, runningInTauri } from '@/lib/tauri';
import type { BrandKit } from '@/domain/brand/schema';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('brand.preview');

/**
 * Podgląd oferty obok formularza brandingu (04-PDF §4).
 *
 * Pokazuje **niezapisany szkic** — to jedyny moment, w którym podgląd jest coś
 * wart. Renderujemy prawdziwy PDF, a nie makietę w HTML-u: makieta zawsze
 * kłamie o czcionkach i marginesach, a właśnie po to tu się patrzy.
 *
 * Dokument wyświetlamy jako **obrazki stron** (poprawka z 2026-08-28), bo
 * osadzenie go w `<object type="application/pdf">` dawało na macOS białe pole:
 * WKWebView, na którym stoi tam Tauri, PDF-ów w ramkach nie renderuje i nie
 * mówi o tym ani słowa. Rysunek na canvasie wygląda tak samo na każdym
 * systemie. Obok stoi przycisk otwierający prawdziwy plik w czytniku
 * systemowym — do obejrzenia w pełnej skali i wydrukowania próbnie.
 */
export function BrandPreview({ draft }: { draft: BrandKit | null }) {
  const logoDataUrl = usePreviewLogo(draft);
  const preview = useBrandPreview(draft, logoDataUrl);

  return (
    <section className="card-surface space-y-3 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-ink text-sm font-semibold">{pl.brand.previewTitle}</h2>
        <div className="flex items-center gap-3">
          {preview.rendering ? (
            <span className="text-ink-soft flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {pl.brand.previewRendering}
            </span>
          ) : null}
          <OpenExternallyButton bytes={preview.bytes} />
        </div>
      </header>

      <p className="text-ink-soft text-xs">{pl.brand.previewHint}</p>

      {preview.error ? (
        <Alert variant="destructive">
          <AlertDescription>{preview.error}</AlertDescription>
        </Alert>
      ) : null}

      {preview.pages.length > 0 ? (
        <div className="border-hair bg-canvas max-h-[520px] space-y-4 overflow-y-auto rounded-[var(--radius-card)] border p-4">
          {preview.pages.map((page, index) => (
            <img
              key={index}
              src={page.dataUrl}
              alt={pl.brand.previewPage(index + 1)}
              /* Strona A4 ma zachować proporcje niezależnie od szerokości karty,
                 stąd wymiary z viewportu pdf.js zamiast sztywnej wysokości. */
              width={page.width}
              height={page.height}
              className="mx-auto h-auto w-full max-w-[560px] rounded-[var(--radius-control)] shadow-sm"
            />
          ))}
        </div>
      ) : (
        <Skeleton className="h-[520px] w-full rounded-[var(--radius-card)]" />
      )}
    </section>
  );
}

/**
 * Otwarcie podglądu w systemowym czytniku PDF.
 *
 * Obrazki stron wystarczą do dobrania kolorów i kroju, ale nie do sprawdzenia,
 * jak dokument wyjdzie z drukarki. Ten przycisk podaje PRAWDZIWY plik — te
 * same bajty, które trafiłyby do inwestora.
 */
function OpenExternallyButton({ bytes }: { bytes: Uint8Array | null }) {
  const [busy, setBusy] = useState(false);

  if (!bytes) return null;

  const open = async () => {
    setBusy(true);
    try {
      if (runningInTauri()) {
        await openBytes('podglad-oferty.pdf', bytes);
        return;
      }
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      log.error('Otwarcie podgladu nieudane', error);
      toast.error(error instanceof Error ? error.message : pl.files.openFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void open()}>
      <ExternalLink className="size-4" aria-hidden />
      {pl.brand.previewOpen}
    </Button>
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
