import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useAiImportLibrary } from '@/data/queries/useAi';
import { useAllLibraryItems, useCreateLibraryItem } from '@/data/queries/useLibrary';
import {
  useCreateLibraryCategory,
  useLibraryCategoryList,
} from '@/data/queries/useLibraryCategories';
import {
  applyLibraryImport,
  isExistingName,
  type AiFileSource,
  type LibraryImportProposal,
} from '@/domain/ai';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';
import { proposalFromRows, rowsFromProposal, type ProposalRow } from './proposal-rows';

const log = createLogger('library.ai-import');

export type AiImportStep = 'source' | 'proposal' | 'saving';

export interface SaveProgress {
  done: number;
  total: number;
}

/**
 * Pamięć jednej propozycji między próbami zapisu.
 *
 * Zapis idzie po kolei i może paść w połowie. Żeby ponowne „Dodaj" nie
 * wstawiło drugi raz tego, co już weszło, trzymamy: które wiersze zostały
 * zapisane i jakie `id` dostały grupy utworzone po drodze. Nowa propozycja
 * (ponowna analiza, reset) zaczyna od czystej karty.
 */
interface SaveMemory {
  savedIndexes: Set<number>;
  savedNames: string[];
  /** Klucz nazwy grupy (bez spacji i wielkości liter) → utworzona grupa. */
  createdCategories: Map<string, { name: string; id: string }>;
}

function emptyMemory(): SaveMemory {
  return { savedIndexes: new Set(), savedNames: [], createdCategories: new Map() };
}

function categoryKey(name: string): string {
  return name.trim().toLocaleLowerCase('pl-PL');
}

/**
 * Stan importu z pliku (T-136): źródło → propozycja → zapis.
 *
 * Zapis idzie **po kolei**, nie równolegle: najpierw brakujące grupy (żeby
 * mieć ich `id`), potem usługi jedna po drugiej z licznikiem. Równoległe
 * wstawianie kilkudziesięciu wierszy nic by nie przyspieszyło, a przy błędzie
 * w połowie nie dałoby się powiedzieć, co weszło. Tu wiadomo: `done` z `total`,
 * a zapisane wiersze wracają do tabeli odznaczone i oznaczone „już masz".
 */
export function useAiImport() {
  const [step, setStep] = useState<AiImportStep>('source');
  const [source, setSource] = useState<AiFileSource | null>(null);
  const [proposal, setProposal] = useState<LibraryImportProposal | null>(null);
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const memory = useRef<SaveMemory>(emptyMemory());

  const items = useAllLibraryItems();
  const categories = useLibraryCategoryList();
  const analyze = useAiImportLibrary();
  const createCategory = useCreateLibraryCategory();
  const createItem = useCreateLibraryItem();

  const existingNames = useMemo(() => (items.data ?? []).map((item) => item.name), [items.data]);
  const categoryList = useMemo(() => categories.data ?? [], [categories.data]);

  const runAnalysis = useCallback(
    (nextSource: AiFileSource) => {
      analyze.mutate(
        {
          source: nextSource,
          categories: categoryList.map((category) => category.name),
          existingNames,
        },
        {
          onSuccess: ({ data }) => {
            memory.current = emptyMemory();
            setProposal(data);
            setRows(rowsFromProposal(data, existingNames));
            setStep('proposal');
          },
        },
      );
    },
    [analyze, categoryList, existingNames],
  );

  const submitSource = useCallback(
    (nextSource: AiFileSource) => {
      setSource(nextSource);
      runAnalysis(nextSource);
    },
    [runAnalysis],
  );

  const retry = useCallback(() => {
    if (source) runAnalysis(source);
  }, [runAnalysis, source]);

  const updateRow = useCallback((index: number, patch: Partial<ProposalRow['item']>) => {
    setRows((current) =>
      current.map((row) =>
        row.index === index ? { ...row, item: { ...row.item, ...patch } } : row,
      ),
    );
  }, []);

  const toggleRow = useCallback((index: number, selected: boolean) => {
    setRows((current) => current.map((row) => (row.index === index ? { ...row, selected } : row)));
  }, []);

  const toggleAll = useCallback((selected: boolean) => {
    setRows((current) => current.map((row) => ({ ...row, selected })));
  }, []);

  const back = useCallback(() => {
    analyze.reset();
    setStep('source');
    setSaveError(null);
  }, [analyze]);

  const reset = useCallback(() => {
    analyze.reset();
    memory.current = emptyMemory();
    setStep('source');
    setSource(null);
    setProposal(null);
    setRows([]);
    setProgress(null);
    setSaveError(null);
  }, [analyze]);

  const selectedCount = rows.filter((row) => row.selected).length;

  const save = useCallback(async () => {
    if (!proposal) return;

    const remembered = memory.current;
    const plan = applyLibraryImport(
      proposalFromRows(proposal, rows),
      rows.filter((row) => row.selected).map((row) => row.index),
      {
        categoryNames: [
          ...categoryList.map((category) => category.name),
          // Grupy z poprzedniej, przerwanej próby — mają już `id`, nie tworzymy ich drugi raz.
          ...[...remembered.createdCategories.values()].map((category) => category.name),
        ],
        itemNames: existingNames,
      },
    );

    setStep('saving');
    setSaveError(null);
    setProgress({ done: 0, total: plan.items.length });

    const categoryIds = new Map<string, string>();
    for (const [key, category] of remembered.createdCategories) categoryIds.set(key, category.id);
    for (const category of categoryList) categoryIds.set(categoryKey(category.name), category.id);
    let saved = 0;

    try {
      for (const name of plan.categoriesToCreate) {
        const created = await createCategory.mutateAsync({ name });
        categoryIds.set(categoryKey(name), created.id);
        remembered.createdCategories.set(categoryKey(name), { name, id: created.id });
      }

      for (const item of plan.items) {
        await createItem.mutateAsync({
          name: item.name,
          description: item.description,
          categoryId: item.categoryName
            ? (categoryIds.get(categoryKey(item.categoryName)) ?? null)
            : null,
          unit: item.unit,
          unitLabel: item.unitLabel,
          unitPriceCents: item.unitPriceCents,
          minPriceCents: item.minPriceCents,
          pricing: item.pricing,
        });
        saved += 1;
        remembered.savedIndexes.add(item.index);
        remembered.savedNames.push(item.name);
        setProgress({ done: saved, total: plan.items.length });
      }
    } catch (cause) {
      log.error('Zapis importu przerwany', { saved, total: plan.items.length, cause });
      setSaveError(cause instanceof Error ? cause.message : pl.ai.import.failed);
      // Co weszło, wraca do tabeli jak pozycje, które biblioteka już ma:
      // odznaczone i z etykietą — ponowne „Dodaj" zapisze tylko resztę.
      setRows((current) =>
        current.map((row) =>
          remembered.savedIndexes.has(row.index)
            ? { ...row, selected: false, alreadyHave: true }
            : row,
        ),
      );
      setStep('proposal');
      setProgress(null);
      if (saved > 0) toast.success(pl.ai.import.done(saved));
      return false;
    }

    // Wiersze zapisane w poprzedniej próbie są teraz w bibliotece i odznaczone —
    // to nie są „pominięte duplikaty", tylko robota już zrobiona.
    const skipped = plan.duplicates.filter((name) => !isExistingName(name, remembered.savedNames));
    if (skipped.length > 0) toast.message(pl.ai.import.duplicatesSkipped(skipped.length));
    toast.success(pl.ai.import.done(saved));
    memory.current = emptyMemory();
    setProgress(null);
    return true;
  }, [proposal, rows, categoryList, existingNames, createCategory, createItem]);

  return {
    step,
    proposal,
    rows,
    selectedCount,
    categories: categoryList,
    existingNames,
    analyzing: analyze.isPending,
    analysisError: analyze.error,
    progress,
    saveError,
    submitSource,
    retry,
    updateRow,
    toggleRow,
    toggleAll,
    back,
    reset,
    save,
  };
}

export type AiImportState = ReturnType<typeof useAiImport>;
