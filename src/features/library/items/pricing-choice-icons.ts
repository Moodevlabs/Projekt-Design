import { Box, Clock, Frame, Grid3x3, HelpCircle, Home, Package, Ruler } from 'lucide-react';
import type { PricingChoiceId } from '@/domain/library/units';

/**
 * Ikony sposobów wyceny — jedno źródło dla kafelków na karcie usługi i dla
 * kolumny „Sposób wyceny” w panelu „Dodaj usługi” (inspiracja 1). Ta sama
 * ikona w obu miejscach to warunek, żeby użytkownik ją w ogóle rozpoznał.
 */
export const PRICING_CHOICE_ICONS: Record<PricingChoiceId, typeof Box> = {
  flat_lump: Package,
  flat_m2: Ruler,
  per_room: Home,
  per_frame: Frame,
  flat_hour: Clock,
  flat_visit: Grid3x3,
  flat_element: Box,
  individual: HelpCircle,
};
