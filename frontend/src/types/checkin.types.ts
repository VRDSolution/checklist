import { Project, Task } from './project.types'
import { User } from './auth.types'

export enum CheckinStatus {
  ARRIVED = 'arrived',        // Chegou no cliente
  WORKING = 'working',        // Iniciou o serviço
  COMPLETED = 'completed'     // Finalizou
}

export enum CheckinType {
  ARRIVAL = 'arrival',        // Check-in de chegada
  START_SERVICE = 'start_service'  // Check-in de início de serviço
}

export interface Checkin {
  id: number
  user_id: number
  project_id: number
  task_ids?: number[]         // Lista de tarefas executadas
  arrival_time?: string       // Hora de chegada no cliente
  start_time?: string         // Hora de início do serviço
  checkout_time?: string      // Hora de saída
  checkin_time?: string       // Alias for arrival_time or start_time depending on context
  total_hours?: number
  activities?: string         // Atividades executadas (selecionadas)
  observations?: string       // Campo livre de observações
  description?: string        // Alias for observations
  status: CheckinStatus | string
  created_at: string
  updated_at?: string
  user?: User
  project?: { name: string } | Project
  tasks?: Task[]
  task?: Task                 // Single task reference if needed
  start_lat?: number | string
  start_lon?: number | string
  end_lat?: number | string
  end_lon?: number | string
  is_auto_checkout?: number | boolean
}

export interface Attachment {
  id: number
  checkin_id: number
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_at: string
  checkin?: Checkin
}

// Request types
export interface CreateCheckinRequest {
  project_id: number
  start_time?: string
  arrival_time?: string
  description?: string
  type?: CheckinType
  latitude?: number
  longitude?: number
}

export interface StartServiceRequest {
  checkin_id: number
  latitude?: number
  longitude?: number
}

export interface CheckoutRequest {
  checkin_id: number
  task_ids: number[]          // IDs das atividades executadas
  observations?: string       // Observações do técnico
  description?: string        // Alias for observations
  latitude?: number
  longitude?: number
  is_auto_checkout?: boolean
}