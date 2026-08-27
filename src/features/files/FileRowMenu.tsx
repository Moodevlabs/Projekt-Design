import { useState } from 'react';
import { Download, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared';
import { RenameFileDialog } from './RenameFileDialog';
import { useFileDownload } from './useFileDownload';
import { useDeleteFile } from '@/data/queries/useFiles';
import { isPreviewableImage, type StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

export function FileRowMenu({ file, onPreview }: { file: StoredFile; onPreview: () => void }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { download, busy } = useFileDownload();
  const remove = useDeleteFile();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${pl.files.rowActions}: ${file.name}`}
            className="size-8"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled={busy} onSelect={() => void download(file)}>
            <Download className="size-4" aria-hidden />
            {pl.files.download}
          </DropdownMenuItem>
          {isPreviewableImage(file.mime, file.name) ? (
            <DropdownMenuItem onSelect={() => onPreview()}>
              <Eye className="size-4" aria-hidden />
              {pl.files.previewAction}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            {pl.files.rename}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {pl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameFileDialog file={file} open={renameOpen} onOpenChange={setRenameOpen} />

      {/*
        Dialog mówi wprost, że kosza nie ma (koncepcja §3 reguła 5).
        „Czy na pewno?" sugerowałoby, że gdzieś się jeszcze da to cofnąć.
      */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={pl.files.deleteTitle}
        description={pl.files.deleteDescription(file.name)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          remove.mutate(
            { id: file.id, storagePath: file.storagePath },
            {
              onSuccess: () => toast.success(pl.files.deleted),
              onError: (error) => toast.error(error.message),
            },
          );
        }}
      />
    </>
  );
}
