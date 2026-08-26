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
  register:        (data)           => api.post('/auth/register', data),
  // identifier = phone number or email address
  login:           (data)           => api.post('/auth/login', data),
  requestOTP:      (data)           => api.post('/auth/request-otp', data),
  verifyOTP:       (data)           => api.post('/auth/verify-otp', data),
  logout:          ()               => api.post('/auth/logout'),
  // Google OAuth — triggers a full browser redirect (not an axios call)
  googleLogin:     ()               => { window.location.href = '/api/auth/google'; },
  // Save phone number after Google login (optional, requires auth)
  saveGooglePhone: (phone)          => api.patch('/auth/google/phone', { phone }),
};

// User API
export const userAPI = {
  getProfile:          ()                       => api.get('/users/me'),
  updateProfile:       (data)                   => api.patch('/users/me', data),
  getBusinesses:       ()                       => api.get('/users/me/businesses'),
  deactivate:          (data)                   => api.post('/users/me/deactivate', data),
  reactivate:          ()                       => api.post('/users/me/reactivate'),
  updateConsent:       (data)                   => api.patch('/users/me/consent', data),
  // Contact / password change (OTP-verified)
  requestPhoneChange:  (phone)                  => api.post('/users/me/request-phone-change', { phone }),
  confirmPhoneChange:  (phone, otp)             => api.post('/users/me/confirm-phone-change', { phone, otp }),
  requestEmailChange:  (email)                  => api.post('/users/me/request-email-change', { email }),
  confirmEmailChange:  (email, otp)             => api.post('/users/me/confirm-email-change', { email, otp }),
  changePassword:      (currentPassword, newPassword) => api.patch('/users/me/password', { currentPassword, newPassword }),
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
  // Photo management (PRD-07)
  uploadPhoto: (id, formData) => api.post(`/businesses/${id}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  listPhotos: (id) => api.get(`/businesses/${id}/photos`),
  updatePhotoTransform: (id, slug, data) => api.patch(`/businesses/${id}/photos/${slug}`, data),
  deletePhoto: (id, slug, imageType) => api.delete(`/businesses/${id}/photos/${slug}`, { data: { image_type: imageType } }),
  setPrimaryPhoto: (id, imageType, slug) => api.patch(`/businesses/${id}/photos/${imageType}/primary`, { slug }),
  getPhotoConfig: () => api.get('/photos/config'),
};

// Search API
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  getCategories: () => api.get('/search/categories'),
  getRegions: () => api.get('/search/regions'),
  getFeatured: (params) => api.get('/search/featured', { params }),
  getCategoryPage: (slug) => api.get(`/search/categories/${slug}`),
};

// Site API (public one-page business websites)
export const siteAPI = {
  getByTag: (tag) => api.get(`/site/${tag}`),
};

// Payment API
export const paymentAPI = {
  getPricing:             ()                       => api.get('/payments/pricing'),
  getSubscriptions:       (businessId)             => api.get(`/payments/subscriptions/${businessId}`),
  initiate:               (data)                   => api.post('/payments/initiate', data),
  getTransaction:         (id)                     => api.get(`/payments/transactions/${id}`),
  getReceipt:             (id)                     => api.get(`/payments/receipts/${id}`, { responseType: 'blob' }),
  getBusinessTransactions:(businessId, params)     => api.get(`/payments/business/${businessId}`, { params }),
  // Invoices (user)
  getInvoices:            (businessId)             => api.get('/payments/invoices', { params: businessId ? { business_id: businessId } : undefined }),
  getInvoice:             (id)                     => api.get(`/payments/invoices/${id}`),
  getInvoicePdf:          (id)                     => api.get(`/payments/invoices/${id}/pdf`, { responseType: 'blob' }),
  payInvoice:             (id)                     => api.post(`/payments/invoices/${id}/pay`),
  // Admin
  adminGetTransactions:   (params)                 => api.get('/payments/admin/transactions', { params }),
  adminGetRefunds:        (params)                 => api.get('/payments/refunds', { params }),
  adminCreateRefund:      (data)                   => api.post('/payments/refunds', data),
  adminGetRefund:         (id)                     => api.get(`/payments/refunds/${id}`),
  adminApproveRefund:     (id)                     => api.patch(`/payments/refunds/${id}/approve`),
  adminCompleteRefund:    (id)                     => api.patch(`/payments/refunds/${id}/complete`),
  adminRejectRefund:      (id, data)               => api.patch(`/payments/refunds/${id}/reject`, data),
};

// Admin API
export const adminAPI = {
  getPendingBusinesses: (params) => api.get('/admin/businesses/pending', { params }),
  approveBusiness: (id, data) => api.post(`/admin/businesses/${id}/approve`, data),
  rejectBusiness: (id, data) => api.post(`/admin/businesses/${id}/reject`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  getBusinessGrowth: (params) => api.get('/admin/analytics/business-growth', { params }),
  getAuthLogs: (params) => api.get('/admin/auth-logs', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  adjustSubscription: (id, data) => api.patch(`/admin/subscriptions/${id}/adjust`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  updateUserVerification: (id, data) => api.patch(`/admin/users/${id}/verification`, data),
  getSystemConfig: () => api.get('/admin/system/config'),
  updateSystemConfig: (key, data) => api.patch(`/admin/system/config/${key}`, data),
  getCategories: () => api.get('/admin/categories'),
  updateCategories: (categories) => api.patch('/admin/categories', { categories }),
  renameCategory: (oldCategory, newCategory) => api.patch('/admin/categories/rename', {
    old_category: oldCategory,
    new_category: newCategory,
  }),
  getAllBusinesses: (params) => api.get('/admin/businesses', { params }),
  updateBusinessVerification: (id, data) => api.patch(`/admin/businesses/${id}/verification`, data),
  updateBusinessCategory: (id, category) => api.patch(`/admin/businesses/${id}/category`, { category }),
  // Subscription management per business
  getBusinessSubscriptions: (id) => api.get(`/admin/businesses/${id}/subscriptions`),
  grantSubscription: (id, data) => api.post(`/admin/businesses/${id}/subscriptions`, data),
  deactivateSubscription: (id, serviceType) => api.patch(`/admin/businesses/${id}/subscriptions/${serviceType}/deactivate`),
  // Service type definitions
  getServiceTypes: () => api.get('/admin/service-types'),
  updateServiceTypes: (service_types) => api.patch('/admin/service-types', { service_types }),
  // Category featured businesses
  getCategoryFeatured: () => api.get('/admin/category-featured'),
  setCategoryFeatured: (category, business_ids) => api.put(`/admin/category-featured/${encodeURIComponent(category)}`, { business_ids }),
  // Invoices (admin)
  getInvoices: (params) => api.get('/admin/invoices', { params }),
  getInvoice: (id) => api.get(`/admin/invoices/${id}`),
  createInvoice: (data) => api.post('/admin/invoices', data),
  updateInvoice: (id, data) => api.patch(`/admin/invoices/${id}`, data),
  getInvoicePdf: (id) => api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' }),
  previewInvoiceItems: (businessId) => api.get(`/admin/invoices/preview/${businessId}`),
};

export default api;
