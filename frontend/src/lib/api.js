import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  requestOTP: (data) => api.post('/auth/request-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  logout: () => api.post('/auth/logout'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  getBusinesses: () => api.get('/users/me/businesses'),
  deactivate: (data) => api.post('/users/me/deactivate', data),
  reactivate: () => api.post('/users/me/reactivate'),
  updateConsent: (data) => api.patch('/users/me/consent', data),
};

// Business API
export const businessAPI = {
  create: (data) => api.post('/businesses', data),
  get: (id) => api.get(`/businesses/${id}`),
  update: (id, data) => api.patch(`/businesses/${id}`, data),
  getContent: (id) => api.get(`/businesses/${id}/content`),
  getHistory: (id) => api.get(`/businesses/${id}/content/history`),
  getVersion: (id, version) => api.get(`/businesses/${id}/content/history/${version}`),
  rollback: (id, data) => api.post(`/businesses/${id}/content/rollback`, data),
  getUsers: (id) => api.get(`/businesses/${id}/users`),
  addUser: (id, data) => api.post(`/businesses/${id}/users`, data),
  removeUser: (id, userId) => api.delete(`/businesses/${id}/users/${userId}`),
};

// Search API
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  getCategories: () => api.get('/search/categories'),
  getRegions: () => api.get('/search/regions'),
  getFeatured: (params) => api.get('/search/featured', { params }),
};

// Payment API
export const paymentAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  getTransaction: (id) => api.get(`/payments/transactions/${id}`),
  getReceipt: (id) => api.get(`/payments/receipts/${id}`, { responseType: 'blob' }),
  getBusinessTransactions: (businessId, params) => 
    api.get(`/payments/business/${businessId}`, { params }),
};

// Admin API
export const adminAPI = {
  getPendingBusinesses: (params) => api.get('/admin/businesses/pending', { params }),
  approveBusiness: (id, data) => api.post(`/admin/businesses/${id}/approve`, data),
  rejectBusiness: (id, data) => api.post(`/admin/businesses/${id}/reject`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  getAuthLogs: (params) => api.get('/admin/auth-logs', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  adjustSubscription: (id, data) => api.patch(`/admin/subscriptions/${id}/adjust`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserVerification: (id, data) => api.patch(`/admin/users/${id}/verification`, data),
  getSystemConfig: () => api.get('/admin/system/config'),
  updateSystemConfig: (key, data) => api.patch(`/admin/system/config/${key}`, data),
  getAllBusinesses: (params) => api.get('/admin/businesses', { params }),
  updateBusinessVerification: (id, data) => api.patch(`/admin/businesses/${id}/verification`, data),
};

export default api;
