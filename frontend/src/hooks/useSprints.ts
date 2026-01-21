import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintService } from '../services/sprint.service';
import { Sprint, CreateSprint, UpdateSprintStatus, UpdateSprintTask } from '../types/sprint.types';

const SPRINT_KEYS = {
  all: ['sprints'] as const,
  list: (projectId?: number) => [...SPRINT_KEYS.all, 'list', projectId] as const,
};

export function useSprints(projectId?: number) {
  const queryClient = useQueryClient();

  const {
    data: sprints = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: SPRINT_KEYS.list(projectId),
    queryFn: () => sprintService.getAll(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });

  const createSprintMutation = useMutation({
    mutationFn: (data: CreateSprint) => sprintService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRINT_KEYS.list(projectId) });
    },
  });

  const updateSprintStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UpdateSprintStatus }) => 
      sprintService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRINT_KEYS.list(projectId) });
    },
  });

  const updateSprintMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      sprintService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRINT_KEYS.list(projectId) });
    },
  });

  const updateSprintTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { sprintId: number; taskId: number; data: UpdateSprintTask }) =>
      sprintService.updateTask(taskId, data),
    onMutate: async ({ sprintId, taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: SPRINT_KEYS.list(projectId) });
      const previousSprints = queryClient.getQueryData<Sprint[]>(SPRINT_KEYS.list(projectId));

      if (previousSprints) {
        queryClient.setQueryData<Sprint[]>(
          SPRINT_KEYS.list(projectId),
          previousSprints.map((s) => {
            if (s.id !== sprintId) return s;
            return {
              ...s,
              tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...data } : t)),
            };
          })
        );
      }
      return { previousSprints };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousSprints) {
        queryClient.setQueryData(SPRINT_KEYS.list(projectId), context.previousSprints);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRINT_KEYS.list(projectId) });
    },
  });

  const deleteSprintMutation = useMutation({
    mutationFn: (id: number) => sprintService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRINT_KEYS.list(projectId) });
    },
  });

  // Adapters to match existing interface
  const createSprint = (data: CreateSprint) => createSprintMutation.mutateAsync(data);
  
  const updateSprintStatus = (id: number, status: UpdateSprintStatus) => 
    updateSprintStatusMutation.mutateAsync({ id, status });
  
  const updateSprint = (id: number, data: any) => 
    updateSprintMutation.mutateAsync({ id, data });
  
  const updateSprintTask = (sprintId: number, taskId: number, data: UpdateSprintTask) => 
    updateSprintTaskMutation.mutateAsync({ sprintId, taskId, data });
  
  const deleteSprint = (id: number) => deleteSprintMutation.mutateAsync(id);

  return {
    sprints,
    loading,
    error: error ? (error as Error).message : null,
    fetchSprints: refetch,
    createSprint,
    updateSprint,
    updateSprintStatus,
    updateSprintTask,
    deleteSprint,
  };
}
