import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  overwriteTemplate,
  type CreateTemplateInput,
  type Template,
} from '@/data/repos/templates.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';
import type { QuoteBody } from '@/domain/quote';

export function useTemplates() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.templates(workspaceId),
    queryFn: () => listTemplates(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.template(id),
    queryFn: () => getTemplate(id),
    enabled: Boolean(id),
  });
}

export type CreateTemplateVars = Omit<CreateTemplateInput, 'workspaceId'>;

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (vars: CreateTemplateVars) =>
      createTemplate({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: (template) => {
      queryClient.setQueryData<Template>(queryKeys.template(template.id), template);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
    },
  });
}

export function useOverwriteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: QuoteBody }) => overwriteTemplate(id, body),
    onSuccess: (template) => {
      queryClient.setQueryData<Template>(queryKeys.template(template.id), template);
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: (_data, id) => {
      // Twarde delete — detal usuwamy z cache, nie ma po co go odświeżać.
      queryClient.removeQueries({ queryKey: queryKeys.template(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates() });
    },
  });
}
