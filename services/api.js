import axios from 'axios';
import { getToken, clearAuthData } from '../utils/storage';
import { API_URL } from '../constants/config';

// Module-level logout callback — registered by AuthContext on mount.
// Called automatically when any API request returns 401.
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

// In-memory cache for fast GET responses on mobile
const memoryCache = new Map();

export const clearMobileAPICache = (pattern) => {
    if (!pattern) {
        memoryCache.clear();
        return;
    }
    for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
            memoryCache.delete(key);
        }
    }
};

// Create axios instance
const API = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - add JWT token & check cache for GET requests
API.interceptors.request.use(
    async (config) => {
        // Fast in-memory cache check for idempotent GET requests
        const method = (config.method || 'get').toLowerCase();
        if (method === 'get' && !config.skipCache) {
            const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
            const cached = memoryCache.get(cacheKey);
            const ttl = config.cacheTTL || 8000; // 8 seconds default cache
            if (cached && Date.now() - cached.timestamp < ttl) {
                config.adapter = () => Promise.resolve({
                    data: cached.data,
                    status: 200,
                    statusText: 'OK (Cache)',
                    headers: cached.headers || {},
                    config,
                });
                return config;
            }
        }

        const token = await getToken();
        if (__DEV__) {
            console.log('[API] Request URL:', config.url);
            console.log('[API] Token:', token ? `exists (${token.length} chars)` : 'NO TOKEN');
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add language setting
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const locale = await AsyncStorage.getItem('user-language');
            if (locale) {
                config.headers['Accept-Language'] = locale;
            }
        } catch (e) {
            console.log('Error reading language', e);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors globally & store cache for GET
API.interceptors.response.use(
    (response) => {
        const config = response.config;
        const method = (config?.method || 'get').toLowerCase();
        if (method === 'get' && !config?.skipCache && response.status === 200) {
            const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
            memoryCache.set(cacheKey, {
                data: response.data,
                headers: response.headers,
                timestamp: Date.now(),
            });
        } else if (method !== 'get') {
            // Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
            memoryCache.clear();
        }
        return response;
    },
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear storage then trigger app logout + navigation
            await clearAuthData();
            if (_logoutCallback) {
                _logoutCallback();
            }
        }
        
        if (error.response?.status === 429) {
            // Rate limit hit
            const { Alert } = require('react-native');
            const message = error.response?.data?.message || 'You are making too many requests. Please wait a few minutes before trying again.';
            Alert.alert(
                'Slow Down',
                message,
                [{ text: 'OK' }]
            );
        }

        return Promise.reject(error);
    }
);

export default API;
