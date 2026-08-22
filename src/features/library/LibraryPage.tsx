import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LibraryItemsTab } from './items/LibraryItemsTab';
import { LibraryGroupsTab } from './groups/LibraryGroupsTab';
import { pl } from '@/i18n/pl';

/**
 * Biblioteka (05-UI §3): pozycje i grupy w dwóch zakładkach.
 *
 * Radix odmontowuje nieaktywną zakładkę, więc grupy pobierają się dopiero po
 * wejściu na nie — zakładka pozycji jest odwiedzana nieporównanie częściej.
 */
export function LibraryPage() {
  return (
    <Tabs defaultValue="items" className="space-y-5">
      <TabsList aria-label={pl.library.tabsLabel}>
        <TabsTrigger value="items">{pl.library.items}</TabsTrigger>
        <TabsTrigger value="groups">{pl.library.groups}</TabsTrigger>
      </TabsList>

      <TabsContent value="items">
        <LibraryItemsTab />
      </TabsContent>
      <TabsContent value="groups">
        <LibraryGroupsTab />
      </TabsContent>
    </Tabs>
  );
}
