import { useMutation, useQuery, useQueryClient, type Query } from '@tanstack/react-query';
import {
  createProject,
  deleteProject,
  getProject,
  getProjectOverview,
  listProjects,
  moveQuoteToProject,
  setProjectStatus,
  setProjectStageProgress,
  updateProject,
  type ProjectFilters,
  type ProjectPatch,
} from '@/data/repos/projects.repo';
import { queryKeys } from '@/data/query-keys';
import type { StageProgress } from '@/domain/project/stages';
import type { Project, ProjectDraft, ProjectStatus } from '@/domain/project/schema';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/** `['projects']` jest prefiksem także dla detali — listy muszą je wykluczyć (pułapka z T-06). */
const listQueries = {
  queryKey: queryKeys.projects(),
  predicate: (query: Query) => query.queryKey[1] !== 'detail',
};

export type ProjectListFilters = Omit<ProjectFilters, 'workspaceId'>;

export function useProjects(filters: ProjectListFilters = {}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.projects({ workspaceId, ...filters }),
    queryFn: () => listProjects({ ...filters, workspaceId: requireWorkspaceId(workspaceId) }),
    enabled: Boolean(workspaceId),
  });
}

export function useProject(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => getProject(id as string),
    enabled: Boolean(id),
  });
}

export function useProjectOverview(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.projectOverview(id ?? ''),
    queryFn: () => getProjectOverview(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries(listQueries);
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectOverview(id) });
    }
    // Karta klienta pokazuje liczbę projektów — bez tego licznik zostaje
    // w tyle po dodaniu teczki.
    void queryClient.invalidateQueries({ queryKey: queryKeys.clients() });
  };
}

export interface CreateProjectVars extends ProjectDraft {
  clientId: string;
}

export function useCreateProject() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: (vars: CreateProjectVars) =>
      createProject({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: (project) => {
      queryClient.setQueryData<Project>(queryKeys.project(project.id), project);
      invalidate(project.id);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }) => updateProject(id, patch),
    onSuccess: (project) => {
      queryClient.setQueryData<Project>(queryKeys.project(project.id), project);
      invalidate(project.id);
    },
  });
}

export function useSetProjectStatus() {
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      setProjectStatus(id, status),
    onSuccess: (project) => invalidate(project.id),
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export interface MoveQuoteVars {
  quoteId: string;
  projectId: string | null;
  /** Tylko dla wyceny bez klienta — patrz `moveQuoteToProject`. */
  attachClientId?: string;
}

export function useMoveQuoteToProject() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: ({ quoteId, projectId, attachClientId }: MoveQuoteVars) =>
      moveQuoteToProject(quoteId, projectId, attachClientId),
    onSuccess: (_data, { quoteId }) => {
      invalidate();
      // Wycena zmieniła przynależność, więc listy wycen (rejestr, zakładka
      // projektu, zakładka klienta) pokazują ją teraz gdzie indziej.
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotes() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quote(quoteId) });
    },
  });
}

/**
 * Zapis postępu etapów (T-68).
 *
 * Unieważnia kartę projektu i jego podsumowanie: pasek postępu i status
 * projektu czytają tę samą kolumnę.
 */
export function useSetProjectStageProgress(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (progress: StageProgress) => setProjectStageProgress(projectId, progress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectOverview(projectId) });
    },
  });
}
