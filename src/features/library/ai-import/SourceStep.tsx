import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { AiError } from '@/data/repos/ai.repo';
import type { AiFileSource } from '@/domain/ai';
import { AiErrorNote, AiMark, AiUsageHint, AiWorking } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { AI_TEXT_MAX_CHARS } from '@/lib/ai-file-source';
import { DropZone } from './DropZone';
import { useSourceFile } from './useSourceFile';

type SourceTab = 'file' | 'paste';

/**
 * Krok 1: skąd wziąć cennik — plik albo wklejony tekst.
 *
 * „Odczytaj usługi" jest jednym przyciskiem dla obu zakładek: wysyła to, co
 * w aktywnej zakładce jest gotowe. Przy pracy asystenta formularz ustępuje
 * miejsca szkieletowi (`AiWorking`) — kilkanaście sekund to za długo na
 * sam `disabled`, a za krótko, żeby zamykać dialog.
 */
export function SourceStep({
  active,
  analyzing,
  error,
  onSubmit,
  onRetry,
}: {
  active: boolean;
  analyzing: boolean;
  error: AiError | null;
  onSubmit: (source: AiFileSource) => void;
  onRetry: () => void;
}) {
  const [tab, setTab] = useState<SourceTab>('file');
  const [pasted, setPasted] = useState('');
  const [fileSource, setFileSource] = useState<AiFileSource | null>(null);

  const onSource = useCallback((source: AiFileSource) => setFileSource(source), []);
  const file = useSourceFile(active && tab === 'file' && !analyzing, onSource);

  const fileReady =
    fileSource !== null && (fileSource.kind !== 'text' || fileSource.text.trim().length > 0);
  // Wklejony tekst podlega temu samemu limitowi co plik — funkcja brzegowa
  // odrzuciłaby go i tak, więc lepiej powiedzieć to przed wysyłką.
  const pastedText = pasted.trim();
  const pasteTooLong = pastedText.length > AI_TEXT_MAX_CHARS;
  const pasteReady = pastedText.length > 0 && !pasteTooLong;
  const ready = tab === 'file' ? fileReady : pasteReady;

  const submit = () => {
    if (tab === 'paste') {
      if (pasteReady) onSubmit({ kind: 'text', text: pastedText });
      return;
    }
    if (fileSource && fileReady) onSubmit(fileSource);
  };

  if (analyzing) {
    return (
      <AiWorking
        label={pl.ai.import.analyzing}
        hint={pl.ai.workingHint}
        showElapsed
        rows={4}
        className="py-2"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value as SourceTab)}>
        <TabsList aria-label={pl.ai.import.title}>
          <TabsTrigger value="file">{pl.ai.import.fileTab}</TabsTrigger>
          <TabsTrigger value="paste">{pl.ai.import.pasteTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="pt-3">
          <DropZone file={file} />
          {fileSource?.kind === 'text' && fileSource.text.trim().length === 0 ? (
            <p role="alert" className="text-danger mt-2 text-sm">
              {pl.ai.import.empty}
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="paste" className="pt-3">
          <Textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder={pl.ai.import.pastePlaceholder}
            aria-label={pl.ai.import.pasteTab}
            rows={10}
            className="max-h-72 min-h-40 font-mono text-xs leading-relaxed"
          />
          {pasteTooLong ? (
            <p role="alert" className="text-danger mt-2 text-sm">
              {pl.ai.import.tooLong(pastedText.length, AI_TEXT_MAX_CHARS)}
            </p>
          ) : null}
        </TabsContent>
      </Tabs>

      {error ? <AiErrorNote error={error} onRetry={onRetry} /> : null}

      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          onClick={submit}
          disabled={!ready}
          className="transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <AiMark size="xs" />
          {pl.ai.import.analyze}
        </Button>
        <AiUsageHint />
      </div>
    </div>
  );
}
