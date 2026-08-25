import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useClients } from '@/data/queries/useClients';
import { useProjects } from '@/data/queries/useProjects';
import { useCreateQuote } from '@/data/queries/useQuotes';
import { useTemplates } from '@/data/queries/useTemplates';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { clientSnapshot } from '@/domain/client/schema';
import { fromTemplate, quoteBodyFromSettings } from '@/domain/quote';
import { scheduleFromTemplate } from '@/domain/schedule';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Radix Select nie przyjmuje pustego stringa jako wartości pozycji. */
const NONE = '__none__';

/**
 * „Nowa wycena" z paska — pyta o klienta i projekt (K3, T-58).
 *
 * Do T-58 przycisk zakładał dokument bez przypisania i zostawiał człowieka
 * w edytorze z pustym nagłówkiem. Skoro oś aplikacji to KLIENT → PROJEKT →
 * WYCENA, to samo założenie wyceny jest dobrym momentem, żeby o to zapytać.
 *
 * **„Bez klienta" zostaje** (koncepcja §2 reguła 2): szybka wycena „na już"
 * to prawdziwy przypadek, a nie błąd użytkownika. Różnica jest taka, że teraz
 * to świadomy wybór, a nie domyślny efekt kliknięcia.
 */
export function NewQuoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState<string>(NONE);
  const [projectId, setProjectId] = useState<string>(NONE);
  const [templateId, setTemplateId] = useState<string>(NONE);

  const clients = useClients(open ? { status: 'active', sort: 'name_asc' } : {});
  const projects = useProjects(open && clientId !== NONE ? { clientId: clientId } : {});
  const workspace = useWorkspace();
  const templates = useTemplates();
  const create = useCreateQuote();

  useEffect(() => {
    if (!open) {
      setClientId(NONE);
      setProjectId(NONE);
      setTemplateId(NONE);
    }
  }, [open]);

  // Zmiana klienta zeruje projekt: teczki należą do konkretnego klienta,
  // więc zostawienie starej dałoby wycenę w cudzym projekcie.
  const pickClient = (next: string) => {
    setClientId(next);
    setProjectId(NONE);
  };

  const settings = workspace.data?.settings;

  const template = templates.data?.find((row) => row.id === templateId) ?? null;

  const submit = () => {
    if (!settings) return;

    /*
     * Szablon niesie caly pakiet (T-63): uklad wyceny, termin i dokumenty.
     * `fromTemplate` nadaje nowe identyfikatory i czysci dane inwestora —
     * inaczej nowa oferta startowalaby z nazwiskiem z poprzedniej.
     */
    const body =
      template?.body === null || template === null
        ? quoteBodyFromSettings(settings)
        : fromTemplate(template.body);

    const client = clients.data?.find((row) => row.id === clientId);
    if (client) body.client = clientSnapshot(client);

    const project = projects.data?.find((row) => row.id === projectId);
    if (project?.city) body.client.city = project.city;

    void create
      .mutateAsync({
        body,
        clientId: clientId === NONE ? null : clientId,
        projectId: projectId === NONE ? null : projectId,
        schedule: scheduleFromTemplate(template?.schedule ?? null),
        documents: template?.documents ? structuredClone(template.documents) : null,
      })
      .then((quote) => {
        onOpenChange(false);
        void navigate(routes.quote(quote.id));
      })
      .catch((reason: unknown) => {
        toast.error(reason instanceof Error ? reason.message : pl.quotes.loadError);
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.quotes.new}</DialogTitle>
          <DialogDescription>{pl.quotes.newDialogHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-quote-client">{pl.quotes.client}</Label>
            <Select value={clientId} onValueChange={pickClient}>
              <SelectTrigger id="new-quote-client" aria-label={pl.quotes.client}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{pl.quotes.withoutClient}</SelectItem>
                {(clients.data ?? []).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Projekt tylko przy wybranym kliencie — bez niego nie ma z czego
              wybierać, a pusty select udawałby, że coś się da zrobić. */}
          {clientId !== NONE ? (
            <div className="space-y-2">
              <Label htmlFor="new-quote-project">{pl.projects.title}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="new-quote-project" aria-label={pl.projects.title}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{pl.projects.moveNone}</SelectItem>
                  {(projects.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/*
            Szablon wybierany TUTAJ, a nie po otwarciu pustego edytora
            (koncepcja §5 pkt 7, T-70). Pole pokazujemy tylko, gdy jest z czego
            wybierać — pusty select udawałby, że coś się da zrobić.
          */}
          {(templates.data ?? []).length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="new-quote-template">{pl.quotes.startFrom}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="new-quote-template" aria-label={pl.quotes.startFrom}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{pl.quotes.startFromEmpty}</SelectItem>
                  {(templates.data ?? []).map((row) => (
                    <SelectItem key={row.id} value={row.id} disabled={row.body === null}>
                      {row.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template?.schedule || template?.documents ? (
                <p className="text-ink-soft text-xs">{pl.quotes.startFromPackage}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button onClick={submit} disabled={!settings || create.isPending}>
            {pl.quotes.new}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
