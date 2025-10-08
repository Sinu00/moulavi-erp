import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  
  getMe: () => api.get('/auth/me'),
};

// Party API
export const partyAPI = {
  create: (data: any) => api.post('/parties', data),
  
  getAll: (params?: any) => api.get('/parties', { params }),
  
  getById: (id: string) => api.get(`/parties/${id}`),
  
  update: (id: string, data: any) => api.put(`/parties/${id}`, data),
  
  delete: (id: string) => api.delete(`/parties/${id}`),
};

// Service API
export const serviceAPI = {
  createUmrahVisa: (data: any) => api.post('/services/umrah-visa', data),
  
  getAll: (params?: any) => api.get('/services', { params }),
  
  getById: (id: string) => api.get(`/services/${id}`),
  
  updateStatus: (id: string, status: string) =>
    api.patch(`/services/${id}/status`, { status }),
};

// Upload API
export const uploadAPI = {
  uploadDocument: (serviceId: string, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    
    return api.post(`/upload/service/${serviceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteDocument: (documentId: string) => api.delete(`/upload/${documentId}`),
};

