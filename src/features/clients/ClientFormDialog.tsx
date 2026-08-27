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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarPicker, initialsOf } from '@/components/shared';
import { useCreateClient, useUpdateClient } from '@/data/queries/useClients';
import {
  useClientAvatarUrl,
  useRemoveClientAvatar,
  useUploadClientAvatar,
} from '@/data/queries/useClientAvatar';
import {
  ClientDraftSchema,
  clientToDraft,
  emptyClientDraft,
  type Client,
  type ClientDraft,
} from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

export interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = dodawanie. Rekord = edycja tego klienta. */
  client: Client | null;
  /** Po zapisie — np. przypięcie świeżo dodanego klienta do wyceny. */
  onSaved?: (client: Client) => void;
}

/**
 * Jeden dialog na dodawanie i edycję.
 *
 * Formularz wymaga wyłącznie nazwy: kartoteka ma powstać w trzy sekundy,
 * kiedy klient dzwoni, a nie po zebraniu kompletu danych. Resztę da się
 * dopisać później — pusty telefon jest lepszy niż brak klienta.
 */
export function ClientFormDialog({ open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  const create = useCreateClient();
  const update = useUpdateClient();

  const form = useForm<ClientDraft>({
    resolver: zodResolver(ClientDraftSchema),
    defaultValues: emptyClientDraft(),
  });

  const { reset } = form;
  // Dialog żyje dłużej niż jedno otwarcie, więc bez tego edycja drugiego
  // klienta pokazywałaby dane pierwszego.
  useEffect(() => {
    if (!open) return;
    reset(client ? clientToDraft(client) : emptyClientDraft());
  }, [open, client, reset]);

  const pending = create.isPending || update.isPending;

  async function onSubmit(values: ClientDraft) {
    try {
      const saved = client
        ? await update.mutateAsync({ id: client.id, patch: values })
        : await create.mutateAsync(values);

      toast.success(client ? pl.clients.saved : pl.clients.created);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : pl.clients.loadError);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? pl.clients.editTitle : pl.clients.newTitle}</DialogTitle>
          <DialogDescription>{pl.clients.formHint}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="avatarPath"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ClientAvatarField
                      path={field.value}
                      name={form.watch('name')}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.clients.name}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={pl.clients.namePlaceholder} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.clients.phone}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.clients.email}</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{pl.clients.address}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={pl.clients.addressPlaceholder} />
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
                    <FormLabel>{pl.clients.city}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{pl.clients.notes}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={pl.clients.notesPlaceholder} />
                  </FormControl>
                  <p className="text-ink-soft text-xs">{pl.clients.notesHint}</p>
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

/**
 * Zdjęcie klienta w formularzu (poprawka 5, 2026-08-27).
 *
 * Plik idzie do Storage od razu, a formularz dostaje samą ścieżkę. Poprzedni
 * plik kasujemy dopiero po tym, jak nowa ścieżka wylądowała w polu — kolejność
 * odwrotna zostawiłaby przy błędzie kartotekę wskazującą na nic.
 */
function ClientAvatarField({
  path,
  name,
  onChange,
}: {
  path: string | null;
  name: string;
  onChange: (path: string | null) => void;
}) {
  const url = useClientAvatarUrl(path);
  const upload = useUploadClientAvatar();
  const remove = useRemoveClientAvatar();

  return (
    <AvatarPicker
      label={pl.clients.avatar}
      hint={pl.clients.avatarHint}
      url={url.data ?? null}
      initials={initialsOf(name || pl.clients.newTitle, '??')}
      busy={upload.isPending}
      onPick={(file) =>
        upload.mutate(file, {
          onSuccess: (saved) => {
            const previous = path;
            onChange(saved);
            if (previous) remove.mutate(previous);
          },
          onError: (error) => toast.error(error.message),
        })
      }
      onRemove={() => {
        const previous = path;
        onChange(null);
        if (previous) remove.mutate(previous);
      }}
    />
  );
}
