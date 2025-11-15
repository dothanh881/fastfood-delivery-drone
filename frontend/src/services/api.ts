import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Auto-detect environment and use appropriate backend URL
// Local: http://localhost:8080/api
// Production: https://fastfood-delivery-drone.onrender.com/api
const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
const baseURL = isDevelopment 
  ? 'http://localhost:8080/api' 
  : 'https://fastfood-delivery-drone.onrender.com/api';

console.log('API Base URL:', baseURL, '(Environment:', process.env.NODE_ENV, ')');

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
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

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;