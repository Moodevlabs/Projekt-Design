import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AddLink } from '../components/AddLink';
import { useEditorStore } from '../editor.store';
import { useWorkspace } from '@/data/queries/useWorkspace';
import type { PriceListItem } from '@/domain/documents';
import { convertUnits, newItem } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Most z cennika dodatkowego do wyceny (F6.2 + T-64).
 *
 * Jedna usługa może zmienić **dwie** rzeczy: kwotę i termin. Dlatego most nie
 * jest przyciskiem, tylko pytaniem z dwoma przełącznikami — „Panorama 360"
 * bywa dodawana do oferty bez ruszania terminu (bo mieści się w buforze)
 * i odwrotnie: dorzucona gratis, ale roboty przybywa.
 *
 * Przełącznik terminu pokazuje się tylko wtedy, gdy pozycja ma `addedDays`.
 * Bez tej liczby nie mamy czego doliczyć, a zgadywanie z tekstu `leadTime`
 * („ok. 2 tygodnie") dawałoby ciche pomyłki.
 */
export function AddToQuoteBridge({ item }: { item: PriceListItem }) {
  const [open, setOpen] = useState(false);
  const label = item.name || pl.editor.newPriceListItemName;

  const dni = item.addedDays;
  const maTermin = dni !== null && dni > 0;

  const [koszt, setKoszt] = useState(true);
  const [termin, setTermin] = useState(true);

  const addToQuote = useAddToQuote();
  const addToSchedule = useAddToSchedule();
  const maHarmonogram = useEditorStore((state) => state.schedule !== null);

  /*
   * Bez `addedDays` most ma jeden efekt, więc pytanie o wybór byłoby
   * ceremonią bez treści — zostaje zwykły link, jak przed T-64.
   */
  if (!maTermin) {
    return (
      <AddLink
        icon={ArrowRight}
        onClick={() => addToQuote(item)}
        className="mt-1.5 text-[12px]"
        aria-label={pl.editor.addPriceListItemToQuoteLabel(label)}
      >
        {pl.editor.addPriceListItemToQuote}
      </AddLink>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AddLink
          icon={ArrowRight}
          className="mt-1.5 text-[12px]"
          aria-label={pl.editor.addPriceListItemToQuoteLabel(label)}
        >
          {pl.editor.addPriceListItemToQuote}
        </AddLink>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] space-y-3">
        <p className="text-ink text-sm font-medium">{pl.editor.addToQuoteTitle}</p>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={koszt} onCheckedChange={setKoszt} />
          {pl.editor.addToQuoteCost}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={termin} onCheckedChange={setTermin} />
          {pl.editor.addToQuoteSchedule(dni)}
        </label>

        {termin && !maHarmonogram ? (
          <p className="text-ink-soft text-xs">{pl.editor.addToQuoteScheduleNew}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!koszt && !termin}
            onClick={() => {
              if (koszt) addToQuote(item);
              if (termin) addToSchedule(item, dni);
              setOpen(false);
            }}
          >
            {pl.editor.addToQuoteConfirm}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Efekt „koszt": pozycja w wycenie.
 *
 * Bierze **dolną granicę** przedziału — z widełek trzeba wybrać jedną liczbę,
 * a wpisanie górnej zawyżyłoby ofertę bez pytania. Mówimy o tym w komunikacie,
 * bo to jest decyzja, nie oczywistość.
 *
 * W wycenie godzinowej kwota jest przeliczana po stawce dokumentu — ta sama
 * zasada co przy bibliotece. Bez stawki odmawiamy: 300 zł wstawione jako
 * 300 minut to błąd, którego nikt by nie zauważył.
 */
function useAddToQuote() {
  const insertItems = useEditorStore((state) => state.insertItems);
  const addSection = useEditorStore((state) => state.addSection);

  return (item: PriceListItem) => {
    const body = useEditorStore.getState().body;
    if (!body) return;

    const kwota = convertUnits(
      item.priceMinCents,
      'amount',
      body.pricingBasis,
      body.hourlyRateCents,
    );
    if (kwota === null) {
      toast.error(pl.editor.libraryBasisMismatch);
      return;
    }

    // Bez sekcji nie ma gdzie wstawic pozycji — zakladamy jedna, zamiast
    // po cichu nic nie zrobic.
    if (body.sections.length === 0) addSection();

    const sekcja = useEditorStore.getState().body?.sections.at(-1);
    if (!sekcja) return;

    insertItems(sekcja.id, null, [
      newItem({
        name: item.name,
        description: item.description,
        unitPriceCents: kwota,
      }),
    ]);

    toast.success(pl.editor.priceListAddedToQuote(item.name || pl.editor.newPriceListItemName), {
      description: pl.editor.priceListAddedToQuoteHint(sekcja.title),
    });
  };
}

/**
 * Efekt „termin": dni w etapie zbiorczym.
 *
 * Dni nie rozsmarowujemy po istniejących etapach — użytkownik ma widzieć,
 * skąd wzięło się „+5 dni" (ta sama zasada co przy rabatach na sekcje).
 */
function useAddToSchedule() {
  const addExtra = useEditorStore((state) => state.addScheduleExtra);
  const template = useWorkspace().data?.settings.scheduleTemplate ?? null;

  return (item: PriceListItem, days: number) => {
    const name = item.name || pl.editor.newPriceListItemName;
    addExtra({ name, days }, pl.editor.extrasStageName, template);
    toast.success(pl.editor.priceListAddedToSchedule(name, days));
  };
}
