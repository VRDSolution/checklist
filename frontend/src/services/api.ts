import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// API base configuration
// Em desenvolvimento, usa o proxy do Vite (/api)
// Em produção, usa a variável de ambiente ou caminho relativo
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const refreshToken = useAuthStore.getState().refreshToken
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          
          const { access_token, user } = response.data
          
          // Update auth store with new token
          useAuthStore.getState().setAuth(user, access_token, refreshToken)
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout()
          window.location.href = '/checklist/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, logout user
        useAuthStore.getState().logout()
        window.location.href = '/checklist/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// Service classes
import { 
  Project, Client, Task, Checkin,
  CreateProjectRequest, CreateTaskRequest, 
  CreateCheckinRequest, StartServiceRequest, CheckoutRequest 
} from '@/types'

class ProjectService {
  async getAll(): Promise<Project[]> {
    const response = await api.get('/projects/')
    return response.data
  }

  async getById(id: number | string): Promise<Project> {
    const response = await api.get(`/projects/${id}`)
    return response.data
  }

  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await api.post('/projects/', data)
    return response.data
  }

  async update(id: number | string, data: Partial<CreateProjectRequest>): Promise<Project> {
    const response = await api.put(`/projects/${id}`, data)
    return response.data
  }

  async addContributor(projectId: number | string, userId: number | string): Promise<void> {
    await api.post(`/projects/${projectId}/contributors`, { user_id: userId })
  }

  async removeContributor(projectId: number | string, userId: number | string): Promise<void> {
    await api.delete(`/projects/${projectId}/contributors/${userId}`)
  }

  async getContributors(projectId: number | string): Promise<any[]> {
    const response = await api.get(`/projects/${projectId}/contributors`)
    return response.data
  }

  async delete(id: number | string): Promise<void> {
    await api.delete(`/projects/${id}`, { params: { force: true } })
  }

  async start(id: number | string): Promise<Project> {
    const response = await api.post(`/projects/${id}/start`)
    return response.data
  }

  async pause(id: number | string): Promise<Project> {
    const response = await api.post(`/projects/${id}/pause`)
    return response.data
  }

  async complete(id: number | string, completionDate?: string): Promise<Project> {
    const response = await api.post(`/projects/${id}/complete`, { completion_date: completionDate })
    return response.data
  }

  async cancel(id: number | string, reason?: string): Promise<Project> {
    const response = await api.post(`/projects/${id}/cancel`, { cancellation_reason: reason })
    return response.data
  }
}

class ClientService {
  async getAll(): Promise<Client[]> {
    const response = await api.get('/clients/')
    return response.data
  }

  async getById(id: number | string): Promise<Client> {
    const response = await api.get(`/clients/${id}`)
    return response.data
  }

  async search(query: string): Promise<Client[]> {
    const response = await api.get('/clients/search', { params: { q: query } })
    return response.data.map((c: any) => ({ id: c.id, label: c.name, subLabel: c.cnpj }))
  }

  async create(data: any): Promise<Client> {
    const response = await api.post('/clients/', data)
    return response.data
  }
}

class UserService {
  async search(query: string): Promise<{ id: number, label: string, subLabel: string }[]> {
    const response = await api.get('/users/search', { params: { q: query } })
    return response.data.map((u: any) => ({ id: u.id, label: u.name, subLabel: u.email }))
  }
}

class TaskService {
  async getByProject(projectId: number | string): Promise<Task[]> {
    const response = await api.get(`/projects/${projectId}/tasks`)
    return response.data
  }

  async create(data: CreateTaskRequest): Promise<Task> {
    const response = await api.post('/tasks/', data)
    return response.data
  }
}

class CheckinService {
  // Buscar check-in ativo do usuário
  async getActiveCheckin(): Promise<Checkin | null> {
    try {
      const response = await api.get('/checkins/active')
      return response.data
    } catch (error: any) {
      // If 404, 403, 401 or null returned
      if (error.response?.status === 404 || error.response?.status === 403 || error.response?.status === 401) {
        return null
      }
      throw error
    }
  }

  // Iniciar check-in
  async startCheckin(data: { project_id: number | string, start_time?: string, arrival_time?: string }): Promise<Checkin> {
    const response = await api.post('/checkins/start', data)
    return response.data
  }

  // Parar check-in
  async stopCheckin(checkinId: number | string, data: { end_time?: string, activities: string[], observations?: string }): Promise<Checkin> {
    const response = await api.post(`/checkins/${checkinId}/stop`, data)
    return response.data
  }

  // Legacy / Desktop support
  async arrival(data: { project_id: number | string, description?: string }): Promise<Checkin> {
    return this.startCheckin({
      project_id: data.project_id,
      start_time: new Date().toISOString()
    })
  }

  async checkout(data: { checkin_id: number | string, task_ids?: number[], description?: string }): Promise<Checkin> {
    return this.stopCheckin(data.checkin_id, {
      end_time: new Date().toISOString(),
      activities: [], // Desktop flow might need update to support string activities or map tasks
      observations: data.description
    })
  }

  // Histórico de check-ins
  async getHistory(page: number = 1, size: number = 10): Promise<{ items: Checkin[], total: number }> {
    const response = await api.get(`/checkins/`, {
      params: { page, size }
    })
    return response.data
  }

  async delete(id: number | string): Promise<void> {
    await api.delete(`/checkins/${id}`)
  }

  // Criar check-in completo (fluxo offline/mobile)
  async createFull(data: any): Promise<Checkin> {
    const response = await api.post('/checkins/full', data)
    return response.data
  }
}

class SprintService {
  async getByProject(projectId: number | string): Promise<any[]> {
    const response = await api.get('/sprints/', { params: { project_id: projectId } })
    return response.data
  }

  async create(data: any): Promise<any> {
    const response = await api.post('/sprints/', data)
    return response.data
  }

  async update(id: number | string, data: any): Promise<any> {
    const response = await api.put(`/sprints/${id}`, data)
    return response.data
  }

  async updateTaskStatus(taskId: number | string, isCompleted: boolean): Promise<any> {
    const response = await api.patch(`/sprints/tasks/${taskId}`, { is_completed: isCompleted })
    return response.data
  }

  async delete(id: number | string): Promise<void> {
    await api.delete(`/sprints/${id}`)
  }
}

// Export service instances
export const projectService = new ProjectService()
export const clientService = new ClientService()
export const userService = new UserService()
export const taskService = new TaskService()
export const checkinService = new CheckinService()
export const sprintService = new SprintService()