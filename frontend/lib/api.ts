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
        window.location.href = '/';
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
  
  getMyParty: () => api.get('/parties/my-party'),
  
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
  
  // Umrah Visa specific endpoints - deprecated, use umrahVisaAPI instead
  getUmrahVisas: (params?: any) => umrahVisaAPI.getBookings(params),
  
  updateUmrahVisaStatus: (id: string, status: string) =>
    umrahVisaAPI.updateBookingStatus(id, status),
  
  // Party-specific endpoints
  getPartyServices: (params?: any) => api.get('/services/party-services', { params }),
};

// Upload API
export const uploadAPI = {
  uploadDocument: (serviceId: string, file: File, documentType: string, passengerId?: string) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    if (passengerId) {
      formData.append('passenger_id', passengerId);
    }
    
    return api.post(`/upload/service/${serviceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadPassengerDocuments: (bookingId: string, passengerId: string, files: File[], documentTypes: string[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    formData.append('document_types', JSON.stringify(documentTypes));
    
    return api.post(`/upload/booking/${bookingId}/passenger/${passengerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteDocument: (documentId: string) => api.delete(`/upload/${documentId}`),
};

// Umrah Visa Booking API
export const umrahVisaAPI = {
  createBooking: (data: any) => api.post('/umrah-visa/booking', data),
  
  getBookings: (params?: any) => api.get('/umrah-visa/bookings', { params }),
  
  getPartyBookings: (params?: any) => api.get('/umrah-visa/bookings', { params }),
  
  // Backend route: GET /api/umrah-visa/:bookingId
  getBookingById: (id: string) => api.get(`/umrah-visa/${id}`),
  
  updateBookingStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/umrah-visa/booking/${id}/status`, { status, notes }),
  
  updateGroupNumber: (id: string, groupNumber: string, groupName: string) =>
    api.patch(`/umrah-visa/booking/${id}/group-number`, { groupNumber, groupName }),
  
  deleteBooking: (id: string) => api.delete(`/umrah-visa/booking/${id}`),
  
  getTransportPricing: (params: any) => 
    api.get('/umrah-visa/transport-pricing', { params }),
  
  getStats: (params?: any) => api.get('/umrah-visa/stats', { params }),

  // Workflow endpoints
  downloadDocuments: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/download-documents`),

  addGroupData: (bookingId: string, data: any) =>
    api.post(`/umrah-visa/${bookingId}/add-group-data`, data),

  uploadConfirmation: (bookingId: string, confirmationImagePath: string) =>
    api.post(`/umrah-visa/${bookingId}/upload-confirmation`, { confirmationImagePath }),

  generateVoucher: (bookingId: string) =>
    api.post(`/umrah-visa/${bookingId}/generate-voucher`),

  getTripInfo: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/trip-info`),

  getAvailableActions: (bookingId: string) =>
    api.get(`/umrah-visa/${bookingId}/available-actions`),

  updateTravelDetails: (id: string, data: any) => api.patch(`/umrah-visa/${id}/travel-details`, data),

  updateAccommodation: (id: string, data: any) => api.patch(`/umrah-visa/${id}/accommodation`, data),

  updateTransportBookings: (id: string, transportBookings: any[]) =>
    api.patch(`/umrah-visa/${id}/transport-bookings`, { transportBookings }),

  updatePassengers: (id: string, passengers: any[]) =>
    api.patch(`/umrah-visa/${id}/passengers`, { passengers }),

  createTransportBooking: (id: string, data: any) => api.post(`/umrah-visa/${id}/transport-bookings`, data),
  deleteTransportBooking: (rowId: string) => api.delete(`/umrah-visa/transport-bookings/${rowId}`),

  createHotelBooking: (id: string, data: any) => api.post(`/umrah-visa/${id}/hotel-bookings`, data),
  deleteHotelBooking: (rowId: string) => api.delete(`/umrah-visa/hotel-bookings/${rowId}`),
};

// User Management API
export const userAPI = {
  create: (data: any) => api.post('/users', data),
  
  getAll: (params?: any) => api.get('/users', { params }),
  
  getById: (id: string) => api.get(`/users/${id}`),
  
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Transport Master API
export const transportMasterAPI = {
  create: (data: any) => api.post('/transport-masters', data),
  
  getAll: (params?: any) => api.get('/transport-masters', { params }),
  
  getById: (id: string) => api.get(`/transport-masters/${id}`),
  
  getByLocations: (fromLocationId: string, toLocationId: string) => 
    api.get(`/transport-masters/by-locations/${fromLocationId}/${toLocationId}`),
  
  update: (id: string, data: any) => api.put(`/transport-masters/${id}`, data),
  
  delete: (id: string) => api.delete(`/transport-masters/${id}`),
  
  toggleStatus: (id: string) => api.patch(`/transport-masters/${id}/toggle-status`),
};

export const countryMasterAPI = {
  create: (data: any) => api.post('/country-masters', data),
  getAll: (params?: any) => api.get('/country-masters', { params }),
  getActive: () => api.get('/country-masters/active'),
  getById: (id: string) => api.get(`/country-masters/${id}`),
  update: (id: string, data: any) => api.put(`/country-masters/${id}`, data),
  delete: (id: string) => api.delete(`/country-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/country-masters/${id}/toggle-status`),
};

// Notifications API
export const notificationAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (notificationIds: string[]) => api.post('/notifications/mark-read', { notificationIds }),
  getStats: () => api.get('/notifications/stats'),
};

export const currencyMasterAPI = {
  create: (data: any) => api.post('/currency-masters', data),
  getAll: (params?: any) => api.get('/currency-masters', { params }),
  getActive: () => api.get('/currency-masters/active'),
  getById: (id: string) => api.get(`/currency-masters/${id}`),
  update: (id: string, data: any) => api.put(`/currency-masters/${id}`, data),
  delete: (id: string) => api.delete(`/currency-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/currency-masters/${id}/toggle-status`),
};

export const destinationMasterAPI = {
  create: (data: any) => api.post('/destination-masters', data),
  getAll: (params?: any) => api.get('/destination-masters', { params }),
  getActive: () => api.get('/destination-masters/active'),
  getById: (id: string) => api.get(`/destination-masters/${id}`),
  update: (id: string, data: any) => api.put(`/destination-masters/${id}`, data),
  delete: (id: string) => api.delete(`/destination-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/destination-masters/${id}/toggle-status`),
};

export const hotelMasterAPI = {
  create: (data: any) => api.post('/hotel-masters', data),
  getAll: (params?: any) => api.get('/hotel-masters', { params }),
  getByLocation: (locationId: string, params?: any) => api.get(`/hotel-masters/by-location/${locationId}`, { params }),
  getById: (id: string) => api.get(`/hotel-masters/${id}`),
  update: (id: string, data: any) => api.put(`/hotel-masters/${id}`, data),
  delete: (id: string) => api.delete(`/hotel-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/hotel-masters/${id}/toggle-status`),
};


export const userRoleMasterAPI = {
  create: (data: any) => api.post('/user-role-masters', data),
  getAll: (params?: any) => api.get('/user-role-masters', { params }),
  getActive: () => api.get('/user-role-masters/active'),
  getById: (id: string) => api.get(`/user-role-masters/${id}`),
  update: (id: string, data: any) => api.put(`/user-role-masters/${id}`, data),
  delete: (id: string) => api.delete(`/user-role-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/user-role-masters/${id}/toggle-status`),
};

export const airportMasterAPI = {
  create: (data: any) => api.post('/airport-masters', data),
  getAll: (params?: any) => api.get('/airport-masters', { params }),
  getActive: () => api.get('/airport-masters/active'),
  getById: (id: string) => api.get(`/airport-masters/${id}`),
  update: (id: string, data: any) => api.put(`/airport-masters/${id}`, data),
  delete: (id: string) => api.delete(`/airport-masters/${id}`),
  search: (query: string, limit?: number) => api.get(`/airport-masters/search/${query}`, { params: { limit } }),
  validateFlight: (flightNumber: string) => api.post('/airport-masters/validate-flight', { flightNumber }),
};

export const airportRouteMasterAPI = {
  create: (data: any) => api.post('/airport-route-masters', data),
  getAll: (params?: any) => api.get('/airport-route-masters', { params }),
  getActive: (params?: any) => api.get('/airport-route-masters/active', { params }),
  getById: (id: string) => api.get(`/airport-route-masters/${id}`),
  update: (id: string, data: any) => api.put(`/airport-route-masters/${id}`, data),
  delete: (id: string) => api.delete(`/airport-route-masters/${id}`),
  toggleStatus: (id: string) => api.patch(`/airport-route-masters/${id}/toggle-status`),
};

// Masters
export const umrahVisaMasterAPI = {
  getDestinations: (params?: any) => api.get('/umrah-visa/masters/destinations', { params }),
  getHotels: (params?: any) => api.get('/umrah-visa/masters/hotels', { params }),
  getAirports: (params?: any) => api.get('/umrah-visa/masters/airports', { params }),
};

