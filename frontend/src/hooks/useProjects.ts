/**
 * React Query Custom Hooks - Projects
 * 
 * Benefits:
 * - Automatic caching & refetching
 * - Loading & error states
 * - Optimistic updates
 * - Background sync
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/services/api'
import { Project } from '@/types/mobile'
import { CreateProjectRequest } from '@/types/project.types'
import { ProjectMapper } from '@/mappers/dataMappers'
import { logger } from '@/utils/logger'
import toast from 'react-hot-toast'

/**
 * Query Keys - Centralized for cache invalidation
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const
}

/**
 * Fetch all projects with automatic caching
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: async (): Promise<Project[]> => {
      try {
        const apiProjects = await projectService.getAll()
        return ProjectMapper.toDomainList(apiProjects)
      } catch (error) {
        logger.error('Failed to fetch projects', error as Error)
        throw error
      }
    },
    staleTime: 0, // Always revalidate
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })
}

/**
 * Fetch single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<Project> => {
      try {
        const apiProject = await projectService.getById(parseInt(id))
        return ProjectMapper.toDomain(apiProject)
      } catch (error) {
        logger.error('Failed to fetch project', error as Error, { projectId: id })
        throw error
      }
    },
    enabled: !!id,
    staleTime: 0 // Always revalidate
  })
}

/**
 * Create project with optimistic update
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newProject: CreateProjectRequest): Promise<Project> => {
      const apiProject = await projectService.create(newProject)
      return ProjectMapper.toDomain(apiProject)
    },

    // Optimistic update (UI updates before server confirms)
    onMutate: async (newProject) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: projectKeys.list() })

      // Snapshot current data
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.list())

      // Optimistically update cache
      if (previousProjects) {
        const optimisticProject: Project = {
          id: `temp-${Date.now()}`,
          name: newProject.name,
          client: 'Carregando...',
          clientId: newProject.client_id,
          responsible: 'Carregando...',
          responsibleId: newProject.responsible_user_id,
          responsibleEmail: '',
          startDate: newProject.start_date || new Date().toISOString(),
          endDate: newProject.end_date_planned,
          status: 'Em Andamento',
          observations: newProject.description
        }

        queryClient.setQueryData<Project[]>(
          projectKeys.list(),
          [...previousProjects, optimisticProject]
        )
      }

      return { previousProjects }
    },

    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.list(), context.previousProjects)
      }

      logger.error('Failed to create project', error as Error)
      toast.error('Erro ao criar projeto')
    },

    onSuccess: (newProject) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.list() })
      
      logger.info('Project created successfully', { projectId: newProject.id })
      toast.success('Projeto criado com sucesso!')
    }
  })
}

/**
 * Delete project with optimistic update
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      await projectService.delete(parseInt(projectId))
    },

    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.list() })

      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.list())

      // Optimistically remove from cache
      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          projectKeys.list(),
          previousProjects.filter(p => p.id !== projectId)
        )
      }

      return { previousProjects }
    },

    onError: (error, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.list(), context.previousProjects)
      }

      logger.error('Failed to delete project', error as Error)
      toast.error('Erro ao excluir projeto')
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list() })
      toast.success('Projeto excluído com sucesso!')
    }
  })
}

/**
 * Update project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string
      updates: Partial<CreateProjectRequest>
    }): Promise<Project> => {
      const apiProject = await projectService.update(parseInt(id), updates)
      return ProjectMapper.toDomain(apiProject)
    },

    onSuccess: (updatedProject) => {
      // Update both list and detail caches
      queryClient.invalidateQueries({ queryKey: projectKeys.list() })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(updatedProject.id) })

      toast.success('Projeto atualizado!')
    },

    onError: (error) => {
      logger.error('Failed to update project', error as Error)
      toast.error('Erro ao atualizar projeto')
    }
  })
}

/**
 * Fetch project contributors
 */
export function useProjectContributors(projectId: number) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId.toString()), 'contributors'],
    queryFn: async () => {
      return projectService.getContributors(projectId)
    },
    enabled: !!projectId
  })
}

/**
 * Add contributor
 */
export function useAddContributor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: number, userId: number }) => 
      projectService.addContributor(projectId, userId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId.toString()), 'contributors'] })
      toast.success('Contribuinte adicionado!')
    },
    onError: (error: any) => {
      logger.error('Failed to add contributor', error as Error)
      const message = error.response?.data?.detail || 'Erro ao adicionar contribuinte'
      toast.error(message)
    }
  })
}

/**
 * Remove contributor
 */
export function useRemoveContributor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: number, userId: number }) => 
      projectService.removeContributor(projectId, userId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId.toString()), 'contributors'] })
      toast.success('Contribuinte removido!')
    },
    onError: (error) => {
      logger.error('Failed to remove contributor', error as Error)
      toast.error('Erro ao remover contribuinte')
    }
  })
}

/**
 * Update Project Status Hooks
 */
export function useProjectStatus() {
  const queryClient = useQueryClient()

  const invalidate = (projectId: number) => {
    queryClient.invalidateQueries({ queryKey: projectKeys.list() })
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId.toString()) })
  }

  const start = useMutation({
    mutationFn: (projectId: number) => projectService.start(projectId),
    onSuccess: (_, projectId) => {
      invalidate(projectId)
      toast.success('Projeto iniciado!')
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Erro ao iniciar projeto')
  })

  const pause = useMutation({
    mutationFn: (projectId: number) => projectService.pause(projectId),
    onSuccess: (_, projectId) => {
      invalidate(projectId)
      toast.success('Projeto pausado!')
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Erro ao pausar projeto')
  })

  const complete = useMutation({
    mutationFn: ({ id, date }: { id: number, date?: string }) => projectService.complete(id, date),
    onSuccess: (_, { id }) => {
      invalidate(id)
      toast.success('Projeto concluído!')
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Erro ao concluir projeto')
  })

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: number, reason?: string }) => projectService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      invalidate(id)
      toast.success('Projeto cancelado!')
    },
    onError: (error: any) => toast.error(error.response?.data?.detail || 'Erro ao cancelar projeto')
  })

  return { start, pause, complete, cancel }
}
