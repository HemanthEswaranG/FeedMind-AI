import axios from 'axios';

// Use configured backend URL when provided, otherwise use same-origin API path.
let API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api';

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 20000;

// Ensure /api suffix exists
if (!API_BASE_URL.endsWith('/api')) {
   API_BASE_URL = API_BASE_URL.replace(/\/$/, '') + '/api';
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Request interceptor: automatically add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');

      if (token) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;