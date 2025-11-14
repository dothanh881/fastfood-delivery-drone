import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance with base configuration
const isDev = process.env.NODE_ENV === 'development';
// Prefer explicit env base URL if provided (both dev and prod), fallback to CRA proxy in dev
const baseURL = (process.env.REACT_APP_API_BASE_URL && process.env.REACT_APP_API_BASE_URL.trim())
  ? process.env.REACT_APP_API_BASE_URL.trim()
  : (isDev ? '/api' : 'http://localhost:8080/api');

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