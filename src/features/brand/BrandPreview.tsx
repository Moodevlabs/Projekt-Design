import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrandPreview } from './useBrandPreview';
import { fetchLogoAsDataUrl } from '@/pdf/logo';
import { headerLogoVariant } from '@/pdf/theme';
import type { BrandKit } from '@/domain/brand/schema';
import { pl } from '@/i18n/pl';

/**
 * Podgląd oferty obok formularza brandingu (04-PDF §4).
 *
 * Pokazuje **niezapisany szkic** — to jedyny moment, w którym podgląd jest coś
 * wart. Renderujemy prawdziwy PDF, a nie makietę w HTML-u: makieta zawsze
 * kłamie o czcionkach i marginesach, a właśnie po to tu się patrzy.
 */
export function BrandPreview({ draft }: { draft: BrandKit | null }) {
  const logoDataUrl = usePreviewLogo(draft);
  const preview = useBrandPreview(draft, logoDataUrl);

  return (
    <section className="card-surface space-y-3 p-5">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-ink text-sm font-semibold">{pl.brand.previewTitle}</h2>
        {preview.rendering ? (
          <span className="text-ink-soft flex items-center gap-1.5 text-xs">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {pl.brand.previewRendering}
          </span>
        ) : null}
      </header>

      <p className="text-ink-soft text-xs">{pl.brand.previewHint}</p>

      {preview.error ? (
        <Alert variant="destructive">
          <AlertDescription>{preview.error}</AlertDescription>
        </Alert>
      ) : null}

      {preview.url ? (
        <object
          data={preview.url}
          type="application/pdf"
          aria-label={pl.brand.previewTitle}
          className="border-hair h-[520px] w-full rounded-[var(--radius-card)] border"
        >
          {/* Webview bez wtyczki PDF nie wyświetli `object` — zostaje link. */}
          <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm underline">
            {pl.brand.previewOpen}
          </a>
        </object>
      ) : (
        <Skeleton className="h-[520px] w-full rounded-[var(--radius-card)]" />
      )}
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
