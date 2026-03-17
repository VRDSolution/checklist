export interface User {
  email: string
  name: string
  isAdmin: boolean
}

export interface Project {
  id: string
  name: string
  client: string
  clientId?: number
  responsible: string
  responsibleId?: number
  responsibleEmail: string
  startDate: string
  endDate?: string
  observations?: string
  status: 'Em Andamento' | 'Concluído' | 'Pausado' | 'Cancelado' | 'Planejamento'
}

export interface Checkin {
  id: string
  projectId: string
  projectName: string
  arrivalTime?: string
  startTime?: string
  endTime?: string
  totalHours?: string
  activities: string[]
  otherActivities?: string
  observations?: string
  date: string
  userEmail: string
  userName?: string
  startLocation?: { lat: number | string, lng: number | string }
  endLocation?: { lat: number | string, lng: number | string }
  isAutoCheckout?: boolean
}

export type Screen = 
  | 'login' 
  | 'dashboard' 
  | 'selectProject' 
  | 'addProject' 
  | 'editProject' 
  | 'workflow' 
  | 'history' 
  | 'projectDetail' 
  | 'success'
  | 'addUser'
  | 'registrations'
