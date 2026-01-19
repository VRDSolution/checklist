import { api } from './api';
import { Sprint, SprintTask, CreateSprint, UpdateSprintStatus, UpdateSprintTask } from '@/types';

export const sprintService = {
  getAll: async (projectId?: number, status?: string) => {
    const params: any = {};
    if (projectId) params.project_id = projectId;
    if (status) params.status = status;
    
    const response = await api.get<Sprint[]>('/sprints/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Sprint>(`/sprints/${id}`);
    return response.data;
  },

  create: async (data: CreateSprint) => {
    const response = await api.post<Sprint>('/sprints/', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<Sprint>(`/sprints/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: number, status: UpdateSprintStatus) => {
    const response = await api.patch<Sprint>(`/sprints/${id}/status`, status);
    return response.data;
  },

  updateTask: async (taskId: number, data: UpdateSprintTask) => {
    const response = await api.patch<SprintTask>(`/sprints/tasks/${taskId}`, data);
    return response.data;
  },
  
  delete: async (id: number) => {
    await api.delete(`/sprints/${id}`);
  }
};
