import { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { IMAGE_TYPES, imageFileError } from '@/lib/image-file';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Zdjęcie: podgląd w kółku, wgranie, usunięcie.
 *
 * Jeden komponent dla użytkownika (poprawka 4) i klienta (poprawka 5) — to ta
 * sama czynność i ma wyglądać tak samo. Zastępstwem jest zawsze skrót nazwy,
 * nigdy pusta plama: puste kółko wygląda jak nieudany upload, a inicjały
 * mówią, czyje to miejsce.
 */
export function AvatarPicker({
  label,
  hint,
  url,
  initials,
  size = 'md',
  busy = false,
  onPick,
  onRemove,
}: {
  label: string;
  hint?: string;
  url: string | null;
  initials: string;
  size?: 'md' | 'lg';
  busy?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const pick = (file: File) => {
    const error = imageFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    onPick(file);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className={cn(size === 'lg' ? 'size-20' : 'size-14')}>
        {url ? <AvatarImage src={url} alt={label} /> : null}
        <AvatarFallback className="bg-surface-2 text-ink-soft text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 space-y-2">
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          aria-label={label}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pick(file);
            // Czyścimy, żeby ponowny wybór TEGO SAMEGO pliku znów odpalił zmianę.
            event.target.value = '';
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {url ? pl.common.change : pl.common.add}
          </Button>

          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={`${pl.common.delete}: ${label}`}
              onClick={onRemove}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>

        {hint ? <p className="text-ink-soft text-xs">{hint}</p> : null}
      </div>
    </div>
  );
}
