import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { routes } from '@/app/routes';
import { useBriefTemplates } from '@/data/queries/useBriefTemplates';
import { resolveTemplateSections } from '@/data/repos/brief-templates.repo';
import { DEFAULT_BRIEF_EXPIRY_DAYS, type BriefTemplate } from '@/domain/brief';
import { pl } from '@/i18n/pl';

/** Wartość „zestaw wbudowany” — Radix `Select` nie przyjmuje pustego stringa. */
const BUILT_IN = '__builtin__';

/** `null` = link bezterminowy; Radix wymaga wartości tekstowej. */
const NEVER = '__never__';
const EXPIRY_CHOICES = [14, 30, DEFAULT_BRIEF_EXPIRY_DAYS, 120] as const;

export interface NewBriefDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (input: { expiryDays: number | null; template: BriefTemplate }) => void;
}

/**
 * Wystawienie briefu: wybór zestawu pytań i terminu ważności linku (T-96).
 *
 * ## Dlaczego okno, a nie przycisk wykonujący akcję od razu
 *
 * Do T-96 zestaw pytań był jeden, więc wybierać nie było czego. Od chwili,
 * w której pracownia prowadzi kilka szablonów, wystawienie briefu jest
 * decyzją — a decyzji, której konsekwencją jest dokument wysłany klientowi,
 * nie podejmuje się jednym kliknięciem bez pokazania, co zostanie wysłane.
 */
export function NewBriefDialog({ open, onOpenChange, pending, onSubmit }: NewBriefDialogProps) {
  const templates = useBriefTemplates();
  const rows = templates.data ?? [];

  const defaultId = rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? BUILT_IN;
  const [templateId, setTemplateId] = useState<string>(defaultId);
  const [expiry, setExpiry] = useState<string>(String(DEFAULT_BRIEF_EXPIRY_DAYS));

  // Lista szablonów dojeżdża po otwarciu okna — dopóki jej nie ma, wybór stoi
  // na zestawie wbudowanym i musi przeskoczyć na domyślny, gdy tylko dotrze.
  const [knownDefault, setKnownDefault] = useState(defaultId);
  if (knownDefault !== defaultId && templateId === knownDefault) {
    setKnownDefault(defaultId);
    setTemplateId(defaultId);
  }

  const submit = () => {
    onSubmit({
      expiryDays: expiry === NEVER ? null : Number(expiry),
      template:
        templateId === BUILT_IN
          ? resolveTemplateSections([])
          : resolveTemplateSections(rows, templateId),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.brief.newTitle}</DialogTitle>
          <DialogDescription>{pl.brief.newDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="brief-template">{pl.brief.templateLabel}</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="brief-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rows.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                    {row.isDefault ? pl.brief.templateDefaultSuffix : ''}
                  </SelectItem>
                ))}
                <SelectItem value={BUILT_IN}>{pl.brief.templateBuiltIn}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-ink-soft text-xs">
              <Link to={routes.settingsBrief} className="underline underline-offset-2">
                {pl.brief.templateManage}
              </Link>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="brief-expiry">{pl.brief.expiryLabel}</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="brief-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_CHOICES.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {pl.brief.expiryDays(days)}
                  </SelectItem>
                ))}
                <SelectItem value={NEVER}>{pl.brief.expiryNever}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? pl.brief.creating : pl.brief.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
