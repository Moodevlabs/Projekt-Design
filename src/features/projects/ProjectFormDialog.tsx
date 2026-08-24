import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject, useUpdateProject } from '@/data/queries/useProjects';
import {
  PROJECT_KINDS,
  PROJECT_STATUSES,
  ProjectDraftSchema,
  emptyProjectDraft,
  projectToDraft,
  type Project,
  type ProjectDraft,
} from '@/domain/project/schema';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

/** Radix Select nie przyjmuje pustego stringa jako wartości pozycji. */
const NO_KIND = '__none__';

export interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Właściciel teczki — z niego bierzemy podpowiedź adresu. */
  client: Pick<Client, 'id' | 'address' | 'city'>;
  /** `null` = dodawanie. Rekord = edycja tego projektu. */
  project: Project | null;
  onSaved?: (project: Project) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  client,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const create = useCreateProject();
  const update = useUpdateProject();

  const form = useForm<ProjectDraft>({
    resolver: zodResolver(ProjectDraftSchema),
    defaultValues: emptyProjectDraft(client),
  });

  const { reset } = form;
  useEffect(() => {
    if (!open) return;
    reset(project ? projectToDraft(project) : emptyProjectDraft(client));
  }, [open, project, client, reset]);

  const pending = create.isPending || update.isPending;

  async function onSubmit(values: ProjectDraft) {
    try {
      const saved = project
        ? await update.mutateAsync({ id: project.id, patch: values })
        : await create.mutateAsync({ ...values, clientId: client.id });

      toast.success(project ? pl.projects.saved : pl.projects.created);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : pl.projects.loadError);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? pl.projects.editTitle : pl.projects.newTitle}</DialogTitle>
          <DialogDescription>{pl.projects.formHint}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.projects.name}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={pl.projects.namePlaceholder} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.projects.address}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.projects.city}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="areaM2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.projects.area}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder={pl.projects.areaPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.projects.kind}</FormLabel>
                    <Select
                      value={field.value || NO_KIND}
                      onValueChange={(next) => field.onChange(next === NO_KIND ? '' : next)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_KIND}>{pl.projects.kindNone}</SelectItem>
                        {PROJECT_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {pl.projects.kinds[kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.projects.statusLabel}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {pl.projects.status[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.projects.startDate}</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" className="w-48" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.projects.notes}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={pl.projects.notesPlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {pl.common.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pl.common.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
