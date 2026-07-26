import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview').then(res => res.data),
  getTrends: (days: number = 7) => api.get(`/dashboard/trends?days=${days}`).then(res => res.data),
  getTopOpportunities: (limit: number = 10) => api.get(`/dashboard/top-opportunities?limit=${limit}`).then(res => res.data),
  getSourcePerformance: () => api.get('/dashboard/source-performance').then(res => res.data),
  getLive: () => api.get('/dashboard/live').then(res => res.data),
}

export const projectsApi = {
  getAll: () => api.get('/projects').then(res => res.data),
  get: (id: string) => api.get(`/projects/${id}`).then(res => res.data),
  create: (data: any) => api.post('/projects', data).then(res => res.data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then(res => res.data),
  getOpportunities: (id: string, params?: any) => 
    api.get(`/projects/${id}/opportunities`, { params }).then(res => res.data),
  getFeedbackStats: (id: string) => 
    api.get(`/projects/${id}/feedback-stats`).then(res => res.data),
}

export const opportunitiesApi = {
  get: (id: string) => api.get(`/opportunities/${id}`).then(res => res.data),
  updateStatus: (id: string, status: string) => 
    api.patch(`/opportunities/${id}/status`, { status }).then(res => res.data),
  addFeedback: (id: string, data: { action: string; comment?: string }) => 
    api.post(`/opportunities/${id}/feedback`, data).then(res => res.data),
  getSummary: () => api.get('/opportunities/summary').then(res => res.data),
}

export const notificationsApi = {
  getAll: (params?: { limit?: number; unreadOnly?: boolean }) => 
    api.get('/notifications', { params }).then(res => res.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then(res => res.data),
  markAllRead: () => api.patch('/notifications/read-all').then(res => res.data),
  getUnreadCount: () => api.get('/notifications/unread-count').then(res => res.data),
}

export const crawlersApi = {
  getAll: () => api.get('/crawlers').then(res => res.data),
  run: (name: string) => api.post(`/crawlers/${name}/run`).then(res => res.data),
  runAll: () => api.post('/crawlers/run-all').then(res => res.data),
  getRawContent: (params?: { limit?: number; offset?: number }) => 
    api.get('/raw-content', { params }).then(res => res.data),
}

export default api