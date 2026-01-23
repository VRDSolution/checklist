/**
 * Data Mappers Layer
 * 
 * Responsibility: Transform API DTOs to Domain Models
 * Pattern: Adapter Pattern (Hexagonal Architecture)
 * 
 * Why: Isolates API contract changes from business logic
 */

import { Project } from '@/types/mobile'
import { Checkin } from '@/types/mobile'
import { Project as ApiProject, ProjectStatus as ApiProjectStatus } from '@/types/project.types'
import { Checkin as ApiCheckin } from '@/types/checkin.types'

export class ProjectMapper {
  static toDomain(apiProject: ApiProject): Project {
    if (!apiProject) {
      throw new Error('ProjectMapper: Cannot map null/undefined API project')
    }

    return {
      id: apiProject.id.toString(),
      name: apiProject.name,
      client: apiProject.client?.name || apiProject.client?.nome || 'Cliente Desconhecido',
      clientId: apiProject.client?.id,
      responsible: apiProject.responsible_user?.name || 'Técnico',
      responsibleId: apiProject.responsible_user?.id,
      responsibleEmail: apiProject.responsible_user?.email || '',
      startDate: apiProject.start_date || '',
      endDate: apiProject.end_date,
      status: this.mapStatus(apiProject.status),
      observations: apiProject.description
    }
  }

  private static mapStatus(apiStatus: ApiProjectStatus): 'Em Andamento' | 'Concluído' | 'Pausado' | 'Cancelado' | 'Planejamento' {
    const statusMap: Record<ApiProjectStatus, 'Em Andamento' | 'Concluído' | 'Pausado' | 'Cancelado' | 'Planejamento'> = {
      [ApiProjectStatus.PLANEJAMENTO]: 'Planejamento',
      [ApiProjectStatus.EM_ANDAMENTO]: 'Em Andamento',
      [ApiProjectStatus.PAUSADO]: 'Pausado',
      [ApiProjectStatus.CONCLUIDO]: 'Concluído',
      [ApiProjectStatus.CANCELADO]: 'Cancelado'
    }

    return statusMap[apiStatus] || 'Planejamento'
  }

  static toDomainList(apiProjects: ApiProject[]): Project[] {
    if (!Array.isArray(apiProjects)) {
      console.warn('ProjectMapper: Expected array, received:', typeof apiProjects)
      return []
    }

    return apiProjects.map(p => this.toDomain(p))
  }
}

export class CheckinMapper {
  static toDomain(apiCheckin: ApiCheckin): Checkin {
    if (!apiCheckin) {
      throw new Error('CheckinMapper: Cannot map null/undefined API checkin')
    }

    let observations = apiCheckin.observations
    let activitiesFromObs: string[] = []
    if (observations) {
      const marker = 'Activities:'
      const idx = observations.indexOf(marker)
      if (idx >= 0) {
        const before = observations.slice(0, idx).trim()
        const after = observations.slice(idx + marker.length).trim()
        activitiesFromObs = after ? after.split(',').map(a => a.trim()).filter(Boolean) : []
        observations = before || undefined
      }
    }

    const activitiesFromTasks = apiCheckin.tasks?.map(t => t.name) || []
    const mergedActivities = [...activitiesFromObs, ...activitiesFromTasks].filter(
      (value, index, self) => self.indexOf(value) === index
    )

    return {
      id: apiCheckin.id.toString(),
      projectId: apiCheckin.project_id.toString(),
      projectName: apiCheckin.project?.name || 'Projeto',
      arrivalTime: apiCheckin.arrival_time,
      startTime: apiCheckin.start_time || apiCheckin.created_at,
      endTime: apiCheckin.checkout_time,
      totalHours: apiCheckin.total_hours ? apiCheckin.total_hours.toFixed(2) : undefined,
      activities: mergedActivities,
      observations,
      date: apiCheckin.created_at,
      userEmail: apiCheckin.user?.email || '',
      userName: apiCheckin.user?.name || undefined,
      startLocation: apiCheckin.start_lat && apiCheckin.start_lon ? { lat: apiCheckin.start_lat, lng: apiCheckin.start_lon } : undefined,
      endLocation: apiCheckin.end_lat && apiCheckin.end_lon ? { lat: apiCheckin.end_lat, lng: apiCheckin.end_lon } : undefined,
      isAutoCheckout: typeof apiCheckin.is_auto_checkout === 'number' ? apiCheckin.is_auto_checkout === 1 : !!apiCheckin.is_auto_checkout
    }
  }

  static toDomainList(apiCheckins: ApiCheckin[]): Checkin[] {
    if (!Array.isArray(apiCheckins)) {
      console.warn('CheckinMapper: Expected array, received:', typeof apiCheckins)
      return []
    }

    return apiCheckins.map(c => this.toDomain(c))
  }
}
