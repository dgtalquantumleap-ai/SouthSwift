import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Auto-attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── AUTH ─────────────────────────────────────────────────────────────────────
export const registerUser  = (data) => API.post('/auth/register', data);
export const loginUser     = (data) => API.post('/auth/login', data);
export const getMe         = ()     => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);

// ── LISTINGS ─────────────────────────────────────────────────────────────────
export const getListings    = (params) => API.get('/listings', { params });
export const getListing     = (id)     => API.get(`/listings/${id}`);
export const createListing  = (data)   => API.post('/listings', data);
export const updateListing  = (id, data) => API.put(`/listings/${id}`, data);
export const deleteListing  = (id)     => API.delete(`/listings/${id}`);
export const getMyListings  = ()       => API.get('/listings/agent/my');

// ── DEALS ─────────────────────────────────────────────────────────────────────
export const initiateDeal    = (data)      => API.post('/deals/initiate', data);
export const verifyPayment   = (reference) => API.get(`/payments/verify/${reference}`);
export const confirmMoveIn   = (dealId)    => API.post(`/deals/${dealId}/confirm-movein`);
export const raiseDispute    = (dealId, reason) => API.post(`/deals/${dealId}/dispute`, { reason });
export const getMyDeals      = ()          => API.get('/deals/my');
export const getDeal         = (id)        => API.get(`/deals/${id}`);

// ── MESSAGES ─────────────────────────────────────────────────────────────────
export const sendMessage  = (dealId, receiverId, content) =>
  API.post('/messages/send', { deal_id: dealId, receiver_id: receiverId, content });
export const getMessages  = (dealId) => API.get(`/messages/${dealId}`);

// ── AGENTS ────────────────────────────────────────────────────────────────────
export const getAgents           = ()     => API.get('/agents');
export const getAgent            = (id)   => API.get(`/agents/${id}`);
export const submitVerification  = (data) => API.post('/agents/verify-request', data);

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const getDashboard    = ()              => API.get('/admin/dashboard');
export const getPendingAgents= ()              => API.get('/admin/agents/pending');
export const verifyAgent     = (userId, action)=> API.put(`/admin/agents/${userId}/verify`, { action });
export const getAllDeals      = ()              => API.get('/admin/deals');
export const releaseFunds    = (dealId)        => API.put(`/admin/deals/${dealId}/release-funds`);
export const getAllUsers      = ()              => API.get('/admin/users');
export const getAllListings   = ()              => API.get('/admin/listings');

export default API;
