import { Client } from './client.types'
import { User } from './auth.types'

export enum ProjectStatus {
  PLANEJAMENTO = 'planejamento',
  EM_ANDAMENTO = 'em_andamento',
  PAUSADO = 'pausado',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado'
}

export interface Project {
  id: number
  name: string
  description?: string
  client_id: number
  status: ProjectStatus
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
  client?: Client
  responsible_user?: User
  contributors?: User[]
}

export interface Task {
  id: number
  name: string
  description?: string
  project_id: number
  estimated_hours?: number
  is_active: boolean
  created_at: string
  updated_at: string
  project?: Project
}

// Request types
export interface CreateProjectRequest {
  name: string
  description?: string
  client_id: number
  responsible_user_id: number
  start_date?: string
  end_date_planned?: string
  status?: ProjectStatus | string
  estimated_value?: string
  observations?: string
}

export interface CreateTaskRequest {
  name: string
  description?: string
  project_id: number
  estimated_hours?: number
}