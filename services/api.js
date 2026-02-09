import axios from 'axios';
import { getToken, clearAuthData } from '../utils/storage';
import { API_URL } from '../constants/config';

// Create axios instance
const API = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor - add JWT token to all requests
API.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        console.log('[API Interceptor] Token retrieved:', token ? 'Token exists (length: ' + token.length + ')' : 'NO TOKEN');
        console.log('[API Interceptor] Request URL:', config.url);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors globally
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - clear auth data
            await clearAuthData();
            // Navigation to login will be handled by AuthContext
        }
        return Promise.reject(error);
    }
);

export default API;
