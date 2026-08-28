import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogoField } from './LogoField';
import { BrandPreview } from './BrandPreview';
import {
  useBrandKit,
  useRemoveLogo,
  useUpdateBrandKit,
  useUploadLogo,
} from '@/data/queries/useBrandKit';
import {
  FontFamilySchema,
  HexColorSchema,
  MAX_OPENING_HOURS_ROWS,
  type BrandKit,
  type HeaderLogoChoice,
} from '@/domain/brand/schema';
import { headerLogoVariant } from '@/pdf/theme';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const FONTS = FontFamilySchema.options;

/** Sekcja formularza — nagłówek, opcjonalne zdanie wprowadzające, siatka pól. */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="text-ink text-sm font-semibold">{title}</h2>
        {hint ? <p className="text-ink-soft max-w-prose text-xs">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Ustawienia brandingu (04-PDF §3) razem z blokiem „CZYNNE" i wystawiającym
 * z `FEATURES §F7.2` — scalone świadomie, żeby nie przechodzić dwa razy przez
 * ten sam formularz i tę samą stopkę PDF.
 *
 * Formularz trzyma **własny szkic** i zapisuje jawnie: brand kit czyta generator
 * PDF i podgląd, więc zapis przy każdym naciśnięciu klawisza przerysowywałby
 * dokument w trakcie pisania.
 */
export function BrandSettingsPage() {
  const brandKit = useBrandKit();
  const update = useUpdateBrandKit();
  const upload = useUploadLogo();
  const removeLogoMutation = useRemoveLogo();

  const [draft, setDraft] = useState<BrandKit | null>(null);

  useEffect(() => {
    // Świeże dane wpuszczamy tylko wtedy, gdy nie ma niezapisanych zmian.
    if (brandKit.data && draft === null) setDraft(brandKit.data);
  }, [brandKit.data, draft]);

  if (brandKit.isLoading || draft === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (brandKit.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{brandKit.error.message}</AlertDescription>
      </Alert>
    );
  }

  const patch = (fields: Partial<BrandKit>) =>
    setDraft((previous) => (previous ? { ...previous, ...fields } : previous));

  const colorsValid =
    HexColorSchema.safeParse(draft.accentColor).success &&
    HexColorSchema.safeParse(draft.bgColor).success;

  // Ta sama funkcja, z której korzysta generator PDF — strona brandingu nie ma
  // prawa zgadywać po swojemu, który znak stanie na nagłówku.
  const headerVariant = headerLogoVariant(draft);

  const dirty = JSON.stringify(draft) !== JSON.stringify(brandKit.data);

  const save = () => {
    update.mutate(draft, {
      onSuccess: () => toast.success(pl.brand.saved),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4 pb-24">
      <Section title={pl.brand.sectionIdentity}>
        <div className="space-y-2">
          <Label htmlFor="company-name">{pl.brand.companyName}</Label>
          <Input
            id="company-name"
            value={draft.companyName}
            onChange={(event) => patch({ companyName: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="address">{pl.brand.address}</Label>
            <Input
              id="address"
              value={draft.address ?? ''}
              onChange={(event) => patch({ address: event.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-id">{pl.brand.taxId}</Label>
            <Input
              id="tax-id"
              value={draft.taxId ?? ''}
              onChange={(event) => patch({ taxId: event.target.value || null })}
            />
          </div>
        </div>
      </Section>

      <Section title={pl.brand.sectionLook} hint={pl.brand.sectionLookHint}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LogoField
            variant="dark"
            label={pl.brand.logoDark}
            hint={pl.brand.logoDarkHint}
            active={headerVariant === 'dark'}
            path={draft.logoDarkPath}
            uploading={upload.isPending}
            onUpload={(file) =>
              upload.mutate(
                { variant: 'dark', file },
                {
                  onSuccess: (saved) => {
                    patch({ logoDarkPath: saved.logoDarkPath });
                    toast.success(pl.brand.logoUploaded);
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
            onRemove={() =>
              removeLogoMutation.mutate('dark', {
                onSuccess: () => {
                  patch({ logoDarkPath: null });
                  toast.success(pl.brand.logoRemoved);
                },
              })
            }
          />

          <LogoField
            variant="light"
            label={pl.brand.logoLight}
            hint={pl.brand.logoLightHint}
            active={headerVariant === 'light'}
            path={draft.logoLightPath}
            uploading={upload.isPending}
            onUpload={(file) =>
              upload.mutate(
                { variant: 'light', file },
                {
                  onSuccess: (saved) => {
                    patch({ logoLightPath: saved.logoLightPath });
                    toast.success(pl.brand.logoUploaded);
                  },
                  onError: (error) => toast.error(error.message),
                },
              )
            }
            onRemove={() =>
              removeLogoMutation.mutate('light', {
                onSuccess: () => {
                  patch({ logoLightPath: null });
                  toast.success(pl.brand.logoRemoved);
                },
              })
            }
          />
        </div>

        <HeaderLogoField
          value={draft.headerLogo}
          resolved={headerVariant}
          missing={headerVariant === 'dark' ? !draft.logoDarkPath : !draft.logoLightPath}
          onChange={(headerLogo) => patch({ headerLogo })}
        />

        {/*
          Kolory w dwóch kolumnach, nie w trzech obok fontu: przy każdym stoi
          teraz dwa zdania o tym, GDZIE to widać, a w kolumnie szerokiej na
          jedną trzecią karty te zdania łamałyby się na sześć linijek i nikt by
          ich nie przeczytał.

          `items-stretch` (domyślne w gridzie) plus `h-full` w `ColorField`
          dają obu kolumnom tę samą wysokość, dzięki czemu próbniki stoją
          w jednej linii mimo opisów różnej długości.
        */}
        <div className="grid items-stretch gap-4 sm:grid-cols-2">
          <ColorField
            id="accent-color"
            label={pl.brand.accentColor}
            hint={pl.brand.accentColorHint}
            value={draft.accentColor}
            onChange={(accentColor) => patch({ accentColor })}
          />
          <ColorField
            id="bg-color"
            label={pl.brand.bgColor}
            hint={pl.brand.bgColorHint}
            value={draft.bgColor}
            onChange={(bgColor) => patch({ bgColor })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="font-family">{pl.brand.font}</Label>
            <p className="text-ink-soft text-xs">{pl.brand.fontHint}</p>
            <select
              id="font-family"
              value={draft.fontFamily}
              onChange={(event) =>
                patch({ fontFamily: FontFamilySchema.catch('Lato').parse(event.target.value) })
              }
              className="border-hair focus-within:border-ring h-9 w-full rounded-[var(--radius-control)] border bg-transparent px-2 text-sm outline-none"
            >
              {FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title={pl.brand.sectionContact}>
        <div className="space-y-3">
          {draft.contacts.map((contact, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label>{pl.brand.contactName(index)}</Label>
                <Input
                  value={contact.name}
                  aria-label={pl.brand.contactName(index)}
                  onChange={(event) =>
                    patch({
                      contacts: draft.contacts.map((row, at) =>
                        at === index ? { ...row, name: event.target.value } : row,
                      ),
                    })
                  }
                />
              </div>
              <div className="min-w-[120px] flex-1 space-y-1">
                <Label>{pl.brand.contactPhone(index)}</Label>
                <Input
                  value={contact.phone}
                  aria-label={pl.brand.contactPhone(index)}
                  onChange={(event) =>
                    patch({
                      contacts: draft.contacts.map((row, at) =>
                        at === index ? { ...row, phone: event.target.value } : row,
                      ),
                    })
                  }
                />
              </div>
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label>{pl.brand.contactEmail(index)}</Label>
                <Input
                  value={contact.email}
                  aria-label={pl.brand.contactEmail(index)}
                  onChange={(event) =>
                    patch({
                      contacts: draft.contacts.map((row, at) =>
                        at === index ? { ...row, email: event.target.value } : row,
                      ),
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={pl.brand.removeContact(index)}
                onClick={() => patch({ contacts: draft.contacts.filter((_, at) => at !== index) })}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              patch({ contacts: [...draft.contacts, { name: '', phone: '', email: '' }] })
            }
          >
            <Plus className="size-4" aria-hidden />
            {pl.brand.addContact}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="footer-text">{pl.brand.footerText}</Label>
          <Textarea
            id="footer-text"
            value={draft.footerText ?? ''}
            onChange={(event) => patch({ footerText: event.target.value || null })}
          />
        </div>

        <OpeningHoursFields
          rows={draft.openingHours}
          onChange={(openingHours) => patch({ openingHours })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signer-name">{`${pl.brand.signer}: ${pl.brand.signerName}`}</Label>
            <Input
              id="signer-name"
              value={draft.signerName ?? ''}
              onChange={(event) => patch({ signerName: event.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signer-title">{`${pl.brand.signer}: ${pl.brand.signerTitle}`}</Label>
            <Input
              id="signer-title"
              value={draft.signerTitle ?? ''}
              placeholder={pl.brand.signerTitlePlaceholder}
              onChange={(event) => patch({ signerTitle: event.target.value || null })}
            />
          </div>
        </div>
      </Section>

      <Section title={pl.brand.sectionDefaults}>
        <div className="space-y-2">
          <Label htmlFor="default-intro">{pl.brand.defaultIntro}</Label>
          <Textarea
            id="default-intro"
            value={draft.defaultIntro ?? ''}
            onChange={(event) => patch({ defaultIntro: event.target.value || null })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid-days">{pl.brand.defaultValidDays}</Label>
          <Input
            id="valid-days"
            type="number"
            min={0}
            value={draft.defaultValidDays}
            onChange={(event) => {
              const next = Number.parseInt(event.target.value, 10);
              if (Number.isInteger(next) && next >= 0) patch({ defaultValidDays: next });
            }}
            className="w-32"
          />
        </div>
      </Section>

      {/*
        Podgląd na końcu formularza, a nie w bocznej kolumnie: przy szerokości
        okna aplikacji strona A4 obok pól byłaby nieczytelnym znaczkiem, a to
        właśnie na nią trzeba tu popatrzeć.
      */}
      <BrandPreview draft={draft} />

      {/* Pasek zapisu pojawia się dopiero przy zmianach — jak na kartach biblioteki. */}
      {dirty ? (
        <div className="bg-surface border-hair sticky bottom-4 flex items-center justify-end gap-2 rounded-[var(--radius-card)] border p-3 shadow-sm">
          {!colorsValid ? (
            <span className="text-discount mr-auto text-sm">{pl.brand.invalidColor}</span>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => setDraft(brandKit.data ?? null)}>
            {pl.common.cancel}
          </Button>
          <Button type="button" disabled={update.isPending || !colorsValid} onClick={save}>
            {pl.common.save}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wybór wariantu logo na nagłówku (poprawka 3, 2026-08-27).
 *
 * Dwa przyciski, bez opcji „dobór automatyczny" (wycofana 2026-08-28).
 * Automat liczył kontrast z koloru marki i przy znakach z własnym tłem albo
 * wielobarwnych wybierał źle — a użytkownik poznawał wynik dopiero po
 * wygenerowaniu PDF-u. Decyzja należy teraz do niego, a instrukcja nad
 * przyciskami mówi wprost, który wariant do którego pasa nagłówka pasuje.
 */
function HeaderLogoField({
  value,
  resolved,
  missing,
  onChange,
}: {
  value: HeaderLogoChoice;
  resolved: 'light' | 'dark';
  /** Czy wariant, który wypadł, nie ma wgranego pliku. */
  missing: boolean;
  onChange: (value: HeaderLogoChoice) => void;
}) {
  const options: Array<{ value: HeaderLogoChoice; label: string }> = [
    { value: 'dark', label: pl.brand.headerLogoDark },
    { value: 'light', label: pl.brand.headerLogoLight },
  ];

  // Zdanie pod przyciskami zostaje TYLKO wtedy, gdy niesie coś, czego sam
  // wybór nie mówi: że wskazany wariant nie ma jeszcze wgranego pliku.
  // Powtarzanie wybranej opcji słowami byłoby szumem.
  const resolvedHint = missing
    ? `${pl.brand.headerLogoResolved(resolved)} ${pl.brand.headerLogoMissing}`
    : null;

  return (
    <div className="space-y-2">
      <Label>{pl.brand.headerLogo}</Label>
      <p className="text-ink-soft max-w-prose text-xs">{pl.brand.headerLogoHint}</p>

      <div role="radiogroup" aria-label={pl.brand.headerLogo} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-ring rounded-[var(--radius-pill)] border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
              value === option.value
                ? 'border-ink bg-ink text-surface'
                : 'border-hair text-ink-soft hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {resolvedHint ? <p className="text-ink-soft max-w-prose text-xs">{resolvedHint}</p> : null}
    </div>
  );
}

/**
 * Kolor: próbnik systemowy plus pole tekstowe, bo `#RRGGBB` bywa przepisywane
 * z brandbooka.
 *
 * Kolumna jest **flexem z rozciągliwym opisem**, a nie zwykłym stosem: dwa pola
 * stoją obok siebie, a ich opisy mają różną długość, więc przy zwykłym stosie
 * jeden próbnik lądował o linijkę niżej od drugiego. `mt-auto` spycha oba
 * wiersze sterujące do dołu kolumny — próbniki są wtedy równo, niezależnie od
 * tego, na ile linii złamie się który opis.
 */
function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = HexColorSchema.safeParse(value).success;

  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-ink-soft max-w-prose text-xs">{hint}</p> : null}
      <div className="mt-auto flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} — próbnik`}
          value={valid ? value : '#000000'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="border-hair size-9 shrink-0 cursor-pointer rounded-[var(--radius-control)] border bg-transparent"
        />
        <Input
          id={id}
          value={value}
          aria-invalid={!valid}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

/** Wiersze bloku „CZYNNE" — etykieta i godziny jako wolny tekst (F7.2). */
function OpeningHoursFields({
  rows,
  onChange,
}: {
  rows: BrandKit['openingHours'];
  onChange: (rows: BrandKit['openingHours']) => void;
}) {
  const full = rows.length >= MAX_OPENING_HOURS_ROWS;

  return (
    <div className="space-y-2">
      <Label>{pl.brand.openingHours}</Label>
      <p className="text-ink-soft text-xs">{pl.brand.openingHoursHint}</p>

      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <Input
              value={row.label}
              aria-label={pl.brand.openingHoursLabel(index)}
              placeholder={pl.brand.openingHoursLabelPlaceholder}
              onChange={(event) =>
                onChange(
                  rows.map((item, at) =>
                    at === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
          <div className="min-w-[120px] flex-1">
            <Input
              value={row.hours}
              aria-label={pl.brand.openingHoursValue(index)}
              placeholder={pl.brand.openingHoursValuePlaceholder}
              onChange={(event) =>
                onChange(
                  rows.map((item, at) =>
                    at === index ? { ...item, hours: event.target.value } : item,
                  ),
                )
              }
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={pl.brand.removeOpeningHours(index)}
            onClick={() => onChange(rows.filter((_, at) => at !== index))}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}

      {full ? (
        <p className="text-ink-soft text-xs">{pl.brand.openingHoursFull}</p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, { label: '', hours: '' }])}
        >
          <Plus className="size-4" aria-hidden />
          {pl.brand.addOpeningHours}
        </Button>
      )}
    </div>
  );
}
