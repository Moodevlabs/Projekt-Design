import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function QuoteEditorPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <EmptyState
      icon={FileText}
      title={pl.editor.edit}
      description={id ? `Edytor wyceny ${id} — ${pl.common.soon}.` : `Nowa wycena — ${pl.common.soon}.`}
    />
  );
}
