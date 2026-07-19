import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

export const foodApi = {
  search: (query: string, source: string = 'UIS') => api.get(`/foods/search?q=${query}&source=${source}`),
  getById: (id: number, source: string = 'UIS') => api.get(`/foods/${id}?source=${source}`),
};

export const logApi = {
  getSummary: (userId: string, date: string) => api.get(`/daily-log/${userId}/${date}`),
  addEntry: (data: any) => api.post('/daily-log/entry', data),
  deleteEntry: (id: string) => api.delete(`/daily-log/entry/${id}`),
};

export const hydrationApi = {
  getGoal: (userId: string) => api.get(`/hydration/goal/${userId}`),
  getLocations: () => api.get('/hydration/locations'),
  updateIntake: (data: { userId: string; date: string; amount_ml: number }) => api.post('/hydration/intake', data),
};

export const userApi = {
  getUser: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.post(`/users/${id}`, data),
};

export default api;
