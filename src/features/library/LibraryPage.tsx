import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibraryItemsTab } from './items/LibraryItemsTab';
import { LibraryCategoriesTab } from './categories/LibraryCategoriesTab';
import { LibraryGroupsTab } from './groups/LibraryGroupsTab';
import { PricingMatrixTab } from './pricing/PricingMatrixTab';
import { RoomTypesSection } from '@/features/settings/RoomTypesSection';
import { LibraryDocsTab } from './docs/LibraryDocsTab';
import { pl } from '@/i18n/pl';

/**
 * Biblioteka (05-UI §3): **Usługi | Grupy | Zestawy | Pomieszczenia | Stawki**.
 *
 * Nazewnictwo rozeszło się w T-59 i to jest sedno tej zakładki:
 * - **Grupy** to słownik działów porządkujący usługi („01 · Przygotowanie");
 * - **Zestawy** to dawne „Grupy" — snapshoty pozycji do wstawienia na raz.
 *
 * Tabela w bazie dalej nazywa się `library_groups` (§9.3) i tak zostaje:
 * snapshoty mają własną ścieżkę zgodności i testy integracyjne.
 *
 * „Pomieszczenia" to ten sam `RoomTypesSection` co w Ustawieniach — jeden
 * komponent w dwóch miejscach, bo słownik jest jeden. Radix odmontowuje
 * nieaktywne zakładki, więc dane ciągną się dopiero po wejściu.
 *
 * Od T-102 dochodzą trzy sekcje dokumentów: **Termin · Etapy współpracy ·
 * Cennik dodatkowy** — każdy rodzaj dokumentu ma swoją bibliotekę, tak jak
 * wycena ma usługi. Jeden komponent `LibraryDocsTab` z parametrem rodzaju.
 */
export function LibraryPage() {
  return (
    <Tabs defaultValue="items" className="space-y-5">
      <TabsList aria-label={pl.library.tabsLabel}>
        <TabsTrigger value="items">{pl.library.items}</TabsTrigger>
        <TabsTrigger value="categories">{pl.library.categories}</TabsTrigger>
        <TabsTrigger value="sets">{pl.library.sets}</TabsTrigger>
        <TabsTrigger value="rooms">{pl.library.rooms}</TabsTrigger>
        <TabsTrigger value="rates">{pl.library.rates}</TabsTrigger>
        <TabsTrigger value="doc-schedule">{pl.library.docs.tabs.schedule}</TabsTrigger>
        <TabsTrigger value="doc-stages">{pl.library.docs.tabs.stages}</TabsTrigger>
        <TabsTrigger value="doc-price-list">{pl.library.docs.tabs.price_list}</TabsTrigger>
      </TabsList>

      <TabsContent value="items">
        <LibraryItemsTab />
      </TabsContent>
      <TabsContent value="categories">
        <LibraryCategoriesTab />
      </TabsContent>
      <TabsContent value="sets">
        <LibraryGroupsTab />
      </TabsContent>
      <TabsContent value="rooms">
        <RoomTypesSection canWrite />
      </TabsContent>
      <TabsContent value="rates">
        <PricingMatrixTab />
      </TabsContent>
      <TabsContent value="doc-schedule">
        <LibraryDocsTab kind="schedule" />
      </TabsContent>
      <TabsContent value="doc-stages">
        <LibraryDocsTab kind="stages" />
      </TabsContent>
      <TabsContent value="doc-price-list">
        <LibraryDocsTab kind="price_list" />
      </TabsContent>
    </Tabs>
  );
}
