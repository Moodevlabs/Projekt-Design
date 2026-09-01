import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocEntriesPanel } from './DocEntriesPanel';
import { DocCategoriesPanel } from './DocCategoriesPanel';
import { DocSetsPanel } from './DocSetsPanel';
import type { DocLibraryKind } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

/**
 * Sekcja biblioteki dla jednego rodzaju dokumentu: Termin · Etapy współpracy ·
 * Cennik dodatkowy.
 *
 * Od T-121 każdy rodzaj ma **własny komplet trzech podzakładek** — Pozycje,
 * Grupy, Zestawy — dokładnie te same pojęcia co przy usługach. Decyzja
 * właściciela była między tym a jedną wspólną zakładką „Grupy" z filtrem
 * rodzaju; wygrały podzakładki, bo grupa terminu i grupa cennika nie mają ze
 * sobą nic wspólnego poza nazwą pojęcia, a jedna lista zmuszałaby do
 * pilnowania filtra przy każdym wejściu.
 *
 * ⚠️ Radix odmontowuje nieaktywne zakładki, więc dane każdej podzakładki
 * ciągną się dopiero po wejściu w nią. To jest pożądane: otwarcie „Termin"
 * nie ma powodu pobierać zestawów cennika.
 */
export function LibraryDocsTab({ kind }: { kind: DocLibraryKind }) {
  return (
    <Tabs defaultValue="entries" className="space-y-4">
      <TabsList aria-label={pl.library.docs.subtabs.label}>
        <TabsTrigger value="entries">{pl.library.docs.subtabs.entries}</TabsTrigger>
        <TabsTrigger value="categories">{pl.library.docs.subtabs.categories}</TabsTrigger>
        <TabsTrigger value="sets">{pl.library.docs.subtabs.sets}</TabsTrigger>
      </TabsList>

      <TabsContent value="entries">
        <DocEntriesPanel kind={kind} />
      </TabsContent>
      <TabsContent value="categories">
        <DocCategoriesPanel kind={kind} />
      </TabsContent>
      <TabsContent value="sets">
        <DocSetsPanel kind={kind} />
      </TabsContent>
    </Tabs>
  );
}
