import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react'
import { Project, Checkin } from '../types/mobile'
import { projectService, checkinService } from '../services/api'
import { ProjectMapper, CheckinMapper } from '../mappers/dataMappers'
import { useAuth } from './AuthContext'
import { toast } from 'react-hot-toast'
import { logger } from '../utils/logger'
import { useActiveCheckin } from '../hooks/useCheckins'

interface DataContextType {
  projects: Project[]
  checkins: Checkin[]
  activeCheckin: Checkin | null
  isLoading: boolean
  isLoadingActiveCheckin: boolean
  refreshData: () => Promise<void>
  addProject: (project: Project) => Promise<Project | undefined> // Returns created project with DB ID
  updateProject: (project: Project) => void // Deprecated/Mock adapter
  addCheckin: (checkin: Checkin) => void // Deprecated/Mock adapter
  updateCheckin: (checkin: Checkin) => void // Deprecated/Mock adapter
  deleteProject?: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { data: activeCheckin, isLoading: isLoadingActiveCheckin } = useActiveCheckin()

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return
    
    setIsLoading(true)
    try {
      const [projectsData, checkinsData] = await Promise.all([
        projectService.getAll(),
        checkinService.getHistory(1, 100)
      ])

      // Use mappers to transform API data to domain models
      if (Array.isArray(projectsData)) {
        setProjects(ProjectMapper.toDomainList(projectsData))
      } else {
        logger.warn('Invalid projects data format received', { type: typeof projectsData })
        setProjects([])
      }

      if (checkinsData && Array.isArray(checkinsData.items)) {
        setCheckins(CheckinMapper.toDomainList(checkinsData.items))
      } else {
        logger.warn('Invalid checkins data format received', { type: typeof checkinsData })
        setCheckins([])
      }
    } catch (error) {
      logger.error('Failed to fetch data', error as Error, { context: 'DataContext.refreshData' })
      toast.error('Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Adapters for existing UI components that expect synchronous updates
  // In a real app, these should be replaced by direct API calls in the components
  const addProject = async (project: Project): Promise<Project | undefined> => {
    try {
      // Map Mobile Project to API CreateProjectRequest
      const apiProject = {
        name: project.name,
        description: project.observations || undefined,
        start_date: project.startDate || undefined,
        end_date_planned: project.endDate || undefined,
        client_id: project.clientId || 1, 
        responsible_user_id: project.responsibleId || 1,
        estimated_value: undefined
      }
      
      const newProject = await projectService.create(apiProject)
      const mappedProject = ProjectMapper.toDomain(newProject)
      setProjects(prev => [...prev, mappedProject])
      toast.success('Projeto criado com sucesso!')
      return mappedProject
    } catch (error) {
      logger.error('Failed to create project', error as Error, { projectName: project.name })
      toast.error('Erro ao criar projeto')
      return undefined
    }
  }

  const updateProject = (project: Project) => {
    console.warn('updateProject called in DataContext - should use API')
    setProjects(prev => prev.map(p => p.id === project.id ? project : p))
  }

  const addCheckin = async (checkin: Checkin) => {
    try {
      // Map Mobile Checkin to API CreateFullCheckinRequest
      const apiCheckinPayload = {
        project_id: parseInt(checkin.projectId),
        arrival_time: checkin.arrivalTime,
        start_time: checkin.startTime,
        end_time: checkin.endTime,
        activities: checkin.activities,
        observations: checkin.observations || checkin.otherActivities
      }

      const newCheckin = await checkinService.createFull(apiCheckinPayload)
      setCheckins(prev => [CheckinMapper.toDomain(newCheckin), ...prev])
      toast.success('Check-in salvo com sucesso!')
    } catch (error) {
      logger.error('Failed to create checkin', error as Error, { projectId: checkin.projectId })
      toast.error('Erro ao salvar check-in')
    }
  }

  const updateCheckin = async (checkin: Checkin) => {
    try {
      // Map domain checkin to API update payload
      // Note: frontend 'endTime' maps to backend 'checkout_time' in schema but 'end_time' in CheckinUpdate
      const updatePayload = {
        observations: checkin.observations,
        start_time: checkin.startTime,
        arrival_time: checkin.arrivalTime,
        end_time: checkin.endTime
      }

      const updated = await checkinService.update(parseInt(checkin.id), updatePayload)
      // Update local state
      const domainCheckin = CheckinMapper.toDomain(updated)
      setCheckins(prev => prev.map(c => c.id === checkin.id ? domainCheckin : c))
      toast.success('Check-in atualizado com sucesso!')
    } catch (error) {
       console.error(error)
       toast.error('Erro ao atualizar check-in')
    }
  }

  const deleteProject = async (id: string) => {
    // Optimistic update: remove from UI immediately
    const previous = projects
    setProjects(prev => prev.filter(p => p.id === undefined ? true : p.id !== id))
    try {
      await projectService.delete(Number(id))
      toast.success('Projeto excluído com sucesso!')
    } catch (error) {
      logger.error('Failed to delete project', error as Error, { projectId: id })
      toast.error('Erro ao excluir projeto')
      // Revert on failure
      setProjects(previous)
    }
  }

  return (
    <DataContext.Provider value={{
      projects,
      checkins,
      activeCheckin: activeCheckin || null,
      isLoading,
      isLoadingActiveCheckin,
      refreshData,
      addProject,
      updateProject,
      addCheckin,
      updateCheckin,
      deleteProject
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
