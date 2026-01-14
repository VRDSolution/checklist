import { api } from './api'

export interface DashboardData {
  hours_per_project: { name: string; hours: number }[];
  top_technicians: { name: string; checkins: number; hours: number }[];
  project_status: { status: string; count: number }[];
  kpis: {
    checkins_today: number;
    active_now: number;
  };
}

export const analyticsService = {
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  }
}
