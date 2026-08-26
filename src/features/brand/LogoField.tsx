import { useRef } from 'react';
import { ImageOff, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogoUrl } from '@/data/queries/useBrandKit';
import type { LogoVariant } from '@/data/repos/brand.repo';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Limity z bucketa `brand` (migracja 0005) — sprawdzamy je też tutaj. */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/**
 * Jedno logo: podgląd, wgranie, usunięcie.
 *
 * Rozmiar i typ sprawdzamy **przed** wysyłką, mimo że bucket i tak by odrzucił
 * plik — komunikat z Storage jest po angielsku i mówi o MIME, a użytkownik ma
 * usłyszeć, że plik jest za duży.
 *
 * Ciemny wariant pokazujemy na jasnym tle i odwrotnie: logo jasne na białym
 * podglądzie byłoby niewidoczne i wyglądałoby jak nieudany upload.
 */
export function LogoField({
  variant,
  label,
  path,
  uploading,
  onUpload,
  onRemove,
}: {
  variant: LogoVariant;
  label: string;
  path: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const url = useLogoUrl(path);

  const pick = (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(pl.brand.logoTooBig);
      return;
    }
    if (!TYPES.includes(file.type)) {
      toast.error(pl.brand.logoWrongType);
      return;
    }
    onUpload(file);
  };

  return (
    <div className="space-y-2">
      <p className="text-ink text-sm font-medium">{label}</p>

      <div
        className={cn(
          'border-hair flex h-24 items-center justify-center rounded-[var(--radius-card)] border p-3',
          variant === 'light' ? 'bg-brown' : 'bg-surface',
        )}
      >
        {path && url.isLoading ? (
          <Skeleton className="h-full w-32" />
        ) : path && url.data ? (
          <img src={url.data} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              variant === 'light' ? 'text-white/60' : 'text-ink-soft',
            )}
          >
            <ImageOff className="size-4" aria-hidden />
            {pl.brand.logoEmpty}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={input}
          type="file"
          accept={TYPES.join(',')}
          aria-label={pl.brand.logoUpload(label)}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pick(file);
            // Czyścimy, żeby ponowny wybór TEGO SAMEGO pliku znów odpalił zmianę.
            event.target.value = '';
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          {pl.common.change}
        </Button>

        {path ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={pl.brand.logoRemove(label)}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      <p className="text-ink-soft text-xs">{pl.brand.logoHint}</p>
    </div>
  );
}
