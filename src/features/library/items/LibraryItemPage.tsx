import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Library } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared';
import { MoneyInput } from '../components/MoneyInput';
import { PricingChoicePicker } from './PricingChoicePicker';
import { ItemPreviewCard } from './ItemPreviewCard';
import { ItemUsageCard } from './ItemUsageCard';
import {
  useAllLibraryItems,
  useCreateLibraryItem,
  useUpdateLibraryItem,
} from '@/data/queries/useLibrary';
import { useLibraryCategoryList } from '@/data/queries/useLibraryCategories';
import { PRICING_CHOICES, pricingChoiceFor, type PricingChoiceId } from '@/domain/library/units';
import { categoryLabel } from '@/domain/library/schema';
import type { LibraryItem } from '@/data/repos/library.repo';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Radix Select nie przyjmuje pustego stringa jako wartości pozycji. */
const NO_CATEGORY = '__none__';

/** Limit opisu z 05-UI — licznik pokazuje „73/500". */
const DESCRIPTION_LIMIT = 500;

interface Draft {
  name: string;
  description: string;
  categoryId: string | null;
  choice: PricingChoiceId;
  unitLabel: string;
  unitPriceCents: number | null;
  minPriceCents: number | null;
  active: boolean;
}

function draftFrom(item: LibraryItem): Draft {
  return {
    name: item.name,
    description: item.description,
    categoryId: item.categoryId,
    choice: pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents),
    unitLabel: item.unitLabel ?? '',
    unitPriceCents: item.unitPriceCents,
    minPriceCents: item.minPriceCents,
    active: item.active,
  };
}

/**
 * Pełnoekranowy edytor usługi (B3, T-61) — układ z `inspiracja 2.jpeg`.
 *
 * **Zapis jest jawny**, nie autozapisem. Powód jest ten sam co w brandingu
 * (T-12): zmiana w bibliotece pyta o kaskadę do otwartych wycen, a nie da się
 * pytać o to przy każdym naciśnięciu klawisza.
 *
 * Kaskada z tej strony **nie działa i strona mówi o tym wprost**: kaskadę
 * obsługuje `LibrarySheet` w edytorze, bo tylko tam jest otwarta wycena
 * i store, do którego można coś dopisać. Udawanie, że działa wszędzie,
 * kończyłoby się cichym brakiem zmian w dokumencie, nad którym ktoś pracuje.
 */
export function LibraryItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const items = useAllLibraryItems();
  const categories = useLibraryCategoryList();
  const create = useCreateLibraryItem();
  const update = useUpdateLibraryItem();

  const item = useMemo(
    () => (isNew ? null : (items.data ?? []).find((row) => row.id === id) ?? null),
    [isNew, items.data, id],
  );

  const [draft, setDraft] = useState<Draft | null>(null);

  // Wczytujemy do stanu raz, po pojawieniu się danych. Bez tego każdy refetch
  // nadpisywałby to, co ktoś właśnie wpisuje — ta sama pułapka co w edytorze.
  useEffect(() => {
    if (isNew) {
      setDraft((current) => current ?? blankDraft());
      return;
    }
    if (item && draft === null) setDraft(draftFrom(item));
  }, [isNew, item, draft]);

  if (!isNew && items.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!isNew && !item) {
    return (
      <EmptyState
        icon={Library}
        title={pl.library.itemNotFoundTitle}
        description={pl.library.itemNotFoundDescription}
        action={
          <Button asChild variant="outline">
            <Link to={routes.library}>{pl.library.title}</Link>
          </Button>
        }
      />
    );
  }

  if (!draft) return null;

  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current!, ...next }));

  const choice = PRICING_CHOICES.find((option) => option.id === draft.choice);
  const showRates = draft.choice === 'per_room' || draft.choice === 'per_frame';
  const individual = draft.choice === 'individual';

  const save = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error(pl.library.nameRequired);
      return;
    }

    const categoryName = categories.data?.find((row) => row.id === draft.categoryId)?.name;
    const payload = {
      name,
      description: draft.description,
      categoryId: draft.categoryId,
      ...(categoryName ? { category: categoryName } : {}),
      // „Indywidualnie" to `flat` z ceną `null` — jedno i drugie ustawia się
      // razem, bo osobno dałoby pozycję bez ceny w trybie parametrycznym.
      unitPriceCents: individual ? null : (draft.unitPriceCents ?? 0),
      unit: choice?.unit ?? 'lump',
      unitLabel: draft.unitLabel.trim() || null,
      minPriceCents: draft.minPriceCents,
      active: draft.active,
    };

    if (isNew) {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success(pl.library.itemSaved);
          void navigate(routes.library);
        },
        onError: (error) => toast.error(error.message),
      });
      return;
    }

    update.mutate(
      { id: item!.id, patch: payload },
      {
        onSuccess: () => toast.success(pl.library.itemSaved),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="space-y-5">
      <Link
        to={routes.library}
        className="text-ink-soft hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {pl.library.title}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Section number={1} title={pl.library.itemNameLabel}>
            <Input
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              aria-label={pl.library.itemNameLabel}
            />
          </Section>

          <Section number={2} title={pl.library.itemDescriptionLabel}>
            <Textarea
              value={draft.description}
              maxLength={DESCRIPTION_LIMIT}
              rows={4}
              onChange={(event) => patch({ description: event.target.value })}
              aria-label={pl.library.itemDescriptionLabel}
            />
            <p className="text-ink-soft mt-1 text-right text-xs tabular-nums">
              {draft.description.length}/{DESCRIPTION_LIMIT}
            </p>
          </Section>

          <Section number={3} title={pl.library.categories} hint={pl.library.categoryHint}>
            <Select
              value={draft.categoryId ?? NO_CATEGORY}
              onValueChange={(next) => patch({ categoryId: next === NO_CATEGORY ? null : next })}
            >
              <SelectTrigger aria-label={pl.library.categories}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>{pl.library.withoutCategory}</SelectItem>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {categoryLabel(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>

          <Section number={4} title={pl.library.pricingChoice}>
            <PricingChoicePicker
              value={draft.choice}
              onChange={(next) => patch({ choice: next })}
            />

            {!showRates && !individual ? (
              <div className="mt-3 max-w-48">
                <Label htmlFor="item-price">{pl.library.itemPriceLabel}</Label>
                <MoneyInput
                  cents={draft.unitPriceCents ?? 0}
                  onChange={(unitPriceCents) => patch({ unitPriceCents })}
                  ariaLabel={pl.library.itemPriceLabel}
                  className="mt-1"
                />
              </div>
            ) : null}
          </Section>

          {showRates ? (
            <Section number={5} title={pl.library.ratesSection} hint={pl.library.ratesHint}>
              {/*
                Stawki per pomieszczenie edytuje się w macierzy cennika —
                budowanie drugiego edytora tych samych liczb znaczyłoby dwa
                miejsca do poprawiania przy każdej zmianie modelu.
              */}
              <Button asChild variant="outline" size="sm">
                <Link to={routes.library}>{pl.library.goToRates}</Link>
              </Button>
            </Section>
          ) : null}

          <Section number={showRates ? 6 : 5} title={pl.library.extraSettings}>
            <div className="space-y-4">
              <div className="max-w-48">
                <Label htmlFor="item-min-price">{pl.library.minPriceLabel}</Label>
                <MoneyInput
                  cents={draft.minPriceCents ?? 0}
                  onChange={(minPriceCents) =>
                    patch({ minPriceCents: minPriceCents > 0 ? minPriceCents : null })
                  }
                  ariaLabel={pl.library.minPriceLabel}
                  className="mt-1"
                />
                <p className="text-ink-soft mt-1 text-xs">{pl.library.minPriceHint}</p>
              </div>

              {/*
                Pole „własna jednostka" ma sens tylko przy `unit: 'custom'`.
                Żaden z ośmiu kafelków go dziś nie ustawia — zostawiamy je
                widoczne dla usług, które taką jednostkę już mają (import,
                edycja w bazie), zamiast po cichu ją gubić przy zapisie.
              */}
              {draft.unitLabel ? (
                <div className="max-w-48">
                  <Label htmlFor="item-unit-label">{pl.library.customUnitLabel}</Label>
                  <Input
                    id="item-unit-label"
                    value={draft.unitLabel}
                    onChange={(event) => patch({ unitLabel: event.target.value })}
                    className="mt-1"
                  />
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="item-active">{pl.library.activeLabel}</Label>
                  <p className="text-ink-soft text-xs">{pl.library.activeHint}</p>
                </div>
                <Switch
                  id="item-active"
                  checked={draft.active}
                  onCheckedChange={(active) => patch({ active })}
                />
              </div>
            </div>
          </Section>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              {pl.library.saveChanges}
            </Button>
            <p className="text-ink-soft text-xs">{pl.library.cascadeHint}</p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <ItemPreviewCard
            name={draft.name}
            description={draft.description}
            unitPriceCents={individual ? null : draft.unitPriceCents}
            unit={choice?.unit ?? 'lump'}
            unitLabel={draft.unitLabel}
          />
          <HowItWorks choice={draft.choice} />
          {item ? <ItemUsageCard itemId={item.id} /> : null}
        </div>
      </div>
    </div>
  );
}

function blankDraft(): Draft {
  return {
    name: '',
    description: '',
    categoryId: null,
    choice: 'flat_lump',
    unitLabel: '',
    unitPriceCents: 0,
    minPriceCents: null,
    active: true,
  };
}

/** Numerowana sekcja formularza — układ z inspiracji 2. */
function Section({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-surface space-y-3 p-5">
      <div>
        <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <span className="bg-surface-2 text-ink-soft flex size-5 items-center justify-center rounded-full text-xs">
            {number}
          </span>
          {title}
        </h2>
        {hint ? <p className="text-ink-soft mt-1 ml-7 text-xs">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * „Jak to działa?" — tekst zależny od sposobu wyceny (05-UI §3a.5).
 *
 * Wyjaśnienie stoi **w miejscu użycia**, a nie w osobnej pomocy: mechanizm
 * cennika parametrycznego jest nieoczywisty i człowiek dowiaduje się o nim
 * dokładnie wtedy, gdy go wybiera.
 */
function HowItWorks({ choice }: { choice: PricingChoiceId }) {
  const key =
    choice === 'per_room'
      ? 'per_room'
      : choice === 'per_frame'
        ? 'per_frame'
        : choice === 'individual'
          ? 'individual'
          : 'flat';

  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="text-ink text-sm font-semibold">{pl.library.howItWorks}</h2>
      <p className="text-ink-soft text-xs leading-relaxed">{pl.library.howItWorksText[key]}</p>
    </section>
  );
}
