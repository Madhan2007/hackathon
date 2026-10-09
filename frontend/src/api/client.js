import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// Request interceptor to inject JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fertiflow_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for clear error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/signup')) {
      // Token expired or invalid
      console.warn('[FertiFlow Auth] Session expired or invalid');
    }
    const errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    console.error(`[FertiFlow API Error] ${error.config?.url || 'request'}:`, errorMsg);
    return Promise.reject(error);
  }
);

export const patientsApi = {
  list: (params) => apiClient.get('/patients/', { params }).then((res) => res.data),
  get: (id) => apiClient.get(`/patients/${id}`).then((res) => res.data),
  create: (data) => apiClient.post('/patients/', data).then((res) => res.data),
  update: (id, data) => apiClient.patch(`/patients/${id}`, data).then((res) => res.data),
  delete: (id) => apiClient.delete(`/patients/${id}`).then((res) => res.data),
  createCycle: (patientId, data) => apiClient.post(`/patients/${patientId}/cycles`, data).then((res) => res.data),
  getCycles: (patientId) => apiClient.get(`/patients/${patientId}/cycles`).then((res) => res.data),
};

export const cyclesApi = {
  get: (id) => apiClient.get(`/cycles/${id}`).then((res) => res.data),
  update: (id, data) => apiClient.patch(`/cycles/${id}`, data).then((res) => res.data),
  recordEvent: (id, eventData) => apiClient.post(`/cycles/${id}/events`, eventData).then((res) => res.data),
};

export const followupsApi = {
  list: (params) => apiClient.get('/followups/', { params }).then((res) => res.data),
  create: (data) => apiClient.post('/followups/', data).then((res) => res.data),
  update: (id, data) => apiClient.patch(`/followups/${id}`, data).then((res) => res.data),
  triggerCall: (id) => apiClient.post(`/followups/${id}/call`).then((res) => res.data),
};

export const systemApi = {
  health: () => axios.get('/health').catch(() => apiClient.get('/health')).then((res) => res.data),
};

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials).then((res) => res.data),
  signup: (userData) => apiClient.post('/auth/signup', userData).then((res) => res.data),
  me: () => apiClient.get('/auth/me').then((res) => res.data),
  listUsers: () => apiClient.get('/auth/users').then((res) => res.data),
  updateUserRole: (userId, data) => apiClient.patch(`/auth/users/${userId}/role`, data).then((res) => res.data),
  seedDemoUsers: () => apiClient.post('/auth/seed-demo-users').then((res) => res.data),
};

export default apiClient;
